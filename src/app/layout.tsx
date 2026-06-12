import "../index.css";
import { AuthProvider } from "../context/AuthContext";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Metadata } from "next";

import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Polymarket Pro | Decentralized Prediction Markets",
  description: "Trade on politics, crypto, pop culture, science, sports, and more. Highly precise implied probability trading platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Outfit', 'Inter', sans-serif;
          }
        `}</style>
      </head>
      <body className="min-h-screen bg-background text-text-primary flex flex-col antialiased">
        <AuthProvider>
          <Suspense fallback={<div className="h-16 border-b border-border bg-background" />}>
            <Header />
          </Suspense>
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
