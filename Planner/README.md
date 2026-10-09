# Auftragsplaner

Tischler-Auftragsplaner als einzelne Web-Seite (`index.html`), Daten in **Supabase**, Hosting auf **Vercel**.
Kein Build-Schritt: Vercel liefert die Dateien direkt aus.

## Anmeldung & Benutzer

- **Admin**: meldet sich mit **E-Mail + Passwort** an.
- **Weitere Benutzer**: legt der Admin in der App unter *Mehr → Benutzer* an. Diese melden sich nur mit
  **Benutzername + Passwort** an (keine E-Mail nötig; intern wird `benutzername@planer.local` verwendet).
- Der Admin kann Namen und Farben ändern, Passwörter neu setzen und Benutzer löschen.
  Jeder Benutzer kann sein eigenes Passwort ändern.
- Beim Öffnen zeigt der Plan immer **nur die eigenen Termine**. Oben lässt sich auf *Alle* oder
  eine andere Person umschalten.
- Aufträge können mehreren Personen zugeteilt werden („Wer“, Mehrfachauswahl).

## Einrichtung

### 1. Supabase
1. Projekt anlegen auf <https://supabase.com>.
2. **SQL Editor** → Inhalt von `supabase/migrations/20261009000000_init.sql` einfügen → *Run*.
3. **Authentication → Sign In / Providers → Email**:
   - *Allow new users to sign up* **ausschalten** (Benutzer entstehen nur über den Admin).
4. **Authentication → Users → Add user → Create new user**: deine E-Mail + Passwort,
   *Auto Confirm User* anhaken. Das ist der Admin.
5. **Project Settings → API**: *Project URL* und *anon / publishable key* kopieren.

### 2. config.js
URL und anon Key in `config.js` eintragen und committen. Der anon Key ist öffentlich gedacht;
geschützt wird über RLS. **Nie den `service_role` Key verwenden.**

### 3. Vercel
1. <https://vercel.com/new> → GitHub-Repository importieren.
2. Framework Preset: **Other**, Build Command leer, Output Directory leer (Root).
3. *Deploy*. Jeder Push auf `main` geht automatisch live.

### 4. Erster Login
Seite öffnen, mit der Admin-E-Mail anmelden. Beim ersten Login wird dieses Konto automatisch Admin.
Dann unter *Mehr → Benutzer* die Mitarbeiter anlegen.

## Alte Handy-Daten übernehmen
In der alten Version auf dem Handy: *Mehr → Backup kopieren*. In der neuen Version als Admin:
Benutzer mit **denselben Namen** anlegen (z. B. Uwe, Stefan, Asterix, Obelix), dann *Mehr → Backup*
einfügen → *Einfügen & übernehmen*. „Beide“ und Aushilfen werden den passenden Benutzern zugeordnet.

## Lokal testen
Einen beliebigen statischen Server im Ordner starten, z. B. `npx serve .`, und die angezeigte Adresse öffnen.
