import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enforce method
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get current user from session to verify authorization
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = session.user.id;

    // First, verify this user is a contractor
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'contractor') {
      return res.status(403).json({ message: 'Only contractors can access this endpoint' });
    }

    // Get profile ID for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    // Get contractor profile ID
    const { data: contractorProfile, error: contractorError } = await supabase
      .from('contractor_profiles')
      .select('id')
      .eq('id', profile.id)
      .single();

    if (contractorError || !contractorProfile) {
      return res.status(404).json({ message: 'Contractor profile not found' });
    }

    const contractorId = contractorProfile.id;
    const status = req.query.status as string || 'open';

    // Get reports assigned to this contractor instead of contractor_requests
    // The updated schema stores contractor assignments directly in the reports table
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at,
        property:property_id(*),
        creator:creator_id(*)
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (reportsError) {
      throw reportsError;
    }

    return res.status(200).json({
      requests: reports // Maintaining the same response structure for compatibility
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}