'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CrewChecklist.module.css';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'equipment' | 'paperwork' | 'safety' | 'vehicle';
  required: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  photoUrl?: string;
  notes?: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  jobType: 'local' | 'long_distance' | 'storage' | 'packing_only' | 'all';
  items: Omit<ChecklistItem, 'id' | 'completed' | 'completedAt' | 'completedBy' | 'photoUrl' | 'notes'>[];
}

interface JobChecklist {
  id: string;
  jobId: string;
  jobNumber: string;
  assignedTo: string;
  items: ChecklistItem[];
  completionRate: number;
  assignedAt: string;
  dueDate: string;
}

export function CrewChecklist() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<JobChecklist[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<JobChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [photoUpload, setPhotoUpload] = useState<{ itemId: string; file: File | null }>({ itemId: '', file: null });

  useEffect(() => {
    fetchChecklists();
    fetchTemplates();
  }, []);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      // Mock data for now
      setChecklists(generateMockChecklists());
    } catch (err) {
      console.error('Error fetching checklists:', err);
      setChecklists(generateMockChecklists());
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      // Mock templates
      setTemplates([
        {
          id: '1',
          name: 'Standard Local Move',
          jobType: 'local',
          items: [
            { title: 'Truck inspection', description: 'Check fuel, tire pressure, lights', category: 'vehicle', required: true },
            { title: 'Moving blankets (12)', description: 'Verify count and condition', category: 'equipment', required: true },
            { title: 'Dolly (2)', description: 'Check wheels and handles', category: 'equipment', required: true },
            { title: 'Straps and ropes', description: 'At least 6 straps, 2 ropes', category: 'equipment', required: true },
            { title: 'Work order signed', description: 'Customer signature required', category: 'paperwork', required: true },
            { title: 'Safety gear', description: 'Gloves, back supports, safety shoes', category: 'safety', required: true },
          ],
        },
        {
          id: '2',
          name: 'Long Distance Move',
          jobType: 'long_distance',
          items: [
            { title: 'Truck inspection', description: 'Full mechanical check', category: 'vehicle', required: true },
            { title: 'GPS and route planning', description: 'Enter destination, check route', category: 'vehicle', required: true },
            { title: 'Inventory list', description: 'Complete item-by-item list', category: 'paperwork', required: true },
            { title: 'Insurance documents', description: 'Verify coverage and paperwork', category: 'paperwork', required: true },
            { title: 'Emergency kit', description: 'First aid, flashlight, tools', category: 'safety', required: true },
          ],
        },
      ]);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const generateMockChecklists = (): JobChecklist[] => {
    return [
      {
        id: '1',
        jobId: 'job-001',
        jobNumber: 'MV-2025-001',
        assignedTo: 'John Smith',
        completionRate: 75,
        assignedAt: '2025-10-02T08:00:00Z',
        dueDate: '2025-10-02T14:00:00Z',
        items: [
          {
            id: 'item-1',
            title: 'Truck inspection',
            description: 'Check fuel, tire pressure, lights',
            category: 'vehicle',
            required: true,
            completed: true,
            completedAt: '2025-10-02T08:15:00Z',
            completedBy: 'John Smith',
          },
          {
            id: 'item-2',
            title: 'Moving blankets (12)',
            description: 'Verify count and condition',
            category: 'equipment',
            required: true,
            completed: true,
            completedAt: '2025-10-02T08:20:00Z',
            completedBy: 'John Smith',
          },
          {
            id: 'item-3',
            title: 'Safety gear',
            description: 'Gloves, back supports, safety shoes',
            category: 'safety',
            required: true,
            completed: true,
            completedAt: '2025-10-02T08:25:00Z',
            completedBy: 'John Smith',
          },
          {
            id: 'item-4',
            title: 'Work order signed',
            description: 'Customer signature required',
            category: 'paperwork',
            required: true,
            completed: false,
          },
        ],
      },
      {
        id: '2',
        jobId: 'job-002',
        jobNumber: 'MV-2025-002',
        assignedTo: 'Mike Johnson',
        completionRate: 0,
        assignedAt: '2025-10-02T09:00:00Z',
        dueDate: '2025-10-02T15:00:00Z',
        items: [
          {
            id: 'item-5',
            title: 'Truck inspection',
            description: 'Full mechanical check',
            category: 'vehicle',
            required: true,
            completed: false,
          },
          {
            id: 'item-6',
            title: 'GPS and route planning',
            description: 'Enter destination, check route',
            category: 'vehicle',
            required: true,
            completed: false,
          },
        ],
      },
    ];
  };

  const toggleItem = async (checklistId: string, itemId: string) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;

    const item = checklist.items.find(i => i.id === itemId);
    if (!item) return;

    const updatedChecklists = checklists.map(c => {
      if (c.id === checklistId) {
        const updatedItems = c.items.map(i => {
          if (i.id === itemId) {
            return {
              ...i,
              completed: !i.completed,
              completedAt: !i.completed ? new Date().toISOString() : undefined,
              completedBy: !i.completed ? user?.email : undefined,
            };
          }
          return i;
        });

        const completedCount = updatedItems.filter(i => i.completed).length;
        const completionRate = (completedCount / updatedItems.length) * 100;

        return { ...c, items: updatedItems, completionRate };
      }
      return c;
    });

    setChecklists(updatedChecklists);

    if (selectedChecklist && selectedChecklist.id === checklistId) {
      setSelectedChecklist(updatedChecklists.find(c => c.id === checklistId) || null);
    }
  };

  const handlePhotoUpload = async (checklistId: string, itemId: string) => {
    if (!photoUpload.file) return;

    // In a real app, upload to server
    const updatedChecklists = checklists.map(c => {
      if (c.id === checklistId) {
        return {
          ...c,
          items: c.items.map(i =>
            i.id === itemId
              ? { ...i, photoUrl: URL.createObjectURL(photoUpload.file!) }
              : i
          ),
        };
      }
      return c;
    });

    setChecklists(updatedChecklists);
    setPhotoUpload({ itemId: '', file: null });
    setSuccessMessage('Photo uploaded successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      equipment: '🔧',
      paperwork: '📄',
      safety: '⚠️',
      vehicle: '🚛',
    };
    return icons[category] || '📋';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      equipment: '#3b82f6',
      paperwork: '#f59e0b',
      safety: '#dc2626',
      vehicle: '#10b981',
    };
    return colors[category] || '#6b7280';
  };

  if (loading && checklists.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading checklists...</p>
      </div>
    );
  }

  return (
    <div className={styles.crewChecklist}>
      <div className={styles.header}>
        <div>
          <h2>Crew Checklists</h2>
          <p className={styles.subtitle}>Pre-job checklists for crew members</p>
        </div>

        <button onClick={() => setShowTemplateModal(true)} className={styles.primaryButton}>
          Create from Template
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className={styles.success}>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.checklistsPanel}>
          <h3>Active Checklists</h3>

          {checklists.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No active checklists</p>
            </div>
          ) : (
            <div className={styles.checklistList}>
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className={`${styles.checklistCard} ${
                    selectedChecklist?.id === checklist.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedChecklist(checklist)}
                >
                  <div className={styles.checklistHeader}>
                    <div className={styles.jobNumber}>{checklist.jobNumber}</div>
                    <div className={styles.completionBadge}>
                      {checklist.completionRate}%
                    </div>
                  </div>
                  <div className={styles.assignedTo}>
                    👷 {checklist.assignedTo}
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${checklist.completionRate}%` }}
                    ></div>
                  </div>
                  <div className={styles.checklistFooter}>
                    <span className={styles.itemCount}>
                      {checklist.items.filter(i => i.completed).length}/{checklist.items.length} complete
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.detailsPanel}>
          {selectedChecklist ? (
            <>
              <div className={styles.detailsHeader}>
                <h3>Checklist: {selectedChecklist.jobNumber}</h3>
                <button
                  onClick={() => setSelectedChecklist(null)}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>

              <div className={styles.checklistInfo}>
                <div className={styles.infoItem}>
                  <strong>Assigned to:</strong> {selectedChecklist.assignedTo}
                </div>
                <div className={styles.infoItem}>
                  <strong>Due:</strong> {new Date(selectedChecklist.dueDate).toLocaleString()}
                </div>
                <div className={styles.infoItem}>
                  <strong>Completion:</strong>
                  <span
                    className={styles.completionRate}
                    style={{
                      color: selectedChecklist.completionRate === 100 ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {selectedChecklist.completionRate}%
                  </span>
                </div>
              </div>

              <div className={styles.itemsList}>
                {selectedChecklist.items.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.checklistItem} ${item.completed ? styles.completed : ''}`}
                  >
                    <div className={styles.itemHeader}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleItem(selectedChecklist.id, item.id)}
                        className={styles.checkbox}
                      />
                      <div className={styles.itemTitle}>
                        <span>{item.title}</span>
                        {item.required && <span className={styles.requiredBadge}>Required</span>}
                      </div>
                      <div
                        className={styles.categoryBadge}
                        style={{ background: getCategoryColor(item.category) }}
                      >
                        {getCategoryIcon(item.category)} {item.category}
                      </div>
                    </div>

                    <div className={styles.itemDescription}>{item.description}</div>

                    {item.completed && (
                      <div className={styles.completionInfo}>
                        ✓ Completed by {item.completedBy} at{' '}
                        {item.completedAt && new Date(item.completedAt).toLocaleTimeString()}
                      </div>
                    )}

                    <div className={styles.itemActions}>
                      <div className={styles.photoUpload}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setPhotoUpload({ itemId: item.id, file });
                          }}
                          className={styles.fileInput}
                          id={`photo-${item.id}`}
                        />
                        <label htmlFor={`photo-${item.id}`} className={styles.fileLabel}>
                          📷 Upload Photo
                        </label>
                        {photoUpload.itemId === item.id && photoUpload.file && (
                          <button
                            onClick={() => handlePhotoUpload(selectedChecklist.id, item.id)}
                            className={styles.uploadButton}
                          >
                            Save Photo
                          </button>
                        )}
                      </div>

                      {item.photoUrl && (
                        <div className={styles.photoPreview}>
                          <img src={item.photoUrl} alt="Checklist item verification" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a checklist to view details</p>
            </div>
          )}
        </div>
      </div>

      {showTemplateModal && (
        <div className={styles.modal} onClick={() => setShowTemplateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Select Checklist Template</h3>
              <button onClick={() => setShowTemplateModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {templates.map((template) => (
                <div key={template.id} className={styles.templateCard}>
                  <h4>{template.name}</h4>
                  <p className={styles.templateType}>Job Type: {template.jobType}</p>
                  <p className={styles.templateItems}>{template.items.length} items</p>
                  <button
                    onClick={() => {
                      alert(`Template "${template.name}" selected`);
                      setShowTemplateModal(false);
                    }}
                    className={styles.selectButton}
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
