import React, { useState, useEffect } from 'react';
import AuthGuard from '../components/auth/AuthGuard';
import FileUpload from '../components/ui/FileUpload';
import Layout from '../components/layout/Layout';
import { supabase } from '../utils/supabaseClient';

const Dashboard: React.FC = () => {
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [username, setUsername] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

    useEffect(() => {
        async function fetchUserDetails() {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                setUsername(user.email?.split('@')[0] || 'User');
                
                // Fetch user role
                const { data, error } = await supabase
                    .from('user_roles')
                    .select('roles(name)')
                    .eq('user_id', user.id)
                    .single();
                
                if (!error && data) {
                    setUserRole(data.roles?.[0]?.name || '');
                }
            }
        }
        
        fetchUserDetails();
    }, []);

    // Handle successful file upload
    const handleUploadComplete = (urls: string[]) => {
        console.log('Upload completed. File URLs:', urls);
        setUploadedImages(prev => [...prev, ...urls]);
    };

    return (
        <AuthGuard>
            <Layout title="Dashboard | SureSight" description="SureSight user dashboard">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome, {username}</h1>
                    {userRole && (
                        <p className="text-gray-600 mt-1">
                            You're logged in as a <span className="font-medium">{userRole}</span>
                        </p>
                    )}
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <div className="flex space-x-8">
                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'upload' 
                                    ? 'border-primary-500 text-primary-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Upload Images
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'history' 
                                    ? 'border-primary-500 text-primary-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Upload History
                        </button>
                    </div>
                </div>

                {activeTab === 'upload' && (
                    <div className="card">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Upload Damage Photos</h2>
                            <p className="text-gray-600 mt-1">Upload images of roofing or siding damage for assessment.</p>
                        </div>
                        
                        <FileUpload 
                            bucket="reports" 
                            onUploadComplete={handleUploadComplete}
                            acceptedFileTypes="image/*"
                            maxFileSize={10} // 10MB
                            multiple={true}
                        />
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="card">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Upload History</h2>
                            <p className="text-gray-600 mt-1">View all your previous uploads</p>
                        </div>
                        
                        {uploadedImages.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {uploadedImages.map((image, index) => (
                                    <div key={index} className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
                                        <img 
                                            src={image} 
                                            alt={`Uploaded damage photo ${index + 1}`}
                                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-end justify-start transition-all duration-300">
                                            <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <p className="text-xs truncate">Photo {index + 1}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <p className="text-gray-500">No images uploaded yet</p>
                                <button 
                                    onClick={() => setActiveTab('upload')}
                                    className="mt-4 text-primary-600 hover:text-primary-500 font-medium"
                                >
                                    Upload your first image
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Recently uploaded images section - only show if on upload tab and there are images */}
                {activeTab === 'upload' && uploadedImages.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recently Uploaded</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {uploadedImages.slice(-8).map((image, index) => (
                                <div key={index} className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-square shadow-sm hover:shadow-md transition-shadow duration-300">
                                    <img 
                                        src={image} 
                                        alt={`Uploaded damage photo ${uploadedImages.length - index}`}
                                        className="object-cover w-full h-full"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                        <p className="text-white text-xs">Photo {uploadedImages.length - index}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Layout>
        </AuthGuard>
    );
};

export default Dashboard;
