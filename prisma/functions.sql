-- Add this function to Supabase for atomic download count increment
-- Run in SQL editor

CREATE OR REPLACE FUNCTION increment_download_count(course_id UUID)
RETURNS void AS $$
  UPDATE courses SET download_count = download_count + 1 WHERE id = course_id;
$$ LANGUAGE sql SECURITY DEFINER;
