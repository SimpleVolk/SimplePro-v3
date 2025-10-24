import { SetMetadata } from '@nestjs/common';
import { ResourceType, ActionType } from '../interfaces/user.interface';

export const PERMISSIONS_KEY = 'permissions';
export const ALL_PERMISSIONS_KEY = 'allPermissions';

// SECURITY FIX: Renamed to clarify OR logic (user needs ANY ONE of these permissions)
export const RequireAnyPermissions = (
  ...permissions: { resource: ResourceType; action: ActionType }[]
) => SetMetadata(PERMISSIONS_KEY, permissions);

// SECURITY FIX: New decorator for AND logic (user needs ALL of these permissions)
export const RequireAllPermissions = (
  ...permissions: { resource: ResourceType; action: ActionType }[]
) => SetMetadata(ALL_PERMISSIONS_KEY, permissions);

// Backward compatibility: Keep RequirePermissions as alias for RequireAnyPermissions
export const RequirePermissions = RequireAnyPermissions;
