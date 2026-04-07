import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.MANA_SUPABASE_CONFIG;

if (!config || !config.url || !config.anonKey || config.url === "PASTE_SUPABASE_URL_HERE") {
  throw new Error("Supabase config saknas. Fyll i js/supabase-config.js med URL och publishable key.");
}

export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
