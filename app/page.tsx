import React, { ReactNode } from 'react';
import Login from './login';

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
        <nav>
          <ul>
            <li><a href="#login">Login</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      <section id="login" className="login-container">
        <h2>Login</h2>
        <Login />
      </section>

      <footer>
        <p>© 2023 SureSight. All rights reserved.</p>
      </footer>
    </div>
  );
}
