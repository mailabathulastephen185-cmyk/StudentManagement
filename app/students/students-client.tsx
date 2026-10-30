
"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  UserRound,
  Pencil,
  X,
  ShieldCheck,
  KeyRound,
  ImagePlus,
  Eye,
  Users,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
} from "lucide-react";

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
  full_name: string;
  roll_number: string;
  email: string;
  phone: string;
  course: string;
  division: string;
  date_of_birth: string;
  gender: string;
  address: string;
  create_login: boolean;
  password: string;
};

const blank: StudentForm = {
  full_name: "",
  roll_number: "",
  email: "",
  phone: "",
  course: "",
  division: "A",
  date_of_birth: "",
  gender: "",
  address: "",
  create_login: true,
  password: "",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function photoUrl(path: string | null) {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) return path;

  return createClient()
    .storage
    .from("student-photos")
    .getPublicUrl(path).data.publicUrl;
}

export default function StudentsClient({
  initialStudents,
}: {
  initialStudents: Student[];
}) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");

  const [form, setForm] = useState<StudentForm>(blank);
  const [editing, setEditing] = useState<Student | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const directoryRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const search = query.toLowerCase().trim();

    return students.filter((student) =>
      [
        student.full_name,
        student.roll_number,
        student.email,
        student.course,
        student.division,
        student.phone,
      ].some((value) =>
        (value || "").toLowerCase().includes(search)
      )
    );
  }, [students, query]);

  const courses = useMemo(
    () => [...new Set(students.map((s) => s.course))].sort(),
    [students]
  );

  useEffect(() => {
    if (!photoFile) {
      setFilePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setFilePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  function update<K extends keyof StudentForm>(
    key: K,
    value: StudentForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function notify(
    text: string,
    type: "success" | "error" = "success"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function scrollToDirectory() {
    directoryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function validate(): string | null {
    if (form.full_name.trim().length < 2) {
      return "Enter the student's full name (at least 2 characters).";
    }

    if (!form.course.trim()) {
      return "Course / department is required.";
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      return "Enter a valid email address.";
    }

    if (
      form.phone &&
      !/^[+\d() .-]{7,20}$/.test(form.phone.trim())
    ) {
      return "Enter a valid phone number.";
    }

    if (
      form.date_of_birth &&
      form.date_of_birth > new Date().toISOString().slice(0, 10)
    ) {
      return "Date of birth cannot be in the future.";
    }

    const needsNewLogin =
      form.create_login && (!editing || !editing.auth_user_id);

    if (form.create_login && !form.email.trim()) {
      return "Enter an email address to create a student login.";
    }

    if (needsNewLogin && form.password.length < 8) {
      return "Create a student password with at least 8 characters.";
    }

    if (
      editing?.auth_user_id &&
      form.password &&
      form.password.length < 8
    ) {
      return "A new password must contain at least 8 characters.";
    }

    if (
      photoFile &&
      !ALLOWED_PHOTO_TYPES.includes(photoFile.type)
    ) {
      return "Photo must be JPG, PNG or WebP.";
    }

    if (photoFile && photoFile.size > MAX_PHOTO_BYTES) {
      return "Photo must be 5 MB or smaller.";
    }

    return null;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      notify(validationError, "error");
      return;
    }

    setBusy(true);
    setMessage("");

    const supabase = createClient();
    let uploadedPath: string | null = null;

    let photo_path = removePhoto
      ? null
      : editing?.photo_path || null;

    try {
      if (photoFile) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "Your session expired. Sign in again before uploading a photo."
          );
        }

        const extension =
          photoFile.type === "image/png"
            ? "png"
            : photoFile.type === "image/webp"
              ? "webp"
              : "jpg";

        uploadedPath =
          `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("student-photos")
          .upload(uploadedPath, photoFile, {
            contentType: photoFile.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Photo upload failed: ${uploadError.message}`
          );
        }

        photo_path = uploadedPath;
      }

      const payload = {
        full_name: form.full_name.trim(),
        roll_number: form.roll_number.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        course: form.course.trim(),
        division: form.division.trim() || "A",
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        address: form.address.trim(),
        photo_path,
        create_login: form.create_login,
        password: form.password,
      };

      const response = await fetch(
        editing
          ? `/api/students/${editing.id}`
          : "/api/students",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save student.");
      }

      const saved = result.student as Student;

      setStudents((previous) =>
        editing
          ? previous.map((s) =>
              s.id === saved.id ? saved : s
            )
          : [saved, ...previous]
      );

      resetForm();

      notify(
        editing
          ? "Student record updated successfully."
          : "Student added successfully."
      );
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from("student-photos")
          .remove([uploadedPath]);
      }

      notify(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the student.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...blank });
    setPhotoFile(null);
    setRemovePhoto(false);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function edit(student: Student) {
    setEditing(student);

    setForm({
      full_name: student.full_name,
      roll_number: student.roll_number || "",
      email: student.email || "",
      phone: student.phone || "",
      course: student.course,
      division: student.division || "A",
      date_of_birth: student.date_of_birth || "",
      gender: student.gender || "",
      address: student.address || "",
      create_login: Boolean(student.auth_user_id),
      password: "",
    });

    setPhotoFile(null);
    setRemovePhoto(false);
    setMessage("");
    setViewing(null);

    if (fileInput.current) {
      fileInput.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function remove(student: Student) {
    if (
      !window.confirm(
        `Delete ${student.full_name}'s student record? The linked login account, if any, will remain active.`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `/api/students/${student.id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Delete failed.");
      }

      setStudents((previous) =>
        previous.filter((s) => s.id !== student.id)
      );

      if (viewing?.id === student.id) {
        setViewing(null);
      }

      notify(
        "Student record deleted. Any linked Auth account was kept intact."
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Delete failed.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  const previewUrl =
    filePreview ||
    (removePhoto ? null : photoUrl(editing?.photo_path || null));

  return (
    <>
      {/* DIRECTORY OVERVIEW */}

      <section className="student-overview">
        <div className="student-overview-icon">
          <Users size={27} />
        </div>

        <div className="student-overview-content">
          <div className="student-overview-label">
            STUDENT RECORDS
          </div>

          <h2>Every student, organized.</h2>

          <p>
            Browse student profiles, manage academic details
            and organize your college records.
          </p>
        </div>

        <div className="student-overview-count">
          <Users size={22} />
          <div>
            <strong>{students.length}</strong>
            <span>Total students</span>
          </div>
        </div>
      </section>

      {/* ADD / EDIT STUDENT FORM */}

      <section className="card student-form-card">
        <div className="cardhead">
          <div className="cardicon">
            <Plus size={19} />
          </div>

          <div>
            <h3>
              {editing ? "Edit Student Profile" : "Add New Student"}
            </h3>

            <p className="sub">
              Complete the student details below. Required fields are marked with *.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`notice ${
              messageType === "error"
                ? "notice-error"
                : "notice-success"
            }`}
            role="status"
          >
            {message}
          </div>
        )}

        <form onSubmit={save} noValidate>
          <div className="student-photo-row">
            <div className="student-photo-preview">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Student profile preview"
                />
              ) : (
                <UserRound size={35} />
              )}
            </div>

            <div className="photo-copy">
              <b>Student profile photo</b>
              <span>JPG, PNG or WebP · Maximum 5 MB</span>

              <div className="actions photo-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => fileInput.current?.click()}
                >
                  <ImagePlus size={15} />
                  {photoFile ? "Choose another photo" : "Choose photo"}
                </button>

                {(photoFile ||
                  (editing?.photo_path && !removePhoto)) && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setPhotoFile(null);
                      setRemovePhoto(Boolean(editing?.photo_path));

                      if (fileInput.current) {
                        fileInput.current.value = "";
                      }
                    }}
                  >
                    <X size={14} />
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="visually-hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;

                  setPhotoFile(file);
                  setRemovePhoto(false);

                  if (file) {
                    const issue =
                      !ALLOWED_PHOTO_TYPES.includes(file.type)
                        ? "Choose a JPG, PNG or WebP image."
                        : file.size > MAX_PHOTO_BYTES
                          ? "Photo must be 5 MB or smaller."
                          : "";

                    if (issue) {
                      notify(issue, "error");
                    } else {
                      setMessage("");
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="grid formgrid student-fields">
            <div className="field">
              <label htmlFor="full_name">
                Full name <span className="required-star">*</span>
              </label>

              <input
                id="full_name"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                maxLength={100}
                autoComplete="name"
                required
                placeholder="Enter full name"
              />
            </div>

            <div className="field">
              <label htmlFor="roll_number">Roll number</label>

              <input
                id="roll_number"
                value={form.roll_number}
                onChange={(e) => update("roll_number", e.target.value)}
                maxLength={40}
                placeholder="e.g. CS2026-014"
              />
            </div>

            <div className="field">
              <label htmlFor="email">
                Email address{" "}
                {form.create_login && (
                  <span className="required-star">*</span>
                )}
              </label>

              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                maxLength={254}
                autoComplete="email"
                required={form.create_login}
                placeholder="student@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone number</label>

              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                maxLength={20}
                autoComplete="tel"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="field">
              <label htmlFor="course">
                Course / department{" "}
                <span className="required-star">*</span>
              </label>

              <input
                id="course"
                value={form.course}
                onChange={(e) => update("course", e.target.value)}
                maxLength={100}
                required
                placeholder="e.g. BSc Computer Science"
              />
            </div>

            <div className="field">
              <label htmlFor="division">Division</label>

              <select
                id="division"
                value={form.division}
                onChange={(e) => update("division", e.target.value)}
              >
                {["A", "B", "C", "D", "E"].map((division) => (
                  <option key={division} value={division}>
                    Division {division}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="date_of_birth">Date of birth</label>

              <input
                id="date_of_birth"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="gender">Gender</label>

              <select
                id="gender"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option value="">Prefer not to specify</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>

            <div
              className="field"
              style={{ gridColumn: "1 / -1" }}
            >
              <label htmlFor="address">Address</label>

              <textarea
                id="address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Enter the student's address"
              />
            </div>
          </div>

          {/* STUDENT LOGIN */}

          <div className="login-setup">
            <div className="login-setup-icon">
              <KeyRound size={18} />
            </div>

            <div className="login-setup-content">
              <div className="login-setup-title">
                <b>Student login access</b>

                {editing?.auth_user_id && (
                  <span className="account-pill">
                    <ShieldCheck size={12} />
                    Account linked
                  </span>
                )}
              </div>

              <p>
                Allow this student to sign in with their own email and password.
              </p>

              <label className="checkline">
                <input
                  type="checkbox"
                  checked={form.create_login}
                  disabled={Boolean(editing?.auth_user_id)}
                  onChange={(e) =>
                    update("create_login", e.target.checked)
                  }
                />

                <span>
                  {editing?.auth_user_id
                    ? "Student login account is enabled"
                    : "Create a student login account"}
                </span>
              </label>

              {form.create_login && (
                <div className="field password-field">
                  <label htmlFor="student_password">
                    {editing?.auth_user_id
                      ? "Set a new password (optional)"
                      : "Temporary login password *"}
                  </label>

                  <input
                    id="student_password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      update("password", e.target.value)
                    }
                    minLength={8}
                    required={!editing?.auth_user_id}
                    placeholder={
                      editing?.auth_user_id
                        ? "Leave blank to keep current password"
                        : "At least 8 characters"
                    }
                  />

                  <small>
                    {editing?.auth_user_id
                      ? "Enter a password only if you want to reset it."
                      : "Share this password securely with the student. It is not stored in the student table."}
                  </small>
                </div>
              )}
            </div>
          </div>

          <div className="actions form-actions">
            <button className="btn" disabled={busy}>
              <Upload size={15} />
              {busy
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Add Student"}
            </button>

            {editing && (
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* STUDENT DIRECTORY */}

      <section className="card student-directory-card" ref={directoryRef}>
        <div className="student-directory-heading">
          <div className="cardhead">
            <div className="cardicon">
              <Search size={19} />
            </div>

            <div>
              <h3>Student Directory</h3>
              <p className="sub">
                Search students, view profiles and manage existing records.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={scrollToDirectory}
          >
            <Users size={16} />
            View Students
          </button>
        </div>

        <div className="student-directory-summary">
          <div>
            <span>Total students</span>
            <strong>{students.length}</strong>
          </div>

          <div>
            <span>Courses</span>
            <strong>{courses.length}</strong>
          </div>

          <div>
            <span>Showing records</span>
            <strong>{visible.length}</strong>
          </div>
        </div>

        <div className="toolbar student-search-toolbar">
          <div className="student-search-box">
            <Search size={18} />

            <input
              aria-label="Search students"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name, roll number, email or course..."
            />
          </div>

          <button
            className="btn secondary"
            type="button"
            onClick={() => setQuery("")}
          >
            <RefreshCw size={15} />
            Clear
          </button>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Roll number</th>
                <th>Course</th>
                <th>Division</th>
                <th>Contact information</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {visible.map((student, index) => {
                const image = photoUrl(student.photo_path);

                return (
                  <tr key={student.id}>
                    <td>
                      <span className="student-id">
                        #{index + 1}
                      </span>
                    </td>

                    <td>
                      <div className="student-cell">
                        <div className="student-avatar">
                          {image ? (
                            <img src={image} alt="" />
                          ) : (
                            <UserRound size={18} />
                          )}
                        </div>

                        <div>
                          <b>{student.full_name}</b>
                          <small>
                            {student.auth_user_id
                              ? "Student account linked"
                              : "Student profile"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{student.roll_number || "—"}</td>

                    <td>
                      <span className="student-course-badge">
                        {student.course}
                      </span>
                    </td>

                    <td>
                      <span className="badge">
                        {student.division || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="student-contact">
                        <span>
                          <Mail size={13} />
                          {student.email || "No email"}
                        </span>

                        <span>
                          <Phone size={13} />
                          {student.phone || "No phone"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="actions student-row-actions">
                        <button
                          type="button"
                          className="btn secondary student-view-btn"
                          onClick={() => setViewing(student)}
                          aria-label={`View ${student.full_name}`}
                          title="View student"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => edit(student)}
                          disabled={busy}
                          title="Edit student"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => remove(student)}
                          disabled={busy}
                          aria-label={`Delete ${student.full_name}`}
                          title="Delete student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div className="empty">
              No students found. Try another search or add a new student.
            </div>
          )}
        </div>
      </section>

      {/* VIEW STUDENT PROFILE */}

      {viewing && (
        <div
          className="student-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewing(null);
            }
          }}
        >
          <section
            className="student-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-view-title"
          >
            <div className="student-modal-header">
              <div>
                <span className="student-modal-eyebrow">
                  STUDENT PROFILE
                </span>
                <h2 id="student-view-title">Student Details</h2>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={() => setViewing(null)}
                aria-label="Close student details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="student-modal-profile">
              <div className="student-modal-photo">
                {photoUrl(viewing.photo_path) ? (
                  <img
                    src={photoUrl(viewing.photo_path) || ""}
                    alt={viewing.full_name}
                  />
                ) : (
                  <UserRound size={42} />
                )}
              </div>

              <div>
                <h3>{viewing.full_name}</h3>
                <p>
                  {viewing.course} · Division {viewing.division || "—"}
                </p>

                <span className="student-modal-roll">
                  Roll No: {viewing.roll_number || "Not assigned"}
                </span>
              </div>
            </div>

            <div className="student-modal-grid">
              <div className="student-detail">
                <Mail size={17} />
                <div>
                  <small>Email address</small>
                  <b>{viewing.email || "Not provided"}</b>
                </div>
              </div>

              <div className="student-detail">
                <Phone size={17} />
                <div>
                  <small>Phone number</small>
                  <b>{viewing.phone || "Not provided"}</b>
                </div>
              </div>

              <div className="student-detail">
                <GraduationCap size={17} />
                <div>
                  <small>Course</small>
                  <b>{viewing.course}</b>
                </div>
              </div>

              <div className="student-detail">
                <Users size={17} />
                <div>
                  <small>Division</small>
                  <b>{viewing.division || "Not assigned"}</b>
                </div>
              </div>

              <div className="student-detail">
                <CalendarDays size={17} />
                <div>
                  <small>Date of birth</small>
                  <b>{viewing.date_of_birth || "Not provided"}</b>
                </div>
              </div>

              <div className="student-detail">
                <UserRound size={17} />
                <div>
                  <small>Gender</small>
                  <b>{viewing.gender || "Not provided"}</b>
                </div>
              </div>

              <div className="student-detail student-detail-wide">
                <MapPin size={17} />
                <div>
                  <small>Address</small>
                  <b>{viewing.address || "Not provided"}</b>
                </div>
              </div>

              <div className="student-detail student-detail-wide">
                <ShieldCheck size={17} />
                <div>
                  <small>Student login</small>
                  <b>
                    {viewing.auth_user_id
                      ? "Account enabled"
                      : "No login account linked"}
                  </b>
                </div>
              </div>
            </div>

            <div className="student-modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setViewing(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => edit(viewing)}
              >
                <Pencil size={15} />
                Edit Student
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
