'use client';
import { useState, useEffect, useCallback } from 'react';

interface Assessment {
  id: number;
  title: string;
  exam_code: string;
  num_questions: number;
  duration: number;
  category: string;
  is_published: number;
}

export default function AssessmentManagementPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    title: '',
    duration: 30, // in minutes
    num_questions: 10,
    category: 'Quantitative Aptitude',
    randomize_questions: true,
    randomize_options: true
  });
  const [creationError, setCreationError] = useState('');

  const fetchCounts = useCallback(async () => {
    const res = await fetch('/api/questions/count');
    if (res.ok) {
      const result = await res.json();
      setCounts(result.data || {});
    }
  }, []);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/assessments');
    if (res.ok) {
      const result = await res.json();
      setAssessments(result.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchAssessments();
      await fetchCounts();
    };
    init();
  }, [fetchAssessments, fetchCounts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreationError('');

    // Front-end Validation
    const available = counts[formData.category] || 0;
    if (formData.num_questions > available) {
      setCreationError(`Only ${available} questions available for ${formData.category}. Please reduce the number of questions or add more to the Question Bank.`);
      return;
    }

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    if (res.ok) {
      setShowModal(false);
      setFormData({
        title: '', duration: 30, num_questions: 10, category: 'Quantitative Aptitude',
        randomize_questions: true, randomize_options: true
      });
      fetchAssessments();
      alert(`Assessment created! Exam Code: ${data.data.exam_code}`);
    } else {
      setCreationError(data.message || 'Error creating assessment');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Assessments</h1>
        <button className="btn btn-primary" onClick={() => { fetchCounts(); setCreationError(''); setShowModal(true); }}>Create Assessment</button>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading assessments...</p>
        ) : assessments.length === 0 ? (
          <p className="text-muted">No assessments created. Click &quot;Create Assessment&quot;.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>Code</th>
                <th style={{ padding: '1rem' }}>Title</th>
                <th style={{ padding: '1rem' }}>Questions</th>
                <th style={{ padding: '1rem' }}>Duration</th>
                <th style={{ padding: '1rem' }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px dotted rgba(255,255,255,0.3)', color: 'var(--primary-hover)' }}>{a.exam_code}</span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{a.title}</td>
                  <td style={{ padding: '1rem' }}>{a.num_questions}</td>
                  <td style={{ padding: '1rem' }}>{a.duration} mins</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{a.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-outfit)' }}>Create Assessment</h2>
            
            {creationError && <div className="error-box">{creationError}</div>}

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Available Questions in Bank</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Quantitative Aptitude:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{counts['Quantitative Aptitude'] || 0}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Logical Reasoning:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{counts['Logical Reasoning'] || 0}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Data Interpretation:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{counts['Data Interpretation'] || 0}</span>
                </li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label>Assessment Title</label>
                <input type="text" className="input-field" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Midterm Aptitude Test" />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select className="input-field select-field" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option>Quantitative Aptitude</option>
                  <option>Logical Reasoning</option>
                  <option>Data Interpretation</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Duration (Minutes)</label>
                  <input type="number" min="1" className="input-field" required value={formData.duration || ''} onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label>Number of Questions</label>
                  <input type="number" min="1" className="input-field" required value={formData.num_questions || ''} onChange={(e) => setFormData({...formData, num_questions: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.randomize_questions} onChange={(e) => setFormData({...formData, randomize_questions: e.target.checked})} />
                  Randomize Questions Order
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.randomize_options} onChange={(e) => setFormData({...formData, randomize_options: e.target.checked})} />
                  Randomize Options Order
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Generate Assessment Code</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
