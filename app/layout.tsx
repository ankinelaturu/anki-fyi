import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anki Nelaturu — Principal AI Product Engineer",
  description: "An IDE-style professional knowledge workspace for Anki Nelaturu: AI orchestration, developer platforms, runtime systems, and interactive AI products.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={jetbrainsMono.variable}>{children}</body>
    </html>
  );
}
