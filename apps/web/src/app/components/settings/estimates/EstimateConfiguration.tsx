'use client';

import { useRouter } from 'next/navigation';
import styles from './EstimateConfiguration.module.css';

export default function EstimateConfiguration() {
  const router = useRouter();

  const configurationPages = [
    {
      title: 'Common Settings',
      description: 'General estimate configuration and defaults',
      icon: '⚙️',
      path: '/settings/estimates/common-settings',
      color: '#3B82F6',
    },
    {
      title: 'Custom Fields',
      description: 'Define custom fields for estimates',
      icon: '🔧',
      path: '/settings/estimates/custom-fields',
      color: '#8B5CF6',
    },
    {
      title: 'Price Ranges',
      description: 'Set price range categories and brackets',
      icon: '💰',
      path: '/settings/estimates/price-ranges',
      color: '#10B981',
    },
    {
      title: 'Move Sizes',
      description: 'Configure move size classifications',
      icon: '📏',
      path: '/settings/estimates/move-sizes',
      color: '#F59E0B',
    },
  ];

  const quickActions = [
    {
      label: 'View All Estimates',
      action: () => console.log('View estimates'),
    },
    {
      label: 'Create New Estimate',
      action: () => console.log('Create estimate'),
    },
    {
      label: 'Export Configuration',
      action: () => console.log('Export config'),
    },
  ];

  return (
    <div className={styles.estimateConfiguration}>
      <div className={styles.header}>
        <div>
          <h3>Estimate Configuration</h3>
          <p>Configure estimate settings and parameters</p>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📊</div>
          <div>
            <h4>Configuration Status</h4>
            <p>All core settings configured</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>✅</div>
          <div>
            <h4>Active Settings</h4>
            <p>4 configuration pages available</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>🔄</div>
          <div>
            <h4>Last Updated</h4>
            <p>Configure settings to track changes</p>
          </div>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {configurationPages.map((page, index) => (
          <div
            key={index}
            className={styles.card}
            onClick={() => router.push(page.path)}
            style={{ borderTopColor: page.color }}
          >
            <div
              className={styles.cardIcon}
              style={{ backgroundColor: page.color + '20', color: page.color }}
            >
              {page.icon}
            </div>
            <h4>{page.title}</h4>
            <p>{page.description}</p>
            <button className={styles.cardButton}>Configure →</button>
          </div>
        ))}
      </div>

      <div className={styles.quickActions}>
        <h4>Quick Actions</h4>
        <div className={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={styles.actionButton}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
