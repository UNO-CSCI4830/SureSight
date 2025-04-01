import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {

    const { data, error } = await supabase.rpc('check_database_status');
    
    if (error) {
        console.error('Error checking database status:', error);
        res.status(500).json({ success: false, message: 'Error checking database status', error });
    } else {
        console.log('Database Status:', data);
        res.status(200).json({ success: true, data });
    }
}
