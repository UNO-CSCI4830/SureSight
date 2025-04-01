import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {

    const { data, error } = await supabase.rpc('now');
    
    console.log('Current Timestamp:', data);
    if (error) {
        console.error('Error checking database status:', error);
        console.log('Error:', error.message);
        res.status(500).json({ success: false, message: 'Error checking database status', error });
    } else {
        console.log('Current Timestamp:', data);
        res.status(200).json({ success: true, data });
    }
}
