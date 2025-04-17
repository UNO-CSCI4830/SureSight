import React from 'react';
import { supabase } from '../utils/supabaseClient'; // Adjust the import path as needed
import { useRouter } from 'next/router';

const Dashboard: React.FC = () => {
    const router = useRouter();
    const [image, setImage] = useState<File | null>(null);
    const [message, setMessage] = useState('');

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error.message);
            } else {
                console.log('User logged out');
                window.location.href = '/login'; // Redirect to login page
            }
        } catch (err) {
            console.error('Unexpected error during logout:', err);
        }
    };
    const handleFileChange = async (event: React:changeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImage(file);
    };

    const handleUpload = async (event: React:FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage('');

        if (!image) {
            setMessage('Please select a file to upload');
            return;
        }

        const fileExt = Image.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const {error: uploadError } = await supabase.storage          // Uploading to supabase
            .from('reports')
            .upload(fileName, image);
        
        if (uploadError) {
            setMessage(`upload failed: ${uploadError.message}`);
            return;
        }

        const { data: publicUrlData } = supabase.storage              // give a public URL
            .from('reports')
            .getPublicUrl(fileName);
        
        if (!imageUrl) {
            setMessage('Could not retrieve image URL.')
            return;
        }

        const { error: insertError } = await supabase                 // Insert into supabase
            .from('reports')
            .insert([{ image_url: imageUrl }]);

        if (insertError) {
            setMessage(`Database insert failed: ${insertError.message}`);
            return;
        }

        setMessage('File uploaded and saved to reports!');
        setImage(null);
        
    };
    return (
        <div>
            <button onClick={handleLogout} style={{ position: 'absolute', top: 10, right: 10 }}>
                Log Out
            </button>
            <h1>Welcome to your Dashboard</h1>
            {/* Add additional dashboard content here */}
        </div>
    );
};

export default Dashboard;
