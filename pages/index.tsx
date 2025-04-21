import React, { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Head from 'next/head';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home(): ReactNode {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Prevents server-side rendering issues
  }

  return (
    <>
      <Head>
        <title>SureSight - Streamline Roofing and Siding Damage Assessment</title>
        <meta name="description" content="SureSight connects homeowners, contractors, and insurance adjusters to streamline the process of identifying and reporting roofing and siding damage." />
      </Head>

      <div className="bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="pt-20 pb-12 md:pt-28 md:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-8 md:mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-600 mb-6">
                Simplify Your Damage Assessment Process
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                SureSight connects homeowners, contractors, and insurance adjusters to streamline the process of identifying and reporting roofing and siding damage.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-primary text-center py-3 px-8 text-lg">
                Get Started
              </Link>
              <Link href="/login" className="btn-outline text-center py-3 px-8 text-lg text-primary-600">
                Log In
              </Link>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How SureSight Works</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our platform makes it easy to document, report, and track property damage
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card flex flex-col items-center text-center p-8">
                <div className="bg-primary-100 p-4 rounded-full mb-6">
                  <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Document Damage</h3>
                <p className="text-gray-600">
                  Easily upload photos and document property damage with our intuitive tools
                </p>
              </div>
              
              <div className="card flex flex-col items-center text-center p-8">
                <div className="bg-secondary-100 p-4 rounded-full mb-6">
                  <svg className="w-10 h-10 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Connect with Professionals</h3>
                <p className="text-gray-600">
                  Share information with contractors and insurance adjusters in real-time
                </p>
              </div>
              
              <div className="card flex flex-col items-center text-center p-8">
                <div className="bg-green-100 p-4 rounded-full mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Track Progress</h3>
                <p className="text-gray-600">
                  Monitor repairs and claims with comprehensive tracking and updates
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="card p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-gray-200 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-gray-700 font-semibold">JD</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">John Doe</h4>
                    <p className="text-sm text-gray-500">Homeowner</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "SureSight made it so easy to document the storm damage to my roof. The contractor and insurance adjuster were able to collaborate efficiently, and my claim was processed faster than I expected."
                </p>
              </div>
              
              <div className="card p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-gray-200 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-gray-700 font-semibold">MS</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Mike Smith</h4>
                    <p className="text-sm text-gray-500">Roofing Contractor</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "As a contractor, SureSight has revolutionized how I document damage and coordinate with insurance adjusters. The photo tools and collaboration features save me hours on each job."
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 bg-primary-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to streamline your damage assessment process?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of homeowners, contractors, and insurance adjusters who are already using SureSight.
            </p>
            <Link href="/signup" className="inline-block bg-white text-primary-600 font-medium py-3 px-8 rounded-md hover:bg-gray-100 transition-colors">
              Get Started Today
            </Link>
          </div>
        </section>
        
        {/* Contact Section */}
        <section id="contact" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Have questions about SureSight? Our team is here to help.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row justify-center gap-8">
              <div className="flex items-center">
                <div className="bg-primary-100 p-3 rounded-full mr-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Email</h3>
                  <a href="mailto:support@suresight.app" className="text-primary-600 hover:underline">support@suresight.app</a>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-primary-100 p-3 rounded-full mr-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Phone</h3>
                  <a href="tel:+18005551234" className="text-primary-600 hover:underline">(800) 555-1234</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
