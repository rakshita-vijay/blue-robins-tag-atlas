import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tag Atlas",
  description: "Store your project write-ups once, find them again by tag",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
