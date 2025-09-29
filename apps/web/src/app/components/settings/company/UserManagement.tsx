'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './UserManagement.module.css';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: {
    name: string;
    displayName: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  permissions: string[];
}

interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@movecorp.com',
      role: { name: 'super_admin', displayName: 'Super Admin' },
      status: 'active',
      lastLogin: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      permissions: ['*']
    },
    {
      id: '2',
      firstName: 'John',
      lastName: 'Dispatcher',
      email: 'john@movecorp.com',
      role: { name: 'dispatcher', displayName: 'Dispatcher' },
      status: 'active',
      lastLogin: '2024-01-14T16:45:00Z',
      createdAt: '2024-01-05T00:00:00Z',
      permissions: ['jobs.read', 'jobs.write', 'customers.read', 'customers.write']
    },
    {
      id: '3',
      firstName: 'Mike',
      lastName: 'CrewLead',
      email: 'mike@movecorp.com',
      role: { name: 'crew', displayName: 'Crew Member' },
      status: 'active',
      lastLogin: '2024-01-13T08:15:00Z',
      createdAt: '2024-01-08T00:00:00Z',
      permissions: ['jobs.read', 'mobile.access']
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'dispatcher'
  });

  const [, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'super_admin' | 'admin' | 'dispatcher' | 'crew'>('all');

  const availableRoles = [
    { name: 'super_admin', displayName: 'Super Admin', permissions: ['*'] },
    { name: 'admin', displayName: 'Admin', permissions: ['users.*', 'jobs.*', 'customers.*', 'reports.*'] },
    { name: 'dispatcher', displayName: 'Dispatcher', permissions: ['jobs.*', 'customers.*', 'calendar.*'] },
    { name: 'crew', displayName: 'Crew Member', permissions: ['jobs.read', 'mobile.access'] }
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role.name === filterRole;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createForm.password !== createForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call
      const newUser: User = {
        id: Date.now().toString(),
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        email: createForm.email,
        role: availableRoles.find(r => r.name === createForm.role)! as any,
        status: 'active',
        createdAt: new Date().toISOString(),
        permissions: availableRoles.find(r => r.name === createForm.role)?.permissions || []
      };

      setUsers(prev => [...prev, newUser]);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'dispatcher'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: User['status']) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, status: newStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
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
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: User['status']) => {
    const badges = {
      active: { label: 'Active', className: styles.statusActive },
      inactive: { label: 'Inactive', className: styles.statusInactive },
      suspended: { label: 'Suspended', className: styles.statusSuspended }
    };
    return badges[status];
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
          <option value="suspended">Suspended</option>
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className={styles.filterSelect}
        >
          <option value="all">All Roles</option>
          {availableRoles.map(role => (
            <option key={role.name} value={role.name}>{role.displayName}</option>
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
            {filteredUsers.map(user => (
              <tr key={user.id} className={styles.userRow}>
                <td>
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      {user.firstName[0]}{user.lastName[0]}
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
                  <span className={`${styles.statusBadge} ${getStatusBadge(user.status).className}`}>
                    {getStatusBadge(user.status).label}
                  </span>
                </td>
                <td>
                  {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
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
                    {user.status === 'active' ? (
                      <button
                        className={styles.actionButton}
                        onClick={() => handleStatusChange(user.id, 'suspended')}
                        title="Suspend User"
                        disabled={user.id === currentUser?.id}
                      >
                        🚫
                      </button>
                    ) : (
                      <button
                        className={styles.actionButton}
                        onClick={() => handleStatusChange(user.id, 'active')}
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
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                    required
                    className={styles.select}
                  >
                    {availableRoles
                      .filter(role => currentUser?.role?.name === 'super_admin' || role.name !== 'super_admin')
                      .map(role => (
                        <option key={role.name} value={role.name}>
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
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
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
                    onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
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