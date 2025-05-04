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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    if (profile.role !== 'contractor') {
      return res.status(403).json({ message: 'Only contractors can access this endpoint' });
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

    // Get requests for this contractor
    const { data: requests, error: requestsError } = await supabase
      .from('contractor_requests')
      .select(`
        *,
        report:report_id(*),
        requester:requested_by(*)
      `)
      .eq('contractor_id', contractorId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (requestsError) {
      throw requestsError;
    }

    return res.status(200).json({
      requests
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}