import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client (service role)
export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export type Course = {
  id: string
  title: string
  course_code: string
  level: '100' | '200' | '300' | '400' | '500'
  semester: '1st' | '2nd'
  description: string | null
  file_path: string
  file_size: number
  file_size_label: string
  download_count: number
  created_at: string
  updated_at: string
}
