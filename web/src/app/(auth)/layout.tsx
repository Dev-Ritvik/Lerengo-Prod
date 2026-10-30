export default function AuthLayout({
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
