import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpException, HttpStatus } from '@nestjs/common';
import { PricingRulesService } from './pricing-rules.service';
import { PricingRule } from './schemas/pricing-rule.schema';
import { RuleHistory } from './schemas/rule-history.schema';
import {
  basePricingRule,
  weightBasedRule,
  distanceBasedRule,
  specialItemsRule,
  seasonalRule,
  stairsHandicapRule,
  crewSizeRule,
  inactiveRule,
  invalidRule,
  mockPricingRules,
  testRuleData,
  ruleFilters,
  mockRuleHistory,
  mockRuleBackup,
} from '../../test/fixtures/pricing-rules.fixture';
import { createMockModel, createMockQueryChain } from '../../test/mocks/model.factory';

describe('PricingRulesService', () => {
  let service: PricingRulesService;
  let pricingRuleModel: any;
  let ruleHistoryModel: any;

  beforeEach(async () => {
    pricingRuleModel = createMockModel();
    ruleHistoryModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingRulesService,
        {
          provide: getModelToken(PricingRule.name),
          useValue: pricingRuleModel,
        },
        {
          provide: getModelToken(RuleHistory.name),
          useValue: ruleHistoryModel,
        },
      ],
    }).compile();

    service = module.get<PricingRulesService>(PricingRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getAllRules', () => {
    it('should return all rules with pagination', async () => {
      pricingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockPricingRules),
            }),
          }),
        }),
      });
      pricingRuleModel.countDocuments.mockResolvedValue(7);

      const result = await service.getAllRules({});

      expect(result.rules).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(7);
    });

    it('should filter by category', async () => {
      const timingRules = mockPricingRules.filter(r => r.category === 'timing');
      pricingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(timingRules),
            }),
          }),
        }),
      });
      pricingRuleModel.countDocuments.mockResolvedValue(timingRules.length);

      await service.getAllRules(ruleFilters.byCategory);

      expect(pricingRuleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        category: 'timing',
      }));
    });

    it('should filter by active status', async () => {
      await service.getAllRules(ruleFilters.byActive);

      expect(pricingRuleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
      }));
    });

    it('should filter by applicable service', async () => {
      await service.getAllRules(ruleFilters.byService);

      expect(pricingRuleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        applicableServices: 'local',
      }));
    });

    it('should search rules by text', async () => {
      await service.getAllRules(ruleFilters.bySearch);

      expect(pricingRuleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({ name: expect.any(Object) }),
          expect.objectContaining({ description: expect.any(Object) }),
        ]),
      }));
    });

    it('should handle pagination parameters', async () => {
      pricingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      pricingRuleModel.countDocuments.mockResolvedValue(50);

      const result = await service.getAllRules({ page: 2, limit: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.pages).toBe(5);
    });

    it('should sort by priority by default', async () => {
      const sortMock = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      pricingRuleModel.find.mockReturnValue({ sort: sortMock });
      pricingRuleModel.countDocuments.mockResolvedValue(0);

      await service.getAllRules({});

      expect(sortMock).toHaveBeenCalledWith(expect.objectContaining({
        priority: 1,
      }));
    });

    it('should handle custom sort order', async () => {
      const sortMock = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      pricingRuleModel.find.mockReturnValue({ sort: sortMock });
      pricingRuleModel.countDocuments.mockResolvedValue(0);

      await service.getAllRules({ sortBy: 'name', sortOrder: 'desc' });

      expect(sortMock).toHaveBeenCalledWith(expect.objectContaining({
        name: -1,
      }));
    });
  });

  describe('getRuleById', () => {
    it('should return rule by ID', async () => {
      pricingRuleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(basePricingRule),
      });

      const result = await service.getRuleById('rule_weekend_surcharge');

      expect(result).toBeDefined();
      expect(result.id).toBe('rule_weekend_surcharge');
    });

    it('should return null when rule not found', async () => {
      pricingRuleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getRuleById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createRule', () => {
    it('should create a new rule successfully', async () => {
      pricingRuleModel.findOne.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue(basePricingRule);

      const result = await service.createRule(basePricingRule);

      expect(result).toBeDefined();
      expect(result.id).toBe('rule_weekend_surcharge');
    });

    it('should throw conflict error if rule ID exists', async () => {
      pricingRuleModel.findOne.mockResolvedValue(basePricingRule);

      await expect(service.createRule(basePricingRule)).rejects.toThrow(HttpException);
      await expect(service.createRule(basePricingRule)).rejects.toThrow(expect.objectContaining({
        status: HttpStatus.CONFLICT,
      }));
    });

    it('should validate rule structure before creation', async () => {
      pricingRuleModel.findOne.mockResolvedValue(null);

      await expect(service.createRule(invalidRule)).rejects.toThrow(HttpException);
    });

    it('should log rule creation in history', async () => {
      pricingRuleModel.findOne.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue(basePricingRule);

      await service.createRule(basePricingRule);

      expect(ruleHistoryModel).toHaveBeenCalled();
    });

    it('should set version to 1.0.0 by default', async () => {
      pricingRuleModel.findOne.mockResolvedValue(null);
      const ruleWithoutVersion = { ...basePricingRule, version: undefined };
      const mockSave = jest.fn().mockResolvedValue({ ...ruleWithoutVersion, version: '1.0.0' });

      const result = await service.createRule(ruleWithoutVersion as any);

      expect(result.version).toBe('1.0.0');
    });
  });

  describe('updateRule', () => {
    it('should update rule successfully', async () => {
      const mockExisting = { ...basePricingRule, toObject: () => basePricingRule };
      pricingRuleModel.findOne.mockResolvedValue(mockExisting);
      pricingRuleModel.findOneAndUpdate.mockResolvedValue({ ...basePricingRule, description: 'Updated description' });

      const result = await service.updateRule('rule_weekend_surcharge', { description: 'Updated description' });

      expect(result).toBeDefined();
      expect(result.description).toBe('Updated description');
    });

    it('should return null when rule not found', async () => {
      pricingRuleModel.findOne.mockResolvedValue(null);

      const result = await service.updateRule('nonexistent', { description: 'Updated' });

      expect(result).toBeNull();
    });

    it('should validate updated rule structure', async () => {
      const mockExisting = { ...basePricingRule, toObject: () => basePricingRule };
      pricingRuleModel.findOne.mockResolvedValue(mockExisting);

      await expect(service.updateRule('rule_weekend_surcharge', { conditions: [] })).rejects.toThrow(HttpException);
    });

    it('should increment version number', async () => {
      const mockExisting = { ...basePricingRule, version: '1.0.0', toObject: () => ({ ...basePricingRule, version: '1.0.0' }) };
      pricingRuleModel.findOne.mockResolvedValue(mockExisting);
      pricingRuleModel.findOneAndUpdate.mockResolvedValue({ ...basePricingRule, version: '1.0.1' });

      const result = await service.updateRule('rule_weekend_surcharge', { description: 'Updated' });

      expect(pricingRuleModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ version: '1.0.1' }),
        expect.anything()
      );
    });

    it('should log changes in history', async () => {
      const mockExisting = { ...basePricingRule, toObject: () => basePricingRule };
      pricingRuleModel.findOne.mockResolvedValue(mockExisting);
      pricingRuleModel.findOneAndUpdate.mockResolvedValue({ ...basePricingRule, description: 'Updated' });

      await service.updateRule('rule_weekend_surcharge', { description: 'Updated' });

      expect(ruleHistoryModel).toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('should soft delete rule', async () => {
      pricingRuleModel.findOneAndUpdate.mockResolvedValue({ ...basePricingRule, isActive: false });

      const result = await service.deleteRule('rule_weekend_surcharge');

      expect(result).toBe(true);
      expect(pricingRuleModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rule_weekend_surcharge' }),
        expect.objectContaining({ isActive: false }),
        expect.anything()
      );
    });

    it('should return false when rule not found', async () => {
      pricingRuleModel.findOneAndUpdate.mockResolvedValue(null);

      const result = await service.deleteRule('nonexistent');

      expect(result).toBe(false);
    });

    it('should log deletion in history', async () => {
      pricingRuleModel.findOneAndUpdate.mockResolvedValue({ ...basePricingRule, isActive: false });

      await service.deleteRule('rule_weekend_surcharge');

      expect(ruleHistoryModel).toHaveBeenCalled();
    });
  });

  describe('testRule', () => {
    it('should test rule against sample data', async () => {
      const result = await service.testRule(testRuleData);

      expect(result).toBeDefined();
      expect(result.ruleId).toBe('rule_weekend_surcharge');
      expect(result.conditionsEvaluated).toBeDefined();
    });

    it('should return match result when conditions are met', async () => {
      const weekendTestData = {
        ...testRuleData,
        testData: { ...testRuleData.testData, isWeekend: true },
      };

      const result = await service.testRule(weekendTestData);

      expect(result.matched).toBe(true);
    });

    it('should return no match when conditions are not met', async () => {
      const weekdayTestData = {
        ...testRuleData,
        testData: { ...testRuleData.testData, isWeekend: false },
      };

      const result = await service.testRule(weekdayTestData);

      expect(result.matched).toBe(false);
    });

    it('should handle test errors gracefully', async () => {
      const invalidTestData = {
        rule: invalidRule,
        testData: {},
      };

      const result = await service.testRule(invalidTestData);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should evaluate all conditions', async () => {
      const result = await service.testRule(testRuleData);

      expect(result.conditionsEvaluated).toBeDefined();
      expect(result.conditionsEvaluated.length).toBe(testRuleData.rule.conditions.length);
    });
  });

  describe('getCategories', () => {
    it('should return all available categories', async () => {
      const result = await service.getCategories();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('label');
    });
  });

  describe('getOperators', () => {
    it('should return all available operators', async () => {
      const result = await service.getOperators();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('label');
    });
  });

  describe('getActionTypes', () => {
    it('should return all available action types', async () => {
      const result = await service.getActionTypes();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('label');
    });
  });

  describe('exportRules', () => {
    it('should export all active rules', async () => {
      pricingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPricingRules),
        }),
      });

      const result = await service.exportRules();

      expect(result).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.exportDate).toBeDefined();
      expect(result.rulesCount).toBe(7);
      expect(result.rules).toHaveLength(7);
    });

    it('should only export active rules', async () => {
      pricingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPricingRules),
        }),
      });

      await service.exportRules();

      expect(pricingRuleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
      }));
    });
  });

  describe('importRules', () => {
    const importData = {
      version: '1.0.0',
      rules: mockPricingRules,
    };

    it('should import rules successfully', async () => {
      pricingRuleModel.updateMany.mockResolvedValue({ modifiedCount: 0 });
      const mockSave = jest.fn().mockResolvedValue({});

      const result = await service.importRules(importData);

      expect(result).toBeDefined();
      expect(result.importedCount).toBe(7);
      expect(result.message).toContain('successfully');
    });

    it('should validate import data structure', async () => {
      const invalidImportData = { version: '1.0.0' };

      await expect(service.importRules(invalidImportData)).rejects.toThrow(HttpException);
      await expect(service.importRules(invalidImportData)).rejects.toThrow(expect.objectContaining({
        status: HttpStatus.BAD_REQUEST,
      }));
    });

    it('should create backup before import', async () => {
      pricingRuleModel.find.mockResolvedValue(mockPricingRules);
      pricingRuleModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await service.importRules(importData);

      expect(pricingRuleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
      }));
    });

    it('should deactivate existing rules before import', async () => {
      pricingRuleModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

      await service.importRules(importData);

      expect(pricingRuleModel.updateMany).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ isActive: false })
      );
    });
  });

  describe('getRuleHistory', () => {
    it('should return rule change history', async () => {
      ruleHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockRuleHistory]),
          }),
        }),
      });

      const result = await service.getRuleHistory('rule_weekend_surcharge');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('action');
      expect(result[0]).toHaveProperty('changes');
    });

    it('should limit history to 50 entries', async () => {
      const limitMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      ruleHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: limitMock }),
      });

      await service.getRuleHistory('rule_weekend_surcharge');

      expect(limitMock).toHaveBeenCalledWith(50);
    });

    it('should sort history by timestamp descending', async () => {
      const sortMock = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      ruleHistoryModel.find.mockReturnValue({ sort: sortMock });

      await service.getRuleHistory('rule_weekend_surcharge');

      expect(sortMock).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: -1,
      }));
    });
  });

  describe('createBackup', () => {
    it('should create backup of active rules', async () => {
      pricingRuleModel.find.mockResolvedValue(mockPricingRules.map(r => ({ toObject: () => r, ...r })));

      const result = await service.createBackup();

      expect(result).toBeDefined();
      expect(result.id).toContain('backup_');
      expect(result.rulesCount).toBe(7);
      expect(result.rules).toHaveLength(7);
    });

    it('should include backup metadata', async () => {
      pricingRuleModel.find.mockResolvedValue([]);

      const result = await service.createBackup();

      expect(result.timestamp).toBeDefined();
      expect(result.userId).toBe('system');
      expect(result.description).toBeDefined();
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle priority conflict detection', async () => {
      const existingRule = { ...basePricingRule, priority: 100 };
      pricingRuleModel.findOne.mockResolvedValue(existingRule);

      await expect(service.createRule({ ...weightBasedRule, category: 'timing', priority: 100 })).rejects.toThrow();
    });

    it('should validate condition structure', async () => {
      const invalidConditionRule = {
        ...basePricingRule,
        conditions: [{ field: 'isWeekend' }], // Missing operator
      };

      pricingRuleModel.findOne.mockResolvedValue(null);

      await expect(service.createRule(invalidConditionRule as any)).rejects.toThrow();
    });

    it('should validate action structure', async () => {
      const invalidActionRule = {
        ...basePricingRule,
        actions: [{ type: 'add_percentage' }], // Missing amount and targetField
      };

      pricingRuleModel.findOne.mockResolvedValue(null);

      await expect(service.createRule(invalidActionRule as any)).rejects.toThrow();
    });
  });
});
