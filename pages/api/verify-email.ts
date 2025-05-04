import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';

/**
 * API route to handle email verification callbacks
 * This is called when a user clicks on the verification link in their email
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid verification token' });
    }

    // Extract user ID from token and update verification status
    // Note: Supabase handles the actual email verification in the auth system
    // This endpoint just updates our database record to reflect that status
    
    // First, get the user session from the token
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error("Error fetching authenticated user:", authError);
      return res.redirect('/login?verified=false&error=Invalid+or+expired+verification+link');
    }

    const userId = authData.user.id;
    
    // Update the email_confirmed status in our database
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_confirmed: true })
      .eq('auth_user_id', userId);

    if (updateError) {
      console.error("Error updating verification status:", updateError);
      return res.redirect('/login?verified=false&error=Failed+to+update+verification+status');
    }

    // Redirect to login page with success message
    return res.redirect('/login?verified=true');
    
  } catch (error) {
    console.error("Verification error:", error);
    return res.redirect('/login?verified=false&error=An+unexpected+error+occurred');
  }
}