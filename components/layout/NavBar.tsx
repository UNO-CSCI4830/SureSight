import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Icon from '../ui/icons/Icon';

interface NavBarProps {
  isLoggedIn?: boolean;
  userRole?: string;
}

const NavBar: React.FC<NavBarProps> = ({ isLoggedIn = false, userRole = '' }) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);

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
  if (!isLoggedIn) return;
  try {
    const response = await fetch(`/api/notis?user_id=${user.id}`);
    const data: { count: number } = await res.json();  
    setUnreadCount(data.count || 0);
  } catch (error) {
    console.error('Failed to retrieve notifications:', error);
    setError('Failed to fetch notifications. Please try again later.');
  }
};
    fetchUnreadNotifications();
  }, [isLoggedIn]);

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
        router.push('/login'); // Redirect to home page after logout
      }
    } catch (err) {
      console.error('Unexpected error during logout:', err);
    }
  };

  const handleChangePassword = () => {
    router.push('/updatepassword');
  };

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
              {!isLoggedIn ? (
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
                      {unreadCount > 0 && (
                        <span className="ml-1 text-xs font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                  <li className="menu-item menu-item-border">
                    <Link href="/notifications" className="flex items-center gap-2">
                      <Icon name="notifications" />
                      Notifications
                    </Link>
                  </li>
                  {/* Conditional menu items based on user role */}
                  {userRole === 'homeowner' && (
                    <li className="menu-item menu-item-border">
                      <Link href="/reports" className="flex items-center gap-2">
                        <Icon name="reports" />
                        My Reports
                      </Link>
                    </li>
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
