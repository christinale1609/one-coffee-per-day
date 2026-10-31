import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { PrivacyParam } from "@/components/privacy-param";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PrivacyParam />
        {children}
      </body>
    </html>
  );
}
