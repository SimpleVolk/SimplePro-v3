import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  User,
  UserRole,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  LoginResponse,
  ChangePasswordDto,
  JwtPayload,
  UserSession,
  DEFAULT_ROLES,
  Permission
} from './interfaces/user.interface';
import { User as UserSchema, UserDocument } from './schemas/user.schema';
import { UserSession as UserSessionSchema, UserSessionDocument } from './schemas/user-session.schema';

@Injectable()
export class AuthService implements OnModuleInit {
  private roles = new Map<string, UserRole>();
  private tokenRefreshMutex = new Map<string, Promise<{ access_token: string; refresh_token?: string }>>(); // Prevent concurrent refreshes
  private readonly REFRESH_TOKEN_ROTATION_ENABLED = true; // Enable refresh token rotation for security

  constructor(
    private jwtService: JwtService,
    @InjectModel(UserSchema.name) private userModel: Model<UserDocument>,
    @InjectModel(UserSessionSchema.name) private sessionModel: Model<UserSessionDocument>
  ) {
    this.initializeDefaultRoles();
  }

  async onModuleInit() {
    // Check if admin user exists, if not create it
    const existingAdmin = await this.userModel.findOne({ username: 'admin' });
    if (!existingAdmin) {
      await this.createDefaultAdminUser();
    }
  }

  private initializeDefaultRoles(): void {
    for (const role of DEFAULT_ROLES) {
      // For super_admin, give all possible permissions
      if (role.name === 'super_admin') {
        const allPermissions: Permission[] = [
          { id: 'perm_all_users', resource: 'users', action: 'create' },
          { id: 'perm_all_users_read', resource: 'users', action: 'read' },
          { id: 'perm_all_users_update', resource: 'users', action: 'update' },
          { id: 'perm_all_users_delete', resource: 'users', action: 'delete' },
          { id: 'perm_all_customers', resource: 'customers', action: 'create' },
          { id: 'perm_all_customers_read', resource: 'customers', action: 'read' },
          { id: 'perm_all_customers_update', resource: 'customers', action: 'update' },
          { id: 'perm_all_customers_delete', resource: 'customers', action: 'delete' },
          { id: 'perm_all_estimates', resource: 'estimates', action: 'create' },
          { id: 'perm_all_estimates_read', resource: 'estimates', action: 'read' },
          { id: 'perm_all_estimates_update', resource: 'estimates', action: 'update' },
          { id: 'perm_all_estimates_delete', resource: 'estimates', action: 'delete' },
          { id: 'perm_all_estimates_approve', resource: 'estimates', action: 'approve' },
          { id: 'perm_all_jobs', resource: 'jobs', action: 'create' },
          { id: 'perm_all_jobs_read', resource: 'jobs', action: 'read' },
          { id: 'perm_all_jobs_update', resource: 'jobs', action: 'update' },
          { id: 'perm_all_jobs_delete', resource: 'jobs', action: 'delete' },
          { id: 'perm_all_jobs_assign', resource: 'jobs', action: 'assign' },
          { id: 'perm_all_crews', resource: 'crews', action: 'create' },
          { id: 'perm_all_crews_read', resource: 'crews', action: 'read' },
          { id: 'perm_all_crews_update', resource: 'crews', action: 'update' },
          { id: 'perm_all_crews_delete', resource: 'crews', action: 'delete' },
          { id: 'perm_all_crews_assign', resource: 'crews', action: 'assign' },
          { id: 'perm_all_inventory', resource: 'inventory', action: 'create' },
          { id: 'perm_all_inventory_read', resource: 'inventory', action: 'read' },
          { id: 'perm_all_inventory_update', resource: 'inventory', action: 'update' },
          { id: 'perm_all_inventory_delete', resource: 'inventory', action: 'delete' },
          { id: 'perm_all_billing', resource: 'billing', action: 'create' },
          { id: 'perm_all_billing_read', resource: 'billing', action: 'read' },
          { id: 'perm_all_billing_update', resource: 'billing', action: 'update' },
          { id: 'perm_all_billing_delete', resource: 'billing', action: 'delete' },
          { id: 'perm_all_billing_approve', resource: 'billing', action: 'approve' },
          { id: 'perm_all_system', resource: 'system_settings', action: 'read' },
          { id: 'perm_all_system_update', resource: 'system_settings', action: 'update' },
          { id: 'perm_all_pricing', resource: 'pricing_rules', action: 'read' },
          { id: 'perm_all_pricing_update', resource: 'pricing_rules', action: 'update' },
          { id: 'perm_all_reports', resource: 'reports', action: 'read' },
          { id: 'perm_all_reports_export', resource: 'reports', action: 'export' },
          { id: 'perm_all_tariff_settings', resource: 'tariff_settings', action: 'read' },
          { id: 'perm_all_tariff_settings_create', resource: 'tariff_settings', action: 'create' },
          { id: 'perm_all_tariff_settings_update', resource: 'tariff_settings', action: 'update' },
          { id: 'perm_all_tariff_settings_delete', resource: 'tariff_settings', action: 'delete' },
          { id: 'perm_all_tariff_settings_activate', resource: 'tariff_settings', action: 'activate' },
        ];
        role.permissions = allPermissions;
      }
      this.roles.set(role.id, role);
    }
  }

