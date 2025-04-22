import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

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
  
  //Fetch notifications
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!isLoggedIn) return;
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        setUnreadCount(data.count || 0);
      } catch (error) {
        console.error('Failed to retrieve notifications:', error);
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
        router.push('/'); // Redirect to home page after logout
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
          {/* You can add a logo SVG or image here */}
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                      Login
                    </Link>
                  </li>
                  <li className="menu-item">
                    <Link href="/signup" className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
                        <path d="M16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                      </svg>
                      Sign Up
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="menu-item menu-item-border">
                    <Link href="/Dashboard" className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      Dashboard
                      {unreadCount> 0 && (
                      <span className= "ml-1 text-xs font-semibolg bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    </Link>
                  </li>
                  {/* Conditional menu items based on user role */}
                  {userRole === 'homeowner' && (
                    <li className="menu-item menu-item-border">
                      <Link href="/reports" className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        My Reports
                      </Link>
                    </li>
                  )}
                  {userRole === 'contractor' && (
                    <li className="menu-item menu-item-border">
                      <Link href="/jobs" className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                        </svg>
                        Available Jobs
                      </Link>
                    </li>
                  )}
                  {userRole === 'adjuster' && (
                    <li className="menu-item menu-item-border">
                      <Link href="/claims" className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                          <path fillRule="evenodd" d="M8 10a4 4 0 00-3.446 6.032l-1.261 1.26a1 1 0 101.414 1.415l1.261-1.261A4 4 0 108 10zm-2 4a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                        </svg>
                        Claims
                      </Link>
                    </li>
                  )}
                  <li className="menu-item menu-item-border">
                    <Link href="/profile" className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      My Profile
                    </Link>
                  </li>
                  <li className="menu-item menu-item-border flex items-center gap-2" onClick={handleChangePassword}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Change Password
                  </li>
                  <li className="menu-item flex items-center gap-2 text-red-600" onClick={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414a1 1 0 00-.293-.707L11.414 2.414A1 1 0 0010.586 2H4a1 1 0 00-1 1zm9 5a1 1 0 00-1-1H5a1 1 0 00-1 1v4a1 1 0 001 1h6a1 1 0 001-1V8z" clipRule="evenodd" />
                      <path d="M3 7h10v2H3V7z" />
                    </svg>
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
