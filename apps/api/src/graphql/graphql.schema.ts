
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum JobType {
    local = "local",
    long_distance = "long_distance",
    storage = "storage",
    packing_only = "packing_only"
}

export enum JobStatus {
    scheduled = "scheduled",
    in_progress = "in_progress",
    completed = "completed",
    cancelled = "cancelled",
    on_hold = "on_hold"
}

export enum JobPriority {
    low = "low",
    normal = "normal",
    high = "high",
    urgent = "urgent"
}

export enum CustomerStatus {
    lead = "lead",
    prospect = "prospect",
    active = "active",
    inactive = "inactive"
}

export enum CustomerType {
    residential = "residential",
    commercial = "commercial"
}

export enum OpportunityStatus {
    open = "open",
    contacted = "contacted",
    quoted = "quoted",
    negotiating = "negotiating",
    won = "won",
    lost = "lost",
    cancelled = "cancelled"
}

export enum OpportunityPriority {
    low = "low",
    medium = "medium",
    high = "high",
    urgent = "urgent"
}

export enum ServiceType {
    local = "local",
    long_distance = "long_distance",
    storage = "storage",
    packing_only = "packing_only"
}

export enum MoveSize {
    studio = "studio",
    br_1 = "br_1",
    br_2 = "br_2",
    br_3 = "br_3",
    br_4 = "br_4",
    br_5 = "br_5",
    custom = "custom"
}

export enum Flexibility {
    exact = "exact",
    week = "week",
    month = "month"
}

export enum BuildingType {
    house = "house",
    apartment = "apartment",
    condo = "condo",
    townhouse = "townhouse",
    storage = "storage",
    office = "office",
    warehouse = "warehouse",
    other = "other"
}

export enum AccessDifficulty {
    easy = "easy",
    moderate = "moderate",
    difficult = "difficult",
    very_difficult = "very_difficult"
}

export enum PackingLevel {
    none = "none",
    partial = "partial",
    full = "full",
    fragile_only = "fragile_only"
}

export enum LeadSource {
    website = "website",
    phone = "phone",
    referral = "referral",
    partner = "partner",
    walkin = "walkin",
    other = "other"
}

export enum SeasonalPeriod {
    peak = "peak",
    standard = "standard",
    off_peak = "off_peak"
}

export enum CrewMemberStatus {
    assigned = "assigned",
    checked_in = "checked_in",
    checked_out = "checked_out",
    unavailable = "unavailable"
}

export enum SortOrder {
    asc = "asc",
    desc = "desc"
}

export class UpdateDocumentInput {
    name?: Nullable<string>;
    tags?: Nullable<string[]>;
    documentType?: Nullable<string>;
    metadata?: Nullable<JSON>;
}

export class CreateDocumentShareLinkInput {
    expiresInHours?: Nullable<number>;
    allowDownload?: Nullable<boolean>;
}

export class AddressInput {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: Nullable<string>;
    accessNotes?: Nullable<string>;
    contactPerson?: Nullable<string>;
    contactPhone?: Nullable<string>;
}

export class CrewAssignmentInput {
    crewMemberId: string;
    role: string;
}

export class InventoryItemInput {
    name: string;
    description?: Nullable<string>;
    quantity: number;
    weight?: Nullable<number>;
    volume?: Nullable<number>;
    condition?: Nullable<string>;
    location?: Nullable<string>;
}

export class JobServiceInput {
    name: string;
    description?: Nullable<string>;
    cost?: Nullable<number>;
}

export class CreateJobInput {
    title: string;
    description?: Nullable<string>;
    type: JobType;
    priority?: Nullable<JobPriority>;
    customerId: string;
    estimateId?: Nullable<string>;
    scheduledDate: DateTime;
    scheduledStartTime: string;
    scheduledEndTime: string;
    estimatedDuration: number;
    pickupAddress: AddressInput;
    deliveryAddress: AddressInput;
    assignedCrew?: Nullable<CrewAssignmentInput[]>;
    inventory?: Nullable<InventoryItemInput[]>;
    services?: Nullable<JobServiceInput[]>;
    specialInstructions?: Nullable<string>;
    estimatedCost: number;
}

