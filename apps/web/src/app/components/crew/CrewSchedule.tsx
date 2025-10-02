'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '@/lib/config';
import styles from './CrewSchedule.module.css';

interface CrewMember {
  id: string;
  name: string;
  role: 'lead' | 'mover' | 'driver' | 'specialist';
  status: 'available' | 'busy' | 'time_off';
  rating?: number;
}

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  type: 'local' | 'long_distance' | 'storage' | 'packing_only';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  assignedCrew: CrewAssignment[];
  estimatedCost: number;
  pickupAddress: {
    city: string;
    state: string;
  };
  deliveryAddress: {
    city: string;
    state: string;
  };
}

interface CrewAssignment {
  crewMemberId: string;
  role: 'lead' | 'mover' | 'driver' | 'specialist';
  status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out';
}

interface ScheduleConflict {
  type: 'overlap' | 'time_off' | 'overload';
  message: string;
  severity: 'warning' | 'error';
}

interface WeeklySchedule {
  crewMemberId: string;
  crewMemberName: string;
  jobs: Job[];
  conflicts: ScheduleConflict[];
  utilization: number;
}

export function CrewSchedule() {
  const { user: _user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCrew, setFilterCrew] = useState<string>('all');

  useEffect(() => {
    fetchCrewSchedule();
    fetchCrewMembers();
  }, [currentDate, viewMode]);

  const fetchCrewSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const startDate = getWeekStart(currentDate);

      const response = await fetch(getApiUrl(`crew-schedule/weekly/${formatDate(startDate)}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWeeklySchedule(data.schedule || []);
      } else {
        setError('Failed to fetch crew schedule');
      }
    } catch (err) {
      setError('Error fetching crew schedule');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrewMembers = async () => {
    try {
      // Mock data for now - replace with actual API call
      // const token = localStorage.getItem('access_token');
      setCrewMembers([
        { id: '1', name: 'John Smith', role: 'lead', status: 'available', rating: 4.8 },
        { id: '2', name: 'Mike Johnson', role: 'mover', status: 'available', rating: 4.5 },
        { id: '3', name: 'Tom Wilson', role: 'driver', status: 'busy', rating: 4.9 },
        { id: '4', name: 'Sarah Davis', role: 'specialist', status: 'available', rating: 4.7 },
        { id: '5', name: 'Chris Brown', role: 'mover', status: 'time_off', rating: 4.6 },
      ]);
    } catch (err) {
      console.error('Error fetching crew members:', err);
    }
  };

  const handleAutoAssign = async (jobId: string) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl(`crew-schedule/auto-assign/${jobId}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully assigned: ${result.assignments.map((a: any) => a.crewMemberName).join(', ')}`);
        fetchCrewSchedule();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to auto-assign crew');
      }
    } catch (err) {
      setError('Error auto-assigning crew');
      console.error('Error:', err);
    }
  };

  const handleDragStart = (job: Job) => {
    setDraggedJob(job);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (crewMemberId: string, e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedJob) return;

    try {
      const token = localStorage.getItem('access_token');

      // Check for conflicts first
      const conflictResponse = await fetch(getApiUrl(`crew-schedule/conflicts/${draggedJob.id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (conflictResponse.ok) {
        const conflicts = await conflictResponse.json();

        if (conflicts.length > 0 && conflicts.some((c: ScheduleConflict) => c.severity === 'error')) {
          alert('Cannot assign: ' + conflicts.map((c: ScheduleConflict) => c.message).join(', '));
          setDraggedJob(null);
          return;
        }
      }

      // Assign crew to job
      const response = await fetch(getApiUrl(`jobs/${draggedJob.id}/crew`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crewMemberId,
          role: 'mover', // Default role, can be changed
          status: 'assigned',
        }),
      });

      if (response.ok) {
        fetchCrewSchedule();
      } else {
        setError('Failed to assign crew');
      }
    } catch (err) {
      setError('Error assigning crew');
      console.error('Error:', err);
    } finally {
      setDraggedJob(null);
    }
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getWeekDates = (): Date[] => {
    const weekStart = getWeekStart(currentDate);
    const dates: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      scheduled: '#3b82f6',
      in_progress: '#f59e0b',
      completed: '#10b981',
      cancelled: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const getRoleIcon = (role: string): string => {
    const icons: Record<string, string> = {
      lead: '👷‍♂️',
      mover: '👷',
      driver: '🚛',
      specialist: '⭐',
    };
    return icons[role] || '👷';
  };

  const filteredSchedule = weeklySchedule.filter(schedule => {
    if (filterCrew !== 'all' && schedule.crewMemberId !== filterCrew) return false;

    if (filterStatus !== 'all') {
      return schedule.jobs.some(job => job.status === filterStatus);
    }

    return true;
  });

  const totalCrew = crewMembers.length;
  const activeJobs = weeklySchedule.reduce((sum, s) => sum + s.jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length, 0);
  const avgUtilization = weeklySchedule.length > 0
    ? (weeklySchedule.reduce((sum, s) => sum + s.utilization, 0) / weeklySchedule.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading crew schedule...</p>
      </div>
    );
  }

  return (
    <div className={styles.crewSchedule}>
      <div className={styles.header}>
        <div>
          <h2>Crew Schedule</h2>
          <p className={styles.subtitle}>Manage crew assignments and scheduling</p>
        </div>

        <div className={styles.headerActions}>
          <button onClick={goToToday} className={styles.todayButton}>
            Today
          </button>
          <div className={styles.viewToggle}>
            <button
              className={viewMode === 'week' ? styles.active : ''}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={viewMode === 'month' ? styles.active : ''}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Crew</div>
          <div className={styles.statValue}>{totalCrew}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Jobs</div>
          <div className={styles.statValue}>{activeJobs}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Utilization</div>
          <div className={styles.statValue}>{avgUtilization}%</div>
        </div>
      </div>

      <div className={styles.filters}>
        <select
          value={filterCrew}
          onChange={(e) => setFilterCrew(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Crew Members</option>
          {crewMembers.map(crew => (
            <option key={crew.id} value={crew.id}>
              {getRoleIcon(crew.role)} {crew.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className={styles.navigation}>
        <button onClick={() => navigateWeek('prev')} className={styles.navButton}>
          ← Previous Week
        </button>
        <h3 className={styles.weekTitle}>
          Week of {formatDate(getWeekStart(currentDate))}
        </h3>
        <button onClick={() => navigateWeek('next')} className={styles.navButton}>
          Next Week →
        </button>
      </div>

      <div className={styles.scheduleContainer}>
        <div className={styles.timeGrid}>
          <div className={styles.crewColumn}>
            <div className={styles.columnHeader}>Crew Member</div>
          </div>

          {getWeekDates().map((date, index) => (
            <div key={index} className={styles.dayColumn}>
              <div className={styles.columnHeader}>
                <div className={styles.dayName}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={styles.dayDate}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSchedule.map((schedule) => {
          const crewMember = crewMembers.find(c => c.id === schedule.crewMemberId);

          return (
            <div
              key={schedule.crewMemberId}
              className={styles.crewRow}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(schedule.crewMemberId, e)}
            >
              <div className={styles.crewInfo}>
                <div className={styles.crewName}>
                  {getRoleIcon(crewMember?.role || 'mover')} {schedule.crewMemberName}
                </div>
                <div className={styles.crewStats}>
                  <span className={styles.utilization}>
                    {schedule.utilization}% utilized
                  </span>
                  {schedule.conflicts.length > 0 && (
                    <span className={styles.conflictBadge}>
                      ⚠️ {schedule.conflicts.length} conflict{schedule.conflicts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {getWeekDates().map((date, dayIndex) => {
                const dayJobs = schedule.jobs.filter(job =>
                  new Date(job.scheduledDate).toDateString() === date.toDateString()
                );

                return (
                  <div key={dayIndex} className={styles.dayCell}>
                    {dayJobs.map(job => (
                      <div
                        key={job.id}
                        className={styles.jobCard}
                        style={{ borderLeft: `4px solid ${getStatusColor(job.status)}` }}
                        draggable
                        onDragStart={() => handleDragStart(job)}
                        onClick={() => setSelectedJob(job)}
                      >
                        <div className={styles.jobNumber}>{job.jobNumber}</div>
                        <div className={styles.jobTitle}>{job.title}</div>
                        <div className={styles.jobTime}>
                          {job.scheduledStartTime} - {job.scheduledEndTime}
                        </div>
                        <div className={styles.jobLocation}>
                          {job.pickupAddress.city} → {job.deliveryAddress.city}
                        </div>
                      </div>
                    ))}

                    {dayJobs.length === 0 && (
                      <div className={styles.emptyCell}>
                        Drop job here
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {filteredSchedule.length === 0 && (
          <div className={styles.emptyState}>
            <p>No crew schedule data available</p>
            <p className={styles.emptyHint}>Try adjusting your filters or check back later</p>
          </div>
        )}
      </div>

      {selectedJob && (
        <div className={styles.modal} onClick={() => setSelectedJob(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Job Details - {selectedJob.jobNumber}</h3>
              <button onClick={() => setSelectedJob(null)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.jobDetail}>
                <strong>Title:</strong> {selectedJob.title}
              </div>
              <div className={styles.jobDetail}>
                <strong>Type:</strong> {selectedJob.type.replace('_', ' ')}
              </div>
              <div className={styles.jobDetail}>
                <strong>Status:</strong>
                <span
                  className={styles.statusBadge}
                  style={{ background: getStatusColor(selectedJob.status) }}
                >
                  {selectedJob.status}
                </span>
              </div>
              <div className={styles.jobDetail}>
                <strong>Schedule:</strong> {selectedJob.scheduledDate} | {selectedJob.scheduledStartTime} - {selectedJob.scheduledEndTime}
              </div>
              <div className={styles.jobDetail}>
                <strong>Pickup:</strong> {selectedJob.pickupAddress.city}, {selectedJob.pickupAddress.state}
              </div>
              <div className={styles.jobDetail}>
                <strong>Delivery:</strong> {selectedJob.deliveryAddress.city}, {selectedJob.deliveryAddress.state}
              </div>
              <div className={styles.jobDetail}>
                <strong>Estimated Cost:</strong> ${selectedJob.estimatedCost.toFixed(2)}
              </div>
              <div className={styles.jobDetail}>
                <strong>Assigned Crew:</strong>
                <div className={styles.crewList}>
                  {selectedJob.assignedCrew.map((crew, idx) => (
                    <span key={idx} className={styles.crewBadge}>
                      {getRoleIcon(crew.role)} {crew.role} - {crew.status}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => handleAutoAssign(selectedJob.id)}
                className={styles.primaryButton}
              >
                Auto-Assign Crew
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className={styles.secondaryButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
