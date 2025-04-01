import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase.rpc('now'); // Use a lightweight query to check database status
    if (error) {
      throw new Error('Database connection failed');
    }
    res.status(200).json({ status: 'ok', timestamp: data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
}
