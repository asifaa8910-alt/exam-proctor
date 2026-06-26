import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import {
    Clock, AlertTriangle, Camera, Send, ChevronLeft, ChevronRight,
    Bookmark, CheckCircle, Eye
} from 'lucide-react';

export default function TakeExam() {
    const { examId } = useParams();
    const { user, settings } = useAuth();
    const { exams, submitExam, getSubmission } = useExam();
    const navigate = useNavigate();

    const exam = exams.find(e => e.id === examId);
    const existingSubmission = getSubmission(examId, user.id);

    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(exam ? exam.duration * 60 : 0);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [toasts, setToasts] = useState([]);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitted, setSubmitted] = useState(!!existingSubmission);
    const [webcamActive, setWebcamActive] = useState(false);
    const [webcamSnapshots, setWebcamSnapshots] = useState([]);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);

    // Redirect if already submitted
    useEffect(() => {
        if (existingSubmission) {
            setSubmitted(true);
        }
    }, [existingSubmission]);

    // Load auto-saved answers
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`exam_answers_${examId}_${user.id}`);
            if (saved) setAnswers(JSON.parse(saved));
        } catch { /* ignore */ }
    }, [examId, user.id]);

    // Auto-save answers every 10 seconds
    useEffect(() => {
        if (submitted) return;
        const interval = setInterval(() => {
            localStorage.setItem(`exam_answers_${examId}_${user.id}`, JSON.stringify(answers));
        }, 10000);
        return () => clearInterval(interval);
    }, [answers, examId, user.id, submitted]);

    // Timer countdown
    useEffect(() => {
        if (submitted || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [submitted, timeLeft]);

    // Tab switch detection
    useEffect(() => {
        if (submitted) return;
        if (settings?.proctoring_enabled === 'false') return;

        const handleVisibility = () => {
            if (document.hidden) {
                setTabSwitches(prev => {
                    const newCount = prev + 1;
                    const maxAllowed = parseInt(settings?.max_tab_switches || 3);
                    if (newCount >= maxAllowed) {
                        addToast(`🚨 Maximum tab switches (${maxAllowed}) exceeded! Auto-submitting...`, 'danger');
                        setTimeout(() => {
                            const latestAnswers = JSON.parse(localStorage.getItem(`exam_answers_${examId}_${user.id}`) || JSON.stringify(answers));
                            submitExam({
                                examId,
                                studentId: user.id,
                                answers: latestAnswers,
                                tabSwitches: newCount,
                                webcamSnapshots,
                            });
                            localStorage.removeItem(`exam_answers_${examId}_${user.id}`);
                            setSubmitted(true);
                            setShowSubmitModal(false);
                        }, 1000);
                    } else {
                        addToast(`⚠️ Tab switch detected! (${newCount}/${maxAllowed} switches)`, 'warning');
                    }
                    return newCount;
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [submitted, settings, answers, examId, user.id, webcamSnapshots]);

    // Webcam setup
    useEffect(() => {
        if (submitted) return;
        if (settings?.proctoring_enabled === 'false') {
            setWebcamActive(false);
            return;
        }
        startWebcam();
        return () => stopWebcam();
    }, [submitted, settings]);

    // Webcam snapshot every 30 seconds
    useEffect(() => {
        if (!webcamActive || submitted) return;
        if (settings?.proctoring_enabled === 'false') return;
        const interval = setInterval(() => {
            captureSnapshot();
        }, 30000);
        return () => clearInterval(interval);
    }, [webcamActive, submitted, settings]);

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setWebcamActive(true);
        } catch (err) {
            console.warn('Webcam access denied:', err);
            addToast('📷 Webcam access denied. Please enable camera.', 'danger');
        }
    };

    const stopWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setWebcamActive(false);
    };

    const captureSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const snapshot = canvas.toDataURL('image/jpeg', 0.5);
        setWebcamSnapshots(prev => [...prev, { time: new Date().toISOString(), image: snapshot }]);
    };

    const addToast = useCallback((message, type = 'warning') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const handleAnswer = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const toggleReview = (questionId) => {
        setMarkedForReview(prev => {
            const next = new Set(prev);
            next.has(questionId) ? next.delete(questionId) : next.add(questionId);
            return next;
        });
    };

    const handleSubmit = (autoSubmit = false) => {
        // Capture final snapshot
        captureSnapshot();
        stopWebcam();

        submitExam({
            examId,
            studentId: user.id,
            answers,
            tabSwitches,
            webcamSnapshots,
        });

        // Clear auto-saved data
        localStorage.removeItem(`exam_answers_${examId}_${user.id}`);
        setSubmitted(true);
        setShowSubmitModal(false);

        if (autoSubmit) {
            addToast('⏰ Time is up! Exam auto-submitted.', 'danger');
        }
    };

    if (!exam) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
                <h2>Exam not found</h2>
                <button className="btn btn-primary" onClick={() => navigate('/student/dashboard')} style={{ marginTop: 20 }}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
                <div className="card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
                    <CheckCircle size={56} style={{ color: 'var(--success)', marginBottom: 16 }} />
                    <h2 style={{ marginBottom: 8 }}>Exam Submitted!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Your answers have been recorded successfully.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-info">Tab Switches: {tabSwitches}</span>
                        <span className="badge badge-accent">Snapshots: {webcamSnapshots.length}</span>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/student/dashboard')} style={{ marginTop: 24 }}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const question = exam.questions[currentQ];
    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const answeredCount = exam.questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;
    const isTimeLow = timeLeft < 120;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Toasts */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <AlertTriangle size={16} /> {t.message}
                    </div>
                ))}
            </div>

            {/* Top Bar */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, minHeight: 60,
                background: 'var(--bg-navbar)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 24px', zIndex: 100, flexWrap: 'wrap', gap: 10
            }}>
                <div>
                    <h3 style={{ fontSize: '0.95rem' }}>{exam.title}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {exam.questions.length} questions • {exam.totalMarks} marks
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {/* Tab Switches (Only show if proctoring enabled) */}
                    {settings?.proctoring_enabled !== 'false' && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem',
                            fontWeight: 600, color: tabSwitches > 0 ? 'var(--danger)' : 'var(--text-secondary)',
                            border: `1px solid ${tabSwitches > 0 ? 'var(--danger)' : 'var(--border)'}`,
                            padding: '8px 14px', borderRadius: 'var(--radius-md)',
                            background: tabSwitches > 0 ? 'var(--danger-bg)' : 'var(--bg-card)'
                        }}>
                            <Eye size={14} /> {tabSwitches} / {settings?.max_tab_switches || 3} switches
                        </div>
                    )}

                    {/* Timer */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: '1rem',
                        fontWeight: 700, fontFamily: 'monospace', padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isTimeLow ? 'var(--danger-bg)' : 'var(--bg-card)',
                        color: isTimeLow ? 'var(--danger)' : 'var(--text-primary)',
                        border: `1px solid ${isTimeLow ? 'var(--danger)' : 'var(--border)'}`,
                        animation: isTimeLow ? 'pulse 1s ease infinite' : 'none'
                    }}>
                        <Clock size={16} /> {formatTime(timeLeft)}
                    </div>

                    {/* Webcam (Only show if proctoring enabled) */}
                    {settings?.proctoring_enabled !== 'false' && (
                        <div className="webcam-container" style={{ width: 100 }}>
                            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', display: 'block' }} />
                            <div className="webcam-label">
                                <span className="webcam-dot"></span>
                                {webcamActive ? 'LIVE' : 'OFF'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Main Content */}
            <div className="exam-layout">
                {/* Question Panel */}
                <div className="exam-main">
                    <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
                        {/* Question Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className="badge badge-accent">Q{currentQ + 1}</span>
                                <span className="badge" style={{ background: 'var(--bg-input)' }}>
                                    {question.type === 'mcq' ? 'MCQ' : 'Subjective'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{question.marks} marks</span>
                            </div>
                            <button
                                className={`btn btn-sm ${markedForReview.has(question.id) ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => toggleReview(question.id)}
                            >
                                <Bookmark size={14} />
                                {markedForReview.has(question.id) ? 'Marked' : 'Mark for Review'}
                            </button>
                        </div>

                        {/* Question Text */}
                        <p style={{ fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 24, color: 'var(--text-heading)' }}>
                            {question.text}
                        </p>

                        {/* Answer Input */}
                        {question.type === 'mcq' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {question.options.map((opt, i) => (
                                    <label
                                        key={i}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            padding: '14px 18px', borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${answers[question.id] === i ? 'var(--accent)' : 'var(--border)'}`,
                                            background: answers[question.id] === i ? 'var(--accent-glow)' : 'var(--bg-input)',
                                            cursor: 'pointer', transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name={question.id}
                                            checked={answers[question.id] === i}
                                            onChange={() => handleAnswer(question.id, i)}
                                            style={{ accentColor: 'var(--accent)' }}
                                        />
                                        <span style={{ fontSize: '0.92rem' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                className="form-textarea"
                                placeholder="Type your answer here..."
                                value={answers[question.id] || ''}
                                onChange={e => handleAnswer(question.id, e.target.value)}
                                style={{ minHeight: 150 }}
                            />
                        )}

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentQ(prev => prev - 1)}
                                disabled={currentQ === 0}
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => setShowSubmitModal(true)}
                            >
                                <Send size={16} /> Submit Exam
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentQ(prev => prev + 1)}
                                disabled={currentQ === exam.questions.length - 1}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Side Panel — Question Navigator */}
                <div className="exam-sidebar">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Questions
                    </h4>
                    <div className="question-nav">
                        {exam.questions.map((q, i) => {
                            let cls = '';
                            if (i === currentQ) cls = 'active';
                            else if (markedForReview.has(q.id)) cls = 'review';
                            else if (answers[q.id] !== undefined && answers[q.id] !== '') cls = 'answered';
                            return (
                                <button key={q.id} className={`q-btn ${cls}`} onClick={() => setCurrentQ(i)}>
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--accent)' }}></div>
                            Current
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--success)' }}></div>
                            Answered
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--warning)' }}></div>
                            Marked for Review
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}></div>
                            Not Answered
                        </div>
                    </div>

                    {/* Summary */}
                    <div style={{
                        marginTop: 24, padding: 14, background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)', fontSize: '0.8rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Answered</span>
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{answeredCount}/{exam.questions.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Review</span>
                            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{markedForReview.size}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Tab Switches</span>
                            <span style={{ color: tabSwitches > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>{tabSwitches}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Modal */}
            {showSubmitModal && (
                <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Submit Exam?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Are you sure you want to submit? This action cannot be undone.
                        </p>
                        <div style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: '0.85rem' }}>
                            <div>Answered: <strong>{answeredCount}/{exam.questions.length}</strong></div>
                            <div>Unanswered: <strong>{exam.questions.length - answeredCount}</strong></div>
                            <div>Marked for Review: <strong>{markedForReview.size}</strong></div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => handleSubmit(false)}>
                                <Send size={16} /> Confirm Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
