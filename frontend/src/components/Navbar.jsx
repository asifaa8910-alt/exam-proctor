import { useAuth } from '../context/AuthContext';
import { Bell, Shield, Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="top-navbar">
      <div className="navbar-left">
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <Shield size={16} className="navbar-icon" />
        <span>Exam Proctor System</span>
      </div>
      <div className="navbar-right">
        <button className="navbar-theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="navbar-notif">
          <Bell size={18} />
        </div>
        <div className="navbar-user">
          <div className="navbar-avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <span className="navbar-username">{user?.name}</span>
          <span className={`badge ${user?.role === 'superadmin' ? 'badge-danger' : user?.role === 'examiner' ? 'badge-accent' : 'badge-success'}`}>
            {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'examiner' ? 'Examiner' : 'Student'}
          </span>
        </div>
      </div>

      <style>{`
        .top-navbar {
          position: fixed;
          top: 0;
          left: var(--sidebar-width);
          right: 0;
          height: var(--navbar-height);
          background: var(--bg-navbar);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          z-index: 99;
          transition: left var(--transition);
        }
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        @media (max-width: 768px) {
          .top-navbar {
            left: 0;
            padding: 0 16px;
          }
          .mobile-menu-btn {
            display: flex;
            align-items: center;
          }
          .navbar-left > span {
            display: none; /* Hide 'Exam Proctor System' text on very small screens */
          }
        }
        .navbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .navbar-icon {
          color: var(--accent);
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .navbar-theme-toggle,
        .navbar-notif {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          outline: none;
        }
        .navbar-theme-toggle:hover,
        .navbar-notif:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--bg-primary);
        }
        .navbar-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .navbar-avatar {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-full);
          background: var(--accent-gradient);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .navbar-username {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </nav>
  );
}
