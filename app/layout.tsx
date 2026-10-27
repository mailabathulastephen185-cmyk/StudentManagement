import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Student Management System", description: "College administration and attendance management" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
