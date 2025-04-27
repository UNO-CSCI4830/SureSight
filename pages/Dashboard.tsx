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

  useEffect(() => {
    if (user) {
      fetchReports();
      fetchDashboardData();
    }
  }, [user, statusFilter]);

  const fetchDashboardData = async () => {
    try {
      if (user?.id) {
        // Fetch count of properties for this user
        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("id", { count: "exact" })
          .eq("owner_id", user.id);

        if (!propertyError) {
          setPropertiesCount(propertyData?.length || 0);
        }

        // Fetch count of reports for this user
        const { data: reportData, error: reportError } = await supabase
          .from("reports")
          .select("id", { count: "exact" })
          .eq("creator_id", user.id);

        if (!reportError) {
          setReportsCount(reportData?.length || 0);
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const handleUploadComplete = async (urls: string[]) => {
    if (urls.length > 0 && user?.id) {
      try {
        // First check if the user has any properties
        const { data: properties, error: propertyError } = await supabase
          .from("properties")
          .select("id")
          .eq("owner_id", user.id)
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
          const { error } = await supabase.from("reports").insert([
            {
              property_id: propertyId,
              creator_id: user.id,
              status: "submitted",
              title: `Inspection Report - ${new Date().toLocaleDateString()}`,
              main_image_url: imageUrl,
            },
          ]);

          if (error) {
            console.error("Error saving to reports table:", error);
            setMessage({
              text: "Error saving some uploads to the database.",
              type: "error",
            });
          }
        }

        setMessage({
          text: `${urls.length} file(s) uploaded and reports created!`,
          type: "success",
        });

        fetchReports();
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
    router.push("/reports/new");
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
