import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY, ALL_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User, ResourceType, ActionType } from '../interfaces/user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // SECURITY FIX: Support both OR and AND permission checking
    const requiredAnyPermissions = this.reflector.getAllAndOverride<
      { resource: ResourceType; action: ActionType }[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    const requiredAllPermissions = this.reflector.getAllAndOverride<
      { resource: ResourceType; action: ActionType }[]
    >(ALL_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles && !requiredAnyPermissions && !requiredAllPermissions) {
      return true;
    }

    const { user }: { user: User } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check role-based access
    if (requiredRoles) {
      const hasRole = requiredRoles.some((role) => user.role.name === role);
      if (!hasRole) {
        throw new ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check permission-based access (OR logic - needs ANY ONE permission)
    if (requiredAnyPermissions) {
      const hasPermission = requiredAnyPermissions.some((permission) =>
        user.permissions.some(
          (userPerm) =>
            userPerm.resource === permission.resource &&
            userPerm.action === permission.action,
        ),
      );
      if (!hasPermission) {
        const permissionStrings = requiredAnyPermissions.map(
          (p) => `${p.resource}:${p.action}`,
        );
        throw new ForbiddenException(
          `Access denied. Required permissions (any): ${permissionStrings.join(', ')}`,
        );
      }
    }

    // SECURITY FIX: Check permission-based access (AND logic - needs ALL permissions)
    if (requiredAllPermissions) {
      const hasAllPermissions = requiredAllPermissions.every((permission) =>
        user.permissions.some(
          (userPerm) =>
            userPerm.resource === permission.resource &&
            userPerm.action === permission.action,
        ),
      );
      if (!hasAllPermissions) {
        const permissionStrings = requiredAllPermissions.map(
          (p) => `${p.resource}:${p.action}`,
        );
        throw new ForbiddenException(
          `Access denied. Required permissions (all): ${permissionStrings.join(', ')}`,
        );
      }
    }

    return true;
  }
}
