import { useRouter } from 'next/router';
import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../utils/supabaseClient';

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Session error');
        }

        if (!data.session) {
          console.log('No active session found');
          // Redirect to login with current path for redirect after login
          router.push('/login?redirect=' + encodeURIComponent(router.pathname));
          return;
        }

        const userId = data.session.user.id;

        // If no specific roles are required, just being authenticated is enough
        if (requiredRoles.length === 0) {
          setIsAuthorized(true);
          setIsChecking(false);
          return;
        }

        // Check if user has the required role
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', userId);

          if (roleError) {
            console.error('Role fetch error:', roleError);
            throw new Error('Failed to check user role');
          }

          if (!roleData || roleData.length === 0) {
            console.log('No roles found for user');
            // If we can't determine the role, redirect to a default dashboard
            router.push('/dashboard');
            return;
          }

          // Extract roles from the nested structure, handling different response formats
          let userRoles: string[] = [];
          
          for (const roleEntry of roleData) {
            if (roleEntry.roles) {
              // Handle object structure when a single role is returned
              if (typeof roleEntry.roles === 'object' && !Array.isArray(roleEntry.roles)) {
                if (typeof roleEntry.roles === 'object' && roleEntry.roles !== null && 'name' in roleEntry.roles) {
                  userRoles.push((roleEntry.roles as { name: string }).name);
                }
              } 
              // Handle array of roles
              else if (Array.isArray(roleEntry.roles)) {
                userRoles = userRoles.concat(roleEntry.roles.map(r => r.name).filter(Boolean));
              }
            }
          }

          if (userRoles.length === 0) {
            console.log('No valid roles found for user');
            // If we can't determine the role, redirect to a default dashboard
            router.push('/dashboard');
            return;
          }

          // Check if user has any of the required roles
          const hasRequiredRole = requiredRoles.length === 0 || 
                                requiredRoles.some(role => userRoles.includes(role));

          if (!hasRequiredRole) {
            console.log('User does not have required role');
            router.push('/dashboard');
            return;
          }

          setIsAuthorized(true);
        } catch (roleCheckError) {
          console.error('Role check error:', roleCheckError);
          // If role checking fails but user is authenticated, 
          // still allow access if no specific roles are required
          if (requiredRoles.length === 0) {
            setIsAuthorized(true);
          } else {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login?redirect=' + encodeURIComponent(router.pathname));
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, requiredRoles]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If authorized, show the protected content
  return isAuthorized ? <>{children}</> : null;
};

export default AuthGuard;