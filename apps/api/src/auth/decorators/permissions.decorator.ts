import { SetMetadata } from '@nestjs/common';
import { ResourceType, ActionType } from '../interfaces/user.interface';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (
  ...permissions: { resource: ResourceType; action: ActionType }[]
) => SetMetadata(PERMISSIONS_KEY, permissions);
