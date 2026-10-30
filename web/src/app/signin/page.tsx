import { SignInForm } from "./signin-form";

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials: "Please enter your email and password.",
  email_required: "Please enter a valid email address.",
  invalid_credentials: "Invalid email or password. Please try again.",
  password_signin_failed: "Sign in failed. Please check your credentials and try again.",
};

const NOTICE_MESSAGES: Record<string, string> = {
  signed_out: "You have been signed out.",
  session_expired: "Your session has expired. Please sign in again.",
  signin_unconfirmed: "Please confirm your email before signing in.",
};

interface SignInPageProps {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = params.next ?? "/";
  const errorMessage = params.error ? (ERROR_MESSAGES[params.error] ?? "An error occurred. Please try again.") : null;
  const noticeMessage = params.notice ? (NOTICE_MESSAGES[params.notice] ?? null) : null;

  const googleEnabled = true;
  const googleHref = `/auth/login?next=${encodeURIComponent(nextPath)}`;
  const signUpHref = "/signup";

  return (
    <SignInForm
      nextPath={nextPath}
      errorMessage={errorMessage}
      noticeMessage={noticeMessage}
      googleEnabled={googleEnabled}
      googleHref={googleHref}
      signUpHref={signUpHref}
      heroTitle="Your knowledge journey continues here"
      heroBody="Access your courses, notes, labs, and community. Everything you need to learn — in one place."
    />
  );
}
