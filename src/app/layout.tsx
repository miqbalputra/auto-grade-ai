import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoGrade AI",
  description: "Aplikasi penghitung nilai ijazah otomatis"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
