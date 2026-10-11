// Planner – Demo-Modus (nur wenn die Adresse ?demo enthält)
// Ersetzt die Supabase-Verbindung durch eine Attrappe mit Beispieldaten im Browser (sessionStorage).
// Es wird nichts an die echte Datenbank gesendet. Wird auch von den automatischen Tests (tests/) genutzt.
// Anmeldung: Lizenz-ID 1, Benutzer „stefan“ (Admin), „uwe“ oder „miraculix“, beliebiges Passwort.
(function () {
  if (!/[?&]demo\b/.test(location.search)) return;
  window.DEMO = true;

  var KEY = 'planner_demo_db', SKEY = 'planner_demo_session';
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var fmt = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var uid = function () { return (crypto.randomUUID ? crypto.randomUUID() : 'd' + Math.random().toString(16).slice(2)); };
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };

  function seed() {
    var now = new Date(), m = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));            // Montag dieser Woche
    var d = function (n) { var x = new Date(m); x.setDate(x.getDate() + n); return fmt(x); };
    var job = function (o) {
      return Object.assign({ id: uid(), org_id: 'demo-org', kunde: '', adresse: '', tel: '', art: 'montage', wer: [], start: null, tage: 1,
        zeit: '', ende: '', fix: true, imp: false, material: true, notiz: '', done: false, created_by: 'u-stefan', series: null }, o);
    };
    return {
      organizations: [{ id: 'demo-org', nr: 1, license_id: 'JK.PLANNER.001', name: 'Demo Tischlerei', max_users: 5, valid_until: null,
        active: true, note: '', allday_start: '08:00', allday_end: '17:00' }],
      employees: [
        { id: 'e-stefan', org_id: 'demo-org', user_id: 'u-stefan', username: 'stefan', display_name: 'Stefan', role: 'admin', color: '#8a5a2b', theme: 'auto' },
        { id: 'e-uwe', org_id: 'demo-org', user_id: 'u-uwe', username: 'uwe', display_name: 'Uwe', role: 'user', color: '#1e7be0', theme: 'auto' },
        { id: 'e-miraculix', org_id: 'demo-org', user_id: 'u-miraculix', username: 'miraculix', display_name: 'Miraculix', role: 'user', color: '#d03a3a', theme: 'auto' },
        { id: 'e-asterix', org_id: 'demo-org', user_id: null, username: null, display_name: 'Asterix', role: 'user', color: '#3d8b4f', theme: 'auto' },
        { id: 'e-obelix', org_id: 'demo-org', user_id: null, username: null, display_name: 'Obelix', role: 'user', color: '#8e5bc0', theme: 'auto' }
      ],
      jobs: [
        job({ kunde: 'Fam. Huber – Küche', art: 'montage', wer: ['e-stefan', 'e-uwe'], start: d(0), zeit: '08:00', ende: '12:00', adresse: 'Bozen, Hauptstraße 12', tel: '0471 123456', imp: true }),
        job({ kunde: 'Aufmaß Gruber', art: 'termin', wer: ['e-stefan'], start: d(0), zeit: '13:00', ende: '14:00', fix: false, adresse: 'Meran, Lauben 5' }),
        job({ kunde: 'Werkstatt Schrank', art: 'werkstatt', wer: ['e-asterix'], start: d(1), tage: 2, material: false }),
        job({ kunde: 'Bad Pichler', art: 'montage', wer: ['e-uwe', 'e-obelix'], start: d(2), zeit: '07:30', ende: '16:00', adresse: 'Brixen, Domplatz 3' }),
        job({ kunde: 'Kundentermin Moser', art: 'termin', wer: ['e-miraculix'], start: d(3), zeit: '16:00', ende: '17:00' }),
        job({ kunde: 'Lieferung Holz', art: 'termin', wer: [], start: d(4), zeit: '10:00', ende: '10:30' }),
        job({ kunde: 'Fenster Lager', art: 'montage', wer: ['e-stefan'], start: null, tage: 2 }),
        job({ kunde: 'Erledigt: Haustür', art: 'montage', wer: ['e-stefan'], start: d(-3), done: true })
      ],
      holidays: [],
      customers: [
        { id: uid(), org_id: 'demo-org', name: 'Fam. Huber', adresse: 'Bozen, Hauptstraße 12', tel: '0471 123456', notiz: 'Hund im Garten – vorher anrufen.', created_by: 'u-stefan' },
        { id: uid(), org_id: 'demo-org', name: 'Gruber', adresse: 'Meran, Lauben 5', tel: '0473 222333', notiz: '', created_by: 'u-stefan' }
      ]
    };
  }
  var DB;
  try { DB = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
  if (!DB) DB = seed();
  var persist = function () { try { sessionStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };
  persist();

  var session = null;
  try { session = JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) {}
  var listeners = [];
  var setSession = function (s, ev) { session = s; try { sessionStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} listeners.forEach(function (f) { f(ev, s); }); };
  var ok = function (data) { return Promise.resolve({ data: clone(data === undefined ? null : data), error: null }); };
  var err = function (msg) { return Promise.resolve({ data: null, error: { message: msg } }); };

  // Abfrage-Baustein wie bei supabase-js: select/insert/upsert/update/delete + eq/in/gte/order/single/maybeSingle
  function Q(table) { this.t = table; this.act = 'select'; this.f = []; this.one = 0; this.ord = null; }
  Q.prototype.select = function () { return this; };
  Q.prototype.insert = function (rows) { this.act = 'insert'; this.p = rows; return this; };
  Q.prototype.upsert = function (rows) { this.act = 'upsert'; this.p = rows; return this; };
  Q.prototype.update = function (ch) { this.act = 'update'; this.p = ch; return this; };
  Q.prototype.delete = function () { this.act = 'delete'; return this; };
  Q.prototype.eq = function (c, v) { this.f.push(function (r) { return r[c] == v; }); return this; };
  Q.prototype.in = function (c, vs) { this.f.push(function (r) { return vs.indexOf(r[c]) > -1; }); return this; };
  Q.prototype.gte = function (c, v) { this.f.push(function (r) { return r[c] >= v; }); return this; };
  Q.prototype.order = function (c) { this.ord = c; return this; };
  Q.prototype.single = function () { this.one = 1; return this; };
  Q.prototype.maybeSingle = function () { this.one = 2; return this; };
  Q.prototype.then = function (res, rej) { return this.run().then(res, rej); };
  Q.prototype.run = function () {
    var t = DB[this.t]; if (!t) return err('Tabelle „' + this.t + '“ gibt es im Demo-Modus nicht.');
    var me = this, match = function (r) { return me.f.every(function (f) { return f(r); }); };
    var key = this.t === 'holidays' ? 'd' : 'id';
    if (this.act === 'select') {
      var rows = t.filter(match);
      if (this.ord) rows.sort(function (a, b) { return String(a[me.ord]).localeCompare(String(b[me.ord]), 'de'); });
      if (this.one) return rows.length || this.one === 2 ? ok(rows[0] || null) : err('Kein Datensatz.');
      return ok(rows);
    }
    if (this.act === 'insert' || this.act === 'upsert') {
      [].concat(this.p).forEach(function (row) {
        var i = t.findIndex(function (r) { return r[key] === row[key]; });
        var base = { org_id: 'demo-org', created_by: session && session.user.id };
        if (i > -1) t[i] = Object.assign(t[i], row); else t.push(Object.assign(base, row));
      });
    }
    if (this.act === 'update') t.forEach(function (r) { if (match(r)) Object.assign(r, me.p); });
    if (this.act === 'delete') DB[this.t] = t.filter(function (r) { return !match(r); });
    persist(); return ok(null);
  };

  var empByUser = function (id) { return DB.employees.filter(function (e) { return e.user_id === id; })[0]; };
  var client = {
    auth: {
      onAuthStateChange: function (f) { listeners.push(f); return { data: { subscription: { unsubscribe: function () {} } } }; },
      getSession: function () { return ok({ session: session }); },
      getUser: function () { return ok({ user: session && session.user }); },
      signInWithPassword: function (a) {
        var u = String(a.email || '').split('@')[0], e = DB.employees.filter(function (x) { return x.username === u && x.user_id; })[0];
        if (!e || !a.password) return err('Invalid login credentials');
        setSession({ user: { id: e.user_id, email: a.email } }, 'SIGNED_IN'); return ok({ session: session });
      },
      signOut: function () { setSession(null, 'SIGNED_OUT'); return ok(null); },
      updateUser: function () { return ok(null); }
    },
    from: function (t) { return new Q(t); },
    rpc: function (name, a) {
      var me = session && empByUser(session.user.id);
      if (name === 'is_owner') return ok(false);
      if (name === 'set_my_theme') { if (me) me.theme = a.p_theme; persist(); return ok(null); }
      if (name === 'admin_set_allday') { if (!me || me.role !== 'admin') return err('Nur der Admin darf das.'); DB.organizations[0].allday_start = a.p_start; DB.organizations[0].allday_end = a.p_end; persist(); return ok(null); }
      if (name === 'admin_add_employee') { var id = uid(); DB.employees.push({ id: id, org_id: 'demo-org', user_id: null, username: null, display_name: a.p_display_name, role: 'user', color: a.p_color || '#2f6fa8', theme: 'auto' }); persist(); return ok(id); }
      return err('Im Demo-Modus nicht verfügbar.');
    },
    channel: function () { var c = { on: function () { return c; }, subscribe: function () { return c; } }; return c; },
    removeChannel: function () {}
  };
  window.supabase = { createClient: function () { return client; } };
  window.PLANER_CONFIG = Object.assign({}, window.PLANER_CONFIG, { url: 'https://demo.invalid', anonKey: 'demo' });
  // Demo zurücksetzen: Adresse mit ?demo=neu öffnen
  if (/[?&]demo=neu\b/.test(location.search)) { DB = seed(); persist(); setSession(null, 'SIGNED_OUT'); }
})();
