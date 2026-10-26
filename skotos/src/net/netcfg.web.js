// The web build's Supabase (vite --mode web, npm run build:web: vite.config.js puts this file in netcfg.js's place, so
// no other build carries supabase-js). The project's URL and its public key come from the build's environment
// (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: a .env.web.local file, or the shell). stamped: the project runs
// supabase/migrations/*_skotos_coop.sql, whose skotos.send writes who sent each message (docs/coop/supabase.md). With no
// URL or key the build is the single-player game
import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;
export const SUPABASE = { url: env.VITE_SUPABASE_URL || '', anonKey: env.VITE_SUPABASE_ANON_KEY || '', createClient, stamped: true };
