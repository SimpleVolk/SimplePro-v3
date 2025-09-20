import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilters
} from './interfaces/customer.interface';

// Browser-compatible UUID generation (same as pricing engine)
function generateUUID(): string {
  try {
    const crypto = require('crypto');
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // crypto module not available in browser
  }

  // Fallback to crypto.getRandomValues for browsers
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (window.crypto.getRandomValues(new Uint8Array(1))[0] & 15) | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Final fallback using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

@Injectable()
export class CustomersService {
  // In-memory storage for now - will be replaced with MongoDB
  private customers: Map<string, Customer> = new Map();

  async create(createCustomerDto: CreateCustomerDto, createdBy: string): Promise<Customer> {
    // Check for duplicate email
    const existingCustomer = Array.from(this.customers.values())
      .find(customer => customer.email.toLowerCase() === createCustomerDto.email.toLowerCase());

    if (existingCustomer) {
      throw new ConflictException('Customer with this email already exists');
    }

    const now = new Date();
    const customer: Customer = {
      id: generateUUID(),
      ...createCustomerDto,
      status: 'lead', // Default status for new customers
      communicationPreferences: createCustomerDto.communicationPreferences || {
        allowMarketing: true,
        allowSms: true,
        allowEmail: true,
      },
      estimates: [],
      jobs: [],
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.customers.set(customer.id, customer);
    return customer;
  }

  async findAll(filters?: CustomerFilters): Promise<Customer[]> {
    let customers = Array.from(this.customers.values());

    if (filters) {
      customers = customers.filter(customer => {
        // Status filter
        if (filters.status && customer.status !== filters.status) {
          return false;
        }

        // Type filter
        if (filters.type && customer.type !== filters.type) {
          return false;
        }

        // Source filter
        if (filters.source && customer.source !== filters.source) {
          return false;
        }

        // Assigned sales rep filter
        if (filters.assignedSalesRep && customer.assignedSalesRep !== filters.assignedSalesRep) {
          return false;
        }

        // Tags filter (customer must have at least one of the specified tags)
        if (filters.tags && filters.tags.length > 0) {
          if (!customer.tags || !filters.tags.some(tag => customer.tags!.includes(tag))) {
            return false;
          }
        }

        // Lead score range
        if (filters.leadScoreMin !== undefined && (!customer.leadScore || customer.leadScore < filters.leadScoreMin)) {
          return false;
        }
        if (filters.leadScoreMax !== undefined && (!customer.leadScore || customer.leadScore > filters.leadScoreMax)) {
          return false;
        }

        // Date filters
        if (filters.createdAfter && customer.createdAt < filters.createdAfter) {
          return false;
        }
        if (filters.createdBefore && customer.createdAt > filters.createdBefore) {
          return false;
        }
        if (filters.lastContactAfter && (!customer.lastContactDate || customer.lastContactDate < filters.lastContactAfter)) {
          return false;
        }
        if (filters.lastContactBefore && (!customer.lastContactDate || customer.lastContactDate > filters.lastContactBefore)) {
          return false;
        }

        // Search filter (name, email, phone, company)
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const searchableText = [
            customer.firstName,
            customer.lastName,
            customer.email,
            customer.phone,
            customer.alternatePhone || '',
            customer.companyName || ''
          ].join(' ').toLowerCase();

          if (!searchableText.includes(searchTerm)) {
            return false;
          }
        }

        return true;
      });
    }

    // Sort by creation date (newest first)
    return customers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findOne(id: string): Promise<Customer> {
    const customer = this.customers.get(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const customer = Array.from(this.customers.values())
      .find(customer => customer.email.toLowerCase() === email.toLowerCase());
    return customer || null;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, _updatedBy: string): Promise<Customer> {
    const customer = await this.findOne(id);

    // Check for email conflicts if email is being updated
    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existingCustomer = await this.findByEmail(updateCustomerDto.email);
      if (existingCustomer && existingCustomer.id !== id) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    // Merge address if provided
    if (updateCustomerDto.address) {
      updateCustomerDto.address = {
        ...customer.address,
        ...updateCustomerDto.address,
      };
    }

    // Merge communication preferences if provided
    if (updateCustomerDto.communicationPreferences) {
      updateCustomerDto.communicationPreferences = {
        ...customer.communicationPreferences,
        ...updateCustomerDto.communicationPreferences,
      };
    }

    const updatedCustomer: Customer = {
      ...customer,
      ...updateCustomerDto,
      // Ensure address fields are properly merged and required fields are present
      address: {
        ...customer.address,
        ...updateCustomerDto.address,
      },
      // Ensure communicationPreferences are properly merged if provided
      communicationPreferences: updateCustomerDto.communicationPreferences
        ? {
            allowMarketing: updateCustomerDto.communicationPreferences.allowMarketing ?? customer.communicationPreferences?.allowMarketing ?? false,
            allowSms: updateCustomerDto.communicationPreferences.allowSms ?? customer.communicationPreferences?.allowSms ?? false,
            allowEmail: updateCustomerDto.communicationPreferences.allowEmail ?? customer.communicationPreferences?.allowEmail ?? false,
          }
        : customer.communicationPreferences,
      // Ensure referredBy is properly merged if provided
      referredBy: updateCustomerDto.referredBy && updateCustomerDto.referredBy.source
        ? {
            customerId: updateCustomerDto.referredBy.customerId ?? customer.referredBy?.customerId,
            partnerName: updateCustomerDto.referredBy.partnerName ?? customer.referredBy?.partnerName,
            source: updateCustomerDto.referredBy.source,
          }
        : customer.referredBy,
      updatedAt: new Date(),
    };

    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Verify customer exists
    this.customers.delete(id);
  }

  async addEstimate(customerId: string, estimateId: string): Promise<Customer> {
    const customer = await this.findOne(customerId);

    if (!customer.estimates!.includes(estimateId)) {
      customer.estimates!.push(estimateId);
      customer.updatedAt = new Date();
      this.customers.set(customerId, customer);
    }

    return customer;
  }

  async addJob(customerId: string, jobId: string): Promise<Customer> {
    const customer = await this.findOne(customerId);

    if (!customer.jobs!.includes(jobId)) {
      customer.jobs!.push(jobId);
      customer.updatedAt = new Date();
      this.customers.set(customerId, customer);
    }

    return customer;
  }

  async updateLastContact(customerId: string): Promise<Customer> {
    const customer = await this.findOne(customerId);
    customer.lastContactDate = new Date();
    customer.updatedAt = new Date();
    this.customers.set(customerId, customer);
    return customer;
  }

  // Analytics methods
  async getCustomerStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    recentlyCreated: number; // Last 30 days
  }> {
    const customers = Array.from(this.customers.values());
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = {
      total: customers.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      recentlyCreated: customers.filter(c => c.createdAt > thirtyDaysAgo).length,
    };

    customers.forEach(customer => {
      // Count by status
      stats.byStatus[customer.status] = (stats.byStatus[customer.status] || 0) + 1;

      // Count by type
      stats.byType[customer.type] = (stats.byType[customer.type] || 0) + 1;

      // Count by source
      stats.bySource[customer.source] = (stats.bySource[customer.source] || 0) + 1;
    });

    return stats;
  }
}