'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiUrl } from '../../../../lib/config';
import styles from './UserManagement.module.css';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: {
    id: string;
    name: string;
    displayName: string;
    permissions: Array<{
      id: string;
      resource: string;
      action: string;
    }>;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
  }>;
}

interface CreateUserForm {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  phoneNumber?: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
  }>;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    phoneNumber: '',
  });

  const [, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(getApiUrl('auth/users'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }

      if (response.status === 403) {
        setError('You do not have permission to view users.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      setUsers(result.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available roles from API
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(getApiUrl('auth/roles'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAvailableRoles(result.data || []);
        // Set default role if not set
        if (result.data && result.data.length > 0 && !createForm.roleId) {
          setCreateForm((prev) => ({
            ...prev,
            roleId:
              result.data.find((r: Role) => r.name === 'dispatcher')?.id ||
              result.data[0].id,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);

    const matchesRole = filterRole === 'all' || user.role.name === filterRole;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createForm.password !== createForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (!createForm.username || !createForm.email || !createForm.password) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(getApiUrl('auth/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: createForm.username,
          email: createForm.email,
          password: createForm.password,
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          roleId: createForm.roleId,
          phoneNumber: createForm.phoneNumber || undefined,
        }),
      });

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }

      if (response.status === 403) {
        setError('You do not have permission to create users.');
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to create user' }));
        throw new Error(errorData.message || 'Failed to create user');
      }

      const result = await response.json();

      // Add the new user to the state
      if (result.success && result.data) {
        setUsers((prev) => [...prev, result.data]);
      }

      // Reset form and close modal
      setCreateForm({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        roleId:
          availableRoles.find((r) => r.name === 'dispatcher')?.id ||
          availableRoles[0]?.id ||
          '',
        phoneNumber: '',
      });
      setShowCreateForm(false);

      // Show success message
      alert('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create user',
      );
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to create user. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newIsActive: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(getApiUrl(`auth/users/${userId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: newIsActive,
        }),
      });

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }

      if (response.status === 403) {
        setError('You do not have permission to update users.');
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to update user status' }));
        throw new Error(errorData.message || 'Failed to update user status');
      }

      const result = await response.json();

      // Update user in state
      if (result.success && result.data) {
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? result.data : user)),
        );
      }

      alert(`User ${newIsActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update user status',
      );
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to update user status. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? { label: 'Active', className: styles.statusActive }
      : { label: 'Inactive', className: styles.statusInactive };
  };

  return (
    <div className={styles.userManagement}>
      <div className={styles.header}>
        <div>
          <h3>User Management</h3>
          <p>Manage system users, roles, and permissions</p>
        </div>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
          disabled={!currentUser?.role?.name.includes('admin')}
        >
          + Add User
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && users.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading users...</p>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className={styles.filterSelect}
        >
          <option value="all">All Roles</option>
          {availableRoles.map((role) => (
            <option key={role.name} value={role.name}>
              {role.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className={styles.tableContainer}>
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={styles.userRow}>
                <td>
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                    <div>
                      <div className={styles.userName}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={styles.roleBadge}>
                    {user.role.displayName}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${getStatusBadge(user.isActive).className}`}
                  >
                    {getStatusBadge(user.isActive).label}
                  </span>
                </td>
                <td>
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => setSelectedUser(user)}
                      title="Edit User"
                    >
                      ✏️
                    </button>
                    {user.isActive ? (
                      <button
                        className={styles.actionButton}
                        onClick={() => handleStatusChange(user.id, false)}
                        title="Deactivate User"
                        disabled={user.id === currentUser?.id}
                      >
                        🚫
                      </button>
                    ) : (
                      <button
                        className={styles.actionButton}
                        onClick={() => handleStatusChange(user.id, true)}
                        title="Activate User"
                      >
                        ✅
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className={styles.emptyState}>
            <p>No users found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Create New User</h4>
              <button
                className={styles.closeButton}
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className={styles.createForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="username">Username *</label>
                  <input
                    id="username"
                    type="text"
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    required
                    className={styles.input}
                    placeholder="Enter username"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address *</label>
                  <input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                    className={styles.input}
                    placeholder="user@example.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    required
                    className={styles.input}
                    placeholder="John"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    required
                    className={styles.input}
                    placeholder="Doe"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={createForm.phoneNumber || ''}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    className={styles.input}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="roleId">Role *</label>
                  <select
                    id="roleId"
                    value={createForm.roleId}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        roleId: e.target.value,
                      }))
                    }
                    required
                    className={styles.select}
                  >
                    {availableRoles.length === 0 && (
                      <option value="">Loading roles...</option>
                    )}
                    {availableRoles
                      .filter(
                        (role) =>
                          currentUser?.role?.name === 'super_admin' ||
                          role.name !== 'super_admin',
                      )
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.displayName}
                        </option>
                      ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    required
                    minLength={8}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                    minLength={8}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={styles.submitButton}
                >
                  {isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
