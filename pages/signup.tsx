import React, { useState } from "react";
import Link from "next/link";
import Layout from "../components/layout/Layout";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import { Card, StatusMessage, LoadingSpinner } from "../components/common";
import { FormInput, Button, Select } from "../components/ui";
import formValidation from "../utils/formValidation";

const SignUp: React.FC = () => {
  const router = useRouter();
  // Basic auth fields
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [role, setRole] = useState<string>("homeowner");

  // Form state
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "error" | "success" | "info";
  } | null>(null);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Reset form state
    setErrors({});
    setStatusMessage(null);

    // Validate form inputs
    const newErrors: { [key: string]: string } = {};

    // Email validation
    const emailResult = formValidation.validateEmail(email);
    if (!emailResult.isValid) {
      newErrors.email = emailResult.message || "Email is invalid";
    }

    // Password validation (requiring 8+ characters)
    const passwordResult = formValidation.validatePassword(password, {
      minLength: 8,
    });
    if (!passwordResult.isValid) {
      newErrors.password = passwordResult.message || "Password is invalid";
    }

    // Password matching validation
    const passwordMatchResult = formValidation.validatePasswordMatch(
      password,
      confirmPassword
    );
    if (!passwordMatchResult.isValid) {
      newErrors.confirmPassword =
        passwordMatchResult.message || "Passwords do not match";
    }

    // If there are validation errors, display them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Clear any existing session to prevent invalid refresh token errors
      await supabase.auth.signOut();

      console.log("Signing up with role:", role);

      // Create auth user with email/password and store metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
            first_name: "First",
            last_name: "Last",
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      console.log("Signup response:", data);

      if (error) {
        console.error("Signup error details:", error);
        throw error;
      }

      if (!data.user) {
        throw new Error("Failed to create user account");
      }

      // Show success message and verification instructions
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Error during sign-up:", err);
      if (err.message.includes("already registered")) {
        setStatusMessage({
          text: "This email is already registered. Please use a different email or try logging in.",
          type: "error",
        });
      } else {
        setStatusMessage({
          text:
            err.message ||
            "An error occurred during signup. Please try again later.",
          type: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Sign Up | SureSight">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create an Account
          </h1>
          <p className="text-gray-600 mt-2">
            Join SureSight to start streamlining your damage assessment process
          </p>
        </div>

        {!isSubmitted ? (
          <Card>
            {statusMessage && (
              <StatusMessage
                type={statusMessage.type}
                text={statusMessage.text}
                className="mb-4"
              />
            )}

            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <FormInput
                  label="Email Address"
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  inputClassName="bg-white text-gray-900"
                  required
                  error={errors.email}
                />
              </div>

              <div>
                <FormInput
                  label="Password"
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  inputClassName="bg-white text-gray-900"
                  required
                  helpText="Must be at least 8 characters"
                  error={errors.password}
                />
              </div>

              <div>
                <FormInput
                  label="Confirm Password"
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  inputClassName="bg-white text-gray-900"
                  required
                  error={errors.confirmPassword}
                />
              </div>

              <div>
                <Select
                  label="I am a..."
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  options={[
                    { value: "homeowner", label: "Homeowner" },
                    { value: "contractor", label: "Contractor" },
                    { value: "adjuster", label: "Insurance Adjuster" },
                  ]}
                  inputClassName="bg-white text-gray-900"
                  helpText="This helps us customize your experience"
                />
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full ${
                    isLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Creating account...</span>
                    </span>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="text-center py-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Email Sent
            </h2>
            <p className="text-gray-600 mb-6">
              Please check your email to verify your account and complete the
              registration process.
            </p>
            <p className="text-gray-600 mb-6">
              After verifying your email, you'll be able to log in and complete
              your profile setup.
            </p>
            <Link href="/login" className="btn-primary">
              Go to Login
            </Link>
          </Card>
        )}

        {!isSubmitted && (
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SignUp;
