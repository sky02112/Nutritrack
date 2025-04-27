import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

/**
 * A component that protects routes based on authentication and role requirements
 * @param {Object} props
 * @param {JSX.Element} props.children - The child component to render if access is granted
 * @param {Array} props.allowedRoles - Array of roles allowed to access this route
 * @param {string} props.redirectPath - Where to redirect if access is denied
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectPath = '/login'
}) => {
  const { currentUser, userDetails, loading } = useAuth();
  
  // If still loading auth state, show nothing or a loader
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to={redirectPath} replace />;
  }
  
  // If roles are specified but user doesn't have required role, redirect
  if (allowedRoles.length > 0 && (!userDetails || !allowedRoles.includes(userDetails.role))) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated and has proper role, render the protected component
  return children;
};

export default ProtectedRoute; 