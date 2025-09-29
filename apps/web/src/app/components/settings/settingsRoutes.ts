import type { SettingsRoute } from './SettingsLayout';

export const settingsRoutes: SettingsRoute[] = [
  {
    id: 'company',
    label: 'Company Settings',
    path: '/settings/company',
    icon: '🏢',
    roles: ['super_admin', 'admin'],
    children: [
      {
        id: 'company-details',
        label: 'Company Details',
        path: '/settings/company/details',
        icon: '📋',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'users',
        label: 'User Management',
        path: '/settings/company/users',
        icon: '👥',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        path: '/settings/company/roles',
        icon: '🔐',
        roles: ['super_admin']
      },
      {
        id: 'audit',
        label: 'Audit Logs',
        path: '/settings/company/audit',
        icon: '📊',
        roles: ['super_admin']
      },
      {
        id: 'branding',
        label: 'Branding',
        path: '/settings/company/branding',
        icon: '🎨',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'branches',
        label: 'Branches',
        path: '/settings/company/branches',
        icon: '🏪',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'payment-gateway',
        label: 'Payment Gateway',
        path: '/settings/company/payment-gateway',
        icon: '💳',
        roles: ['super_admin']
      },
      {
        id: 'sms-campaigns',
        label: 'SMS Campaigns',
        path: '/settings/company/sms-campaigns',
        icon: '📱',
        roles: ['super_admin', 'admin']
      }
    ]
  },
  {
    id: 'estimates',
    label: 'Estimate Settings',
    path: '/settings/estimates',
    icon: '📋',
    roles: ['super_admin', 'admin'],
    children: [
      {
        id: 'estimate-lists',
        label: 'Estimate Lists',
        path: '/settings/estimates/lists',
        icon: '📝',
        roles: ['super_admin', 'admin'],
        children: [
          {
            id: 'service-types',
            label: 'Service Types',
            path: '/settings/estimates/lists/service-types',
            icon: '🔧',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'property-types',
            label: 'Property Types',
            path: '/settings/estimates/lists/property-types',
            icon: '🏠',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'inventory-items',
            label: 'Inventory Items',
            path: '/settings/estimates/lists/inventory-items',
            icon: '📦',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'parking-options',
            label: 'Parking Options',
            path: '/settings/estimates/lists/parking-options',
            icon: '🚗',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'regions',
            label: 'Regions',
            path: '/settings/estimates/lists/regions',
            icon: '🌍',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'cancellation-reasons',
            label: 'Cancellation Reasons',
            path: '/settings/estimates/lists/cancellation-reasons',
            icon: '❌',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'tags',
            label: 'Tags Management',
            path: '/settings/estimates/lists/tags',
            icon: '🏷️',
            roles: ['super_admin', 'admin']
          }
        ]
      },
      {
        id: 'estimate-config',
        label: 'Configuration',
        path: '/settings/estimates/config',
        icon: '⚙️',
        roles: ['super_admin', 'admin'],
        children: [
          {
            id: 'common-settings',
            label: 'Common Settings',
            path: '/settings/estimates/config/common',
            icon: '🔧',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'custom-fields',
            label: 'Custom Fields',
            path: '/settings/estimates/config/custom-fields',
            icon: '📝',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'move-sizes',
            label: 'Move & Room Sizes',
            path: '/settings/estimates/config/move-sizes',
            icon: '📐',
            roles: ['super_admin', 'admin']
          },
          {
            id: 'price-ranges',
            label: 'Price Ranges',
            path: '/settings/estimates/config/price-ranges',
            icon: '💰',
            roles: ['super_admin', 'admin']
          }
        ]
      }
    ]
  },
  {
    id: 'tariffs',
    label: 'Tariffs & Pricing',
    path: '/settings/tariffs',
    icon: '💰',
    roles: ['super_admin', 'admin'],
    children: [
      {
        id: 'hourly-rates',
        label: 'Hourly Moving Rates',
        path: '/settings/tariffs/hourly-rates',
        icon: '⏰',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'distance-rates',
        label: 'Distance Rates',
        path: '/settings/tariffs/distance-rates',
        icon: '📏',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'materials-pricing',
        label: 'Materials Pricing',
        path: '/settings/tariffs/materials-pricing',
        icon: '📦',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'packing-rates',
        label: 'Packing Rates',
        path: '/settings/tariffs/packing-rates',
        icon: '📦',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'handicaps',
        label: 'Location Handicaps',
        path: '/settings/tariffs/handicaps',
        icon: '⚠️',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'valuation-templates',
        label: 'Valuation Templates',
        path: '/settings/tariffs/valuation-templates',
        icon: '📋',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'opportunity-types',
        label: 'Opportunity Types',
        path: '/settings/tariffs/opportunity-types',
        icon: '🎯',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'auto-pricing-engine',
        label: 'Auto Pricing Engine',
        path: '/settings/tariffs/auto-pricing-engine',
        icon: '🤖',
        roles: ['super_admin']
      }
    ]
  },
  {
    id: 'operations',
    label: 'Operations',
    path: '/settings/operations',
    icon: '⚡',
    roles: ['super_admin', 'admin'],
    children: [
      {
        id: 'crew-management',
        label: 'Crew Management',
        path: '/settings/operations/crew-management',
        icon: '👷',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'dispatch-settings',
        label: 'Dispatch Settings',
        path: '/settings/operations/dispatch-settings',
        icon: '📞',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'mobile-app-config',
        label: 'Mobile App Config',
        path: '/settings/operations/mobile-app-config',
        icon: '📱',
        roles: ['super_admin', 'admin']
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/settings/operations/notifications',
        icon: '🔔',
        roles: ['super_admin', 'admin']
      }
    ]
  }
];