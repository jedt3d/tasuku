import { createClient } from '@supabase/supabase-js';

// Publishable key only. vite.config.js supplies both values, and refuses to build without them.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
