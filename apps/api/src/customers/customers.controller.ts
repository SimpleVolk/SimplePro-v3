import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  UseInterceptors,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CustomersService } from './customers.service';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilters,
} from './interfaces/customer.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../auth/interfaces/user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CustomerQueryFiltersDto } from '../common/dto/query-filters.dto';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { CacheListInterceptor } from '../cache/interceptors/cache-list.interceptor';
import { CacheTTL } from '../cache/decorators/cache-ttl.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CacheListInterceptor) // PERFORMANCE: Automatic caching for GET requests
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ resource: 'customers', action: 'create' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 customer creations per minute
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: User,
    @Req() req: any,
  ) {
    const customer = await this.customersService.create(
      createCustomerDto,
      user.id,
    );

    // Log customer creation
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'CREATE_CUSTOMER',
      'Customer',
      {
        resourceId: customer.id,
        severity: 'info',
        outcome: 'success',
        changes: {
          after: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            type: customer.type,
          },
        },
      },
    );

    return {
      success: true,
      customer,
      message: 'Customer created successfully',
    };
  }

  @Get()
  @CacheTTL(300) // PERFORMANCE: Cache for 5 minutes
  @RequirePermissions({ resource: 'customers', action: 'read' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 reads per minute
  async findAll(
    @Query(ValidationPipe) query: CustomerQueryFiltersDto,
    @Query() pagination: PaginationDto,
  ) {
    // Parse query parameters into filters
    const filters: CustomerFilters = {
      status: query.status,
      type: query.type,
      source: query.source,
      assignedSalesRep: query.assignedSalesRep,
      tags: query.tags
        ? Array.isArray(query.tags)
          ? query.tags
          : [query.tags]
        : undefined,
      leadScoreMin: query.leadScoreMin,
      leadScoreMax: query.leadScoreMax,
      createdAfter: query.createdAfter
        ? new Date(query.createdAfter)
        : undefined,
      createdBefore: query.createdBefore
        ? new Date(query.createdBefore)
        : undefined,
      lastContactAfter: query.lastContactAfter
        ? new Date(query.lastContactAfter)
        : undefined,
      lastContactBefore: query.lastContactBefore
        ? new Date(query.lastContactBefore)
        : undefined,
      search: query.search,
    };

    // Remove undefined values
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof CustomerFilters] === undefined) {
        delete filters[key as keyof CustomerFilters];
      }
    });

    const result = await this.customersService.findAll(
      Object.keys(filters).length > 0 ? filters : undefined,
      pagination.skip,
      pagination.limit,
    );

    return {
      success: true,
      customers: result.data,
      count: result.data.length,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      pagination: result.pagination,
    };
  }

  @Get('stats')
  @RequirePermissions({ resource: 'customers', action: 'read' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStats() {
    const stats = await this.customersService.getCustomerStats();

    return {
      success: true,
      stats,
    };
  }

  @Get(':id')
  @RequirePermissions({ resource: 'customers', action: 'read' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string) {
    const customer = await this.customersService.findOne(id);

    return {
      success: true,
      customer,
    };
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'customers', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: User,
    @Req() req: any,
  ) {
    const customer = await this.customersService.update(
      id,
      updateCustomerDto,
      user.id,
    );

    // Log customer update
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'UPDATE_CUSTOMER',
      'Customer',
      {
        resourceId: id,
        severity: 'info',
        outcome: 'success',
        changes: {
          after: updateCustomerDto,
        },
      },
    );

    return {
      success: true,
      customer,
      message: 'Customer updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({ resource: 'customers', action: 'delete' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: any,
  ) {
    await this.customersService.remove(id);

    // Log customer deletion
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'DELETE_CUSTOMER',
      'Customer',
      {
        resourceId: id,
        severity: 'warning',
        outcome: 'success',
      },
    );
  }

  @Post(':id/contact')
  @RequirePermissions({ resource: 'customers', action: 'update' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateLastContact(@Param('id') id: string) {
    const customer = await this.customersService.updateLastContact(id);

    return {
      success: true,
      customer,
      message: 'Last contact date updated',
    };
  }

  @Post(':id/estimates/:estimateId')
  @RequirePermissions({ resource: 'customers', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async addEstimate(
    @Param('id') customerId: string,
    @Param('estimateId') estimateId: string,
  ) {
    const customer = await this.customersService.addEstimate(
      customerId,
      estimateId,
    );

    return {
      success: true,
      customer,
      message: 'Estimate linked to customer',
    };
  }

  @Post(':id/jobs/:jobId')
  @RequirePermissions({ resource: 'customers', action: 'update' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async addJob(@Param('id') customerId: string, @Param('jobId') jobId: string) {
    const customer = await this.customersService.addJob(customerId, jobId);

    return {
      success: true,
      customer,
      message: 'Job linked to customer',
    };
  }

  @Get('search/email/:email')
  @RequirePermissions({ resource: 'customers', action: 'read' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async findByEmail(@Param('email') email: string) {
    const customer = await this.customersService.findByEmail(email);

    return {
      success: true,
      customer,
      found: !!customer,
    };
  }
}
