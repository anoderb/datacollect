export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const ACCESS_PASSWORD = import.meta.env.VITE_ACCESS_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("your-supabase-project") || SUPABASE_ANON_KEY.includes("your-supabase-anon")) {
  console.warn(
    "Supabase credentials are using placeholder values. Please update your .env file with actual credentials."
  );
}

