import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
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
        {/* Replace this with actual error handling logic */}
        <p className="error">Error message placeholder</p>

        <form method="POST" action="/api/login">
          <label htmlFor="username">Username:</label>
          <input type="text" id="username" name="username" required />

          <label htmlFor="password">Password:</label>
          <input type="password" id="password" name="password" required />

          <button type="submit">Login</button>
        </form>
      </section>

      <footer>
        <p>© 2023 SureSight. All rights reserved.</p>
      </footer>
    </div>
  );
}
