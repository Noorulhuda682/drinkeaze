import type { Metadata } from "next";
import "./globals.css";
// import "@/globals.css";
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";

export const metadata: Metadata = {
  title: "Drinkeaze | Fresh Juices, Smoothies, Parfaits & Coffee — Karachi",
  description:
    "Drinkeaze delivers fresh juices, smoothies, parfaits, and coffee across Karachi, Pakistan. Order online for delivery or visit us.",
  keywords: "juices, smoothies, parfaits, coffee, Karachi, Pakistan, Drinkeaze",
  openGraph: {
    title: "Drinkeaze — Fresh Drinks in Karachi",
    description: "Fresh juices, smoothies, parfaits & coffee. Serving Karachi.",
  },
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Outfit:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
