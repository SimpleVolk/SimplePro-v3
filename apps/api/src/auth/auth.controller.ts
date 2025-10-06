import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  RefreshTokenDto,
  User,
} from './interfaces/user.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { RequirePermissions } from './decorators/permissions.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    try {
      const result = await this.authService.login(loginDto);

      // Log successful login
      await this.auditLogsService.log(
        {
          userId: result.user.id,
          userName: `${result.user.firstName} ${result.user.lastName}`,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'],
        },
        'LOGIN',
        'Authentication',
        {
          severity: 'info',
          outcome: 'success',
          metadata: {
            username: loginDto.username,
          },
        }
      );

      return {
        success: true,
        data: result,
        message: 'Login successful',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Log failed login attempt
      await this.auditLogsService.createLog({
        timestamp: new Date(),
        userId: 'unknown',
        userName: loginDto.username,
        action: 'LOGIN_FAILED',
        resource: 'Authentication',
        severity: 'warning',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        outcome: 'failure',
        errorMessage,
      });

      throw error;
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto.refresh_token);
    return {
      success: true,
      data: result,
      message: result.refresh_token
        ? 'Token refreshed successfully with rotation'
        : 'Token refreshed successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User, @Req() req: any) {
    await this.authService.logout(user.id);

    // Log logout
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'LOGOUT',
      'Authentication',
      {
        severity: 'info',
        outcome: 'success',
      }
    );

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    const { passwordHash: _, ...userProfile } = user;
    return {
      success: true,
      data: userProfile,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: Omit<UpdateUserDto, 'roleId' | 'isActive'>,
  ) {
    const updatedUser = await this.authService.update(user.id, updateUserDto, user.id);
    const { passwordHash: _, ...userProfile } = updatedUser;

    return {
      success: true,
      data: userProfile,
      message: 'Profile updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    await this.authService.changePassword(user.id, changePasswordDto);

    // Log password change
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'PASSWORD_CHANGE',
      'Authentication',
      {
        severity: 'warning',
        outcome: 'success',
      }
    );

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@CurrentUser() user: User) {
    const sessions = await this.authService.getUserSessions(user.id);
    return {
      success: true,
      data: sessions,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Param('sessionId') sessionId: string,
  ) {
    await this.authService.revokeSession(sessionId);
    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  // User management endpoints (admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions({ resource: 'users', action: 'create' })
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto, @CurrentUser() user: User, @Req() req: any) {
    const newUser = await this.authService.create(createUserDto, user.id);
    const { passwordHash: _, ...userProfile } = newUser;

    // Log user creation
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'CREATE_USER',
      'User',
      {
        resourceId: newUser.id,
        severity: 'info',
        outcome: 'success',
        changes: {
          after: { username: newUser.username, email: newUser.email, role: newUser.role.name },
        },
      }
    );

    return {
      success: true,
      data: userProfile,
      message: 'User created successfully',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions({ resource: 'users', action: 'read' })
  @Get('users')
  async findAllUsers() {
    const users = await this.authService.findAll();
    const sanitizedUsers = users.map(({ passwordHash: _, ...user }) => user);

    return {
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions({ resource: 'users', action: 'read' })
  @Get('users/:id')
  async findOneUser(@Param('id') id: string) {
    const user = await this.authService.findOne(id);
    const { passwordHash: _, ...userProfile } = user;

    return {
      success: true,
      data: userProfile,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions({ resource: 'users', action: 'update' })
  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
    @Req() req: any,
  ) {
    const updatedUser = await this.authService.update(id, updateUserDto, user.id);
    const { passwordHash: _, ...userProfile } = updatedUser;

    // Log user update
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'UPDATE_USER',
      'User',
      {
        resourceId: id,
        severity: 'info',
        outcome: 'success',
        changes: {
          after: updateUserDto,
        },
      }
    );

    return {
      success: true,
      data: userProfile,
      message: 'User updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions({ resource: 'users', action: 'delete' })
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async removeUser(@Param('id') id: string, @CurrentUser() user: User, @Req() req: any) {
    await this.authService.remove(id);

    // Log user deletion
    await this.auditLogsService.log(
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
      },
      'DELETE_USER',
      'User',
      {
        resourceId: id,
        severity: 'warning',
        outcome: 'success',
      }
    );

    return {
      success: true,
      message: 'User deactivated successfully',
    };
  }

  // Role management endpoints
  @UseGuards(JwtAuthGuard)
  @Get('roles')
  async getAllRoles() {
    const roles = await this.authService.getAllRoles();

    return {
      success: true,
      data: roles,
      count: roles.length,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('roles/:id')
  async getRole(@Param('id') id: string) {
    const role = await this.authService.getRole(id);

    return {
      success: true,
      data: role,
    };
  }

  // Session management (admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('users/:userId/sessions')
  async getUserSessions(@Param('userId') userId: string) {
    const sessions = await this.authService.getUserSessions(userId);

    return {
      success: true,
      data: sessions,
      count: sessions.length,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('users/:userId/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeUserSession(
    @Param('sessionId') sessionId: string,
  ) {
    await this.authService.revokeSession(sessionId);
    return {
      success: true,
      message: 'User session revoked successfully',
    };
  }
}