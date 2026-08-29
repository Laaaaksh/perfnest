import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perfnest",
  description: "Self-hosted web performance monitoring and budget alerting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
