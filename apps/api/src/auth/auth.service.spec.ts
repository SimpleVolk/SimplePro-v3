import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User as UserSchema } from './schemas/user.schema';
import { UserSession as UserSessionSchema } from './schemas/user-session.schema';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  JwtPayload,
  DEFAULT_ROLES
} from './interfaces/user.interface';

// Mock bcrypt
jest.mock('bcryptjs');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let sessionModel: any;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: {
      id: 'role_admin',
      name: 'admin',
      displayName: 'Administrator',
      description: 'Administrative access',
      isSystemRole: true,
      permissions: [
        { id: 'perm_users_read', resource: 'users', action: 'read' }
      ]
    },
    department: 'IT',
    isActive: true,
    mustChangePassword: false,
    permissions: [
      { id: 'perm_users_read', resource: 'users', action: 'read' }
    ],
    preferences: {
      theme: 'dark',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      notifications: { email: true, sms: false, push: true },
      dashboard: { layout: 'default', widgets: ['stats'] }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    lastModifiedBy: 'system',
    save: jest.fn(),
    toObject: jest.fn()
  };

  const mockSession = {
    _id: 'session123',
    userId: 'user123',
    token: 'accesstoken',
    refreshToken: 'refreshtoken',
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastAccessedAt: new Date(),
    tokenRefreshCount: 0,
    sessionFingerprint: 'fingerprint123',
    save: jest.fn()
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    constructor: jest.fn().mockImplementation(() => ({
      ...mockUser,
      save: jest.fn().mockResolvedValue(mockUser)
    }))
  };

  const mockSessionModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    find: jest.fn(),
    constructor: jest.fn().mockImplementation(() => ({
      ...mockSession,
      save: jest.fn().mockResolvedValue(mockSession)
    }))
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn()
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockBcrypt.hash.mockImplementation((password: string) => Promise.resolve(`hashed_${password}`));
    mockBcrypt.compare.mockImplementation((password: string, hash: string) =>
      Promise.resolve(hash === `hashed_${password}`)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(UserSchema.name),
          useValue: mockUserModel
        },
        {
          provide: getModelToken(UserSessionSchema.name),
          useValue: mockSessionModel
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(UserSchema.name));
    sessionModel = module.get(getModelToken(UserSessionSchema.name));
    jwtService = module.get(JwtService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize default roles', () => {
      expect(service).toBeDefined();
      // Default roles initialization is tested implicitly through role-based operations
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'testpassword'
    };

    beforeEach(() => {
      mockJwtService.sign.mockImplementation((payload, options?) => {
        if (options?.expiresIn === '1h') return 'access_token';
        if (options?.expiresIn === '7d') return 'refresh_token';
        return 'mock_token';
      });
    });

    it('should successfully login with valid credentials', async () => {
      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        lastLoginAt: undefined,
        save: jest.fn().mockResolvedValue(mockUser)
      });
      mockBcrypt.compare.mockResolvedValue(true);

      const mockNewSession = {
        ...mockSession,
        save: jest.fn().mockResolvedValue(mockSession)
      };
      mockSessionModel.constructor = jest.fn().mockReturnValue(mockNewSession);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        user: expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com'
        }),
        expiresIn: 3600
      });
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [
          { username: 'testuser' },
          { email: 'testuser' }
        ],
        isActive: true
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('testpassword', 'hashedpassword');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('testpassword', 'hashedpassword');
    });

    it('should throw UnauthorizedException if password change required', async () => {
      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        mustChangePassword: true
      });
      mockBcrypt.compare.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Password change required. Please change your password before continuing.')
      );
    });

    it('should login with email instead of username', async () => {
      const emailLoginDto = { username: 'test@example.com', password: 'testpassword' };
      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser)
      });
      mockBcrypt.compare.mockResolvedValue(true);

      const mockNewSession = {
        ...mockSession,
        save: jest.fn().mockResolvedValue(mockSession)
      };
      mockSessionModel.constructor = jest.fn().mockReturnValue(mockNewSession);

      const result = await service.login(emailLoginDto);

      expect(result.access_token).toBeDefined();
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [
          { username: 'test@example.com' },
          { email: 'test@example.com' }
        ],
        isActive: true
      });
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid_refresh_token';

    it('should successfully refresh token', async () => {
      const decoded = { sub: 'user123' };
      mockJwtService.verify.mockReturnValue(decoded);
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockSessionModel.findOneAndUpdate.mockResolvedValue({
        ...mockSession,
        _id: 'session123'
      });
      mockJwtService.sign.mockImplementation((payload, options?) => {
        if (options?.expiresIn === '1h') return 'new_access_token';
        if (options?.expiresIn === '7d') return 'new_refresh_token';
        return 'mock_token';
      });

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token'
      });
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(mockSessionModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const decoded = { sub: 'user123' };
      mockJwtService.verify.mockReturnValue(decoded);
      mockUserModel.findById.mockResolvedValue({
        ...mockUser,
        isActive: false
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle token reuse attack', async () => {
      const decoded = { sub: 'user123' };
      mockJwtService.verify.mockReturnValue(decoded);
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockSessionModel.findOneAndUpdate.mockResolvedValue(null); // Token already used

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockSessionModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user123', isActive: true },
        expect.objectContaining({
          $set: expect.objectContaining({
            isActive: false,
            revokedReason: 'Token reuse detected - security violation'
          })
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout specific session', async () => {
      await service.logout('user123', 'session123');

      expect(mockSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'session123',
        expect.objectContaining({
          $set: expect.objectContaining({
            isActive: false,
            revokedReason: 'User logout'
          })
        }),
        { runValidators: true }
      );
    });

    it('should logout all user sessions', async () => {
      await service.logout('user123');

      expect(mockSessionModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user123', isActive: true },
        expect.objectContaining({
          $set: expect.objectContaining({
            isActive: false,
            revokedReason: 'User logout all sessions'
          })
        })
      );
    });
  });

  describe('validateUser', () => {
    const payload: JwtPayload = {
      sub: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin',
      permissions: ['users:read']
    };

    it('should validate active user', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual(expect.objectContaining({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      }));
      expect(mockUserModel.findById).toHaveBeenCalledWith('user123');
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      mockUserModel.findById.mockResolvedValue({
        ...mockUser,
        isActive: false
      });

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      roleId: 'role_admin',
      department: 'IT'
    };

    it('should create user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(null); // No existing user
      const mockNewUser = {
        ...mockUser,
        username: 'newuser',
        email: 'newuser@example.com',
        save: jest.fn().mockResolvedValue(mockUser)
      };
      mockUserModel.constructor = jest.fn().mockReturnValue(mockNewUser);

      const result = await service.create(createUserDto, 'admin123');

      expect(result).toEqual(expect.objectContaining({
        username: 'newuser',
        email: 'newuser@example.com'
      }));
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [
          { username: 'newuser' },
          { email: 'newuser@example.com' }
        ]
      });
    });

    it('should throw ConflictException for duplicate username', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto, 'admin123')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid role', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const invalidRoleDto = { ...createUserDto, roleId: 'invalid_role' };

      await expect(service.create(invalidRoleDto, 'admin123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      department: 'Engineering'
    };

    it('should update user successfully', async () => {
      const mockUpdatableUser = {
        ...mockUser,
        save: jest.fn().mockResolvedValue({
          ...mockUser,
          firstName: 'Updated',
          lastName: 'Name'
        })
      };
      mockUserModel.findById.mockResolvedValue(mockUpdatableUser);

      const result = await service.update('user123', updateUserDto, 'admin123');

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(mockUpdatableUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateUserDto, 'admin123')).rejects.toThrow(NotFoundException);
    });

    it('should check for username conflicts', async () => {
      const conflictDto = { ...updateUserDto, username: 'existinguser' };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue({ _id: 'differentuser' });

      await expect(service.update('user123', conflictDto, 'admin123')).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
      confirmPassword: 'newpassword'
    };

    it('should change password successfully', async () => {
      const mockUpdatableUser = {
        ...mockUser,
        passwordHash: 'hashed_oldpassword',
        save: jest.fn().mockResolvedValue(mockUser)
      };
      mockUserModel.findById.mockResolvedValue(mockUpdatableUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('hashed_newpassword');

      await service.changePassword('user123', changePasswordDto);

      expect(mockBcrypt.compare).toHaveBeenCalledWith('oldpassword', 'hashed_oldpassword');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
      expect(mockUpdatableUser.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(service.changePassword('user123', changePasswordDto)).rejects.toThrow(
        new BadRequestException('Current password is incorrect')
      );
    });

    it('should throw BadRequestException for password mismatch', async () => {
      const mismatchDto = {
        ...changePasswordDto,
        confirmPassword: 'differentpassword'
      };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      await expect(service.changePassword('user123', mismatchDto)).rejects.toThrow(
        new BadRequestException('New password and confirmation do not match')
      );
    });
  });

  describe('permission checking', () => {
    const userWithPermissions: User = {
      ...mockUser,
      id: 'user123',
      permissions: [
        { id: 'perm1', resource: 'users', action: 'read' },
        { id: 'perm2', resource: 'jobs', action: 'create' }
      ]
    } as User;

    it('should check single permission correctly', () => {
      const hasPermission = service.hasPermission(userWithPermissions, 'users', 'read');
      expect(hasPermission).toBe(true);

      const noPermission = service.hasPermission(userWithPermissions, 'users', 'delete');
      expect(noPermission).toBe(false);
    });

    it('should check any permission correctly', () => {
      const permissions = [
        { resource: 'users', action: 'read' },
        { resource: 'customers', action: 'create' }
      ];

      const hasAny = service.hasAnyPermission(userWithPermissions, permissions);
      expect(hasAny).toBe(true);
    });

    it('should check all permissions correctly', () => {
      const allRequiredPermissions = [
        { resource: 'users', action: 'read' },
        { resource: 'jobs', action: 'create' }
      ];

      const hasAll = service.hasAllPermissions(userWithPermissions, allRequiredPermissions);
      expect(hasAll).toBe(true);

      const missingPermission = [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'delete' }
      ];

      const notHasAll = service.hasAllPermissions(userWithPermissions, missingPermission);
      expect(notHasAll).toBe(false);
    });
  });

  describe('role management', () => {
    it('should get all roles', async () => {
      const roles = await service.getAllRoles();

      expect(roles).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'role_super_admin',
          name: 'super_admin',
          displayName: 'Super Administrator'
        })
      ]));
    });

    it('should get specific role', async () => {
      const role = await service.getRole('role_admin');

      expect(role).toEqual(expect.objectContaining({
        id: 'role_admin',
        name: 'admin',
        displayName: 'Administrator'
      }));
    });

    it('should throw NotFoundException for invalid role', async () => {
      await expect(service.getRole('invalid_role')).rejects.toThrow(NotFoundException);
    });

    it('should have permissions for all ResourceType values in super_admin role', async () => {
      // This test prevents future permission omissions like the tariff_settings bug
      const superAdminRole = await service.getRole('role_super_admin');

      // All possible resource types from ResourceType enum
      const allResourceTypes: string[] = [
        'users',
        'customers',
        'estimates',
        'jobs',
        'crews',
        'inventory',
        'billing',
        'reports',
        'system_settings',
        'pricing_rules',
        'tariff_settings'
      ];

      // Check that super_admin has at least one permission for each resource type
      const missingPermissions: string[] = [];
      for (const resourceType of allResourceTypes) {
        const hasPermission = superAdminRole.permissions.some(
          (perm) => perm.resource === resourceType
        );
        if (!hasPermission) {
          missingPermissions.push(resourceType);
        }
      }

      // Assert no missing permissions
      expect(missingPermissions).toEqual([]);

      // Provide helpful error message if test fails
      if (missingPermissions.length > 0) {
        throw new Error(
          `super_admin role is missing permissions for: ${missingPermissions.join(', ')}. ` +
          `Please add these permissions in auth.service.ts DEFAULT_ROLES initialization.`
        );
      }
    });
  });

  describe('session management', () => {
    it('should get user sessions', async () => {
      mockSessionModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockSession])
      });

      const sessions = await service.getUserSessions('user123');

      expect(sessions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          userId: 'user123',
          isActive: true
        })
      ]));
      expect(mockSessionModel.find).toHaveBeenCalledWith({ userId: 'user123', isActive: true });
    });

    it('should revoke session', async () => {
      await service.revokeSession('session123');

      expect(mockSessionModel.findByIdAndUpdate).toHaveBeenCalledWith('session123', { isActive: false });
    });

    it('should revoke all user sessions', async () => {
      await service.revokeAllUserSessions('user123', 'Security breach');

      expect(mockSessionModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user123', isActive: true },
        expect.objectContaining({
          $set: expect.objectContaining({
            isActive: false,
            revokedReason: 'Security breach'
          })
        })
      );
    });
  });

  describe('user lookup methods', () => {
    it('should find user by username', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(expect.objectContaining({
        username: 'testuser'
      }));
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    });

    it('should find user by email', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(expect.objectContaining({
        email: 'test@example.com'
      }));
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('user removal', () => {
    it('should deactivate user instead of deleting', async () => {
      const mockUpdatableUser = {
        ...mockUser,
        username: 'regularuser',
        save: jest.fn().mockResolvedValue(mockUser)
      };
      mockUserModel.findById.mockResolvedValue(mockUpdatableUser);

      await service.remove('user123');

      expect(mockUpdatableUser.isActive).toBe(false);
      expect(mockUpdatableUser.save).toHaveBeenCalled();
    });

    it('should prevent deletion of admin user', async () => {
      const adminUser = {
        ...mockUser,
        username: 'admin'
      };
      mockUserModel.findById.mockResolvedValue(adminUser);

      await expect(service.remove('admin123')).rejects.toThrow(
        new BadRequestException('Cannot delete default admin user')
      );
    });
  });
});