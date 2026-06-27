import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [examiners, setExaminers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [settings, setSettings] = useState({
        allow_student_registration: 'true',
        proctoring_enabled: 'true',
        max_tab_switches: '3',
        announcement_banner: ''
    });
    const [loading, setLoading] = useState(true);

    const fetchExaminers = async () => {
        try {
            const data = await api.get('/auth/examiners');
            setExaminers(data.examiners || []);
        } catch (err) {
            console.error('Failed to fetch examiners:', err);
        }
    };

    const fetchSettings = async () => {
        try {
            const data = await api.get('/auth/settings');
            if (data.settings) {
                setSettings(data.settings);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    useEffect(() => {
        const fetchMe = async () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const data = await api.get('/auth/me');
                    setUser(data.user);
                } catch (err) {
                    console.error('Failed to restore session:', err);
                    localStorage.removeItem('authToken');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        
        fetchMe();
        fetchExaminers();
        fetchSettings();
    }, []);

    useEffect(() => {
        if (user) {
            const socketUrl = import.meta.env.VITE_API_URL 
                ? import.meta.env.VITE_API_URL.replace('/api', '') 
                : window.location.origin.replace(':5173', ':5002').replace(':3000', ':5002');
            
            const newSocket = io(socketUrl);
            newSocket.emit('register-active-user', user);
            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
                setSocket(null);
            };
        }
    }, [user]);

    useEffect(() => {
        const fetchStudents = async () => {
            if (user && (user.role === 'examiner' || user.role === 'superadmin')) {
                try {
                    const data = await api.get('/auth/students');
                    setUsers(data.students || []);
                } catch (err) {
                    console.error('Failed to fetch students:', err);
                }
            } else {
                setUsers([]);
            }
        };
        fetchStudents();
    }, [user]);

    const login = async (email, password, role, examinerId) => {
        try {
            const data = await api.post('/auth/login', { email, password, role, examinerId });
            localStorage.setItem('authToken', data.token);
            setUser(data.user);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const register = async (name, email, password, role, examinerId) => {
        try {
            const data = await api.post('/auth/register', { name, email, password, role, examinerId });
            localStorage.setItem('authToken', data.token);
            setUser(data.user);
            if (role === 'examiner') {
                fetchExaminers();
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
    };

    const getStudents = () => {
        return users;
    };

    const addStudent = async (name, email, studentExaminerId) => {
        try {
            const data = await api.post('/auth/students', { name, email, studentExaminerId });
            setUsers(prev => [...prev, data.student]);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const removeStudent = async (studentId) => {
        try {
            await api.delete(`/auth/students/${studentId}`);
            setUsers(prev => prev.filter(u => u.id !== studentId));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const updateSettings = async (newSettings) => {
        try {
            await api.post('/auth/settings', newSettings);
            setSettings(prev => ({ ...prev, ...newSettings }));
            return { success: true };
        } catch (err) {
            console.error('Failed to update settings:', err);
            return { success: false, error: err.message };
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)'
            }}>
                <h3>Loading session...</h3>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, users, examiners, fetchExaminers, login, register, logout, getStudents, addStudent, removeStudent, settings, fetchSettings, updateSettings, socket }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
