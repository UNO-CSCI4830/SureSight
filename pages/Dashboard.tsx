import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AuthGuard from "../components/auth/AuthGuard";
import FileUpload from "../components/ui/FileUpload";
import Layout from "../components/layout/Layout";
import { supabase, useSupabaseAuth } from "../utils/supabaseClient";
import { PageHeader, Card, StatusMessage } from "../components/common";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertiesCount, setPropertiesCount] = useState<number>(0);
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [weather, setWeather] = useState<{temp: number; description: string; city: string} | null>(null);
  
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("reports")
        .select("*, property:properties(*)")
        .eq("creator_id", user?.id);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query.order("created_at", {
        ascending: false,
      });

      if (fetchError) {
        throw fetchError;
      }

      setReports(data || []);
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      setError(err.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      if (user) {
        // First get the user's profile ID from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
          
        if (userError) {
          console.error("Error finding user record:", userError);
          return;
        }
        
        // Then get the profile ID
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userData.id)
          .single();
          
        if (profileError) {
          console.error("Error finding profile:", profileError);
          return;
        }
        
        // If user is homeowner, get their homeowner profile
        const { data: homeownerData, error: homeownerError } = await supabase
          .from('homeowner_profiles')
          .select('id, property_count')
          .eq('id', profileData.id)
          .single();
          
        if (!homeownerError && homeownerData) {
          // Use the property_count directly from homeowner profile if available
          if (homeownerData.property_count !== null && homeownerData.property_count !== undefined) {
            setPropertiesCount(homeownerData.property_count);
          } else {
            // Fallback to counting properties (should match property_count)
            const { data: propertyData, error: propertyError } = await supabase
              .from("properties")
              .select("id")
              .eq("homeowner_id", homeownerData.id);

            if (!propertyError) {
              setPropertiesCount(propertyData?.length || 0);
              
              // Update the homeowner profile with the correct count if needed
              if ((propertyData?.length || 0) !== homeownerData.property_count) {
                await supabase
                  .from('homeowner_profiles')
                  .update({ property_count: propertyData?.length || 0 })
                  .eq('id', homeownerData.id)
                  .select();
              }
            } else {
              console.error("Error fetching properties:", propertyError);
            }
          }
        }

        // Fetch count of reports for this user
        const { data: reportData, error: reportError } = await supabase
          .from("reports")
          .select("id")
          .eq("creator_id", userData.id);

        if (!reportError) {
          setReportsCount(reportData?.length || 0);
        } else {
          console.error("Error fetching reports:", reportError);
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const fetchWeather = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      if(!apiKey) {
        console.error('Missing OpenWeather API Key');
        return;
      }
      const locationResponse = await fetch('https://ipapi.co/json/');
      const locationData = await locationResponse.json();
      const userCity = locationData.city;

      const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(userCity)}&appid=${apiKey}&units=imperial`);
      if (!weatherResponse.ok) {
        throw new Error('Failed to fetch weather');
      }

      const weatherData = await weatherResponse.json();
      setWeather({
        temp: weatherData.main.temp,
        description: weatherData.weather[0].description,
        city: weatherData.name,
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReports();
      fetchUserData();
      fetchWeather();
    }
  }, [user, statusFilter]);

  const handleUploadComplete = async (urls: string[]) => {
    if (urls.length > 0 && user?.id) {
      try {
        // First get the user record from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
          
        if (userError) {
          throw new Error("Could not find user record");
        }
        
        // Get the profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userData.id)
          .single();
          
        if (profileError) {
          throw new Error("Could not find user profile");
        }
        
        // Get the homeowner profile
        const { data: homeownerData, error: homeownerError } = await supabase
          .from('homeowner_profiles')
          .select('id')
          .eq('id', profileData.id)
          .single();
          
        if (homeownerError) {
          throw new Error("You need a homeowner profile to create reports");
        }

        // First check if the user has any properties
        const { data: properties, error: propertyError } = await supabase
          .from("properties")
          .select("id")
          .eq("homeowner_id", homeownerData.id)
          .limit(1);

        if (propertyError) {
          throw propertyError;
        }

        // If no properties found, suggest creating one first
        if (!properties || properties.length === 0) {
          setMessage({
            text: "Please add a property before creating reports.",
            type: "info",
          });
          return;
        }

        const propertyId = properties[0].id;

        // Create a new report for each uploaded image
        for (const imageUrl of urls) {
          // First create the report
          const { data: reportData, error: reportError } = await supabase
            .from("reports")
            .insert([
              {
                property_id: propertyId,
                creator_id: userData.id,
                status: "submitted",
                title: `Inspection Report - ${new Date().toLocaleDateString()}`
              }
            ])
            .select();

          if (reportError) {
            console.error("Error saving to reports table:", reportError);
            setMessage({
              text: "Error saving some uploads to the database.",
              type: "error",
            });
            continue; // Skip to next iteration if this one failed
          }

          // If report creation was successful, create an image record linked to this report
          if (reportData && reportData[0]) {
            const { error: imageError } = await supabase
              .from("images")
              .insert([
                {
                  report_id: reportData[0].id,
                  filename: imageUrl.split('/').pop() || 'unknown',
                  storage_path: imageUrl,
                  uploaded_by: userData.id,
                  ai_processed: false
                }
              ]);

            if (imageError) {
              console.error("Error saving image metadata:", imageError);
            }
          }
        }

        setMessage({
          text: `${urls.length} file(s) uploaded and reports created!`,
          type: "success",
        });

        fetchReports();
        fetchUserData(); // Also refresh the user data to update report counts
      } catch (err) {
        console.error("Unexpected error:", err);
        setMessage({
          text: "An unexpected error occurred while saving to the database.",
          type: "error",
        });
      }
    }
  };

  const handleCreateNewReport = () => {
    router.push("/reports/create");
  };

  // Helper function to format status display
  const formatStatus = (status: string) => {
    switch (status) {
      case "submitted":
        return "Submitted";
      case "in_review":
        return "In Review";
      case "completed":
        return "Completed";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Helper function to determine badge color by status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "in_review":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout title="Dashboard - SureSight">
      <AuthGuard>
        <div className="containter mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <PageHeader
              title="Dashboard"
              subtitle="Manage your properties and reports"
            />

            
            <div className="mt-4 md:mt-0 md:ml-4">
              <Card>
                <div className="p-4 text-center">
                  <h3 className="text-sm font-medium text-gray-600">
                     {weather ? `Weather in ${weather.city}` : "Fetching weather..."}
                  </h3>
                  {weather ? (
                    <>
                      <p className="text-xl font-bold text-primary-600">{weather.temp}°F</p>
                      <p className="text-gray-500 capitalize text-sm">{weather.description}</p>
                    </>
                  ) : (
                      <p className="text-gray-400 text-sm">Loading weather...</p>
                  )}
                </div>
              </Card>
            </div>
           
          </div>

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
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  {propertiesCount}
                </p>
                <button
                  onClick={() => router.push("/properties")}
                  className="mt-4 text-sm text-primary-600 hover:text-primary-800"
                >
                  Manage Properties
                </button>
              </div>
            </Card>

            <Card>
              <div className="p-6 text-center">
                <h3 className="text-lg font-medium">Reports</h3>
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  {reportsCount}
                </p>
                <button
                  onClick={() => router.push("/reports")}
                  className="mt-4 text-sm text-primary-600 hover:text-primary-800"
                >
                  View Reports
                </button>
              </div>
            </Card>

            <Card>
              <div className="p-6 text-center">
                <h3 className="text-lg font-medium">Account Status</h3>
                <p className="text-xl font-medium text-green-600 mt-2">
                  Active
                </p>
                <button
                  onClick={() => router.push("/profile")}
                  className="mt-4 text-sm text-primary-600 hover:text-primary-800"
                >
                  View Profile
                </button>
              </div>
            </Card>
            
          </div>

          {/* Recent Reports Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Reports</h2>
              <div className="flex items-center space-x-4">
                <div className="w-40">
                  <Select
                    id="statusFilter"
                    label="Filter by status"
                    name="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "submitted", label: "Submitted" },
                      { value: "in_review", label: "In Review" },
                      { value: "completed", label: "Completed" },
                    ]}
                  />
                </div>
                <Button variant="primary" onClick={handleCreateNewReport}>
                  Create New Report
                </Button>
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <Card>
                <div className="p-8 text-center">
                  <p className="text-gray-600">Loading reports...</p>
                </div>
              </Card>
            )}

            {/* Error state */}
            {error && (
              <Card>
                <div className="p-8 text-center">
                  <p className="text-red-600 mb-2">Error</p>
                  <p className="text-gray-600">{error}</p>
                </div>
              </Card>
            )}

            {/* Empty state */}
            {!loading && !error && reports.length === 0 && (
              <Card>
                <div className="p-8 text-center">
                  <p className="text-gray-600 mb-4">No reports found</p>
                  <p className="text-gray-500 text-sm">
                    {statusFilter !== "all"
                      ? `No reports with status "${formatStatus(
                          statusFilter
                        )}". Try changing the filter.`
                      : 'Click the "Create New Report" button to get started.'}
                  </p>
                </div>
              </Card>
            )}

            {/* Reports list */}
            {!loading && !error && reports.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">
                            {report.title}
                          </h3>
                          <p className="text-gray-600">
                            {report.property?.address_line1}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Created:{" "}
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            report.status
                          )}`}
                        >
                          {formatStatus(report.status)}
                        </span>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => router.push(`/reports/${report.id}`)}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-medium text-gray-700 mb-4">
                Quick Upload
              </h2>
              <p className="text-gray-600 mb-6">
                Upload roof or siding inspection photos to generate damage
                assessment reports.
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
