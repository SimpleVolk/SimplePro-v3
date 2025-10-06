'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './RolesPermissions.module.css';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

export default function RolesPermissions() {
  const { user } = useAuth();

  const availablePermissions: Permission[] = [
    // User Management
    {
      id: 'users.read',
      name: 'View Users',
      description: 'View user list and details',
      category: 'User Management',
    },
    {
      id: 'users.write',
      name: 'Manage Users',
      description: 'Create, edit, and manage users',
      category: 'User Management',
    },
    {
      id: 'users.delete',
      name: 'Delete Users',
      description: 'Delete user accounts',
      category: 'User Management',
    },

    // Customer Management
    {
      id: 'customers.read',
      name: 'View Customers',
      description: 'View customer list and details',
      category: 'Customer Management',
    },
    {
      id: 'customers.write',
      name: 'Manage Customers',
      description: 'Create and edit customers',
      category: 'Customer Management',
    },
    {
      id: 'customers.delete',
      name: 'Delete Customers',
      description: 'Delete customer records',
      category: 'Customer Management',
    },

    // Job Management
    {
      id: 'jobs.read',
      name: 'View Jobs',
      description: 'View job list and details',
      category: 'Job Management',
    },
    {
      id: 'jobs.write',
      name: 'Manage Jobs',
      description: 'Create and edit jobs',
      category: 'Job Management',
    },
    {
      id: 'jobs.assign',
      name: 'Assign Crews',
      description: 'Assign crews to jobs',
      category: 'Job Management',
    },
    {
      id: 'jobs.status',
      name: 'Update Job Status',
      description: 'Update job status and completion',
      category: 'Job Management',
    },

    // Estimates
    {
      id: 'estimates.read',
      name: 'View Estimates',
      description: 'View estimates and pricing',
      category: 'Estimates',
    },
    {
      id: 'estimates.write',
      name: 'Create Estimates',
      description: 'Create and modify estimates',
      category: 'Estimates',
    },
    {
      id: 'estimates.approve',
      name: 'Approve Estimates',
      description: 'Approve high-value estimates',
      category: 'Estimates',
    },

    // Calendar & Dispatch
    {
      id: 'calendar.read',
      name: 'View Calendar',
      description: 'View dispatch calendar',
      category: 'Calendar & Dispatch',
    },
    {
      id: 'calendar.write',
      name: 'Manage Schedule',
      description: 'Schedule and move jobs',
      category: 'Calendar & Dispatch',
    },

    // Reports & Analytics
    {
      id: 'reports.read',
      name: 'View Reports',
      description: 'Access reports and analytics',
      category: 'Reports & Analytics',
    },
    {
      id: 'reports.export',
      name: 'Export Reports',
      description: 'Export and download reports',
      category: 'Reports & Analytics',
    },

    // Settings
    {
      id: 'settings.company',
      name: 'Company Settings',
      description: 'Modify company information',
      category: 'Settings',
    },
    {
      id: 'settings.pricing',
      name: 'Pricing Settings',
      description: 'Modify pricing rules and rates',
      category: 'Settings',
    },
    {
      id: 'settings.system',
      name: 'System Settings',
      description: 'Modify system configuration',
      category: 'Settings',
    },

    // Mobile App
    {
      id: 'mobile.access',
      name: 'Mobile App Access',
      description: 'Access mobile crew application',
      category: 'Mobile App',
    },
    {
      id: 'mobile.photos',
      name: 'Upload Photos',
      description: 'Upload job photos and signatures',
      category: 'Mobile App',
    },
  ];

  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      name: 'super_admin',
      displayName: 'Super Admin',
      description: 'Full system access with all permissions',
      permissions: availablePermissions.map((p) => p.id),
      isSystem: true,
      userCount: 1,
    },
    {
      id: '2',
      name: 'admin',
      displayName: 'Administrator',
      description:
        'Administrative access with most permissions except super admin functions',
      permissions: [
        'users.read',
        'users.write',
        'customers.read',
        'customers.write',
        'customers.delete',
        'jobs.read',
        'jobs.write',
        'jobs.assign',
        'jobs.status',
        'estimates.read',
        'estimates.write',
        'estimates.approve',
        'calendar.read',
        'calendar.write',
        'reports.read',
        'reports.export',
        'settings.company',
        'settings.pricing',
      ],
      isSystem: true,
      userCount: 2,
    },
    {
      id: '3',
      name: 'dispatcher',
      displayName: 'Dispatcher',
      description:
        'Handles job scheduling, customer management, and day-to-day operations',
      permissions: [
        'customers.read',
        'customers.write',
        'jobs.read',
        'jobs.write',
        'jobs.assign',
        'jobs.status',
        'estimates.read',
        'estimates.write',
        'calendar.read',
        'calendar.write',
      ],
      isSystem: true,
      userCount: 3,
    },
    {
      id: '4',
      name: 'crew',
      displayName: 'Crew Member',
      description: 'Mobile app access for field crews',
      permissions: [
        'jobs.read',
        'jobs.status',
        'mobile.access',
        'mobile.photos',
      ],
      isSystem: true,
      userCount: 8,
    },
  ]);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [] as string[],
  });

  const groupedPermissions = availablePermissions.reduce(
    (groups, permission) => {
      if (!groups[permission.category]) {
        groups[permission.category] = [];
      }
      groups[permission.category].push(permission);
      return groups;
    },
    {} as Record<string, Permission[]>,
  );

  const handlePermissionToggle = (roleId: string, permissionId: string) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id === roleId && !role.isSystem) {
          const hasPermission = role.permissions.includes(permissionId);
          return {
            ...role,
            permissions: hasPermission
              ? role.permissions.filter((p) => p !== permissionId)
              : [...role.permissions, permissionId],
          };
        }
        return role;
      }),
    );
  };

  const handleCreateRole = () => {
    if (!newRole.name || !newRole.displayName) return;

    const role: Role = {
      id: Date.now().toString(),
      name: newRole.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: newRole.displayName,
      description: newRole.description,
      permissions: newRole.permissions,
      isSystem: false,
      userCount: 0,
    };

    setRoles((prev) => [...prev, role]);
    setNewRole({ name: '', displayName: '', description: '', permissions: [] });
    setShowCreateRole(false);
  };

  const canEditRole = (role: Role) => {
    return user?.role?.name === 'super_admin' && !role.isSystem;
  };

  return (
    <div className={styles.rolesPermissions}>
      <div className={styles.header}>
        <div>
          <h3>Roles & Permissions</h3>
          <p>Manage user roles and their system permissions</p>
        </div>
        {user?.role?.name === 'super_admin' && (
          <button
            className={styles.createButton}
            onClick={() => setShowCreateRole(true)}
          >
            + Create Role
          </button>
        )}
      </div>

      <div className={styles.rolesGrid}>
        {roles.map((role) => (
          <div key={role.id} className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <div>
                <h4>{role.displayName}</h4>
                <p>{role.description}</p>
                <div className={styles.roleStats}>
                  <span className={styles.userCount}>
                    {role.userCount} users
                  </span>
                  {role.isSystem && (
                    <span className={styles.systemRole}>System Role</span>
                  )}
                </div>
              </div>
              {canEditRole(role) && (
                <button
                  className={styles.editButton}
                  onClick={() => setSelectedRole(role)}
                >
                  ✏️
                </button>
              )}
            </div>

            <div className={styles.permissionsSummary}>
              <div className={styles.permissionCount}>
                {role.permissions.length} permissions
              </div>
              <div className={styles.permissionCategories}>
                {Object.keys(groupedPermissions)
                  .filter((category) =>
                    groupedPermissions[category].some((p) =>
                      role.permissions.includes(p.id),
                    ),
                  )
                  .map((category) => (
                    <span key={category} className={styles.categoryBadge}>
                      {category}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role Details Modal */}
      {selectedRole && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Edit Role: {selectedRole.displayName}</h4>
              <button
                className={styles.closeButton}
                onClick={() => setSelectedRole(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Role Name</label>
                <input
                  type="text"
                  value={selectedRole.displayName}
                  onChange={(e) =>
                    setSelectedRole((prev) =>
                      prev ? { ...prev, displayName: e.target.value } : null,
                    )
                  }
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={selectedRole.description}
                  onChange={(e) =>
                    setSelectedRole((prev) =>
                      prev ? { ...prev, description: e.target.value } : null,
                    )
                  }
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.permissionsSection}>
                <h5>Permissions</h5>
                {Object.entries(groupedPermissions).map(
                  ([category, permissions]) => (
                    <div key={category} className={styles.permissionCategory}>
                      <h6>{category}</h6>
                      <div className={styles.permissionsList}>
                        {permissions.map((permission) => (
                          <label
                            key={permission.id}
                            className={styles.permissionItem}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRole.permissions.includes(
                                permission.id,
                              )}
                              onChange={() =>
                                handlePermissionToggle(
                                  selectedRole.id,
                                  permission.id,
                                )
                              }
                              disabled={selectedRole.isSystem}
                            />
                            <div>
                              <span className={styles.permissionName}>
                                {permission.name}
                              </span>
                              <span className={styles.permissionDescription}>
                                {permission.description}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setSelectedRole(null)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save changes
                  setSelectedRole(null);
                }}
                className={styles.saveButton}
                disabled={selectedRole.isSystem}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Create New Role</h4>
              <button
                className={styles.closeButton}
                onClick={() => setShowCreateRole(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Role Name</label>
                <input
                  type="text"
                  value={newRole.displayName}
                  onChange={(e) =>
                    setNewRole((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="e.g., Sales Manager"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe this role's responsibilities..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.permissionsSection}>
                <h5>Select Permissions</h5>
                {Object.entries(groupedPermissions).map(
                  ([category, permissions]) => (
                    <div key={category} className={styles.permissionCategory}>
                      <h6>{category}</h6>
                      <div className={styles.permissionsList}>
                        {permissions.map((permission) => (
                          <label
                            key={permission.id}
                            className={styles.permissionItem}
                          >
                            <input
                              type="checkbox"
                              checked={newRole.permissions.includes(
                                permission.id,
                              )}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setNewRole((prev) => ({
                                  ...prev,
                                  permissions: isChecked
                                    ? [...prev.permissions, permission.id]
                                    : prev.permissions.filter(
                                        (p) => p !== permission.id,
                                      ),
                                }));
                              }}
                            />
                            <div>
                              <span className={styles.permissionName}>
                                {permission.name}
                              </span>
                              <span className={styles.permissionDescription}>
                                {permission.description}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowCreateRole(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button onClick={handleCreateRole} className={styles.saveButton}>
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
