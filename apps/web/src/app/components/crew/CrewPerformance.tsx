'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CrewPerformance.module.css';

interface CrewPerformance {
  crewMemberId: string;
  crewMemberName: string;
  role: 'lead' | 'mover' | 'driver' | 'specialist';
  rating: number;
  totalJobs: number;
  completedJobs: number;
  onTimeJobs: number;
  onTimeRate: number;
  averageJobDuration: number;
  customerFeedback: {
    positive: number;
    neutral: number;
    negative: number;
  };
  efficiency: number;
  monthlyTrend: number;
}

interface PerformanceMetrics {
  topPerformer: string;
  averageRating: number;
  totalJobsCompleted: number;
  overallOnTimeRate: number;
}

export function CrewPerformance() {
  const { user: _user } = useAuth();
  const [performances, setPerformances] = useState<CrewPerformance[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'jobs' | 'onTime'>('rating');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPerformance();
  }, [dateRange]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      // Mock data for now
      const mockData = generateMockData();
      setPerformances(mockData);
      setMetrics(calculateMetrics(mockData));
    } catch (err) {
      console.error('Error fetching performance:', err);
      const mockData = generateMockData();
      setPerformances(mockData);
      setMetrics(calculateMetrics(mockData));
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): CrewPerformance[] => {
    return [
      {
        crewMemberId: '1',
        crewMemberName: 'John Smith',
        role: 'lead',
        rating: 4.8,
        totalJobs: 45,
        completedJobs: 43,
        onTimeJobs: 41,
        onTimeRate: 95,
        averageJobDuration: 5.2,
        customerFeedback: { positive: 38, neutral: 4, negative: 1 },
        efficiency: 92,
        monthlyTrend: 5,
      },
      {
        crewMemberId: '2',
        crewMemberName: 'Tom Wilson',
        role: 'driver',
        rating: 4.9,
        totalJobs: 52,
        completedJobs: 51,
        onTimeJobs: 49,
        onTimeRate: 96,
        averageJobDuration: 4.8,
        customerFeedback: { positive: 45, neutral: 5, negative: 1 },
        efficiency: 95,
        monthlyTrend: 8,
      },
      {
        crewMemberId: '3',
        crewMemberName: 'Mike Johnson',
        role: 'mover',
        rating: 4.5,
        totalJobs: 38,
        completedJobs: 36,
        onTimeJobs: 32,
        onTimeRate: 89,
        averageJobDuration: 6.1,
        customerFeedback: { positive: 28, neutral: 6, negative: 2 },
        efficiency: 85,
        monthlyTrend: -2,
      },
      {
        crewMemberId: '4',
        crewMemberName: 'Sarah Davis',
        role: 'specialist',
        rating: 4.7,
        totalJobs: 28,
        completedJobs: 28,
        onTimeJobs: 26,
        onTimeRate: 93,
        averageJobDuration: 5.5,
        customerFeedback: { positive: 24, neutral: 3, negative: 1 },
        efficiency: 90,
        monthlyTrend: 3,
      },
      {
        crewMemberId: '5',
        crewMemberName: 'Chris Brown',
        role: 'mover',
        rating: 4.6,
        totalJobs: 41,
        completedJobs: 40,
        onTimeJobs: 37,
        onTimeRate: 93,
        averageJobDuration: 5.8,
        customerFeedback: { positive: 33, neutral: 5, negative: 2 },
        efficiency: 88,
        monthlyTrend: 1,
      },
    ];
  };

  const calculateMetrics = (data: CrewPerformance[]): PerformanceMetrics => {
    const sortedByRating = [...data].sort((a, b) => b.rating - a.rating);
    const totalRating = data.reduce((sum, p) => sum + p.rating, 0);
    const totalCompleted = data.reduce((sum, p) => sum + p.completedJobs, 0);
    const totalOnTime = data.reduce((sum, p) => sum + p.onTimeJobs, 0);

    return {
      topPerformer: sortedByRating[0]?.crewMemberName || 'N/A',
      averageRating: data.length > 0 ? parseFloat((totalRating / data.length).toFixed(2)) : 0,
      totalJobsCompleted: totalCompleted,
      overallOnTimeRate: totalCompleted > 0 ? parseFloat(((totalOnTime / totalCompleted) * 100).toFixed(1)) : 0,
    };
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

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.7) return '#10b981';
    if (rating >= 4.0) return '#3b82f6';
    if (rating >= 3.5) return '#f59e0b';
    return '#dc2626';
  };

  const getTrendIcon = (trend: number): string => {
    if (trend > 0) return '📈';
    if (trend < 0) return '📉';
    return '➡️';
  };

  const filteredPerformances = performances
    .filter(p => filterRole === 'all' || p.role === filterRole)
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'jobs') return b.completedJobs - a.completedJobs;
      if (sortBy === 'onTime') return b.onTimeRate - a.onTimeRate;
      return 0;
    });

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className={styles.crewPerformance}>
      <div className={styles.header}>
        <div>
          <h2>Crew Performance</h2>
          <p className={styles.subtitle}>Performance metrics and crew member ratings</p>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {metrics && (
        <div className={styles.metrics}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Top Performer</div>
            <div className={styles.metricValue} style={{ fontSize: '1.25rem' }}>
              {metrics.topPerformer}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Avg Rating</div>
            <div className={styles.metricValue}>⭐ {metrics.averageRating}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Jobs Completed</div>
            <div className={styles.metricValue}>{metrics.totalJobsCompleted}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>On-Time Rate</div>
            <div className={styles.metricValue}>{metrics.overallOnTimeRate}%</div>
          </div>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.dateFilter}>
          <label>From:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className={styles.dateInput}
          />
          <label>To:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className={styles.dateInput}
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Roles</option>
          <option value="lead">👷‍♂️ Leads</option>
          <option value="mover">👷 Movers</option>
          <option value="driver">🚛 Drivers</option>
          <option value="specialist">⭐ Specialists</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rating' | 'jobs' | 'onTime')}
          className={styles.filterSelect}
        >
          <option value="rating">Sort by Rating</option>
          <option value="jobs">Sort by Jobs Completed</option>
          <option value="onTime">Sort by On-Time Rate</option>
        </select>
      </div>

      <div className={styles.leaderboard}>
        <h3>Leaderboard</h3>
        <div className={styles.leaderboardList}>
          {filteredPerformances.slice(0, 5).map((perf, index) => (
            <div key={perf.crewMemberId} className={styles.leaderboardItem}>
              <div className={styles.rank}>#{index + 1}</div>
              <div className={styles.crewInfo}>
                <div className={styles.crewName}>
                  {getRoleIcon(perf.role)} {perf.crewMemberName}
                </div>
                <div className={styles.crewRole}>{perf.role}</div>
              </div>
              <div
                className={styles.rating}
                style={{ color: getRatingColor(perf.rating) }}
              >
                ⭐ {perf.rating}
              </div>
              <div className={styles.trend}>
                {getTrendIcon(perf.monthlyTrend)} {Math.abs(perf.monthlyTrend)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.performanceGrid}>
        {filteredPerformances.map((perf) => (
          <div key={perf.crewMemberId} className={styles.performanceCard}>
            <div className={styles.cardHeader}>
              <div className={styles.crewName}>
                {getRoleIcon(perf.role)} {perf.crewMemberName}
              </div>
              <div
                className={styles.rating}
                style={{ color: getRatingColor(perf.rating) }}
              >
                ⭐ {perf.rating}
              </div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Jobs Completed:</span>
                <span className={styles.statValue}>{perf.completedJobs}/{perf.totalJobs}</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statLabel}>On-Time Rate:</span>
                <span
                  className={styles.statValue}
                  style={{ color: perf.onTimeRate >= 90 ? '#10b981' : '#f59e0b' }}
                >
                  {perf.onTimeRate}%
                </span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statLabel}>Avg Job Duration:</span>
                <span className={styles.statValue}>{perf.averageJobDuration}h</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statLabel}>Efficiency:</span>
                <span className={styles.statValue}>{perf.efficiency}%</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statLabel}>Monthly Trend:</span>
                <span
                  className={styles.statValue}
                  style={{ color: perf.monthlyTrend > 0 ? '#10b981' : '#dc2626' }}
                >
                  {getTrendIcon(perf.monthlyTrend)} {perf.monthlyTrend > 0 ? '+' : ''}{perf.monthlyTrend}%
                </span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <div className={styles.feedbackLabel}>Customer Feedback:</div>
              <div className={styles.feedbackBar}>
                <div
                  className={styles.feedbackPositive}
                  style={{
                    width: `${(perf.customerFeedback.positive / perf.completedJobs) * 100}%`,
                  }}
                  title={`${perf.customerFeedback.positive} positive`}
                ></div>
                <div
                  className={styles.feedbackNeutral}
                  style={{
                    width: `${(perf.customerFeedback.neutral / perf.completedJobs) * 100}%`,
                  }}
                  title={`${perf.customerFeedback.neutral} neutral`}
                ></div>
                <div
                  className={styles.feedbackNegative}
                  style={{
                    width: `${(perf.customerFeedback.negative / perf.completedJobs) * 100}%`,
                  }}
                  title={`${perf.customerFeedback.negative} negative`}
                ></div>
              </div>
              <div className={styles.feedbackLegend}>
                <span className={styles.legendPositive}>👍 {perf.customerFeedback.positive}</span>
                <span className={styles.legendNeutral}>😐 {perf.customerFeedback.neutral}</span>
                <span className={styles.legendNegative}>👎 {perf.customerFeedback.negative}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPerformances.length === 0 && (
        <div className={styles.emptyState}>
          <p>No performance data for selected filters</p>
        </div>
      )}
    </div>
  );
}
