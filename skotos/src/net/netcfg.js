// Supabase Realtime for the app and a public web build (net/transport.js SupabaseTransport). Empty: not used. The anon key
// is a public key (Realtime broadcast and presence only); the project's own policies hold the rest. createClient: the
// supabase-js v2 factory the build bundles (or window.supabase.createClient from its UMD script). stamped: true only once
// the server writes who sent each message (docs/coop/release.md step 5); until then Supabase is never used
export const SUPABASE = { url: '', anonKey: '', createClient: null, stamped: false };
