import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useRouter } from 'next/router';

const Dashboard: React.FC = () => {
    const router = useRouter();
    const [image, setImage] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [notifications, setNotifications] = useState<string[]>([]);


    // Handle clicks outside the menu to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error.message);
            } else {
                console.log('User logged out');
                window.location.href = '/index'; // Redirect to home page after logout
            }
        } catch (err) {
            console.error('Unexpected error during logout:', err);
        }
    };
    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser();
    
        if (!user) {
            setMessage("No user session found.");
            return;
        }
    
        const { data, error } = await supabase
            .from('notifications')
            .select('message')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
    
        if (error) {
            console.error('Error fetching notifications:', error.message);
            setMessage("Error fetching notifications.");
            return;
        }
    
        setNotifications(data.map((n: any) => n.message));
        alert(data.length ? data.map((n: any) => `• ${n.message}`).join('\n') : 'No notifications yet.');
    };
    

    const handleChangePassword = () => {
        router.push('/updatepassword');
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setImage(file);
    };

    const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage('');

        if (!image) {
            setMessage('Please select a file to upload');
            return;
        }

        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage // Uploading to supabase
            .from('reports')
            .upload(fileName, image);

        if (uploadError) {
            setMessage(`upload failed: ${uploadError.message}`);
            return;
        }

        const { data: publicUrlData } = supabase.storage // give a public URL
            .from('reports')
            .getPublicUrl(fileName);

        const imageUrl = publicUrlData?.publicUrl;

        if (!imageUrl) {
            setMessage('Could not retrieve image URL.');
            return;
        }

        const { error: insertError } = await supabase // Insert into supabase
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
            <div className="hamburger-menu" ref={menuRef}>
                <button 
                    onClick={toggleMenu}
                    className="hamburger-button"
                    aria-label="Menu"
                    title="Open menu"
                >
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                </button>
                
                {menuOpen && (
                    <div className="dropdown-menu">
                        <ul className="menu-list">
                            <li className= "menu-item menu-item-border" onClick={fetchNotifications}
                              >
                                Notifications
                            </li>    
                            <li className="menu-item menu-item-border" onClick={handleChangePassword}>
                                Change Password
                            </li>
                            <li className="menu-item" onClick={handleLogout}>
                                Log Out
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            <h1>Welcome to your Dashboard</h1>

            <form onSubmit={handleUpload} className="upload-form">
                <div className="file-input-container">
                    <label htmlFor="file-upload">Upload a file:</label><br />
                    <input 
                        id="file-upload"
                        type="file" 
                        onChange={handleFileChange} 
                        aria-label="File upload"
                        title="Select a file to upload"
                    />
                </div>
                <button 
                    type="submit" 
                    className="upload-button"
                >
                    Upload
                </button>
                {message && <p className="message">{message}</p>}
            </form>
            {/* Add additional dashboard content here */}
        </div>
    );
};

export default Dashboard;