export class UpdateJobInput {
    title?: Nullable<string>;
    description?: Nullable<string>;
    type?: Nullable<JobType>;
    status?: Nullable<JobStatus>;
    priority?: Nullable<JobPriority>;
    scheduledDate?: Nullable<DateTime>;
    scheduledStartTime?: Nullable<string>;
    scheduledEndTime?: Nullable<string>;
    estimatedDuration?: Nullable<number>;
    pickupAddress?: Nullable<AddressInput>;
    deliveryAddress?: Nullable<AddressInput>;
    specialInstructions?: Nullable<string>;
    estimatedCost?: Nullable<number>;
    actualCost?: Nullable<number>;
}

export class JobFilters {
    status?: Nullable<JobStatus>;
    type?: Nullable<JobType>;
    priority?: Nullable<JobPriority>;
    customerId?: Nullable<string>;
    assignedCrew?: Nullable<string>;
    scheduledAfter?: Nullable<DateTime>;
    scheduledBefore?: Nullable<DateTime>;
    createdAfter?: Nullable<DateTime>;
    createdBefore?: Nullable<DateTime>;
    search?: Nullable<string>;
}

export class CustomerFilters {
    status?: Nullable<CustomerStatus>;
    type?: Nullable<CustomerType>;
    source?: Nullable<string>;
    assignedSalesRep?: Nullable<string>;
    tags?: Nullable<string[]>;
    leadScoreMin?: Nullable<number>;
    leadScoreMax?: Nullable<number>;
    createdAfter?: Nullable<DateTime>;
    createdBefore?: Nullable<DateTime>;
    lastContactAfter?: Nullable<DateTime>;
    lastContactBefore?: Nullable<DateTime>;
    search?: Nullable<string>;
}

export class CreateCustomerInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    alternatePhone?: Nullable<string>;
    type: CustomerType;
    status?: Nullable<CustomerStatus>;
    source: string;
    companyName?: Nullable<string>;
    preferredContactMethod?: Nullable<string>;
    address: AddressInput;
    assignedSalesRep?: Nullable<string>;
    tags?: Nullable<string[]>;
    notes?: Nullable<string>;
}

export class UpdateCustomerInput {
    firstName?: Nullable<string>;
    lastName?: Nullable<string>;
    email?: Nullable<string>;
    phone?: Nullable<string>;
    alternatePhone?: Nullable<string>;
    type?: Nullable<CustomerType>;
    status?: Nullable<CustomerStatus>;
    source?: Nullable<string>;
    companyName?: Nullable<string>;
    preferredContactMethod?: Nullable<string>;
    address?: Nullable<AddressInput>;
    assignedSalesRep?: Nullable<string>;
    tags?: Nullable<string[]>;
    notes?: Nullable<string>;
    lastContactDate?: Nullable<DateTime>;
}

export class SortBy {
    field: string;
    order: SortOrder;
}

export class NewCustomerInfoInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: AddressInput;
    type: string;
    companyName?: Nullable<string>;
}

export class LocationDetailsInput {
    address: string;
    buildingType: string;
    floorLevel: number;
    elevatorAccess: boolean;
    stairsCount: number;
    longCarry: boolean;
    parkingDistance: number;
    accessDifficulty: string;
    narrowHallways: boolean;
    specialNotes?: Nullable<string>;
}

export class RoomDetailsInput {
    id?: Nullable<string>;
    type: string;
    description?: Nullable<string>;
    items?: Nullable<JSON[]>;
    packingRequired: boolean;
    totalWeight: number;
    totalVolume: number;
}

export class SpecialItemsInput {
    piano?: Nullable<boolean>;
    poolTable?: Nullable<boolean>;
    safe?: Nullable<boolean>;
    antiques?: Nullable<boolean>;
    artwork?: Nullable<boolean>;
    fragileItems?: Nullable<number>;
    valuableItems?: Nullable<number>;
}

