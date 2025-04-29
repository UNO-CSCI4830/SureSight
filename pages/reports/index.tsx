import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/layout/Layout";
import AuthGuard from "../../components/auth/AuthGuard";
import { supabase, handleSupabaseError } from "../../utils/supabaseClient";
import { PageHeader, Card, LoadingSpinner, StatusMessage } from "../../components/common";
import { FormInput, Select, Button } from "../../components/ui";
import { Report } from "../../types/supabase";

type ExtendedReport = Report & {
  property?: {
    address_line1: string;
    city: string;
    state: string;
  };
  assessment_areas_count?: number;
  images_count?: number;
};

const ReportsPage: React.FC = () => {
  const router = useRouter();
  const [reports, setReports] = useState<ExtendedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showMessageTimeout, setShowMessageTimeout] = useState<NodeJS.Timeout | null>(null);

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "in_review", label: "In Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  useEffect(() => {
    fetchReports();
    
    // Clear any existing message timeout when component unmounts
    return () => {
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
    };
  }, [statusFilter, sortOrder]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      // First, get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Get the database user ID from the auth user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (userError) {
        throw userError;
      }
      
      // Build the query for reports
      let query = supabase
        .from("reports")
        .select(`
          *,
          property:properties(address_line1, city, state),
          assessment_areas:assessment_areas(id),
          images:images(id)
        `)
        .eq("creator_id", userData.id);

      // Apply status filter if not "all"
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply sorting
      query = query.order("created_at", { ascending: sortOrder === "asc" });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to count related items and format it for display
      const formattedReports = (data || []).map((report: any) => ({
        ...report,
        assessment_areas_count: report.assessment_areas?.length || 0,
        images_count: report.images?.length || 0
      }));

      setReports(formattedReports);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to load reports: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewReport = () => {
    router.push("/reports/new");
  };

  const handleViewReport = (reportId: string) => {
    router.push(`/reports/${reportId}`);
  };
  
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }
    
    setIsLoading(true);
    try {
      // First check if there are any assessment areas for this report
      const { data: assessmentAreas, error: areasError } = await supabase
        .from("assessment_areas")
        .select("id")
        .eq("report_id", reportId);
        
      if (areasError) {
        throw areasError;
      }
      
      // Delete any assessment areas first (cascade may handle this, but being explicit)
      if (assessmentAreas && assessmentAreas.length > 0) {
        const { error: deleteAreasError } = await supabase
          .from("assessment_areas")
          .delete()
          .in("id", assessmentAreas.map(area => area.id));
          
        if (deleteAreasError) {
          throw deleteAreasError;
        }
      }
      
      // Delete images associated with the report
      const { error: deleteImagesError } = await supabase
        .from("images")
        .delete()
        .eq("report_id", reportId);
        
      if (deleteImagesError) {
        throw deleteImagesError;
      }
      
      // Delete the report itself
      const { error: deleteError } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);
        
      if (deleteError) {
        throw deleteError;
      }
      
      // Show success message
      setMessage({
        text: "Report deleted successfully",
        type: "success"
      });
      
      // Refresh the list of reports
      fetchReports();
      
      // Clear any existing message timeout
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
      
      // Set a new timeout to clear the message after 5 seconds
      const timeout = setTimeout(() => {
        setMessage(null);
      }, 5000);
      
      setShowMessageTimeout(timeout);
    } catch (error: any) {
      console.error("Error deleting report:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to delete report: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format status display
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  // Helper function to determine badge color by status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "in_review":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderReportCard = (report: ExtendedReport) => {
    const propertyAddress = report.property ? 
      `${report.property.address_line1}, ${report.property.city}, ${report.property.state}` : 
      "No property address";
    
    const createdDate = new Date(report.created_at).toLocaleDateString();
    
    return (
      <Card key={report.id} className="mb-4">
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium">{report.title}</h3>
              <p className="text-gray-600">{propertyAddress}</p>
              <p className="text-sm text-gray-500 mt-1">
                Created: {createdDate}
              </p>
              {report.incident_date && (
                <p className="text-sm text-gray-500">
                  Incident Date: {new Date(report.incident_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  report.status
                )}`}
              >
                {formatStatus(report.status)}
              </span>
              <div className="mt-2 text-sm text-gray-500">
                <span className="mr-3">{report.assessment_areas_count} Areas</span>
                <span>{report.images_count} Images</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => handleViewReport(report.id)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View Details
            </button>
            {report.status === "draft" && (
              <button
                onClick={() => handleDeleteReport(report.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Layout title="My Reports | SureSight">
      <AuthGuard>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <PageHeader title="My Reports" subtitle="View and manage your property damage reports" />
              <div className="mt-4 md:mt-0">
                <Button variant="primary" onClick={handleCreateNewReport}>
                  Create New Report
                </Button>
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

            <div className="mb-6 flex flex-col md:flex-row justify-between">
              <div className="w-full md:w-64 mb-4 md:mb-0">
                <Select
                  id="statusFilter"
                  label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions}
                />
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-600">Sort by:</span>
                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  Date {sortOrder === "desc" ? "▼ Newest first" : "▲ Oldest first"}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="md" text="Loading reports..." />
              </div>
            ) : reports.length === 0 ? (
              <Card>
                <div className="p-8 text-center">
                  <h3 className="text-lg font-medium text-gray-500 mb-4">No reports found</h3>
                  <p className="mb-6 text-gray-500">
                    {statusFilter !== "all"
                      ? `No reports with status "${formatStatus(
                          statusFilter
                        )}". Try changing the filter.`
                      : "You haven't created any reports yet."}
                  </p>
                  <Button variant="primary" onClick={handleCreateNewReport}>
                    Create Your First Report
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => renderReportCard(report))}
              </div>
            )}
          </div>
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default ReportsPage;