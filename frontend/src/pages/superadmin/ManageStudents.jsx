import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { api } from '../../services/api';
import Modal from '../../components/Modal';
import { UserPlus, Trash2, User, BookOpen } from 'lucide-react';

export default function SuperAdminStudents() {
    const { addStudent, removeStudent, examiners } = useAuth();
    const { exams, assignExamToStudents } = useExam();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignStudentId, setAssignStudentId] = useState(null);
    const [selectedExams, setSelectedExams] = useState([]);
    
    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExaminerFilter, setSelectedExaminerFilter] = useState('');

    // Deletion modal state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // Add student form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [studentExaminerId, setStudentExaminerId] = useState('');
    const [error, setError] = useState('');

    const fetchAllStudents = async () => {
        try {
            setLoading(true);
            const data = await api.get('/auth/students');
            setStudents(data.students || []);
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllStudents();
    }, []);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setError('');

        if (!studentExaminerId) {
            setError('Please assign an examiner');
            return;
        }

        try {
            // Add student via AuthContext (it wraps the API call and sets state locally, but we need to fetch all student list)
            const result = await addStudent(name, email, studentExaminerId);
            if (result.success) {
                setShowAddModal(false);
                setName('');
                setEmail('');
                setStudentExaminerId('');
                setError('');
                fetchAllStudents();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAssign = async () => {
        try {
            for (const examId of selectedExams) {
                await assignExamToStudents(examId, [assignStudentId]);
            }
            setShowAssignModal(false);
            setSelectedExams([]);
            setAssignStudentId(null);
            fetchAllStudents();
        } catch (err) {
            console.error('Assign error:', err);
        }
    };

    const handleRemoveStudent = (studentId) => {
        setDeleteTargetId(studentId);
        setShowDeleteConfirm(true);
    };

    const executeDeleteStudent = async () => {
        if (!deleteTargetId) return;
        try {
            await removeStudent(deleteTargetId);
            setStudents(prev => prev.filter(s => s.id !== deleteTargetId));
            setShowDeleteConfirm(false);
            setDeleteTargetId(null);
        } catch (err) {
            alert(`Failed to remove student: ${err.message}`);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              s.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesExaminer = selectedExaminerFilter === '' || s.examinerId === selectedExaminerFilter;
        return matchesSearch && matchesExaminer;
    });

    const getAssignedExamCount = (studentId) => {
        return exams.filter(e => e.assignedStudents?.includes(studentId)).length;
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Manage Students</h1>
                    <p>View, edit, and assign students to exams globally</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <UserPlus size={16} /> Add Student
                </button>
            </div>

            {/* Search and Filter Roster Control */}
            <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', padding: '16px' }}>
                <input 
                    className="form-input" 
                    style={{ flex: 2, minWidth: 200 }} 
                    placeholder="Search by name or email..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <select 
                    className="form-select" 
                    style={{ flex: 1, minWidth: 150 }}
                    value={selectedExaminerFilter}
                    onChange={e => setSelectedExaminerFilter(e.target.value)}
                >
                    <option value="">All Examiners</option>
                    {examiners.map(ex => (
                        <option key={ex.examinerId} value={ex.examinerId}>{ex.name}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="skeleton skeleton-card" style={{ height: 50 }} />
                    <div className="skeleton skeleton-card" style={{ height: 50 }} />
                    <div className="skeleton skeleton-card" style={{ height: 50 }} />
                    <div className="skeleton skeleton-card" style={{ height: 50 }} />
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                    <User size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>No matching student records found.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Assigned Examiner ID</th>
                                <th>Assigned Exams</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                                    <td>
                                        <span className="badge badge-info">{s.examinerId || 'Unassigned'}</span>
                                    </td>
                                    <td>
                                        <span className="badge badge-accent">{getAssignedExamCount(s.id)} exams</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => {
                                                setAssignStudentId(s.id);
                                                setShowAssignModal(true);
                                            }}>
                                                <BookOpen size={13} /> Assign Exam
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleRemoveStudent(s.id)} style={{ padding: '6px 8px' }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Student Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Student">
                <form onSubmit={handleAddStudent}>
                    {error && (
                        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 14 }}>
                            {error}
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input className="form-input" type="text" placeholder="Student name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" placeholder="student@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Assign Examiner</label>
                        <select
                            className="form-select"
                            value={studentExaminerId}
                            onChange={e => setStudentExaminerId(e.target.value)}
                            required
                        >
                            <option value="">-- Select Examiner --</option>
                            {examiners.map(ex => (
                                <option key={ex.examinerId} value={ex.examinerId}>
                                    {ex.name} ({ex.examinerId})
                                </option>
                            ))}
                        </select>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                        Default password will be: student123
                    </p>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary"><UserPlus size={14} /> Add Student</button>
                    </div>
                </form>
            </Modal>

            {/* Assign Exam Modal */}
            <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Exams">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
                    Select exams to assign to <strong>{students.find(s => s.id === assignStudentId)?.name}</strong>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {exams.filter(e => e.status === 'published').map(exam => (
                        <label key={exam.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                            background: selectedExams.includes(exam.id) ? 'var(--accent-glow)' : 'var(--bg-input)',
                            borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            border: `1px solid ${selectedExams.includes(exam.id) ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                            <input type="checkbox" checked={selectedExams.includes(exam.id)}
                                onChange={() => setSelectedExams(prev =>
                                    prev.includes(exam.id) ? prev.filter(id => id !== exam.id) : [...prev, exam.id]
                                )}
                                style={{ accentColor: 'var(--accent)' }}
                            />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{exam.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exam.subject} • {exam.duration} min</div>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleAssign} disabled={selectedExams.length === 0}>
                        Assign ({selectedExams.length})
                    </button>
                </div>
            </Modal>

            {/* Custom Cascading Confirmation Modal */}
            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Student Deletion">
                <p style={{ marginBottom: 16, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Are you sure you want to permanently delete student <strong>{students.find(s => s.id === deleteTargetId)?.name}</strong>?
                </p>
                <div style={{ background: 'var(--danger-bg)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', fontSize: '0.82rem', marginBottom: 20 }}>
                    <p style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>⚠️ Warning: Cascading Deletion Triggered</p>
                    <p style={{ margin: 0, color: 'var(--text-primary)' }}>This action cannot be undone and will purge all student data from the database, including:</p>
                    <ul style={{ paddingLeft: 16, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <li>All completed and graded exam submissions</li>
                        <li>Captured webcam snapshots gallery</li>
                        <li>Logged proctoring violation counts and timelines</li>
                        <li>References and assignments inside active exams</li>
                    </ul>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                    <button className="btn btn-danger" onClick={executeDeleteStudent}>Confirm Cascade Delete</button>
                </div>
            </Modal>
        </div>
    );
}
