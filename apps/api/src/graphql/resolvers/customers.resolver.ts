import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards, Request } from '@nestjs/common';
import { CustomersService } from '../../customers/customers.service';
import { JobsService } from '../../jobs/jobs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import type {
  Customer,
  CustomerFilters,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../../customers/interfaces/customer.interface';

@Resolver('Customer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersResolver {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jobsService: JobsService,
  ) {}

  // Queries
  @Query('customer')
  async getCustomer(@Args('id') id: string): Promise<Customer | null> {
    return this.customersService.findOne(id);
  }

  @Query('customerByEmail')
  async getCustomerByEmail(
    @Args('email') email: string,
  ): Promise<Customer | null> {
    return this.customersService.findByEmail(email);
  }

  @Query('customers')
  async getCustomers(
    @Args('filters') filters?: CustomerFilters,
    @Args('sortBy') sortBy?: { field: string; order: 'asc' | 'desc' },
    @Args('first') first?: number,
    @Args('after') after?: string,
  ): Promise<any> {
    // Fetch all customers (use large limit for GraphQL compatibility)
    const result = await this.customersService.findAll(filters, 0, 1000);
    const customers = result.data;

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
    const startIndex = after
      ? customers.findIndex((c: any) => c.id === after) + 1
      : 0;
    const paginatedCustomers = customers.slice(startIndex, startIndex + limit);

    const edges = paginatedCustomers.map((customer: Customer) => ({
      node: customer,
      cursor: customer.id,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: startIndex + limit < customers.length,
        hasPreviousPage: startIndex > 0,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
      totalCount: customers.length,
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
    const result = await this.jobsService.findAll(
      {
        customerId: customer.id,
      },
      0,
      100,
    );

    return result.data;
  }

  // Mutations
  @Mutation('createCustomer')
  @Roles('super_admin', 'admin', 'dispatcher')
  async createCustomer(
    @Args('input') input: CreateCustomerDto,
    @Request() req: any,
  ): Promise<Customer> {
    const userId = req.user?.userId || 'system';
    return this.customersService.create(input, userId);
  }

  @Mutation('updateCustomer')
  @Roles('super_admin', 'admin', 'dispatcher')
  async updateCustomer(
    @Args('id') id: string,
    @Args('input') input: UpdateCustomerDto,
    @Request() req: any,
  ): Promise<Customer> {
    const userId = req.user?.userId || 'system';
    return this.customersService.update(id, input, userId);
  }

  @Mutation('deleteCustomer')
  @Roles('super_admin', 'admin')
  async deleteCustomer(@Args('id') id: string): Promise<boolean> {
    await this.customersService.remove(id);
    return true;
  }

  @Mutation('updateCustomerStatus')
  @Roles('super_admin', 'admin', 'dispatcher')
  async updateCustomerStatus(
    @Args('id') id: string,
    @Args('status') status: Customer['status'],
    @Request() req: any,
  ): Promise<Customer> {
    const userId = req.user?.userId || 'system';
    return this.customersService.update(id, { status }, userId);
  }
}
