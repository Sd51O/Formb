
import React, { useState, useEffect } from 'react';
import styles from './FormAnalytics.module.css';
import { getFormAnalytics, getFormResponses, getFormElements } from '../services/api';

const FormAnalytics = ({ formId, isDarkMode }) => {
  const [analytics, setAnalytics] = useState({
    viewCount: 0,
    startCount: 0,
    completionCount: 0,
    completionRate: 0
  });
  const [submissions, setSubmissions] = useState([]);
  const [formElements, setFormElements] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasResponses, setHasResponses] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const elementsResponse = await getFormElements(formId);
        
        const elementMapping = {};
        elementsResponse.forEach(element => {
          if (
            element &&
            element._id &&
            element.type !== 'text-bubble' &&
            element.type !== 'image-bubble' &&
            element.type !== 'video-bubble' &&
            element.type !== 'gif-bubble'&&
            element.type!=='button-input'
          ) {
            elementMapping[element._id] = {
              label: element.label || `Question ${element.order + 1}`,
              type: element.type,
              order: element.order
            };
          }
        });
        
        setFormElements(elementMapping);

        const [analyticsResponse, responsesData] = await Promise.all([
          getFormAnalytics(formId),
          getFormResponses(formId, 1, 10, 'completed')
        ]);

        const hasAnyResponses = analyticsResponse?.viewCount > 0 || 
                              analyticsResponse?.startCount > 0 || 
                              analyticsResponse?.completionCount > 0 ||
                              (responsesData?.responses && responsesData.responses.length > 0);

        setHasResponses(hasAnyResponses);

        if (!hasAnyResponses) {
          setLoading(false);
          return;
        }

        setAnalytics({
          viewCount: analyticsResponse?.viewCount || 0,
          startCount: analyticsResponse?.startCount || 0,
          completionCount: analyticsResponse?.completionCount || 0,
          completionRate: Math.round((analyticsResponse?.completionCount / analyticsResponse?.startCount) * 100) || 0
        });

        const transformedSubmissions = Array.isArray(responsesData?.responses) 
          ? responsesData.responses.map((response) => ({
              submittedAt: new Date(response.completedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }),
              ...response.responses
            }))
          : [];

        setSubmissions(transformedSubmissions);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (formId) fetchData();
  }, [formId]);

  if (loading) {
    return (
      <div className={`${styles.loading} ${isDarkMode ? styles.dark : styles.light}`}>
        Loading...
      </div>
    );
  }

  if (!hasResponses) {
    return (
      <div className={`${styles.container} ${isDarkMode ? styles.dark : styles.light}`}>
        <div className={styles.emptyState}>
          No responses yet collected
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.dark : styles.light}`}>
      {/* Rest of the component remains the same */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Views</div>
          <div className={styles.statValue}>{analytics.viewCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Starts</div>
          <div className={styles.statValue}>{analytics.startCount}</div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeader}>#</th>
              <th className={styles.tableHeader}>Submitted at</th>
              {Object.entries(formElements)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([id, element]) => (
                  <th key={id} className={styles.tableHeader}>
                    {element.type}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission, index) => (
              <tr key={index}>
                <td className={styles.tableCell}>{index + 1}</td>
                <td className={styles.tableCell}>{submission.submittedAt}</td>
                {Object.entries(formElements)
                  .sort(([, a], [, b]) => a.order - b.order)
                  .map(([id]) => (
                    <td key={id} className={styles.tableCell}>
                      {submission[id] || '-'}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.completionSection}>
        <div className={styles.donutChart}>
          <svg className={styles.donutRing}>
            <circle
              stroke="currentColor"
              fill="none"
              cx="18"
              cy="18"
              r="16"
              strokeWidth="3.6"
            />
            <circle
              stroke="#3b82f6"
              fill="none"
              cx="18"
              cy="18"
              r="16"
              strokeWidth="3.6"
              strokeDasharray={`${analytics.completionRate} 100`}
              className={styles.donutSegment}
            />
          </svg>
          <div className={styles.completionOverlay}>
            <div className={styles.completedCount}>
              Completed
              <br />
              {analytics.completionCount}
            </div>
          </div>
        </div>
        <div>
          <div className={styles.statTitle}>Completion rate</div>
          <div className={styles.statValue}>{analytics.completionRate}%</div>
        </div>
      </div>
    </div>
  );
};

export default FormAnalytics;