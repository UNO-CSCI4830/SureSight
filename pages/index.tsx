import React, { ReactNode, useEffect, useState } from 'react';
import Auth from '../components/auth';

export default function Home(): ReactNode {
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(true);

  useEffect(() => {
    const checkDatabaseConnection = async () => {
      try {
        const response = await fetch('/api/healthcheck');
        if (!response.ok) {
          throw new Error('Database connection failed');
        }
      } catch (error) {
        setIsDatabaseConnected(false);
      }
    };

    checkDatabaseConnection();
  }, []);

  if (!isDatabaseConnected) {
    return (
      <div>
        <header>
          <h1>SureSight</h1>
        </header>
        <section className="auth-container">
          <h2>Maintenance Mode</h2>
          <p>The site is currently undergoing maintenance. Please try again later.</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1>SureSight</h1>
        <h3>
          An app to streamline the process of identifying and reporting roofing
          and siding damage, ultimately helping homeowners, contractors, and
          insurance adjusters!
        </h3>
      </header>

      <section id="auth" className="auth-container">
        <h2>Authentication</h2>
        <Auth />
      </section>

      <footer>
        <p>© 2023 SureSight. All rights reserved.</p>
      </footer>
    </div>
  );
}
