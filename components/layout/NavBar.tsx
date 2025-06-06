import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Icon from '../ui/icons/Icon';

interface NavBarProps {
  isLoggedIn?: boolean;
  userRole?: string;
  user?: { id: string };
}

const NavBar: React.FC<NavBarProps> = ({ isLoggedIn = false, userRole = '', user }) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Double-check authentication status directly with Supabase
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const authenticated = !!data.session;
        setIsAuthenticated(authenticated);
        setAuthChecked(true);
      } catch (err) {
        console.error("Error verifying authentication:", err);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    };
    
    checkAuthentication();
  }, [isLoggedIn]); // Re-check when isLoggedIn prop changes

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const [error, setError] = useState<string | null>(null);
  
  //Fetch notifications
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!isAuthenticated || !user) return; // Use verified authentication status
      try {
        const response = await fetch(`/api/notis?user_id=${user.id}`);
        const data: { count: number } = await response.json();  
        setUnreadCount(data.count || 0);
      } catch (error) {
        console.error('Failed to retrieve notifications:', error);
        setError('Failed to fetch notifications. Please try again later.');
      }
    };
    fetchUnreadNotifications();
  }, [isAuthenticated, user]); // Use verified auth status

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error logging out:', error.message);
      } else {
        console.log('User logged out');
        setIsAuthenticated(false);
        router.push('/login');
      }
    } catch (err) {
      console.error('Unexpected error during logout:', err);
    }
  };

  const handleChangePassword = () => {
    router.push('/updatepassword');
  };

  // Use both the prop and our verified auth status
  const actuallyLoggedIn = isLoggedIn && isAuthenticated;

  return (
    <nav className="nav-bar">
      <div className="logo">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src="/house-roof-icon-design-silhouette-template-illustration-vector.jpg" 
            alt="SureSight Logo" 
            className="w-6 h-6"
          />
          <span>SureSight</span>
        </Link>
      </div>

      <div className="hamburger-menu" ref={menuRef}>
        <button 
          onClick={toggleMenu}
          className="hamburger-button"
          aria-label="Menu"
          title="Open menu"
        >
          <div className={`hamburger-line ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
          <div className={`hamburger-line ${menuOpen ? 'opacity-0' : ''}`}></div>
          <div className={`hamburger-line ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
        </button>
        
        {menuOpen && (
          <div className="dropdown-menu">
            <ul className="menu-list">
              {!actuallyLoggedIn ? (
                <>
                  <li className="menu-item menu-item-border">
                    <Link href="/login" className="flex items-center gap-2">
                      <Icon name="login" />
                      Login
                    </Link>
                  </li>
                  <li className="menu-item">
                    <Link href="/signup" className="flex items-center gap-2">
                      <Icon name="signup" />
                      Sign Up
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="menu-item menu-item-border">
                    <Link href="/Dashboard" className="flex items-center gap-2">
                      <Icon name="home" />
                      Dashboard
                    </Link>
                  </li>
                  <li className="menu-item menu-item-border">
                    <Link href="/notifications" className="flex items-center gap-2 relative">
                      <div className="relative">
                        <Icon name="notifications" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-2 text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      Notifications
                    </Link>
                  </li>
                  {/* Conditional menu items based on user role */}
                  {userRole === 'homeowner' && (
                    <>
                      <li className="menu-item menu-item-border">
                        <Link href="/properties" className="flex items-center gap-2">
                          <Icon name="home" />
                          My Properties
                        </Link>
                      </li>
                      <li className="menu-item menu-item-border">
                        <Link href="/reports" className="flex items-center gap-2">
                          <Icon name="reports" />
                          My Reports
                        </Link>
                      </li>
                    </>
                  )}
                  {userRole === 'contractor' && (
                    <li className="menu-item menu-item-border">
                      <Link href="/jobs" className="flex items-center gap-2">
                        <Icon name="jobs" />
                        Available Jobs
                      </Link>
                    </li>
                  )}
                  {userRole === 'adjuster' && (
                    <li className="menu-item menu-item-border">
                      <Link href="/claims" className="flex items-center gap-2">
                        <Icon name="claims" />
                        Claims
                      </Link>
                    </li>
                  )}
                  <li className="menu-item menu-item-border">
                    <Link href="/profile" className="flex items-center gap-2">
                      <Icon name="profile" />
                      My Profile
                    </Link>
                  </li>
                  <li className="menu-item menu-item-border flex items-center gap-2" onClick={handleChangePassword}>
                    <Icon name="password" />
                    Change Password
                  </li>
                  <li className="menu-item flex items-center gap-2 text-red-600" onClick={handleLogout}>
                    <Icon name="logout" />
                    Log Out
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