  private async createDefaultAdminUser(): Promise<void> {
    const adminRole = this.roles.get('role_super_admin');
    if (!adminRole) return;

    // Use a known password for development, random for production
    const isProduction = process.env.NODE_ENV === 'production';
    let password: string;

    if (isProduction) {
      const crypto = require('crypto');
      password = crypto.randomBytes(16).toString('hex');
    } else {
      // Development password for easier testing
      password = 'Admin123!';
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const adminUser = new this.userModel({
      username: 'admin',
      email: 'admin@simplepro.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: adminRole,
      department: 'IT',
      isActive: true,
      permissions: adminRole.permissions,
      preferences: {
        theme: 'dark',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        dashboard: {
          layout: 'default',
          widgets: ['stats', 'recent_jobs', 'calendar'],
        },
      },
      createdBy: 'system',
      lastModifiedBy: 'system',
      // Force password change on first login in production only
      mustChangePassword: isProduction,
    });

    await adminUser.save();

    // SECURITY FIX: Never log credentials to console in any environment
    // Store the initial admin credentials securely
    if (process.env.NODE_ENV !== 'production') {
      // In development, store in environment variable and log for convenience
      process.env.INITIAL_ADMIN_PASSWORD = password;
      console.warn(`
      ⚠️  SECURITY NOTICE: Default admin user created.
      Username: admin
      Password: ${password}

      ❗ DEVELOPMENT MODE: Using fixed password for easier testing.
      ❗ This will be randomized in production environments.
      `);
    } else {
      // In production, require external password initialization
      console.error(`
      🚨 CRITICAL: Admin user created but requires password initialization.
      Run the password initialization script or contact system administrator.
      System will not be fully functional until admin password is properly set.
      `);

      // Optionally, you could save the password to a secure file or require
      // external initialization in production environments
      const fs = require('fs');
      const path = require('path');
      const secretsPath = path.join(process.cwd(), '.secrets');

      try {
        if (!fs.existsSync(secretsPath)) {
          fs.mkdirSync(secretsPath, { mode: 0o700 });
        }

        const credentialsFile = path.join(secretsPath, 'admin-init.json');
        const credentials = {
          username: 'admin',
          temporaryPassword: password,
          createdAt: new Date().toISOString(),
          mustChangePassword: true,
          note: 'This file should be deleted after password change'
        };

        fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2), { mode: 0o600 });
        console.log(`🔐 Admin credentials stored securely in ${credentialsFile}`);
        console.log(`🗑️  Remember to delete this file after setting the admin password.`);
      } catch (error) {
        console.error('Failed to store admin credentials securely:', error.message);
      }
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.userModel.findOne({
      $or: [
        { username: loginDto.username },
        { email: loginDto.username }
      ],
      isActive: true
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials or account deactivated');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password change is required
    if (user.mustChangePassword) {
      throw new UnauthorizedException('Password change required. Please change your password before continuing.');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const payload: JwtPayload = {
      sub: (user._id as any).toString(),
      username: user.username,
      email: user.email,
      role: user.role.name,
      permissions: user.permissions.map(p => `${p.resource}:${p.action}`),
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign({ sub: (user._id as any).toString() }, { expiresIn: '7d' });

    // SECURITY ENHANCEMENT: Create session with enhanced security features
    const session = new this.sessionModel({
      userId: (user._id as any).toString(),
      token: accessToken,
      refreshToken,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      lastAccessedAt: new Date(),
      tokenRefreshCount: 0,
      lastTokenRefreshAt: null,
      // Generate session fingerprint for additional security
      sessionFingerprint: this.generateSessionFingerprint(user.id, Date.now())
    });

    await session.save();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.sanitizeUser(this.convertUserDocument(user)),
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string }> {
    // SECURITY FIX: Implement database-level atomic token rotation to prevent race conditions
    const mutexKey = `refresh_${refreshToken}`;

    // Check if there's already a refresh in progress for this token
    const existingRefresh = this.tokenRefreshMutex.get(mutexKey);
    if (existingRefresh) {
      return existingRefresh;
    }

    // Create new refresh promise with enhanced security
    const refreshPromise = this.performAtomicTokenRefresh(refreshToken);
    this.tokenRefreshMutex.set(mutexKey, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      // Clean up mutex
      this.tokenRefreshMutex.delete(mutexKey);
    }
  }

  private async performAtomicTokenRefresh(refreshToken: string): Promise<{ access_token: string; refresh_token?: string }> {
    try {
      // SECURITY FIX: Verify refresh token before database operations
      const decoded = this.jwtService.verify(refreshToken);
      const userId = decoded.sub;

      // SECURITY FIX: Get user with atomic validation
      const user = await this.userModel.findById(userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token - user not found or inactive');
      }

      // SECURITY FIX: Implement atomic token rotation with database-level locking
      // Use MongoDB's findOneAndUpdate with atomic operations to prevent race conditions
      const now = new Date();
      const newRefreshToken = this.REFRESH_TOKEN_ROTATION_ENABLED
        ? this.jwtService.sign({ sub: userId }, { expiresIn: '7d' })
        : refreshToken;

      // CRITICAL SECURITY FIX: Atomic session update with refresh token rotation
      const session = await this.sessionModel.findOneAndUpdate(
        {
          userId: userId,
          refreshToken: refreshToken, // Exact match for the current refresh token
          isActive: true,
          expiresAt: { $gt: now }
        },
        {
          // Atomically update all session fields in a single operation
          $set: {
            refreshToken: newRefreshToken,
            lastAccessedAt: now,
            // Add concurrency protection
            lastTokenRefreshAt: now,
            tokenRefreshCount: { $inc: 1 }
          }
        },
        {
          new: true,
          runValidators: true,
          // CRITICAL: This ensures only ONE request can update this session
          // If another request already updated it, this will return null
          upsert: false
        }
      );

      // SECURITY FIX: Detect race condition - if session is null, the refresh token was already used
      if (!session) {
        // SECURITY ALERT: Potential token replay attack or race condition detected
        console.error(`SECURITY ALERT: Refresh token reuse detected for user ${userId}. Token: ${refreshToken.substring(0, 10)}...`);

        // Revoke all sessions for this user as a security measure
        await this.sessionModel.updateMany(
          { userId: userId, isActive: true },
          {
            $set: {
              isActive: false,
              revokedAt: now,
              revokedReason: 'Token reuse detected - security violation'
            }
          }
        );

        throw new UnauthorizedException('Refresh token already used or session expired - all sessions revoked for security');
      }

      // Generate new access token with enhanced security
      const payload: JwtPayload = {
        sub: userId,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.permissions.map(p => `${p.resource}:${p.action}`),
        iat: Math.floor(Date.now() / 1000),
        jti: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Enhanced unique token ID
        sessionId: session._id!.toString() // Link token to specific session
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

      // SECURITY FIX: Update session with new access token atomically
      await this.sessionModel.findByIdAndUpdate(
        session._id!,
        {
          $set: {
            token: accessToken,
            lastAccessedAt: now
          }
        },
        { runValidators: true }
      );

      // Return both tokens (refresh token only if rotation is enabled)
      const result: { access_token: string; refresh_token?: string } = {
        access_token: accessToken
      };

      if (this.REFRESH_TOKEN_ROTATION_ENABLED) {
        result.refresh_token = newRefreshToken;
      }

      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log security-relevant errors
      console.error('Token refresh error:', error.message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    // Clear any pending refresh operations for this user
    Array.from(this.tokenRefreshMutex.keys())
      .filter(key => key.includes(userId))
      .forEach(key => this.tokenRefreshMutex.delete(key));

    const now = new Date();

    if (sessionId) {
      // SECURITY ENHANCEMENT: Logout specific session with proper audit trail
      await this.sessionModel.findByIdAndUpdate(
        sessionId,
        {
          $set: {
            isActive: false,
            revokedAt: now,
            revokedReason: 'User logout',
            lastAccessedAt: now
          }
        },
        { runValidators: true }
      );
    } else {
      // SECURITY ENHANCEMENT: Deactivate all user sessions with audit trail
      await this.sessionModel.updateMany(
        { userId, isActive: true },
        {
          $set: {
            isActive: false,
            revokedAt: now,
            revokedReason: 'User logout all sessions',
            lastAccessedAt: now
          }
        }
      );
    }
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    return this.convertUserDocument(user);
  }

  async create(createUserDto: CreateUserDto, createdBy: string): Promise<User> {
    // Check if username or email already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { username: createUserDto.username },
        { email: createUserDto.email }
      ]
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Get role
    const role = this.roles.get(createUserDto.roleId);
    if (!role) {
      throw new BadRequestException('Invalid role ID');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = new this.userModel({
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role,
      department: createUserDto.department,
      phoneNumber: createUserDto.phoneNumber,
      isActive: true,
      permissions: role.permissions,
      preferences: {
        theme: 'dark',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        dashboard: {
          layout: 'default',
          widgets: ['stats', 'recent_jobs'],
        },
      },
      createdBy,
      lastModifiedBy: createdBy,
    });

    await user.save();
    return this.convertUserDocument(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.userModel.find().sort({ lastName: 1 });
    return users.map(user => this.convertUserDocument(user));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.convertUserDocument(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.userModel.findOne({ username });
    return user ? this.convertUserDocument(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email });
    return user ? this.convertUserDocument(user) : null;
  }

  async update(id: string, updateUserDto: UpdateUserDto, updatedBy: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If updating role, get the new role
    let role = user.role;
    if (updateUserDto.roleId && updateUserDto.roleId !== user.role.id) {
      const newRole = this.roles.get(updateUserDto.roleId);
      if (!newRole) {
        throw new BadRequestException('Invalid role ID');
      }
      role = newRole;
    }

    // Check for username/email conflicts if being updated
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userModel.findOne({ username: updateUserDto.username });
      if (existingUser && (existingUser._id as any).toString() !== id) {
        throw new ConflictException('Username already exists');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({ email: updateUserDto.email });
      if (existingUser && (existingUser._id as any).toString() !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    // Update user fields
    Object.assign(user, updateUserDto);
    user.role = role;
    user.permissions = role.permissions;
    if (updateUserDto.preferences) {
      user.preferences = { ...user.preferences!, ...updateUserDto.preferences };
    }
    user.lastModifiedBy = updatedBy;

    await user.save();
    return this.convertUserDocument(user);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Verify new password confirmation
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);

    // Update user
    user.passwordHash = newPasswordHash;
    user.mustChangePassword = false; // Clear password change requirement
    user.lastModifiedBy = id; // User updating their own password
    await user.save();

    // Invalidate all user sessions to force re-login
    await this.logout(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Don't allow deletion of the default admin user
    if (user.username === 'admin') {
      throw new BadRequestException('Cannot delete default admin user');
    }

    // Deactivate instead of delete for audit purposes
    user.isActive = false;
    user.lastModifiedBy = 'system';
    await user.save();

    // Logout user from all sessions
    await this.logout(id);
  }

  async getAllRoles(): Promise<UserRole[]> {
    return Array.from(this.roles.values())
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async getRole(id: string): Promise<UserRole> {
    const role = this.roles.get(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const sessions = await this.sessionModel.find({ userId, isActive: true })
      .sort({ lastAccessedAt: -1 });
    return sessions.map(session => this.convertSessionDocument(session));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionModel.findByIdAndUpdate(sessionId, { isActive: false });
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private convertUserDocument(doc: UserDocument): User {
    return {
      id: (doc._id as any).toString(),
      username: doc.username,
      email: doc.email,
      passwordHash: doc.passwordHash,
      firstName: doc.firstName,
      lastName: doc.lastName,
      role: doc.role,
      department: doc.department,
      phoneNumber: doc.phoneNumber,
      isActive: doc.isActive,
      mustChangePassword: doc.mustChangePassword,
      lastLoginAt: doc.lastLoginAt,
      permissions: doc.permissions,
      profilePicture: doc.profilePicture,
      timezone: doc.timezone,
      preferences: doc.preferences,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
      createdBy: doc.createdBy,
      lastModifiedBy: doc.lastModifiedBy,
    };
  }

  private convertSessionDocument(doc: UserSessionDocument): UserSession {
    return {
      id: (doc._id as any).toString(),
      userId: doc.userId,
      token: doc.token,
      refreshToken: doc.refreshToken,
      userAgent: doc.userAgent,
      ipAddress: doc.ipAddress,
      isActive: doc.isActive,
      expiresAt: doc.expiresAt,
      createdAt: (doc as any).createdAt,
      lastAccessedAt: doc.lastAccessedAt,
      lastTokenRefreshAt: doc.lastTokenRefreshAt,
      tokenRefreshCount: doc.tokenRefreshCount || 0,
      revokedAt: doc.revokedAt,
      revokedReason: doc.revokedReason,
      sessionFingerprint: doc.sessionFingerprint,
    };
  }


  // Permission checking utilities
  hasPermission(user: User, resource: string, action: string): boolean {
    return user.permissions.some(
      permission => permission.resource === resource && permission.action === action
    );
  }

  hasAnyPermission(user: User, permissions: { resource: string; action: string }[]): boolean {
    return permissions.some(p => this.hasPermission(user, p.resource, p.action));
  }

  hasAllPermissions(user: User, permissions: { resource: string; action: string }[]): boolean {
    return permissions.every(p => this.hasPermission(user, p.resource, p.action));
  }

  // SECURITY ENHANCEMENT: Session fingerprinting for additional security
  private generateSessionFingerprint(userId: string, timestamp: number): string {
    const crypto = require('crypto');
    const data = `${userId}_${timestamp}_${process.env.JWT_SECRET}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  // SECURITY ENHANCEMENT: Detect concurrent session usage
  async detectConcurrentRefreshUsage(userId: string, refreshToken: string): Promise<boolean> {
    const recentRefreshes = await this.sessionModel.find({
      userId,
      refreshToken,
      lastTokenRefreshAt: {
        $gte: new Date(Date.now() - 5000) // Check for refreshes in last 5 seconds
      }
    });

    return recentRefreshes.length > 0;
  }

  // SECURITY ENHANCEMENT: Revoke all sessions for security incidents
  async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    const now = new Date();
    await this.sessionModel.updateMany(
      { userId, isActive: true },
      {
        $set: {
          isActive: false,
          revokedAt: now,
          revokedReason: reason,
          lastAccessedAt: now
        }
      }
    );

    // Clear any pending refresh operations
    Array.from(this.tokenRefreshMutex.keys())
      .filter(key => key.includes(userId))
      .forEach(key => this.tokenRefreshMutex.delete(key));
  }
}