'use client';
import { useState, useEffect, useCallback } from 'react';

interface Assessment {
  id: number;
  title: string;
  exam_code: string;
  is_published: number;
  total_attendance: number;
  total_completed: number;
  avg_score: number | null;
  max_score: number | null;
}

export default function ResultsManagementPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/results');
    if (res.ok) {
      const result = await res.json();
      setAssessments(result.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchResults();
    };
    init();
  }, [fetchResults]);

  const togglePublish = useCallback(async (assessmentId: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const res = await fetch('/api/admin/results', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId, is_published: newStatus })
    });

    if (res.ok) {
      fetchResults();
    } else {
      alert('Failed to update result publication status');
    }
  }, [fetchResults]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Results Management</h1>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading assessment results...</p>
        ) : assessments.length === 0 ? (
          <p className="text-muted">No assessments found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>Title/Code</th>
                <th style={{ padding: '1rem' }}>Total Attended</th>
                <th style={{ padding: '1rem' }}>Responses Submitted</th>
                <th style={{ padding: '1rem' }}>Avg Score</th>
                <th style={{ padding: '1rem' }}>Max Score</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.exam_code}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{a.total_attendance || 0}</td>
                  <td style={{ padding: '1rem' }}>{a.total_completed || 0}</td>
                  <td style={{ padding: '1rem' }}>{a.avg_score !== null ? Number(a.avg_score).toFixed(1) : '-'}</td>
                  <td style={{ padding: '1rem' }}>{a.max_score !== null ? a.max_score : '-'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => togglePublish(a.id, a.is_published)}
                      className={a.is_published ? "btn btn-outline" : "btn btn-primary"}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      {a.is_published ? 'Unpublish Results' : 'Publish Results'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
