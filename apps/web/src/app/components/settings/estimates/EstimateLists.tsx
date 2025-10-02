'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './EstimateLists.module.css';

export default function EstimateLists() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const listPages = [
    {
      title: 'Service Types',
      description: 'Moving, packing, storage, and specialty services',
      icon: '🚚',
      path: '/settings/estimates/lists/service-types',
      count: 5,
      color: '#3B82F6'
    },
    {
      title: 'Property Types',
      description: 'House, apartment, condo, office classifications',
      icon: '🏠',
      path: '/settings/estimates/lists/property-types',
      count: 7,
      color: '#8B5CF6'
    },
    {
      title: 'Inventory Items',
      description: 'Master catalog of furniture, appliances, boxes',
      icon: '📦',
      path: '/settings/estimates/lists/inventory-items',
      count: 150,
      color: '#10B981'
    },
    {
      title: 'Parking Options',
      description: 'Parking availability and difficulty levels',
      icon: '🅿️',
      path: '/settings/estimates/lists/parking-options',
      count: 6,
      color: '#F59E0B'
    },
    {
      title: 'Regions',
      description: 'Service areas and geographic zones',
      icon: '🗺️',
      path: '/settings/estimates/lists/regions',
      count: 12,
      color: '#EF4444'
    },
    {
      title: 'Cancellation Reasons',
      description: 'Job cancellation reason codes',
      icon: '❌',
      path: '/settings/estimates/lists/cancellation-reasons',
      count: 8,
      color: '#6B7280'
    },
    {
      title: 'Tags Management',
      description: 'Custom tags for organizing estimates',
      icon: '🏷️',
      path: '/settings/estimates/lists/tags',
      count: 15,
      color: '#EC4899'
    }
  ];

  const filteredPages = listPages.filter(page =>
    page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = listPages.reduce((sum, page) => sum + page.count, 0);

  return (
    <div className={styles.estimateLists}>
      <div className={styles.header}>
        <div>
          <h3>Estimate Lists</h3>
          <p>Manage estimate configuration lists and options</p>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📋</div>
          <div>
            <h4>Total Lists</h4>
            <p>{listPages.length} configuration lists</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📊</div>
          <div>
            <h4>Total Items</h4>
            <p>{totalItems} items across all lists</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>✅</div>
          <div>
            <h4>Status</h4>
            <p>All lists configured and active</p>
          </div>
        </div>
      </div>

      <div className={styles.searchSection}>
        <input
          type="text"
          placeholder="Search lists by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className={styles.clearButton}>
            Clear
          </button>
        )}
      </div>

      <div className={styles.cardsGrid}>
        {filteredPages.map((page, index) => (
          <div
            key={index}
            className={styles.card}
            onClick={() => router.push(page.path)}
            style={{ borderLeftColor: page.color }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} style={{ backgroundColor: page.color + '20', color: page.color }}>
                {page.icon}
              </div>
              <span className={styles.itemCount}>{page.count} items</span>
            </div>
            <h4>{page.title}</h4>
            <p>{page.description}</p>
            <button className={styles.cardButton}>
              Manage List →
            </button>
          </div>
        ))}
      </div>

      {filteredPages.length === 0 && (
        <div className={styles.emptyState}>
          <p>No lists found matching "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className={styles.clearButton}>
            Clear Search
          </button>
        </div>
      )}

      <div className={styles.bulkActions}>
        <h4>Bulk Operations</h4>
        <div className={styles.actionsGrid}>
          <button className={styles.actionButton}>
            📤 Export All Lists
          </button>
          <button className={styles.actionButton}>
            📥 Import from File
          </button>
          <button className={styles.actionButton}>
            🔄 Reset to Defaults
          </button>
          <button className={styles.actionButton}>
            📊 View Reports
          </button>
        </div>
      </div>
    </div>
  );
}
