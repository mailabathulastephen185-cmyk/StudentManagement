import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPhone = (value: string) => !value || /^[+\d() .-]{7,20}$/.test(value);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { response: NextResponse.json({ error: "Only administrators can manage student records." }, { status: 403 }) };
  return { supabase, user };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const full_name = clean(body.full_name);
  const roll_number = clean(body.roll_number);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone);
  const course = clean(body.course);
  const division = clean(body.division) || "A";
  const date_of_birth = clean(body.date_of_birth) || null;
  const gender = clean(body.gender) || null;
  const address = clean(body.address);
  const photo_path = clean(body.photo_path) || null;
  const create_login = body.create_login === true;
  const password = typeof body.password === "string" ? body.password : "";

  if (full_name.length < 2 || full_name.length > 100) return NextResponse.json({ error: "Full name must be between 2 and 100 characters." }, { status: 400 });
  if (!course || course.length > 100) return NextResponse.json({ error: "Course is required and must be 100 characters or fewer." }, { status: 400 });
  if (roll_number.length > 40) return NextResponse.json({ error: "Roll number must be 40 characters or fewer." }, { status: 400 });
  if (email && !validEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!validPhone(phone)) return NextResponse.json({ error: "Enter a valid phone number (7–20 characters)." }, { status: 400 });
  if (date_of_birth && (Number.isNaN(Date.parse(date_of_birth)) || date_of_birth > new Date().toISOString().slice(0, 10))) return NextResponse.json({ error: "Date of birth cannot be in the future." }, { status: 400 });
  if (create_login && !email) return NextResponse.json({ error: "An email address is required to create a student login." }, { status: 400 });
  if (create_login && password.length < 8) return NextResponse.json({ error: "Student login password must be at least 8 characters." }, { status: 400 });

  const { data: duplicateRoll } = roll_number ? await auth.supabase.from("students").select("id").ilike("roll_number", roll_number).maybeSingle() : { data: null };
  if (duplicateRoll) return NextResponse.json({ error: "That roll number is already assigned to another student." }, { status: 409 });
  const { data: duplicateEmail } = email ? await auth.supabase.from("students").select("id").ilike("email", email).maybeSingle() : { data: null };
  if (duplicateEmail) return NextResponse.json({ error: "That email address is already used by another student record." }, { status: 409 });

  let authUserId: string | null = null;
  let adminClient: ReturnType<typeof createAdminClient> | null = null;
  if (create_login) {
    try { adminClient = createAdminClient(); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Student login is not configured." }, { status: 500 }); }
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (error || !created.user) return NextResponse.json({ error: error?.message || "Could not create the student login." }, { status: 400 });
    authUserId = created.user.id;
  }

  const { data: student, error } = await auth.supabase.from("students").insert({
    full_name, roll_number: roll_number || null, email: email || null, phone: phone || null,
    course, division, date_of_birth, gender, address: address || null, photo_path, auth_user_id: authUserId,
  }).select("*").single();
  if (error) {
    if (authUserId && adminClient) await adminClient.auth.admin.deleteUser(authUserId);
    const message = error.code === "23505" ? "Roll number or login email already exists." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ student }, { status: 201 });
}
