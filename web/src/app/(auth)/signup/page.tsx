import { SignUpForm } from "./signup-form";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Please fill in all required fields.",
  password_too_short: "Password must be at least 8 characters long.",
  password_mismatch: "Passwords do not match. Please try again.",
  signup_failed: "Account creation failed. Please try again.",
};

interface SignUpPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function SignupPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const nextPath = params.next ?? "/";
  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? "An error occurred. Please try again.")
    : null;

  const googleHref = `/auth/login?next=${encodeURIComponent(nextPath)}`;
  const signInHref = `/signin${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

  return (
    <SignUpForm
      nextPath={nextPath}
      errorMessage={errorMessage}
      googleHref={googleHref}
      signInHref={signInHref}
      heroTitle="Start your learning journey today"
      heroBody="Join thousands of students accessing courses, notes, labs, and mentorship — all in one campus platform."
    />
  );
}
