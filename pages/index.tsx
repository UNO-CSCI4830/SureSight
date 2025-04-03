import React, { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home(): ReactNode {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);

    const fetchCurrentTime = async () => {
      try {
        const { data, error } = await supabase.rpc('now');
        if (error) {
          console.error('Error fetching current time:', error);
        } else {
          setCurrentTime(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    };

    fetchCurrentTime();
  }, []);

  if (!isMounted) {
    return null; // Prevents server-side rendering issues
  }

  return (
    <div>
      <header>
        <div className="top-bar">
          <a href="/login" className="top-bar-link">Log In</a>
          <a href="/signup" className="top-bar-link">Sign Up</a>
        </div>
        <h1>SureSight</h1>
        {currentTime && <p>Current Date and Time: {currentTime}</p>}
      </header>

      <main>
        <section id="about" className="about-container">
          <h2>About SureSight</h2>
          <p>
            SureSight is an innovative application designed to streamline the process of identifying and reporting roofing and siding damage. 
            Our platform connects homeowners, contractors, and insurance adjusters, making it easier to assess and address property damage efficiently.
          </p>
          <p>
            With SureSight, you can:
          </p>
          <ul>
            <li>Quickly document and report damage with photos and descriptions.</li>
            <li>Collaborate with contractors and insurance adjusters in real-time.</li>
            <li>Track the progress of repairs and claims effortlessly.</li>
          </ul>
        </section>

        <section id="features" className="features-container">
          <h2>Features</h2>
          <p>Our application offers a range of features to simplify property damage management:</p>
          <ul>
            <li>Intuitive damage reporting tools.</li>
            <li>Secure data storage and sharing.</li>
            <li>Real-time updates and notifications.</li>
            <li>Comprehensive analytics and reporting.</li>
          </ul>
        </section>

        <section id="contact" className="contact-container">
          <h2>Contact Us</h2>
          <p>
            Have questions or need assistance? Reach out to our support team at <a href="mailto:support@suresight.com">support@suresight.com</a>.
          </p>
        </section>
      </main>

      <footer>
        <p>© 2023 SureSight. All rights reserved.</p>
      </footer>
    </div>
  );
}
