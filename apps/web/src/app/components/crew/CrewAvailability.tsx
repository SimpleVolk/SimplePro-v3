'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '@/lib/config';
import styles from './CrewAvailability.module.css';

interface TimeSlot {
  startTime: string;
  endTime: string;
  status: 'available' | 'busy' | 'time_off';
}

interface DayAvailability {
  date: string;
  dayOfWeek: string;
  slots: TimeSlot[];
}

interface CrewAvailability {
  crewMemberId: string;
  crewMemberName: string;
  availability: DayAvailability[];
}

interface TimeOffRequest {
  id: string;
  crewMemberId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
}

interface RecurringPattern {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: 'available' | 'busy';
}

export function CrewAvailability() {
  const { user: _user } = useAuth();
  const [selectedCrew, setSelectedCrew] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [availability, setAvailability] = useState<CrewAvailability | null>(null);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [_selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  useEffect(() => {
    if (selectedCrew) {
      fetchAvailability();
      fetchTimeOffRequests();
    }
  }, [selectedCrew, currentWeek]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl(`crew-schedule/availability/${selectedCrew}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      } else {
        setError('Failed to fetch availability');
      }
    } catch (err) {
      setError('Error fetching availability');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeOffRequests = async () => {
    try {
      // Mock data for now - replace with actual API call
      // const token = localStorage.getItem('access_token');
      setTimeOffRequests([
        {
          id: '1',
          crewMemberId: selectedCrew,
          startDate: '2025-10-10',
          endDate: '2025-10-12',
          reason: 'Family vacation',
          status: 'approved',
          requestedAt: '2025-09-15T10:00:00Z',
        },
        {
          id: '2',
          crewMemberId: selectedCrew,
          startDate: '2025-10-20',
          endDate: '2025-10-20',
          reason: 'Medical appointment',
          status: 'pending',
          requestedAt: '2025-09-28T14:30:00Z',
        },
      ]);
    } catch (err) {
      console.error('Error fetching time-off requests:', err);
    }
  };

  const handleSlotClick = (date: string, time: string, currentStatus: string) => {
    setSelectedSlot({ date, time });

    const newStatus = currentStatus === 'available' ? 'busy' : 'available';
    updateAvailability(date, time, newStatus);
  };

  const updateAvailability = async (date: string, time: string, status: string) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl('crew-schedule/availability'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crewMemberId: selectedCrew,
          date,
          startTime: time,
          endTime: addHour(time),
          status,
        }),
      });

      if (response.ok) {
        fetchAvailability();
      } else {
        setError('Failed to update availability');
      }
    } catch (err) {
      setError('Error updating availability');
      console.error('Error:', err);
    }
  };

  const submitTimeOffRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl('crew-schedule/time-off'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crewMemberId: selectedCrew,
          startDate: formData.get('startDate'),
          endDate: formData.get('endDate'),
          reason: formData.get('reason'),
        }),
      });

      if (response.ok) {
        setShowTimeOffModal(false);
        fetchTimeOffRequests();
        fetchAvailability();
        alert('Time-off request submitted successfully');
      } else {
        setError('Failed to submit time-off request');
      }
    } catch (err) {
      setError('Error submitting time-off request');
      console.error('Error:', err);
    }
  };

  const submitRecurringPattern = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    try {
      // const token = localStorage.getItem('access_token');

      const pattern: RecurringPattern = {
        dayOfWeek: parseInt(formData.get('dayOfWeek') as string),
        startTime: formData.get('startTime') as string,
        endTime: formData.get('endTime') as string,
        status: formData.get('status') as 'available' | 'busy',
      };

      // Apply pattern to all matching days in the current view
      const weekDates = getWeekDates();
      for (const date of weekDates) {
        if (date.getDay() === pattern.dayOfWeek) {
          await updateAvailability(
            formatDate(date),
            pattern.startTime,
            pattern.status
          );
        }
      }

      setShowRecurringModal(false);
      alert('Recurring pattern applied successfully');
    } catch (err) {
      setError('Error applying recurring pattern');
      console.error('Error:', err);
    }
  };

  const getWeekDates = (): Date[] => {
    const weekStart = getWeekStart(currentWeek);
    const dates: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }

    return dates;
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

  const addHour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const getSlotStatus = (date: string, time: string): string => {
    if (!availability) return 'available';

    const dayAvailability = availability.availability.find(a => a.date === date);
    if (!dayAvailability) return 'available';

    const slot = dayAvailability.slots.find(s => s.startTime === time);
    return slot ? slot.status : 'available';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      available: '#10b981',
      busy: '#dc2626',
      time_off: '#f59e0b',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      available: 'Available',
      busy: 'Busy',
      time_off: 'Time Off',
    };
    return labels[status] || status;
  };

  return (
    <div className={styles.crewAvailability}>
      <div className={styles.header}>
        <div>
          <h2>Crew Availability</h2>
          <p className={styles.subtitle}>Manage crew member availability and time-off requests</p>
        </div>

        <div className={styles.headerActions}>
          <button onClick={() => setShowRecurringModal(true)} className={styles.actionButton}>
            Set Recurring Pattern
          </button>
          <button onClick={() => setShowTimeOffModal(true)} className={styles.primaryButton}>
            Request Time Off
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className={styles.crewSelector}>
        <label htmlFor="crewSelect">Select Crew Member:</label>
        <select
          id="crewSelect"
          value={selectedCrew}
          onChange={(e) => setSelectedCrew(e.target.value)}
          className={styles.select}
        >
          <option value="">-- Select Crew Member --</option>
          <option value="1">👷‍♂️ John Smith (Lead)</option>
          <option value="2">👷 Mike Johnson (Mover)</option>
          <option value="3">🚛 Tom Wilson (Driver)</option>
          <option value="4">⭐ Sarah Davis (Specialist)</option>
        </select>
      </div>

      {selectedCrew && (
        <>
          <div className={styles.navigation}>
            <button onClick={() => navigateWeek('prev')} className={styles.navButton}>
              ← Previous Week
            </button>
            <h3 className={styles.weekTitle}>
              Week of {formatDate(getWeekStart(currentWeek))}
            </h3>
            <button onClick={() => navigateWeek('next')} className={styles.navButton}>
              Next Week →
            </button>
          </div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: '#10b981' }}></div>
              <span>Available</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: '#dc2626' }}></div>
              <span>Busy</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: '#f59e0b' }}></div>
              <span>Time Off</span>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading availability...</p>
            </div>
          ) : (
            <div className={styles.calendarContainer}>
              <div className={styles.timeColumn}>
                <div className={styles.timeHeader}>Time</div>
                {timeSlots.map((time) => (
                  <div key={time} className={styles.timeLabel}>
                    {time}
                  </div>
                ))}
              </div>

              {getWeekDates().map((date, dayIndex) => (
                <div key={dayIndex} className={styles.dayColumn}>
                  <div className={styles.dayHeader}>
                    <div className={styles.dayName}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={styles.dayDate}>
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {timeSlots.map((time) => {
                    const status = getSlotStatus(formatDate(date), time);

                    return (
                      <div
                        key={time}
                        className={styles.slot}
                        style={{ background: getStatusColor(status) }}
                        onClick={() => handleSlotClick(formatDate(date), time, status)}
                        title={`${time} - ${getStatusLabel(status)}`}
                      >
                        <span className={styles.slotStatus}>{getStatusLabel(status)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div className={styles.timeOffSection}>
            <h3>Time-Off Requests</h3>
            {timeOffRequests.length === 0 ? (
              <p className={styles.emptyState}>No time-off requests</p>
            ) : (
              <div className={styles.requestList}>
                {timeOffRequests.map((request) => (
                  <div key={request.id} className={styles.requestCard}>
                    <div className={styles.requestHeader}>
                      <span className={`${styles.statusBadge} ${styles[request.status]}`}>
                        {request.status}
                      </span>
                      <span className={styles.requestDate}>
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.requestBody}>
                      <p><strong>Dates:</strong> {request.startDate} to {request.endDate}</p>
                      <p><strong>Reason:</strong> {request.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showTimeOffModal && (
        <div className={styles.modal} onClick={() => setShowTimeOffModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Request Time Off</h3>
              <button onClick={() => setShowTimeOffModal(false)}>×</button>
            </div>

            <form onSubmit={submitTimeOffRequest}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label htmlFor="startDate">Start Date:</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="endDate">End Date:</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="reason">Reason:</label>
                  <textarea
                    id="reason"
                    name="reason"
                    rows={3}
                    required
                    className={styles.textarea}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.primaryButton}>
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimeOffModal(false)}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRecurringModal && (
        <div className={styles.modal} onClick={() => setShowRecurringModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Set Recurring Availability Pattern</h3>
              <button onClick={() => setShowRecurringModal(false)}>×</button>
            </div>

            <form onSubmit={submitRecurringPattern}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label htmlFor="dayOfWeek">Day of Week:</label>
                  <select
                    id="dayOfWeek"
                    name="dayOfWeek"
                    required
                    className={styles.select}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="startTime">Start Time:</label>
                  <select
                    id="startTime"
                    name="startTime"
                    required
                    className={styles.select}
                  >
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="endTime">End Time:</label>
                  <select
                    id="endTime"
                    name="endTime"
                    required
                    className={styles.select}
                  >
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="status">Status:</label>
                  <select
                    id="status"
                    name="status"
                    required
                    className={styles.select}
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.primaryButton}>
                  Apply Pattern
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
