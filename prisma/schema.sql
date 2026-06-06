-- CourseNotes Database Schema
-- Run this in your Supabase SQL editor

-- ─── COURSES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,
  course_code     TEXT NOT NULL,
  level           TEXT NOT NULL CHECK (level IN ('100','200','300','400','500')),
  semester        TEXT NOT NULL CHECK (semester IN ('1st','2nd')),
  description     TEXT,
  file_path       TEXT NOT NULL,
  file_size       BIGINT NOT NULL DEFAULT 0,
  file_size_label TEXT,
  download_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOWNLOAD TOKENS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS download_tokens (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash   TEXT NOT NULL UNIQUE,
  file_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_id   TEXT NOT NULL,
  issued_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  redeemed     BOOLEAN DEFAULT FALSE,
  redeemed_at  TIMESTAMPTZ
);

-- ─── AD SESSIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token    TEXT NOT NULL UNIQUE,
  session_id       TEXT NOT NULL,
  file_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  partner_id       TEXT NOT NULL,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  elapsed_seconds  INTEGER NOT NULL DEFAULT 0,
  completed        BOOLEAN DEFAULT FALSE,
  completed_at     TIMESTAMPTZ
);

-- ─── VERIFIED DOWNLOADS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verified_downloads (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   TEXT NOT NULL,
  file_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_download_tokens_hash ON download_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_download_tokens_session ON download_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_token ON ad_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_session ON ad_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_verified_downloads_session ON verified_downloads(session_id);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_downloads ENABLE ROW LEVEL SECURITY;

-- Courses: public read, service role write
CREATE POLICY "Public read courses"
  ON courses FOR SELECT USING (true);

CREATE POLICY "Service role all on courses"
  ON courses FOR ALL USING (auth.role() = 'service_role');

-- Token tables: service role only
CREATE POLICY "Service role all on download_tokens"
  ON download_tokens FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role all on ad_sessions"
  ON ad_sessions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role all on verified_downloads"
  ON verified_downloads FOR ALL USING (auth.role() = 'service_role');

-- ─── STORAGE BUCKET ───────────────────────────────────────────────
-- Run this after creating a private bucket named "course-pdfs" in the Supabase dashboard
-- INSERT INTO storage.buckets (id, name, public) VALUES ('course-pdfs', 'course-pdfs', false);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
