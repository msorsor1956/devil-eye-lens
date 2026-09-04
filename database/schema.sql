create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  object_key text not null unique,
  original_name text not null,
  media_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  checksum_sha256 text,
  created_at timestamptz not null default now()
);

create index if not exists project_files_project_id_idx
  on project_files(project_id);

insert into projects (slug, name, description)
values (
  'black-automotive-led-devil-eye-projector',
  'Black Automotive LED Devil-Eye Projector',
  'Cinematic product page and scroll-driven exploded-view film.'
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();
