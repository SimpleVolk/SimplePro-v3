'use client';

import { useState } from 'react';
import styles from './ServiceTypes.module.css';

interface ServiceType {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  isActive: boolean;
  category: 'moving' | 'packing' | 'storage' | 'specialty';
  color: string;
}

export default function ServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([
    {
      id: '1',
      name: 'Local Moving',
      description: 'Local residential and commercial moves within city limits',
      baseRate: 150,
      isActive: true,
      category: 'moving',
      color: '#3B82F6',
    },
    {
      id: '2',
      name: 'Long Distance Moving',
      description: 'Interstate and long-distance relocations',
      baseRate: 2500,
      isActive: true,
      category: 'moving',
      color: '#EF4444',
    },
    {
      id: '3',
      name: 'Packing Services',
      description: 'Professional packing and unpacking services',
      baseRate: 75,
      isActive: true,
      category: 'packing',
      color: '#10B981',
    },
    {
      id: '4',
      name: 'Storage Solutions',
      description: 'Short and long-term storage facilities',
      baseRate: 200,
      isActive: true,
      category: 'storage',
      color: '#F59E0B',
    },
    {
      id: '5',
      name: 'Piano Moving',
      description: 'Specialized piano and organ moving services',
      baseRate: 350,
      isActive: true,
      category: 'specialty',
      color: '#8B5CF6',
    },
  ]);

  const [, setShowCreateForm] = useState(false);
  const [, setEditingService] = useState<ServiceType | null>(null);

  const categories = [
    { value: 'moving', label: 'Moving Services', icon: '🚚' },
    { value: 'packing', label: 'Packing Services', icon: '📦' },
    { value: 'storage', label: 'Storage Services', icon: '🏪' },
    { value: 'specialty', label: 'Specialty Services', icon: '🎹' },
  ];

  return (
    <div className={styles.serviceTypes}>
      <div className={styles.header}>
        <div>
          <h3>Service Types</h3>
          <p>Manage available service types and their base rates</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className={styles.createButton}
        >
          + Add Service Type
        </button>
      </div>

      <div className={styles.categoriesGrid}>
        {categories.map((category) => {
          const categoryServices = serviceTypes.filter(
            (service) => service.category === category.value,
          );

          return (
            <div key={category.value} className={styles.categorySection}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>{category.icon}</span>
                <h4>{category.label}</h4>
                <span className={styles.serviceCount}>
                  {categoryServices.length} services
                </span>
              </div>

              <div className={styles.servicesList}>
                {categoryServices.map((service) => (
                  <div key={service.id} className={styles.serviceCard}>
                    <div
                      className={styles.serviceColor}
                      style={{ backgroundColor: service.color }}
                    ></div>
                    <div className={styles.serviceInfo}>
                      <h5>{service.name}</h5>
                      <p>{service.description}</p>
                      <div className={styles.serviceDetails}>
                        <span className={styles.baseRate}>
                          ${service.baseRate}/
                          {service.category === 'moving' ? 'hour' : 'job'}
                        </span>
                        <span
                          className={`${styles.status} ${service.isActive ? styles.active : styles.inactive}`}
                        >
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.serviceActions}>
                      <button
                        onClick={() => setEditingService(service)}
                        className={styles.actionButton}
                        title="Edit Service"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          setServiceTypes((prev) =>
                            prev.map((s) =>
                              s.id === service.id
                                ? { ...s, isActive: !s.isActive }
                                : s,
                            ),
                          );
                        }}
                        className={styles.actionButton}
                        title={service.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {service.isActive ? '🚫' : '✅'}
                      </button>
                    </div>
                  </div>
                ))}

                {categoryServices.length === 0 && (
                  <div className={styles.emptyCategory}>
                    <p>No services in this category</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