export class AdditionalServicesInput {
    packing: string;
    unpacking?: Nullable<boolean>;
    assembly?: Nullable<boolean>;
    storage?: Nullable<boolean>;
    storageDuration?: Nullable<number>;
    cleaning?: Nullable<boolean>;
}

export class CreateOpportunityInput {
    customerId: string;
    customerType?: Nullable<string>;
    newCustomer?: Nullable<NewCustomerInfoInput>;
    service: ServiceType;
    moveDate: DateTime;
    moveSize: string;
    flexibility?: Nullable<Flexibility>;
    pickup: LocationDetailsInput;
    delivery: LocationDetailsInput;
    rooms?: Nullable<RoomDetailsInput[]>;
    totalWeight: number;
    totalVolume: number;
    specialItems?: Nullable<SpecialItemsInput>;
    additionalServices?: Nullable<AdditionalServicesInput>;
    leadSource?: Nullable<LeadSource>;
    referralId?: Nullable<string>;
    partnerId?: Nullable<string>;
    assignedSalesRep?: Nullable<string>;
    priority?: Nullable<OpportunityPriority>;
    internalNotes?: Nullable<string>;
    followUpDate?: Nullable<DateTime>;
    distance: number;
    estimatedDuration: number;
    crewSize: number;
    isWeekend?: Nullable<boolean>;
    isHoliday?: Nullable<boolean>;
    seasonalPeriod?: Nullable<SeasonalPeriod>;
    estimateId?: Nullable<string>;
    estimatedPrice?: Nullable<number>;
}

export class UpdateOpportunityInput {
    customerId?: Nullable<string>;
    customerType?: Nullable<string>;
    newCustomer?: Nullable<NewCustomerInfoInput>;
    service?: Nullable<ServiceType>;
    moveDate?: Nullable<DateTime>;
    moveSize?: Nullable<string>;
    flexibility?: Nullable<Flexibility>;
    pickup?: Nullable<LocationDetailsInput>;
    delivery?: Nullable<LocationDetailsInput>;
    rooms?: Nullable<RoomDetailsInput[]>;
    totalWeight?: Nullable<number>;
    totalVolume?: Nullable<number>;
    specialItems?: Nullable<SpecialItemsInput>;
    additionalServices?: Nullable<AdditionalServicesInput>;
    leadSource?: Nullable<LeadSource>;
    referralId?: Nullable<string>;
    partnerId?: Nullable<string>;
    assignedSalesRep?: Nullable<string>;
    priority?: Nullable<OpportunityPriority>;
    internalNotes?: Nullable<string>;
    followUpDate?: Nullable<DateTime>;
    distance?: Nullable<number>;
    estimatedDuration?: Nullable<number>;
    crewSize?: Nullable<number>;
    isWeekend?: Nullable<boolean>;
    isHoliday?: Nullable<boolean>;
    seasonalPeriod?: Nullable<SeasonalPeriod>;
    estimateId?: Nullable<string>;
    estimatedPrice?: Nullable<number>;
    status?: Nullable<OpportunityStatus>;
}

export class OpportunityFilters {
    status?: Nullable<OpportunityStatus>;
    service?: Nullable<ServiceType>;
    priority?: Nullable<OpportunityPriority>;
    leadSource?: Nullable<LeadSource>;
    customerId?: Nullable<string>;
    assignedSalesRep?: Nullable<string>;
    partnerId?: Nullable<string>;
    referralId?: Nullable<string>;
    moveDateAfter?: Nullable<DateTime>;
    moveDateBefore?: Nullable<DateTime>;
    createdAfter?: Nullable<DateTime>;
    createdBefore?: Nullable<DateTime>;
    followUpBefore?: Nullable<DateTime>;
    minEstimatedPrice?: Nullable<number>;
    maxEstimatedPrice?: Nullable<number>;
    search?: Nullable<string>;
}

