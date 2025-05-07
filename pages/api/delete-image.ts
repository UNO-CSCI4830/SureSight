import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';

/**
 * API endpoint to handle image deletion from both storage and database
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow DELETE method
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user is authenticated
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Extract parameters from query or body
  const { imagePath, imageId } = req.body;
  
  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' });
  }

  try {
    let deletionSuccess = false;
    let dbDeletionSuccess = false;
    
    // Handle URL-encoded paths
    const decodedPath = decodeURIComponent(imagePath);
    
    // Extract bucket name from path
    const pathParts = decodedPath.split('/');
    if (pathParts.length < 2) {
      return res.status(400).json({ error: 'Invalid image path format' });
    }
    
    const bucketName = pathParts[0];
    const filePath = decodedPath.substring(bucketName.length + 1);

    console.log(`Attempting to delete: bucket=${bucketName}, path=${filePath}`);
    
    // Delete from storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from(bucketName)
      .remove([filePath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      return res.status(500).json({ error: `Failed to delete from storage: ${storageError.message}` });
    }

    deletionSuccess = !!storageData && storageData.length > 0;

    // If we have an imageId, delete the database record too
    if (imageId) {
      try {
        // First try the UUID directly if it's valid
        const { error: dbError } = await supabase
          .from('images')
          .delete()
          .eq('id', imageId);
        
        if (!dbError) {
          dbDeletionSuccess = true;
        } else {
          // If that fails, try to find any record with this path and delete it
          const { data: foundImage } = await supabase
            .from('images')
            .select('id')
            .eq('storage_path', imagePath)
            .single();
          
          if (foundImage?.id) {
            const { error: secondDbError } = await supabase
              .from('images')
              .delete()
              .eq('id', foundImage.id);
              
            dbDeletionSuccess = !secondDbError;
          }
        }
      } catch (dbErr) {
        console.error('Database deletion error:', dbErr);
        // Continue anyway, as storage deletion is the primary concern
      }
    }

    return res.status(200).json({
      success: true,
      storage: deletionSuccess,
      database: dbDeletionSuccess
    });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete image'
    });
  }
}