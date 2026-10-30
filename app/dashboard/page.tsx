import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

import {
  Users,
  UserPlus,
  BookOpen,
  GitBranch,
  ClipboardCheck,
  CalendarDays,
  FileBarChart,
  ArrowUpRight,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";

export default async function Dashboard() {
  const { supabase, profile } = await requireUser();

  if (profile.role !== "admin") {
    redirect("/student-portal");
  }

  const [
    { count: students },
    { count: subjects },
    { count: sessions },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("subjects")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("attendance_sessions")
      .select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      label: "Total Students",
      value: students ?? 0,
      icon: Users,
      color: "blue",
    },
    {
      label: "Total Subjects",
      value: subjects ?? 0,
      icon: BookOpen,
      color: "gold",
    },
    {
      label: "Lecture Sessions",
      value: sessions ?? 0,
      icon: ClipboardCheck,
      color: "purple",
    },
  ];

  const modules = [
    {
      title: "Add New Student",
      description:
        "Register students and maintain their personal and academic information.",
      action: "Open student management",
      href: "/students",
      icon: UserPlus,
      color: "gold",
    },
    {
      title: "Student Directory",
      description:
        "Search student profiles, view details and manage existing records.",
      action: "View students",
      href: "/students",
      icon: Users,
      color: "blue",
    },
    {
      title: "Courses & Divisions",
      description:
        "Organize students into courses and divisions for class management.",
      action: "Manage classes",
      href: "/divisions",
      icon: GitBranch,
      color: "purple",
    },
    {
      title: "Mark Attendance",
      description:
        "Record attendance by subject, lecture, course and division.",
      action: "Start attendance",
      href: "/attendance",
      icon: CalendarDays,
      color: "green",
    },
    {
      title: "Attendance Records",
      description:
        "Review recorded attendance with student, subject and date details.",
      action: "View attendance",
      href: "/attendance",
      icon: ClipboardCheck,
      color: "blue",
    },
    {
      title: "Reports & Defaulters",
      description:
        "Generate attendance percentages, student-wise reports and defaulter lists.",
      action: "Generate reports",
      href: "/reports",
      icon: FileBarChart,
      color: "gold",
    },
  ];

  return (
    <AppShell
      name={profile.full_name || "Administrator"}
      role={profile.role}
    >
      {/* PAGE HEADER */}

      <header className="pagehead dashboard-heading">
        <div>
          <div className="eyebrow">College Administration</div>

          <h1>Dashboard</h1>

          <p className="sub">
            Your college administration workspace at a glance.
          </p>
        </div>

        <div className="profile">
          <span className="dashboard-profile-icon">
            <GraduationCap size={21} />
          </span>

          <div>
            <b>{profile.full_name || "Administrator"}</b>
            <small>Administrator</small>
          </div>
        </div>
      </header>

      {/* WELCOME BANNER */}

      <section className="dashboard-hero">
        <div>
          <div className="dashboard-hero-label">
            <span />
            ADMINISTRATION PORTAL
          </div>

          <h2>Welcome back, Administrator.</h2>

          <p>
            Manage student records, organize courses and divisions,
            record lecture attendance, and generate detailed reports
            from one workspace.
          </p>
        </div>

        <div className="dashboard-hero-tag">
          <GraduationCap size={19} />
          College Management
        </div>
      </section>

      {/* STUDENT MANAGEMENT */}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div className="dashboard-section-icon">
            <LayoutDashboard size={21} />
          </div>

          <div>
            <h2>Student Management</h2>
            <p>Manage student information and class organization.</p>
          </div>
        </div>

        {/* STATISTICS */}

        <div className="grid stats dashboard-stats">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="stat dashboard-stat" key={stat.label}>
                <div className="dashboard-stat-icon">
                  <Icon size={21} />
                </div>

                <span>{stat.label}</span>

                <strong>{stat.value}</strong>
              </div>
            );
          })}
        </div>

        {/* MODULE CARDS */}

        <div className="dashboard-module-grid">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                href={module.href}
                className="dashboard-module"
                key={module.title}
              >
                <div className={`module-icon ${module.color}`}>
                  <Icon size={23} />
                </div>

                <h3>{module.title}</h3>

                <p>{module.description}</p>

                <div className="module-action">
                  <span>{module.action}</span>
                  <ArrowUpRight size={17} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="dashboard-footer">
        <GraduationCap size={16} />
        Student Management System
        <span>•</span>
        College Administration
      </div>
    </AppShell>
  );
}