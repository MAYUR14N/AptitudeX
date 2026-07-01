'use client';
import { useState, useEffect, useCallback } from 'react';

interface Question {
  id: string | number;
  questionText: string;
  category: string;
  topic: string;
  difficulty: string;
  options: string[] | string;
  correctAnswer: string;
  explanation: string;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const emptyForm = {
    questionText: '',
    category: 'Quantitative Aptitude',
    topic: '',
    difficulty: 'Medium',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/questions');
    if (res.ok) {
      const result = await res.json();
      setQuestions(result.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchQuestions();
    };
    init();
  }, [fetchQuestions]);

  function handleOptionChange(index: number, value: string) {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.correctAnswer) {
      alert('Please select a correct answer');
      return;
    }

    const url = editingId ? `/api/questions/${editingId}` : '/api/questions';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setShowModal(false);
      setFormData(emptyForm);
      setEditingId(null);
      fetchQuestions();
    } else {
      alert('Error saving question');
    }
  }

  const handleEdit = (question: Question) => {
    let parsedOptions = ['', '', '', ''];
    try {
      parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
    } catch (e) {
      console.error("Error parsing options", e);
    }

    setFormData({
      ...question,
      options: Array.isArray(parsedOptions) && parsedOptions.length >= 4 ? parsedOptions : ['', '', '', '']
    });
    setEditingId(question.id);
    setShowModal(true);
  }

  async function handleDelete(id: string | number) {
    if (!confirm('Are you sure you want to delete this question? It will also be removed from any existing assessments.')) return;
    
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchQuestions();
    } else {
      alert('Error deleting question');
    }
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || q.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Question Bank</h1>
        <button className="btn btn-primary" onClick={() => { setFormData(emptyForm); setEditingId(null); setShowModal(true); }}>Add Question</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          placeholder="Search questions..." 
          className="input-field" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <select 
          className="input-field select-field" 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ width: '250px' }}
        >
          <option value="All">All Categories</option>
          <option value="Quantitative Aptitude">Quantitative Aptitude</option>
          <option value="Logical Reasoning">Logical Reasoning</option>
          <option value="Data Interpretation">Data Interpretation</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading questions...</p>
        ) : questions.length === 0 ? (
          <p className="text-muted">No questions found. Click &quot;Add Question&quot; to create one.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Question</th>
                <th style={{ padding: '1rem' }}>Category</th>
                <th style={{ padding: '1rem' }}>Difficulty</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No questions match your criteria.
                  </td>
                </tr>
              ) : filteredQuestions.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>#{q.id}</td>
                  <td style={{ padding: '1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.questionText}</td>
                  <td style={{ padding: '1rem' }}>{q.category}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      background: q.difficulty === 'Hard' ? 'rgba(207,102,121,0.2)' : q.difficulty === 'Medium' ? 'rgba(255,193,7,0.2)' : 'rgba(3,218,198,0.2)',
                      color: q.difficulty === 'Hard' ? 'var(--danger-hover)' : q.difficulty === 'Medium' ? '#ffc107' : 'var(--success)'
                    }}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                     <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEdit(q)}>Edit</button>
                     <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(q.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-outfit)' }}>{editingId ? 'Edit Question' : 'Add New Question'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label>Question Text</label>
                <textarea className="input-field" rows={3} required value={formData.questionText} onChange={(e) => setFormData({...formData, questionText: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Category</label>
                  <select className="input-field select-field" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <option>Quantitative Aptitude</option>
                    <option>Logical Reasoning</option>
                    <option>Data Interpretation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select className="input-field select-field" value={formData.difficulty} onChange={(e) => setFormData({...formData, difficulty: e.target.value})}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Options</label>
                {formData.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="radio" 
                      name="correctAnswer" 
                      checked={formData.correctAnswer === opt && opt !== ''} 
                      onChange={() => setFormData({...formData, correctAnswer: opt})}
                      required
                    />
                    <input 
                      className="input-field" 
                      placeholder={`Option ${i + 1}`} 
                      value={opt} 
                      onChange={(e) => handleOptionChange(i, e.target.value)} 
                      required 
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Explanation (Optional)</label>
                <textarea className="input-field" rows={2} value={formData.explanation} onChange={(e) => setFormData({...formData, explanation: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Question</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
