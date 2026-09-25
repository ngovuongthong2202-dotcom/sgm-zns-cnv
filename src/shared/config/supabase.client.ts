import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/src/shared/lib/logger';

// Retrieve environment variables with multiple fallbacks
const supabaseUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  ''
).trim();

const supabaseAnonKey = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 10
);

if (!isSupabaseConfigured) {
  logger.warn(
    'Supabase URL or Anon Key is missing in .env. Running in Offline Mock / Local Fallback Mode. ' +
    'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to connect to your live Supabase project.'
  );
}

// Create the real client or a safe fallback client to ensure zero crash
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : createClient('https://placeholder-offline.supabase.co', 'placeholder-anon-key-offline', {
      auth: { persistSession: false },
      global: {
        fetch: async () => {
          // Return empty mock response to prevent unhandled network failures
          return new Response(JSON.stringify({ data: [], error: null }), {
            headers: { 'content-type': 'application/json' },
            status: 200
          });
        }
      }
    });

export default supabase;
