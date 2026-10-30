import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { PageTransitionController } from "@/components/page-transition-controller";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "lerengo.com",
  description: "University-isolated academic notes and doubt network",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260407" },
      { url: "/favicon.png?v=20260407", type: "image/png" },
    ],
    apple: "/favicon.png?v=20260407",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.variable} app-body`} suppressHydrationWarning>
        <PageTransitionController />
        <div className="site-shell">
          <div className="site-content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

