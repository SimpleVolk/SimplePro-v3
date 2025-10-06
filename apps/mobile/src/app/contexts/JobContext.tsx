import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';

interface Job {
  id: string;
  customerId: string;
  customerName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  estimatedDuration: number;
  crewId?: string;
  assignedCrew?: string[];
  serviceType: 'local' | 'long_distance' | 'storage' | 'packing_only';
  estimate: {
    totalPrice: number;
    breakdown: Record<string, number>;
  };
  addresses: {
    pickup: {
      address: string;
      specialInstructions?: string;
    };
    delivery: {
      address: string;
      specialInstructions?: string;
    };
  };
  checklist: ChecklistItem[];
  signatures?: {
    pickup?: string;
    delivery?: string;
  };
  photos: JobPhoto[];
  notes: string;
}

interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
  timestamp?: string;
}

interface JobPhoto {
  id: string;
  uri: string;
  description: string;
  timestamp: string;
  type: 'before' | 'during' | 'after' | 'damage' | 'inventory';
}

interface JobContextType {
  jobs: Job[];
  currentJob: Job | null;
  isLoading: boolean;
  fetchJobs: () => Promise<void>;
  selectJob: (jobId: string) => void;
  updateJobStatus: (jobId: string, status: Job['status']) => Promise<void>;
  updateChecklist: (
    jobId: string,
    checklistItem: ChecklistItem,
  ) => Promise<void>;
  addSignature: (
    jobId: string,
    type: 'pickup' | 'delivery',
    signature: string,
  ) => Promise<void>;
  addPhoto: (
    jobId: string,
    photo: Omit<JobPhoto, 'id' | 'timestamp'>,
  ) => Promise<void>;
  updateNotes: (jobId: string, notes: string) => Promise<void>;
  syncOfflineData: () => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchJobs();
    }
  }, [isAuthenticated, user]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('access_token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchJobs = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        const userId = user?.id || '';
        const crewJobs = data.jobs.filter(
          (job: Job) =>
            job.assignedCrew?.includes(userId) || job.crewId === user?.crewId,
        );
        setJobs(crewJobs);

        // Cache jobs offline
        await AsyncStorage.setItem('offline_jobs', JSON.stringify(crewJobs));
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      // Load from offline cache
      try {
        const offlineJobs = await AsyncStorage.getItem('offline_jobs');
        if (offlineJobs) {
          setJobs(JSON.parse(offlineJobs));
        }
      } catch (cacheError) {
        console.error('Failed to load offline jobs:', cacheError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    setCurrentJob(job || null);
  };

  const updateJobStatus = async (jobId: string, status: Job['status']) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedJob = await response.json();
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, ...updatedJob } : job,
          ),
        );
        if (currentJob?.id === jobId) {
          setCurrentJob((prev) => (prev ? { ...prev, ...updatedJob } : null));
        }
      }
    } catch (error) {
      console.error('Failed to update job status:', error);
      // Store offline update
      await storeOfflineUpdate(jobId, { status });
    }
  };

  const updateChecklist = async (
    jobId: string,
    checklistItem: ChecklistItem,
  ) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/checklist`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ checklistItem }),
      });

      if (response.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  checklist: job.checklist.map((item) =>
                    item.id === checklistItem.id ? checklistItem : item,
                  ),
                }
              : job,
          ),
        );
        if (currentJob?.id === jobId) {
          setCurrentJob((prev) =>
            prev
              ? {
                  ...prev,
                  checklist: prev.checklist.map((item) =>
                    item.id === checklistItem.id ? checklistItem : item,
                  ),
                }
              : null,
          );
        }
      }
    } catch (error) {
      console.error('Failed to update checklist:', error);
      await storeOfflineUpdate(jobId, { checklist: checklistItem });
    }
  };

  const addSignature = async (
    jobId: string,
    type: 'pickup' | 'delivery',
    signature: string,
  ) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/signature`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, signature }),
      });

      if (response.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  signatures: { ...job.signatures, [type]: signature },
                }
              : job,
          ),
        );
        if (currentJob?.id === jobId) {
          setCurrentJob((prev) =>
            prev
              ? {
                  ...prev,
                  signatures: { ...prev.signatures, [type]: signature },
                }
              : null,
          );
        }
      }
    } catch (error) {
      console.error('Failed to add signature:', error);
      await storeOfflineUpdate(jobId, { signature: { type, signature } });
    }
  };

  const addPhoto = async (
    jobId: string,
    photo: Omit<JobPhoto, 'id' | 'timestamp'>,
  ) => {
    const newPhoto: JobPhoto = {
      ...photo,
      id: `photo_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/photos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newPhoto),
      });

      if (response.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? { ...job, photos: [...job.photos, newPhoto] }
              : job,
          ),
        );
        if (currentJob?.id === jobId) {
          setCurrentJob((prev) =>
            prev
              ? {
                  ...prev,
                  photos: [...prev.photos, newPhoto],
                }
              : null,
          );
        }
      }
    } catch (error) {
      console.error('Failed to add photo:', error);
      await storeOfflineUpdate(jobId, { photo: newPhoto });
    }
  };

  const updateNotes = async (jobId: string, notes: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        setJobs((prev) =>
          prev.map((job) => (job.id === jobId ? { ...job, notes } : job)),
        );
        if (currentJob?.id === jobId) {
          setCurrentJob((prev) => (prev ? { ...prev, notes } : null));
        }
      }
    } catch (error) {
      console.error('Failed to update notes:', error);
      await storeOfflineUpdate(jobId, { notes });
    }
  };

  const storeOfflineUpdate = async (jobId: string, update: any) => {
    try {
      const offlineUpdates =
        (await AsyncStorage.getItem('offline_updates')) || '[]';
      const updates = JSON.parse(offlineUpdates);
      updates.push({
        jobId,
        update,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem('offline_updates', JSON.stringify(updates));
    } catch (error) {
      console.error('Failed to store offline update:', error);
    }
  };

  const syncOfflineData = async () => {
    try {
      const offlineUpdates = await AsyncStorage.getItem('offline_updates');
      if (!offlineUpdates) return;

      const updates = JSON.parse(offlineUpdates);
      const headers = await getAuthHeaders();

      for (const { jobId, update } of updates) {
        try {
          await fetch(`${API_BASE_URL}/jobs/${jobId}/sync`, {
            method: 'POST',
            headers,
            body: JSON.stringify(update),
          });
        } catch (error) {
          console.error(`Failed to sync update for job ${jobId}:`, error);
        }
      }

      // Clear offline updates after successful sync
      await AsyncStorage.removeItem('offline_updates');

      // Refresh jobs
      await fetchJobs();
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  };

  const value = {
    jobs,
    currentJob,
    isLoading,
    fetchJobs,
    selectJob,
    updateJobStatus,
    updateChecklist,
    addSignature,
    addPhoto,
    updateNotes,
    syncOfflineData,
  };

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
};

export const useJobs = (): JobContextType => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};
