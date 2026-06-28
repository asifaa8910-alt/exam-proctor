import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import {
    FileText, Users, ClipboardCheck, AlertTriangle, Clock,
    ChevronDown, ChevronUp, Eye, Award, BookOpen, Calendar, CheckCircle,
    TrendingUp, UserX, Key, Activity
} from 'lucide-react';


export default function ExaminerDashboard() {
    const { user, getStudents, settings } = useAuth();
    const { exams, submissions } = useExam();
    const navigate = useNavigate();
    const [expandedSection, setExpandedSection] = useState(null);
    const [expandedExam, setExpandedExam] = useState(null);

    const students = getStudents();
    const pendingGrading = submissions.filter(s => !s.isGraded);
    const flaggedStudents = submissions.filter(s => s.tabSwitches > 3);
    const gradedSubmissions = submissions.filter(s => s.isGraded);
    const avgScore = gradedSubmissions.length > 0
        ? Math.round(gradedSubmissions.reduce((s, sub) => {
            const exam = exams.find(e => e.id === sub.examId);
            return s + (exam ? (sub.totalScore / exam.totalMarks) * 100 : 0);
        }, 0) / gradedSubmissions.length)
        : 0;

    const toggleSection = (section) => setExpandedSection(prev => prev === section ? null : section);

    const getExamStats = (examId) => {
        const subs = submissions.filter(s => s.examId === examId);
        const graded = subs.filter(s => s.isGraded);
        const avg = graded.length > 0 ? Math.round(graded.reduce((s, sub) => s + sub.totalScore, 0) / graded.length) : 0;
        const flagged = subs.filter(s => s.tabSwitches > 3).length;
        return { total: subs.length, graded: graded.length, avg, flagged };
    };

    const [liveActivities, setLiveActivities] = useState([]);
    const { socket } = useAuth();

    useEffect(() => {
        if (!socket) return;

        const handleActivity = (act) => {
            setLiveActivities(prev => [act, ...prev].slice(0, 15));
        };

        socket.on('activity', handleActivity);
        socket.on('violation', (v) => {
            handleActivity({
                type: 'violation',
                text: `Student "${v.studentName}" triggered violation: ${v.eventType.replace('_', ' ')}`,
                time: v.timestamp,
                detail: `Exam ID: ${v.examId}`,
                color: 'var(--danger)'
            });
        });

        return () => {
            socket.off('activity');
            socket.off('violation');
        };
    }, [socket]);

    const recentActivity = useMemo(() => {
        const computed = submissions.map(s => ({
            type: 'submission',
            text: `${students.find(st => st.id === s.studentId)?.name || 'Student'} submitted ${exams.find(e => e.id === s.examId)?.title || 'an exam'}`,
            time: s.submittedAt,
            color: 'var(--success)',
            detail: `Score: ${s.totalScore} | Tab Switches: ${s.tabSwitches}`
        }));
        
        const combined = [...liveActivities, ...computed];
        return combined.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
    }, [submissions, exams, students, liveActivities]);

    const getActivityIcon = (type) => {
        switch (type) {
            case 'submission': return ClipboardCheck;
            case 'violation': return AlertTriangle;
            case 'login': return Key;
            default: return Activity;
        }
    };


    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Examiner Dashboard</h1>
                <p>Overview for Examiner ID: <strong style={{ color: 'var(--accent)' }}>{user?.examinerId}</strong> ({user?.name})</p>
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

            {/* Stats — clickable to expand details */}
            <div className="stats-grid">
                <div 
                    className="stat-card" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => toggleSection('exams')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSection('exams');
                        }
                    }}
                >
                    <div className="stat-icon purple"><FileText size={22} /></div>
                    <div className="stat-info">
                        <h3>{exams.length}</h3>
                        <p>My Exams</p>
                    </div>
                    {expandedSection === 'exams' ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div 
                    className="stat-card" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => toggleSection('students')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSection('students');
                        }
                    }}
                >
                    <div className="stat-icon blue"><Users size={22} /></div>
                    <div className="stat-info">
                        <h3>{students.length}</h3>
                        <p>Assigned Students</p>
                    </div>
                    {expandedSection === 'students' ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div 
                    className="stat-card" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => toggleSection('grading')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSection('grading');
                        }
                    }}
                >
                    <div className="stat-icon orange"><ClipboardCheck size={22} /></div>
                    <div className="stat-info">
                        <h3>{pendingGrading.length}</h3>
                        <p>Pending Grading</p>
                    </div>
                </div>
                <div 
                    className="stat-card" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => toggleSection('flagged')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSection('flagged');
                        }
                    }}
                >
                    <div className="stat-icon red"><AlertTriangle size={22} /></div>
                    <div className="stat-info">
                        <h3>{flaggedStudents.length}</h3>
                        <p>Flagged Submissions</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><TrendingUp size={22} /></div>
                    <div className="stat-info">
                        <h3>{avgScore}%</h3>
                        <p>Avg Performance</p>
                    </div>
                </div>
            </div>


            {/* Expanded Detail Sections */}
            {expandedSection === 'exams' && (
                <div className="card" style={{ marginBottom: 24, animation: 'scaleIn 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1rem' }}>📚 My Exams</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/examiner/create-exam')}>
                            + Create New
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {exams.map(exam => {
                            const stats = getExamStats(exam.id);
                            return (
                                <div key={exam.id}>
                                    <div
                                        style={{
                                            padding: '14px 18px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s'
                                        }}
                                        onClick={() => setExpandedExam(prev => prev === exam.id ? null : exam.id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setExpandedExam(prev => prev === exam.id ? null : exam.id);
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{exam.title}</div>
                                                <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    <span><BookOpen size={12} style={{ verticalAlign: 'middle' }} /> {exam.subject}</span>
                                                    <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {exam.duration} min</span>
                                                    <span><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {new Date(exam.scheduledDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span className={`badge ${exam.resultsPublished ? 'badge-success' : 'badge-warning'}`}>
                                                    {exam.resultsPublished ? 'Published' : 'Unpublished'}
                                                </span>
                                                <span className="badge badge-accent">{stats.total} submissions</span>
                                                {expandedExam === exam.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Exam Details */}
                                    {expandedExam === exam.id && (
                                        <div style={{
                                            margin: '0 0 6px 0', padding: '14px 18px',
                                            background: 'var(--bg-card)', borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                                            border: '1px solid var(--border)', borderTop: 'none',
                                            animation: 'scaleIn 0.15s ease'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
                                                <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{exam.questions.length}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Questions</div>
                                                </div>
                                                <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{exam.totalMarks}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Marks</div>
                                                </div>
                                                <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{stats.graded}/{stats.total}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Graded</div>
                                                </div>
                                                <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: stats.flagged > 0 ? 'var(--danger)' : 'var(--success)' }}>{stats.flagged}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flagged</div>
                                                </div>
                                                <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>{stats.avg}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Score</div>
                                                </div>
                                                <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{exam.assignedStudents?.length || 0}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assigned</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/examiner/grade')}>
                                                    <ClipboardCheck size={13} /> Grade
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/examiner/logs')}>
                                                    <Eye size={13} /> Logs
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/examiner/results')}>
                                                    <Award size={13} /> Results
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {expandedSection === 'students' && (
                <div className="card" style={{ marginBottom: 24, animation: 'scaleIn 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1rem' }}>👥 My Students</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/examiner/students')}>Manage Students</button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Exams Taken</th>
                                    <th>Avg Score</th>
                                    <th>Flags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(s => {
                                    const studentSubs = submissions.filter(sub => sub.studentId === s.id);
                                    const gradedSubs = studentSubs.filter(sub => sub.isGraded);
                                    const studentAvg = gradedSubs.length > 0
                                        ? Math.round(gradedSubs.reduce((sum, sub) => {
                                            const ex = exams.find(e => e.id === sub.examId);
                                            return sum + (ex ? (sub.totalScore / ex.totalMarks) * 100 : 0);
                                        }, 0) / gradedSubs.length)
                                        : 0;
                                    const studentFlags = studentSubs.filter(sub => sub.tabSwitches > 3).length;

                                    return (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                                            <td><span className="badge badge-accent">{studentSubs.length}</span></td>
                                            <td>
                                                <span className={`badge ${studentAvg >= 70 ? 'badge-success' : studentAvg >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                                                    {studentAvg}%
                                                </span>
                                            </td>
                                            <td>
                                                {studentFlags > 0 ? (
                                                    <span className="badge badge-danger"><AlertTriangle size={11} /> {studentFlags}</span>
                                                ) : (
                                                    <span className="badge badge-success"><CheckCircle size={11} /> Clean</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {expandedSection === 'grading' && (
                <div className="card" style={{ marginBottom: 24, animation: 'scaleIn 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1rem' }}>📝 Pending Grading</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/examiner/grade')}>Grade Now</button>
                    </div>
                    {pendingGrading.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                            <CheckCircle size={32} style={{ marginBottom: 8, opacity: 0.5, color: 'var(--success)' }} />
                            <p>All submissions are graded! 🎉</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {pendingGrading.map(sub => {
                                const student = students.find(s => s.id === sub.studentId);
                                const exam = exams.find(e => e.id === sub.examId);
                                const ungradedCount = exam ? exam.questions.filter(q => sub.grades?.[q.id] === null || sub.grades?.[q.id] === undefined).length : 0;
                                return (
                                    <div key={sub.id} style={{
                                        padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student?.name}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}> — {exam?.title}</span>
                                        </div>
                                        <span className="badge badge-warning">{ungradedCount} questions</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {expandedSection === 'flagged' && (
                <div className="card" style={{ marginBottom: 24, animation: 'scaleIn 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1rem' }}>🚨 Flagged Students</h3>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/examiner/logs')}>View Logs</button>
                    </div>
                    {flaggedStudents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                            <CheckCircle size={32} style={{ marginBottom: 8, opacity: 0.5, color: 'var(--success)' }} />
                            <p>No flagged students. All clear! ✅</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {flaggedStudents.map(sub => {
                                const student = students.find(s => s.id === sub.studentId);
                                const exam = exams.find(e => e.id === sub.examId);
                                return (
                                    <div key={sub.id} style={{
                                        padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        border: '1px solid rgba(255,107,129,0.2)'
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--danger)' }}>
                                                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                                {student?.name}
                                            </span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}> — {exam?.title}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span className="badge badge-danger"><Eye size={11} /> {sub.tabSwitches} switches</span>
                                            <span className="badge badge-accent">{sub.webcamSnapshots?.length || 0} snaps</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Activity */}
            <div className="card">
                <h3 style={{ fontSize: '1.05rem', marginBottom: 20 }}>📋 Recent Activity</h3>
                {recentActivity.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No recent activity</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {recentActivity.map((item, i) => {
                            const Icon = getActivityIcon(item.type);
                            return (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                                    background: 'var(--bg-input)', borderRadius: 'var(--radius-md)'
                                }}>
                                    <Icon size={18} style={{ color: item.color || 'var(--accent)', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.85rem' }}>{item.text}</span>
                                        {item.detail && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.detail}</div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        <Clock size={12} style={{ verticalAlign: 'middle' }} /> {new Date(item.time).toLocaleTimeString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
