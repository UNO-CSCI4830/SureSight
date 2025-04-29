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
  const [image, setImage] = useState("");
  const [damageDate, setDamageDate] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = {
      user,
      address,
      insuranceProvider,
      damageDate,
      image,
    };
    console.log("Form submitted:", formData);
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
