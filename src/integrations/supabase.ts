import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with configurations
const supabaseUrl = 'https://your-project-ref.supabase.co'; // replace with your actual supabase URL
const supabaseKey = 'your-public-anon-key'; // replace with your actual public anon key

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;