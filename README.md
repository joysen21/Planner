# Planner

Auftrags- und Einsatzplaner (JoKe Smart Solutions) als Web-App ohne Build-Schritt, Daten in **Supabase**, Hosting auf **Vercel**.
Kein Build-Schritt: Vercel liefert die Dateien direkt aus.

## Firmen, Lizenzen & Anmeldung

- **Besitzer der Seite** (Anbieter, JoKe): meldet sich mit **E-Mail + Passwort** an (Lizenz-ID leer lassen)
  und sieht statt des Plans die **Firmenverwaltung**:
  - *＋ Neue Firma*: Firmenname, Anzahl Anmeldungen, gültig bis, Notiz und den **Admin der Firma**
    (Name, Benutzername, Passwort – ein sicheres Passwort wird vorgeschlagen).
    Die **Lizenz-ID** wird automatisch fortlaufend vergeben: `JK.PLANNER.001`, `JK.PLANNER.002`, …
    Danach werden die Zugangsdaten zum Kopieren und Weitergeben angezeigt.
  - *Bearbeiten*: Name, Anzahl Anmeldungen, Laufzeit, Notiz, Lizenz **aktiv/gesperrt**.
  - *Benutzer*: Benutzername und Passwort jedes Mitarbeiters mit Anmeldung ändern (auch des Firmen-Admins).
  - *Löschen*: Firma mit allen Daten (zur Sicherheit muss die Lizenz-ID eingegeben werden).
- **Firmen-Admin und Mitarbeiter** melden sich mit **Lizenz-ID + Benutzername + Passwort** an.
  Die Lizenz-ID kann auch kurz eingegeben werden (`001` oder `1`); das Gerät merkt sie sich.
  Intern wird daraus `benutzername@001.planer.local` – eine E-Mail ist nicht nötig.
- **Mitarbeiter** legt der Firmen-Admin unter *Einstellungen → Mitarbeiter* an – mit oder ohne Anmeldung:
  - **mit Anmeldung**: zählen zur Lizenz.
  - **ohne Anmeldung** („Dummy“): werden nur verplant, unbegrenzt, zählen nicht zur Lizenz.
    Später kann ihnen per *＋ Anmeldung* ein Login gegeben werden – alle Termine bleiben erhalten.
  - *Anmeldung entfernen* macht einen Mitarbeiter wieder zum Dummy und gibt den Lizenzplatz frei.
  - *Benutzername* ändert den Benutzernamen eines Mitarbeiters (Passwort bleibt).
- **Lizenz**: Anzahl Mitarbeiter **mit Anmeldung** (inkl. Admin) ist begrenzt. Nach Ablauf ist der Plan
  nur noch lesbar; eine gesperrte Firma kann sich gar nicht mehr anmelden (Daten bleiben erhalten).
- **Passwörter**: Firmen-Admins mindestens 10, Mitarbeiter mindestens 8 Zeichen. Passwort vergessen:
  Mitarbeiter → Firmen-Admin setzt es neu; Firmen-Admin → Besitzer setzt es neu.
- Beim Öffnen zeigt der Plan immer **nur die eigenen Termine**. Oben lässt sich auf *Alle* oder
  eine andere Person umschalten. Aufträge können mehreren Personen zugeteilt werden.
- **Löschen** dürfen nur der Firmen-Admin und wer den Auftrag angelegt hat; „Erledigte löschen“ nur der Admin.
- **Ganztägige Termine** erscheinen im Kalender als Block im Zeitraum der Firma (Standard 08:00–17:00), den der Admin unter *Einstellungen → Ganztägige Termine* festlegt.
- **Kalender**: Woche wahlweise **Mo–Fr** oder **Mo–So** (Umschalter über dem Kalender, pro Gerät gemerkt); Samstag/Sonntag sind leicht grau.
- **Suchen** (über dem Kalender und in „Offen“): Kunde, Adresse, Telefon, Notiz, Art, Mitarbeiter – kommende, offene und vergangene Aufträge.
- **Kunden** als eigener Reiter: Liste mit Suche; im Detail Name, Adresse, Telefon, **Notizen**, Anrufen/Route und alle **Termine des Kunden** (geplant, ohne Termin, vergangen) sowie „Neuer Termin für diesen Kunden“.
  Im Termin-Dialog schlägt „Kunde / Titel“ passende Kunden vor und füllt Adresse/Telefon; der Termin wird dann fest mit dem Kunden verknüpft.
  Ältere Termine ohne Verknüpfung werden über den Namen zugeordnet („Fam. Huber – Küche“ gehört zu „Fam. Huber“).
- **Wiederkehrende Termine**: beim Anlegen „Wiederholen“ (wöchentlich, alle 2 Wochen, monatlich) bis zu einem Datum; beim Löschen wahlweise auch alle folgenden Termine der Serie.
- **Drucken / PDF**: Knopf „Drucken“ über dem Kalender – druckt die aktuelle Ansicht im Querformat (oder „Als PDF speichern“).
- **Lizenz-Erinnerung**: der Firmen-Admin sieht 30 Tage vor Ablauf einen Hinweis; auf der Besitzer-Seite sind bald ablaufende Firmen markiert.
- **Darstellung** (Automatisch / Hell / Dunkel) wählt jeder unter *Einstellungen → Mein Konto*; sie wird pro Mitarbeiter gespeichert.
- **Regiebericht** (nur mit ERP-Modul und Recht „Regie“): im Termin *Regiebericht* – Stunden je Mitarbeiter (±½ h, vorbelegt aus der Uhrzeit),
  Material aus dem ERP-Artikelstamm (ohne Preise) oder freier Text, Fotos, Notiz und Kundenunterschrift; *An Büro senden* übergibt ihn der ERP.
  Je Tag ein Bericht; der Termin braucht einen mit der ERP verknüpften Kunden. Gespeichert wird in den ERP-Tabellen `erp_regie*`.

