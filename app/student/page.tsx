'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Result {
  id: number;
  title: string;
  exam_code: string;
  score: number;
  total_questions: number;
  time_taken: number;
}

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [examCode, setExamCode] = useState(searchParams.get('code')?.toUpperCase() || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      const res = await fetch('/api/student/results');
      if (res.ok) {
        const result = await res.json();
        // Backend returns `{ success: true, data: { results: [...] } }` now
        setResults(result.data?.results || []);
      }
      setLoadingResults(false);
    }
    fetchResults();
  }, []);

  async function handleJoinExam(e: React.FormEvent) {
    e.preventDefault();
    if (!examCode.trim()) return;

    setLoading(true);
    setError('');

    const res = await fetch('/api/exam/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examCode: examCode.trim() })
    });

    const data = await res.json();

    if (res.ok) {
      router.push(`/exam/${data.data.assessmentId}`);
    } else {
      setError(data.message || 'Invalid exam code');
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
      
      <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: '60px', height: '60px', background: 'rgba(69, 162, 158, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        
        <h2 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-outfit)' }}>Join an Assessment</h2>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Enter the unique exam code provided by your administrator to begin.</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleJoinExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. APT-8274" 
            style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', textTransform: 'uppercase' }}
            value={examCode}
            onChange={(e) => setExamCode(e.target.value.toUpperCase())}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '1rem' }}>
            {loading ? 'Validating...' : 'Start Assessment'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '4rem', maxWidth: '700px', width: '100%' }}>
        <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-outfit)', fontSize: '1.4rem' }}>Recent Results</h3>
        
        {loadingResults ? (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading results...</div>
        ) : !Array.isArray(results) || results.length === 0 ? (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>You haven&apos;t completed any assessments yet, or results are not published.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {results.map(r => (
              <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{r.title}</h4>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Code: {r.exam_code} &bull; Time Taken: {Math.floor(r.time_taken / 60)}m {r.time_taken % 60}s</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'var(--font-outfit)' }}>
                    {r.score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {r.total_questions}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.2rem', padding: '0.2rem 0.5rem', background: 'rgba(3,218,198,0.1)', borderRadius: '4px' }}>
                    {Math.round((r.score / r.total_questions) * 100)}% Accuracy
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>Loading dashboard...</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}

