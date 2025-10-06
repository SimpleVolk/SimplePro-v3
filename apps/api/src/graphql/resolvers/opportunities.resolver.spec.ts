import { Test, TestingModule } from '@nestjs/testing';
import { OpportunitiesResolver } from './opportunities.resolver';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { CustomersService } from '../../customers/customers.service';
import { CustomerDataLoader } from '../dataloaders/customer.dataloader';

describe('OpportunitiesResolver', () => {
  let resolver: OpportunitiesResolver;
  let opportunitiesService: OpportunitiesService;

  const mockOpportunitiesService = {
    findById: jest.fn(),
    findAll: jest.fn(),
    getStatistics: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  const mockCustomersService = {};

  const mockCustomerDataLoader = {
    load: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesResolver,
        {
          provide: OpportunitiesService,
          useValue: mockOpportunitiesService,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: CustomerDataLoader,
          useValue: mockCustomerDataLoader,
        },
      ],
    }).compile();

    resolver = module.get<OpportunitiesResolver>(OpportunitiesResolver);
    opportunitiesService =
      module.get<OpportunitiesService>(OpportunitiesService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getOpportunity', () => {
    it('should return an opportunity by id', async () => {
      const opportunityId = 'opp-123';
      const mockOpportunity = {
        id: opportunityId,
        customerId: 'cust-456',
        status: 'open',
        serviceType: 'local',
      };

      mockOpportunitiesService.findById.mockResolvedValue(mockOpportunity);

      const result = await resolver.getOpportunity(opportunityId);

      expect(result).toEqual(mockOpportunity);
      expect(opportunitiesService.findById).toHaveBeenCalledWith(opportunityId);
    });
  });

  describe('createOpportunity', () => {
    it('should create a new opportunity', async () => {
      const input = {
        customerId: 'cust-456',
        serviceType: 'local',
        status: 'open',
      };

      const req = { user: { userId: 'user-123' } };

      const mockCreatedOpportunity = {
        id: 'opp-789',
        ...input,
        createdBy: 'user-123',
      };

      mockOpportunitiesService.create.mockResolvedValue(mockCreatedOpportunity);

      const result = await resolver.createOpportunity(input, req);

      expect(result).toEqual(mockCreatedOpportunity);
      expect(opportunitiesService.create).toHaveBeenCalledWith(
        input,
        'user-123',
      );
    });
  });

  describe('deleteOpportunity', () => {
    it('should delete an opportunity', async () => {
      const opportunityId = 'opp-123';

      mockOpportunitiesService.delete.mockResolvedValue(undefined);

      const result = await resolver.deleteOpportunity(opportunityId);

      expect(result).toBe(true);
      expect(opportunitiesService.delete).toHaveBeenCalledWith(opportunityId);
    });
  });
});
