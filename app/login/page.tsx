"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  UserRound,
  LockKeyhole,
  LogIn,
  CheckCircle2,
  Smartphone,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError("Your account profile could not be found. Contact your administrator.");
        await supabase.auth.signOut();
        return;
      }

      router.push(
        profile.role === "admin" ? "/dashboard" : "/student-portal"
      );

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="premium-login">
      <div className="login-top-line" />

      <div className="login-panel">

        {/* LEFT BRANDING PANEL */}

        <section className="login-brand-panel">
          <div className="login-brand-icon">
            <GraduationCap size={35} />
          </div>

          <div className="login-brand-content">
            <h1>Student Management System</h1>

            <p>
              Manage students, lectures and attendance through
              a centralized administration system.
            </p>

            <div className="login-features">
              <div>
                <CheckCircle2 size={19} />
                <span>Student Management</span>
              </div>

              <div>
                <CheckCircle2 size={19} />
                <span>Smart Attendance Tracking</span>
              </div>

              <div>
                <CheckCircle2 size={19} />
                <span>Attendance Reports</span>
              </div>
            </div>
          </div>

          <div className="login-brand-footer">
            COLLEGE ADMINISTRATION
          </div>
        </section>

        {/* RIGHT LOGIN PANEL */}

        <section className="login-form-panel">

          <div className="login-form-inner">
            <div className="login-mobile-icon">
              <GraduationCap size={28} />
            </div>

            <h2>Welcome Back</h2>

            <p className="login-description">
              Sign in to access the administrator dashboard.
            </p>

            {error && (
              <div className="notice notice-error">
                {error}
              </div>
            )}

            <form onSubmit={submit}>

              <div className="field login-field">
                <label htmlFor="email">Email address</label>

                <div className="login-input-wrap">
                  <UserRound size={17} />

                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="field login-field">
                <label htmlFor="password">Password</label>

                <div className="login-input-wrap">
                  <LockKeyhole size={17} />

                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button
                className="btn login-submit"
                type="submit"
                disabled={busy}
              >
                <LogIn size={17} />

                {busy ? "Signing in..." : "Login to Dashboard"}
              </button>
            </form>

            <div className="login-divider" />

            <div className="student-login-section">
              <p>Are you a student?</p>

              <button
                type="button"
                className="btn secondary student-login-button"
                onClick={() => router.push("/student-portal")}
              >
                <Smartphone size={16} />
                Student Login
              </button>
            </div>

            <div className="login-copyright">
              Student Management System
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}