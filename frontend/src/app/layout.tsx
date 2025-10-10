import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat, Inter } from "next/font/google";
import ThemeRegistry from "../theme/ThemeRegistry";
import AuthGuard from "../components/auth/AuthGuard";
import NavBar from "../components/layout/NavBar";

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

const inter = Inter({
  variable: "--font-inter",
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${inter.variable}`}>
        <ThemeRegistry>
          <AuthGuard>
            <NavBar>
              {children}
            </NavBar>
          </AuthGuard>
        </ThemeRegistry>
      </body>
    </html>
  );
}
