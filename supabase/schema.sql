-- Student Management System: Supabase PostgreSQL schema
-- Run in Supabase Dashboard > SQL Editor. Review before running on a non-empty project.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin','student');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.attendance_status as enum ('present','absent','late','excused');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'User',
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  roll_number text unique,
  email text,
  phone text,
  course text not null,
  division text not null default 'A',
  date_of_birth date,
  gender text,
  address text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course text not null,
  created_at timestamptz not null default now(),
  unique(name,course)
);
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  division text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text not null,
  session_date date not null,
  teacher_name text,
  lecture_type text not null default 'Regular',
  duration_minutes integer check(duration_minutes is null or duration_minutes between 1 and 1440),
  lecture_number integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  unique(session_id,student_id)
);
create index if not exists students_course_division_idx on public.students(course,division);
create index if not exists attendance_session_date_idx on public.attendance_sessions(session_date desc);
create index if not exists attendance_records_student_idx on public.attendance_records(student_id);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$ begin
  insert into public.profiles(id,full_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name','User'),'student')
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "profiles read self or admin" on public.profiles;
create policy "profiles read self or admin" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists "profiles update self or admin" on public.profiles;
drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin manages students" on public.students;
create policy "admin manages students" on public.students for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "student reads own record" on public.students;
create policy "student reads own record" on public.students for select to authenticated using(auth_user_id=auth.uid());
drop policy if exists "admin manages subjects" on public.subjects;
create policy "admin manages subjects" on public.subjects for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin manages attendance sessions" on public.attendance_sessions;
create policy "admin manages attendance sessions" on public.attendance_sessions for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "student reads own attendance sessions" on public.attendance_sessions;
create policy "student reads own attendance sessions" on public.attendance_sessions for select to authenticated using(exists(select 1 from public.attendance_records ar join public.students st on st.id=ar.student_id where ar.session_id=attendance_sessions.id and st.auth_user_id=auth.uid()));
drop policy if exists "admin manages attendance records" on public.attendance_records;
create policy "admin manages attendance records" on public.attendance_records for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "student reads own attendance" on public.attendance_records;
create policy "student reads own attendance" on public.attendance_records for select to authenticated using(exists(select 1 from public.students st where st.id=attendance_records.student_id and st.auth_user_id=auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-photos','student-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists "admins upload student photos" on storage.objects;
create policy "admins upload student photos" on storage.objects for insert to authenticated with check(bucket_id='student-photos' and public.is_admin());
drop policy if exists "admins update student photos" on storage.objects;
create policy "admins update student photos" on storage.objects for update to authenticated using(bucket_id='student-photos' and public.is_admin()) with check(bucket_id='student-photos' and public.is_admin());
drop policy if exists "admins delete student photos" on storage.objects;
create policy "admins delete student photos" on storage.objects for delete to authenticated using(bucket_id='student-photos' and public.is_admin());
drop policy if exists "public reads student photos" on storage.objects;
create policy "public reads student photos" on storage.objects for select to public using(bucket_id='student-photos');

-- After creating your own first user in Supabase Authentication, promote that user:
-- update public.profiles set role='admin', full_name='Your Admin Name' where id='AUTH_USER_UUID';
