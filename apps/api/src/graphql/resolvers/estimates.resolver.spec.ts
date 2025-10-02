import { Test, TestingModule } from '@nestjs/testing';
import { EstimatesResolver } from './estimates.resolver';
import { EstimatesService } from '../../estimates/estimates.service';

describe('EstimatesResolver', () => {
  let resolver: EstimatesResolver;
  let estimatesService: EstimatesService;

  const mockEstimatesService = {
    calculateEstimate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimatesResolver,
        {
          provide: EstimatesService,
          useValue: mockEstimatesService,
        },
      ],
    }).compile();

    resolver = module.get<EstimatesResolver>(EstimatesResolver);
    estimatesService = module.get<EstimatesService>(EstimatesService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('calculateEstimate', () => {
    it('should calculate an estimate', async () => {
      const input = {
        moveDate: '2025-10-15',
        serviceType: 'local',
        locations: {
          pickup: { address: '123 Main St', stairs: 0 },
          delivery: { address: '456 Oak Ave', stairs: 0 },
        },
        inventory: {
          weight: 5000,
          volume: 500,
          crewSize: 2,
        },
        services: {
          packing: false,
          assembly: false,
          storage: false,
        },
      };

      const expectedResult = {
        success: true,
        estimate: {
          estimateId: 'test-estimate-id',
          calculations: {
            finalPrice: 750,
            appliedRules: [],
          },
          metadata: {
            deterministic: true,
            hash: 'test-hash',
          },
        },
        timestamp: expect.any(String),
      };

      mockEstimatesService.calculateEstimate.mockResolvedValue(expectedResult);

      const result = await resolver.calculateEstimate(input);

      expect(result).toEqual(expectedResult);
      expect(estimatesService.calculateEstimate).toHaveBeenCalledWith(input);
    });
  });
});
