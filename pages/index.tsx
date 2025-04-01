import React, { ReactNode } from 'react';
import Auth from '../components/auth';

export default function Home(): ReactNode {
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
