import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (allowedRoles && !roles.includes(user.role)) {
        let redirectPath = '/login';
        if (user.role === 'student') redirectPath = '/student/dashboard';
        else if (user.role === 'examiner') redirectPath = '/examiner/dashboard';
        else if (user.role === 'superadmin') redirectPath = '/superadmin/dashboard';
        
        return <Navigate to={redirectPath} replace />;
    }

    return children;
}
