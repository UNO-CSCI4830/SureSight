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
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          throw new Error('Not authenticated');
        }

        const userId = sessionData.session.user.id;

        // If no specific roles are required, just being authenticated is enough
        if (requiredRoles.length === 0) {
          setIsAuthorized(true);
          return;
        }

        // Check if user has the required role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', userId);

        if (roleError || !roleData || roleData.length === 0) {
          throw new Error('Role not found');
        }

        // Check if user has any of the required roles
        const userRoles = roleData.flatMap(r => r.roles?.map(role => role.name) || []);
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
          throw new Error('Unauthorized role');
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login?redirect=' + encodeURIComponent(router.pathname));
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, requiredRoles]);

  // Show nothing while checking authentication
  if (isChecking) {
    return <div className="loading">Checking authorization...</div>;
  }

  // If authorized, show the protected content
  return isAuthorized ? <>{children}</> : null;
};

export default AuthGuard;