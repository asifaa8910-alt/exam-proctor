import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { api } from '../../services/api';
import { Eye, AlertTriangle, Camera, Clock, User, ClipboardCheck, Search, ShieldAlert } from 'lucide-react';

export default function SystemLogs() {
    const { exams, submissions } = useExam();
    const { examiners } = useAuth();
    const [students, setStudents] = useState([]);
    const [selectedSubId, setSelectedSubId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Tab & Audit State
    const [logTab, setLogTab] = useState('proctoring'); // 'proctoring' or 'audit'
    const [auditLogs, setAuditLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [proctorSearch, setProctorSearch] = useState('');
    const [proctorFilter, setProctorFilter] = useState('all'); // 'all' | 'flagged' | 'clean'
    const [auditLoading, setAuditLoading] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true);
                const data = await api.get('/auth/students');
                setStudents(data.students || []);
            } catch (err) {
                console.error('Failed to get student list:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                setAuditLoading(true);
                const data = await api.get('/auth/audit-logs');
                setAuditLogs(data.logs || []);
            } catch (err) {
                console.error('Failed to get audit logs:', err);
            } finally {
                setAuditLoading(false);
            }
        };

        if (logTab === 'audit') {
            fetchAuditLogs();
        }
    }, [logTab]);

    const selectedSub = submissions.find(s => s.id === selectedSubId);
    const selectedSubExam = selectedSub ? exams.find(e => e.id === selectedSub.examId) : null;
    const selectedSubStudent = selectedSub ? students.find(s => s.id === selectedSub.studentId) : null;

    // Filter proctoring submissions
    const filteredSubmissions = submissions.filter(sub => {
        const student = students.find(s => s.id === sub.studentId);
        const exam = exams.find(e => e.id === sub.examId);
        const nameMatch = (student?.name || '').toLowerCase().includes(proctorSearch.toLowerCase()) || 
                          (exam?.title || '').toLowerCase().includes(proctorSearch.toLowerCase()) ||
                          sub.studentId.toLowerCase().includes(proctorSearch.toLowerCase());
        const isFlagged = sub.tabSwitches > 3;
        if (proctorFilter === 'flagged') return nameMatch && isFlagged;
        if (proctorFilter === 'clean') return nameMatch && !isFlagged;
        return nameMatch;
    });

    // Filter audit logs
    const filteredAuditLogs = auditLogs.filter(log => {
        const query = searchQuery.toLowerCase();
        return (
            log.userEmail.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query) ||
            log.details.toLowerCase().includes(query)
        );
    });

    const getActionBadgeClass = (action) => {
        const act = action.toUpperCase();
        if (act.includes('DELETE') || act.includes('CLEAR') || act.includes('RESET')) {
            return 'badge-danger';
        }
        if (act.includes('CREATE') || act.includes('ADD') || act.includes('REGISTER')) {
            return 'badge-accent';
        }
        if (act.includes('UPDATE')) {
            return 'badge-warning';
        }
        return 'badge-info';
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <h1>System Security & Operations Logs</h1>
                <p>Track global student proctoring activities, security violations, and system audit logs</p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 24, paddingBottom: 10 }}>
                <button
                    className={`btn ${logTab === 'proctoring' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLogTab('proctoring')}
                >
                    <Camera size={16} /> Proctoring Timeline
                </button>
                <button
                    className={`btn ${logTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLogTab('audit')}
                >
                    <ClipboardCheck size={16} /> Platform Audit logs
                </button>
            </div>

            {/* PROCTORING TAB */}
            {logTab === 'proctoring' && (
                <div>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="skeleton skeleton-card" style={{ height: 60 }} />
                            <div className="skeleton skeleton-card" style={{ height: 60 }} />
                            <div className="skeleton skeleton-card" style={{ height: 60 }} />
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                            <ClipboardCheck size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                            <p>No exam submissions recorded in the database yet.</p>
                        </div>
                    ) : (
                        <div className="admin-grade-layout">
                            {/* Submissions List */}
                            <div className="card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        Timeline logs ({filteredSubmissions.length})
                                    </h4>
                                    <input 
                                        className="form-input form-input-sm" 
                                        placeholder="Search student or exam..." 
                                        value={proctorSearch}
                                        onChange={e => setProctorSearch(e.target.value)}
                                        style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                                    />
                                    <select 
                                        className="form-select form-select-sm"
                                        value={proctorFilter}
                                        onChange={e => setProctorFilter(e.target.value)}
                                        style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                                    >
                                        <option value="all">All Submissions</option>
                                        <option value="flagged">Flagged Only</option>
                                        <option value="clean">Clean Only</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '55vh', overflowY: 'auto' }}>
                                    {filteredSubmissions.map(sub => {
                                        const student = students.find(s => s.id === sub.studentId);
                                        const exam = exams.find(e => e.id === sub.examId);
                                        const isFlagged = sub.tabSwitches > 3;

                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => setSelectedSubId(sub.id)}
                                                style={{
                                                    display: 'flex', flexDirection: 'column',
                                                    padding: '12px 14px', borderRadius: 'var(--radius-md)', border: 'none',
                                                    background: selectedSubId === sub.id ? 'var(--accent-glow)' : 'var(--bg-input)',
                                                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                                    transition: 'all 0.15s', width: '100%', gap: 4
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {student?.name || `Student ID: ${sub.studentId}`}
                                                    </span>
                                                    {isFlagged && (
                                                        <span className="badge badge-danger" style={{ scale: '0.85' }}>
                                                            <AlertTriangle size={10} /> Flagged
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                    Exam: <strong>{exam?.title || sub.examId}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                    <span>Switches: {sub.tabSwitches}</span>
                                                    <span>Snaps: {sub.webcamSnapshots?.length || 0}</span>
                                                    <span>Score: {sub.isGraded ? `${sub.totalScore}/${exam?.totalMarks || ''}` : 'Pending'}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Security Details Logs */}
                            <div>
                                {!selectedSub ? (
                                    <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                                        <Camera size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                                        <p>Select a timeline entry to inspect proctoring details</p>
                                    </div>
                                ) : (
                                    <div className="card">
                                        {/* Header Summary */}
                                        <div style={{
                                            padding: '16px 20px', borderRadius: 'var(--radius-md)',
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            marginBottom: 20
                                        }}>
                                            <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>
                                                Student: {selectedSubStudent?.name || `ID ${selectedSub.studentId}`}
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                <span>Exam: <strong>{selectedSubExam?.title}</strong></span>
                                                <span>Assigned Examiner ID: <strong>{selectedSubStudent?.examinerId}</strong></span>
                                                <span>Submission Timestamp: {new Date(selectedSub.submittedAt).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Stats row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 20 }}>
                                            <div style={{
                                                padding: '14px', borderRadius: 'var(--radius-md)',
                                                background: selectedSub.tabSwitches > 3 ? 'var(--danger-bg)' : 'var(--bg-input)',
                                                border: `1px solid ${selectedSub.tabSwitches > 3 ? 'var(--danger)' : 'var(--border)'}`,
                                                textAlign: 'center'
                                            }}>
                                                <Eye size={20} style={{ color: selectedSub.tabSwitches > 3 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 4 }} />
                                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedSub.tabSwitches > 3 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                    {selectedSub.tabSwitches}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tab Switches</div>
                                            </div>
                                            
                                            <div style={{
                                                padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)',
                                                border: '1px solid var(--border)', textAlign: 'center'
                                            }}>
                                                <Camera size={20} style={{ color: 'var(--accent)', marginBottom: 4 }} />
                                                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedSub.webcamSnapshots?.length || 0}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Snapshots</div>
                                            </div>

                                            <div style={{
                                                padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)',
                                                border: '1px solid var(--border)', textAlign: 'center'
                                            }}>
                                                <User size={20} style={{ color: 'var(--success)', marginBottom: 4 }} />
                                                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedSub.totalScore || '-'}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Marks</div>
                                            </div>
                                        </div>

                                        {/* Webcam snapshots view */}
                                        {selectedSub.webcamSnapshots && selectedSub.webcamSnapshots.length > 0 ? (
                                            <div>
                                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                                                    📷 Webcam Snapshots
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                                                    {selectedSub.webcamSnapshots.map((snap, i) => (
                                                        <div key={i} style={{
                                                            borderRadius: 'var(--radius-md)', overflow: 'hidden',
                                                            border: '1px solid var(--border)', background: 'var(--bg-input)'
                                                        }}>
                                                            <img src={snap.image} alt={`Snapshot ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                                                            <div style={{
                                                                padding: '4px 6px', background: 'var(--bg-card)',
                                                                fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center'
                                                            }}>
                                                                {new Date(snap.time).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: 30, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                No webcam snapshots recorded for this exam.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* AUDIT LOGS TAB */}
            {logTab === 'audit' && (
                <div>
                    {/* Search & Filter Bar */}
                    <div className="card" style={{ marginBottom: 20, padding: 14 }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)' }} />
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Filter audit trail by email, action, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: 42, margin: 0 }}
                            />
                        </div>
                    </div>

                    {auditLoading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <h3>Loading audit trail...</h3>
                        </div>
                    ) : filteredAuditLogs.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                            <ClipboardCheck size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                            <p>No administrative action logs match your criteria.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Actor (Email)</th>
                                        <th>Action Type</th>
                                        <th>Log Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAuditLogs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {log.userEmail}
                                            </td>
                                            <td>
                                                <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ fontSize: '0.72rem' }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
