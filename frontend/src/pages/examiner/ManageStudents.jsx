import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import Modal from '../../components/Modal';
import { UserPlus, Trash2, User, BookOpen } from 'lucide-react';

export default function ManageStudents() {
    const { getStudents, addStudent, removeStudent } = useAuth();
    const { exams, assignExamToStudents } = useExam();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignStudentId, setAssignStudentId] = useState(null);
    const [selectedExams, setSelectedExams] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const students = getStudents();

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setError('');
        const result = await addStudent(name, email);
        if (result.success) {
            setShowAddModal(false);
            setName('');
            setEmail('');
            setError('');
        } else {
            setError(result.error);
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
        } catch (err) {
            console.error('Assign error:', err);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (window.confirm('Are you sure you want to remove this student?')) {
            await removeStudent(studentId);
        }
    };

    const getAssignedExamCount = (studentId) => {
        return exams.filter(e => e.assignedStudents?.includes(studentId)).length;
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Manage Students</h1>
                    <p>View, add, and assign students to exams</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <UserPlus size={16} /> Add Student
                </button>
            </div>

            {students.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                    <User size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>No students registered yet.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Assigned Exams</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
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
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Student">
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
        </div>
    );
}
