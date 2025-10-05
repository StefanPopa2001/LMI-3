import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import ThemeRegistry from "../theme/ThemeRegistry";
import { CssBaseline } from '@mui/material';
import { ToastProvider } from "../components/ui/ToastContext";
import { ToastContainer } from "../components/ui/ToastContainer";
import AuthGuard from "../components/auth/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LMI 3 Dashboard",
  description: "Comprehensive management system for users, analytics, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable}`}>
        <ThemeRegistry>
          <CssBaseline />
          <ToastProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
            <ToastContainer />
          </ToastProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
