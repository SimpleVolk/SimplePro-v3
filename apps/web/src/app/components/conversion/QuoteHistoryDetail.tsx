'use client';

import { useState, useEffect } from 'react';
import styles from './QuoteHistoryDetail.module.css';

interface QuoteHistory {
  quoteHistoryId: string;
  quoteNumber: string;
  status: string;
  customerId: string;
  opportunityId: string;
  estimateId: string;
  version: number;
  quoteData: {
    totalPrice: number;
    breakdown?: any;
    validUntil?: string;
    terms?: string;
    notes?: string;
  };
  customerInteractions: Array<{
    type: string;
    timestamp: string;
    details?: any;
    userId?: string;
  }>;
  salesActivity: Array<{
    activityType: string;
    timestamp: string;
    performedBy: string;
    outcome?: string;
    notes?: string;
  }>;
  timeline: {
    quoteSentDate?: string;
    firstViewedDate?: string;
    lastViewedDate?: string;
    decisionDate?: string;
    daysToDecision?: number;
    daysToFirstView?: number;
    totalViewCount: number;
  };
  winAnalysis?: {
    winReason: string;
    winReasonDetails?: string;
    keySellingPoints?: string[];
    marginAchieved?: number;
  };
  lossAnalysis?: {
    lostReason: string;
    lostReasonDetails?: string;
    competitorWon?: string;
    priceDifference?: number;
    lessonsLearned?: string;
  };
  assignedSalesRep?: string;
  createdAt: string;
}

interface QuoteHistoryDetailProps {
  quoteHistoryId: string;
  onClose?: () => void;
}

