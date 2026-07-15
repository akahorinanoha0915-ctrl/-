-- 英語日記アプリ スキーマ（改修版）
-- 既存テーブルがある場合は pin_hash / grammar_note の追加だけでも可:
--   alter table students add column if not exists pin_hash text;
--   alter table diary_entries add column if not exists grammar_note text;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_code text not null,
  student_number int not null,
  pin_hash text,
  created_at timestamptz not null default now(),
  unique (class_code, student_number)
);

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  content text not null,
  word_count int not null default 0,
  ai_comment text,
  grammar_note text,
  created_at timestamptz not null default now()
);

create table if not exists vocabulary (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  word text not null,
  meaning_ja text,
  example text,
  created_at timestamptz not null default now()
);

create index if not exists idx_entries_student on diary_entries(student_id, created_at);
create index if not exists idx_vocab_student on vocabulary(student_id);

-- ★重要★ RLSを有効化し、ポリシーを一切作らない。
-- これにより anon キーではどのテーブルも読み書きできなくなる。
-- アプリは service_role キー（サーバー側のみ）でアクセスする。
alter table students enable row level security;
alter table diary_entries enable row level security;
alter table vocabulary enable row level security;
