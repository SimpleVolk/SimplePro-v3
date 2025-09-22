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
          { id: 'perm_all_system', resource: 'system_settings', action: 'read' },
          { id: 'perm_all_system_update', resource: 'system_settings', action: 'update' },
          { id: 'perm_all_pricing', resource: 'pricing_rules', action: 'read' },
          { id: 'perm_all_pricing_update', resource: 'pricing_rules', action: 'update' },
          { id: 'perm_all_reports', resource: 'reports', action: 'read' },
          { id: 'perm_all_reports_export', resource: 'reports', action: 'export' },
        ];
        role.permissions = allPermissions;
      }
      this.roles.set(role.id, role);
    }
  }

  private async createDefaultAdminUser(): Promise<void> {
    const adminRole = this.roles.get('role_super_admin');
    if (!adminRole) return;

    // Generate a secure random password
    const crypto = require('crypto');
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

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
      // Force password change on first login
      mustChangePassword: true,
    });

    await adminUser.save();

    // Log the temporary password for initial setup (this should be handled via secure channel in production)
    console.warn(`
    ⚠️  SECURITY NOTICE: Default admin user created with temporary password.
    Username: admin
    Temporary Password: ${randomPassword}

    ❗ IMPORTANT: This password must be changed on first login.
    ❗ Store this password securely and change it immediately after first login.
    ❗ This message will only be shown once.
    `);
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

    // Create session
    const session = new this.sessionModel({
      userId: (user._id as any).toString(),
      token: accessToken,
      refreshToken,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      lastAccessedAt: new Date(),
    });

    await session.save();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.sanitizeUser(this.convertUserDocument(user)),
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.userModel.findById(decoded.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if session exists and is active
      const session = await this.sessionModel.findOne({
        userId: (user._id as any).toString(),
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        throw new UnauthorizedException('Session expired');
      }

      // Generate new access token
      const payload: JwtPayload = {
        sub: (user._id as any).toString(),
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.permissions.map(p => `${p.resource}:${p.action}`),
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

      // Update session
      session.token = accessToken;
      session.lastAccessedAt = new Date();
      await session.save();

      return { access_token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // Deactivate all user sessions
    await this.sessionModel.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
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
}