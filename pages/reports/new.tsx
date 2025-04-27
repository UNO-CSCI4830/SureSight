import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../utils/supabaseClient';
import { Card, LoadingSpinner, StatusMessage } from '../../components/common';
import { FormInput, Button } from '../../components/ui';
import formValidation from '../../utils/formValidation';
export default function NewForm() {
    return (<Layout><Head>
        <title>New Form</title>
        <meta name="description" content="Creating a new form" />
      </Head>

      <div className="max-w-md mx-auto mt-8 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">New Form</h1>
          <p className="text-gray-600">Please fill out the form below to file your claim</p>
        </div>
        </div>

    </Layout>)
}