// Supabase-Zugang (Supabase → Project Settings → API).
// Nur die Project URL und den anon/publishable Key eintragen – niemals den service_role Key.
// Der anon Key ist öffentlich; die Daten schützt die Zeilenrechte-Prüfung (RLS) in der Datenbank.
window.PLANER_CONFIG = {
  url: '',      // z. B. 'https://abcdefgh.supabase.co'
  anonKey: ''   // z. B. 'eyJhbGciOi...' oder 'sb_publishable_...'
};
