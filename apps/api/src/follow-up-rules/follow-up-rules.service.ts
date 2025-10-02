import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  FollowUpRule,
  FollowUpRuleDocument,
  EventType,
  ActionType,
  RuleCondition,
} from './schemas/follow-up-rule.schema';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { LeadActivitiesService } from '../lead-activities/lead-activities.service';

@Injectable()
export class FollowUpRulesService {
  private readonly logger = new Logger(FollowUpRulesService.name);

  constructor(
    @InjectModel(FollowUpRule.name)
    private ruleModel: Model<FollowUpRuleDocument>,
    private activitiesService: LeadActivitiesService,
  ) {}

  async createRule(dto: CreateRuleDto, userId: string): Promise<FollowUpRuleDocument> {
    const ruleId = dto.ruleId || uuidv4();

    const rule = new this.ruleModel({
      ...dto,
      ruleId,
      createdBy: userId,
    });

    return rule.save();
  }

  async findAll(): Promise<FollowUpRuleDocument[]> {
    return this.ruleModel.find().sort({ priority: 1 }).exec();
  }

  async findActiveRules(eventType?: EventType): Promise<FollowUpRuleDocument[]> {
    const filter: any = { isActive: true };

    if (eventType) {
      filter['trigger.eventType'] = eventType;
    }

    return this.ruleModel.find(filter).sort({ priority: 1 }).exec();
  }

  async findById(ruleId: string): Promise<FollowUpRuleDocument> {
    const rule = await this.ruleModel.findOne({ ruleId }).exec();

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }

    return rule;
  }

  async updateRule(
    ruleId: string,
    dto: UpdateRuleDto,
    userId: string
  ): Promise<FollowUpRuleDocument> {
    const rule = await this.ruleModel
      .findOneAndUpdate(
        { ruleId },
        { ...dto, updatedBy: userId },
        { new: true }
      )
      .exec();

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }

    return rule;
  }

  async deleteRule(ruleId: string): Promise<void> {
    const result = await this.ruleModel.deleteOne({ ruleId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }
  }

  async testRule(ruleId: string, sampleData: any): Promise<any> {
    const rule = await this.findById(ruleId);

    const matches = this.evaluateConditions(rule.trigger.conditions, sampleData);

    return {
      ruleId: rule.ruleId,
      ruleName: rule.name,
      matches,
      sampleData,
      trigger: rule.trigger,
      actions: rule.actions,
      wouldExecute: matches,
    };
  }

  // Event listeners for automation triggers
  @OnEvent('opportunity.created')
  async handleOpportunityCreated(payload: any) {
    await this.evaluateAndExecuteRules(EventType.OPPORTUNITY_CREATED, payload);
  }

  @OnEvent('opportunity.status_changed')
  async handleStatusChanged(payload: any) {
    await this.evaluateAndExecuteRules(EventType.STATUS_CHANGED, payload);
  }

  @OnEvent('estimate.created')
  async handleEstimateCreated(payload: any) {
    await this.evaluateAndExecuteRules(EventType.QUOTE_SENT, payload);
  }

  @OnEvent('activity.completed')
  async handleActivityCompleted(payload: any) {
    await this.evaluateAndExecuteRules(EventType.ACTIVITY_COMPLETED, payload);
  }

  private async evaluateAndExecuteRules(eventType: EventType, eventData: any) {
    try {
      const rules = await this.findActiveRules(eventType);

      this.logger.log(
        `Evaluating ${rules.length} rules for event type: ${eventType}`
      );

      for (const rule of rules) {
        const matches = this.evaluateConditions(rule.trigger.conditions, eventData);

        if (matches) {
          this.logger.log(`Rule "${rule.name}" (${rule.ruleId}) matched. Executing actions...`);
          await this.executeActions(rule.actions, eventData, rule.ruleId);
        }
      }
    } catch (error) {
      this.logger.error(`Error evaluating rules for ${eventType}:`, error);
    }
  }

  private evaluateConditions(conditions: RuleCondition[], data: any): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every((condition) => {
      const value = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(value);
        default:
          return false;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeActions(
    actions: any[],
    eventData: any,
    ruleId: string
  ): Promise<void> {
    for (const action of actions) {
      try {
        // Calculate execution time based on delay
        const executionTime = new Date();
        executionTime.setHours(executionTime.getHours() + action.delay);

        switch (action.actionType) {
          case ActionType.CREATE_ACTIVITY:
            await this.createActivityAction(action, eventData, executionTime, ruleId);
            break;

          case ActionType.SEND_EMAIL:
            await this.sendEmailAction(action, eventData);
            break;

          case ActionType.SEND_NOTIFICATION:
            await this.sendNotificationAction(action, eventData);
            break;

          case ActionType.UPDATE_STATUS:
            this.logger.log('UPDATE_STATUS action - not yet implemented');
            break;

          case ActionType.ASSIGN_SALES_REP:
            this.logger.log('ASSIGN_SALES_REP action - not yet implemented');
            break;

          case ActionType.CREATE_JOB:
            this.logger.log('CREATE_JOB action - not yet implemented');
            break;

          default:
            this.logger.warn(`Unknown action type: ${action.actionType}`);
        }
      } catch (error) {
        this.logger.error(`Error executing action ${action.actionType}:`, error);
      }
    }
  }

  private async createActivityAction(
    action: any,
    eventData: any,
    executionTime: Date,
    ruleId: string
  ): Promise<void> {
    const opportunityId = eventData.opportunity?._id || eventData.opportunity?.id;
    const customerId = eventData.opportunity?.customerId || eventData.customerId;
    const userId = eventData.userId || eventData.createdBy || 'system';

    if (!opportunityId || !customerId) {
      this.logger.warn('Missing opportunityId or customerId for CREATE_ACTIVITY action');
      return;
    }

    const assignTo = this.resolveAssignment(action.assignTo, eventData);

    await this.activitiesService.createActivity(
      {
        opportunityId,
        customerId,
        activityType: action.activityType || 'follow_up',
        subject: action.subject || 'Automated Follow-up',
        description: action.description || '',
        dueDate: executionTime.toISOString(),
        assignedTo: assignTo,
        metadata: {
          ...action.metadata,
          automationRuleId: ruleId,
          automatedAction: true,
        },
      },
      'system'
    );

    this.logger.log(
      `Created activity for opportunity ${opportunityId}, due at ${executionTime.toISOString()}`
    );
  }

  private async sendEmailAction(action: any, eventData: any): Promise<void> {
    // Placeholder for email sending logic
    this.logger.log(`Email action triggered with template: ${action.template}`);
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  }

  private async sendNotificationAction(action: any, eventData: any): Promise<void> {
    // Placeholder for notification logic
    this.logger.log(`Notification action triggered`);
    // TODO: Integrate with notification service (WebSocket, Push, etc.)
  }

  private resolveAssignment(assignTo: string | undefined, eventData: any): string {
    if (!assignTo || assignTo === 'lead_owner') {
      return eventData.opportunity?.assignedSalesRep ||
             eventData.opportunity?.createdBy ||
             eventData.userId ||
             'system';
    }

    if (assignTo === 'round_robin') {
      // TODO: Implement round-robin assignment logic
      this.logger.log('Round-robin assignment not yet implemented, using lead owner');
      return eventData.opportunity?.assignedSalesRep || eventData.userId || 'system';
    }

    return assignTo;
  }
}
