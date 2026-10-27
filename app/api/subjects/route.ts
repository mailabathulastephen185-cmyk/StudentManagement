
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAdminClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403 }
      ),
    };
  }

  return { supabase, response: null };
}

// GET: Fetch subjects for the attendance dropdown.
export async function GET() {
  const { supabase, response } = await getAdminClient();

  if (response) return response;

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, course")
    .order("name", { ascending: true });

  if (error) {
    console.error("Fetch subjects failed:", error.message);

    return NextResponse.json(
      { error: "Could not load subjects. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ subjects: data ?? [] });
}

// POST: Add a new subject.
export async function POST(req: Request) {
  const { supabase, response } = await getAdminClient();

  if (response) return response;

  let body: { name?: unknown; course?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request data." },
      { status: 400 }
    );
  }

  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  const course =
    typeof body.course === "string" ? body.course.trim() : "";

  if (!name || !course) {
    return NextResponse.json(
      { error: "Subject name and course are required." },
      { status: 400 }
    );
  }

  if (name.length > 100 || course.length > 100) {
    return NextResponse.json(
      { error: "Subject name and course must be under 100 characters." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({ name, course })
    .select("id, name, course")
    .single();

  if (error) {
    console.error("Create subject failed:", error.message);

    return NextResponse.json(
      { error: "Could not save the subject. Check the database and try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ subject: data }, { status: 201 });
}
