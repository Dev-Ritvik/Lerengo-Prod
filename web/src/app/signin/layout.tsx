export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-page-viewport className="min-h-screen">
      {children}
    </div>
  );
}
