
"use client";

import { useMemo, useState } from "react";

type S = {
  id: string;
  full_name: string;
  roll_number: string | null;
  course: string;
  division: string | null;
};

type Sub = {
  id: string;
  name: string;
  course: string;
};

type Session = {
  id: string;
  session_date: string;
  subject_name: string;
  course: string;
  division: string | null;
  teacher_name: string | null;
  lecture_type: string | null;
};

export default function AttendanceClient({
  students,
  subjects: initialSubjects,
  sessions,
}: {
  students: S[];
  subjects: Sub[];
  sessions: Session[];
}) {
  const courses = [...new Set(students.map((s) => s.course))];

  const [course, setCourse] = useState(courses[0] || "");
  const [division, setDivision] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teacher, setTeacher] = useState("");
  const [lectureType, setLectureType] = useState("Regular");
  const [mode, setMode] = useState("present");
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");

  // Subjects can be added without refreshing the page.
  const [subjectList, setSubjectList] = useState<Sub[]>(initialSubjects);

  // Add Subject form state.
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectMsg, setSubjectMsg] = useState("");

  const divisions = [
    ...new Set(
      students
        .filter((s) => s.course === course)
        .map((s) => s.division || "A")
    ),
  ];

  const availableSubjects = subjectList.filter(
    (s) => s.course === course
  );

  const list = useMemo(
    () =>
      students.filter(
        (s) =>
          s.course === course &&
          (division === "" || (s.division || "A") === division)
      ),
    [students, course, division]
  );

  function toggle(id: string) {
    setMarked((previous) => ({
      ...previous,
      [id]: !(previous[id] ?? (mode === "present")),
    }));
  }

  async function addSubject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubjectMsg("");

    const name = newSubjectName.trim();

    if (!name) {
      setSubjectMsg("Please enter a subject name.");
      return;
    }

    if (!course) {
      setSubjectMsg("Please select a course first.");
      return;
    }

    const duplicate = subjectList.some(
      (s) =>
        s.course.toLowerCase() === course.toLowerCase() &&
        s.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      setSubjectMsg("This subject already exists for this course.");
      return;
    }

    setSavingSubject(true);

    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, course }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubjectMsg(result.error || "Could not save the subject.");
        return;
      }

      const savedSubject = result.subject as Sub;

      setSubjectList((previous) => {
        if (previous.some((s) => s.id === savedSubject.id)) {
          return previous;
        }

        return [...previous, savedSubject];
      });

      setSubject(savedSubject.id);
      setNewSubjectName("");
      setShowAddSubject(false);
      setSubjectMsg("");
      setMsg(`Subject "${savedSubject.name}" added successfully.`);
    } catch {
      setSubjectMsg("Network error. Please try again.");
    } finally {
      setSavingSubject(false);
    }
  }

  async function save() {
    setMsg("");

    if (!course || !division || !subject) {
      setMsg("Select a course, division and subject.");
      return;
    }

    if (list.length === 0) {
      setMsg("No students found for this course and division.");
      return;
    }

    const presentIds = list
      .filter((s) => marked[s.id] ?? (mode === "present"))
      .map((s) => s.id);

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          division,
          subject_id: subject,
          session_date: date,
          teacher_name: teacher,
          lecture_type: lectureType,
          student_ids: list.map((s) => s.id),
          present_ids: presentIds,
        }),
      });

      const result = await response.json();

      setMsg(
        response.ok
          ? `Attendance saved for ${result.count} students.`
          : result.error || "Could not save attendance."
      );

      if (response.ok) {
        setMarked({});
      }
    } catch {
      setMsg("Network error while saving attendance.");
    }
  }

  return (
    <>
      <section className="card">
        <div className="cardhead">
          <div className="cardicon">✓</div>
          <div>
            <h3>Lecture details</h3>
            <p className="sub">
              Select a class and enter the session details.
            </p>
          </div>
        </div>

        <div className="grid formgrid">
          <div className="field">
            <label>Course</label>
            <select
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setDivision("");
                setSubject("");
                setSubjectMsg("");
              }}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Division</label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Subject</label>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              >
                <option value="">Select subject</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSubjectMsg("");
                  setShowAddSubject((previous) => !previous);
                }}
                style={{ whiteSpace: "nowrap" }}
              >
                {showAddSubject ? "Cancel" : "+ Add Subject"}
              </button>
            </div>

            {showAddSubject && (
              <form
                onSubmit={addSubject}
                className="card"
                style={{ marginTop: 12, padding: 16 }}
              >
                <h3 style={{ marginTop: 0 }}>Add New Subject</h3>

                <p className="sub">
                  New subject will be added to the selected course:{" "}
                  <strong>{course || "No course selected"}</strong>
                </p>

                <div className="field">
                  <label htmlFor="new-subject-name">Subject name</label>
                  <input
                    id="new-subject-name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="e.g. Data Structures"
                    maxLength={100}
                    required
                  />
                </div>

                {subjectMsg && (
                  <div className="notice" style={{ marginTop: 10 }}>
                    {subjectMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn"
                  disabled={savingSubject || !course}
                  style={{ marginTop: 12 }}
                >
                  {savingSubject ? "Saving..." : "Save Subject"}
                </button>
              </form>
            )}
          </div>

          <div className="field">
            <label>Lecture date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Teacher name</label>
            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Enter teacher name"
            />
          </div>

          <div className="field">
            <label>Lecture type</label>
            <select
              value={lectureType}
              onChange={(e) => setLectureType(e.target.value)}
            >
              <option>Regular</option>
              <option>Practical</option>
              <option>Extra lecture</option>
              <option>Seminar</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="cardhead">
          <div className="cardicon">◎</div>
          <div>
            <h3>Student attendance</h3>
            <p className="sub">
              {list.length} students selected. Choose whether to start with
              everyone present or absent.
            </p>
          </div>
        </div>

        <div className="actions" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`btn ${mode === "present" ? "" : "secondary"}`}
            onClick={() => {
              setMode("present");
              setMarked({});
            }}
          >
            Present Mode
          </button>

          <button
            type="button"
            className={`btn ${mode === "absent" ? "" : "secondary"}`}
            onClick={() => {
              setMode("absent");
              setMarked({});
            }}
          >
            Absent Mode
          </button>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll number</th>
                <th>Mark present</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const present = marked[s.id] ?? (mode === "present");

                return (
                  <tr key={s.id}>
                    <td>{s.full_name}</td>
                    <td>{s.roll_number || "—"}</td>
                    <td>
                      <input
                        aria-label={`Present ${s.full_name}`}
                        type="checkbox"
                        checked={present}
                        onChange={() => toggle(s.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {list.length === 0 && (
            <div className="empty">
              Select a course and division to load students.
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn"
          style={{ marginTop: 18 }}
          onClick={save}
        >
          Save Attendance
        </button>

        {msg && (
          <div className="notice" style={{ marginTop: 14 }}>
            {msg}
          </div>
        )}
      </section>

      <section className="card">
        <div className="cardhead">
          <div className="cardicon">↻</div>
          <div>
            <h3>Recent attendance sessions</h3>
            <p className="sub">Latest saved lecture sessions.</p>
          </div>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Course</th>
                <th>Division</th>
                <th>Teacher</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.session_date}</td>
                  <td>{s.subject_name}</td>
                  <td>{s.course}</td>
                  <td>{s.division || "—"}</td>
                  <td>{s.teacher_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {sessions.length === 0 && (
            <div className="empty">No attendance sessions saved yet.</div>
          )}
        </div>
      </section>
    </>
  );
}