export class Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: Nullable<string>;
    accessNotes?: Nullable<string>;
    contactPerson?: Nullable<string>;
    contactPhone?: Nullable<string>;
}

export class CrewAssignment {
    crewMemberId: string;
    crewMemberName?: Nullable<string>;
    role: string;
    status: CrewMemberStatus;
    assignedAt: DateTime;
    checkInTime?: Nullable<DateTime>;
    checkOutTime?: Nullable<DateTime>;
    hoursWorked?: Nullable<number>;
}

export class InventoryItem {
    id: string;
    name: string;
    description?: Nullable<string>;
    quantity: number;
    weight?: Nullable<number>;
    volume?: Nullable<number>;
    condition?: Nullable<string>;
    location?: Nullable<string>;
}

export class JobService {
    name: string;
    description?: Nullable<string>;
    status: string;
    cost?: Nullable<number>;
}

export class JobMilestone {
    id: string;
    name: string;
    description?: Nullable<string>;
    status: string;
    completedAt?: Nullable<DateTime>;
    completedBy?: Nullable<string>;
}

export class JobPhoto {
    id: string;
    url: string;
    caption?: Nullable<string>;
    uploadedBy: string;
    uploadedAt: DateTime;
}

export class InternalNote {
    id: string;
    content: string;
    createdBy: string;
    createdAt: DateTime;
    isPinned?: Nullable<boolean>;
}

export class NewCustomerInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: Address;
    type: string;
    companyName?: Nullable<string>;
}

export class LocationDetails {
    address: string;
    buildingType: string;
    floorLevel: number;
    elevatorAccess: boolean;
    stairsCount: number;
    longCarry: boolean;
    parkingDistance: number;
    accessDifficulty: string;
    narrowHallways: boolean;
    specialNotes?: Nullable<string>;
}

export class RoomDetails {
    id: string;
    type: string;
    description?: Nullable<string>;
    items?: Nullable<JSON[]>;
    packingRequired: boolean;
    totalWeight: number;
    totalVolume: number;
}

export class SpecialItems {
    piano: boolean;
    poolTable: boolean;
    safe: boolean;
    antiques: boolean;
    artwork: boolean;
    fragileItems: number;
    valuableItems: number;
}

export class AdditionalServices {
    packing: string;
    unpacking: boolean;
    assembly: boolean;
    storage: boolean;
    storageDuration?: Nullable<number>;
    cleaning: boolean;
}

export class OpportunityStatistics {
    totalOpportunities: number;
    byStatus: JSON;
    byLeadSource: JSON;
    conversionRate: number;
    averageValue: number;
    totalValue: number;
    wonCount: number;
    lostCount: number;
    openCount: number;
}

export class Opportunity {
    id: string;
    customerId: string;
    customer?: Nullable<Customer>;
    customerType: string;
    newCustomer?: Nullable<NewCustomerInfo>;
    service: ServiceType;
    moveDate: DateTime;
    moveSize: string;
    flexibility: Flexibility;
    pickup: LocationDetails;
    delivery: LocationDetails;
    rooms: RoomDetails[];
    totalWeight: number;
    totalVolume: number;
    specialItems?: Nullable<SpecialItems>;
    additionalServices?: Nullable<AdditionalServices>;
    leadSource: LeadSource;
    referralId?: Nullable<string>;
    partnerId?: Nullable<string>;
    assignedSalesRep?: Nullable<string>;
    assignedSalesRepDetails?: Nullable<JSON>;
    priority: OpportunityPriority;
    internalNotes?: Nullable<string>;
    followUpDate?: Nullable<DateTime>;
    distance: number;
    estimatedDuration: number;
    crewSize: number;
    isWeekend: boolean;
    isHoliday: boolean;
    seasonalPeriod: SeasonalPeriod;
    estimateId?: Nullable<string>;
    estimatedPrice?: Nullable<number>;
    status: OpportunityStatus;
    createdBy: string;
    updatedBy?: Nullable<string>;
    createdAt: DateTime;
    updatedAt: DateTime;
}

