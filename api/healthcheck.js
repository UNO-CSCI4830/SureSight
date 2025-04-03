import { supabase } from '../../utils/supabaseClient';

/*export default async function handler(req, res) {
    try {
        const { data, error } = await supabase.rpc('now');

        if (error) {
            console.error('Error checking database status:', error);
            res.status(500).json({ success: false, message: 'Error checking database status', error });
        } else {
            console.log('Current Timestamp:', data);
            res.status(200).json({ success: true, data });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ success: false, message: 'Unexpected error occurred', error: err.message });
    }
}
*/