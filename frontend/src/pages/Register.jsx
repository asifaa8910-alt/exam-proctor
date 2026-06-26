import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Mail, Lock } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student');
    const [selectedExaminer, setSelectedExaminer] = useState('');
    const [customExaminerId, setCustomExaminerId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    const { register, examiners, settings } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        const exId = role === 'student' ? selectedExaminer : customExaminerId;
        if (!exId || exId.trim() === '') {
            setError(role === 'student' ? 'Please select an Examiner' : 'Please enter a unique Examiner ID');
            return;
        }

        const result = await register(name, email, password, role, exId);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 1500);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-wrapper">
                {/* Left side info & illustration */}
                <div className="auth-side-panel">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <ShieldCheck size={32} style={{ color: 'var(--accent)' }} />
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>ExamProctor</h2>
                        </div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, color: '#ffffff' }}>
                            Join a Secure Academic Assessment Network
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 16 }}>
                            Register as a Student to access scheduled tests under your Examiner, or create a unique Examiner ID to build and proctor tests with automated cheating checks.
                        </p>
                    </div>
                    
                    <div className="auth-illustration-container">
                        <img 
                            src="/proctor_illustration.png" 
                            alt="Proctoring System Illustration" 
                            style={{ 
                                width: '100%', 
                                borderRadius: 'var(--radius-md)', 
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-md)',
                                display: 'block' 
                            }} 
                        />
                    </div>
                </div>

                {/* Right side form */}
                <div className="auth-card">
                    <div className="auth-logo">
                        <ShieldCheck size={40} style={{ color: 'var(--accent)', marginBottom: 8 }} className="mobile-logo" />
                        <h1>Create Account</h1>
                        <p>Get started with ExamProctor today</p>
                    </div>

                    <div className="role-toggle" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
                        <button
                            className={role === 'student' ? 'active' : ''}
                            onClick={() => { setRole('student'); setError(''); }}
                            type="button"
                        >
                            Student Registration
                        </button>
                        <button
                            className={role === 'examiner' ? 'active' : ''}
                            onClick={() => { setRole('examiner'); setError(''); }}
                            type="button"
                        >
                            Examiner Registration
                        </button>
                    </div>

                    {error && (
                        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 16 }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 16 }}>
                            Registration successful! Redirecting to login...
                        </div>
                    )}

                    {role === 'student' && settings?.allow_student_registration === 'false' && (
                        <div style={{ 
                            background: 'var(--danger-bg)', 
                            border: '1px solid var(--danger)', 
                            color: 'var(--danger)', 
                            padding: '12px 16px', 
                            borderRadius: 'var(--radius-md)', 
                            fontSize: '0.85rem', 
                            marginBottom: 20,
                            textAlign: 'center',
                            fontWeight: 500
                        }}>
                            ⚠️ Student registration is currently disabled by the administrator. Please contact your examiner.
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="form-input" type="text" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required style={{ paddingLeft: 40 }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="form-input" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required style={{ paddingLeft: 40 }} />
                            </div>
                        </div>

                        {role === 'student' ? (
                            <div className="form-group">
                                <label className="form-label">Assigned Examiner</label>
                                <select
                                    className="form-select"
                                    value={selectedExaminer}
                                    onChange={e => setSelectedExaminer(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose your Examiner --</option>
                                    {examiners.map(ex => (
                                        <option key={ex.examinerId} value={ex.examinerId}>
                                            {ex.name} ({ex.examinerId})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Unique Examiner ID (Create your own)</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. EXM-SMITH, EXM-102"
                                    value={customExaminerId}
                                    onChange={e => setCustomExaminerId(e.target.value.toUpperCase())}
                                    required
                                />
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                                    This ID associates students to your exams.
                                </span>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="form-input" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingLeft: 40 }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="form-input" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ paddingLeft: 40 }} />
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary btn-lg" 
                            type="submit" 
                            disabled={role === 'student' && settings?.allow_student_registration === 'false'} 
                            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                        >
                            Create Account
                        </button>
                    </form>

                    <div className="auth-footer" style={{ marginTop: 16, textAlign: 'center', fontSize: '0.88rem' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