export class Customer {
    id: string;
    firstName: string;
    lastName: string;
    fullName?: Nullable<string>;
    email: string;
    phone: string;
    alternatePhone?: Nullable<string>;
    type: CustomerType;
    status: CustomerStatus;
    source: string;
    companyName?: Nullable<string>;
    preferredContactMethod: string;
    address: Address;
    assignedSalesRep?: Nullable<string>;
    leadScore?: Nullable<number>;
    tags?: Nullable<string[]>;
    notes?: Nullable<string>;
    estimates?: Nullable<string[]>;
    jobs?: Nullable<Job[]>;
    lastContactDate?: Nullable<DateTime>;
    createdAt: DateTime;
    updatedAt: DateTime;
    createdBy: string;
}

export class Estimate {
    id: string;
    estimateId: string;
    customerId?: Nullable<string>;
    customer?: Nullable<Customer>;
    finalPrice: number;
    breakdown?: Nullable<JSON>;
    appliedRules?: Nullable<JSON[]>;
    metadata?: Nullable<JSON>;
    createdAt: DateTime;
}

export class Job {
    id: string;
    jobNumber: string;
    title: string;
    description?: Nullable<string>;
    type: JobType;
    status: JobStatus;
    priority: JobPriority;
    customerId: string;
    customer?: Nullable<Customer>;
    estimateId?: Nullable<string>;
    estimate?: Nullable<Estimate>;
    invoiceId?: Nullable<string>;
    scheduledDate: DateTime;
    scheduledStartTime: string;
    scheduledEndTime: string;
    estimatedDuration: number;
    actualStartTime?: Nullable<DateTime>;
    actualEndTime?: Nullable<DateTime>;
    pickupAddress: Address;
    deliveryAddress: Address;
    assignedCrew?: Nullable<CrewAssignment[]>;
    leadCrew?: Nullable<string>;
    crewNotes?: Nullable<string>;
    inventory?: Nullable<InventoryItem[]>;
    services?: Nullable<JobService[]>;
    specialInstructions?: Nullable<string>;
    estimatedCost: number;
    actualCost?: Nullable<number>;
    laborCost?: Nullable<number>;
    materialsCost?: Nullable<number>;
    transportationCost?: Nullable<number>;
    milestones?: Nullable<JobMilestone[]>;
    photos?: Nullable<JobPhoto[]>;
    internalNotes?: Nullable<InternalNote[]>;
    createdAt: DateTime;
    updatedAt: DateTime;
    createdBy: string;
    lastModifiedBy: string;
}

export class JobWithDetails {
    id: string;
    jobNumber: string;
    title: string;
    description?: Nullable<string>;
    type: JobType;
    status: JobStatus;
    priority: JobPriority;
    customer: Customer;
    estimate?: Nullable<Estimate>;
    scheduledDate: DateTime;
    scheduledStartTime: string;
    scheduledEndTime: string;
    estimatedDuration: number;
    actualStartTime?: Nullable<DateTime>;
    actualEndTime?: Nullable<DateTime>;
    pickupAddress: Address;
    deliveryAddress: Address;
    assignedCrew?: Nullable<CrewMember[]>;
    leadCrew?: Nullable<CrewMember>;
    inventory?: Nullable<InventoryItem[]>;
    services?: Nullable<JobService[]>;
    estimatedCost: number;
    actualCost?: Nullable<number>;
    milestones?: Nullable<JobMilestone[]>;
    photos?: Nullable<JobPhoto[]>;
    internalNotes?: Nullable<InternalNote[]>;
    createdAt: DateTime;
    updatedAt: DateTime;
}

export class CrewMember {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    fullName?: Nullable<string>;
    email: string;
    phone?: Nullable<string>;
    role: string;
    status: string;
    skills?: Nullable<string[]>;
    certifications?: Nullable<string[]>;
    availability?: Nullable<JSON>;
}