## Einrichtung

### 1. Supabase
1. Projekt anlegen auf <https://supabase.com>.
2. **SQL Editor** → die Dateien aus `supabase/migrations/` der Reihe nach einfügen und *Run*
   (`20261009000000_init.sql`, `20261010000000_firmen_lizenzen_mitarbeiter.sql`,
   `20261011000000_loeschrechte_darstellung.sql`, `20261012000000_besitzer_benutzerverwaltung.sql`,
   `20261013000000_ganztags_zeitraum.sql`, `20261014000000_kunden_serien.sql`,
   dann `20261015000000_kunden_notizen_verknuepfung.sql`).
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
*Einstellungen → Mitarbeiter* seine Mitarbeiter an.

## Als App installieren (PWA)
Die Seite ist als App installierbar (`manifest.webmanifest`, `sw.js`, Icons in `icons/`):
- **Android / Chrome:** *Einstellungen → App installieren* oder im Browser-Menü „App installieren“.
- **iPhone / iPad:** in Safari *Teilen → Zum Home-Bildschirm*.

Die App heißt „Planner“, startet ohne Browserleiste und lädt Updates nach jedem Push automatisch.
Der Service Worker lädt immer zuerst aus dem Netz; nur ohne Netz zeigt er die zuletzt geladene Version.
Icons neu erzeugen: Vorlage `Media/app-icon-vorlage.html` (Variante A: braunes „P“, Karamell-Punkt, „JOKE SMART SOLUTIONS“),
z. B. `chrome --headless=new --default-background-color=00000000 --window-size=512,512 --virtual-time-budget=6000 --screenshot=icons/icon-512.png "file:///…/Media/app-icon-vorlage.html#512,round"` (Modi: `round`, `full` für iPhone, `mask` für Android).

## Alte Handy-Daten übernehmen
In der alten Version auf dem Handy: *Mehr → Backup kopieren*. In der neuen Version als Firmen-Admin:
Mitarbeiter mit **denselben Namen** anlegen (z. B. Uwe, Stefan, Asterix, Obelix), dann *Einstellungen → Backup*
einfügen → *Einfügen & übernehmen*. „Beide“ und Aushilfen werden den passenden Mitarbeitern zugeordnet.

## Aufbau des Codes
| Datei | Inhalt |
|---|---|
| `index.html` | Seitengerüst, lädt CSS und Skripte in dieser Reihenfolge |
| `css/app.css` | gesamte Gestaltung (hell/dunkel, Handy/Breitbild, Druck) |
| `js/demo.js` | Demo-Modus (nur mit `?demo`) – ersetzt Supabase durch Beispieldaten im Browser |
| `js/grundlagen.js` | Zustand, Logo, Icons, Start, Darstellung, Anmeldung |
| `js/besitzer.js` | Besitzer-Seite: Firmen, Lizenzen, Benutzer |
| `js/daten.js` | Laden, Speichern, Live-Aktualisierung, Datums-/Mitarbeiter-Hilfen |
| `js/einstellungen.js` | Seitenaufbau, Einstellungen, Mitarbeiter, Kunden |
| `js/kunden.js` | Reiter Kunden: Liste, Detail mit Notizen und Terminen, Vorschläge im Termin-Dialog |
| `js/kalender.js` | Auftragskarten, Kalenderansichten, Zeitraster, Ziehen & Ablegen, Feiertage, Suche, Drucken |
| `js/termin.js` | Termin-Dialog: anlegen, bearbeiten, wiederholen, aufteilen |
| `js/start.js` | Navigation, App-Start, Service Worker |

Alle Skripte sind klassische Skripte (keine Module) mit globalen Funktionen. Code, der beim Laden sofort läuft,
darf nur Funktionen aus **derselben oder früheren** Dateien aufrufen.

## Lokal testen / Demo
Einen statischen Server im Ordner starten, z. B. `npx serve .`, und die angezeigte Adresse öffnen.
**Demo-Modus** ohne Datenbank: Adresse mit `?demo` öffnen (`?demo=neu` setzt die Beispieldaten zurück).
Anmeldung: Lizenz-ID `1`, Benutzer `stefan` (Admin), `uwe` oder `miraculix`, beliebiges Passwort.

## Automatische Tests
Oberflächentests mit Playwright im Demo-Modus – in **Chrome**, **Safari** (WebKit) und auf dem **iPhone** (WebKit, Touch):
```bash
npm install
npx playwright install webkit chromium
npm test
```
Nur Safari/iPhone: `npm run test:safari`. Die Tests liegen in `tests/`; `.vercelignore` hält die Testumgebung aus dem Deployment heraus.
