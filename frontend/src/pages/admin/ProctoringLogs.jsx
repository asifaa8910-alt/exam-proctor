import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { Eye, AlertTriangle, Camera, Clock, User } from 'lucide-react';

export default function ProctoringLogs() {
    const { getStudents } = useAuth();
    const { exams, submissions } = useExam();
    const [selectedExam, setSelectedExam] = useState('');

    const students = getStudents();
    const examSubmissions = selectedExam
        ? submissions.filter(s => s.examId === selectedExam)
        : [];

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Proctoring Logs</h1>
                <p>Review tab switches and webcam snapshots per student</p>
            </div>

            {/* Exam Selector */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Exam</label>
                    <select className="form-select" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                        <option value="">-- Choose an exam --</option>
                        {exams.map(e => (
                            <option key={e.id} value={e.id}>{e.title} ({e.subject})</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedExam && examSubmissions.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <Eye size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>No submissions found for this exam.</p>
                </div>
            )}

            {examSubmissions.map(sub => {
                const student = students.find(s => s.id === sub.studentId);
                const isFlagged = sub.tabSwitches > 3;

                return (
                    <div key={sub.id} className="card" style={{ marginBottom: 20 }}>
                        {/* Student Header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: 20, flexWrap: 'wrap', gap: 12
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 'var(--radius-full)',
                                    background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem'
                                }}>
                                    {student?.name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem' }}>{student?.name || 'Unknown'}</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student?.email}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {isFlagged && (
                                    <span className="badge badge-danger">
                                        <AlertTriangle size={12} /> Flagged
                                    </span>
                                )}
                                <span className="badge badge-info">
                                    <Clock size={12} /> {new Date(sub.submittedAt).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
                            <div style={{
                                padding: '14px', borderRadius: 'var(--radius-md)',
                                background: sub.tabSwitches > 3 ? 'var(--danger-bg)' : 'var(--bg-input)',
                                border: `1px solid ${sub.tabSwitches > 3 ? 'var(--danger)' : 'var(--border)'}`,
                                textAlign: 'center'
                            }}>
                                <Eye size={20} style={{ color: sub.tabSwitches > 3 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 4 }} />
                                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: sub.tabSwitches > 3 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                    {sub.tabSwitches}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tab Switches</div>
                            </div>
                            <div style={{
                                padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)',
                                border: '1px solid var(--border)', textAlign: 'center'
                            }}>
                                <Camera size={20} style={{ color: 'var(--accent)', marginBottom: 4 }} />
                                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{sub.webcamSnapshots?.length || 0}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Snapshots</div>
                            </div>
                            <div style={{
                                padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)',
                                border: '1px solid var(--border)', textAlign: 'center'
                            }}>
                                <User size={20} style={{ color: 'var(--success)', marginBottom: 4 }} />
                                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{sub.totalScore || '-'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</div>
                            </div>
                        </div>

                        {/* Snapshots */}
                        {sub.webcamSnapshots && sub.webcamSnapshots.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                                    📷 Webcam Snapshots
                                </h4>
                                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                                    {sub.webcamSnapshots.map((snap, i) => (
                                        <div key={i} style={{
                                            borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0,
                                            border: '1px solid var(--border)', width: 140
                                        }}>
                                            <img src={snap.image} alt={`Snapshot ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                                            <div style={{
                                                padding: '4px 8px', background: 'var(--bg-card)',
                                                fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center'
                                            }}>
                                                {new Date(snap.time).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
