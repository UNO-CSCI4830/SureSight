import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '../components/auth/AuthGuard';
import FileUpload from '../components/ui/FileUpload';
import Layout from '../components/layout/Layout';
import { supabase } from '../utils/supabaseClient';
import { PageHeader, Card, StatusMessage } from '../components/common';

const Dashboard: React.FC = () => {
    const router = useRouter();
    const [message, setMessage] = useState<{text: string; type: 'success' | 'error' | 'info'} | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [propertiesCount, setPropertiesCount] = useState<number>(0);
    const [reportsCount, setReportsCount] = useState<number>(0);

    useEffect(() => {
        // Get the current user and fetch their dashboard data
        const getCurrentUser = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error fetching session:', error);
                return;
            }
            
            if (session?.user) {
                const id = session.user.id;
                setUserId(id);
                
                // Fetch count of properties and reports for this user
                if (id) {
                    try {
                        const { data: propertyData, error: propertyError } = await supabase
                            .from('properties')
                            .select('id', { count: 'exact' })
                            .eq('owner_id', id);
                            
                        if (!propertyError) {
                            setPropertiesCount(propertyData?.length || 0);
                        }
                        
                        const { data: reportData, error: reportError } = await supabase
                            .from('reports')
                            .select('id', { count: 'exact' })
                            .eq('created_by', id);
                            
                        if (!reportError) {
                            setReportsCount(reportData?.length || 0);
                        }
                    } catch (err) {
                        console.error('Error fetching user data:', err);
                    }
                }
            }
        };
        
        getCurrentUser();
    }, []);

    const handleUploadComplete = async (urls: string[]) => {
        if (urls.length > 0 && userId) {
            try {
                // First check if the user has any properties
                const { data: properties, error: propertyError } = await supabase
                    .from('properties')
                    .select('id')
                    .eq('owner_id', userId)
                    .limit(1);
                
                if (propertyError) {
                    throw propertyError;
                }
                
                // If no properties found, suggest creating one first
                if (!properties || properties.length === 0) {
                    setMessage({
                        text: 'Please add a property before creating reports.',
                        type: 'info'
                    });
                    return;
                }
                
                const propertyId = properties[0].id;
                
                // Create a new report for each uploaded image
                for (const imageUrl of urls) {
                    const { error } = await supabase
                        .from('reports')
                        .insert([{ 
                            property_id: propertyId,
                            created_by: userId,
                            status: 'pending',
                            title: `Inspection Report - ${new Date().toLocaleDateString()}`,
                            main_image_url: imageUrl
                        }]);
                        
                    if (error) {
                        console.error('Error saving to reports table:', error);
                        setMessage({
                            text: 'Error saving some uploads to the database.',
                            type: 'error'
                        });
                    }
                }
                
                setMessage({
                    text: `${urls.length} file(s) uploaded and reports created!`,
                    type: 'success'
                });
                
                // Update report count
                setReportsCount(prev => prev + urls.length);
                
            } catch (err) {
                console.error('Unexpected error:', err);
                setMessage({
                    text: 'An unexpected error occurred while saving to the database.',
                    type: 'error'
                });
            }
        }
    };

    return (
        <Layout title="Dashboard - SureSight">
            <AuthGuard>
                <div className="container mx-auto px-4 py-6">
                    <PageHeader
                        title="Dashboard"
                        subtitle="Manage your properties and reports"
                    />
                    
                    {message && (
                        <StatusMessage
                            type={message.type}
                            text={message.text}
                            className="mb-6"
                            onDismiss={() => setMessage(null)}
                        />
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card>
                            <div className="p-6 text-center">
                                <h3 className="text-lg font-medium">Properties</h3>
                                <p className="text-3xl font-bold text-primary-600 mt-2">{propertiesCount}</p>
                                <button
                                    onClick={() => router.push('/properties')}
                                    className="mt-4 text-sm text-primary-600 hover:text-primary-800"
                                >
                                    Manage Properties
                                </button>
                            </div>
                        </Card>
                        
                        <Card>
                            <div className="p-6 text-center">
                                <h3 className="text-lg font-medium">Reports</h3>
                                <p className="text-3xl font-bold text-primary-600 mt-2">{reportsCount}</p>
                                <button
                                    onClick={() => router.push('/reports')}
                                    className="mt-4 text-sm text-primary-600 hover:text-primary-800"
                                >
                                    View Reports
                                </button>
                            </div>
                        </Card>
                        
                        <Card>
                            <div className="p-6 text-center">
                                <h3 className="text-lg font-medium">Account Status</h3>
                                <p className="text-xl font-medium text-green-600 mt-2">Active</p>
                                <button
                                    onClick={() => router.push('/profile')}
                                    className="mt-4 text-sm text-primary-600 hover:text-primary-800"
                                >
                                    View Profile
                                </button>
                            </div>
                        </Card>
                    </div>
                    
                    <Card>
                        <div className="p-6">
                            <h2 className="text-xl font-medium text-gray-700 mb-4">Create New Report</h2>
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
                    </Card>
                </div>
            </AuthGuard>
        </Layout>
    );
};

export default Dashboard;
