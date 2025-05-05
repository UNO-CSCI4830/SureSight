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
    const { reportId } = req.query;
    
    // Ensure reportId is a string 
    const reportIdString = Array.isArray(reportId) ? reportId[0] : reportId;
    
    if (!reportIdString) {
      return res.status(400).json({ message: 'Report ID is required' });
    }

    // Verify user has access to this report
    const { data: reportAccess, error: accessError } = await supabase.rpc(
      'user_has_report_access',
      { 
        p_user_id: userId,
        p_report_id: reportIdString
      }
    );

    if (accessError || !reportAccess) {
      return res.status(403).json({ message: 'You do not have access to this report' });
    }

    // Get report details to determine damage type and location
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        property:property_id(*)
      `)
      .eq('id', reportIdString)
      .single();

    if (reportError) {
      throw reportError;
    }

    // Get damage types from assessment areas
    const { data: assessmentAreas, error: assessmentError } = await supabase
      .from('assessment_areas')
      .select('damage_type')
      .eq('report_id', reportIdString);

    if (assessmentError) {
      throw assessmentError;
    }

    // Extract damage types
    const damageTypes = assessmentAreas.map(area => area.damage_type);
    
    // Call the RPC function to find suitable contractors
    const { data: contractors, error: contractorsError } = await supabase
      .rpc('find_available_contractors', {
        p_report_id: reportIdString as string,
        p_limit: 10,
        p_min_rating: 4.0
      });

    if (contractorsError) {
      throw contractorsError;
    }

    return res.status(200).json({
      contractors,
      report: {
        id: report.id,
        title: report.title,
        damageTypes
      }
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}