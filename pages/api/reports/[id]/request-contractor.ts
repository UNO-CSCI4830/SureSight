import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { collaborationNotificationService } from '../../../../services/collaborationNotificationService';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the authenticated user from Supabase
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }

  // Get report ID from path parameter
  const { id: reportId } = req.query;

  if (req.method === 'POST') {
    try {
      // Request body should contain contractorId and other request details
      const { contractorId, message, deadline } = req.body;

      if (!contractorId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Contractor ID is required',
        });
      }

      // Get the database user ID from the auth user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, profiles:profiles(first_name, last_name)')
        .eq('auth_user_id', session.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if the user has access to the report
      const { data: reportAccess, error: reportError } = await supabase
        .from('reports')
        .select('id, title')
        .eq('id', reportId)
        .eq('creator_id', userData.id)
        .single();

      if (reportError || !reportAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to modify this report',
        });
      }

      // Create the contractor request
      const requestId = uuidv4();
      const { error: insertError } = await supabase
        .from('contractor_requests')
        .insert({
          id: requestId,
          report_id: reportId,
          contractor_id: contractorId,
          requested_by: userData.id,
          status: 'open',
          notes: message || null,
          response_deadline: deadline || null,
        });

      if (insertError) {
        throw insertError;
      }

      // Send notification to the contractor
      const firstName = userData.profiles[0]?.first_name || 'A user';
      const lastName = userData.profiles[0]?.last_name || '';
      const clientName = `${firstName} ${lastName}`;
      await collaborationNotificationService.notifyContractorRequest(
        contractorId,
        reportId as string,
        reportAccess.title,
        clientName
      );

      return res.status(200).json({
        success: true,
        requestId,
        message: 'Contractor request sent successfully',
      });
    } catch (error: any) {
      console.error('Error requesting contractor:', error);
      return res.status(500).json({
        error: 'Server Error',
        message: error.message,
      });
    }
  } else {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: `The ${req.method} method is not allowed on this endpoint`,
    });
  }
}