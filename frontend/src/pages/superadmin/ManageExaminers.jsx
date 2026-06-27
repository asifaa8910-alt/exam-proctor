import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Modal from '../../components/Modal';
import { UserCheck, Trash2, Mail, UserPlus, Key } from 'lucide-react';

export default function ManageExaminers() {
    const [examiners, setExaminers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Add examiner form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [examinerId, setExaminerId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Search and Deletion States
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const fetchExaminers = async () => {
        try {
            setLoading(true);
            const data = await api.get('/auth/examiners-list');
            setExaminers(data.examiners || []);
        } catch (err) {
            console.error('Failed to fetch examiners:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExaminers();
    }, []);

    const handleAddExaminer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            // Register examiner
            await api.post('/auth/register', {
                name,
                email,
                password,
                role: 'examiner',
                examinerId: examinerId.toUpperCase()
            });

            setSuccess('Examiner registered successfully!');
            setName('');
            setEmail('');
            setPassword('');
            setExaminerId('');
            
            // Reload examiners list
            fetchExaminers();
            
            setTimeout(() => {
                setShowAddModal(false);
                setSuccess('');
            }, 1000);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteExaminer = (userId) => {
        setDeleteTargetId(userId);
        setShowDeleteConfirm(true);
    };

    const executeDeleteExaminer = async () => {
        if (!deleteTargetId) return;
        try {
            await api.delete(`/auth/users/${deleteTargetId}`);
            setExaminers(prev => prev.filter(ex => ex.id !== deleteTargetId));
            setShowDeleteConfirm(false);
            setDeleteTargetId(null);
        } catch (err) {
            alert(`Failed to delete examiner: ${err.message}`);
        }
    };

    const filteredExaminers = examiners.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.examinerId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Manage Examiners</h1>
                    <p>View stats and manage examiner profiles across the system</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <UserPlus size={16} /> Add Examiner
                </button>
            </div>

            {/* Search Filter Control Bar */}
            <div className="card" style={{ marginBottom: 20, padding: 16 }}>
                <input 
                    className="form-input"
                    placeholder="Search examiners by name, email, or ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="skeleton skeleton-card" style={{ height: 50 }} />
                    <div className="skeleton skeleton-card" style={{ height: 50 }} />
                    <div className="skeleton skeleton-card" style={{ height: 50 }} />
                </div>
            ) : filteredExaminers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                    <UserCheck size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>No matching examiners found.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Examiner ID</th>
                                <th>Students Assigned</th>
                                <th>Exams Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExaminers.map(ex => (
                                <tr key={ex.id}>
                                    <td style={{ fontWeight: 600 }}>{ex.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{ex.email}</td>
                                    <td>
                                        <span className="badge badge-info">{ex.examinerId}</span>
                                    </td>
                                    <td>
                                        <span className="badge badge-accent">{ex.studentsCount} students</span>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: 'var(--bg-hover)' }}>{ex.examsCount} exams</span>
                                    </td>
                                    <td>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteExaminer(ex.id)} style={{ padding: '6px 8px' }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Examiner Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Examiner">
                <form onSubmit={handleAddExaminer}>
                    {error && (
                        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 14 }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 14 }}>
                            {success}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input className="form-input" type="text" placeholder="Dr. Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" placeholder="jane@exam.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Unique Examiner ID</label>
                        <input className="form-input" type="text" placeholder="e.g. EXM-JANE" value={examinerId} onChange={e => setExaminerId(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>

                    <div className="modal-actions" style={{ marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary"><UserPlus size={14} /> Add Examiner</button>
                    </div>
                </form>
            </Modal>

            {/* Custom confirmation warning modal */}
            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Examiner Deletion">
                <p style={{ marginBottom: 16, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Are you sure you want to permanently delete examiner <strong>{examiners.find(ex => ex.id === deleteTargetId)?.name}</strong>?
                </p>
                <div style={{ background: 'var(--danger-bg)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', fontSize: '0.82rem', marginBottom: 20 }}>
                    <p style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>⚠️ Warning: Examiner Dissociation</p>
                    <p style={{ margin: 0, color: 'var(--text-primary)' }}>Deletions will unlink all students currently registered under this Examiner ID. Unlinked students will not be visible on examiner dashboard queries until re-assigned.</p>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                    <button className="btn btn-danger" onClick={executeDeleteExaminer}>Confirm Delete</button>
                </div>
            </Modal>
        </div>
    );
}
