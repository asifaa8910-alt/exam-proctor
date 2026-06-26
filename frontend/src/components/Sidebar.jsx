import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Users, ClipboardCheck,
  Award, LogOut, ShieldCheck, GraduationCap, Eye, BookOpen, X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const studentLinks = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/results', icon: Award, label: 'Results' },
  ];

  const examinerLinks = [
    { to: '/examiner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/examiner/create-exam', icon: FileText, label: 'Create Exam' },
    { to: '/examiner/students', icon: Users, label: 'Manage Students' },
    { to: '/examiner/logs', icon: Eye, label: 'Proctoring Logs' },
    { to: '/examiner/grade', icon: ClipboardCheck, label: 'Grade Exams' },
    { to: '/examiner/results', icon: Award, label: 'Publish Results' },
  ];

  const superAdminLinks = [
    { to: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/superadmin/examiners', icon: Users, label: 'Manage Examiners' },
    { to: '/superadmin/students', icon: Users, label: 'Manage Students' },
    { to: '/superadmin/exams', icon: FileText, label: 'Manage Exams' },
    { to: '/superadmin/logs', icon: Eye, label: 'System Logs' },
  ];

  const links = user?.role === 'superadmin'
    ? superAdminLinks
    : user?.role === 'examiner'
      ? examinerLinks
      : studentLinks;

  const getRoleLabel = () => {
    if (user?.role === 'superadmin') return 'Super Admin';
    if (user?.role === 'examiner') return `Examiner (${user?.examinerId})`;
    return 'Student';
  };

  const getRoleIcon = () => {
    if (user?.role === 'superadmin') return <ShieldCheck size={16} />;
    if (user?.role === 'examiner') return <BookOpen size={16} />;
    return <GraduationCap size={16} />;
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <ShieldCheck size={28} />
            <span>ExamProctor</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-role">
          <div className="sidebar-role-icon">
            {getRoleIcon()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sidebar-role-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div className="sidebar-role-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {getRoleLabel()}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        <style>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow-y: auto;
          transition: transform var(--transition);
        }
        .sidebar-close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: none;
        }
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(2px);
          z-index: 99;
          animation: fadeIn 0.2s ease;
        }
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .sidebar-close-btn {
            display: flex;
          }
          .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        }
        .sidebar-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--accent);
          font-size: 1.15rem;
          font-weight: 800;
        }
        .sidebar-role {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .sidebar-role-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--accent-glow);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sidebar-role-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }
        .sidebar-role-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 1px;
        }
        .sidebar-nav {
          padding: 24px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.15s ease;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
        }
        .sidebar-link:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .sidebar-link.active {
          color: var(--accent);
          background: var(--accent-glow);
          font-weight: 600;
        }
        .sidebar-footer {
          padding: 14px;
          border-top: 1px solid var(--border);
        }
        .sidebar-link.logout {
          color: var(--text-muted);
        }
        .sidebar-link.logout:hover {
          color: var(--danger);
          background: var(--danger-bg);
        }
        `}</style>
      </aside>
    </>
  );
}
