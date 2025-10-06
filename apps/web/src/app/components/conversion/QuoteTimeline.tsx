'use client';

import { useState, useEffect } from 'react';
import styles from './QuoteTimeline.module.css';

interface TimelineEvent {
  type: string;
  timestamp: string;
  description: string;
  performedBy?: string;
  icon: string;
}

interface QuoteTimelineProps {
  opportunityId: string;
}

export default function QuoteTimeline({ opportunityId }: QuoteTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuoteTimeline();
  }, [opportunityId]);

  const fetchQuoteTimeline = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch quote history for the opportunity
      const response = await fetch(
        `http://localhost:3001/api/quote-history/opportunity/${opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quote timeline');
      }

      const data = await response.json();

      // Build timeline from quote history
      const events: TimelineEvent[] = [];

      data.quotes.forEach((quote: any) => {
        // Quote sent event
        if (quote.timeline.quoteSentDate) {
          events.push({
            type: 'quote_sent',
            timestamp: quote.timeline.quoteSentDate,
            description: `Quote #${quote.quoteNumber} sent to customer`,
            performedBy: quote.assignedSalesRep,
            icon: '📧',
          });
        }

        // First viewed event
        if (quote.timeline.firstViewedDate) {
          events.push({
            type: 'quote_viewed',
            timestamp: quote.timeline.firstViewedDate,
            description: 'Quote first viewed by customer',
            icon: '👁️',
          });
        }

        // Customer interactions
        quote.customerInteractions.forEach((interaction: any) => {
          events.push({
            type: `interaction_${interaction.type}`,
            timestamp: interaction.timestamp,
            description: `Customer ${interaction.type.replace(/_/g, ' ')}`,
            icon: getInteractionIcon(interaction.type),
          });
        });

        // Sales activities
        quote.salesActivity.forEach((activity: any) => {
          events.push({
            type: `activity_${activity.activityType}`,
            timestamp: activity.timestamp,
            description: activity.activityType.replace(/_/g, ' '),
            performedBy: activity.performedBy,
            icon: '📞',
          });
        });

        // Decision event
        if (quote.timeline.decisionDate) {
          const isWon = quote.status === 'accepted';
          events.push({
            type: isWon ? 'quote_won' : 'quote_lost',
            timestamp: quote.timeline.decisionDate,
            description: isWon
              ? `Quote accepted! ${quote.winAnalysis?.winReason ? `(${quote.winAnalysis.winReason.replace(/_/g, ' ')})` : ''}`
              : `Quote rejected. ${quote.lossAnalysis?.lostReason ? `(${quote.lossAnalysis.lostReason.replace(/_/g, ' ')})` : ''}`,
            icon: isWon ? '✅' : '❌',
          });
        }
      });

      // Sort by timestamp (newest first)
      events.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setTimeline(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching quote timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInteractionIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      viewed: '👁️',
      downloaded: '⬇️',
      question_asked: '❓',
      revision_requested: '📝',
    };
    return iconMap[type] || '📊';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return (
        'Today, ' +
        date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } else if (diffDays === 1) {
      return (
        'Yesterday, ' +
        date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading quote timeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>No timeline data available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Quote Activity Timeline</h2>

      <div className={styles.timeline}>
        {timeline.map((event, index) => (
          <div key={index} className={styles.timelineItem}>
            <div className={styles.timelineIcon}>{event.icon}</div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <span className={styles.timelineDescription}>
                  {event.description}
                </span>
                <span className={styles.timelineDate}>
                  {formatDate(event.timestamp)}
                </span>
              </div>
              {event.performedBy && (
                <div className={styles.timelinePerformer}>
                  By: {event.performedBy}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Engagement Heatmap */}
      <div className={styles.heatmapSection}>
        <h3 className={styles.heatmapTitle}>Customer Engagement Heatmap</h3>
        <div className={styles.heatmap}>
          {renderEngagementHeatmap(timeline)}
        </div>
      </div>
    </div>
  );
}

// Helper function to render engagement heatmap
function renderEngagementHeatmap(timeline: TimelineEvent[]) {
  // Group events by day
  const eventsByDay: Record<string, number> = {};

  timeline.forEach((event) => {
    const date = new Date(event.timestamp);
    const dayKey = date.toISOString().split('T')[0];
    eventsByDay[dayKey] = (eventsByDay[dayKey] || 0) + 1;
  });

  // Get last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayKey = date.toISOString().split('T')[0];
    const count = eventsByDay[dayKey] || 0;
    days.push({ date: dayKey, count });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className={styles.heatmapGrid}>
      {days.map((day, index) => {
        const intensity = day.count / maxCount;
        const opacity = day.count === 0 ? 0.1 : 0.3 + intensity * 0.7;

        return (
          <div
            key={index}
            className={styles.heatmapCell}
            style={{ opacity }}
            title={`${day.date}: ${day.count} events`}
          />
        );
      })}
    </div>
  );
}
