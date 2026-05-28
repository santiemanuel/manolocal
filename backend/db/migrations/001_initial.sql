PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client', 'provider', 'admin')),
  avatar_url TEXT,
  city TEXT,
  rating REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_price INTEGER,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bio TEXT,
  service_categories TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  verified_jobs_count INTEGER DEFAULT 0,
  rating_average REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN (
    'requested',
    'accepted',
    'in_progress',
    'evidence_uploaded',
    'ai_reviewed',
    'completed'
  )),
  address_area TEXT,
  scheduled_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  arkiv_entity_key_created TEXT,
  arkiv_tx_hash_created TEXT
);

CREATE TABLE IF NOT EXISTS job_evidence (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('before', 'progress', 'after', 'receipt', 'issue')),
  local_file_path TEXT NOT NULL,
  public_file_url TEXT,
  description TEXT,
  sha256_hash TEXT NOT NULL,
  ai_summary TEXT,
  ai_status TEXT DEFAULT 'pending' CHECK(ai_status IN ('pending', 'valid', 'warning', 'rejected')),
  arkiv_entity_key TEXT,
  arkiv_tx_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  client_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  arkiv_entity_key TEXT,
  arkiv_tx_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arkiv_events (
  id TEXT PRIMARY KEY,
  local_subject_type TEXT NOT NULL,
  local_subject_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attributes_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_user_id ON provider_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_provider_id ON jobs(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_service_id ON jobs(service_id);
CREATE INDEX IF NOT EXISTS idx_job_evidence_job_id ON job_evidence(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_arkiv_events_subject ON arkiv_events(local_subject_type, local_subject_id);
CREATE INDEX IF NOT EXISTS idx_arkiv_events_event_type ON arkiv_events(event_type);
