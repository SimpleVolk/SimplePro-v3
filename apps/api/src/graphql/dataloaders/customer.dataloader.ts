import { Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import DataLoader from 'dataloader';
import {
  Customer,
  CustomerDocument,
} from '../../customers/schemas/customer.schema';

@Injectable({ scope: Scope.REQUEST })
export class CustomerDataLoader {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  private readonly batchCustomers = new DataLoader<string, Customer | null>(
    async (customerIds: readonly string[]) => {
      // Fetch all customers in a single query
      const customers = await this.customerModel
        .find({ _id: { $in: customerIds as string[] } })
        .lean()
        .exec();

      // Create a map for quick lookup
      const customerMap = new Map<string, Customer>();
      customers.forEach((customer: any) => {
        customerMap.set(
          customer._id.toString(),
          this.convertCustomerDocument(customer),
        );
      });

      // Return customers in the same order as requested IDs
      return customerIds.map((id) => customerMap.get(id) || null);
    },
  );

  async load(customerId: string): Promise<Customer | null> {
    return this.batchCustomers.load(customerId);
  }

  async loadMany(customerIds: string[]): Promise<(Customer | null)[]> {
    return this.batchCustomers.loadMany(customerIds) as Promise<
      (Customer | null)[]
    >;
  }

  private convertCustomerDocument(doc: any): Customer {
    return {
      id: doc._id?.toString() || doc.id,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phone: doc.phone,
      alternatePhone: doc.alternatePhone,
      type: doc.type,
      status: doc.status,
      source: doc.source,
      companyName: doc.companyName,
      businessLicense: doc.businessLicense,
      preferredContactMethod: doc.preferredContactMethod,
      address: doc.address,
      communicationPreferences: doc.communicationPreferences,
      referredBy: doc.referredBy,
      assignedSalesRep: doc.assignedSalesRep,
      leadScore: doc.leadScore,
      tags: doc.tags,
      notes: doc.notes,
      estimates: doc.estimates,
      jobs: doc.jobs,
      lastContactDate: doc.lastContactDate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      preferredMoveDate: doc.preferredMoveDate,
      estimatedBudget: doc.estimatedBudget,
      emergencyContact: doc.emergencyContact,
    } as any;
  }
}
