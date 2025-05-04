import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../utils/supabaseClient';

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

    // Extract query parameters
    const {
      location,
      specialties,
      radius = 25,
      minRating = 0,
      limit = 10,
      offset = 0
    } = req.query;

    // Convert specialties to array if it's a string
    let specialtiesArray: string[] = [];
    if (specialties) {
      specialtiesArray = Array.isArray(specialties) 
        ? specialties as string[] 
        : [specialties as string];
    }

    // Base query
    let query = supabase
      .from('contractor_profiles')
      .select(`
        *,
        profiles!inner(
          user_id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('availability_status', 'available')
      .gte('rating', minRating as number)
      .order('rating', { ascending: false });

    // Filter by specialties if provided
    if (specialtiesArray.length > 0) {
      query = query.overlaps('specialties', specialtiesArray);
    }

    // Filter by location if provided (using RPC function that calculates distance)
    if (location) {
      // This assumes you have a Postgres function to calculate distance based on location
      // For example: calculate_distance(contractor_location, search_location)
      query = query.filter('search_radius', 'gte', radius as number);
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .range(Number(offset), Number(offset) + Number(limit) - 1)
      .order('rating', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      contractors: data,
      total: count,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit)
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}