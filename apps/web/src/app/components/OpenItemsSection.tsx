'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '@/lib/config';
import styles from './OpenItemsSection.module.css';

interface OpenItems {
  unassignedLeads: number;
  newLeads: number;
  acceptedNotBooked: number;
  staleOpportunities: number;
  customerServiceTickets: number;
  inventorySubmissions: number;
}

interface ActionableItem {
  id: string;
  title: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  description: string;
  action?: () => void;
}

export const OpenItemsSection = memo(function OpenItemsSection() {
  const { user } = useAuth();
  const [openItems, setOpenItems] = useState<OpenItems>({
    unassignedLeads: 0,
    newLeads: 0,
    acceptedNotBooked: 0,
    staleOpportunities: 0,
    customerServiceTickets: 0,
    inventorySubmissions: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchOpenItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token || !user) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(getApiUrl('analytics/open-items'), { headers });

      if (response.ok) {
        const data = await response.json();
        setOpenItems(data);
      } else {
        // Fallback data for development
        setOpenItems({
          unassignedLeads: Math.floor(Math.random() * 5),
          newLeads: Math.floor(Math.random() * 8),
          acceptedNotBooked: Math.floor(Math.random() * 3),
          staleOpportunities: Math.floor(Math.random() * 4) + 1,
          customerServiceTickets: Math.floor(Math.random() * 2),
          inventorySubmissions: Math.floor(Math.random() * 3) + 1
        });
      }

    } catch (error) {
      console.error('Failed to fetch open items:', error);
      // Set fallback data
      setOpenItems({
        unassignedLeads: 0,
        newLeads: 2,
        acceptedNotBooked: 0,
        staleOpportunities: 2,
        customerServiceTickets: 0,
        inventorySubmissions: 1
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOpenItems();

    // Refresh every 5 minutes
    const interval = setInterval(fetchOpenItems, 300000);
    return () => clearInterval(interval);
  }, [fetchOpenItems]);

  const getActionableItems = (): ActionableItem[] => [
    {
      id: 'unassigned_leads',
      title: 'Unassigned Leads',
      count: openItems.unassignedLeads,
      priority: openItems.unassignedLeads > 0 ? 'high' : 'low',
      icon: '👤',
      description: 'Leads waiting for assignment'
    },
    {
      id: 'new_leads',
      title: 'New Leads',
      count: openItems.newLeads,
      priority: openItems.newLeads > 3 ? 'high' : openItems.newLeads > 0 ? 'medium' : 'low',
      icon: '✨',
      description: 'Fresh leads requiring attention'
    },
    {
      id: 'accepted_not_booked',
      title: 'Accepted (not booked)',
      count: openItems.acceptedNotBooked,
      priority: openItems.acceptedNotBooked > 0 ? 'medium' : 'low',
      icon: '📅',
      description: 'Estimates accepted but not scheduled'
    },
    {
      id: 'stale_opportunities',
      title: 'Stale Opportunities',
      count: openItems.staleOpportunities,
      priority: openItems.staleOpportunities > 2 ? 'high' : openItems.staleOpportunities > 0 ? 'medium' : 'low',
      icon: '⏰',
      description: 'Opportunities requiring follow-up'
    },
    {
      id: 'customer_service_tickets',
      title: 'Customer Service Tickets',
      count: openItems.customerServiceTickets,
      priority: openItems.customerServiceTickets > 0 ? 'high' : 'low',
      icon: '🎧',
      description: 'Open customer support requests'
    },
    {
      id: 'inventory_submissions',
      title: 'Inventory Submissions',
      count: openItems.inventorySubmissions,
      priority: openItems.inventorySubmissions > 2 ? 'medium' : 'low',
      icon: '📦',
      description: 'Pending inventory reviews'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      default:
        return '#6c757d';
    }
  };

  const totalItems = Object.values(openItems).reduce((sum, count) => sum + count, 0);

  return (
    <div className={styles.openItemsSection}>
      <div className={styles.sectionHeader}>
        <h3>Open Items</h3>
        <div className={styles.totalCount}>
          <span className={styles.count}>{loading ? '...' : totalItems}</span>
          <span className={styles.label}>total</span>
        </div>
      </div>

      <div className={styles.itemsList}>
        {getActionableItems().map((item) => (
          <div
            key={item.id}
            className={`${styles.openItem} ${styles[`priority-${item.priority}`]}`}
            onClick={item.action}
            role={item.action ? 'button' : undefined}
            tabIndex={item.action ? 0 : undefined}
          >
            <div className={styles.itemIcon}>
              {item.icon}
            </div>

            <div className={styles.itemContent}>
              <div className={styles.itemHeader}>
                <div className={styles.itemTitle}>
                  {item.title}
                </div>
                <div
                  className={styles.itemCount}
                  style={{ color: item.count > 0 ? getPriorityColor(item.priority) : '#6c757d' }}
                >
                  {loading ? '...' : item.count}
                </div>
              </div>

              <div className={styles.itemDescription}>
                {item.description}
              </div>
            </div>

            {item.count > 0 && (
              <div
                className={styles.priorityIndicator}
                style={{ backgroundColor: getPriorityColor(item.priority) }}
              />
            )}
          </div>
        ))}
      </div>

      <div className={styles.sectionFooter}>
        <button
          onClick={fetchOpenItems}
          className={styles.refreshButton}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>

        <div className={styles.lastUpdated}>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
});