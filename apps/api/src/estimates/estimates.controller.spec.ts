import { Test, TestingModule } from '@nestjs/testing';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';

describe('EstimatesController', () => {
  let controller: EstimatesController;
  let service: EstimatesService;

  const mockEstimatesService = {
    calculateEstimate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimatesController],
      providers: [
        {
          provide: EstimatesService,
          useValue: mockEstimatesService,
        },
      ],
    }).compile();

    controller = module.get<EstimatesController>(EstimatesController);
    service = module.get<EstimatesService>(EstimatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should calculate estimate successfully', async () => {
    const testEstimate = {
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        phone: '(555) 123-4567'
      },
      pickupLocation: {
        address: '123 Test Street, Springfield, IL 62701',
        accessDifficulty: 'easy',
        floorNumber: 1,
        elevatorAccess: true,
        parkingDistance: 50
      },
      deliveryLocation: {
        address: '456 New Street, Springfield, IL 62703',
        accessDifficulty: 'medium',
        floorNumber: 2,
        elevatorAccess: false,
        parkingDistance: 100
      },
      moveDetails: {
        serviceType: 'local',
        moveDate: '2025-02-15',
        estimatedWeight: 3000,
        estimatedVolume: 500,
        crewSize: 3,
        truckSize: 'medium',
        isWeekend: false
      },
      inventory: [
        { name: 'Sofa', category: 'Furniture', weight: 150, volume: 80, specialHandling: false },
        { name: 'Refrigerator', category: 'Appliances', weight: 300, volume: 60, specialHandling: true }
      ],
      additionalServices: ['packing']
    };

    const mockResult = {
      success: true,
      estimate: {
        estimateId: 'test-estimate-id',
        calculations: {
          finalPrice: 750,
          appliedRules: []
        },
        metadata: {
          deterministic: true,
          hash: 'test-hash'
        }
      }
    };

    mockEstimatesService.calculateEstimate.mockResolvedValue(mockResult);

    const result = await controller.calculateEstimate(testEstimate);

    expect(service.calculateEstimate).toHaveBeenCalledWith(testEstimate);
    expect(result).toEqual(mockResult);
    expect(result.success).toBe(true);
    expect(result.estimate.calculations.finalPrice).toBe(750);
  });

  it('should handle estimate calculation errors', async () => {
    const testEstimate = {
      customer: { firstName: 'John', lastName: 'Doe' },
      // Missing required fields
    };

    const mockError = new Error('Invalid estimate data');
    mockEstimatesService.calculateEstimate.mockRejectedValue(mockError);

    await expect(controller.calculateEstimate(testEstimate as any)).rejects.toThrow('Invalid estimate data');
    expect(service.calculateEstimate).toHaveBeenCalledWith(testEstimate);
  });

  it('should validate deterministic calculations', async () => {
    const testEstimate = {
      customer: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        phone: '(555) 987-6543'
      },
      pickupLocation: {
        address: '789 Old Road, Peoria, IL 61601',
        accessDifficulty: 'difficult',
        floorNumber: 3,
        elevatorAccess: false,
        parkingDistance: 200
      },
      deliveryLocation: {
        address: '321 New Ave, Springfield, IL 62705',
        accessDifficulty: 'easy',
        floorNumber: 1,
        elevatorAccess: true,
        parkingDistance: 25
      },
      moveDetails: {
        serviceType: 'local',
        moveDate: '2025-03-01',
        estimatedWeight: 8000,
        estimatedVolume: 1200,
        crewSize: 4,
        truckSize: 'large',
        isWeekend: true
      },
      inventory: [
        { name: 'Piano', category: 'SpecialItems', weight: 800, volume: 120, specialHandling: true },
        { name: 'Antique Desk', category: 'Furniture', weight: 200, volume: 80, specialHandling: true }
      ],
      additionalServices: ['packing', 'assembly', 'storage']
    };

    const mockResult = {
      success: true,
      estimate: {
        estimateId: 'test-estimate-id-2',
        calculations: {
          finalPrice: 1850,
          appliedRules: [
            { ruleId: 'base_local_rate', priceImpact: 200 },
            { ruleId: 'weekend_surcharge', priceImpact: 150 },
            { ruleId: 'heavy_item_fee', priceImpact: 100 },
            { ruleId: 'piano_handling', priceImpact: 300 }
          ]
        },
        metadata: {
          deterministic: true,
          hash: 'deterministic-hash-456'
        }
      }
    };

    mockEstimatesService.calculateEstimate.mockResolvedValue(mockResult);

    const result = await controller.calculateEstimate(testEstimate);

    expect(result.estimate.metadata.deterministic).toBe(true);
    expect(result.estimate.metadata.hash).toBeTruthy();
    expect(result.estimate.calculations.appliedRules.length).toBeGreaterThan(0);
    expect(result.estimate.calculations.finalPrice).toBeGreaterThan(0);
  });
});