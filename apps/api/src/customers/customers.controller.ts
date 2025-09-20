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
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilters,
} from './interfaces/customer.interface';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    // For now, use a default user. In the future, this will come from authentication
    const createdBy = 'api-user';

    const customer = await this.customersService.create(createCustomerDto, createdBy);

    return {
      success: true,
      customer,
      message: 'Customer created successfully',
    };
  }

  @Get()
  async findAll(@Query() query: any) {
    // Parse query parameters into filters
    const filters: CustomerFilters = {
      status: query.status,
      type: query.type,
      source: query.source,
      assignedSalesRep: query.assignedSalesRep,
      tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
      leadScoreMin: query.leadScoreMin ? parseInt(query.leadScoreMin) : undefined,
      leadScoreMax: query.leadScoreMax ? parseInt(query.leadScoreMax) : undefined,
      createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
      createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
      lastContactAfter: query.lastContactAfter ? new Date(query.lastContactAfter) : undefined,
      lastContactBefore: query.lastContactBefore ? new Date(query.lastContactBefore) : undefined,
      search: query.search,
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof CustomerFilters] === undefined) {
        delete filters[key as keyof CustomerFilters];
      }
    });

    const customers = await this.customersService.findAll(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return {
      success: true,
      customers,
      count: customers.length,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.customersService.getCustomerStats();

    return {
      success: true,
      stats,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const customer = await this.customersService.findOne(id);

    return {
      success: true,
      customer,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    // For now, use a default user. In the future, this will come from authentication
    const updatedBy = 'api-user';

    const customer = await this.customersService.update(id, updateCustomerDto, updatedBy);

    return {
      success: true,
      customer,
      message: 'Customer updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
  }

  @Post(':id/contact')
  async updateLastContact(@Param('id') id: string) {
    const customer = await this.customersService.updateLastContact(id);

    return {
      success: true,
      customer,
      message: 'Last contact date updated',
    };
  }

  @Post(':id/estimates/:estimateId')
  async addEstimate(
    @Param('id') customerId: string,
    @Param('estimateId') estimateId: string,
  ) {
    const customer = await this.customersService.addEstimate(customerId, estimateId);

    return {
      success: true,
      customer,
      message: 'Estimate linked to customer',
    };
  }

  @Post(':id/jobs/:jobId')
  async addJob(
    @Param('id') customerId: string,
    @Param('jobId') jobId: string,
  ) {
    const customer = await this.customersService.addJob(customerId, jobId);

    return {
      success: true,
      customer,
      message: 'Job linked to customer',
    };
  }

  @Get('search/email/:email')
  async findByEmail(@Param('email') email: string) {
    const customer = await this.customersService.findByEmail(email);

    return {
      success: true,
      customer,
      found: !!customer,
    };
  }
}