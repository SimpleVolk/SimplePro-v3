export interface Customer {
  id: string;

  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;

  // Address Information
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };

  // Customer Type & Status
  type: 'residential' | 'commercial';
  status: 'lead' | 'prospect' | 'active' | 'inactive';
  source:
    | 'website'
    | 'referral'
    | 'advertising'
    | 'social_media'
    | 'partner'
    | 'other';

  // Business Information (for commercial customers)
  companyName?: string;
  businessLicense?: string;

  // Preferences & Notes
  preferredContactMethod: 'email' | 'phone' | 'text';
  communicationPreferences?: {
    allowMarketing: boolean;
    allowSms: boolean;
    allowEmail: boolean;
  };
  notes?: string;

  // CRM Data
  leadScore?: number;
  tags?: string[];
  assignedSalesRep?: string;

  // Referral Information
  referredBy?: {
    customerId?: string;
    partnerName?: string;
    source: string;
  };

  // Audit Fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastContactDate?: Date;

  // Relationships
  estimates?: string[]; // Array of estimate IDs
  jobs?: string[]; // Array of job IDs
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;

  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };

  type: 'residential' | 'commercial';
  source:
    | 'website'
    | 'referral'
    | 'advertising'
    | 'social_media'
    | 'partner'
    | 'other';

  companyName?: string;
  businessLicense?: string;

  preferredContactMethod: 'email' | 'phone' | 'text';
  communicationPreferences?: {
    allowMarketing: boolean;
    allowSms: boolean;
    allowEmail: boolean;
  };
  notes?: string;

  leadScore?: number;
  tags?: string[];
  assignedSalesRep?: string;

  referredBy?: {
    customerId?: string;
    partnerName?: string;
    source: string;
  };
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  type?: 'residential' | 'commercial';
  status?: 'lead' | 'prospect' | 'active' | 'inactive';
  source?:
    | 'website'
    | 'referral'
    | 'advertising'
    | 'social_media'
    | 'partner'
    | 'other';

  companyName?: string;
  businessLicense?: string;

  preferredContactMethod?: 'email' | 'phone' | 'text';
  communicationPreferences?: {
    allowMarketing?: boolean;
    allowSms?: boolean;
    allowEmail?: boolean;
  };
  notes?: string;

  leadScore?: number;
  tags?: string[];
  assignedSalesRep?: string;

  referredBy?: {
    customerId?: string;
    partnerName?: string;
    source?: string;
  };

  lastContactDate?: Date;
}

export interface CustomerFilters {
  status?: 'lead' | 'prospect' | 'active' | 'inactive';
  type?: 'residential' | 'commercial';
  source?:
    | 'website'
    | 'referral'
    | 'advertising'
    | 'social_media'
    | 'partner'
    | 'other';
  assignedSalesRep?: string;
  tags?: string[];
  leadScoreMin?: number;
  leadScoreMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  lastContactAfter?: Date;
  lastContactBefore?: Date;
  search?: string; // Search across name, email, phone, company
}
