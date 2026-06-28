import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import {
    BookOpen, Clock, Calendar, CheckCircle, PlayCircle, Award,
    ChevronDown, ChevronUp, AlertTriangle, BarChart3, Eye, FileText
} from 'lucide-react';

export default function StudentDashboard() {
    const { user, settings } = useAuth();
    const { getUpcomingExams, getCompletedExams, exams } = useExam();
    const navigate = useNavigate();
    const [expandedExam, setExpandedExam] = useState(null);
    const [expandedCompleted, setExpandedCompleted] = useState(null);

    const upcoming = getUpcomingExams(user.id);
    const completed = getCompletedExams(user.id);

    const publishedCompleted = completed.filter(c => {
        const exam = exams.find(e => e.id === c.examId);
        return exam?.resultsPublished && c.isGraded;
    });
    const totalScore = publishedCompleted.reduce((s, c) => s + (c.totalScore || 0), 0);
    const totalMaxScore = publishedCompleted.reduce((s, c) => s + (c.exam?.totalMarks || 0), 0);
    const avgPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const totalTabSwitches = completed.reduce((s, c) => s + (c.tabSwitches || 0), 0);

    const toggleExam = (id) => setExpandedExam(prev => prev === id ? null : id);
    const toggleCompleted = (id) => setExpandedCompleted(prev => prev === id ? null : id);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Welcome back, {user.name} 👋</h1>
                <p>Assigned Examiner ID: <strong style={{ color: 'var(--accent)' }}>{user.examinerId}</strong></p>
            </div>

            {/* Announcement Banner */}
            {settings?.announcement_banner && (
                <div style={{
                    background: 'var(--accent-glow)',
                    border: '1px solid var(--accent)',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>System Announcement</span>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>{settings.announcement_banner}</p>
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid">
                <div 
                    className="stat-card" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => document.getElementById('upcoming-section')?.scrollIntoView({ behavior: 'smooth' })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            document.getElementById('upcoming-section')?.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}
                >
                    <div className="stat-icon purple"><BookOpen size={22} /></div>
                    <div className="stat-info">
                        <h3>{upcoming.length}</h3>
                        <p>Upcoming Exams</p>
                    </div>
                </div>
                <div 
                    className="stat-card" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => document.getElementById('completed-section')?.scrollIntoView({ behavior: 'smooth' })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            document.getElementById('completed-section')?.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}
                >
                    <div className="stat-icon green"><CheckCircle size={22} /></div>
                    <div className="stat-info">
                        <h3>{completed.length}</h3>
                        <p>Completed Exams</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Award size={22} /></div>
                    <div className="stat-info">
                        <h3>{avgPercentage}%</h3>
                        <p>Avg Performance</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><BarChart3 size={22} /></div>
                    <div className="stat-info">
                        <h3>{totalScore}/{totalMaxScore}</h3>
                        <p>Total Score</p>
                    </div>
                </div>
            </div>

            {/* Performance Overview */}
            {completed.length > 0 && (
                <div className="card" style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📊 Performance Overview</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                        <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: avgPercentage >= 70 ? 'var(--success)' : avgPercentage >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                                {avgPercentage}%
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Overall Average</div>
                            <div style={{
                                marginTop: 8, height: 6, borderRadius: 3, background: 'var(--bg-card)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%', borderRadius: 3, width: `${avgPercentage}%`,
                                    background: avgPercentage >= 70 ? 'var(--success)' : avgPercentage >= 40 ? 'var(--warning)' : 'var(--danger)',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                        <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>
                                {completed.length}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Exams Taken</div>
                        </div>
                        <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: totalTabSwitches > 5 ? 'var(--danger)' : 'var(--success)' }}>
                                {totalTabSwitches}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Total Tab Switches</div>
                        </div>
                        <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info)' }}>
                                {completed.filter(c => c.isGraded && c.exam?.resultsPublished).length}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Results Published</div>
                        </div>
                    </div>

                    {/* Per-exam performance bars */}
                    {completed.filter(c => c.isGraded).length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Exam-wise Scores</h4>
                            {completed.filter(c => c.isGraded).map(sub => {
                                const pct = sub.exam ? Math.round((sub.totalScore / sub.exam.totalMarks) * 100) : 0;
                                return (
                                    <div key={sub.id} style={{ marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                                            <span style={{ color: 'var(--text-primary)' }}>{sub.exam?.title}</span>
                                            <span style={{ color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
                                                {sub.totalScore}/{sub.exam?.totalMarks} ({pct}%)
                                            </span>
                                        </div>
                                        <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-card)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 4, width: `${pct}%`,
                                                background: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)',
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Upcoming Exams */}
            <div id="upcoming-section" style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>📋 Upcoming Exams</h2>
                {upcoming.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No upcoming exams. You're all caught up! 🎉
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 16 }}>
                        {upcoming.map(exam => (
                            <div key={exam.id} className="card card-glow">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{exam.title}</h3>
                                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><BookOpen size={14} /> {exam.subject}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={14} /> {exam.duration} min</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={14} /> {new Date(exam.scheduledDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <span className="badge badge-accent">{exam.totalMarks} marks</span>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => toggleExam(exam.id)}
                                        >
                                            {expandedExam === exam.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            Details
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => navigate(`/student/exam/${exam.id}`)}
                                        >
                                            <PlayCircle size={16} /> Start Exam
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedExam === exam.id && (
                                    <div style={{
                                        marginTop: 16, padding: 16, background: 'var(--bg-input)',
                                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                                        animation: 'scaleIn 0.2s ease'
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
                                            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>QUESTIONS</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{exam.questions.length}</div>
                                            </div>
                                            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>MCQ</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{exam.questions.filter(q => q.type === 'mcq').length}</div>
                                            </div>
                                            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>SUBJECTIVE</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{exam.questions.filter(q => q.type === 'subjective').length}</div>
                                            </div>
                                            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>SCHEDULED</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(exam.scheduledDate).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <span className="badge badge-info"><Eye size={11} /> Webcam Required</span>
                                            <span className="badge badge-warning"><AlertTriangle size={11} /> Tab Switches Monitored</span>
                                            <span className="badge badge-accent"><Clock size={11} /> Auto-submit on expiry</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Completed Exams */}
            <div id="completed-section">
                <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>✅ Completed Exams</h2>
                {completed.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No completed exams yet.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 16 }}>
                        {completed.map(sub => {
                            const exam = sub.exam;
                            const pct = exam ? Math.round((sub.totalScore / exam.totalMarks) * 100) : 0;
                            const isPublished = exams.find(e => e.id === sub.examId)?.resultsPublished;

                            return (
                                <div key={sub.id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{exam?.title}</h3>
                                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            {sub.tabSwitches > 0 && (
                                                <span className={`badge ${sub.tabSwitches > 3 ? 'badge-danger' : 'badge-warning'}`}>
                                                    <Eye size={11} /> {sub.tabSwitches} switches
                                                </span>
                                            )}
                                            {!isPublished ? (
                                                <span className="badge badge-warning">Result Pending</span>
                                            ) : sub.isGraded ? (
                                                <span className={`badge ${pct >= 70 ? 'badge-success' : pct >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                                                    {sub.totalScore}/{exam?.totalMarks} ({pct}%)
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning">Grading Pending</span>
                                            )}
                                            <button className="btn btn-secondary btn-sm" onClick={() => toggleCompleted(sub.id)}>
                                                {expandedCompleted === sub.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                Details
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Completed Details */}
                                    {expandedCompleted === sub.id && (
                                        <div style={{
                                            marginTop: 16, padding: 16, background: 'var(--bg-input)',
                                            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                                            animation: 'scaleIn 0.2s ease'
                                        }}>
                                            {!isPublished ? (
                                                <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--warning)', marginBottom: 4 }}>Result Pending</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Awaiting Examiner Approval</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 16 }}>
                                                        <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>SCORE</div>
                                                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                                                                {sub.isGraded ? `${sub.totalScore}/${exam?.totalMarks}` : '—'}
                                                            </div>
                                                        </div>
                                                        <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>PERCENTAGE</div>
                                                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                                                                {sub.isGraded ? `${pct}%` : '—'}
                                                            </div>
                                                        </div>
                                                        <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>TAB SWITCHES</div>
                                                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: sub.tabSwitches > 3 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                                {sub.tabSwitches}
                                                            </div>
                                                        </div>
                                                        <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>SNAPSHOTS</div>
                                                            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{sub.webcamSnapshots?.length || 0}</div>
                                                        </div>
                                                    </div>

                                                    {/* Quick question breakdown */}
                                                    {sub.isGraded && exam && (
                                                        <div>
                                                            <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Question Breakdown</h4>
                                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                {exam.questions.map((q, i) => {
                                                                    const grade = sub.grades?.[q.id];
                                                                    const isCorrect = grade != null && grade > 0;
                                                                    return (
                                                                        <div key={q.id} title={`Q${i + 1}: ${grade}/${q.marks}`} style={{
                                                                            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: '0.75rem', fontWeight: 700, cursor: 'default',
                                                                            background: grade == null ? 'var(--bg-card)' : isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)',
                                                                            color: grade == null ? 'var(--text-muted)' : isCorrect ? 'var(--success)' : 'var(--danger)',
                                                                            border: `1px solid ${grade == null ? 'var(--border)' : isCorrect ? 'var(--success)' : 'var(--danger)'}`
                                                                        }}>
                                                                            Q{i + 1}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {!isPublished && (
                                                <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <AlertTriangle size={14} /> Waiting for Examiner Approval.
                                                </div>
                                            )}

                                            {isPublished && (
                                                <button className="btn btn-primary btn-sm" onClick={() => navigate('/student/results')} style={{ marginTop: 12 }}>
                                                    <FileText size={14} /> View Full Results
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
