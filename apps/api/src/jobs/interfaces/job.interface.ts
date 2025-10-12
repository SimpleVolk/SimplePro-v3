export interface Job {
  id: string;

  // Job Information
  jobNumber: string; // Unique identifier like "JOB-2025-001"
  title: string; // Brief description of the job
  description?: string;
  type: 'local' | 'long_distance' | 'storage' | 'packing_only';
  status: 'draft' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Related Records
  customerId: string;
  estimateId?: string; // Link to the original estimate
  invoiceId?: string; // Link to final invoice

  // Scheduling Information
  scheduledDate: Date;
  scheduledStartTime: string; // "08:00"
  scheduledEndTime: string; // "17:00"
  estimatedDuration: number; // hours
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Location Information
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  // Crew Assignment
  assignedCrew: CrewAssignment[];
  leadCrew?: string; // ID of crew member who is team lead
  crewNotes?: string;

  // Job Details
  inventory: InventoryItem[];
  services: JobService[];
  specialInstructions?: string;
  equipment: EquipmentRequirement[];

  // Pricing
  estimatedCost: number;
  actualCost?: number;
  laborCost?: number;
  materialsCost?: number;
  transportationCost?: number;
  additionalCharges?: AdditionalCharge[];

  // Progress Tracking
  milestones: JobMilestone[];
  photos: JobPhoto[];
  documents: JobDocument[];

  // Communication
  customerNotifications: CustomerNotification[];
  internalNotes: InternalNote[];

  // Audit Fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
}

export interface CrewAssignment {
  crewMemberId: string;
  role: 'lead' | 'mover' | 'driver' | 'specialist';
  hourlyRate?: number;
  assignedAt: Date;
  status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out' | 'absent';
  checkInTime?: Date;
  checkOutTime?: Date;
  hoursWorked?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category:
    | 'furniture'
    | 'appliances'
    | 'boxes'
    | 'fragile'
    | 'electronics'
    | 'other';
  quantity: number;
  weight?: number;
  volume?: number;
  condition: 'good' | 'fair' | 'damaged' | 'needs_protection';
  location: 'pickup' | 'delivery' | 'storage';
  notes?: string;
  photos?: string[];
}

export interface JobService {
  type:
    | 'loading'
    | 'unloading'
    | 'packing'
    | 'unpacking'
    | 'assembly'
    | 'disassembly'
    | 'storage'
    | 'cleaning';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedCrew?: string[];
  estimatedTime?: number;
  actualTime?: number;
  notes?: string;
}

export interface EquipmentRequirement {
  type:
    | 'truck'
    | 'dolly'
    | 'straps'
    | 'blankets'
    | 'boxes'
    | 'bubble_wrap'
    | 'tape'
    | 'tools';
  description: string;
  quantity: number;
  status: 'required' | 'assigned' | 'checked_out' | 'returned';
  assignedTo?: string;
}

export interface AdditionalCharge {
  type:
    | 'overtime'
    | 'materials'
    | 'travel'
    | 'storage'
    | 'fuel'
    | 'tolls'
    | 'other';
  description: string;
  amount: number;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface JobMilestone {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  scheduledTime?: Date;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export interface JobPhoto {
  id: string;
  url: string;
  caption?: string;
  category: 'before' | 'during' | 'after' | 'damage' | 'inventory' | 'other';
  takenAt: Date;
  takenBy: string;
  location?: 'pickup' | 'delivery' | 'in_transit';
}

export interface JobDocument {
  id: string;
  name: string;
  type: 'contract' | 'inventory' | 'receipt' | 'insurance' | 'permit' | 'other';
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface CustomerNotification {
  id: string;
  type:
    | 'scheduled'
    | 'crew_dispatched'
    | 'arrival_eta'
    | 'started'
    | 'completed'
    | 'delay'
    | 'issue';
  message: string;
  sentAt: Date;
  method: 'email' | 'sms' | 'phone' | 'app';
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface InternalNote {
  id: string;
  content: string;
  category: 'general' | 'crew' | 'customer' | 'equipment' | 'billing' | 'issue';
  createdAt: Date;
  createdBy: string;
  isImportant?: boolean;
}

// DTOs for API operations
export interface CreateJobDto {
  title: string;
  description?: string;
  type: 'local' | 'long_distance' | 'storage' | 'packing_only';
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  customerId: string;
  estimateId?: string;

  scheduledDate: Date;
  scheduledStartTime: string;
  scheduledEndTime: string;
  estimatedDuration: number;

  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  assignedCrew?: {
    crewMemberId: string;
    role: 'lead' | 'mover' | 'driver' | 'specialist';
    hourlyRate?: number;
  }[];

  inventory?: Omit<InventoryItem, 'id'>[];
  services?: Omit<JobService, 'status' | 'actualTime'>[];
  equipment?: Omit<EquipmentRequirement, 'status' | 'assignedTo'>[];

  estimatedCost: number;
  specialInstructions?: string;
}

export interface UpdateJobDto {
  title?: string;
  description?: string;
  status?: 'draft' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  scheduledDate?: Date;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  estimatedDuration?: number;

  pickupAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };

  estimatedCost?: number;
  actualCost?: number;
  specialInstructions?: string;
  crewNotes?: string;
}

export interface JobFilters {
  status?: 'draft' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  type?: 'local' | 'long_distance' | 'storage' | 'packing_only';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  customerId?: string;
  assignedCrew?: string;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string; // Search in title, description, job number
}

export interface JobStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  scheduledToday: number;
  scheduledThisWeek: number;
  inProgress: number;
  overdue: number;
  averageDuration: number;
  totalRevenue: number;
}
