import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/layout/Layout";
import { supabase } from "../utils/supabaseClient";
import { Card, StatusMessage } from "../components/common";
import { Button, FormInput, Select } from "../components/ui";

type UserRecord = {
  id: string;
  auth_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  email_confirmed: boolean;
};

const CompleteProfile: React.FC = () => {
  const router = useRouter();
  const { userId: urlUserId } = router.query;

  // User data
  const [authUserId, setAuthUserId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState<boolean>(false);

  // Form fields
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [role, setRole] = useState<"homeowner" | "contractor" | "adjuster" | "admin">("homeowner");

  // Role-specific fields - Homeowner
  const [preferredContactMethod, setPreferredContactMethod] =
    useState<"email" | "phone" | "sms" | null>("email");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");

  // Role-specific fields - Contractor
  const [companyName, setCompanyName] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState<string>("");
  const [yearsExperience, setYearsExperience] = useState<string>("");
  const [serviceArea, setServiceArea] = useState<string>("");

  // Role-specific fields - Adjuster
  const [territories, setTerritories] = useState<string>("");

  // Form state
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    // Only run if router is ready
    if (!router.isReady) return;

    async function getUserInfo() {
      setLoading(true);
      try {
        // Get the currently authenticated user from Supabase auth
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Error fetching authenticated user:", authError);
          throw new Error("Authentication error. Please log in again.");
        }

        if (!authUser) {
          throw new Error("You must be logged in to complete your profile");
        }

        // Set auth user ID and email
        const authUserId = authUser.id;
        setAuthUserId(authUserId);
        setEmail(authUser.email || "");

        console.log("Auth user ID:", authUserId);

        // Try to get the user's database ID from local storage (set during login)
        const storedUserDbId = localStorage.getItem("supaUserDbId");
        if (storedUserDbId) {
          console.log("Found stored user DB ID:", storedUserDbId);
        }

        // Try to find existing user record
        let userRecord: UserRecord | null = null;

        // 1. First try to get user by their database ID from local storage
        if (storedUserDbId) {
          const { data: userById, error: userByIdError } = await supabase
            .from("users")
            .select(
              "id, auth_user_id, first_name, last_name, phone, role, email, email_confirmed"
            )
            .eq("id", storedUserDbId)
            .maybeSingle();

          if (userByIdError) {
            console.error("Error fetching user by stored ID:", userByIdError);
          } else if (userById) {
            console.log("Found user by stored DB ID");
            userRecord = { 
              ...userById, 
              auth_user_id: userById.auth_user_id || "",
              first_name: userById.first_name || undefined,
              last_name: userById.last_name || undefined,
              phone: userById.phone || undefined,
              email_confirmed: !!userById.email_confirmed // Convert to boolean
            };
          }
        }

        // 2. If not found, try by auth_user_id
        if (!userRecord) {
          const { data: userByAuthId, error: userByAuthIdError } =
            await supabase
              .from("users")
              .select(
                "id, auth_user_id, first_name, last_name, phone, role, email, email_confirmed"
              )
              .eq("auth_user_id", authUserId)
              .maybeSingle();

          if (userByAuthIdError) {
            console.error(
              "Error fetching user by auth_user_id:",
              userByAuthIdError
            );
          } else if (userByAuthId) {
            console.log("Found user by auth_user_id");
            userRecord = { 
              ...userByAuthId, 
              auth_user_id: userByAuthId.auth_user_id || "",
              first_name: userByAuthId.first_name || undefined,
              last_name: userByAuthId.last_name || undefined,
              phone: userByAuthId.phone || undefined,
              email_confirmed: !!userByAuthId.email_confirmed // Convert to boolean
            };
          }
        }

        // 3. If still not found, try by email
        if (!userRecord && authUser.email) {
          const { data: userByEmail, error: userByEmailError } = await supabase
            .from("users")
            .select(
              "id, auth_user_id, first_name, last_name, phone, role, email, email_confirmed"
            )
            .eq("email", authUser.email)
            .maybeSingle();

          if (userByEmailError) {
            console.error("Error fetching user by email:", userByEmailError);
          } else if (userByEmail) {
            console.log("Found user by email");
            userRecord = { 
              ...userByEmail, 
              auth_user_id: userByEmail.auth_user_id || "",
              first_name: userByEmail.first_name || undefined,
              last_name: userByEmail.last_name || undefined,
              phone: userByEmail.phone || undefined,
              email_confirmed: !!userByEmail.email_confirmed // Convert to boolean
            };

            // Update auth_user_id if it doesn't match
            if (userByEmail.auth_user_id !== authUserId) {
              console.log("Updating auth_user_id for existing user");
              await supabase
                .from("users")
                .update({ auth_user_id: authUserId })
                .eq("id", userByEmail.id);

              if (userRecord) {
                userRecord.auth_user_id = authUserId;
              }
            }
          }
        }

        // If we found a user record, populate form fields
        if (userRecord) {
          setUserId(userRecord.id);
          // Store this ID in local storage for future use
          localStorage.setItem("supaUserDbId", userRecord.id);

          // Pre-fill form fields with existing data
          if (userRecord.first_name) setFirstName(userRecord.first_name);
          if (userRecord.last_name) setLastName(userRecord.last_name);
          if (userRecord.phone) setPhone(userRecord.phone);
          if (userRecord.role) {
            // Validate that the role is one of the allowed values
            const storedRole = userRecord.role;
            if (storedRole === "homeowner" || storedRole === "contractor" || 
                storedRole === "adjuster" || storedRole === "admin") {
              setRole(storedRole);
            }
          }
          
          // Set email verification status
          setEmailVerified(!!userRecord.email_confirmed);

          // Now get role-specific profile data
          if (userRecord.id) {
            const profileId = userRecord.id;

            // Check which profile tables we need to query based on role
            if (userRecord.role === "homeowner") {
              const { data: homeownerData } = await supabase
                .from("homeowner_profiles")
                .select("preferred_contact_method, additional_notes")
                .eq("id", profileId)
                .maybeSingle();

              if (homeownerData) {
                // Validate that the preferred contact method is one of the allowed values
                const contactMethod = homeownerData.preferred_contact_method;
                if (contactMethod === "email" || contactMethod === "phone" || contactMethod === "sms") {
                  setPreferredContactMethod(contactMethod);
                } else {
                  setPreferredContactMethod("email"); // Default to email if invalid
                }
                setAdditionalNotes(homeownerData.additional_notes || "");
              }
            } else if (userRecord.role === "contractor") {
              const { data: contractorData } = await supabase
                .from("contractor_profiles")
                .select(
                  "company_name, license_number, years_experience, service_area"
                )
                .eq("id", profileId)
                .maybeSingle();

              if (contractorData) {
                setCompanyName(contractorData.company_name || "");
                setLicenseNumber(contractorData.license_number || "");
                setYearsExperience(
                  contractorData.years_experience?.toString() || ""
                );
                setServiceArea(contractorData.service_area || "");
              }
            } else if (userRecord.role === "adjuster") {
              const { data: adjusterData } = await supabase
                .from("adjuster_profiles")
                .select("company_name, adjuster_license, territories")
                .eq("id", profileId)
                .maybeSingle();

              if (adjusterData) {
                setCompanyName(adjusterData.company_name || "");
                setLicenseNumber(adjusterData.adjuster_license || "");
                setTerritories(
                  Array.isArray(adjusterData.territories)
                    ? adjusterData.territories.join(", ")
                    : ""
                );
              }
            }
          }
        } else {
          // No user record found, we'll create one on form submission
          console.log(
            "No existing user record found. Will create one on form submission."
          );

          // If role is in metadata, use it
          if (authUser.user_metadata?.role) {
            const metadataRole = authUser.user_metadata.role;
            // Validate that the role is one of the allowed values
            if (metadataRole === "homeowner" || metadataRole === "contractor" || 
                metadataRole === "adjuster" || metadataRole === "admin") {
              setRole(metadataRole);
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching user info:", err);
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    getUserInfo();
  }, [router.isReady, urlUserId]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRole = e.target.value;
    // TypeScript type guard to ensure we're assigning a valid role
    if (selectedRole === "homeowner" || selectedRole === "contractor" || 
        selectedRole === "adjuster" || selectedRole === "admin") {
      setRole(selectedRole);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authUserId) {
      setError("User ID is required. Please log in again.");
      return;
    }

    if (!role) {
      setError("Please select your user type.");
      return;
    }

    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Step 1: Update user metadata with role if changed
      const { error: metaError } = await supabase.auth.updateUser({
        data: { role },
      });

      if (metaError) throw metaError;

      let userRecord;

      // Step 2: Update or create the user record
      if (userId) {
        // Update existing user record
        const { data, error: updateError } = await supabase
          .from("users")
          .update({
            auth_user_id: authUserId, // Ensure auth_user_id is set correctly
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            role: role,
            email_confirmed: emailVerified,
          })
          .eq("id", userId)
          .select()
          .single();

        if (updateError) throw updateError;
        userRecord = data;
      } else {
        // Create new user record
        const { data, error: insertError } = await supabase
          .from("users")
          .insert({
            auth_user_id: authUserId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            role: role,
            email_confirmed: emailVerified,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        userRecord = data;

        // Store the user ID in local storage
        localStorage.setItem("supaUserDbId", userRecord.id);
      }

      // Step 3: Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userRecord.id)
        .maybeSingle();

      if (profileCheckError) {
        console.error(
          "Error checking for existing profile:",
          profileCheckError
        );
      }

      let profileId;

      // Create profile if it doesn't exist
      if (!existingProfile) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: userRecord.id,
          })
          .select("id")
          .single();

        if (profileError || !profileData?.id) {
          throw profileError || new Error("Profile creation failed");
        }

        profileId = profileData.id;
      } else {
        profileId = existingProfile.id;
      }

      // Step 4: Insert or update role-specific profile
      if (role === "homeowner") {
        // Check if homeowner profile exists
        const { data: existingHomeowner } = await supabase
          .from("homeowner_profiles")
          .select("id")
          .eq("id", profileId)
          .maybeSingle();

        if (existingHomeowner) {
          // Update existing profile
          await supabase
            .from("homeowner_profiles")
            .update({
              // Ensure preferred_contact_method is either a valid enum value or null, but never undefined
              preferred_contact_method: preferredContactMethod || null,
              additional_notes: additionalNotes || null,
            })
            .eq("id", profileId);
        } else {
          // Create new profile
          await supabase.from("homeowner_profiles").insert({
            id: profileId,
            // Ensure preferred_contact_method is either a valid enum value or null, but never undefined
            preferred_contact_method: preferredContactMethod || null,
            additional_notes: additionalNotes || null,
          });
        }
      } else if (role === "contractor") {
        // Check if contractor profile exists
        const { data: existingContractor } = await supabase
          .from("contractor_profiles")
          .select("id")
          .eq("id", profileId)
          .maybeSingle();

        if (existingContractor) {
          // Update existing profile
          await supabase
            .from("contractor_profiles")
            .update({
              company_name: companyName,
              license_number: licenseNumber || null,
              years_experience: yearsExperience
                ? parseInt(yearsExperience)
                : null,
              service_area: serviceArea || null,
            })
            .eq("id", profileId);
        } else {
          // Create new profile
          await supabase.from("contractor_profiles").insert({
            id: profileId,
            company_name: companyName,
            license_number: licenseNumber || null,
            years_experience: yearsExperience
              ? parseInt(yearsExperience)
              : null,
            service_area: serviceArea || null,
            insurance_verified: false,
          });
        }
      } else if (role === "adjuster") {
        // Check if adjuster profile exists
        const { data: existingAdjuster } = await supabase
          .from("adjuster_profiles")
          .select("id")
          .eq("id", profileId)
          .maybeSingle();

        if (existingAdjuster) {
          // Update existing profile
          await supabase
            .from("adjuster_profiles")
            .update({
              company_name: companyName,
              adjuster_license: licenseNumber || null,
              territories: territories ? territories.split(",").map(t => t.trim()) : [],
            })
            .eq("id", profileId);
        } else {
          // Create new profile
          await supabase.from("adjuster_profiles").insert({
            id: profileId,
            company_name: companyName,
            adjuster_license: licenseNumber || null,
            territories: territories ? territories.split(",").map(t => t.trim()) : [],
            certification_verified: false,
          });
        }
      }

      // Redirect to dashboard
      router.push("/Dashboard");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || "An error occurred while saving your profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    try {
      setStatusMessage({ message: "Sending verification email...", type: "info" });
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/verify-email?callback=${encodeURIComponent(window.location.origin + "/login")}`,
        }
      });

      if (error) {
        throw error;
      }

      setStatusMessage({ 
        message: "Verification email sent! Please check your inbox.", 
        type: "success" 
      });
    } catch (err: any) {
      console.error("Error sending verification email:", err);
      setStatusMessage({ 
        message: err.message || "Failed to send verification email. Please try again.", 
        type: "error" 
      });
    }
  };

  return (
    <Layout title="Complete Profile">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Complete Your Profile</h1>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
            <p>Loading profile information...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md mb-6">
            {error}
          </div>
        ) : (
          <div>
            {!emailVerified && (
              <Card className="mb-6">
                <div className="p-4">
                  <div className="flex items-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-lg font-medium">Email Verification Required</h2>
                  </div>
                  <p className="mb-4">
                    Your email address {email} needs to be verified before you can fully use your account.
                    Please check your inbox for a verification email and click the link inside.
                  </p>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleResendVerificationEmail}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Resend verification email
                    </button>
                  </div>
                  {statusMessage && (
                    <div className={`mt-4 p-3 rounded-md ${
                      statusMessage.type === 'success' ? 'bg-green-50 text-green-700' : 
                      statusMessage.type === 'error' ? 'bg-red-50 text-red-700' : 
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {statusMessage.message}
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Email"
                      id="email"
                      type="email"
                      value={email}
                      disabled={true}
                      onChange={() => {}}
                      helpText="Your email address cannot be changed"
                    />

                    <div className="md:col-span-2 border-t border-gray-200 my-4"></div>

                    <FormInput
                      label="First Name"
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />

                    <FormInput
                      label="Last Name"
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />

                    <FormInput
                      label="Phone"
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      helpText="Optional"
                    />

                    <Select
                      label="I am a..."
                      id="role"
                      value={role}
                      onChange={handleRoleChange}
                      options={[
                        { value: "homeowner", label: "Homeowner" },
                        { value: "contractor", label: "Contractor" },
                        { value: "adjuster", label: "Insurance Adjuster" },
                      ]}
                    />
                  </div>
                </div>

                {/* Role-specific fields */}
                {role === "homeowner" && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">
                      Homeowner Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Preferred Contact Method"
                        id="contactMethod"
                        value={preferredContactMethod || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Type guard to ensure we're assigning a valid contact method
                          if (value === "email" || value === "phone" || value === "sms") {
                            setPreferredContactMethod(value);
                          }
                        }}
                        options={[
                          { value: "email", label: "Email" },
                          { value: "phone", label: "Phone" },
                          { value: "text", label: "Text Message" },
                        ]}
                      />

                      <div className="md:col-span-2">
                        <label
                          htmlFor="additionalNotes"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Additional Notes
                        </label>
                        <textarea
                          id="additionalNotes"
                          rows={3}
                          className="form-input bg-white text-gray-900 w-full"
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                          placeholder="Any other information you'd like to share"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {role === "contractor" && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">
                      Contractor Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Company Name"
                        id="companyName"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />

                      <FormInput
                        label="License Number"
                        id="licenseNumber"
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        helpText="Optional"
                      />

                      <FormInput
                        label="Years of Experience"
                        id="yearsExperience"
                        type="number"
                        min="0"
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                      />

                      <FormInput
                        label="Service Area"
                        id="serviceArea"
                        type="text"
                        value={serviceArea}
                        onChange={(e) => setServiceArea(e.target.value)}
                        placeholder="e.g., Dallas/Fort Worth Area"
                      />
                    </div>
                  </div>
                )}

                {role === "adjuster" && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">
                      Insurance Adjuster Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Company Name"
                        id="companyName"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />

                      <FormInput
                        label="Adjuster License"
                        id="adjusterLicense"
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        helpText="Optional"
                      />

                      <div className="md:col-span-2">
                        <FormInput
                          label="Territories"
                          id="territories"
                          type="text"
                          value={territories}
                          onChange={(e) => setTerritories(e.target.value)}
                          placeholder="Comma-separated list of states or regions"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <Button
                    type="submit"
                    disabled={submitting || (!emailVerified && role !== "homeowner")}
                    className="w-full md:w-auto"
                  >
                    {submitting ? "Saving..." : "Save Profile"}
                  </Button>
                  {!emailVerified && role !== "homeowner" && (
                    <p className="text-sm text-red-600 mt-2">
                      Please verify your email address before completing your profile
                    </p>
                  )}
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompleteProfile;