export class JobStats {
    total: number;
    byStatus: JSON;
    byType: JSON;
    byPriority: JSON;
    scheduledToday: number;
    scheduledThisWeek: number;
    inProgress: number;
    overdue: number;
    averageDuration: number;
    totalRevenue: number;
}

export class RevenueMetrics {
    totalRevenue: number;
    averageJobValue: number;
    revenueByType: JSON;
    revenueByMonth: JSON;
    projectedRevenue: number;
}

export class PerformanceMetrics {
    completionRate: number;
    onTimeRate: number;
    customerSatisfaction: number;
    crewEfficiency: number;
    averageJobDuration: number;
}

export class Analytics {
    jobStats: JobStats;
    revenueMetrics: RevenueMetrics;
    performanceMetrics: PerformanceMetrics;
    generatedAt: DateTime;
}

export class Document {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    documentType: string;
    entityType: string;
    entityId: string;
    url: string;
    s3Key: string;
    uploadedBy: string;
    uploadedAt: DateTime;
    tags?: Nullable<string[]>;
    metadata?: Nullable<JSON>;
}

export class DocumentStorageStatistics {
    totalDocuments: number;
    totalSize: number;
    byType: JSON;
    byEntityType: JSON;
    averageSize: number;
}

export class PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: Nullable<string>;
    endCursor?: Nullable<string>;
}

export class JobEdge {
    node: Job;
    cursor: string;
}

export class JobConnection {
    edges: JobEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export class CustomerEdge {
    node: Customer;
    cursor: string;
}

export class CustomerConnection {
    edges: CustomerEdge[];
    pageInfo: PageInfo;
    totalCount: number;
}

export abstract class IQuery {
    abstract job(id: string): Nullable<Job> | Promise<Nullable<Job>>;

    abstract jobByNumber(jobNumber: string): Nullable<Job> | Promise<Nullable<Job>>;

    abstract jobs(filters?: Nullable<JobFilters>, sortBy?: Nullable<SortBy>, first?: Nullable<number>, after?: Nullable<string>): JobConnection | Promise<JobConnection>;

    abstract jobsWithDetails(filters?: Nullable<JobFilters>, sortBy?: Nullable<SortBy>, first?: Nullable<number>, after?: Nullable<string>): JobWithDetails[] | Promise<JobWithDetails[]>;

    abstract jobsByDate(date: DateTime): Job[] | Promise<Job[]>;

    abstract customer(id: string): Nullable<Customer> | Promise<Nullable<Customer>>;

    abstract customerByEmail(email: string): Nullable<Customer> | Promise<Nullable<Customer>>;

    abstract customers(filters?: Nullable<CustomerFilters>, sortBy?: Nullable<SortBy>, first?: Nullable<number>, after?: Nullable<string>): CustomerConnection | Promise<CustomerConnection>;

    abstract crewMember(id: string): Nullable<CrewMember> | Promise<Nullable<CrewMember>>;

    abstract crewMembers(filters?: Nullable<JSON>): CrewMember[] | Promise<CrewMember[]>;

    abstract availableCrew(date: DateTime): CrewMember[] | Promise<CrewMember[]>;

    abstract analytics(startDate?: Nullable<DateTime>, endDate?: Nullable<DateTime>): Analytics | Promise<Analytics>;

    abstract jobStats(): JobStats | Promise<JobStats>;

    abstract revenueMetrics(startDate?: Nullable<DateTime>, endDate?: Nullable<DateTime>): RevenueMetrics | Promise<RevenueMetrics>;

    abstract opportunity(id: string): Nullable<Opportunity> | Promise<Nullable<Opportunity>>;

    abstract opportunities(filters?: Nullable<OpportunityFilters>): Opportunity[] | Promise<Opportunity[]>;

    abstract opportunityStatistics(userId?: Nullable<string>): OpportunityStatistics | Promise<OpportunityStatistics>;

