import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User, ResourceType, ActionType } from '../interfaces/user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<
      { resource: ResourceType; action: ActionType }[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles && !requiredPermissions) {
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

    // Check permission-based access
    if (requiredPermissions) {
      const hasPermission = requiredPermissions.some((permission) =>
        user.permissions.some(
          (userPerm) =>
            userPerm.resource === permission.resource &&
            userPerm.action === permission.action,
        ),
      );
      if (!hasPermission) {
        const permissionStrings = requiredPermissions.map(
          (p) => `${p.resource}:${p.action}`,
        );
        throw new ForbiddenException(
          `Access denied. Required permissions: ${permissionStrings.join(', ')}`,
        );
      }
    }

    return true;
  }
}
