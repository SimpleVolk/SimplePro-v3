'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '@/lib/config';
import styles from './CalendarDispatch.module.css';

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  type: 'local' | 'long_distance' | 'storage' | 'packing_only';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customerId: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  estimatedDuration: number;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  assignedCrew: CrewAssignment[];
  estimatedCost: number;
  specialInstructions?: string;
}

interface CrewAssignment {
  crewMemberId: string;
  role: 'lead' | 'mover' | 'driver' | 'specialist';
  status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out' | 'absent';
}

interface CalendarDay {
  date: Date;
  jobs: Job[];
  isToday: boolean;
  isCurrentMonth: boolean;
}


export function CalendarDispatch() {
  const { user: _user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');

  useEffect(() => {
    fetchJobs();
  }, [currentDate, viewMode]);

  useEffect(() => {
    generateCalendarData();
  }, [jobs, currentDate]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      let url = getApiUrl('jobs');

      if (viewMode === 'week') {
        const startDate = getWeekStart(currentDate);
        url = getApiUrl(`jobs/calendar/week/${formatDate(startDate)}`);
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setJobs(result.jobs || result.weekSchedule || []);
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      setError('Error fetching jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarData = () => {
    const today = new Date();
    const calendarDays: CalendarDay[] = [];

    if (viewMode === 'month') {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startDate = getWeekStart(firstDayOfMonth);
      const endDate = getWeekEnd(lastDayOfMonth);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayJobs = jobs.filter(job =>
          new Date(job.scheduledDate).toDateString() === date.toDateString()
        );

        calendarDays.push({
          date: new Date(date),
          jobs: dayJobs,
          isToday: date.toDateString() === today.toDateString(),
          isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        });
      }
    } else if (viewMode === 'week') {
      const startDate = getWeekStart(currentDate);

      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dayJobs = jobs.filter(job =>
          new Date(job.scheduledDate).toDateString() === date.toDateString()
        );

        calendarDays.push({
          date: new Date(date),
          jobs: dayJobs,
          isToday: date.toDateString() === today.toDateString(),
          isCurrentMonth: true,
        });
      }
    } else {
      // Day view
      const dayJobs = jobs.filter(job =>
        new Date(job.scheduledDate).toDateString() === currentDate.toDateString()
      );

      calendarDays.push({
        date: new Date(currentDate),
        jobs: dayJobs,
        isToday: currentDate.toDateString() === today.toDateString(),
        isCurrentMonth: true,
      });
    }

    setCalendarData(calendarDays);
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 6;
    return new Date(d.setDate(diff));
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'on_hold': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return '#10b981';
      case 'normal': return '#3b82f6';
      case 'high': return '#f59e0b';
      case 'urgent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getCalendarTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = getWeekStart(currentDate);
      const end = getWeekEnd(currentDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className={styles.calendarDispatch}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Dispatch Calendar</h2>
          <div className={styles.viewModeSelector}>
            <button
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? styles.active : ''}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? styles.active : ''}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={viewMode === 'day' ? styles.active : ''}
            >
              Day
            </button>
          </div>
        </div>

        <div className={styles.headerCenter}>
          <button onClick={() => navigateDate('prev')} className={styles.navButton}>
            ◀
          </button>
          <h3 className={styles.calendarTitle}>{getCalendarTitle()}</h3>
          <button onClick={() => navigateDate('next')} className={styles.navButton}>
            ▶
          </button>
        </div>

        <div className={styles.headerRight}>
          <button onClick={goToToday} className={styles.todayButton}>
            Today
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className={styles.calendarContainer}>
        {viewMode === 'month' && (
          <div className={styles.monthView}>
            <div className={styles.weekHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className={styles.dayHeader}>{day}</div>
              ))}
            </div>
            <div className={styles.monthGrid}>
              {calendarData.map((day, index) => (
                <div
                  key={index}
                  className={`${styles.dayCell} ${day.isToday ? styles.today : ''} ${!day.isCurrentMonth ? styles.otherMonth : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className={styles.dayNumber}>{day.date.getDate()}</div>
                  <div className={styles.dayJobs}>
                    {day.jobs.slice(0, 3).map(job => (
                      <div
                        key={job.id}
                        className={styles.jobItem}
                        style={{ backgroundColor: getStatusColor(job.status) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                      >
                        <span className={styles.jobTime}>{formatTime(job.scheduledStartTime)}</span>
                        <span className={styles.jobTitle}>{job.title}</span>
                      </div>
                    ))}
                    {day.jobs.length > 3 && (
                      <div className={styles.moreJobs}>+{day.jobs.length - 3} more</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className={styles.weekView}>
            <div className={styles.timeColumn}>
              {Array.from({ length: 12 }, (_, i) => {
                const hour = 6 + i;
                return (
                  <div key={hour} className={styles.timeSlot}>
                    {hour}:00
                  </div>
                );
              })}
            </div>
            <div className={styles.weekGrid}>
              {calendarData.map((day, index) => (
                <div key={index} className={styles.dayColumn}>
                  <div className={styles.dayHeader}>
                    <div className={styles.dayName}>
                      {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`${styles.dayNumber} ${day.isToday ? styles.today : ''}`}>
                      {day.date.getDate()}
                    </div>
                  </div>
                  <div className={styles.dayContent}>
                    {day.jobs.map(job => {
                      const startHour = parseInt(job.scheduledStartTime.split(':')[0]);
                      const startMinute = parseInt(job.scheduledStartTime.split(':')[1]);
                      const top = ((startHour - 6) * 60 + startMinute) * (60 / 60); // 60px per hour
                      const height = job.estimatedDuration * 60; // 60px per hour

                      return (
                        <div
                          key={job.id}
                          className={styles.weekJobItem}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: getStatusColor(job.status),
                          }}
                          onClick={() => setSelectedJob(job)}
                        >
                          <div className={styles.jobInfo}>
                            <div className={styles.jobNumber}>{job.jobNumber}</div>
                            <div className={styles.jobTitle}>{job.title}</div>
                            <div className={styles.jobTime}>
                              {formatTime(job.scheduledStartTime)} - {formatTime(job.scheduledEndTime)}
                            </div>
                            {job.assignedCrew.length > 0 && (
                              <div className={styles.crewCount}>
                                👥 {job.assignedCrew.length}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className={styles.dayView}>
            <div className={styles.dayHeader}>
              <h3>{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            </div>
            <div className={styles.dayJobs}>
              {calendarData[0]?.jobs.map(job => (
                <div
                  key={job.id}
                  className={styles.dayJobCard}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className={styles.jobHeader}>
                    <div className={styles.jobIdentifier}>
                      <h4>{job.jobNumber}</h4>
                      <p>{job.title}</p>
                    </div>
                    <div className={styles.jobBadges}>
                      <span
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(job.status) }}
                      >
                        {job.status}
                      </span>
                      <span
                        className={styles.priorityBadge}
                        style={{ backgroundColor: getPriorityColor(job.priority) }}
                      >
                        {job.priority}
                      </span>
                    </div>
                  </div>
                  <div className={styles.jobDetails}>
                    <p><strong>Time:</strong> {formatTime(job.scheduledStartTime)} - {formatTime(job.scheduledEndTime)}</p>
                    <p><strong>Duration:</strong> {job.estimatedDuration} hours</p>
                    <p><strong>Pickup:</strong> {job.pickupAddress.street}, {job.pickupAddress.city}</p>
                    <p><strong>Delivery:</strong> {job.deliveryAddress.street}, {job.deliveryAddress.city}</p>
                    {job.assignedCrew.length > 0 && (
                      <p><strong>Crew:</strong> {job.assignedCrew.length} members assigned</p>
                    )}
                  </div>
                </div>
              ))}
              {calendarData[0]?.jobs.length === 0 && (
                <div className={styles.emptyDay}>
                  <p>No jobs scheduled for this day.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedJob && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Job Details - {selectedJob.jobNumber}</h3>
              <button onClick={() => setSelectedJob(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.jobDetailSection}>
                <h4>Basic Information</h4>
                <p><strong>Title:</strong> {selectedJob.title}</p>
                <p><strong>Type:</strong> {selectedJob.type.replace('_', ' ')}</p>
                <p><strong>Status:</strong> <span style={{ color: getStatusColor(selectedJob.status) }}>{selectedJob.status}</span></p>
                <p><strong>Priority:</strong> <span style={{ color: getPriorityColor(selectedJob.priority) }}>{selectedJob.priority}</span></p>
                <p><strong>Customer ID:</strong> {selectedJob.customerId}</p>
                <p><strong>Estimated Cost:</strong> ${selectedJob.estimatedCost.toLocaleString()}</p>
              </div>

              <div className={styles.jobDetailSection}>
                <h4>Schedule</h4>
                <p><strong>Date:</strong> {new Date(selectedJob.scheduledDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {formatTime(selectedJob.scheduledStartTime)} - {formatTime(selectedJob.scheduledEndTime)}</p>
                <p><strong>Duration:</strong> {selectedJob.estimatedDuration} hours</p>
              </div>

              <div className={styles.jobDetailSection}>
                <h4>Locations</h4>
                <div className={styles.addressGrid}>
                  <div>
                    <h5>Pickup Address</h5>
                    <p>{selectedJob.pickupAddress.street}</p>
                    <p>{selectedJob.pickupAddress.city}, {selectedJob.pickupAddress.state} {selectedJob.pickupAddress.zipCode}</p>
                    {selectedJob.pickupAddress.contactPerson && (
                      <p><strong>Contact:</strong> {selectedJob.pickupAddress.contactPerson} - {selectedJob.pickupAddress.contactPhone}</p>
                    )}
                  </div>
                  <div>
                    <h5>Delivery Address</h5>
                    <p>{selectedJob.deliveryAddress.street}</p>
                    <p>{selectedJob.deliveryAddress.city}, {selectedJob.deliveryAddress.state} {selectedJob.deliveryAddress.zipCode}</p>
                    {selectedJob.deliveryAddress.contactPerson && (
                      <p><strong>Contact:</strong> {selectedJob.deliveryAddress.contactPerson} - {selectedJob.deliveryAddress.contactPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedJob.assignedCrew.length > 0 && (
                <div className={styles.jobDetailSection}>
                  <h4>Assigned Crew</h4>
                  <div className={styles.crewList}>
                    {selectedJob.assignedCrew.map((crew, index) => (
                      <div key={index} className={styles.crewMember}>
                        <span className={styles.crewRole}>{crew.role}</span>
                        <span className={styles.crewStatus} style={{
                          color: crew.status === 'confirmed' ? '#10b981' :
                                crew.status === 'checked_in' ? '#3b82f6' : '#6b7280'
                        }}>
                          {crew.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.specialInstructions && (
                <div className={styles.jobDetailSection}>
                  <h4>Special Instructions</h4>
                  <p>{selectedJob.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}