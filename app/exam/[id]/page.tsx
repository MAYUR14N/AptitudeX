'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Question {
  id: number;
  questionText: string;
  options: string[];
}

interface ExamAssessment {
  title: string;
  duration: number;
}

export default function ExamSessionPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<ExamAssessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState<string[]>([]);
  const violationCount = useRef(0);
  const startTime = useRef(Date.now());
  const isSubmitting = useRef(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const autoSubmit = useCallback(async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const timeTaken = Math.floor((Date.now() - startTime.current) / 1000);

    try {
      await fetch(`/api/exam/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          time_taken: timeTaken,
          violations
        })
      });
      router.push('/student');
    } catch (e) {
      console.error(e);
      alert('Failed to submit exam cleanly, but attendance is closed.');
      router.push('/student');
    }
  }, [assessmentId, answers, violations, router]);

  const recordViolation = useCallback((type: string) => {
    if (isSubmitting.current) return;

    // Send violation to backend and handle response
    fetch('/api/exam/violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: assessmentId,
        violationType: type,
        timestamp: new Date().toISOString()
      })
    })
    .then(async (res) => {
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          if (result.data.message === 'Duplicate violation ignored') {
            console.log('Duplicate violation ignored by server');
            return;
          }
          
          const count = result.data.violationCount;
          setViolations(prev => [...prev, type]);
          violationCount.current = count;
          
          if (result.data.terminated) {
            alert('Suspicious activity detected. Exam terminated due to multiple violations. (Violation 3/3)');
            autoSubmit();
          } else {
            alert(`Warning: Suspicious activity detected. Further violations will terminate the exam. (Violation ${count}/3)`);
          }
        }
      }
    })
    .catch(console.error);
  }, [assessmentId, autoSubmit]);

  const fetchExamData = useCallback(async () => {
    try {
      const res = await fetch(`/api/exam/${assessmentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAssessment(data.assessment);
      setQuestions(data.questions);
      setTimeLeft(data.assessment.duration * 60); // minutes to seconds
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load exam');
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchExamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitting.current) {
      const timer = setInterval(() => setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      }), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitting.current && !loading && assessment) {
      autoSubmit();
    }
  }, [timeLeft, loading, assessment, autoSubmit]);

  useEffect(() => {
    // Anti-Cheating Monitors
    if (loading || isSubmitting.current) return;

    const handleVisibilityChange = () => {
      if (document.hidden) recordViolation('tab_switch');
    };

    const handleBlur = () => {
      recordViolation('window_blur');
    };

    const handleFocus = () => {
      // Just for logging if needed, but blur/visibility covers leaving
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('fullscreen_exit');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Leaving this page will end the exam.';
      return e.returnValue;
    };

    const handleContext = (e: Event) => {
      e.preventDefault();
      recordViolation('right_click');
    };

    const handleCopyPaste = (e: Event) => {
      e.preventDefault();
      recordViolation('copy_paste_attempt');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        recordViolation('dev_tools');
      }
      // Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        recordViolation('dev_tools');
      }
      // Ctrl+U
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        recordViolation('view_source');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);

    // Multi-tab detection
    const channel = new BroadcastChannel(`exam_monitor_${assessmentId}`);
    channel.postMessage('exam_tab_opened');
    channel.onmessage = (event) => {
      if (event.data === 'exam_tab_opened') {
        recordViolation('multiple_tabs');
      }
    };

    // Request full screen on mount if not already in full screen
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      channel.close();
    };
  }, [loading, assessmentId, recordViolation]);

  function handleAnswer(qId: string, option: string) {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  }

  if (loading) return <div className="landing-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading exam engine...</div>;
  if (error) return <div className="landing-container" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--danger)' }}>{error}</div>;
  if (!assessment || questions.length === 0) return <div className="landing-container">Exam configuration error.</div>;

  const currentQuestion = questions[currentQ];

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
        MozUserSelect: 'none'
      }}
    >

      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.2rem' }}>{assessment.title}</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ color: violationCount.current > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            Violations: {violationCount.current} / 3
          </div>
          <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 'bold', color: timeLeft <= 60 ? 'var(--danger-hover)' : 'var(--primary)' }}>
            {formatTime(timeLeft)}
          </div>
          <button className="btn btn-outline" onClick={() => setShowSubmitModal(true)}>
            Finish Exam
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '2rem', gap: '2rem' }}>

        {/* Question Area */}
        <div style={{ flex: 1 }}>
          <div className="card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Question {currentQ + 1} of {questions.length}</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '2rem', lineHeight: '1.6' }}>{currentQuestion.questionText}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {currentQuestion.options.map((opt: string, idx: number) => {
                const isSelected = answers[currentQuestion.id] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(currentQuestion.id.toString(), opt)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '1.25rem',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(69, 162, 158, 0.15)' : 'rgba(0,0,0,0.2)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                      color: isSelected ? 'var(--primary)' : 'var(--text-light)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '1rem'
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button className="btn btn-secondary" onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0}>
                Previous
              </button>
              <button className="btn btn-primary" onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))} disabled={currentQ === questions.length - 1}>
                Next Question
              </button>
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="card" style={{ width: '250px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <h4 style={{ marginBottom: '1rem' }}>Questions</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {questions.map((q, i) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = currentQ === i;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '4px',
                    border: isCurrent ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                    background: isAnswered ? 'rgba(69, 162, 158, 0.3)' : 'var(--surface-hover)',
                    color: isAnswered ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: isCurrent ? 'bold' : 'normal'
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

      </main>

      {/* Early Submit Confirmation Modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-outfit)' }}>Submit Assessment</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
              Are you sure you want to submit the exam? You will not be able to return to change your answers.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setShowSubmitModal(false); autoSubmit(); }}>Submit Exam</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
