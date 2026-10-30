
"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  LayoutDashboard,
  Users,
  GitBranch,
  ClipboardCheck,
  LogOut,
  GraduationCap,
  FileText,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function Sidebar({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const path = usePathname();
  const router = useRouter();

  const workspaceLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/students",
      label: "Student Directory",
      icon: Users,
    },
    {
      href: "/divisions",
      label: "Courses & Divisions",
      icon: GitBranch,
    },
  ];

  const attendanceLinks = [
    {
      href: "/attendance",
      label: "Mark Attendance",
      icon: ClipboardCheck,
    },
    {
      href: "/reports",
      label: "Attendance Records & Reports",
      icon: FileText,
    },
  ];

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function renderLinks(
    links: typeof workspaceLinks
  ) {
    return links.map((item) => {
      const Icon = item.icon;
      const active =
        path === item.href ||
        (item.href !== "/dashboard" &&
          path.startsWith(item.href + "/"));

      return (
        <Link
          key={item.href}
          href={item.href}
          className={active ? "active" : ""}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  return (
    <aside className="sidebar">

      {/* BRANDING */}

      <Link href="/dashboard" className="brand">
        <span className="sidebar-brand-row">
          <span className="sidebar-brand-icon">
            <GraduationCap size={26} />
          </span>

          <span className="sidebar-brand-name">
            Student Management
            <small>COLLEGE ADMINISTRATION</small>
          </span>
        </span>
      </Link>

      {/* WORKSPACE */}

      <div className="navlabel">
        WORKSPACE
      </div>

      <nav className="navlinks">
        {renderLinks(workspaceLinks)}
      </nav>

      {/* ATTENDANCE */}

      <div className="navlabel">
        ATTENDANCE
      </div>

      <nav className="navlinks">
        {renderLinks(attendanceLinks)}
      </nav>

      {/* USER PROFILE */}

      <div className="sidebar-bottom">

        <div className="sidebar-user">
          <div className="sidebar-user-icon">
            <Users size={19} />
          </div>

          <div>
            <b>{name}</b>
            <span>{role === "admin" ? "Administrator" : role}</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={logout}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>

      </div>
    </aside>
  );
}
