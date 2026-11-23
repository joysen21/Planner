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
        active: true, note: '', allday_start: '08:00', allday_end: '17:00', day_hours: 8, modules: ['planner', 'erp'] }],
      employees: [
        { id: 'e-stefan', org_id: 'demo-org', user_id: 'u-stefan', username: 'stefan', display_name: 'Stefan', role: 'admin', color: '#8a5a2b', theme: 'auto', erp_labor_article_id: 'a-std' },
        { id: 'e-uwe', org_id: 'demo-org', user_id: 'u-uwe', username: 'uwe', display_name: 'Uwe', role: 'user', color: '#1e7be0', theme: 'auto', erp_labor_article_id: 'a-std' },
        { id: 'e-miraculix', org_id: 'demo-org', user_id: 'u-miraculix', username: 'miraculix', display_name: 'Miraculix', role: 'user', color: '#d03a3a', theme: 'auto' },
        { id: 'e-asterix', org_id: 'demo-org', user_id: null, username: null, display_name: 'Asterix', role: 'user', color: '#3d8b4f', theme: 'auto' },
        { id: 'e-obelix', org_id: 'demo-org', user_id: null, username: null, display_name: 'Obelix', role: 'user', color: '#8e5bc0', theme: 'auto' }
      ],
      jobs: [
        job({ kunde: 'Fam. Huber – Küche', art: 'montage', wer: ['e-stefan', 'e-uwe'], start: d(0), zeit: '08:00', ende: '12:00', adresse: 'Bozen, Hauptstraße 12', tel: '0471 123456', imp: true,
          erp_customer_id: 'k-huber', erp_order_id: 'au-huber', notiz: 'AU-2026-0001 · Küche montieren\n- 1 Stk Küchenzeile Eiche' }),
        job({ kunde: 'Aufmaß Gruber', art: 'termin', wer: ['e-stefan'], start: d(0), zeit: '13:00', ende: '14:00', fix: false, adresse: 'Meran, Lauben 5' }),
        job({ kunde: 'Werkstatt Schrank', art: 'werkstatt', wer: ['e-asterix'], start: d(1), tage: 2, material: false }),
        job({ kunde: 'Bad Pichler', art: 'montage', wer: ['e-uwe', 'e-obelix'], start: d(2), zeit: '07:30', ende: '16:00', adresse: 'Brixen, Domplatz 3' }),
        job({ kunde: 'Kundentermin Moser', art: 'termin', wer: ['e-miraculix'], start: d(3), zeit: '16:00', ende: '17:00' }),
        job({ kunde: 'Lieferung Holz', art: 'termin', wer: [], start: d(4), zeit: '10:00', ende: '10:30' }),
        job({ kunde: 'Fenster Lager', art: 'montage', wer: ['e-stefan'], start: null, tage: 2 }),
        job({ kunde: 'Erledigt: Haustür', art: 'montage', wer: ['e-stefan'], start: d(-3), done: true })
      ],
      holidays: [],
      // ERP-Teil (Regieberichte): Rechte, Artikel ohne Preise, Berichte
      erp_articles: [
        { id: 'a-std', number: 'A-00006', kind: 'leistung', name_de: 'Arbeitsstunde Monteur', unit: 'h', plan_color: '', active: true },
        { id: 'a-mon', number: 'A-00007', kind: 'leistung', name_de: 'Montage vor Ort', unit: 'h', plan_color: '#378add', active: true },
        { id: 'a-sil', number: 'A-00008', kind: 'material', name_de: 'Silikon transparent', unit: 'Stk' },
        { id: 'a-schr', number: 'A-00011', kind: 'material', name_de: 'Montageschrauben 5×60', unit: 'Pkg' }
      ],
      erp_regie: [], erp_regie_hours: [], erp_regie_material: [], erp_regie_photos: [], files: {},
      // Zeiten (ERP): bestätigte Aufträge zur Auswahl, gebuchte Zeiten
      erp_orders: [{ id: 'au-huber', number: 'AU-2026-0001', customer_id: 'k-huber', customer_name: 'Fam. Huber', title: 'Küche montieren' }],
      erp_time_entries: [],
      customers: [
        { id: uid(), org_id: 'demo-org', name: 'Fam. Huber', adresse: 'Bozen, Hauptstraße 12', tel: '0471 123456', notiz: 'Hund im Garten – vorher anrufen.', created_by: 'u-stefan', erp_customer_id: 'k-huber', archived: false },
        { id: uid(), org_id: 'demo-org', name: 'Gruber', adresse: 'Meran, Lauben 5', tel: '0473 222333', notiz: '', created_by: 'u-stefan', erp_customer_id: null, archived: false }
      ]
    };
  }
  var DB;
  try { DB = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
  if (!DB) DB = seed();
  DB.erp_time_entries = DB.erp_time_entries || []; DB.erp_orders = DB.erp_orders || [];
  // ToDos wie in der ERP (erp_todos); Ersteller ist der erste Mitarbeiter
  function demoTodos() { if (DB.erp_todos) return; var e0 = DB.employees[0] && DB.employees[0].id, ago = function (h) { return new Date(Date.now() - h * 36e5).toISOString(); };
    DB.erp_todos = [['Silikonfuge Bad Huber erneuern', 'Kunde hat angerufen, Fuge an der Dusche löst sich.', 50], ['Angebot Gamper nachfassen', '', 26], ['Leiter von der Baustelle Adler zurückholen', '', 3]]
      .map(function (x, i) { return { id: 'td-' + (i + 1), org_id: 'demo-org', title: x[0], body: x[1], created_by: e0, created_at: ago(x[2]), done_at: null, done_by: null, job_id: null, job_linked: false }; }); }
  demoTodos();
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
        if (key === 'id' && !row.id) row = Object.assign({ id: uid() }, row);
        var i = t.findIndex(function (r) { return r[key] === row[key]; });
        var base = { org_id: 'demo-org', created_by: session && session.user.id };
        if (me.t === 'erp_regie') Object.assign(base, { status: 'entwurf', number: '' });   // Vorgaben der Tabelle
        if (me.t === 'erp_todos') { var te = session && empByUser(session.user.id); Object.assign(base, { created_by: te && te.id, created_at: new Date().toISOString(), done_at: null, done_by: null, job_id: null, job_linked: false, body: '' }); }
        if (me.t === 'erp_time_entries') {
          var o = row.order_id && DB.erp_orders.filter(function (x) { return x.id === row.order_id; })[0];
          Object.assign(base, { regie_id: null, invoice_id: null, created_at: new Date().toISOString(), customer_id: o ? o.customer_id : row.customer_id });
          if (o) row = Object.assign({}, row, { customer_id: o.customer_id });
        }
        if (i > -1) t[i] = Object.assign(t[i], row); else t.push(Object.assign(base, row));
      });
    }
    if (this.t === 'erp_time_entries' && (this.act === 'update' || this.act === 'delete') && t.some(function (r) { return match(r) && (r.regie_id || r.invoice_id); }))
      return err('Diese Zeit steht in einem Regiebericht und wird dort abgerechnet.');
    // erp_todos: wer und wann setzt die Datenbank; löschen nur eigene offene (wie Trigger und RLS)
    if (this.t === 'erp_todos' && this.act === 'update' && 'done_at' in this.p) { var de = session && empByUser(session.user.id);
      t.forEach(function (r) { if (!match(r)) return; if (me.p.done_at && !r.done_at) { r.done_at = new Date().toISOString(); r.done_by = de && de.id; } else if (!me.p.done_at) { r.done_at = null; r.done_by = null; r.job_id = null; r.job_linked = false; } });
      this.p = Object.assign({}, this.p); delete this.p.done_at; }
    if (this.t === 'erp_todos' && this.act === 'delete') { var me2 = session && empByUser(session.user.id); if (t.some(function (r) { return match(r) && (r.done_at || r.created_by !== (me2 && me2.id)); })) { persist(); return ok(null); } }
    if (this.act === 'update') t.forEach(function (r) { if (match(r)) Object.assign(r, me.p); });
    if (this.act === 'delete') DB[this.t] = t.filter(function (r) { return !match(r); });
    persist(); return ok(null);
  };

  var inDays = function (n) { var x = new Date(); x.setDate(x.getDate() + n); return x.toISOString(); };
  var DEMO_INVITES = {
    'demo-einladung-offen-0001': { state: 'open', adminName: 'Stefan Brenner', expiresAt: inDays(7) },
    'demo-einladung-alt-0001': { state: 'expired', adminName: 'Anna', expiresAt: inDays(-1) }
  };
  var empByUser = function (id) { return DB.employees.filter(function (e) { return e.user_id === id; })[0]; };
  var client = {
    auth: {
      onAuthStateChange: function (f) { listeners.push(f); return { data: { subscription: { unsubscribe: function () {} } } }; },
      getSession: function () { return ok({ session: session }); },
      getUser: function () { return ok({ user: session && session.user }); },
      signInWithPassword: function (a) {
        if (a.email === 'besitzer@demo.local' && a.password) { setSession({ user: { id: 'demo-owner', email: a.email } }, 'SIGNED_IN'); return ok({ session: session }); }
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
      if (name === 'is_owner') return ok(!!(session && session.user.id === 'demo-owner'));
      if (name === 'usage_log') { (DB.usage_events = DB.usage_events || []).push({ app: a.p_app, flow: a.p_flow, outcome: a.p_outcome, clicks: a.p_clicks, seconds: a.p_seconds, device: a.p_device, entry: a.p_entry }); persist(); return ok(null); }
      if (name === 'erp_time_planner') {
        var cname = function (id) { var c = DB.customers.filter(function (x) { return x.erp_customer_id === id; })[0]; return c ? c.name : ''; };
        return ok(DB.erp_time_entries.filter(function (x) {
          return (!a.p_from || x.work_date >= a.p_from) && (!a.p_to || x.work_date <= a.p_to) && (a.p_job ? x.job_id === a.p_job : me && x.employee_id === me.id);
        }).map(function (x) {
          var o = DB.erp_orders.filter(function (y) { return y.id === x.order_id; })[0], r = DB.erp_regie.filter(function (y) { return y.id === x.regie_id; })[0];
          return Object.assign({}, x, { order_number: o ? o.number : null, customer_name: cname(x.customer_id), invoice_number: null, regie_number: r ? r.number : null });
        }).sort(function (p, q) { return p.work_date < q.work_date ? 1 : p.work_date > q.work_date ? -1 : 0; }));
      }
      if (name === 'erp_time_orders') { var s = String(a.p_search || '').toLowerCase(); return ok(DB.erp_orders.filter(function (x) { return (x.number + ' ' + x.customer_name + ' ' + x.title).toLowerCase().indexOf(s) > -1; })); }
      if (name === 'erp_time_customers') { var s2 = String(a.p_search || '').toLowerCase(); return ok(DB.customers.filter(function (x) { return x.erp_customer_id && x.name.toLowerCase().indexOf(s2) > -1; }).map(function (x, i) { return { id: x.erp_customer_id, number: 'K-0000' + (i + 1), name: x.name }; })); }
      if (name === 'erp_regie_take_times') {
        var ids = a.p_entries || [];
        DB.erp_time_entries.forEach(function (x) { if (x.regie_id === a.p_regie && ids.indexOf(x.id) < 0) x.regie_id = null; if (ids.indexOf(x.id) > -1 && !x.regie_id) x.regie_id = a.p_regie; });
        persist(); return ok(ids.length);
      }
      if (name === 'owner_companies') return ok(DB.organizations.map(function (o) {
        var es = DB.employees.filter(function (e) { return e.org_id === o.id; }), adm = es.filter(function (e) { return e.role === 'admin' && e.user_id; })[0];
        return Object.assign({ note: '', created_at: '' }, o, { logins: es.filter(function (e) { return e.user_id; }).length, employees: es.length, admin_username: adm ? adm.username : null });
      }));
      // Einladungslink (Lizenzzentrale): Demo-Links #einladung=demo-einladung-offen-0001 (gültig) und …-alt-0001 (abgelaufen)
      if (name === 'invite_info') {
        var iv = DEMO_INVITES[a.p_token], o0 = DB.organizations[0];
        if (!iv) return ok({ state: 'invalid' });
        return ok({ state: (DB.usedInvites || []).indexOf(a.p_token) > -1 ? 'used' : iv.state, company: o0.name, licenseId: o0.license_id, adminName: iv.adminName, expiresAt: iv.expiresAt });
      }
      if (name === 'invite_accept') {
        var inv = DEMO_INVITES[a.p_token], org = DB.organizations[0], un = String(a.p_username || '').trim().toLowerCase();
        if (!inv || inv.state !== 'open') return err('Dieser Einladungslink ist nicht mehr gültig.');
        if ((DB.usedInvites || []).indexOf(a.p_token) > -1) return err('Dieser Einladungslink wurde schon benutzt.');
        if (String(a.p_password || '').length < 10) return err('Passwort: mindestens 10 Zeichen.');
        if (DB.employees.some(function (e) { return e.username === un; })) return err('Benutzername ist schon vergeben.');
        DB.employees.push({ id: uid(), org_id: org.id, user_id: uid(), username: un, display_name: a.p_name || inv.adminName || un, role: 'admin', color: '#8a5a2b', theme: 'auto' });
        DB.usedInvites = (DB.usedInvites || []).concat([a.p_token]); persist();
        return ok({ licenseId: org.license_id, username: un });
      }
      if (name === 'erp_me') return ok(me ? { employee: { id: me.id, plannerRole: me.role }, org: { id: 'demo-org', modules: DB.organizations[0].modules || [] }, role: me.role === 'admin' ? null : { perms: { regie: 'write', todos: 'write', planung: 'write' }, isSystem: false } } : null);
      if (name === 'erp_todo_to_job') {
        var tt = DB.erp_todos.filter(function (x) { return x.id === a.p_todo; })[0], pj = a.p_job || {};
        if (!tt) return err('ToDo nicht gefunden.'); if (tt.done_at) return err('Dieses ToDo ist schon erledigt.');
        if (['montage', 'werkstatt', 'planung', 'termin'].indexOf(pj.art || 'termin') < 0) return err('Unbekannte Art.');
        var nj = uid(), pc = pj.customerId && DB.customers.filter(function (x) { return x.erp_customer_id === pj.customerId; })[0];
        DB.jobs.push({ id: nj, org_id: 'demo-org', kunde: pj.kunde || '', adresse: pj.adresse || '', tel: pj.tel || '', notiz: pj.notiz || '', art: pj.articleId ? 'termin' : (pj.art || 'termin'), start: pj.start || null, tage: pj.tage || 1, zeit: pj.zeit || '', ende: pj.ende || '', stunden: pj.stunden, wer: pj.wer || [], customer_id: pc ? pc.id : null, erp_customer_id: pj.customerId || null, article_id: pj.articleId || null, created_by: session.user.id, done: false });
        Object.assign(tt, { done_at: new Date().toISOString(), done_by: me && me.id, job_id: nj, job_linked: true }); persist(); return ok(nj);
      }
      if (name === 'erp_plan_services') return ok(DB.erp_articles.filter(function (x) { return x.kind === 'leistung'; }).map(function (x) { return { id: x.id, number: x.number, name_de: x.name_de, name_it: x.name_it || '', plan_color: x.plan_color || '', active: x.active !== false }; }));
      if (name === 'erp_regie_articles') { var q = String(a.p_search || '').toLowerCase(); return ok(DB.erp_articles.filter(function (x) { return (!a.p_kind || x.kind === a.p_kind) && (x.name_de + ' ' + x.number).toLowerCase().indexOf(q) > -1; })); }
      if (name === 'erp_planner_customer_create') { if (!me || me.role !== 'admin') return err('Keine Berechtigung.'); var q = a.p; if (q) { DB.erpCustomers = (DB.erpCustomers || []).concat([q]); } var nc = { id: uid(), org_id: 'demo-org', name: q ? [q.name, q.name2].filter(Boolean).join(' ') : a.p_name, adresse: q ? [q.street, [q.zip, q.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : a.p_address || '', tel: q ? q.phone || '' : a.p_phone || '', notiz: '', archived: false, erp_customer_id: 'k-' + uid(), created_by: null }; DB.customers.push(nc); persist(); return ok(nc); }
      if (name === 'set_my_theme') { if (me) me.theme = a.p_theme; persist(); return ok(null); }
      if (name === 'admin_set_allday') { if (!me || me.role !== 'admin') return err('Nur der Admin darf das.'); DB.organizations[0].allday_start = a.p_start; DB.organizations[0].allday_end = a.p_end; persist(); return ok(null); }
      if (name === 'erp_set_day_hours') { if (!me || me.role !== 'admin') return err('Keine Berechtigung.'); DB.organizations[0].day_hours = a.p_hours; persist(); return ok(null); }
      if (name === 'admin_add_employee') { var id = uid(); DB.employees.push({ id: id, org_id: 'demo-org', user_id: null, username: null, display_name: a.p_display_name, role: 'user', color: a.p_color || '#2f6fa8', theme: 'auto' }); persist(); return ok(id); }
      return err('Im Demo-Modus nicht verfügbar.');
    },
    // Dateien (Fotos, Unterschrift) als data:-Adresse im Browser
    storage: { from: function () { return {
      upload: function (path, blob) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { DB.files[path] = fr.result; persist(); res({ data: { path: path }, error: null }); }; fr.readAsDataURL(blob); }); },
      createSignedUrl: function (path) { return DB.files[path] ? ok({ signedUrl: DB.files[path] }) : err('Datei nicht gefunden.'); }
    }; } },
    channel: function () { var c = { on: function () { return c; }, subscribe: function () { return c; } }; return c; },
    removeChannel: function () {}
  };
  window.supabase = { createClient: function () { return client; } };
  window.PLANER_CONFIG = Object.assign({}, window.PLANER_CONFIG, { url: 'https://demo.invalid', anonKey: 'demo' });
  // Demo zurücksetzen: Adresse mit ?demo=neu öffnen
  if (/[?&]demo=neu\b/.test(location.search)) { DB = seed(); demoTodos(); persist(); setSession(null, 'SIGNED_OUT'); }
})();
