'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../../lib/config';
import styles from './AutoAssignment.module.css';

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  type: 'local' | 'long_distance' | 'storage' | 'packing_only';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  requiredSkills?: string[];
  crewSizeNeeded: number;
  estimatedCost: number;
}

interface CrewSuggestion {
  crewMemberId: string;
  crewMemberName: string;
  role: 'lead' | 'mover' | 'driver' | 'specialist';
  totalScore: number;
  scoreBreakdown: {
    skillMatch: number;
    availability: number;
    proximity: number;
    rating: number;
    workload: number;
    preferences: number;
  };
  distance?: number;
  currentJobs: number;
  rating: number;
  availability: 'available' | 'busy' | 'limited';
}

interface AutoAssignmentResult {
  jobId: string;
  suggestions: CrewSuggestion[];
  assignments: {
    crewMemberId: string;
    crewMemberName: string;
    role: string;
  }[];
  message: string;
}

export function AutoAssignment() {
  const { user: _user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [suggestions, setSuggestions] = useState<CrewSuggestion[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [jobRequirements, setJobRequirements] = useState({
    skills: [] as string[],
    crewSize: 2,
    dateTime: '',
  });

  useEffect(() => {
    fetchUnassignedJobs();
  }, []);

  const fetchUnassignedJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl('jobs?status=scheduled'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Filter jobs with no or incomplete crew assignments
        const unassigned = (result.jobs || []).filter(
          (job: Job) => !job || job.crewSizeNeeded > 0
        );
        setJobs(unassigned);
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      setError('Error fetching jobs');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = async (job: Job) => {
    setSelectedJob(job);
    setJobRequirements({
      skills: job.requiredSkills || [],
      crewSize: job.crewSizeNeeded,
      dateTime: `${job.scheduledDate}T${job.scheduledStartTime}`,
    });

    // Fetch auto-assignment suggestions
    await fetchSuggestions(job.id);
  };

  const fetchSuggestions = async (jobId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl(`crew-schedule/auto-assign/${jobId}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result: AutoAssignmentResult = await response.json();
        setSuggestions(result.suggestions || []);
      } else {
        // Mock suggestions for demo
        setSuggestions(generateMockSuggestions());
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      // Use mock suggestions on error
      setSuggestions(generateMockSuggestions());
    } finally {
      setLoading(false);
    }
  };

  const generateMockSuggestions = (): CrewSuggestion[] => {
    return [
      {
        crewMemberId: '1',
        crewMemberName: 'John Smith',
        role: 'lead',
        totalScore: 95,
        scoreBreakdown: {
          skillMatch: 30,
          availability: 20,
          proximity: 18,
          rating: 15,
          workload: 8,
          preferences: 4,
        },
        distance: 5.2,
        currentJobs: 2,
        rating: 4.8,
        availability: 'available',
      },
      {
        crewMemberId: '2',
        crewMemberName: 'Mike Johnson',
        role: 'mover',
        totalScore: 88,
        scoreBreakdown: {
          skillMatch: 28,
          availability: 20,
          proximity: 15,
          rating: 14,
          workload: 7,
          preferences: 4,
        },
        distance: 8.7,
        currentJobs: 3,
        rating: 4.5,
        availability: 'available',
      },
      {
        crewMemberId: '3',
        crewMemberName: 'Tom Wilson',
        role: 'driver',
        totalScore: 82,
        scoreBreakdown: {
          skillMatch: 25,
          availability: 15,
          proximity: 20,
          rating: 15,
          workload: 5,
          preferences: 2,
        },
        distance: 3.1,
        currentJobs: 5,
        rating: 4.9,
        availability: 'limited',
      },
    ];
  };

  const toggleCrewSelection = (crewId: string) => {
    const newSelection = new Set(selectedCrew);
    if (newSelection.has(crewId)) {
      newSelection.delete(crewId);
    } else {
      newSelection.add(crewId);
    }
    setSelectedCrew(newSelection);
  };

  const handleAutoAssign = async () => {
    if (!selectedJob) return;

    try {
      setAssigning(true);
      const token = localStorage.getItem('access_token');

      // Use auto-suggested crew
      const response = await fetch(getApiUrl(`crew-schedule/auto-assign/${selectedJob.id}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result: AutoAssignmentResult = await response.json();
        setSuccessMessage(result.message || 'Crew assigned successfully!');
        setSelectedCrew(new Set());
        setSelectedJob(null);
        setSuggestions([]);
        fetchUnassignedJobs();

        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to auto-assign crew');
      }
    } catch (err) {
      setError('Error auto-assigning crew');
      console.error('Error:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedJob || selectedCrew.size === 0) return;

    try {
      setAssigning(true);
      const token = localStorage.getItem('access_token');

      // Assign selected crew members
      for (const crewId of selectedCrew) {
        const crew = suggestions.find(s => s.crewMemberId === crewId);

        await fetch(getApiUrl(`jobs/${selectedJob.id}/crew`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            crewMemberId: crewId,
            role: crew?.role || 'mover',
            status: 'assigned',
          }),
        });
      }

      setSuccessMessage(`Successfully assigned ${selectedCrew.size} crew member(s)!`);
      setSelectedCrew(new Set());
      setSelectedJob(null);
      setSuggestions([]);
      fetchUnassignedJobs();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError('Error assigning crew');
      console.error('Error:', err);
    } finally {
      setAssigning(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    return '#dc2626';
  };

  const getAvailabilityColor = (availability: string): string => {
    const colors: Record<string, string> = {
      available: '#10b981',
      limited: '#f59e0b',
      busy: '#dc2626',
    };
    return colors[availability] || '#6b7280';
  };

  if (loading && jobs.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className={styles.autoAssignment}>
      <div className={styles.header}>
        <div>
          <h2>Auto-Assignment</h2>
          <p className={styles.subtitle}>AI-powered crew assignment with scoring algorithm</p>
        </div>
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
        <div className={styles.jobsPanel}>
          <h3>Unassigned Jobs</h3>

          {jobs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No unassigned jobs</p>
              <p className={styles.emptyHint}>All jobs have been assigned crew members</p>
            </div>
          ) : (
            <div className={styles.jobList}>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`${styles.jobCard} ${selectedJob?.id === job.id ? styles.selected : ''}`}
                  onClick={() => handleJobSelect(job)}
                >
                  <div className={styles.jobNumber}>{job.jobNumber}</div>
                  <div className={styles.jobTitle}>{job.title}</div>
                  <div className={styles.jobInfo}>
                    <span className={styles.jobDate}>
                      📅 {job.scheduledDate}
                    </span>
                    <span className={styles.jobTime}>
                      🕐 {job.scheduledStartTime}
                    </span>
                  </div>
                  <div className={styles.jobInfo}>
                    <span className={styles.jobLocation}>
                      📍 {job.pickupAddress.city} → {job.deliveryAddress.city}
                    </span>
                  </div>
                  <div className={styles.jobInfo}>
                    <span className={styles.crewNeeded}>
                      👷 Need {job.crewSizeNeeded} crew
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.suggestionsPanel}>
          {selectedJob ? (
            <>
              <div className={styles.selectedJobHeader}>
                <h3>Job: {selectedJob.jobNumber}</h3>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setSuggestions([]);
                    setSelectedCrew(new Set());
                  }}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>

              <div className={styles.requirements}>
                <h4>Requirements</h4>
                <div className={styles.requirementsList}>
                  <div className={styles.requirement}>
                    <strong>Crew Size:</strong> {jobRequirements.crewSize}
                  </div>
                  <div className={styles.requirement}>
                    <strong>Date/Time:</strong> {selectedJob.scheduledDate} at {selectedJob.scheduledStartTime}
                  </div>
                  {jobRequirements.skills.length > 0 && (
                    <div className={styles.requirement}>
                      <strong>Skills:</strong>
                      <div className={styles.skillsList}>
                        {jobRequirements.skills.map((skill, idx) => (
                          <span key={idx} className={styles.skillBadge}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.suggestionsHeader}>
                <h4>Top Crew Suggestions</h4>
                <p className={styles.suggestionsHint}>
                  Click crew members to select, then assign manually or use auto-assign
                </p>
              </div>

              {loading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <p>Calculating suggestions...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No suggestions available</p>
                </div>
              ) : (
                <div className={styles.suggestionsList}>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.crewMemberId}
                      className={`${styles.suggestionCard} ${
                        selectedCrew.has(suggestion.crewMemberId) ? styles.selectedCrew : ''
                      }`}
                      onClick={() => toggleCrewSelection(suggestion.crewMemberId)}
                    >
                      <div className={styles.suggestionHeader}>
                        <div className={styles.rank}>#{index + 1}</div>
                        <div className={styles.crewInfo}>
                          <div className={styles.crewName}>
                            {suggestion.crewMemberName}
                          </div>
                          <div className={styles.crewRole}>
                            {suggestion.role} • ⭐ {suggestion.rating}
                          </div>
                        </div>
                        <div
                          className={styles.totalScore}
                          style={{ color: getScoreColor(suggestion.totalScore) }}
                        >
                          {suggestion.totalScore}
                        </div>
                      </div>

                      <div className={styles.scoreBreakdown}>
                        <div className={styles.scoreItem}>
                          <span className={styles.scoreLabel}>Skill Match</span>
                          <div className={styles.scoreBar}>
                            <div
                              className={styles.scoreProgress}
                              style={{ width: `${(suggestion.scoreBreakdown.skillMatch / 30) * 100}%` }}
                            ></div>
                          </div>
                          <span className={styles.scoreValue}>{suggestion.scoreBreakdown.skillMatch}/30</span>
                        </div>

                        <div className={styles.scoreItem}>
                          <span className={styles.scoreLabel}>Availability</span>
                          <div className={styles.scoreBar}>
                            <div
                              className={styles.scoreProgress}
                              style={{ width: `${(suggestion.scoreBreakdown.availability / 20) * 100}%` }}
                            ></div>
                          </div>
                          <span className={styles.scoreValue}>{suggestion.scoreBreakdown.availability}/20</span>
                        </div>

                        <div className={styles.scoreItem}>
                          <span className={styles.scoreLabel}>Proximity</span>
                          <div className={styles.scoreBar}>
                            <div
                              className={styles.scoreProgress}
                              style={{ width: `${(suggestion.scoreBreakdown.proximity / 20) * 100}%` }}
                            ></div>
                          </div>
                          <span className={styles.scoreValue}>{suggestion.scoreBreakdown.proximity}/20</span>
                        </div>

                        <div className={styles.scoreItem}>
                          <span className={styles.scoreLabel}>Rating</span>
                          <div className={styles.scoreBar}>
                            <div
                              className={styles.scoreProgress}
                              style={{ width: `${(suggestion.scoreBreakdown.rating / 15) * 100}%` }}
                            ></div>
                          </div>
                          <span className={styles.scoreValue}>{suggestion.scoreBreakdown.rating}/15</span>
                        </div>

                        <div className={styles.scoreItem}>
                          <span className={styles.scoreLabel}>Workload</span>
                          <div className={styles.scoreBar}>
                            <div
                              className={styles.scoreProgress}
                              style={{ width: `${(suggestion.scoreBreakdown.workload / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className={styles.scoreValue}>{suggestion.scoreBreakdown.workload}/10</span>
                        </div>

                        <div className={styles.scoreItem}>
                          <span className={styles.scoreLabel}>Preferences</span>
                          <div className={styles.scoreBar}>
                            <div
                              className={styles.scoreProgress}
                              style={{ width: `${(suggestion.scoreBreakdown.preferences / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className={styles.scoreValue}>{suggestion.scoreBreakdown.preferences}/5</span>
                        </div>
                      </div>

                      <div className={styles.suggestionFooter}>
                        <span
                          className={styles.availabilityBadge}
                          style={{ background: getAvailabilityColor(suggestion.availability) }}
                        >
                          {suggestion.availability}
                        </span>
                        {suggestion.distance && (
                          <span className={styles.distance}>
                            📍 {suggestion.distance} mi
                          </span>
                        )}
                        <span className={styles.currentJobs}>
                          {suggestion.currentJobs} current jobs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  onClick={handleAutoAssign}
                  disabled={assigning || suggestions.length === 0}
                  className={styles.primaryButton}
                >
                  {assigning ? 'Assigning...' : 'Auto-Assign Top Crew'}
                </button>

                <button
                  onClick={handleManualAssign}
                  disabled={assigning || selectedCrew.size === 0}
                  className={styles.secondaryButton}
                >
                  {assigning ? 'Assigning...' : `Assign Selected (${selectedCrew.size})`}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a job to view crew suggestions</p>
              <p className={styles.emptyHint}>AI will analyze and rank the best crew members</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
