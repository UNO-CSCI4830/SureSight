import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  // Use client-side only rendering for the dynamic year
  const [year, setYear] = useState<number | null>(null);
  
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className={`bg-white border-t border-gray-200 py-8 mt-auto ${className}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center mb-2">
              <img 
                src="/house-roof-icon-design-silhouette-template-illustration-vector.jpg" 
                alt="SureSight Logo" 
                className="w-8 h-8 mr-2"
              />
              <span className="font-bold text-primary-600">SureSight</span>
            </div>
            <p className="text-gray-600 text-sm">
              © {year || '2025'} SureSight. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Looking after your roofs since 2025
            </p>
          </div>
          
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:space-x-6">
            <div>
              <h3 className="font-medium text-sm mb-2">Links</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-500 text-sm hover:text-primary-600 transition-colors">Home</Link></li>
                <li><Link href="/login" className="text-gray-500 text-sm hover:text-primary-600 transition-colors">Login</Link></li>
                <li><Link href="/signup" className="text-gray-500 text-sm hover:text-primary-600 transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Legal</h3>
              <ul className="space-y-2">
                {/* Use just a hash to prevent hydration mismatch */}
                <li><a href="#privacy" className="text-gray-500 text-sm hover:text-primary-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="text-gray-500 text-sm hover:text-primary-600 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Connect</h3>
              <div className="flex space-x-4">
                <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-primary-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                  </svg>
                </a>
                <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-primary-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                  </svg>
                </a>
                <a href="#" aria-label="YouTube" className="text-gray-400 hover:text-primary-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;