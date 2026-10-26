// Supabase Realtime for the app and a public web build (net/transport.js SupabaseTransport). Empty here: this build
// (the artifact's, and `vite build`) has no Supabase and carries no supabase-js. The web build puts net/netcfg.web.js in
// this file's place (vite --mode web: its URL and key from the environment, createClient from supabase-js, stamped).
// The anon key is a public key; the project's own policies hold the rest. createClient: the supabase-js v2 factory (or
// window.supabase.createClient from its UMD script). stamped: true only where the server writes who sent each message
// (supabase/migrations/*_skotos_coop.sql, docs/coop/supabase.md); until then Supabase is never used
export const SUPABASE = { url: '', anonKey: '', createClient: null, stamped: false };
