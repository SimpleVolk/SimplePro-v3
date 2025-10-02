export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  crewId?: string;
  fcmTokens: string[]; // Firebase Cloud Messaging tokens for push notifications
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  permissions: Permission[];

  // Profile information
  profilePicture?: string;
  timezone?: string;
  preferences?: UserPreferences;

  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
}

export interface UserRole {
  id: string;
  name: 'super_admin' | 'admin' | 'manager' | 'dispatcher' | 'sales' | 'crew_lead' | 'crew_member' | 'customer_service';
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
}

export interface Permission {
  id: string;
  resource: ResourceType;
  action: ActionType;
  conditions?: PermissionCondition[];
}

export type ResourceType =
  | 'users'
  | 'customers'
  | 'estimates'
  | 'jobs'
  | 'crews'
  | 'inventory'
  | 'billing'
  | 'reports'
  | 'system_settings'
  | 'pricing_rules'
  | 'tariff_settings';

export type ActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'assign'
  | 'approve'
  | 'export'
  | 'import'
  | 'activate';

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'owns' | 'department_only';
  value: any;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
}

// DTOs for API operations
export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  department?: string;
  phoneNumber?: string;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  department?: string;
  phoneNumber?: string;
  isActive?: boolean;
  preferences?: Partial<UserPreferences>;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Omit<User, 'passwordHash'>;
  expiresIn: number;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface JwtPayload {
  sub: string; // user id
  username: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
  jti?: string; // JWT token ID for tracking
  sessionId?: string; // Link token to specific session for enhanced security
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;

  // SECURITY ENHANCEMENT: Additional fields for race condition detection
  lastTokenRefreshAt?: Date;
  tokenRefreshCount: number;
  revokedAt?: Date;
  revokedReason?: string;
  sessionFingerprint?: string;
}

// Default role definitions
export const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'role_super_admin',
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    isSystemRole: true,
    permissions: [] // Will be populated with all permissions
  },
  {
    id: 'role_admin',
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access to manage users and system settings',
    isSystemRole: true,
    permissions: [
      { id: 'perm_users_all', resource: 'users', action: 'create' },
      { id: 'perm_users_read', resource: 'users', action: 'read' },
      { id: 'perm_users_update', resource: 'users', action: 'update' },
      { id: 'perm_users_delete', resource: 'users', action: 'delete' },
      { id: 'perm_system_read', resource: 'system_settings', action: 'read' },
      { id: 'perm_system_update', resource: 'system_settings', action: 'update' },
      { id: 'perm_reports_all', resource: 'reports', action: 'read' },
    ]
  },
  {
    id: 'role_manager',
    name: 'manager',
    displayName: 'Manager',
    description: 'Management access to oversee operations and approve jobs',
    isSystemRole: true,
    permissions: [
      { id: 'perm_customers_all', resource: 'customers', action: 'create' },
      { id: 'perm_customers_read', resource: 'customers', action: 'read' },
      { id: 'perm_customers_update', resource: 'customers', action: 'update' },
      { id: 'perm_estimates_all', resource: 'estimates', action: 'create' },
      { id: 'perm_estimates_read', resource: 'estimates', action: 'read' },
      { id: 'perm_estimates_update', resource: 'estimates', action: 'update' },
      { id: 'perm_estimates_approve', resource: 'estimates', action: 'approve' },
      { id: 'perm_jobs_all', resource: 'jobs', action: 'create' },
      { id: 'perm_jobs_read', resource: 'jobs', action: 'read' },
      { id: 'perm_jobs_update', resource: 'jobs', action: 'update' },
      { id: 'perm_jobs_assign', resource: 'jobs', action: 'assign' },
      { id: 'perm_crews_read', resource: 'crews', action: 'read' },
      { id: 'perm_crews_assign', resource: 'crews', action: 'assign' },
      { id: 'perm_reports_read', resource: 'reports', action: 'read' },
    ]
  },
  {
    id: 'role_dispatcher',
    name: 'dispatcher',
    displayName: 'Dispatcher',
    description: 'Job scheduling and crew assignment',
    isSystemRole: true,
    permissions: [
      { id: 'perm_jobs_read', resource: 'jobs', action: 'read' },
      { id: 'perm_jobs_update', resource: 'jobs', action: 'update' },
      { id: 'perm_jobs_assign', resource: 'jobs', action: 'assign' },
      { id: 'perm_crews_read', resource: 'crews', action: 'read' },
      { id: 'perm_crews_assign', resource: 'crews', action: 'assign' },
      { id: 'perm_customers_read', resource: 'customers', action: 'read' },
    ]
  },
  {
    id: 'role_sales',
    name: 'sales',
    displayName: 'Sales Representative',
    description: 'Customer management and estimate creation',
    isSystemRole: true,
    permissions: [
      { id: 'perm_customers_create', resource: 'customers', action: 'create' },
      { id: 'perm_customers_read', resource: 'customers', action: 'read' },
      { id: 'perm_customers_update', resource: 'customers', action: 'update' },
      { id: 'perm_estimates_create', resource: 'estimates', action: 'create' },
      { id: 'perm_estimates_read', resource: 'estimates', action: 'read' },
      { id: 'perm_estimates_update', resource: 'estimates', action: 'update' },
      { id: 'perm_jobs_read', resource: 'jobs', action: 'read', conditions: [
        { field: 'createdBy', operator: 'owns', value: true }
      ]},
    ]
  },
  {
    id: 'role_crew_lead',
    name: 'crew_lead',
    displayName: 'Crew Lead',
    description: 'Lead crew operations and job completion',
    isSystemRole: true,
    permissions: [
      { id: 'perm_jobs_read', resource: 'jobs', action: 'read', conditions: [
        { field: 'assignedCrew', operator: 'in', value: 'current_user' }
      ]},
      { id: 'perm_jobs_update', resource: 'jobs', action: 'update', conditions: [
        { field: 'assignedCrew', operator: 'in', value: 'current_user' }
      ]},
      { id: 'perm_inventory_read', resource: 'inventory', action: 'read' },
      { id: 'perm_inventory_update', resource: 'inventory', action: 'update' },
    ]
  },
  {
    id: 'role_crew_member',
    name: 'crew_member',
    displayName: 'Crew Member',
    description: 'Basic crew operations and job updates',
    isSystemRole: true,
    permissions: [
      { id: 'perm_jobs_read_assigned', resource: 'jobs', action: 'read', conditions: [
        { field: 'assignedCrew', operator: 'in', value: 'current_user' }
      ]},
      { id: 'perm_inventory_read', resource: 'inventory', action: 'read' },
    ]
  },
  {
    id: 'role_customer_service',
    name: 'customer_service',
    displayName: 'Customer Service',
    description: 'Customer support and basic job information',
    isSystemRole: true,
    permissions: [
      { id: 'perm_customers_read', resource: 'customers', action: 'read' },
      { id: 'perm_customers_update', resource: 'customers', action: 'update' },
      { id: 'perm_jobs_read', resource: 'jobs', action: 'read' },
      { id: 'perm_estimates_read', resource: 'estimates', action: 'read' },
    ]
  }
];