# StudentManagement — Next.js + Supabase

A modern rebuild of the Java/JSP Student Management System using **Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, and Vercel**. The interface retains the premium navy sidebar, blue primary actions, white cards, and gold accents.

## Student management features

- Admin-only create, read, update and delete for student records.
- Search by name, roll number, email, course or division.
- Photo upload to the `student-photos` Supabase Storage bucket (JPG, PNG or WebP, maximum 5 MB), photo preview, photo replacement and deletion cleanup.
- Client-side and server-side validation for name, email, phone, date of birth, course, password and photo.
- Duplicate roll-number/email checks, plus database uniqueness error handling.
- Optional student Auth account creation as part of adding a student; the record is linked by `students.auth_user_id`.
- Admin can reset an existing student's password while editing. Passwords are handled by Supabase Auth and are never stored in the `students` table.
- Role-aware sign-in: administrators go to `/dashboard`; students go to `/student-portal`.
- Student portal shows only the signed-in student's linked profile and attendance summary. It is read-only.
- RLS policies protect records; the Supabase service-role key is used only by server-side account-management routes.

Other starter modules include division capacity distribution, subjects, and attendance-session recording. This is still a migration starter, not a verified byte-for-byte port of every legacy Java feature. The old app's exact AI attendance analysis provider, lecture duration/number rules, common multi-course lectures, defaulter report rules, and legacy field mappings need the corresponding Java Servlet/DAO/database source to port exactly. Do not delete the original Java project.

## 1. Install tools and dependencies

1. Install Node.js LTS from https://nodejs.org/ and Git from https://git-scm.com/.
2. Open Terminal and enter the extracted project folder:

```bash
cd studentmanagement-next
npm install
```

3. Open the folder in VS Code (or your preferred editor).

## 2. Create and configure Supabase

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and run it.
3. Open **Project Settings → API** (or the **Connect** panel). Copy the Project URL, publishable key, and **service-role key**. Keep the service-role key secret.
4. In **Authentication → Users**, create your administrator account with an email and password.
5. Copy that user's UUID and run this SQL, replacing the UUID:

```sql
update public.profiles
set role = 'admin', full_name = 'Administrator'
where id = 'YOUR_AUTH_USER_UUID';
```

New Auth users get the `student` role by default. Only promote your trusted administrator account to `admin`.

## 3. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set these values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

**Security:** `SUPABASE_SERVICE_ROLE_KEY` must remain server-only. Never rename it with a `NEXT_PUBLIC_` prefix, paste it into a client component, commit `.env.local`, or share it publicly. The `.gitignore` file should keep `.env.local` out of Git.

## 4. Run the application

```bash
npm run dev
```

Open http://localhost:3000 and sign in with your administrator email/password.

## 5. Add a student and create their login

1. Open **Manage Students** from the left sidebar.
2. Enter the student's name and course. Add roll number, email, phone, division, date of birth, gender and address as needed.
3. To upload a photo, click **Choose photo**. Use a JPG, PNG or WebP image up to 5 MB.
4. Leave **Create a student login account** checked if the student should sign in. Enter a valid email and a password of at least 8 characters. If you uncheck it, the student record is created without an Auth login.
5. Click **Add Student**. The server creates the Auth account, links its UUID to the student record and saves the profile. The password is not saved to the student table.
6. Share the login credentials with the student privately. The student signs in at the same `/login` page and is sent to `/student-portal`.
7. Use **Edit** to update the profile, replace/remove the photo, or reset a linked student's password. To keep the existing password, leave the password field blank.
8. Use **Delete** to delete the student record. The linked Auth account is deliberately kept so a mistaken record deletion does not silently destroy the login. Remove an Auth account separately from Supabase Authentication if you intentionally want to revoke it.

## 6. Student login and profile access

Student accounts should be created through the admin form or Supabase Auth. A student account must be linked to a row in `public.students` through `auth_user_id` for the portal to show a profile. The portal is read-only. If an existing student has a Supabase Auth account that is not linked, have an administrator link it after verifying the student's identity; do not ask the student to share a password.

## 7. Test before deployment

Run:

```bash
npm run build
```

Then test these cases locally:

- Admin can add, edit, search and delete a student.
- Empty name/course, invalid email/phone, future DOB, duplicate roll number/email, password shorter than 8 characters, unsupported image types and images larger than 5 MB are rejected.
- A student photo uploads and remains visible after refreshing the page.
- A new student can sign in with their email/password and sees only their own linked record in `/student-portal`.
- A student cannot open admin routes such as `/students`, `/divisions`, or `/attendance`.
- Changing a linked student's email/password works as intended; leaving the password blank does not reset it.
- Deleting a student record does not delete the Auth account.

The starter was not compiled against your own Supabase project in this environment, so run the build and complete these tests before deploying.

## 8. GitHub and Vercel deployment

```bash
git init
git add .
git commit -m "Student management Next.js migration"
```

Create an empty GitHub repository, add it as the remote, and push. Confirm `.env.local` is not committed. In Vercel, import the GitHub repository and add the same four environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`) in **Project Settings → Environment Variables**. Deploy, then update Supabase Authentication URL Configuration with your production Site URL and allowed redirect URLs. Never expose the service-role key in client-side code.

## Migration notes

- The old MySQL database is not automatically imported. Export and map old data to PostgreSQL, resolve duplicate values and date formats, and create Supabase Auth accounts for students. Never migrate plaintext passwords.
- Keep the old Java project and database until the migrated app and all required features have been verified.
- RLS must remain enabled. Do not disable it to make a query work.
- The `student-photos` bucket is public-read in this starter so profile images can be displayed without signed URLs; only admins can upload, replace or delete files under the configured policies. If photos must be private, switch to signed URLs and update the read policy before production.
