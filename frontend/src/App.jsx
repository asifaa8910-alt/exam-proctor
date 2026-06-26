import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Student
import StudentDashboard from './pages/student/Dashboard';
import TakeExam from './pages/student/TakeExam';
import Results from './pages/student/Results';

// Examiner
import ExaminerDashboard from './pages/examiner/Dashboard';
import CreateExam from './pages/examiner/CreateExam';
import ManageStudents from './pages/examiner/ManageStudents';
import ProctoringLogs from './pages/examiner/ProctoringLogs';
import GradeExam from './pages/examiner/GradeExam';
import PublishResults from './pages/examiner/PublishResults';

// Super Admin
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import ManageExaminers from './pages/superadmin/ManageExaminers';
import SuperAdminStudents from './pages/superadmin/ManageStudents';
import SuperAdminExams from './pages/superadmin/ManageExams';
import SystemLogs from './pages/superadmin/SystemLogs';

import { useState } from 'react';

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