export default function QuoteHistoryDetail({
  quoteHistoryId,
  onClose,
}: QuoteHistoryDetailProps) {
  const [quote, setQuote] = useState<QuoteHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuoteHistory();
  }, [quoteHistoryId]);

  const fetchQuoteHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `http://localhost:3001/api/quote-history/${quoteHistoryId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quote history');
      }

      const data = await response.json();
      setQuote(data.quoteHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching quote history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: styles.statusDraft,
      sent: styles.statusSent,
      viewed: styles.statusViewed,
      accepted: styles.statusAccepted,
      rejected: styles.statusRejected,
      expired: styles.statusExpired,
      revised: styles.statusRevised,
    };
    return `${styles.statusBadge} ${statusMap[status] || ''}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading quote history...</div>
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

  if (!quote) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>Quote history not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Quote #{quote.quoteNumber}</h2>
          <span className={getStatusBadgeClass(quote.status)}>
            {quote.status.toUpperCase()}
          </span>
          <span className={styles.version}>v{quote.version}</span>
        </div>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Quote Details */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Quote Details</h3>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Total Price:</span>
            <span className={styles.detailValue}>
              {formatCurrency(quote.quoteData.totalPrice)}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Valid Until:</span>
            <span className={styles.detailValue}>
              {quote.quoteData.validUntil
                ? formatDate(quote.quoteData.validUntil)
                : 'N/A'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Assigned Sales Rep:</span>
            <span className={styles.detailValue}>
              {quote.assignedSalesRep || 'Unassigned'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Created:</span>
            <span className={styles.detailValue}>
              {formatDate(quote.createdAt)}
            </span>
          </div>
        </div>
        {quote.quoteData.notes && (
          <div className={styles.notes}>
            <span className={styles.notesLabel}>Notes:</span>
            <p className={styles.notesText}>{quote.quoteData.notes}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Timeline</h3>
        <div className={styles.timelineGrid}>
          {quote.timeline.quoteSentDate && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Quote Sent:</span>
              <span className={styles.timelineValue}>
                {formatDate(quote.timeline.quoteSentDate)}
              </span>
            </div>
          )}
          {quote.timeline.firstViewedDate && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>First Viewed:</span>
              <span className={styles.timelineValue}>
                {formatDate(quote.timeline.firstViewedDate)}
                {quote.timeline.daysToFirstView !== undefined && (
                  <span className={styles.timelineDays}>
                    ({quote.timeline.daysToFirstView} days)
                  </span>
                )}
              </span>
            </div>
          )}
          {quote.timeline.lastViewedDate && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Last Viewed:</span>
              <span className={styles.timelineValue}>
                {formatDate(quote.timeline.lastViewedDate)}
              </span>
            </div>
          )}
          {quote.timeline.decisionDate && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Decision Date:</span>
              <span className={styles.timelineValue}>
                {formatDate(quote.timeline.decisionDate)}
                {quote.timeline.daysToDecision !== undefined && (
                  <span className={styles.timelineDays}>
                    ({quote.timeline.daysToDecision} days to decide)
                  </span>
                )}
              </span>
            </div>
          )}
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>Total Views:</span>
            <span className={styles.timelineValue}>
              {quote.timeline.totalViewCount}
            </span>
          </div>
        </div>
      </div>

      {/* Win/Loss Analysis */}
      {quote.winAnalysis && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Win Analysis</h3>
          <div className={styles.analysisContent}>
            <div className={styles.analysisItem}>
              <span className={styles.analysisLabel}>Win Reason:</span>
              <span className={styles.analysisValue}>
                {quote.winAnalysis.winReason.replace(/_/g, ' ')}
              </span>
            </div>
            {quote.winAnalysis.winReasonDetails && (
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Details:</span>
                <span className={styles.analysisValue}>
                  {quote.winAnalysis.winReasonDetails}
                </span>
              </div>
            )}
            {quote.winAnalysis.marginAchieved !== undefined && (
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Margin Achieved:</span>
                <span className={styles.analysisValue}>
                  {quote.winAnalysis.marginAchieved}%
                </span>
              </div>
            )}
            {quote.winAnalysis.keySellingPoints &&
              quote.winAnalysis.keySellingPoints.length > 0 && (
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>Key Selling Points:</span>
                  <ul className={styles.list}>
                    {quote.winAnalysis.keySellingPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}

      {quote.lossAnalysis && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Loss Analysis</h3>
          <div className={styles.analysisContent}>
            <div className={styles.analysisItem}>
              <span className={styles.analysisLabel}>Loss Reason:</span>
              <span className={styles.analysisValue}>
                {quote.lossAnalysis.lostReason.replace(/_/g, ' ')}
              </span>
            </div>
            {quote.lossAnalysis.lostReasonDetails && (
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Details:</span>
                <span className={styles.analysisValue}>
                  {quote.lossAnalysis.lostReasonDetails}
                </span>
              </div>
            )}
            {quote.lossAnalysis.competitorWon && (
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Competitor Won:</span>
                <span className={styles.analysisValue}>
                  {quote.lossAnalysis.competitorWon}
                </span>
              </div>
            )}
            {quote.lossAnalysis.priceDifference !== undefined && (
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Price Difference:</span>
                <span className={styles.analysisValue}>
                  {formatCurrency(quote.lossAnalysis.priceDifference)}
                </span>
              </div>
            )}
            {quote.lossAnalysis.lessonsLearned && (
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Lessons Learned:</span>
                <span className={styles.analysisValue}>
                  {quote.lossAnalysis.lessonsLearned}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Interactions */}
      {quote.customerInteractions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Customer Interactions</h3>
          <div className={styles.activityList}>
            {quote.customerInteractions.map((interaction, idx) => (
              <div key={idx} className={styles.activityItem}>
                <div className={styles.activityIcon}>📊</div>
                <div className={styles.activityContent}>
                  <div className={styles.activityType}>
                    {interaction.type.replace(/_/g, ' ')}
                  </div>
                  <div className={styles.activityTime}>
                    {formatDate(interaction.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Activity */}
      {quote.salesActivity.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Sales Activity</h3>
          <div className={styles.activityList}>
            {quote.salesActivity.map((activity, idx) => (
              <div key={idx} className={styles.activityItem}>
                <div className={styles.activityIcon}>📞</div>
                <div className={styles.activityContent}>
                  <div className={styles.activityType}>
                    {activity.activityType.replace(/_/g, ' ')}
                  </div>
                  <div className={styles.activityMeta}>
                    By: {activity.performedBy} | {formatDate(activity.timestamp)}
                  </div>
                  {activity.outcome && (
                    <div className={styles.activityOutcome}>
                      Outcome: {activity.outcome}
                    </div>
                  )}
                  {activity.notes && (
                    <div className={styles.activityNotes}>{activity.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
