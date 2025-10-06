/**
 * TypeScript interfaces for Partner/Referral Source Management
 */

export type PartnerType =
  | 'real_estate'
  | 'relocation'
  | 'corporate'
  | 'individual';
export type PartnerStatus = 'active' | 'inactive';
export type CommissionStructureType = 'percentage' | 'flat_rate' | 'tiered';
export type ReferralStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'lost';
export type CommissionStatus = 'pending' | 'calculated' | 'paid';

export interface CommissionStructure {
  type: CommissionStructureType;
  value?: number; // For percentage or flat_rate
  tiers?: Array<{
    minValue: number;
    maxValue?: number;
    rate: number;
  }>;
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  type: PartnerType;
  status: PartnerStatus;
  commissionStructure: CommissionStructure;
  portalAccess: boolean;
  portalUsername?: string;
  agreementUrl?: string;
  serviceAreas?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Statistics
  totalReferrals?: number;
  convertedReferrals?: number;
  conversionRate?: number;
  totalCommission?: number;
  pendingCommission?: number;
}

export interface Referral {
  id: string;
  partnerId: string;
  partnerName?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  estimatedValue?: number;
  status: ReferralStatus;
  assignedSalesRep?: string;
  dateReferred: string;
  dateContacted?: string;
  dateQualified?: string;
  dateConverted?: string;
  convertedJobId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Commission {
  id: string;
  partnerId: string;
  partnerName?: string;
  referralId: string;
  jobId?: string;
  jobValue: number;
  commissionAmount: number;
  commissionRate?: number;
  status: CommissionStatus;
  calculatedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerDto {
  name: string;
  email: string;
  phone: string;
  company?: string;
  type: PartnerType;
  commissionStructure: CommissionStructure;
  portalAccess: boolean;
  portalPassword?: string;
  agreementUrl?: string;
  serviceAreas?: string[];
  notes?: string;
}

export interface UpdatePartnerDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: PartnerType;
  commissionStructure?: CommissionStructure;
  portalAccess?: boolean;
  agreementUrl?: string;
  serviceAreas?: string[];
  notes?: string;
}

export interface CreateReferralDto {
  partnerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  estimatedValue?: number;
  assignedSalesRep?: string;
  notes?: string;
}

export interface UpdateReferralStatusDto {
  status: ReferralStatus;
  notes?: string;
}

export interface ConvertReferralDto {
  jobId: string;
  finalValue: number;
}

export interface PartnerStatistics {
  partnerId: string;
  totalReferrals: number;
  referralsByStatus: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    lost: number;
  };
  conversionRate: number;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  averageJobValue: number;
  monthlyTrends: Array<{
    month: string;
    referrals: number;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
}

export interface PartnerDashboardStats {
  totalPartners: number;
  activePartners: number;
  totalReferrals: number;
  activeReferrals: number;
  conversionRate: number;
  pendingCommissions: number;
  totalRevenue: number;
  monthOverMonthGrowth: number;
}