    abstract document(id: string): Nullable<Document> | Promise<Nullable<Document>>;

    abstract documents(filters?: Nullable<JSON>): Document[] | Promise<Document[]>;

    abstract documentsByEntity(entityType: string, entityId: string): Document[] | Promise<Document[]>;

    abstract documentStorageStatistics(userId?: Nullable<string>): DocumentStorageStatistics | Promise<DocumentStorageStatistics>;

    abstract notification(id: string): Nullable<JSON> | Promise<Nullable<JSON>>;

    abstract notifications(filters?: Nullable<JSON>): JSON[] | Promise<JSON[]>;

    abstract unreadNotificationsCount(): number | Promise<number>;

    abstract notificationPreferences(): Nullable<JSON> | Promise<Nullable<JSON>>;

    abstract notificationTemplate(type: string): Nullable<JSON> | Promise<Nullable<JSON>>;
}

export abstract class IMutation {
    abstract createJob(input: CreateJobInput): Job | Promise<Job>;

    abstract updateJob(id: string, input: UpdateJobInput): Job | Promise<Job>;

    abstract updateJobStatus(id: string, status: JobStatus): Job | Promise<Job>;

    abstract deleteJob(id: string): boolean | Promise<boolean>;

    abstract assignCrew(jobId: string, crew: CrewAssignmentInput[]): Job | Promise<Job>;

    abstract updateCrewStatus(jobId: string, crewMemberId: string, status: CrewMemberStatus): Job | Promise<Job>;

    abstract addJobNote(jobId: string, content: string, isPinned?: Nullable<boolean>): Job | Promise<Job>;

    abstract updateMilestone(jobId: string, milestoneId: string, status: string): Job | Promise<Job>;

    abstract createOpportunity(input: CreateOpportunityInput): Opportunity | Promise<Opportunity>;

    abstract updateOpportunity(id: string, input: UpdateOpportunityInput): Opportunity | Promise<Opportunity>;

    abstract updateOpportunityStatus(id: string, status: string): Opportunity | Promise<Opportunity>;

    abstract deleteOpportunity(id: string): boolean | Promise<boolean>;

    abstract updateDocument(id: string, input: UpdateDocumentInput): Document | Promise<Document>;

    abstract deleteDocument(id: string): boolean | Promise<boolean>;

    abstract createDocumentShareLink(documentId: string, input?: Nullable<CreateDocumentShareLinkInput>): JSON | Promise<JSON>;

    abstract createCustomer(input: CreateCustomerInput): Customer | Promise<Customer>;

    abstract updateCustomer(id: string, input: UpdateCustomerInput): Customer | Promise<Customer>;

    abstract deleteCustomer(id: string): boolean | Promise<boolean>;

    abstract updateCustomerStatus(id: string, status: CustomerStatus): Customer | Promise<Customer>;

    abstract calculateEstimate(input: JSON): Estimate | Promise<Estimate>;

    abstract createNotification(input: JSON): JSON | Promise<JSON>;

    abstract markNotificationAsRead(id: string): JSON | Promise<JSON>;

    abstract markAllNotificationsAsRead(): boolean | Promise<boolean>;

    abstract deleteNotification(id: string): boolean | Promise<boolean>;

    abstract archiveNotification(id: string): boolean | Promise<boolean>;

    abstract updateNotificationPreferences(input: JSON): JSON | Promise<JSON>;

    abstract createNotificationTemplate(input: JSON): JSON | Promise<JSON>;

    abstract updateNotificationTemplate(type: string, input: JSON): JSON | Promise<JSON>;
}

export abstract class ISubscription {
    abstract jobUpdated(jobId: string): Job | Promise<Job>;

    abstract jobStatusChanged(jobId: string): Job | Promise<Job>;

    abstract crewAssigned(crewMemberId: string): Job | Promise<Job>;
}

export type DateTime = any;
export type JSON = any;
type Nullable<T> = T | null;
