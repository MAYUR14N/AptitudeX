'use client';
import { useState, useEffect, useCallback } from 'react';

interface MonitoringRecord {
  attendance_id: number;
  student_name: string;
  exam_title: string;
  exam_code: string;
  status: string;
  violations: number;
}

export default function ExamMonitoringPage() {
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const res = await fetch('/api/admin/monitoring');
    if (res.ok) {
      const data = await res.json();
      setRecords(data.data || []);
    }
    if (showLoader) setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchRecords();
    };
    init();
    
    // Polling every 5 seconds for "real-time" view
    const interval = setInterval(() => {
      fetchRecords(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchRecords]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Exam Monitoring</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div>
          Live Updates Active
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading attendance records...</p>
        ) : records.length === 0 ? (
          <p className="text-muted">No attendance data found. Students must start an exam.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>Student Name</th>
                <th style={{ padding: '1rem' }}>Exam</th>
                <th style={{ padding: '1rem' }}>Code</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Violations</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.attendance_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{r.student_name}</td>
                  <td style={{ padding: '1rem' }}>{r.exam_title}</td>
                  <td style={{ padding: '1rem' }}><span style={{ fontFamily: 'monospace' }}>{r.exam_code}</span></td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      background: r.status === 'completed' 
                        ? 'rgba(3, 218, 198, 0.2)' 
                        : r.status === 'terminated'
                          ? 'rgba(207, 102, 121, 0.2)'
                          : 'rgba(69, 162, 158, 0.2)',
                      color: r.status === 'completed' 
                        ? 'var(--success)' 
                        : r.status === 'terminated'
                          ? 'var(--danger-hover)'
                          : 'var(--primary-hover)'
                    }}>
                      {r.status === 'completed' 
                        ? 'Completed' 
                        : r.status === 'terminated'
                          ? 'Terminated'
                          : 'In Progress'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {r.violations > 0 ? (
                      <span style={{ color: 'var(--danger-hover)', fontWeight: 'bold' }}>{r.violations} Detected</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
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
