import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeterministicEstimator, defaultRules } from '@simplepro/pricing-engine';
import {
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  TestRuleDto,
  RuleFilterDto,
  RuleTestResult,
  RuleHistoryEntry,
  RuleBackup,
  OperatorType,
  ActionType,
  RuleCategory
} from './dto/pricing-rules.dto';
import { PricingRule, PricingRuleDocument } from './schemas/pricing-rule.schema';
import { RuleHistory, RuleHistoryDocument } from './schemas/rule-history.schema';

@Injectable()
export class PricingRulesService {
  constructor(
    @InjectModel(PricingRule.name) private pricingRuleModel: Model<PricingRuleDocument>,
    @InjectModel(RuleHistory.name) private ruleHistoryModel: Model<RuleHistoryDocument>
  ) {}

  /**
   * Get all pricing rules with optional filtering
   */
  async getAllRules(filters: RuleFilterDto = {}) {
    const query: any = {};

    // Apply filters
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.service) {
      query.applicableServices = filters.service;
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { id: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build sort criteria
    const sortCriteria: any = {};
    sortCriteria[filters.sortBy || 'priority'] = filters.sortOrder === 'desc' ? -1 : 1;

    try {
      const [rules, total] = await Promise.all([
        this.pricingRuleModel
          .find(query)
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.pricingRuleModel.countDocuments(query)
      ]);

      return {
        rules,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve pricing rules',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get a specific pricing rule by ID
   */
  async getRuleById(id: string): Promise<PricingRuleDocument | null> {
    try {
      return await this.pricingRuleModel.findOne({ id }).exec();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve pricing rule',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a new pricing rule
   */
  async createRule(createRuleDto: CreatePricingRuleDto): Promise<PricingRuleDocument> {
    try {
      // Check if rule ID already exists
      const existingRule = await this.pricingRuleModel.findOne({ id: createRuleDto.id });
      if (existingRule) {
        throw new HttpException(
          `Rule with ID '${createRuleDto.id}' already exists`,
          HttpStatus.CONFLICT
        );
      }

      // Validate rule structure
      await this.validateRule(createRuleDto);

      // Create the rule
      const newRule = new this.pricingRuleModel({
        ...createRuleDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: createRuleDto.version || '1.0.0'
      });

      const savedRule = await newRule.save();

      // Log the creation
      await this.logRuleChange(savedRule.id, 'created', {}, 'system', 'Rule created');

      return savedRule;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        errorMessage || 'Failed to create pricing rule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Update an existing pricing rule
   */
  async updateRule(id: string, updateRuleDto: UpdatePricingRuleDto): Promise<PricingRuleDocument | null> {
    try {
      const existingRule = await this.pricingRuleModel.findOne({ id });
      if (!existingRule) {
        return null;
      }

      // Validate updated rule structure
      const updatedRuleData = { ...existingRule.toObject(), ...updateRuleDto };
      await this.validateRule(updatedRuleData);

      // Track changes for audit
      const changes = this.trackChanges(existingRule.toObject(), updateRuleDto);

      // Update the rule
      const updatedRule = await this.pricingRuleModel.findOneAndUpdate(
        { id },
        {
          ...updateRuleDto,
          updatedAt: new Date(),
          version: this.incrementVersion(existingRule.version)
        },
        { new: true }
      );

      // Log the update
      if (Object.keys(changes).length > 0) {
        await this.logRuleChange(id, 'updated', changes, 'system', 'Rule updated');
      }

      return updatedRule;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        errorMessage || 'Failed to update pricing rule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Delete a pricing rule (soft delete)
   */
  async deleteRule(id: string): Promise<boolean> {
    try {
      const rule = await this.pricingRuleModel.findOneAndUpdate(
        { id },
        {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!rule) {
        return false;
      }

      // Log the deletion
      await this.logRuleChange(id, 'deleted', {}, 'system', 'Rule soft deleted');

      return true;
    } catch (error) {
      throw new HttpException(
        'Failed to delete pricing rule',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Test a pricing rule against sample data
   */
  async testRule(testRuleDto: TestRuleDto): Promise<RuleTestResult> {
    try {
      const { rule, testData } = testRuleDto;

      // Validate the rule structure
      await this.validateRule(rule);

      // Create test estimator with the rule - convert DTO to pricing engine format
      const testRules = [this.convertDtoToPricingRule(rule)];
      const estimator = new DeterministicEstimator(testRules, defaultRules.locationHandicaps as any);

      // Create sample estimate input or use provided test data
      const estimateInput = this.createTestEstimateInput(testData);

      // Run the calculation
      const result = estimator.calculateEstimate(estimateInput, 'test-user');

      // Find if this rule was applied
      const appliedRule = result.calculations.appliedRules.find(ar => ar.ruleId === rule.id);

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: !!appliedRule,
        conditionsEvaluated: rule.conditions.map(condition => ({
          condition,
          result: this.evaluateCondition(condition, estimateInput),
          actualValue: this.getFieldValue(estimateInput, condition.field)
        })),
        actionsApplied: appliedRule ? rule.actions : undefined,
        priceImpact: appliedRule?.priceImpact || 0,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        ruleId: testRuleDto.rule.id,
        ruleName: testRuleDto.rule.name,
        matched: false,
        conditionsEvaluated: [],
        errors: [errorMessage]
      };
    }
  }

  /**
   * Get available rule categories
   */
  async getCategories() {
    return Object.values(RuleCategory).map(category => ({
      value: category,
      label: this.formatCategoryLabel(category)
    }));
  }

  /**
   * Get available operators
   */
  async getOperators() {
    return Object.values(OperatorType).map(operator => ({
      value: operator,
      label: this.formatOperatorLabel(operator)
    }));
  }

  /**
   * Get available action types
   */
  async getActionTypes() {
    return Object.values(ActionType).map(action => ({
      value: action,
      label: this.formatActionLabel(action)
    }));
  }

  /**
   * Export all rules to JSON
   */
  async exportRules() {
    try {
      const rules = await this.pricingRuleModel.find({ isActive: true }).sort({ priority: 1 });

      return {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        rulesCount: rules.length,
        rules: rules.map(rule => rule.toObject())
      };
    } catch (error) {
      throw new HttpException(
        'Failed to export rules',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Import rules from JSON
   */
  async importRules(rulesData: any) {
    try {
      // Validate import data structure
      if (!rulesData.rules || !Array.isArray(rulesData.rules)) {
        throw new HttpException(
          'Invalid import data: rules array required',
          HttpStatus.BAD_REQUEST
        );
      }

      // Create backup before import
      await this.createBackup();

      // Validate each rule
      for (const rule of rulesData.rules) {
        await this.validateRule(rule);
      }

      // Clear existing rules (soft delete)
      await this.pricingRuleModel.updateMany(
        {},
        {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      );

      // Import new rules
      const importedRules = [];
      for (const ruleData of rulesData.rules) {
        const newRule = new this.pricingRuleModel({
          ...ruleData,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0'
        });

        const savedRule = await newRule.save();
        importedRules.push(savedRule);

        // Log the import
        await this.logRuleChange(savedRule.id, 'created', {}, 'system', 'Rule imported');
      }

      return {
        message: 'Rules imported successfully',
        importedCount: importedRules.length,
        rules: importedRules
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        errorMessage || 'Failed to import rules',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get pricing rule change history
   */
  async getRuleHistory(ruleId: string): Promise<RuleHistoryEntry[]> {
    try {
      const historyDocs = await this.ruleHistoryModel
        .find({ ruleId })
        .sort({ timestamp: -1 })
        .limit(50)
        .exec();

      return historyDocs.map(doc => ({
        id: (doc as any)._id.toString(),
        ruleId: doc.ruleId,
        action: doc.action as 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated',
        changes: doc.changes,
        userId: doc.userId,
        userName: doc.userName,
        timestamp: doc.timestamp,
        reason: doc.reason
      }));
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve rule history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a backup of current rules
   */
  async createBackup(): Promise<RuleBackup> {
    try {
      const rules = await this.pricingRuleModel.find({ isActive: true });

      const backup: RuleBackup = {
        id: `backup_${Date.now()}`,
        timestamp: new Date(),
        userId: 'system',
        userName: 'System Backup',
        rulesCount: rules.length,
        description: `Automatic backup created before rule changes`,
        rules: rules.map(rule => rule.toObject())
      };

      // In a real implementation, you might save this to a backup collection
      // For now, we'll return the backup data
      return backup;
    } catch (error) {
      throw new HttpException(
        'Failed to create backup',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private helper methods

  private convertDtoToPricingRule(dto: CreatePricingRuleDto): any {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      category: this.mapCategoryToPricingEngine(dto.category),
      priority: dto.priority,
      conditions: dto.conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
        logicalOperator: 'and'
      })),
      actions: dto.actions.map(a => ({
        type: a.type,
        amount: a.amount,
        description: a.description,
        targetField: a.targetField
      })),
      isActive: dto.isActive || true,
      applicableServices: dto.applicableServices,
      version: dto.version || '1.0.0'
    };
  }

  private mapCategoryToPricingEngine(category: string): string {
    const categoryMap: Record<string, string> = {
      'base_pricing': 'base_pricing',
      'crew_adjustments': 'weight_based',
      'weight_volume': 'volume_based',
      'distance': 'distance_based',
      'timing': 'seasonal',
      'special_items': 'special_items',
      'location_handicaps': 'location_handicap',
      'additional_services': 'difficulty_based'
    };
    return categoryMap[category] || 'base_pricing';
  }

  private async validateRule(rule: any): Promise<void> {
    // Validate rule structure
    if (!rule.id || !rule.name || !rule.conditions || !rule.actions) {
      throw new Error('Invalid rule structure: missing required fields');
    }

    // Validate conditions
    for (const condition of rule.conditions) {
      if (!condition.field || !condition.operator) {
        throw new Error('Invalid condition: field and operator required');
      }
    }

    // Validate actions
    for (const action of rule.actions) {
      if (!action.type || action.amount === undefined || !action.targetField) {
        throw new Error('Invalid action: type, amount, and targetField required');
      }
    }

    // Validate priority uniqueness within category
    const existingRule = await this.pricingRuleModel.findOne({
      category: rule.category,
      priority: rule.priority,
      isActive: true,
      id: { $ne: rule.id }
    });

    if (existingRule) {
      throw new Error(
        `Priority ${rule.priority} already exists in category ${rule.category}`
      );
    }
  }

  private async logRuleChange(
    ruleId: string,
    action: string,
    changes: any,
    userId: string,
    reason?: string
  ): Promise<void> {
    try {
      const historyEntry = new this.ruleHistoryModel({
        ruleId,
        action,
        changes,
        userId,
        userName: 'System User', // In real implementation, get from user context
        timestamp: new Date(),
        reason
      });

      await historyEntry.save();
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log rule change:', error);
    }
  }

  private trackChanges(oldRule: any, newRule: any): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key in newRule) {
      if (Object.prototype.hasOwnProperty.call(newRule, key) && oldRule[key] !== newRule[key]) {
        changes[key] = {
          old: oldRule[key],
          new: newRule[key]
        };
      }
    }

    return changes;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private evaluateCondition(condition: any, data: any): boolean {
    const fieldValue = this.getFieldValue(data, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'in':
        return condition.values?.includes(fieldValue) || false;
      case 'not_in':
        return !condition.values?.includes(fieldValue) || true;
      default:
        return false;
    }
  }

  private getFieldValue(data: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private createTestEstimateInput(testData?: any): any {
    return {
      customerId: 'test-customer',
      service: testData?.service || 'local',
      totalWeight: testData?.totalWeight || 3000,
      totalVolume: testData?.totalVolume || 500,
      distance: testData?.distance || 15,
      crewSize: testData?.crewSize || 2,
      isWeekend: testData?.isWeekend || false,
      isHoliday: testData?.isHoliday || false,
      seasonalPeriod: testData?.seasonalPeriod || 'standard',
      specialItems: testData?.specialItems || {},
      pickup: testData?.pickup || {
        floorLevel: 1,
        elevatorAccess: true,
        accessDifficulty: 'easy',
        stairsCount: 0
      },
      delivery: testData?.delivery || {
        floorLevel: 1,
        elevatorAccess: true,
        accessDifficulty: 'easy',
        stairsCount: 0
      },
      moveDate: new Date(),
      rooms: []
    };
  }

  private formatCategoryLabel(category: string): string {
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private formatOperatorLabel(operator: string): string {
    const labels: Record<string, string> = {
      'eq': 'Equals',
      'neq': 'Not Equals',
      'gt': 'Greater Than',
      'gte': 'Greater Than or Equal',
      'lt': 'Less Than',
      'lte': 'Less Than or Equal',
      'in': 'In List',
      'not_in': 'Not In List',
      'contains': 'Contains',
      'starts_with': 'Starts With',
      'ends_with': 'Ends With'
    };
    return labels[operator] || operator;
  }

  private formatActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'add_fixed': 'Add Fixed Amount',
      'add_percentage': 'Add Percentage',
      'subtract_fixed': 'Subtract Fixed Amount',
      'subtract_percentage': 'Subtract Percentage',
      'multiply': 'Multiply By',
      'set_fixed': 'Set Fixed Amount',
      'set_percentage': 'Set Percentage'
    };
    return labels[action] || action;
  }
}