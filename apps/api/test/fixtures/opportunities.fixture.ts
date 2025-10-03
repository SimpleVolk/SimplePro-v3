/**
 * Opportunities Test Fixtures
 *
 * Provides realistic test data for opportunities service testing.
 */

import { CreateOpportunityDto } from '../../src/opportunities/dto/create-opportunity.dto';
import { generateObjectId } from '../utils/test-helpers';

/**
 * Base opportunity DTO
 */
export const baseOpportunityDto: CreateOpportunityDto = {
  customerId: generateObjectId(),
  leadSource: 'website',
  moveDate: new Date('2025-07-15'),
  estimatedValue: 1500,
  probability: 50,
  stage: 'qualified',
  status: 'open',
  assignedSalesRep: generateObjectId(),
  notes: 'Initial consultation completed',
  contactHistory: [],
  estimateRequested: true,
  followUpDate: new Date('2025-06-20'),
};

/**
 * High-value opportunity
 */
export const highValueOpportunityDto: CreateOpportunityDto = {
  ...baseOpportunityDto,
  leadSource: 'referral',
  estimatedValue: 5000,
  probability: 80,
  stage: 'proposal',
  notes: 'Large corporate move, high priority',
};

/**
 * Low-probability opportunity
 */
export const lowProbabilityOpportunityDto: CreateOpportunityDto = {
  ...baseOpportunityDto,
  leadSource: 'cold_call',
  estimatedValue: 800,
  probability: 20,
  stage: 'initial_contact',
  notes: 'Just browsing, may not move for 6 months',
};

/**
 * Won opportunity
 */
export const wonOpportunityDto: any = {
  ...baseOpportunityDto,
  status: 'won',
  probability: 100,
  stage: 'closed_won',
  notes: 'Contract signed, move scheduled',
  closedDate: new Date('2025-06-10'),
};

/**
 * Lost opportunity
 */
export const lostOpportunityDto: any = {
  ...baseOpportunityDto,
  status: 'lost',
  probability: 0,
  stage: 'closed_lost',
  notes: 'Customer chose competitor',
  closedDate: new Date('2025-06-08'),
  lostReason: 'Price too high',
};

/**
 * Mock opportunity document
 */
export function createMockOpportunity(overrides: any = {}) {
  const mockOpportunity = {
    _id: generateObjectId(),
    id: generateObjectId(),
    ...baseOpportunityDto,
    status: 'open',
    createdBy: generateObjectId(),
    updatedBy: generateObjectId(),
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
    save: jest.fn().mockResolvedValue({
      _id: overrides._id || generateObjectId(),
      ...baseOpportunityDto,
      ...overrides,
    }),
    toObject: jest.fn().mockReturnValue({
      _id: overrides._id || generateObjectId(),
      ...baseOpportunityDto,
      ...overrides,
    }),
  };

  return mockOpportunity;
}

/**
 * Multiple opportunities for list testing
 */
export const mockOpportunitiesList = [
  {
    _id: generateObjectId(),
    ...baseOpportunityDto,
    stage: 'qualified',
    status: 'open',
    estimatedValue: 1500,
  },
  {
    _id: generateObjectId(),
    ...baseOpportunityDto,
    stage: 'proposal',
    status: 'open',
    estimatedValue: 3000,
  },
  {
    _id: generateObjectId(),
    ...baseOpportunityDto,
    stage: 'negotiation',
    status: 'open',
    estimatedValue: 2500,
  },
  {
    _id: generateObjectId(),
    ...wonOpportunityDto,
  },
  {
    _id: generateObjectId(),
    ...lostOpportunityDto,
  },
];

/**
 * Statistics mock data
 */
export const mockOpportunityStatistics = {
  total: 25,
  byStatus: {
    open: 15,
    won: 7,
    lost: 3,
  },
  byLeadSource: {
    website: 10,
    referral: 8,
    cold_call: 4,
    social_media: 3,
  },
};

/**
 * Query filter examples
 */
export const opportunityQueryFilters = {
  byStatus: {
    status: 'open',
  },
  byLeadSource: {
    leadSource: 'referral',
  },
  byCustomer: {
    customerId: generateObjectId(),
  },
  byDateRange: {
    fromDate: '2025-06-01',
    toDate: '2025-06-30',
  },
  bySalesRep: {
    assignedSalesRep: generateObjectId(),
  },
};
