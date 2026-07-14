import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [selectedExaminer, setSelectedExaminer] = useState('');
    const [error, setError] = useState('');
    const { login, examiners } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const result = await login(email, password, role, role === 'student' ? selectedExaminer : null);
        if (result.success) {
            if (role === 'student') navigate('/student/dashboard');
            else if (role === 'examiner') navigate('/examiner/dashboard');
            else if (role === 'superadmin') navigate('/superadmin/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="auth-container">
            <button className="floating-theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="auth-wrapper">
                {/* Left side info & illustration */}
                <div className="auth-side-panel">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <ShieldCheck size={32} style={{ color: 'var(--accent)' }} />
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>ExamProctor</h2>
                        </div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, color: '#ffffff' }}>
                            Intelligent Online Assessment & Integrity Proctoring
                            Its a devops illustration
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 16 }}>
                            ExamProctor provides examiners and administrators a secure environment to design tests, proctor candidates via webcam snapshots, monitor tab activity violations, and grade subjective responses.
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
                        <h1>Welcome Back</h1>
                        <p>Sign in to your ExamProctor account</p>
                    </div>

                    <div className="role-toggle" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                        <button
                            className={role === 'student' ? 'active' : ''}
                            onClick={() => { setRole('student'); setError(''); }}
                            type="button"
                        >
                            Student
                        </button>
                        <button
                            className={role === 'examiner' ? 'active' : ''}
                            onClick={() => { setRole('examiner'); setError(''); }}
                            type="button"
                        >
                            Examiner
                        </button>
                        <button
                            className={role === 'superadmin' ? 'active' : ''}
                            onClick={() => { setRole('superadmin'); setError(''); }}
                            type="button"
                        >
                            Super Admin
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            background: 'var(--danger-bg)', color: 'var(--danger)',
                            padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem', marginBottom: 16
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {role === 'student' && (
                            <div className="form-group">
                                <label className="form-label">Select Examiner</label>
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
                        )}

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder={
                                        role === 'student'
                                            ? 'student@student.com'
                                            : role === 'examiner'
                                                ? 'examiner@exam.com'
                                                : 'superadmin@exam.com'
                                    }
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                            Sign In
                        </button>
                    </form>

                    <div className="auth-footer" style={{ marginTop: 16, textAlign: 'center', fontSize: '0.88rem' }}>
                        Don't have an account? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register here</Link>
                    </div>

                    <div style={{
                        marginTop: 20, padding: '14px', background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--text-muted)'
                    }}>
                        <strong style={{ color: 'var(--text-secondary)' }}>Seed accounts for testing:</strong><br />
                        • Student: asif@student.com / student123 (Examiner: EXM-SHARMA)<br />
                        • Examiner: admin@exam.com / admin123 (ID: EXM-SHARMA)<br />
                        • Super Admin: super@exam.com / super123
                    </div>
                </div>
            </div>
        </div>
    );
}
