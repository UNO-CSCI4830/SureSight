import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      throw new Error('Database connection failed');
    }
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
}
