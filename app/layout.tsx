import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KWIZZING — Zero-Backend Living Room & Festive Quiz Engine",
  description: "Host cinematic, deductive party trivia with dual-screen living room TV display.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
