import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CustomersService } from '../../customers/customers.service';
import { JobsService } from '../../jobs/jobs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  Customer,
  CustomerFilters
} from '../../customers/interfaces/customer.interface';

@Resolver('Customer')
@UseGuards(JwtAuthGuard)
export class CustomersResolver {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jobsService: JobsService
  ) {}

  // Queries
  @Query('customer')
  async getCustomer(@Args('id') id: string): Promise<Customer | null> {
    return this.customersService.findOne(id);
  }

  @Query('customerByEmail')
  async getCustomerByEmail(@Args('email') email: string): Promise<Customer | null> {
    return this.customersService.findByEmail(email);
  }

  @Query('customers')
  async getCustomers(
    @Args('filters') filters?: CustomerFilters,
    @Args('sortBy') sortBy?: { field: string; order: 'asc' | 'desc' },
    @Args('first') first?: number,
    @Args('after') after?: string
  ): Promise<any> {
    const customers = await this.customersService.findAll(filters);

    // Apply sorting if specified
    if (sortBy) {
      customers.sort((a: any, b: any) => {
        const aVal = a[sortBy.field];
        const bVal = b[sortBy.field];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return sortBy.order === 'asc' ? comparison : -comparison;
      });
    }

    // Implement cursor-based pagination
    const limit = first || 20;
    const startIndex = after ? customers.findIndex((c: any) => c.id === after) + 1 : 0;
    const paginatedCustomers = customers.slice(startIndex, startIndex + limit);

    const edges = paginatedCustomers.map((customer: Customer) => ({
      node: customer,
      cursor: customer.id
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: startIndex + limit < customers.length,
        hasPreviousPage: startIndex > 0,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor
      },
      totalCount: customers.length
    };
  }

  // Field Resolvers
  @ResolveField('fullName')
  getFullName(@Parent() customer: Customer): string {
    return `${customer.firstName} ${customer.lastName}`;
  }

  @ResolveField('jobs')
  async getCustomerJobs(@Parent() customer: Customer) {
    if (!customer.jobs || customer.jobs.length === 0) return [];

    // Fetch all jobs for this customer
    const jobs = await this.jobsService.findAll({
      customerId: customer.id
    });

    return jobs;
  }
}
