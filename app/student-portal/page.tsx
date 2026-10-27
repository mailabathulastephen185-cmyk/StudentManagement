import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import StudentPortalActions from "./student-portal-actions";
import { CalendarDays, GraduationCap, MapPin, Phone, UserRound, BookOpen, ShieldCheck } from "lucide-react";

export default async function StudentPortalPage() {
  const { supabase, user, profile } = await requireUser();
  if (profile.role === "admin") redirect("/dashboard");
  const { data: student } = await supabase.from("students").select("id,full_name,roll_number,email,phone,course,division,date_of_birth,gender,address,photo_path").eq("auth_user_id", user.id).maybeSingle();
  let attendanceCount = 0;
  let presentCount = 0;
  if (student) {
    const { data: records } = await supabase.from("attendance_records").select("status").eq("student_id", student.id);
    attendanceCount = records?.length || 0;
    presentCount = records?.filter(record => record.status === "present" || record.status === "late" || record.status === "excused").length || 0;
  }
  const photo = student?.photo_path ? (student.photo_path.startsWith("http") ? student.photo_path : supabase.storage.from("student-photos").getPublicUrl(student.photo_path).data.publicUrl) : null;
  const percentage = attendanceCount ? Math.round((presentCount / attendanceCount) * 100) : 0;
  return <main className="student-portal-wrap">
    <header className="portal-topbar"><div className="portal-brand"><div className="portal-brand-icon"><GraduationCap size={23}/></div><div><b>Student Management</b><small>STUDENT PORTAL</small></div></div><div className="portal-user"><span>{profile.full_name}</span><StudentPortalActions/></div></header>
    <div className="portal-content"><section className="portal-hero"><div><div className="eyebrow">Your academic space</div><h1>Welcome, {student?.full_name || profile.full_name}.</h1><p>View your student information and keep track of your attendance.</p></div><div className="portal-hero-mark"><GraduationCap size={54}/></div></section>
      {!student ? <section className="card portal-unlinked"><div className="cardicon"><ShieldCheck size={21}/></div><h2>Your account is not linked yet</h2><p className="sub">Your login is active, but the administrator has not linked it to a student record. Contact your college administrator to finish setup.</p></section> : <>
        <section className="portal-stat-grid"><div className="portal-stat"><span>Course</span><strong>{student.course}</strong><small>Academic programme</small></div><div className="portal-stat"><span>Division</span><strong>{student.division || "—"}</strong><small>Assigned division</small></div><div className="portal-stat"><span>Attendance</span><strong>{attendanceCount ? `${percentage}%` : "—"}</strong><small>{presentCount} attended / {attendanceCount} recorded</small></div></section>
        <section className="card portal-profile-card"><div className="cardhead"><div className="cardicon"><UserRound size={19}/></div><div><h3>My Student Profile</h3><p className="sub">Your current information registered with the college.</p></div></div><div className="portal-profile"><div className="portal-photo">{photo ? <img src={photo} alt="Student profile"/> : <UserRound size={38}/>}</div><div className="portal-profile-main"><h2>{student.full_name}</h2><p>{student.roll_number ? `Roll no. ${student.roll_number}` : "Roll number not assigned"}</p><span className="account-pill"><ShieldCheck size={12}/> Login connected</span></div></div><div className="portal-detail-grid"><div><BookOpen size={16}/><span><small>Course</small><b>{student.course}</b></span></div><div><CalendarDays size={16}/><span><small>Date of birth</small><b>{student.date_of_birth || "Not provided"}</b></span></div><div><Phone size={16}/><span><small>Phone</small><b>{student.phone || "Not provided"}</b></span></div><div><MapPin size={16}/><span><small>Address</small><b>{student.address || "Not provided"}</b></span></div></div></section>
        <section className="portal-note"><ShieldCheck size={17}/><p>Your profile is read-only. If any information is incorrect, contact your college administrator to request an update.</p></section>
      </>}
    </div><footer className="portal-footer">Student Management System <span>•</span> Secure student access</footer>
  </main>;
}
