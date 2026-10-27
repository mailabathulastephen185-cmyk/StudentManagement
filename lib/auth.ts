import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single();
  if (!profile) redirect("/login?error=profile");
  return { supabase, user, profile };
}
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") redirect("/dashboard?error=forbidden");
  return ctx;
}
