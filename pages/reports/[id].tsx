import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/layout/Layout";
import AuthGuard from "../../components/auth/AuthGuard";
import { supabase, handleSupabaseError } from "../../utils/supabaseClient";
import {
  PageHeader,
  Card,
  LoadingSpinner,
  StatusMessage,
} from "../../components/common";
import { FormInput, Select, TextArea, Button } from "../../components/ui";
import FileUpload from "../../components/ui/FileUpload";

// Define these types locally since they're not exported from the database types
interface Report {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  incident_date: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  property_id: string;
  creator_id: string;
  contractor_id: string | null;
  adjuster_id: string | null;
}

interface AssessmentArea {
  id: string;
  report_id: string;
  damage_type: string;
  location: string;
  severity: string;
  dimensions: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type DamageType = "roof" | "siding" | "window" | "structural" | "water" | "other";
type DamageSeverity = "minor" | "moderate" | "severe" | "critical";

type ExtendedReport = Report & {
  property?: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    property_type: string | null;
    square_footage: number | null;
    year_built: number | null;
  };
  assessment_areas?: AssessmentArea[];
  images?: {
    id: string;
    storage_path: string;
    filename: string;
    created_at: string;
    assessment_area_id: string | null;
    ai_damage_type: string | null;
    ai_damage_severity: string | null;
    ai_confidence: number | null;
  }[];
};

type AssessmentAreaForm = {
  location: string;
  damage_type: string;
  severity: string;
  dimensions: string;
  notes: string;
};

const ReportDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

  const [report, setReport] = useState<ExtendedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [showMessageTimeout, setShowMessageTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Form states
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [incidentDate, setIncidentDate] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  // Assessment area form
  const [areaForm, setAreaForm] = useState<AssessmentAreaForm>({
    location: "",
    damage_type: "roof",
    severity: "minor",
    dimensions: "",
    notes: "",
  });

  const damageTypes = [
    { value: "roof", label: "Roof" },
    { value: "siding", label: "Siding" },
    { value: "window", label: "Window" },
    { value: "structural", label: "Structural" },
    { value: "water", label: "Water" },
    { value: "other", label: "Other" },
  ];

  const damageSeverities = [
    { value: "minor", label: "Minor" },
    { value: "moderate", label: "Moderate" },
    { value: "severe", label: "Severe" },
    { value: "critical", label: "Critical" },
  ];

  useEffect(() => {
    if (id) {
      fetchReport(id as string);
    }

    // Clear any existing message timeout when component unmounts
    return () => {
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
    };
  }, [id]);

  const fetchReport = async (reportId: string) => {
    setIsLoading(true);
    try {
      // First, get the current user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        router.push("/login");
        return;
      }

      // Get the database user ID from the auth user ID
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Fetch the report with all related data
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select(
          `
          *,
          property:properties(*),
          assessment_areas:assessment_areas(*),
          images:images(*)
        `
        )
        .eq("id", reportId)
        .eq("creator_id", userData.id)
        .single();

      if (reportError) {
        throw reportError;
      }

      if (!reportData) {
        throw new Error("Report not found");
      }

      setReport(reportData);

      // Set form data from report
      setTitle(reportData.title);
      setDescription(reportData.description || "");
      setIncidentDate(
        reportData.incident_date
          ? new Date(reportData.incident_date).toISOString().split("T")[0]
          : ""
      );
      setStatus(reportData.status);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to load report: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get the public URL for an image path
  const getPublicImageUrl = (storagePath: string) => {
    if (!storagePath) return '';
    
    // If the path already contains the full URL, return it directly
    if (storagePath.startsWith('http')) {
      return storagePath;
    }
    
    // Determine the correct bucket based on the storage path
    let bucket = 'reports'; // Default bucket for reports page
    
    // If the path already includes the bucket name at the start, extract it
    if (storagePath.startsWith('property-images/') || storagePath.startsWith('reports/')) {
      const parts = storagePath.split('/');
      bucket = parts[0];
      // Remove the bucket name from the path for proper URL construction
      storagePath = storagePath.substring(bucket.length + 1); // +1 for the slash
    }
    
    // Get public URL using Supabase client
    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return data?.publicUrl || '';
    } catch (err) {
      console.error('Error getting public URL:', err);
      
      // Attempt to use a direct URL construction as a fallback
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://khqevpnoodeggshfxeaa.supabase.co';
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(storagePath)}`;
    }
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!report) return;

      const updates = {
        title,
        description: description || null,
        incident_date: incidentDate || null,
        status,
      };

      const { error: updateError } = await supabase
        .from("reports")
        .update(updates)
        .eq("id", report.id);

      if (updateError) {
        throw updateError;
      }

      // Show success message
      setMessage({
        text: "Report updated successfully",
        type: "success",
      });

      // Refresh the report data
      fetchReport(report.id);

      // Exit editing mode
      setIsEditing(false);

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
      console.error("Error updating report:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to update report: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!report) return;
    if (report.status !== "draft") {
      setMessage({
        text: "Only draft reports can be submitted",
        type: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get the current date/time
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("reports")
        .update({
          status: "submitted",
          submitted_at: now,
        })
        .eq("id", report.id);

      if (updateError) {
        throw updateError;
      }

      // Show success message
      setMessage({
        text: "Report submitted successfully",
        type: "success",
      });

      // Refresh the report data
      fetchReport(report.id);

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
      console.error("Error submitting report:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to submit report: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAreaInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setAreaForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!report) return;

    setIsLoading(true);
    try {
      // First, get the current user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session || !session.user.id) {
        router.push("/login");
        return;
      }

      // Get the database user ID from the auth user ID
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Add the assessment area
      const { data, error: areaError } = await supabase
        .from("assessment_areas")
        .insert({
          report_id: report.id,
          location: areaForm.location,
          damage_type: areaForm.damage_type,
          severity: areaForm.severity,
          dimensions: areaForm.dimensions || null,
          notes: areaForm.notes || null,
        })
        .select()
        .single();

      if (areaError) {
        throw areaError;
      }

      // Show success message
      setMessage({
        text: "Assessment area added successfully",
        type: "success",
      });

      // Refresh the report data
      fetchReport(report.id);

      // Reset the form and exit adding mode
      setAreaForm({
        location: "",
        damage_type: "roof",
        severity: "minor",
        dimensions: "",
        notes: "",
      });
      setIsAddingArea(false);

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
      console.error("Error adding assessment area:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to add assessment area: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (
      !window.confirm("Are you sure you want to delete this assessment area?")
    ) {
      return;
    }

    setIsLoading(true);
    try {
      // Delete any images associated with this area
      const { error: imageError } = await supabase
        .from("images")
        .delete()
        .eq("assessment_area_id", areaId);

      if (imageError) {
        throw imageError;
      }

      // Delete the area
      const { error: deleteError } = await supabase
        .from("assessment_areas")
        .delete()
        .eq("id", areaId);

      if (deleteError) {
        throw deleteError;
      }

      // Show success message
      setMessage({
        text: "Assessment area deleted successfully",
        type: "success",
      });

      // Refresh the report data
      if (report) {
        fetchReport(report.id);
      }

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
      console.error("Error deleting assessment area:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to delete assessment area: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagesUpload = async (urls: string[], areaId?: string) => {
    if (!report) return;

    setIsLoading(true);
    try {
      // First, get the current user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session || !session.user.id) {
        router.push("/login");
        return;
      }

      // Get the database user ID from the auth user ID
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      console.log(`Preparing to add ${urls.length} images to report ${report.id}${areaId ? ` and area ${areaId}` : ''}`);

      // Create entries for each uploaded image
      const imagesData = urls.map((url) => {
        // Extract the actual storage path from the URL - this is important
        // URL format is something like: https://[project].supabase.co/storage/v1/object/public/reports/[path]
        // We just need the part after the bucket name
        const urlParts = url.split('/');
        const bucketIndex = urlParts.indexOf('reports');
        const storagePath = bucketIndex >= 0 && bucketIndex < urlParts.length - 1 
          ? urlParts.slice(bucketIndex).join('/') 
          : url; // Fallback to full URL if we can't parse it correctly
        
        const filename = urlParts[urlParts.length - 1] || "unknown";

        console.log(`Processing image: ${filename}, area ID: ${areaId || 'none'}, path: ${storagePath}`);

        return {
          report_id: report.id,
          assessment_area_id: areaId || null,
          filename,
          storage_path: storagePath,
          uploaded_by: userData.id,
          ai_processed: false,
        };
      });

      if (imagesData.length > 0) {
        console.log("Inserting image records into database:", imagesData);
        const { data: insertedData, error: insertError } = await supabase
          .from("images")
          .insert(imagesData)
          .select();

        if (insertError) {
          console.error("Error inserting images:", insertError);
          throw insertError;
        }

        console.log("Successfully inserted images:", insertedData);

        // Show success message
        setMessage({
          text: `${imagesData.length} image(s) uploaded successfully`,
          type: "success",
        });

        // Refresh the report data
        fetchReport(report.id);

        // Clear any existing message timeout
        if (showMessageTimeout) {
          clearTimeout(showMessageTimeout);
        }

        // Set a new timeout to clear the message after 5 seconds
        const timeout = setTimeout(() => {
          setMessage(null);
        }, 5000);

        setShowMessageTimeout(timeout);
      }
    } catch (error: any) {
      console.error("Error saving uploaded images:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to save images: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    setIsLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("images")
        .delete()
        .eq("id", imageId);

      if (deleteError) {
        throw deleteError;
      }

      // Show success message
      setMessage({
        text: "Image deleted successfully",
        type: "success",
      });

      // Refresh the report data
      if (report) {
        fetchReport(report.id);
      }

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
      console.error("Error deleting image:", error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to delete image: ${errorDetails.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format status display
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
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

  const formatDamageTypeName = (type: string) => {
    switch (type) {
      case "roof":
        return "Roof Damage";
      case "siding":
        return "Siding Damage";
      case "window":
        return "Window Damage";
      case "structural":
        return "Structural Damage";
      case "water":
        return "Water Damage";
      case "other":
        return "Other Damage";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatSeverityName = (severity: string) => {
    switch (severity) {
      case "minor":
        return "Minor";
      case "moderate":
        return "Moderate";
      case "severe":
        return "Severe";
      case "critical":
        return "Critical";
      default:
        return severity.charAt(0).toUpperCase() + severity.slice(1);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor":
        return "bg-green-100 text-green-800";
      case "moderate":
        return "bg-yellow-100 text-yellow-800";
      case "severe":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderReportEditForm = () => {
    if (!report) return null;

    return (
      <form onSubmit={handleUpdateReport} className="space-y-6">
        <FormInput
          id="title"
          label="Report Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <TextArea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Enter a description of the damage"
          />
        </div>

        <FormInput
          id="incidentDate"
          label="Incident Date"
          type="date"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
        />

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Status
          </label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "draft", label: "Draft" },
              { value: "submitted", label: "Submitted" },
            ]}
            disabled={report.status !== "draft"}
          />
          {report.status !== "draft" && (
            <p className="mt-1 text-sm text-gray-500">
              Status can only be changed while the report is in draft.
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="btn-outline"
          >
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    );
  };

  const renderAssessmentAreaForm = () => {
    return (
      <form onSubmit={handleAddArea} className="space-y-4">
        <FormInput
          id="location"
          name="location"
          label="Location"
          placeholder="e.g. North side roof, Master bathroom"
          value={areaForm.location}
          onChange={handleAreaInputChange}
          required
        />

        <div>
          <label
            htmlFor="damage_type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Damage Type
          </label>
          <Select
            id="damage_type"
            name="damage_type"
            value={areaForm.damage_type}
            onChange={handleAreaInputChange}
            options={damageTypes}
          />
        </div>

        <div>
          <label
            htmlFor="severity"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Damage Severity
          </label>
          <Select
            id="severity"
            name="severity"
            value={areaForm.severity}
            onChange={handleAreaInputChange}
            options={damageSeverities}
          />
        </div>

        <FormInput
          id="dimensions"
          name="dimensions"
          label="Dimensions (optional)"
          placeholder="e.g. 10ft x 15ft"
          value={areaForm.dimensions}
          onChange={handleAreaInputChange}
        />

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notes (optional)
          </label>
          <TextArea
            id="notes"
            name="notes"
            value={areaForm.notes}
            onChange={handleAreaInputChange}
            rows={3}
            placeholder="Additional information about the damaged area"
          />
        </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => setIsAddingArea(false)}
            className="btn-outline"
          >
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? "Adding..." : "Add Area"}
          </button>
        </div>
      </form>
    );
  };

  const renderPropertyDetails = () => {
    if (!report || !report.property) return null;

    const property = report.property;

    return (
      <Card className="mb-6">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-3">Property Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Address</h3>
              <p className="mt-1">
                {property.address_line1}
                {property.address_line2 && <>, {property.address_line2}</>}
              </p>
              <p>
                {property.city}, {property.state} {property.postal_code}
              </p>
              <p>{property.country}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Property Details
              </h3>
              <p className="mt-1">
                <span className="font-medium">Type:</span>{" "}
                {property.property_type || "Not specified"}
              </p>
              {property.square_footage && (
                <p>
                  <span className="font-medium">Size:</span>{" "}
                  {property.square_footage} sq ft
                </p>
              )}
              {property.year_built && (
                <p>
                  <span className="font-medium">Year Built:</span>{" "}
                  {property.year_built}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderReportDetails = () => {
    if (!report) return null;

    return (
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Report Details</h2>
            <div className="flex items-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  report.status
                )}`}
              >
                {formatStatus(report.status)}
              </span>
              {report.status === "draft" && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            renderReportEditForm()
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Title</h3>
                <p className="mt-1">{report.title}</p>
              </div>

              {report.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Description
                  </h3>
                  <p className="mt-1">{report.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Report Created
                  </h3>
                  <p className="mt-1">
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>

                {report.incident_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Incident Date
                    </h3>
                    <p className="mt-1">
                      {new Date(report.incident_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {report.submitted_at && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Submitted On
                    </h3>
                    <p className="mt-1">
                      {new Date(report.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {report.reviewed_at && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Reviewed On
                    </h3>
                    <p className="mt-1">
                      {new Date(report.reviewed_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {report.status === "draft" && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSubmitReport}
                    disabled={isLoading}
                  >
                    Submit Report
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderAssessmentAreas = () => {
    if (!report) return null;

    return (
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Damage Assessment Areas</h2>
            {report.status === "draft" && !isAddingArea && (
              <button
                onClick={() => setIsAddingArea(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Add Area
              </button>
            )}
          </div>

          {isAddingArea ? (
            renderAssessmentAreaForm()
          ) : report.assessment_areas && report.assessment_areas.length > 0 ? (
            <div className="space-y-4">
              {report.assessment_areas.map((area) => (
                <div
                  key={area.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{area.location}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDamageTypeName(area.damage_type)} |
                        <span
                          className={`ml-1 px-1.5 py-0.5 rounded text-xs ${getSeverityColor(
                            area.severity
                          )}`}
                        >
                          {formatSeverityName(area.severity)}
                        </span>
                      </p>

                      {area.dimensions && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Dimensions:</span>{" "}
                          {area.dimensions}
                        </p>
                      )}

                      {area.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Notes:</span>{" "}
                          {area.notes}
                        </p>
                      )}
                    </div>

                    {report.status === "draft" && (
                      <button
                        onClick={() => handleDeleteArea(area.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Images for this area */}
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Images
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {report.images
                        ?.filter((img) => img.assessment_area_id === area.id)
                        .map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={getPublicImageUrl(image.storage_path)}
                              alt={image.filename}
                              className="h-24 w-24 object-cover rounded"
                            />
                            {report.status === "draft" && (
                              <button
                                onClick={() => handleDeleteImage(image.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                              >
                                X
                              </button>
                            )}

                            {image.ai_damage_type && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate">
                                {formatDamageTypeName(image.ai_damage_type)}
                                {image.ai_confidence &&
                                  ` (${Math.round(
                                    image.ai_confidence * 100
                                  )}%)`}
                              </div>
                            )}
                          </div>
                        ))}

                      {report.status === "draft" && (
                        <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded p-1 flex flex-col items-center justify-center">
                          <FileUpload
                            bucket="reports"
                            onUploadComplete={(urls) =>
                              handleImagesUpload(urls, area.id)
                            }
                            acceptedFileTypes="image/*"
                            storagePath={`reports/${report.id}/${area.id}`}
                            buttonLabel="Add"
                            buttonClassName="w-full py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            multiple={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">
                No assessment areas have been added yet.
              </p>
              {report.status === "draft" && !isAddingArea && (
                <button
                  onClick={() => setIsAddingArea(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Add your first assessment area
                </button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderGeneralImages = () => {
    if (!report) return null;

    // General images are those not associated with a specific assessment area
    const generalImages =
      report.images?.filter((img) => !img.assessment_area_id) || [];

    return (
      <Card className="mb-6">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">General Images</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {generalImages.map((image) => (
              <div key={image.id} className="relative group">
                <a
                  href={getPublicImageUrl(image.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={getPublicImageUrl(image.storage_path)}
                    alt={image.filename}
                    className="h-32 w-full object-cover rounded"
                  />
                </a>
                {report.status === "draft" && (
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    X
                  </button>
                )}

                {image.ai_damage_type && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1">
                    {formatDamageTypeName(image.ai_damage_type)}
                    {image.ai_confidence &&
                      ` (${Math.round(image.ai_confidence * 100)}%)`}
                  </div>
                )}
              </div>
            ))}

            {report.status === "draft" && (
              <div className="h-32 border-2 border-dashed border-gray-300 rounded p-2 flex flex-col items-center justify-center">
                <FileUpload
                  bucket="reports"
                  onUploadComplete={(urls) => handleImagesUpload(urls)}
                  acceptedFileTypes="image/*"
                  storagePath={`reports/${report.id}/general`}
                  buttonLabel="Select Images"
                  buttonClassName="px-4 py-2 mb-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  multiple={true}
                />
                <p className="text-xs text-gray-500 mt-2">Supported formats: JPG, PNG, WebP</p>
              </div>
            )}
          </div>

          {generalImages.length === 0 && (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">
                No general images have been added yet.
              </p>
              <p className="text-sm text-gray-500">
                Upload property overview images or those not specific to a
                damage area.
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Layout title={`Report Details | SureSight`}>
      <AuthGuard>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <button
                onClick={() => router.push("/reports")}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                ← Back to Reports
              </button>
              <PageHeader title={report ? report.title : "Report Details"} />
            </div>

            {message && (
              <StatusMessage
                type={message.type}
                text={message.text}
                className="mb-6"
                onDismiss={() => setMessage(null)}
              />
            )}

            {isLoading && !report ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="md" text="Loading report..." />
              </div>
            ) : !report ? (
              <Card>
                <div className="p-8 text-center">
                  <h3 className="text-lg font-medium text-gray-500 mb-4">
                    Report not found
                  </h3>
                  <p className="mb-6 text-gray-500">
                    The requested report could not be found or you don't have
                    permission to view it.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => router.push("/reports")}
                  >
                    Return to Reports
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {renderPropertyDetails()}
                {renderReportDetails()}
                {renderAssessmentAreas()}
                {renderGeneralImages()}
              </>
            )}
          </div>
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default ReportDetailPage;
