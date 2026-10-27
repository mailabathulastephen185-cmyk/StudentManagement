"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function StudentPortalActions() {
  const router = useRouter();
  return <button className="btn secondary portal-signout" onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); router.push("/login"); router.refresh(); }}><LogOut size={14}/> Sign out</button>;
}
