-- 利用企業テーブル
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 利用ログテーブル（抽出1回につき1行）
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  file_count int not null default 1,
  created_at timestamptz not null default now()
);
