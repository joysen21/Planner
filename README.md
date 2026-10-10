# Auftragsplaner

Tischler-Auftragsplaner als einzelne Web-Seite (`index.html`), Daten in **Supabase**, Hosting auf **Vercel**.
Kein Build-Schritt: Vercel liefert die Dateien direkt aus.

## Firmen, Lizenzen & Anmeldung

- **Besitzer der Seite** (Anbieter, JoKe): meldet sich mit **E-Mail + Passwort** an (Lizenz-ID leer lassen)
  und sieht statt des Plans die **Firmenverwaltung**:
  - *＋ Neue Firma*: Firmenname, Anzahl Anmeldungen, gültig bis, Notiz und den **Admin der Firma**
    (Name, Benutzername, Passwort – ein sicheres Passwort wird vorgeschlagen).
    Die **Lizenz-ID** wird automatisch fortlaufend vergeben: `JK.PLANNER.001`, `JK.PLANNER.002`, …
    Danach werden die Zugangsdaten zum Kopieren und Weitergeben angezeigt.
  - *Bearbeiten*: Name, Anzahl Anmeldungen, Laufzeit, Notiz, Lizenz **aktiv/gesperrt**.
  - *Admin-Passwort*: setzt das Passwort des Firmen-Admins neu.
  - *Löschen*: Firma mit allen Daten (zur Sicherheit muss die Lizenz-ID eingegeben werden).
- **Firmen-Admin und Mitarbeiter** melden sich mit **Lizenz-ID + Benutzername + Passwort** an.
  Die Lizenz-ID kann auch kurz eingegeben werden (`001` oder `1`); das Gerät merkt sie sich.
  Intern wird daraus `benutzername@001.planer.local` – eine E-Mail ist nicht nötig.
- **Mitarbeiter** legt der Firmen-Admin unter *Mehr → Mitarbeiter* an – mit oder ohne Anmeldung:
  - **mit Anmeldung**: zählen zur Lizenz.
  - **ohne Anmeldung** („Dummy“): werden nur verplant, unbegrenzt, zählen nicht zur Lizenz.
    Später kann ihnen per *＋ Anmeldung* ein Login gegeben werden – alle Termine bleiben erhalten.
  - *Anmeldung entfernen* macht einen Mitarbeiter wieder zum Dummy und gibt den Lizenzplatz frei.
- **Lizenz**: Anzahl Mitarbeiter **mit Anmeldung** (inkl. Admin) ist begrenzt. Nach Ablauf ist der Plan
  nur noch lesbar; eine gesperrte Firma kann sich gar nicht mehr anmelden (Daten bleiben erhalten).
- **Passwörter**: Firmen-Admins mindestens 10, Mitarbeiter mindestens 8 Zeichen. Passwort vergessen:
  Mitarbeiter → Firmen-Admin setzt es neu; Firmen-Admin → Besitzer setzt es neu.
- Beim Öffnen zeigt der Plan immer **nur die eigenen Termine**. Oben lässt sich auf *Alle* oder
  eine andere Person umschalten. Aufträge können mehreren Personen zugeteilt werden.

## Einrichtung

### 1. Supabase
1. Projekt anlegen auf <https://supabase.com>.
2. **SQL Editor** → die Dateien aus `supabase/migrations/` der Reihe nach einfügen und *Run*
   (`20261009000000_init.sql`, dann `20261010000000_firmen_lizenzen_mitarbeiter.sql`).
3. **Authentication → Sign In / Providers → Email**:
   - *Allow new users to sign up* **ausschalten** (Konten entstehen nur über die App).
   - *Minimum password length* auf **8** setzen.
4. **Besitzer-Konto**: **Authentication → Users → Add user → Create new user** mit deiner E-Mail und einem
   starken Passwort, *Auto Confirm User* anhaken. Dann im SQL Editor:
   ```sql
   insert into public.owners (user_id) select id from auth.users where email = 'deine@email.de';
   ```
5. **Project Settings → API**: *Project URL* und *anon / publishable key* kopieren.

### 2. config.js
URL und anon Key in `config.js` eintragen und committen. Der anon Key ist öffentlich gedacht;
geschützt wird über RLS. **Nie den `service_role` Key verwenden.**

### 3. Vercel
1. <https://vercel.com/new> → GitHub-Repository importieren.
2. Framework Preset: **Other**, Build Command leer, Output Directory leer (Root).
3. *Deploy*. Jeder Push auf `main` geht automatisch live.

### 4. Erste Firma
Seite öffnen, mit der Besitzer-E-Mail anmelden (Lizenz-ID leer lassen) → *＋ Neue Firma*.
Die angezeigten Zugangsdaten an den Firmen-Admin weitergeben; dieser legt dann unter
*Mehr → Mitarbeiter* seine Mitarbeiter an.

## Alte Handy-Daten übernehmen
In der alten Version auf dem Handy: *Mehr → Backup kopieren*. In der neuen Version als Firmen-Admin:
Mitarbeiter mit **denselben Namen** anlegen (z. B. Uwe, Stefan, Asterix, Obelix), dann *Mehr → Backup*
einfügen → *Einfügen & übernehmen*. „Beide“ und Aushilfen werden den passenden Mitarbeitern zugeordnet.

## Lokal testen
Einen beliebigen statischen Server im Ordner starten, z. B. `npx serve .`, und die angezeigte Adresse öffnen.
