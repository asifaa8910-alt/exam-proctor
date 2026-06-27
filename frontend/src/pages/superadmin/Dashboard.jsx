import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { api } from '../../services/api';
import {
    ShieldAlert, Users, FileText, ClipboardCheck,
    Clock, ShieldCheck, Activity, Settings, Database,
    CheckCircle, AlertTriangle, Save, RotateCcw, PlayCircle, Info
} from 'lucide-react';


export default function SuperAdminDashboard() {
    const { user, settings, updateSettings } = useAuth();
    const { exams, submissions, fetchExams, fetchSubmissions } = useExam();
    const [stats, setStats] = useState({
        studentsCount: 0,
        examinersCount: 0,
        examsCount: 0,
        submissionsCount: 0
    });
    const [examiners, setExaminers] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [liveLogs, setLiveLogs] = useState([]);
    const [liveUsers, setLiveUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const { socket } = useAuth();

    // Settings form state
    const [allowReg, setAllowReg] = useState(true);
    const [proctorEnabled, setProctorEnabled] = useState(true);
    const [maxSwitches, setMaxSwitches] = useState(3);
    const [announcement, setAnnouncement] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsError, setSettingsError] = useState('');
    const [settingsSuccess, setSettingsSuccess] = useState('');

    // Maintenance state
    const [maintenanceSuccess, setMaintenanceSuccess] = useState('');
    const [maintenanceError, setMaintenanceError] = useState('');
    const [maintenanceRunning, setMaintenanceRunning] = useState(false);

    const fetchSystemOverview = async () => {
        try {
            // Fetch all students (returns all for superadmin)
            const studentsData = await api.get('/auth/students');
            
            // Fetch all examiners list
            const examinersData = await api.get('/auth/examiners-list');
            setExaminers(examinersData.examiners || []);
            
            setStats({
                studentsCount: studentsData.students?.length || 0,
                examinersCount: examinersData.examiners?.length || 0,
                examsCount: exams.length,
                submissionsCount: submissions.length
            });

            // Generate recent logs from submissions
            const logs = submissions.map(s => {
                const exam = exams.find(e => e.id === s.examId);
                return {
                    type: 'submission',
                    text: `Student ID "${s.studentId}" submitted exam "${exam?.title || s.examId}"`,
                    time: s.submittedAt,
                    detail: `Score: ${s.totalScore} | Tab switches: ${s.tabSwitches}`,
                    color: s.tabSwitches > 3 ? 'var(--danger)' : 'var(--success)'
                };
            });
            
            setRecentLogs(logs.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10));
        } catch (err) {
            console.error('Failed to load superadmin overview:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleActivity = (act) => {
            setLiveLogs(prev => [act, ...prev].slice(0, 15));
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

        socket.on('active-users-update', (list) => {
            setLiveUsers(list || []);
        });

        // Fetch live users registry initially
        api.get('/auth/live-users')
            .then(data => {
                setLiveUsers(data.activeUsers || []);
            })
            .catch(err => console.error('Failed initial live users fetch:', err));

        return () => {
            socket.off('activity');
            socket.off('violation');
            socket.off('active-users-update');
        };
    }, [socket]);

    const recentActivityLogs = useMemo(() => {
        const staticLogs = submissions.map(s => {
            const exam = exams.find(e => e.id === s.examId);
            return {
                type: 'submission',
                text: `Student "${s.studentName || s.studentId}" submitted "${exam?.title || s.examId}"`,
                time: s.submittedAt,
                detail: `Score: ${s.totalScore} | Tab switches: ${s.tabSwitches}`,
                color: s.tabSwitches > 3 ? 'var(--danger)' : 'var(--success)'
            };
        });
        
        const combined = [...liveLogs, ...staticLogs];
        return combined.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
    }, [submissions, exams, liveLogs]);

    useEffect(() => {
        if (user) {
            fetchSystemOverview();
        }
    }, [user, exams, submissions]);

    // Sync settings state
    useEffect(() => {
        if (settings) {
            setAllowReg(settings.allow_student_registration === 'true');
            setProctorEnabled(settings.proctoring_enabled === 'true');
            setMaxSwitches(parseInt(settings.max_tab_switches || 3));
            setAnnouncement(settings.announcement_banner || '');
        }
    }, [settings]);

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        setSettingsError('');
        setSettingsSuccess('');

        try {
            const res = await updateSettings({
                allow_student_registration: String(allowReg),
                proctoring_enabled: String(proctorEnabled),
                max_tab_switches: String(maxSwitches),
                announcement_banner: announcement
            });

            if (res.success) {
                setSettingsSuccess('System settings updated successfully!');
            } else {
                setSettingsError(res.error || 'Failed to save configurations');
            }
        } catch (err) {
            setSettingsError(err.message);
        } finally {
            setSavingSettings(false);
        }
    };

    // Maintenance Operations
    const handleResetDb = async () => {
        if (!window.confirm('WARNING: This will drop ALL database tables, purge all students, exams, submissions, logs, and restore the initial seeded configuration. Are you sure you want to proceed?')) {
            return;
        }

        setMaintenanceRunning(true);
        setMaintenanceSuccess('');
        setMaintenanceError('');

        try {
            const data = await api.post('/auth/system/reset');
            setMaintenanceSuccess(data.message || 'Database reset successfully!');
            
            // Reload context states and data
            await fetchExams();
            await fetchSubmissions();
            await fetchSystemOverview();
        } catch (err) {
            setMaintenanceError(err.message || 'Reset failed.');
        } finally {
            setMaintenanceRunning(false);
        }
    };

    const handleClearLogs = async () => {
        if (!window.confirm('WIPE CONFIRMATION: Are you sure you want to wipe ALL exam submissions and proctor logs? Exams and accounts will remain intact.')) {
            return;
        }

        setMaintenanceRunning(true);
        setMaintenanceSuccess('');
        setMaintenanceError('');

        try {
            const data = await api.post('/auth/system/clear-logs');
            setMaintenanceSuccess(data.message || 'Purged submissions and logs successfully!');
            await fetchSubmissions();
            await fetchSystemOverview();
        } catch (err) {
            setMaintenanceError(err.message || 'Purge failed.');
        } finally {
            setMaintenanceRunning(false);
        }
    };

    const handleGenerateMock = async () => {
        setMaintenanceRunning(true);
        setMaintenanceSuccess('');
        setMaintenanceError('');

        try {
            const data = await api.post('/auth/system/generate-mock');
            setMaintenanceSuccess(data.message || 'Mock submissions seeded successfully!');
            await fetchSubmissions();
            await fetchSystemOverview();
        } catch (err) {
            setMaintenanceError(err.message || 'Mock seeding failed. Please ensure exams and students exist first.');
        } finally {
            setMaintenanceRunning(false);
        }
    };

    // Diagnostics calculation
    const totalSubmissions = submissions.length;
    const flaggedSubmissions = submissions.filter(s => s.tabSwitches > 3).length;
    const flagRate = totalSubmissions > 0 ? Math.round((flaggedSubmissions / totalSubmissions) * 100) : 0;

    // Circle SVG configuration
    const strokeWidth = 8;
    const sqSize = 120;
    const radius = (sqSize - strokeWidth) / 2;
    const viewBox = `0 0 ${sqSize} ${sqSize}`;
    const dashArray = radius * Math.PI * 2;
    const dashOffset = dashArray - (dashArray * flagRate) / 100;

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <h3>Loading command center...</h3>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <h1>Platform Command Center</h1>
                <p>System-wide controls, diagnostic monitors, settings, and maintenance overrides</p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 28, paddingBottom: 10 }}>
                <button 
                    className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setActiveTab('overview')}
                >
                    <Activity size={16} /> Overview & Analytics
                </button>
                <button 
                    className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setActiveTab('settings')}
                >
                    <Settings size={16} /> System Policies
                </button>
                <button 
                    className={`btn ${activeTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setActiveTab('maintenance')}
                >
                    <Database size={16} /> Maintenance Center
                </button>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div>
                    {/* Diagnostic Quick Alerts */}
                    {settings?.allow_student_registration === 'false' && (
                        <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', color: 'var(--warning)', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <Info size={16} /> <strong>Notice:</strong> Student public registration is currently disabled globally.
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="stats-grid" style={{ marginBottom: 30 }}>
                        <div className="stat-card">
                            <div className="stat-icon red"><ShieldCheck size={22} /></div>
                            <div className="stat-info">
                                <h3>{stats.examinersCount}</h3>
                                <p>Total Examiners</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon blue"><Users size={22} /></div>
                            <div className="stat-info">
                                <h3>{stats.studentsCount}</h3>
                                <p>Total Students</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon purple"><FileText size={22} /></div>
                            <div className="stat-info">
                                <h3>{stats.examsCount}</h3>
                                <p>Exams Created</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green"><ClipboardCheck size={22} /></div>
                            <div className="stat-info">
                                <h3>{stats.submissionsCount}</h3>
                                <p>Total Submissions</p>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 30 }}>
                        


                        {/* Proctor Violation Rate Gauge */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.05rem', alignSelf: 'flex-start', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldAlert size={18} style={{ color: 'var(--danger)' }} /> Proctor Violation Rate
                            </h3>
                            
                            <div style={{ position: 'relative', width: sqSize, height: sqSize, marginBottom: 14 }}>
                                <svg width={sqSize} height={sqSize} viewBox={viewBox}>
                                    <circle
                                        className="circle-background"
                                        cx={sqSize / 2}
                                        cy={sqSize / 2}
                                        r={radius}
                                        strokeWidth={`${strokeWidth}px`}
                                        stroke="var(--bg-input)"
                                        fill="transparent"
                                    />
                                    <circle
                                        className="circle-progress"
                                        cx={sqSize / 2}
                                        cy={sqSize / 2}
                                        r={radius}
                                        strokeWidth={`${strokeWidth}px`}
                                        stroke={flagRate > 30 ? 'var(--danger)' : 'var(--success)'}
                                        fill="transparent"
                                        strokeDasharray={dashArray}
                                        strokeDashoffset={dashOffset}
                                        transform={`rotate(-90 ${sqSize / 2} ${sqSize / 2})`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                    justifyContent: 'center', alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{flagRate}%</span>
                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flagged</span>
                                </div>
                            </div>
                            
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 280 }}>
                                <strong>{flaggedSubmissions}</strong> out of <strong>{totalSubmissions}</strong> submissions have breached the tab switch limit (&gt; 3 switches).
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        {/* Database Summary */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.05rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Activity size={18} style={{ color: 'var(--accent)' }} /> Database Summary
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ padding: 14, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Student/Examiner Ratio</h4>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Distribution factor</span>
                                    </div>
                                    <span style={{ fontWeight: 700 }}>
                                        {stats.examinersCount > 0 ? (stats.studentsCount / stats.examinersCount).toFixed(1) : 0} : 1
                                    </span>
                                </div>

                                <div style={{ padding: 14, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Average Submissions per Exam</h4>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Engagement metrics</span>
                                    </div>
                                    <span style={{ fontWeight: 700 }}>
                                        {stats.examsCount > 0 ? (stats.submissionsCount / stats.examsCount).toFixed(1) : 0}
                                    </span>
                                </div>

                                <div style={{ padding: 14, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Database Server</h4>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>File-based relational SQL</span>
                                    </div>
                                    <span className="badge badge-success" style={{ fontWeight: 700 }}>SQLite 3 (ONLINE)</span>
                                </div>
                            </div>
                        </div>

                        {/* Live Logged-in Users */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.05rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                                Live Logged-in Users ({liveUsers.length})
                            </h3>
                            {liveUsers.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No active users online</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}>
                                    {liveUsers.map((u, i) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                            fontSize: '0.8rem', border: '1px solid var(--border)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{u.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                            </div>
                                            <span className={`badge ${u.role === 'superadmin' ? 'badge-danger' : u.role === 'examiner' ? 'badge-info' : 'badge-accent'}`}>
                                                {u.role}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Activity Log */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.05rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={18} style={{ color: 'var(--info)' }} /> Global Activity Timeline
                            </h3>
                            {recentActivityLogs.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No logs recorded yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}>
                                    {recentActivityLogs.map((log, i) => (
                                        <div key={i} style={{
                                            display: 'flex', gap: 12, padding: '10px 12px',
                                            background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                            borderLeft: `3px solid ${log.color || 'var(--accent)'}`, fontSize: '0.8rem'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{log.text}</div>
                                                {log.detail && (
                                                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{log.detail}</div>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={10} /> {new Date(log.time).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SYSTEM SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Settings size={18} style={{ color: 'var(--accent)' }} /> Global Policies & Configuration
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
                        Set application behaviors, security rules, and active proctoring criteria globally.
                    </p>

                    <form onSubmit={handleSaveSettings}>
                        {settingsSuccess && (
                            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 16 }}>
                                {settingsSuccess}
                            </div>
                        )}
                        {settingsError && (
                            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 16 }}>
                                {settingsError}
                            </div>
                        )}

                        {/* Toggle allow student registration */}
                        <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ flex: 1, paddingRight: 16 }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 2 }}>Allow Student Registration</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>If disabled, students cannot register new accounts from the landing page.</p>
                            </div>
                            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                                <input 
                                    type="checkbox" 
                                    checked={allowReg} 
                                    onChange={(e) => setAllowReg(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', inset: 0,
                                    background: allowReg ? 'var(--success)' : 'var(--text-muted)',
                                    borderRadius: 34, transition: '0.3s',
                                    display: 'flex', alignItems: 'center', padding: 2
                                }}>
                                    <span style={{
                                        width: 20, height: 20, background: '#ffffff',
                                        borderRadius: '50%', transition: '0.3s',
                                        transform: allowReg ? 'translateX(20px)' : 'translateX(0)'
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* Toggle active proctoring */}
                        <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ flex: 1, paddingRight: 16 }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 2 }}>Active Proctored Mode</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bypasses webcam validation and tab visibility checks for student exams if disabled.</p>
                            </div>
                            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                                <input 
                                    type="checkbox" 
                                    checked={proctorEnabled} 
                                    onChange={(e) => setProctorEnabled(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', inset: 0,
                                    background: proctorEnabled ? 'var(--success)' : 'var(--text-muted)',
                                    borderRadius: 34, transition: '0.3s',
                                    display: 'flex', alignItems: 'center', padding: 2
                                }}>
                                    <span style={{
                                        width: 20, height: 20, background: '#ffffff',
                                        borderRadius: '50%', transition: '0.3s',
                                        transform: proctorEnabled ? 'translateX(20px)' : 'translateX(0)'
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* Max tab switches */}
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="form-label" style={{ fontWeight: 600 }}>Maximum Tab Switches (Violations Limit)</label>
                            <input 
                                className="form-input" 
                                type="number" 
                                min="1" 
                                max="20"
                                value={maxSwitches} 
                                onChange={(e) => setMaxSwitches(parseInt(e.target.value))}
                                required 
                                disabled={!proctorEnabled}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                                Students exceeding this visibility switch count will have their exams auto-submitted instantly.
                            </span>
                        </div>

                        {/* System announcement */}
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label" style={{ fontWeight: 600 }}>Global Announcement Banner</label>
                            <textarea 
                                className="form-input" 
                                style={{ minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }}
                                placeholder="Enter banner message text here..."
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                                Rendered at the top of Student and Examiner dashboards. Leave empty to disable the banner.
                            </span>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={savingSettings}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            <Save size={16} /> {savingSettings ? 'Saving Configuration...' : 'Save Configuration'}
                        </button>
                    </form>
                </div>
            )}

            {/* MAINTENANCE CENTER TAB */}
            {activeTab === 'maintenance' && (
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                    
                    {/* Maintenance Header */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Database size={18} style={{ color: 'var(--accent)' }} /> Maintenance Center
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                            Perform low-level system wipes, database resets, or seed diagnostic simulation data.
                        </p>
                    </div>

                    {maintenanceSuccess && (
                        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 16 }}>
                            {maintenanceSuccess}
                        </div>
                    )}
                    {maintenanceError && (
                        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 16 }}>
                            {maintenanceError}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        
                        {/* Simulation data generator */}
                        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <PlayCircle size={16} style={{ color: 'var(--success)' }} /> Seed Mock Exam Submissions
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    Generates completed tests with automated MCQ grading and tab-switch records for active exams to test proctoring dashboards instantly.
                                </p>
                            </div>
                            <button 
                                className="btn btn-secondary" 
                                onClick={handleGenerateMock}
                                disabled={maintenanceRunning}
                            >
                                Generate Submissions
                            </button>
                        </div>

                        {/* Wiping logs */}
                        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderLeft: '3px solid var(--warning)' }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning)' }}>
                                    <ShieldAlert size={16} /> Wipe Exam Submissions
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    Clears all student exam answers, proctor tab-switches timeline, and captured camera photos. Accounts and exam sheets are left intact.
                                </p>
                            </div>
                            <button 
                                className="btn btn-danger" 
                                style={{ background: 'var(--warning)', color: '#0f0f1a' }}
                                onClick={handleClearLogs}
                                disabled={maintenanceRunning}
                            >
                                Purge Logs
                            </button>
                        </div>

                        {/* RESET OVERRIDE */}
                        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, border: '1px solid var(--danger)', borderLeft: '4px solid var(--danger)', background: 'rgba(255, 107, 129, 0.03)' }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}>
                                    <RotateCcw size={16} /> Reset System Database
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    Drops all SQL tables, clears all registry configurations, and seeds default examiners (Sharma, Kelly), students (Asif, Priya, Rahul, Sneha), and settings.
                                </p>
                            </div>
                            <button 
                                className="btn btn-danger" 
                                onClick={handleResetDb}
                                disabled={maintenanceRunning}
                            >
                                Reset DB
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
