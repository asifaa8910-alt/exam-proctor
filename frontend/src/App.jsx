import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Lazy load all platform pages for optimal code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const TakeExam = lazy(() => import('./pages/student/TakeExam'));
const Results = lazy(() => import('./pages/student/Results'));

// Examiner Pages
const ExaminerDashboard = lazy(() => import('./pages/examiner/Dashboard'));
const CreateExam = lazy(() => import('./pages/examiner/CreateExam'));
const ManageStudents = lazy(() => import('./pages/examiner/ManageStudents'));
const ProctoringLogs = lazy(() => import('./pages/examiner/ProctoringLogs'));
const GradeExam = lazy(() => import('./pages/examiner/GradeExam'));
const PublishResults = lazy(() => import('./pages/examiner/PublishResults'));

// Super Admin Pages
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'));
const ManageExaminers = lazy(() => import('./pages/superadmin/ManageExaminers'));
const SuperAdminStudents = lazy(() => import('./pages/superadmin/ManageStudents'));
const SuperAdminExams = lazy(() => import('./pages/superadmin/ManageExams'));
const SystemLogs = lazy(() => import('./pages/superadmin/SystemLogs'));

// Premium dynamic skeleton loading block for page loading states
const PageFallback = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 16, padding: 32,
    background: 'var(--bg-primary)', minHeight: '80vh'
  }}>
    <div className="skeleton skeleton-title" style={{ width: '35%', height: 28 }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
      <div className="skeleton skeleton-card" style={{ height: 110 }} />
      <div className="skeleton skeleton-card" style={{ height: 110 }} />
      <div className="skeleton skeleton-card" style={{ height: 110 }} />
    </div>
    <div className="skeleton skeleton-card" style={{ height: 240 }} />
  </div>
);

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        <Navbar onMenuClick={toggleSidebar} />
        {children}
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  const getDashboardRedirect = () => {
    if (user.role === 'student') return '/student/dashboard';
    if (user.role === 'examiner') return '/examiner/dashboard';
    if (user.role === 'superadmin') return '/superadmin/dashboard';
    return '/login';
  };

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to={getDashboardRedirect()} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={getDashboardRedirect()} /> : <Register />} />

        {/* Student Routes */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute allowedRoles="student">
            <AppLayout><StudentDashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/student/exam/:examId" element={
          <ProtectedRoute allowedRoles="student">
            <TakeExam />
          </ProtectedRoute>
        } />
        <Route path="/student/results" element={
          <ProtectedRoute allowedRoles="student">
            <AppLayout><Results /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Examiner Routes */}
        <Route path="/examiner/dashboard" element={
          <ProtectedRoute allowedRoles="examiner">
            <AppLayout><ExaminerDashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/examiner/create-exam" element={
          <ProtectedRoute allowedRoles="examiner">
            <AppLayout><CreateExam /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/examiner/students" element={
          <ProtectedRoute allowedRoles="examiner">
            <AppLayout><ManageStudents /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/examiner/logs" element={
          <ProtectedRoute allowedRoles="examiner">
            <AppLayout><ProctoringLogs /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/examiner/grade" element={
          <ProtectedRoute allowedRoles="examiner">
            <AppLayout><GradeExam /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/examiner/results" element={
          <ProtectedRoute allowedRoles="examiner">
            <AppLayout><PublishResults /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Super Admin Routes */}
        <Route path="/superadmin/dashboard" element={
          <ProtectedRoute allowedRoles="superadmin">
            <AppLayout><SuperAdminDashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/superadmin/examiners" element={
          <ProtectedRoute allowedRoles="superadmin">
            <AppLayout><ManageExaminers /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/superadmin/students" element={
          <ProtectedRoute allowedRoles="superadmin">
            <AppLayout><SuperAdminStudents /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/superadmin/exams" element={
          <ProtectedRoute allowedRoles="superadmin">
            <AppLayout><SuperAdminExams /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/superadmin/logs" element={
          <ProtectedRoute allowedRoles="superadmin">
            <AppLayout><SystemLogs /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExamProvider>
          <AppRoutes />
        </ExamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
