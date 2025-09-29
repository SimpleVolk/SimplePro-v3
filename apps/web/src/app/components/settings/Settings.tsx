'use client';

import { useState, Suspense, lazy } from 'react';
import { SettingsLayout } from './SettingsLayout';
import { LoadingSkeleton } from '../LoadingSkeleton';
import styles from './Settings.module.css';

// Dynamic imports for settings components
const CompanySettings = lazy(() => import('./company/CompanySettings'));
const UserManagement = lazy(() => import('./company/UserManagement'));
const RolesPermissions = lazy(() => import('./company/RolesPermissions'));
const AuditLogs = lazy(() => import('./company/AuditLogs'));
const CompanyBranding = lazy(() => import('./company/CompanyBranding'));
const Branches = lazy(() => import('./company/Branches'));

const EstimateLists = lazy(() => import('./estimates/EstimateLists'));
const EstimateConfiguration = lazy(() => import('./estimates/EstimateConfiguration'));
const ServiceTypes = lazy(() => import('./estimates/lists/ServiceTypes'));
const PropertyTypes = lazy(() => import('./estimates/lists/PropertyTypes'));
const InventoryItems = lazy(() => import('./estimates/lists/InventoryItems'));

const HourlyRates = lazy(() => import('./tariffs/HourlyRates'));
const MaterialsPricing = lazy(() => import('./tariffs/MaterialsPricing'));
const PackingRates = lazy(() => import('./tariffs/PackingRates'));
const LocationHandicaps = lazy(() => import('./tariffs/LocationHandicaps'));
const AutoPricingEngine = lazy(() => import('./tariffs/AutoPricingEngine'));

interface SettingsProps {
  initialPath?: string;
}

export function Settings({ initialPath = '/settings/company/details' }: SettingsProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);

  const renderSettingsContent = () => {
    const LoadingFallback = () => <LoadingSkeleton type="default" rows={6} />;

    switch (currentPath) {
      // Company Settings
      case '/settings/company':
      case '/settings/company/details':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CompanySettings />
          </Suspense>
        );

      case '/settings/company/users':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UserManagement />
          </Suspense>
        );

      case '/settings/company/roles':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RolesPermissions />
          </Suspense>
        );

      case '/settings/company/audit':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AuditLogs />
          </Suspense>
        );

      case '/settings/company/branding':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CompanyBranding />
          </Suspense>
        );

      case '/settings/company/branches':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Branches />
          </Suspense>
        );

      // Estimate Settings
      case '/settings/estimates':
      case '/settings/estimates/lists':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <EstimateLists />
          </Suspense>
        );

      case '/settings/estimates/config':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <EstimateConfiguration />
          </Suspense>
        );

      case '/settings/estimates/lists/service-types':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ServiceTypes />
          </Suspense>
        );

      case '/settings/estimates/lists/property-types':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PropertyTypes />
          </Suspense>
        );

      case '/settings/estimates/lists/inventory-items':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <InventoryItems />
          </Suspense>
        );

      // Tariffs & Pricing
      case '/settings/tariffs':
      case '/settings/tariffs/hourly-rates':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HourlyRates />
          </Suspense>
        );

      case '/settings/tariffs/materials-pricing':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MaterialsPricing />
          </Suspense>
        );

      case '/settings/tariffs/packing-rates':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PackingRates />
          </Suspense>
        );

      case '/settings/tariffs/handicaps':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LocationHandicaps />
          </Suspense>
        );

      case '/settings/tariffs/auto-pricing-engine':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AutoPricingEngine />
          </Suspense>
        );

      default:
        return (
          <div className={styles.defaultView}>
            <div className={styles.defaultContent}>
              <div className={styles.iconContainer}>
                <span className={styles.icon}>⚙️</span>
              </div>
              <h3>Settings Overview</h3>
              <p>
                Welcome to the system settings. Use the navigation on the left to configure
                your business operations, pricing, and system preferences.
              </p>
              <div className={styles.quickLinks}>
                <h4>Quick Access</h4>
                <div className={styles.linkGrid}>
                  <button
                    className={styles.quickLink}
                    onClick={() => setCurrentPath('/settings/company/details')}
                  >
                    <span>🏢</span>
                    Company Details
                  </button>
                  <button
                    className={styles.quickLink}
                    onClick={() => setCurrentPath('/settings/company/users')}
                  >
                    <span>👥</span>
                    User Management
                  </button>
                  <button
                    className={styles.quickLink}
                    onClick={() => setCurrentPath('/settings/tariffs/hourly-rates')}
                  >
                    <span>💰</span>
                    Pricing Setup
                  </button>
                  <button
                    className={styles.quickLink}
                    onClick={() => setCurrentPath('/settings/estimates/lists/service-types')}
                  >
                    <span>📋</span>
                    Service Types
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <SettingsLayout
      currentPath={currentPath}
      onNavigate={setCurrentPath}
    >
      {renderSettingsContent()}
    </SettingsLayout>
  );
}