import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout/Layout";
import { supabase, useSupabaseAuth } from "../../utils/supabaseClient";
import { Card } from "../../components/common";
import { FormInput, Button } from "../../components/ui";
import { FormField } from "../../components/common";
/**
 * Component handles displaying the logic for the new form component
 * todo make database post request
 * @returns XML
 */
export default function NewForm() {
  const { user } = useSupabaseAuth();
  const [address, setAddress] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [damageDate, setDamageDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      console.error("User not logged in");
      return;
    }

    setSubmitting(true);

    try {
      // Get the user's properties

      const { data: userID, error: userIdError } = await supabase // user.id refrences the auth_user_id in supabase this function grabs the original ID
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .limit(1);
      const authToUserId = userID?.[0]?.id;
      if (!authToUserId) {
        throw new Error(
          "No matching profile found for authToUserId = " + authToUserId
        );
      }

      const { data: profiles, error: userLocatorError } = await supabase // Takes the userid and grabs the profile id
        .from("profiles")
        .select("id")
        .eq("user_id", authToUserId)
        .limit(1);
      const profileId = profiles?.[0]?.id;

      if (!profileId) {
        throw new Error("No matching profile found for user.id = " + user.id);
      }

      const { data: properties, error: propError } = await supabase // Using the profile id we can now get the correct propertie
        .from("properties")
        .select("id") // This is refrencing the incorrect id then what is passed through
        .eq("homeowner_id", profileId)
        .limit(1);
      console.log("Here are properties", properties);

      if (propError) {
        throw new Error("Error finding properties: " + propError.message);
      }

      // If no properties, create one first
      let propertyId;
      if (!properties || properties.length === 0) {
        console.log("This should not be running");
        // Extract address components
        const addressParts = address.split(",").map((part) => part.trim());
        const cityStateZip =
          addressParts.length > 1 ? addressParts[1].split(" ") : ["", "", ""];
        const city = cityStateZip.slice(0, -2).join(" ") || "Unknown";
        const state = cityStateZip[cityStateZip.length - 2] || "Unknown";
        const postal = cityStateZip[cityStateZip.length - 1] || "Unknown";

        // Create a new property
        const { data: newProperty, error: createError } = await supabase
          .from("properties")
          .insert({
            homeowner_id: user.id,
            address_line1: addressParts[0] || address,
            city: city,
            state: state,
            postal_code: postal,
            property_type: "residential",
          })
          .select("id")
          .single();

        if (createError) {
          throw new Error("Error creating property: " + createError.message);
        }

        propertyId = newProperty.id;
      } else {
        propertyId = properties[0].id;
      }

      // Create a new report
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert({
          property_id: propertyId,
          creator_id: authToUserId,
          title: `${insuranceProvider} Claim - ${new Date().toLocaleDateString()}`,
          status: "draft",
          incident_date: damageDate || null,
          description: "Initial report created from form submission",
        })
        .select("id")
        .single();

      if (reportError) {
        throw new Error("Error creating report: " + reportError.message);
      }

      // If there's an image, upload it
      if (image) {
        const fileExt = image.name.split(".").pop();
        const fileName = `${report.id}-${Date.now()}.${fileExt}`;
        const filePath = `Homeowners/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, image);

        if (uploadError) {
          throw new Error("Image upload failed: " + uploadError.message);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/reports/${report.id}`);
      }, 1500);
    } catch (error: any) {
      console.error("Form submission error:", error);
      setError(error.message || "An error occurred while submitting the form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>New Form</title>
        <meta name="description" content="Creating a new form" />
      </Head>

      <div className="max-w-md mx-auto mt-8 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">New Form</h1>
          <p className="text-gray-600">
            Please fill out the form below to file your claim
          </p>
        </div>
        <Card>
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <FormField
                id="address"
                label="Please Enter Your Address"
                required
              >
                <FormInput
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  inputClassName="bg-white"
                  required
                />
              </FormField>
            </div>
            <div className="mb-5">
              <FormField
                id="insuranceProvider"
                label="Who Is Your Insurance Provider"
                required
              >
                <FormInput
                  id="insuranceProvider"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="eg: State Farm, AllState"
                  inputClassName="bg-white"
                  required
                />
              </FormField>
            </div>
            <div className="mb-5">
              <FormField
                id="damageDate"
                label="When Did the Damage Occur?"
                required
              >
                <FormInput
                  id="damageDate"
                  type="date"
                  value={damageDate}
                  onChange={(e) => setDamageDate(e.target.value)}
                  inputClassName="bg-white"
                  required
                />
                <div className="mt-5 flex justify-center">
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImage(e.target.files[0]);
                      }
                    }}
                    className="file-input bg-white text-black file-input-neutral"
                  />
                </div>
              </FormField>
            </div>
            <div className="mb-5 flex items-center justify-center">
              <Button type="submit">Submit Claim</Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
