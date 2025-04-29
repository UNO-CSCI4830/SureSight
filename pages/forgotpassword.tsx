import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import Layout from "../components/layout/Layout";
import { FormInput } from "../components/ui";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);

    // Use the environment variable as the primary URL, with window.location.origin as fallback
    // This ensures the correct production URL is used even during local development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const resetUrl = `${siteUrl}/updatepassword`;
    console.log("Reset password redirect URL:", resetUrl);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({
        text: "Password reset email sent! Check your inbox.",
        type: "success",
      });
    }

    setIsLoading(false);
  };

  const getMessageClass = () => {
    if (!message) return "";

    switch (message.type) {
      case "success":
        return "bg-green-50 text-green-800 border-green-200";
      case "error":
        return "bg-red-50 text-red-800 border-red-200";
      case "info":
      default:
        return "bg-blue-50 text-blue-800 border-blue-200";
    }
  };

  return (
    <Layout title="Forgot Password | SureSight">
      <div className="max-w-md mx-auto w-full mt-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
        </div>

        <div className="card">
          {message && (
            <div className={`mb-6 p-3 rounded-md border ${getMessageClass()}`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <FormInput
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your-email@example.com"
              inputClassName="bg-white text-gray-900"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
