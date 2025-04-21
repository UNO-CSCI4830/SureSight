import React, { useState } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '../components/auth/AuthGuard';
import FileUpload from '../components/ui/FileUpload';
import Layout from '../components/layout/Layout';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const Dashboard: React.FC = () => {
    const router = useRouter();
    const [message, setMessage] = useState('');

    const handleUploadComplete = async (urls: string[]) => {
        if (urls.length > 0) {
            try {
                const auditLogs = [];

                for (const imageUrl of urls) {
                    const { error } = await supabase
                        .from('reports')
                        .insert([{ image_url: imageUrl }]);

                    if (error) {
                        console.error('Error saving to reports table:', error);
                        setMessage('Error saving some uploads to the database.');
                    } else {
                        // Log the successful upload
                        auditLogs.push({
                            id: uuidv4(),
                            timestamp: new Date().toISOString(),
                            user_id: 'current_user_id', // Replace with actual user ID
                            action: 'UPLOAD',
                            details: `Uploaded image URL: ${imageUrl}`
                        });
                    }
                }

                // Save audit logs to the database
                if (auditLogs.length > 0) {
                    const { error: logError } = await supabase
                        .from('audit_logs')
                        .insert(auditLogs);

                    if (logError) {
                        console.error('Error saving audit logs:', logError);
                    }
                }

                setMessage(`${urls.length} file(s) uploaded and saved to reports!`);
            } catch (err) {
                console.error('Unexpected error:', err);
                setMessage('An unexpected error occurred while saving to the database.');
            }
        }
    };

    return (
        <Layout title="Dashboard - SureSight">
            <AuthGuard>
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-2xl font-semibold text-gray-800 mb-6">Welcome to your Dashboard</h1>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-medium text-gray-700 mb-4">Upload Images</h2>
                        <p className="text-gray-600 mb-6">
                            Upload roof or siding inspection photos to generate damage assessment reports.
                        </p>
                        
                        <FileUpload 
                            bucket="reports"
                            onUploadComplete={handleUploadComplete}
                            acceptedFileTypes="image/*"
                            maxFileSize={10}
                            storagePath="inspections"
                            multiple={true}
                        />
                    </div>
                    
                    {/* Additional dashboard content can be added here */}
                </div>
            </AuthGuard>
        </Layout>
    );
};

export default Dashboard;
