"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Trash2, RefreshCw, Upload, UserRound, Pencil, X, ShieldCheck, KeyRound, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  roll_number: string | null;
  email: string | null;
  phone: string | null;
  course: string;
  division: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  photo_path: string | null;
  created_at: string;
};

type StudentForm = {
  full_name: string; roll_number: string; email: string; phone: string; course: string;
  division: string; date_of_birth: string; gender: string; address: string;
  create_login: boolean; password: string;
};
const blank: StudentForm = { full_name: "", roll_number: "", email: "", phone: "", course: "", division: "A", date_of_birth: "", gender: "", address: "", create_login: true, password: "" };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function photoUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return createClient().storage.from("student-photos").getPublicUrl(path).data.publicUrl;
}

export default function StudentsClient({ initialStudents }: { initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<StudentForm>(blank);
  const [editing, setEditing] = useState<Student | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => students.filter(s => [s.full_name, s.roll_number, s.email, s.course, s.division].some(v => (v || "").toLowerCase().includes(query.toLowerCase().trim()))), [students, query]);
  useEffect(() => {
    if (!photoFile) { setFilePreview(null); return; }
    const objectUrl = URL.createObjectURL(photoFile);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);
  function update<K extends keyof StudentForm>(key: K, value: StudentForm[K]) { setForm(previous => ({ ...previous, [key]: value })); }
  function notify(text: string, type: "success" | "error" = "success") { setMessage(text); setMessageType(type); }

  function validate(): string | null {
    if (form.full_name.trim().length < 2) return "Enter the student's full name (at least 2 characters).";
    if (!form.course.trim()) return "Course / department is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (form.phone && !/^[+\d() .-]{7,20}$/.test(form.phone.trim())) return "Enter a valid phone number (7–20 characters).";
    if (form.date_of_birth && form.date_of_birth > new Date().toISOString().slice(0, 10)) return "Date of birth cannot be in the future.";
    const needsNewLogin = form.create_login && (!editing || !editing.auth_user_id);
    if (form.create_login && !form.email.trim()) return "Enter an email address to create a student login.";
    if (needsNewLogin && form.password.length < 8) return "Create a student password with at least 8 characters.";
    if (editing?.auth_user_id && form.password && form.password.length < 8) return "A new password must contain at least 8 characters.";
    if (photoFile && !ALLOWED_PHOTO_TYPES.includes(photoFile.type)) return "Photo must be JPG, PNG or WebP.";
    if (photoFile && photoFile.size > MAX_PHOTO_BYTES) return "Photo must be 5 MB or smaller.";
    return null;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { notify(validationError, "error"); return; }
    setBusy(true); setMessage("");
    const supabase = createClient();
    let uploadedPath: string | null = null;
    let photo_path = removePhoto ? null : editing?.photo_path || null;
    try {
      if (photoFile) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Your session expired. Sign in again before uploading a photo.");
        const extension = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("student-photos").upload(uploadedPath, photoFile, { contentType: photoFile.type, cacheControl: "3600", upsert: false });
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
        photo_path = uploadedPath;
      }
      const payload = {
        full_name: form.full_name.trim(), roll_number: form.roll_number.trim(), email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(), course: form.course.trim(), division: form.division.trim() || "A",
        date_of_birth: form.date_of_birth, gender: form.gender, address: form.address.trim(), photo_path,
        create_login: form.create_login, password: form.password,
      };
      const response = await fetch(editing ? `/api/students/${editing.id}` : "/api/students", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save student.");
      const saved = result.student as Student;
      setStudents(previous => editing ? previous.map(s => s.id === saved.id ? saved : s) : [saved, ...previous]);
      resetForm();
      notify(editing ? "Student record updated successfully." : "Student added successfully.");
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("student-photos").remove([uploadedPath]);
      notify(error instanceof Error ? error.message : "Something went wrong while saving the student.", "error");
    } finally { setBusy(false); }
  }

  function resetForm() {
    setEditing(null); setForm({ ...blank }); setPhotoFile(null); setRemovePhoto(false);
    if (fileInput.current) fileInput.current.value = "";
  }
  function edit(student: Student) {
    setEditing(student);
    setForm({ full_name: student.full_name, roll_number: student.roll_number || "", email: student.email || "", phone: student.phone || "", course: student.course, division: student.division || "A", date_of_birth: student.date_of_birth || "", gender: student.gender || "", address: student.address || "", create_login: Boolean(student.auth_user_id), password: "" });
    setPhotoFile(null); setRemovePhoto(false); setMessage("");
    if (fileInput.current) fileInput.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(student: Student) {
    if (!window.confirm(`Delete ${student.full_name}'s student record? The linked login account, if any, will remain active.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Delete failed.");
      setStudents(previous => previous.filter(s => s.id !== student.id));
      notify("Student record deleted. Any linked Auth account was kept intact.");
    } catch (error) { notify(error instanceof Error ? error.message : "Delete failed.", "error"); }
    finally { setBusy(false); }
  }
  const previewUrl = filePreview || (removePhoto ? null : photoUrl(editing?.photo_path || null));

  return <>
    <section className="card student-form-card">
      <div className="cardhead"><div className="cardicon"><Plus size={19}/></div><div><h3>{editing ? "Edit Student Profile" : "Add New Student"}</h3><p className="sub">Complete the student details below. Required fields are marked with *.</p></div></div>
      {message && <div className={`notice ${messageType === "error" ? "notice-error" : "notice-success"}`} role="status">{message}</div>}
      <form onSubmit={save} noValidate>
        <div className="student-photo-row">
          <div className="student-photo-preview">{previewUrl ? <img src={previewUrl} alt="Student profile preview"/> : <UserRound size={35}/>}</div>
          <div className="photo-copy"><b>Student profile photo</b><span>JPG, PNG or WebP · Maximum 5 MB</span><div className="actions photo-actions"><button type="button" className="btn secondary" onClick={() => fileInput.current?.click()}><ImagePlus size={15}/>{photoFile ? "Choose another photo" : "Choose photo"}</button>{(photoFile || (editing?.photo_path && !removePhoto)) && <button type="button" className="btn secondary" onClick={() => { setPhotoFile(null); setRemovePhoto(Boolean(editing?.photo_path)); if (fileInput.current) fileInput.current.value = ""; }}><X size={14}/>Remove</button>}</div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={event => { const file = event.target.files?.[0] || null; setPhotoFile(file); setRemovePhoto(false); if (file) { const issue = !ALLOWED_PHOTO_TYPES.includes(file.type) ? "Choose a JPG, PNG or WebP image." : file.size > MAX_PHOTO_BYTES ? "Photo must be 5 MB or smaller." : ""; if (issue) notify(issue, "error"); else setMessage(""); } }} /></div>
        </div>
        <div className="grid formgrid student-fields">
          <div className="field"><label htmlFor="full_name">Full name <span className="required-star">*</span></label><input id="full_name" value={form.full_name} onChange={e => update("full_name", e.target.value)} maxLength={100} autoComplete="name" required placeholder="Enter full name"/></div>
          <div className="field"><label htmlFor="roll_number">Roll number</label><input id="roll_number" value={form.roll_number} onChange={e => update("roll_number", e.target.value)} maxLength={40} placeholder="e.g. CS2026-014"/></div>
          <div className="field"><label htmlFor="email">Email address {form.create_login && <span className="required-star">*</span>}</label><input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} maxLength={254} autoComplete="email" required={form.create_login} placeholder="student@example.com"/></div>
          <div className="field"><label htmlFor="phone">Phone number</label><input id="phone" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} maxLength={20} autoComplete="tel" placeholder="+91 98765 43210"/></div>
          <div className="field"><label htmlFor="course">Course / department <span className="required-star">*</span></label><input id="course" value={form.course} onChange={e => update("course", e.target.value)} maxLength={100} required placeholder="e.g. BSc Computer Science"/></div>
          <div className="field"><label htmlFor="division">Division</label><select id="division" value={form.division} onChange={e => update("division", e.target.value)}><option value="A">Division A</option><option value="B">Division B</option><option value="C">Division C</option><option value="D">Division D</option><option value="E">Division E</option></select></div>
          <div className="field"><label htmlFor="date_of_birth">Date of birth</label><input id="date_of_birth" type="date" max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)}/></div>
          <div className="field"><label htmlFor="gender">Gender</label><select id="gender" value={form.gender} onChange={e => update("gender", e.target.value)}><option value="">Prefer not to specify</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option></select></div>
          <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="address">Address</label><textarea id="address" value={form.address} onChange={e => update("address", e.target.value)} maxLength={500} rows={3} placeholder="Enter the student's address"/></div>
        </div>
        <div className="login-setup">
          <div className="login-setup-icon"><KeyRound size={18}/></div>
          <div className="login-setup-content">
            <div className="login-setup-title"><b>Student login access</b>{editing?.auth_user_id && <span className="account-pill"><ShieldCheck size={12}/> Account linked</span>}</div>
            <p>Allow this student to sign in with their own email and password.</p>
            <label className="checkline"><input type="checkbox" checked={form.create_login} disabled={Boolean(editing?.auth_user_id)} onChange={e => update("create_login", e.target.checked)}/><span>{editing?.auth_user_id ? "Student login account is enabled" : "Create a student login account"}</span></label>
            {form.create_login && <div className="field password-field"><label htmlFor="student_password">{editing?.auth_user_id ? "Set a new password (optional)" : "Temporary login password *"}</label><input id="student_password" type="password" autoComplete="new-password" value={form.password} onChange={e => update("password", e.target.value)} minLength={8} required={!editing?.auth_user_id} placeholder={editing?.auth_user_id ? "Leave blank to keep current password" : "At least 8 characters"}/><small>{editing?.auth_user_id ? "Enter a password only if you want to reset it." : "Share this password securely with the student. It is not stored in the student table."}</small></div>}
          </div>
        </div>
        <div className="actions form-actions"><button className="btn" disabled={busy}><Upload size={15}/>{busy ? "Saving…" : editing ? "Save Changes" : "Add Student"}</button>{editing && <button type="button" className="btn secondary" disabled={busy} onClick={resetForm}>Cancel</button>}</div>
      </form>
    </section>

    <section className="card">
      <div className="cardhead"><div className="cardicon"><Search size={19}/></div><div><h3>Student Directory</h3><p className="sub">{students.length} student record{students.length === 1 ? "" : "s"} · Search and manage student profiles.</p></div></div>
      <div className="toolbar"><input aria-label="Search students" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, roll number, email, course…"/><button className="btn secondary" type="button" onClick={() => setQuery("")}><RefreshCw size={15}/> Clear</button></div>
      <div className="tablewrap"><table><thead><tr><th>Student</th><th>Roll number</th><th>Course</th><th>Division</th><th>Email</th><th>Login</th><th>Actions</th></tr></thead><tbody>
        {visible.map(student => <tr key={student.id}><td><div className="student-cell"><div className="student-avatar">{photoUrl(student.photo_path) ? <img src={photoUrl(student.photo_path) || ""} alt=""/> : <UserRound size={17}/>}</div><div><b>{student.full_name}</b><small>{student.phone || "No phone added"}</small></div></div></td><td>{student.roll_number || "—"}</td><td>{student.course}</td><td><span className="badge">{student.division || "—"}</span></td><td>{student.email || "—"}</td><td>{student.auth_user_id ? <span className="account-pill"><ShieldCheck size={12}/> Enabled</span> : <span className="account-pill account-pill-off">Not linked</span>}</td><td><div className="actions"><button type="button" className="btn secondary" onClick={() => edit(student)} disabled={busy}><Pencil size={13}/> Edit</button><button type="button" className="btn danger" onClick={() => remove(student)} disabled={busy} aria-label={`Delete ${student.full_name}`}><Trash2 size={14}/></button></div></td></tr>)}
      </tbody></table>{visible.length === 0 && <div className="empty">No students found. Try another search or add a new student.</div>}</div>
    </section>
  </>;
}
