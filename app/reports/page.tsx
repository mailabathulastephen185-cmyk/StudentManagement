import AppShell from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  const { supabase, profile } = await requireAdmin();
  const { data, error } = await supabase
    .from("attendance_records")
    .select("id,status,session:attendance_sessions!inner(id,session_date,course,division,subject_name,teacher_name,lecture_type),student:students!inner(id,full_name,roll_number,course,division)")
    .order("created_at", { ascending: false })
    .limit(5000);

  const records = (data || []).map((r: any) => ({
    id: r.id,
    status: r.status,
    sessionId: r.session.id,
    date: r.session.session_date,
    subject: r.session.subject_name,
    teacher: r.session.teacher_name || "—",
    lectureType: r.session.lecture_type || "Regular",
    course: r.session.course,
    division: r.session.division || "—",
    studentId: r.student.id,
    student: r.student.full_name,
    rollNumber: r.student.roll_number || "—",
  }));

  return <AppShell name={profile.full_name || "Administrator"} role={profile.role}>
    <header className="pagehead"><div><div className="eyebrow">College Administration</div><h1>Attendance Reports</h1><p className="sub">Review attendance records, filter sessions and check student attendance percentages.</p></div></header>
    <section className="hero"><div><div className="eyebrow">Attendance Analytics</div><h2>Every record, one clear report.</h2><p>Filter by course, date, student or status and review attendance summaries.</p></div><div style={{fontSize:42}}>▤</div></section>
    {error ? <div className="notice notice-error">Could not load attendance records: {error.message}</div> : <ReportsClient records={records} />}
  </AppShell>;
}
