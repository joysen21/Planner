// Oberflächentests für Planner im Demo-Modus (keine Datenbank).
// Laufen in Chrome, Safari (WebKit) und auf dem iPhone (WebKit, Touch) – siehe playwright.config.js.
const { test, expect } = require('@playwright/test');

const isMobile = (p) => p.project.name === 'iphone';

// Jede Seite: Meldungen (alert/confirm) automatisch bestätigen, Laufzeitfehler sammeln
test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('dialog', (d) => d.accept());
});
test.afterEach(async ({ page }) => {
  expect(page.errors, 'keine JavaScript-Fehler').toEqual([]);
});

async function login(page, user = 'stefan') {
  await page.goto('/?demo=neu');
  await page.fill('#l_f', '1');
  await page.fill('#l_u', user);
  await page.fill('#l_p', 'demo');
  await page.click('form.login .b.p');
  await expect(page.locator('body')).not.toHaveClass(/auth/);
}
// Wert aus der App lesen (globale Variablen/Funktionen)
const app = (page, fn, arg) => page.evaluate(fn, arg);
// Handy: Ansicht, Filter und Darstellung stehen im Aufklapp-Menü unter dem Titel, am PC in Kopfzeile/Seitenleiste
const menu = async (page) => { if (isMobile(test.info()) && !(await page.locator('.dd').count())) await page.click('#hd .ttl'); };
const ansicht = async (page, name) => { await menu(page); await page.click(`.seg.modes button:has-text("${name}")`); };
const filter = async (page, name) => { await menu(page); await page.click(`.flt button:has-text("${name}"), .sbar .lk:has-text("${name}")`); };
const neuerTermin = async (page) => { await page.click('#hd .ib.pl'); await expect(page.locator('#dlg .dt2 b')).toHaveText('Neuer Termin'); };

test.describe('Anmeldung', () => {
  test('Barrierefreiheit: Felder tragen ihre Beschriftung, auch in Dialogen', async ({ page }) => {
    await page.goto('/?demo=neu');
    await expect(page.getByLabel('Lizenz-ID')).toBeVisible();
    await expect(page.getByLabel('Benutzername')).toBeVisible();
    await expect(page.getByLabel('Passwort')).toBeVisible();
    await page.getByLabel('Lizenz-ID').fill('1');
    await page.getByLabel('Benutzername').fill('stefan');
    await page.getByLabel('Passwort').fill('demo');
    await page.click('form.login .b.p');
    await expect(page.locator('body')).not.toHaveClass(/auth/);
    await neuerTermin(page);
    await expect(page.getByLabel('Kunde / Titel')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Status' })).toBeVisible();
  });

  test('Passwort-Manager kann nicht selbst abschicken, Tipp auf „Anmelden“ schon', async ({ page }) => {
    await page.goto('/?demo=neu');
    await expect(page.locator('#l_f')).not.toHaveAttribute('placeholder', /.+/);
    await page.fill('#l_f', '1'); await page.fill('#l_u', 'stefan'); await page.fill('#l_p', 'demo');
    await page.evaluate(() => document.querySelector('form.login').requestSubmit());     // automatisches Abschicken
    await page.waitForTimeout(400);
    await expect(page.locator('body')).toHaveClass(/auth/);
    await page.click('form.login .b.p');
    await expect(page.locator('body')).not.toHaveClass(/auth/);
  });
});

test.describe('Kalender', () => {
  test('Desktop: Zurück, Heute und Weiter stehen gemeinsam links oben, am Handy ohne Pfeile (Wischen)', async ({ page }, info) => {
    await login(page);
    const x = (title) => page.locator(`#hd [title="${title}"]`).boundingBox().then((b) => b.x);
    const titel = (await page.locator('#hd h1').boundingBox()).x;
    if (isMobile(info)) {
      await expect(page.locator('#hd [title="Zurück"], #hd [title="Weiter"]')).toHaveCount(0);
      expect(await x('Heute')).toBeGreaterThan(titel);
      expect(await x('Suchen')).toBeGreaterThan(titel);
      return;
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    const [zurueck, heute, weiter] = [await x('Zurück'), await x('Heute'), await x('Weiter')];
    const h1 = (await page.locator('#hd h1').boundingBox()).x;
    expect(await x('Neuer Termin')).toBeLessThan(zurueck);
    expect(zurueck).toBeLessThan(heute);
    expect(heute).toBeLessThan(weiter);
    expect(weiter).toBeLessThan(h1);
    await page.click('#hd [title="Weiter"]');
    await expect(page.locator('#hd [title="Heute"]')).toBeVisible();
  });

  test('Woche: Sa/So grau, umschaltbar auf Mo–Fr (bleibt gemerkt)', async ({ page }) => {
    await login(page);
    await expect(page.locator('.tgh .wh2')).toHaveCount(7);
    await expect(page.locator('.tgh .wh2.wkd')).toHaveCount(2);
    await expect(page.locator('.dcol.wkd')).toHaveCount(2);
    await menu(page);
    await page.click('.wwt button:has-text("Mo–Fr")');
    await expect(page.locator('.tgh .wh2')).toHaveCount(5);
    await page.goto('/?demo');                        // neu laden ohne Demo-Reset (bleibt angemeldet)
    await expect(page.locator('.tgh .wh2')).toHaveCount(5);
    await menu(page);
    await page.click('.wwt button:has-text("Mo–So")');
    await expect(page.locator('.tgh .wh2')).toHaveCount(7);
  });

  test('Monat: Wochenenden grau', async ({ page }) => {
    await login(page);
    await ansicht(page, 'Monat');
    expect(await page.locator('.mg .c.wd').count()).toBeGreaterThanOrEqual(8);
  });

  test('Monat: Termine zeigen so viele Angaben, wie Platz haben; volle Tage „+n“; keine 3-Monats-Ansicht', async ({ page }, info) => {
    test.skip(isMobile(info), 'PC-Monat');
    await login(page);
    await ansicht(page, 'Monat');
    await expect(page.locator('.seg.modes button', { hasText: '3 Mon' })).toHaveCount(0);
    await app(page, () => {
      const b = S.jobs.find((j) => j.start);
      S.jobs.push(Object.assign({}, b, { id: 'ruhig', start: '2026-11-24', kunde: 'Hotel Seiser Alm', zeit: '07:30', adresse: 'Dorfstraße 3, Kastelruth', notiz: 'Schlüssel beim Nachbarn' }));
      for (let i = 0; i < 6; i++) S.jobs.push(Object.assign({}, b, { id: 'voll' + i, start: '2026-11-18', kunde: 'Kunde ' + i, zeit: 8 + i + ':00' }));
      an = '2026-11-01'; render(); fitGrid();
    });
    const ruhig = page.locator('.mg.full .ch[data-id="ruhig"]');
    await expect(ruhig.locator('.cl').first()).toHaveText('07:30 Hotel Seiser Alm');
    await expect(ruhig.locator('.cl', { hasText: 'Dorfstraße 3' })).toBeVisible();
    await expect(ruhig.locator('.cl', { hasText: 'Schlüssel beim Nachbarn' })).toBeVisible();
    const voll = page.locator('.mg.full .c[data-drop="2026-11-18"]');
    await expect(voll.locator('i.more')).toBeVisible();
    await expect(voll.locator('i.more')).toHaveText(/^\+\d+$/);
  });

  test('Ganztägige Termine stehen im Stundenraster (keine Ganztags-Zeile)', async ({ page }) => {
    await login(page);
    await filter(page, 'Alle');
    await expect(page.locator('.tga')).toHaveCount(0);
    await expect(page.locator('.ev', { hasText: 'ganztags' }).first()).toBeVisible();
  });

  test('Team: angemeldeter Benutzer zuerst, dann alphabetisch', async ({ page }) => {
    await login(page, 'uwe');
    await ansicht(page, 'Team');
    const namen = await page.locator('.tgh .tmh b').allTextContents();
    expect(namen[0]).toBe('Uwe');
    const rest = namen.slice(1).filter((n) => n !== 'Nicht zugeteilt');
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'de')));
  });

  test('Termin antippen öffnet die Details', async ({ page }) => {
    await login(page);
    await page.locator('.ev', { hasText: 'Huber' }).first().click();
    await expect(page.locator('#dlg .detv')).toContainText('Fam. Huber');
  });
});

test.describe('Termine', () => {
  test('Uhrzeit im 15-Minuten-Takt wählbar und gespeichert', async ({ page }) => {
    await login(page);
    const mo = await app(page, () => fmt(monday(new Date())));
    await neuerTermin(page);
    await page.fill('#f_k', 'E2E Viertelstunde');
    await page.fill('#f_s', mo);
    await expect(page.locator('#f_b option')).toHaveCount(96);
    await page.selectOption('#f_b', '08:15');
    await page.fill('#f_h', '1,5');
    await page.click('#dlg .ft .b.p');
    expect(await app(page, () => { const j = S.jobs.find((x) => x.kunde === 'E2E Viertelstunde'); return [j.zeit, j.ende, j.stunden, j.tage]; })).toEqual(['08:15', '09:45', 1.5, 1]);
  });

  test('Dauer in Stunden: mehr als ein Arbeitstag läuft am nächsten Tag weiter, Urlaub bleibt in Tagen', async ({ page }) => {
    await login(page);
    const mo = await app(page, () => fmt(monday(new Date())));
    await neuerTermin(page);
    await page.fill('#f_k', 'E2E Stunden');
    await page.fill('#f_s', mo);
    await expect(page.locator('#s_zt')).toBeHidden();
    await page.selectOption('#f_b', '13:00');
    await page.click('.hch .b[data-h="16"]');
    await page.click('#hs');
    await expect(page.locator('#hs')).toContainText('3 Arbeitstage');
    await expect(page.locator('#hs')).toContainText('um 13:00');
    await page.click('#f_h');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#f_h')).toHaveValue('16,25');
    await page.fill('#f_h', '12');
    await page.click('#dlg .ft .b.p');
    expect(await app(page, () => { const j = S.jobs.find((x) => x.kunde === 'E2E Stunden'); return [j.stunden, j.tage, j.zeit, j.ende]; })).toEqual([12, 3, '13:00', '09:00']);
    // Gespeichert wird auch die Spalte stunden
    expect(await app(page, () => JSON.parse(sessionStorage.getItem('planner_demo_db')).jobs.find((x) => x.kunde === 'E2E Stunden').stunden)).toBe(12);
    // Urlaub: Dauer in Tagen wie bisher
    await neuerTermin(page);
    await page.click('#s_art button[data-v="kind:urlaub"]');
    await expect(page.locator('#f_d')).toBeVisible();
    await expect(page.locator('#hb')).toBeHidden();
  });

  test('Mehrere Termine gleichzeitig wie Google Kalender: waagrecht, Name höchstens 2 Zeilen, nur so schmal wie nötig', async ({ page }) => {
    await login(page);
    await app(page, () => {
      const td = addDays(fmt(monday(new Date())), 2);   // Mittwoch: Montage läuft nur an Werktagen
      const base = S.jobs.find((j) => j.zeit) || S.jobs[0];
      S.jobs = S.jobs.filter((j) => !span(j).includes(td));
      [['E2E Links', '09:00', '11:00'], ['E2E Rechts', '09:30', '10:30'], ['E2E Danach', '10:30', '12:00'], ['E2E Allein', '14:00', '15:00']].forEach(([k, z, e]) => S.jobs.push({ ...base, id: uuid(), art: 'termin', stunden: null, kunde: k, start: td, tage: 1, zeit: z, ende: e, series: null, done: false }));
      an = td; setMode('tag');
    });
    const ev = (k) => page.locator('.ev', { hasText: k });
    const w = async (k) => (await ev(k).boundingBox()).width;
    const l = ev('E2E Links');
    await expect(l).toHaveClass(/nar/);
    await expect(l).toHaveAttribute('title', /E2E Links · 09:00–11:00/);
    expect(await l.evaluate((el) => getComputedStyle(el).writingMode)).toBe('horizontal-tb');
    expect(await l.locator('.evk').evaluate((el) => getComputedStyle(el).webkitLineClamp)).toBe('2');
    // „Danach“ beginnt, wenn „Rechts“ endet: es nutzt dieselbe rechte Spalte, „Links“ bleibt links
    const [bl, br, bd] = [await l.boundingBox(), await ev('E2E Rechts').boundingBox(), await ev('E2E Danach').boundingBox()];
    expect(br.x).toBeGreaterThan(bl.x + bl.width - 2);
    expect(Math.abs(bd.x - br.x)).toBeLessThan(2);
    // allein am Nachmittag: volle Breite, nicht schmal
    await expect(ev('E2E Allein')).not.toHaveClass(/nar/);
    expect(await w('E2E Allein')).toBeGreaterThan((await w('E2E Links')) * 1.8);
  });

  test('Neuer Termin wird angelegt und im Kalender angezeigt', async ({ page }) => {
    await login(page);
    const mo = await app(page, () => fmt(monday(new Date())));
    await neuerTermin(page);
    await page.fill('#f_k', 'E2E Testtermin');
    await page.fill('#f_s', mo);
    await page.click('#dlg .ft .b.p');
    await expect(page.locator('.ev', { hasText: 'E2E Testtermin' }).first()).toBeVisible();
  });

  test('Kundenstamm: Vorschlag füllt Adresse und Telefon', async ({ page }) => {
    await login(page);
    await neuerTermin(page);
    await page.fill('#f_k', 'Hub');
    await page.click('#ksug button:has-text("Fam. Huber")');
    await expect(page.locator('#f_a')).toHaveValue('Bozen, Hauptstraße 12');
    await expect(page.locator('#f_t')).toHaveValue('0471 123456');
  });

  test('Wiederkehrender Termin: wöchentlich für 3 Wochen = 4 Termine', async ({ page }) => {
    await login(page);
    const [mo, bis] = await app(page, () => { const m = monday(new Date()); return [fmt(m), addDays(fmt(m), 21)]; });
    await neuerTermin(page);
    await page.fill('#f_k', 'E2E Serie');
    await page.fill('#f_s', mo);
    await page.selectOption('#f_r', '7');
    await page.fill('#f_ru', bis);
    await page.click('#dlg .ft .b.p');
    const n = await app(page, () => S.jobs.filter((j) => j.kunde === 'E2E Serie' && j.series).length);
    expect(n).toBe(4);
  });

  test('Suche findet Aufträge und öffnet die Details', async ({ page }) => {
    await login(page);
    await page.click('#hd [title="Suchen"]');
    await page.fill('#q', 'Pichler');
    await expect(page.locator('.qrr')).toHaveCount(1);
    await page.click('.qrr');
    await expect(page.locator('#dlg .detv')).toContainText('Bad Pichler');
  });
});

test.describe('Kunden', () => {
  test('Reiter Kunden: Notiz speichern, Termine des Kunden sehen, neuer Termin vorausgefüllt', async ({ page }) => {
    await login(page);
    await page.click('nav button[data-t="kunden"]');
    await expect(page.locator('#hd h1')).toHaveText('Kunden');
    await page.click('.job.kc:has-text("Fam. Huber")');
    await expect(page.locator('#dlg .dt2 b')).toHaveText('Kunde');
    await expect(page.locator('#dlg .qrr', { hasText: 'Fam. Huber – Küche' })).toBeVisible();   // Termin über den Namen gefunden
    await page.fill('#k_no', 'E2E Notiz: Schlüssel beim Nachbarn');
    await page.click('#dlg .ft .b.p');
    await expect(page.locator('#k_no')).toHaveValue('E2E Notiz: Schlüssel beim Nachbarn');
    await page.click('#dlg button:has-text("Neuer Termin für diesen Kunden")');
    await expect(page.locator('#dlg .dt2 b')).toHaveText('Neuer Termin');
    await expect(page.locator('#f_k')).toHaveValue('Fam. Huber');
    await expect(page.locator('#f_a')).toHaveValue('Bozen, Hauptstraße 12');
    const mo = await app(page, () => fmt(monday(new Date())));
    await page.fill('#f_k', 'Fam. Huber – Nachmessen');
    await page.fill('#f_s', mo);
    await page.click('#dlg .ft .b.p');
    const cid = await app(page, () => S.jobs.filter((j) => j.kunde === 'Fam. Huber – Nachmessen')[0].customer_id);
    expect(cid, 'Termin ist fest mit dem Kunden verknüpft').toBeTruthy();
  });

  test('Neuen Kunden über „+“ mit allen Stammdaten anlegen wie in der ERP', async ({ page }) => {
    await login(page);
    await page.click('nav button[data-t="kunden"]');
    await page.click('#hd .ib.pl');
    const k = page.locator('#kdlg');
    await expect(k.locator('.dt2 b')).toHaveText('Neuer Kunde');
    // Art steuert die Felder: Privat ohne MwSt.-Nr., SDI und PEC
    await k.locator('.seg button', { hasText: 'Privat' }).click();
    await expect(k.locator('#kn_vat_id')).toHaveCount(0);
    await expect(k.locator('#kn_sdi_code')).toHaveCount(0);
    await k.locator('.seg button', { hasText: 'Firma' }).click();
    await k.locator('#kn_save').click();
    await expect(k.locator('#kn_e_name')).toHaveText('Pflichtfeld.');
    await k.locator('#kn_name').fill('E2E Kunde');
    await k.locator('#kn_vat_id').fill('123');
    await k.locator('#kn_save').click();
    await expect(k.locator('#kn_e_vat_id')).toContainText('Partita IVA');
    await k.locator('#kn_vat_id').fill('IT 00743110157');
    await k.locator('#kn_street').fill('Teststraße 1');
    await k.locator('#kn_zip').fill('39031');
    await expect(k.locator('#kn_city')).toHaveValue('Bruneck');
    await expect(k.locator('#kn_province')).toHaveValue('BZ');
    await k.locator('#kn_sdi_code').fill('m5uxcr1');
    await k.locator('#kn_email').fill('info@e2e.it');
    await k.locator('#kn_save').click();
    await expect(k).not.toBeVisible();
    const sent = await app(page, () => JSON.parse(sessionStorage.getItem('planner_demo_db')).erpCustomers.at(-1));
    expect(sent).toMatchObject({ kind: 'firma', name: 'E2E Kunde', vat_id: '00743110157', sdi_code: 'M5UXCR1', zip: '39031', city: 'Bruneck', province: 'BZ', country: 'IT', email: 'info@e2e.it' });
    await expect(page.locator('#dlg .dt2 b')).toHaveText('Kunde');
    await expect(page.locator('#dlg .kro')).toContainText('Teststraße 1, 39031 Bruneck');
    await page.click('#dlg .dt2 .ib');
    await expect(page.locator('.job.kc', { hasText: 'E2E Kunde' })).toBeVisible();
    await expect(page.locator('.job.kc', { hasText: 'E2E Kunde' }).locator('.tag.kerp')).toBeVisible();
  });

  test('ERP-Kunde: Stammdaten nur lesbar, Notiz bleibt bearbeitbar, kein Löschen', async ({ page }) => {
    await login(page);
    await page.click('nav button[data-t="kunden"]');
    await page.click('.job.kc:has-text("Fam. Huber")');
    await expect(page.locator('#k_n')).toHaveCount(0);
    await expect(page.locator('#dlg .kro')).toContainText('Bozen, Hauptstraße 12');
    await expect(page.locator('#dlg .khint')).toContainText('werden dort geändert');
    await expect(page.locator('#dlg .ft .b.d')).toHaveCount(0);
    await page.fill('#k_no', 'Neue Notiz');
    await page.click('#dlg .ft .b.p');
    await page.click('#dlg .dt2 .ib');
    await expect(page.locator('.job.kc', { hasText: 'Fam. Huber' })).toContainText('Neue Notiz');
  });

  test('Nicht verknüpfter Kunde bleibt bearbeitbar und zeigt den Hinweis', async ({ page }) => {
    await login(page);
    await page.click('nav button[data-t="kunden"]');
    await expect(page.locator('.job.kc', { hasText: 'Gruber' }).locator('.tag.bad')).toHaveText('Nicht verknüpft');
    await page.click('.job.kc:has-text("Gruber")');
    await expect(page.locator('#k_n')).toHaveValue('Gruber');
    await expect(page.locator('#dlg .khint.kw')).toContainText('Noch nicht mit der ERP verknüpft');
  });

  test('Im Termin neuen Kunden anlegen: mit Recht als ERP-Kunde, ohne Recht nur ein Hinweis', async ({ page }) => {
    await login(page);
    await neuerTermin(page);
    await page.fill('#f_k', 'Gasser Anna');
    await page.fill('#f_a', 'Platz 3, 39031 Bruneck');
    await page.click('#ksug button:has-text("Als Kunde anlegen")');
    // Fenster über dem Termin, vorbelegt aus Name und Adresse
    const k = page.locator('#kdlg');
    await expect(k.locator('#kn_name')).toHaveValue('Gasser Anna');
    await expect(k.locator('#kn_street')).toHaveValue('Platz 3');
    await expect(k.locator('#kn_zip')).toHaveValue('39031');
    await expect(k.locator('#kn_city')).toHaveValue('Bruneck');
    await k.locator('.seg button', { hasText: 'Privat' }).click();
    await k.locator('#kn_phone').fill('0474 1');
    await k.locator('#kn_save').click();
    await expect(k).not.toBeVisible();
    await expect(page.locator('#ksug .khint')).toContainText('Kunde angelegt und übernommen');
    await expect(page.locator('#f_t')).toHaveValue('0474 1');
    expect(await app(page, () => S.cust.filter((c) => c.name === 'Gasser Anna')[0].erp_customer_id)).toBeTruthy();
    expect(await app(page, () => cur.j.customer_id === S.cust.filter((c) => c.name === 'Gasser Anna')[0].id)).toBe(true);
    await page.evaluate(() => document.getElementById('dlg').close());

    await login(page, 'uwe');
    await page.click('nav button[data-t="kunden"]');
    await expect(page.locator('.kneu')).toHaveCount(0);
    await expect(page.locator('#hd .ib.pl')).toHaveCount(0);
    await page.click('nav button[data-t="plan"]');
    await neuerTermin(page);
    await page.fill('#f_k', 'Niemand Neu');
    await expect(page.locator('#ksug .khint.kw')).toContainText('trotzdem speichern');
    await expect(page.locator('#ksug button')).toHaveCount(0);
  });
});

test.describe('Einstellungen & Lizenz', () => {
  test('Kein „+“ im Reiter Einstellungen', async ({ page }) => {
    await login(page);
    await page.click('nav button[data-t="mehr"]');
    await expect(page.locator('#hd .ib.pl')).toHaveCount(0);
  });

  test('Admin sieht Erinnerung 30 Tage vor Lizenzablauf', async ({ page }) => {
    await login(page);
    await app(page, () => { ORG.valid_until = addDays(fmt(new Date()), 10); render(); });
    await expect(page.locator('.note')).toContainText('Lizenz läuft in 10 Tagen ab');
  });

  test('Drucken: nur der Kalender (Navigation ausgeblendet)', async ({ page }) => {
    await login(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('nav')).toBeHidden();
    await expect(page.locator('.tbar')).toBeHidden();
    await expect(page.locator('.tg')).toBeVisible();
  });
});

test.describe('Handy / iPhone', () => {
  test('Seite und Termin-Dialog lassen sich nicht seitlich verschieben, „X“ bleibt sichtbar', async ({ page }, info) => {
    test.skip(!isMobile(info), 'nur im Handy-Format');
    await login(page);
    for (const t of ['plan', 'offen', 'kunden', 'mehr']) {
      await page.click(`nav button[data-t="${t}"]`);
      const w = await app(page, () => [document.documentElement.scrollWidth, innerWidth]);
      expect(w[0], `kein seitliches Scrollen (${t})`).toBeLessThanOrEqual(w[1]);
    }
    await page.click('nav button[data-t="plan"]');
    await neuerTermin(page);
    const box = await page.locator('#dlg').boundingBox();
    const vp = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(box.y).toBeGreaterThanOrEqual(0);
    await page.evaluate(() => { document.getElementById('dlg').scrollTop = 10000; });
    const x = await page.locator('#dlg .dt2 .ib').boundingBox();
    expect(x.y).toBeGreaterThanOrEqual(0);
    expect(x.x + x.width).toBeLessThanOrEqual(vp.width + 0.5);
    const breit = await app(page, () => { const d = document.getElementById('dlg'); return d.scrollWidth - d.clientWidth; });
    expect(breit, 'Dialog nicht breiter als der Bildschirm').toBeLessThanOrEqual(0);
  });
});

test.describe('Regiebericht (ERP)', () => {
  const oeffne = (page, kunde) => app(page, (k) => showDet(S.jobs.find((j) => j.kunde.startsWith(k)).id), kunde);
  const db = (page) => app(page, () => JSON.parse(sessionStorage.getItem('planner_demo_db')));

  test('Monteur erfasst Stunden, Material und Unterschrift und sendet ans Büro', async ({ page }) => {
    await login(page, 'uwe');
    await oeffne(page, 'Fam. Huber');
    await page.click('#dlg .rgb');
    await expect(page.locator('#dlg .dt2 b')).toHaveText('Regiebericht');
    // je eingeteiltem Mitarbeiter eine Zeile, Stunden aus der Uhrzeit des Termins (08:00–12:00)
    await expect(page.locator('#dlg .rgr')).toHaveCount(2);
    await expect(page.locator('#dlg .rgt')).toHaveText('8,0 h');
    await page.getByRole('button', { name: 'Eine halbe Stunde mehr für Uwe' }).click();
    await expect(page.locator('#dlg .rgt')).toHaveText('8,5 h');

    await page.fill('#rg_q', 'Sil');
    await page.getByRole('button', { name: /^Silikon transparent/ }).click();
    await page.getByRole('button', { name: 'Silikon transparent erhöhen' }).click();
    await expect(page.locator('#dlg .rgr', { hasText: 'Silikon' }).locator('.rgv')).toHaveText('2 Stk');
    await page.fill('#rg_q', 'Dübel 8 mm');
    await page.getByRole('button', { name: /als freien Text/ }).click();
    await page.fill('#rg_n', 'Sockelleiste fehlt noch.');

    await page.fill('#rg_sn', 'Maria Huber');
    await page.locator('#rg_c').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    const c = await page.locator('#rg_c').boundingBox();
    await page.mouse.move(c.x + 30, c.y + 100);
    await page.mouse.down();
    for (const [x, y] of [[80, 50], [130, 110], [180, 60], [230, 100]]) await page.mouse.move(c.x + x, c.y + y, { steps: 4 });
    await page.mouse.up();

    await page.getByRole('button', { name: 'An Büro senden' }).click();
    await expect(page.locator('#dlg .rgok h2')).toHaveText('Bericht übermittelt');
    const d = await db(page);
    expect(d.erp_regie).toHaveLength(1);
    expect(d.erp_regie[0]).toMatchObject({ status: 'eingereicht', customer_id: 'k-huber', signer_name: 'Maria Huber', remark: 'Sockelleiste fehlt noch.' });
    expect(d.erp_regie[0].signature_path).toMatch(/^demo-org\/regie\/.+\.png$/);
    expect(d.erp_regie_hours.map((h) => [h.employee_id, h.hours, h.article_id])).toEqual([['e-stefan', 4, 'a-std'], ['e-uwe', 4.5, 'a-std']]);
    expect(d.erp_regie_material.map((m) => [m.article_id, m.text, m.qty])).toEqual([['a-sil', 'Silikon transparent', 2], [null, 'Dübel 8 mm', 1]]);

    // danach nur noch ansehen
    await page.getByRole('button', { name: 'Bericht ansehen' }).click();
    await expect(page.locator('#dlg .note')).toContainText('liegt im Büro');
    await expect(page.getByRole('button', { name: 'An Büro senden' })).toHaveCount(0);
    await expect(page.locator('#dlg .rgsig img')).toHaveAttribute('src', /^data:image\/png/);
  });

  test('Zuletzt verwendetes Material und PDF für den Kunden', async ({ page }) => {
    await login(page, 'uwe');
    await oeffne(page, 'Fam. Huber');
    await page.click('#dlg .rgb');
    await expect(page.locator('#dlg .rgvb')).toContainText('08:00–12:00');
    await page.fill('#rg_q', 'Sil');
    await page.getByRole('button', { name: /^Silikon transparent/ }).click();
    // Chip erhöht die vorhandene Zeile statt eine zweite anzulegen
    await page.getByRole('button', { name: 'Silikon transparent hinzufügen' }).click();
    await expect(page.locator('#dlg .rgr', { hasText: 'Silikon' })).toHaveCount(1);
    await expect(page.locator('#dlg .rgr', { hasText: 'Silikon' }).locator('.rgv')).toHaveText('2 Stk');
    await page.fill('#rg_n', 'Nur fürs Büro');
    await expect(page.getByRole('button', { name: 'PDF für den Kunden' })).toHaveCount(0);

    await page.fill('#rg_sn', 'Maria Huber');
    await page.locator('#rg_c').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    const c = await page.locator('#rg_c').boundingBox();
    await page.mouse.move(c.x + 30, c.y + 100);
    await page.mouse.down();
    for (const [x, y] of [[80, 50], [130, 110], [180, 60]]) await page.mouse.move(c.x + x, c.y + y, { steps: 4 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();

    await page.getByRole('button', { name: 'PDF für den Kunden' }).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF herunterladen' }).click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/^Regiebericht_.+\.pdf$/);
    const chunks = [];
    for await (const x of await file.createReadStream()) chunks.push(x);
    const pdf = Buffer.concat(chunks).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.endsWith('%%EOF\n')).toBe(true);
    expect(pdf).toContain('(Regiebericht)');
    expect(pdf).toContain('(Maria Huber');
    expect(pdf).toContain('(Silikon transparent)');
    expect(pdf).toContain('/DCTDecode');
    // Die Notiz ist fürs Büro und bleibt draußen
    expect(pdf).not.toContain('Nur fürs Büro');
    // Verweise im Inhaltsverzeichnis zeigen wirklich auf die Objekte
    const start = Number(/startxref\n(\d+)/.exec(pdf)[1]);
    expect(pdf.slice(start, start + 4)).toBe('xref');
    const offsets = [...pdf.slice(start).matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(pdf.slice(o, o + 10)).toContain(`${i + 1} 0 obj`));
  });

  test('Entwurf speichern und später weitermachen; ohne ERP-Kunde nur ein Hinweis', async ({ page }) => {
    await login(page, 'uwe');
    await oeffne(page, 'Fam. Huber');
    await page.click('#dlg .rgb');
    await page.getByRole('button', { name: 'Eine halbe Stunde weniger für Stefan' }).click();
    await page.locator('#dlg .ft .b', { hasText: 'Speichern' }).click();
    await expect(page.locator('#rg_e')).toHaveText('Gespeichert');
    await page.click('#dlg .dt2 .ib');
    await oeffne(page, 'Fam. Huber');
    await page.click('#dlg .rgb');
    await expect(page.locator('#dlg .rgt')).toHaveText('7,5 h');
    await expect(page.locator('#dlg .rgs')).toHaveText('Entwurf');
    await page.click('#dlg .dt2 .ib');

    await oeffne(page, 'Bad Pichler');
    await expect(page.locator('#dlg .rgb')).toHaveCount(0);
    await expect(page.locator('#dlg .rgh')).toContainText('nicht mit der ERP verknüpft');
  });
});

test.describe('Leistung aus der ERP', () => {
  test('„Was“ bietet die Leistungsartikel; Termin zeigt Name und Farbe, Regie nimmt die Leistung', async ({ page }) => {
    await login(page);
    const mo = await app(page, () => fmt(monday(new Date())));
    await neuerTermin(page);
    const was = page.locator('#s_art button');
    await expect(was.filter({ hasText: 'Montage vor Ort' })).toHaveCount(1);
    await expect(was.filter({ hasText: 'Urlaub' })).toHaveCount(1);
    // feste Arten wie Werkstatt nur, wenn der Termin sie schon hat
    await expect(was.filter({ hasText: 'Werkstatt' })).toHaveCount(0);
    await page.fill('#f_k', 'E2E Leistung');
    await page.fill('#f_s', mo);
    await was.filter({ hasText: 'Montage vor Ort' }).click();
    await page.click('#dlg .ft .b.p');
    expect(await app(page, () => { const j = S.jobs.find((x) => x.kunde === 'E2E Leistung'); return [j.art, j.article_id, toRow(j).article_id, jName(j), R(j)]; }))
      .toEqual(['termin', 'a-mon', 'a-mon', 'Montage vor Ort', true]);
    const ev = page.locator('.ev', { hasText: 'E2E Leistung' }).first();
    await expect(ev).toBeVisible();
    expect(await ev.evaluate((el) => el.style.getPropertyValue('--c'))).toBe('#378add');
    await menu(page);
    await expect(page.locator('.lg')).toContainText('Montage vor Ort');
  });
});

test.describe('Kalender: mehr Platz und Bedienung wie in Kalender-Apps', () => {
  test('Raster füllt den Bildschirm: beginnt oben, endet an der unteren Leiste, Seite scrollt nicht', async ({ page }, info) => {
    await login(page);
    const r = await app(page, () => { const g = document.querySelector('.tg').getBoundingClientRect(), n = document.querySelector('nav').getBoundingClientRect();
      return { top: g.top, bottom: g.bottom, nav: innerWidth < 900 ? n.top : innerHeight, sh: document.documentElement.scrollHeight, ih: innerHeight }; });
    expect(r.top).toBeLessThan(isMobile(info) ? 80 : 100);
    expect(r.nav - r.bottom).toBeLessThan(30);
    expect(r.sh).toBeLessThanOrEqual(r.ih + 1);
    // Tageszeile bleibt beim Scrollen im Raster stehen
    await app(page, () => { document.querySelector('.tg').scrollTop = 200; });
    const h = await app(page, () => document.querySelector('.tgh').getBoundingClientRect().top - document.querySelector('.tg').getBoundingClientRect().top);
    expect(Math.abs(h)).toBeLessThan(2);
  });

  test('PC: Kalender nutzt auch auf großen Bildschirmen die ganze Breite und Höhe (Woche und Monat)', async ({ page }, info) => {
    test.skip(isMobile(info), 'nur am PC');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    for (const m of ['woche', 'monat']) {
      await app(page, (x) => setMode(x), m);
      const r = await app(page, () => { const e = document.querySelector('.tg, .swp>.mg').getBoundingClientRect(); return { right: e.right, bottom: e.bottom, sh: document.documentElement.scrollHeight }; });
      expect(r.right, m).toBeGreaterThan(1920 - 40);
      expect(r.bottom, m).toBeGreaterThan(1080 - 30);
      expect(r.sh, m).toBeLessThanOrEqual(1081);
    }
  });

  test('Plus: am Handy schwebend unten rechts, am PC „Neu“ oben links', async ({ page }, info) => {
    await login(page);
    const b = await page.locator('#hd .ib.pl').boundingBox(), vw = page.viewportSize().width;
    if (isMobile(info)) { expect(b.x + b.width).toBeGreaterThan(vw - 30); expect(b.y).toBeGreaterThan(page.viewportSize().height - 170); }
    else { expect(b.x).toBeLessThan(200); await expect(page.locator('#hd .ib.pl')).toContainText('Neu'); }
    await neuerTermin(page);
  });

  test('Mini-Monat: Tag antippen springt dorthin, Ansicht bleibt', async ({ page }) => {
    await login(page);
    await menu(page);
    const ziel = await app(page, () => addDays(fmt(monday(new Date())), 7));
    await page.locator('.mm .mmn[title="Monat weiter"]').click();
    await page.locator('.mm .mmn[title="Monat zurück"]').click();
    await app(page, (d) => mmGo(d), ziel);
    expect(await app(page, () => [an, mode])).toEqual([ziel, 'woche']);
    await expect(page.locator('.dd')).toHaveCount(0);
  });

  test('Liste: Termine nach Tagen, Antippen öffnet Details, zuletzt benutzte Ansicht bleibt gemerkt', async ({ page }) => {
    await login(page);
    await filter(page, 'Alle');
    await app(page, () => { an = fmt(monday(new Date())); });
    await ansicht(page, 'Liste');
    await expect(page.locator('.agr', { hasText: 'Huber' }).first()).toBeVisible();
    await page.locator('.agr', { hasText: 'Huber' }).first().click();
    await expect(page.locator('#dlg .detv')).toContainText('Fam. Huber');
    await page.evaluate(() => document.getElementById('dlg').close());
    await page.goto('/?demo');
    expect(await app(page, () => mode)).toBe('liste');
    await expect(page.locator('.ag')).toBeVisible();
  });

  test('Mitarbeiter-Filter: mehrere Personen per Häkchen', async ({ page }) => {
    await login(page);
    const [a, b] = await app(page, () => USERS.filter((u) => u.id != ME.id).slice(0, 2).map((u) => u.id));
    await app(page, (id) => togU(id), a);
    expect(await app(page, () => fltIds().length)).toBe(2);
    await app(page, (id) => togU(id), b);
    await expect(page.locator('#hd h1 small')).toHaveText('3 Personen');
    expect(await app(page, () => S.jobs.filter(vis).every((j) => j.wer.some((x) => fltIds().includes(x))))).toBe(true);
    // Neuer Termin bekommt mich, weil ich ausgewählt bin
    expect(await app(page, () => fltNew() === ME.id)).toBe(true);
    await filter(page, 'Alle');
    expect(await app(page, () => FLT)).toBe('alle');
  });

  test('Farbe nach Mitarbeiter: eine Person in ihrer Farbe, mehrere gestreift', async ({ page }) => {
    await login(page);
    await filter(page, 'Alle');
    await menu(page);
    await page.click('.cmt button:has-text("nach Mitarbeiter")');
    await expect(page.locator('body')).toHaveClass(/cm-ma/);
    const mehr = page.locator('.ev', { hasText: 'Huber' }).first();
    expect(await mehr.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('repeating-linear-gradient');
    await page.goto('/?demo');
    await expect(page.locator('body')).toHaveClass(/cm-ma/);
  });

  test('Zoom: Stundenhöhe kompakt/groß, bleibt gemerkt; Strg + Mausrad am PC', async ({ page }, info) => {
    await login(page);
    const h0 = await app(page, () => HH);
    await menu(page);
    await page.click('.zmt button:has-text("Groß")');
    expect(await app(page, () => HH)).toBeGreaterThan(h0);
    await page.goto('/?demo');
    expect(await app(page, () => ZF)).toBeCloseTo(1.4, 1);
    if (!isMobile(info)) {
      const g = await page.locator('.tg').boundingBox();
      await page.mouse.move(g.x + g.width / 2, g.y + 300);
      await page.keyboard.down('Control'); await page.mouse.wheel(0, 200); await page.keyboard.up('Control');
      await expect.poll(() => app(page, () => ZF)).toBeLessThan(1.4);
    }
  });

  test('Wischen mit Mitlauf: weit genug gewischt = nächste Woche, kurz = zurück an den Platz', async ({ page }) => {
    await login(page);
    const vorher = await app(page, () => an);
    await app(page, () => swEnd({ el: document.querySelector('#main .swp'), dx: -30, t: Date.now() - 400 }));
    await page.waitForTimeout(300);
    expect(await app(page, () => an)).toBe(vorher);
    await app(page, () => swEnd({ el: document.querySelector('#main .swp'), dx: -140, t: Date.now() - 200 }));
    const ziel = await app(page, (d) => addDays(d, 7), vorher);
    await expect.poll(() => app(page, () => an)).toBe(ziel);
    await expect.poll(() => app(page, () => document.querySelector('#main .swp').style.transform)).toBe('');
  });

  test('PC: Tastaturkürzel, Seitenleiste und Vollbild', async ({ page }, info) => {
    test.skip(isMobile(info), 'nur am PC');
    await login(page);
    await expect(page.locator('.sbar .mm')).toBeVisible();
    await expect(page.locator('.sbar .sbu')).not.toHaveCount(0);
    const a0 = await app(page, () => an);
    await page.keyboard.press('ArrowRight');
    expect(await app(page, () => an)).toBe(await app(page, (d) => addDays(d, 7), a0));
    await page.keyboard.press('t');
    await page.keyboard.press('m');
    expect(await app(page, () => mode)).toBe('monat');
    await page.keyboard.press('a');
    expect(await app(page, () => mode)).toBe('liste');
    await page.keyboard.press('w');
    await page.keyboard.press('s');
    await expect(page.locator('.sbar')).toHaveCount(0);
    await page.keyboard.press('s');
    await expect(page.locator('.sbar')).toBeVisible();
    await page.keyboard.press('f');
    await expect(page.locator('body')).toHaveClass(/\bfs\b/);
    await expect(page.locator('nav')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/\bfs\b/);
    await page.keyboard.press('?');
    await expect(page.locator('#dlg .kh')).toContainText('Neuer Termin');
    await page.click('#dlg [title="Schließen"]');
    await page.keyboard.press('n');
    await expect(page.locator('#dlg .dt2 b')).toHaveText('Neuer Termin');
  });

  test('Monat: Mo–Fr blendet Sa/So aus (gilt auch für die Woche), Wochenend-Termine als Hinweis am Freitag', async ({ page }) => {
    await login(page);
    await filter(page, 'Alle');
    const sa = await app(page, () => {
      const sa = addDays(fmt(monday(new Date())), 5), base = S.jobs.find((j) => j.art === 'termin');
      S.jobs.push({ ...base, id: uuid(), kunde: 'E2E Notdienst', start: sa, tage: 1, zeit: '09:00', ende: '10:00', series: null, done: false });
      an = fmt(monday(new Date())); return sa;
    });
    await ansicht(page, 'Monat');
    await menu(page);
    await page.click('.wwt button:has-text("Mo–Fr")');
    if (await page.locator('.dd').count()) await page.click('.dd .ddf .b.p');   // Handy: Menü mit „Fertig“ schließen
    await expect(page.locator('.mg .gr.wl span')).toHaveCount(5);
    await expect(page.locator('.mg .c.wd:not(.hol)')).toHaveCount(0);
    const hinweis = page.locator('.c i.wem').first();
    await expect(hinweis).toContainText('Sa/So');
    await hinweis.click();
    expect(await app(page, () => [mode, an])).toEqual(['tag', sa]);
    await ansicht(page, 'Woche');
    await expect(page.locator('.tgh .wh2')).toHaveCount(5);
  });

  test('Handy-Monat: Tag antippen zeigt die Termine darunter, noch einmal antippen öffnet den Tag', async ({ page }, info) => {
    test.skip(!isMobile(info), 'nur im Handy-Format');
    await login(page);
    await filter(page, 'Alle');
    const mo = await app(page, () => fmt(monday(new Date())));
    await ansicht(page, 'Monat');
    await page.click(`.mg .c[data-drop="${mo}"]`);
    await expect(page.locator(`.mg .c.sel[data-drop="${mo}"]`)).toHaveCount(1);
    await expect(page.locator('.mdl .agr', { hasText: 'Huber' })).toBeVisible();
    await page.locator('.mdl .agr', { hasText: 'Huber' }).click();
    await expect(page.locator('#dlg .detv')).toContainText('Fam. Huber');
    await page.evaluate(() => document.getElementById('dlg').close());
    await page.click(`.mg .c[data-drop="${mo}"]`);
    expect(await app(page, () => mode)).toBe('tag');
  });

  test('Handy: Aufklapp-Menü mit Ansicht, Mitarbeitern und Darstellung; Auswahl schließt es', async ({ page }, info) => {
    test.skip(!isMobile(info), 'nur im Handy-Format');
    await login(page);
    await page.click('#hd .ttl');
    await expect(page.locator('.dd .mm')).toBeVisible();
    await expect(page.locator('#hd .ib.pl')).toBeHidden();
    await page.click('.dd .seg.modes button:has-text("Tag")');
    await expect(page.locator('.dd')).toHaveCount(0);
    expect(await app(page, () => mode)).toBe('tag');
    await page.click('#hd .ttl');
    await page.click('.ddb', { position: { x: 3, y: 300 } });
    await expect(page.locator('.dd')).toHaveCount(0);
  });
  test('Handy: kurz halten legt 1 Stunde an, leichtes Zittern bricht nicht ab, Ziehen verlängert', async ({ page }) => {
    await login(page);
    await app(page, () => { an = addDays(fmt(new Date()), 45); setMode('tag'); });
    const hold = (dy, jit) => app(page, async ([dy, jit]) => {
      const c = document.querySelector('#main .dcol'), r = c.getBoundingClientRect(), x = r.left + r.width / 2;
      const y = r.top + (10 - H0) * HH + 2, ev = (t, yy, xx) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: xx || x, clientY: yy, pointerType: 'touch', isPrimary: true }));
      ev('pointerdown', y); ev('pointermove', y + jit, x + jit);
      await new Promise((f) => setTimeout(f, 380));
      const blk = !!c.querySelector('.slr');
      if (dy) ev('pointermove', y + dy);
      ev('pointerup', y + dy);
      return [blk, document.getElementById('f_z').value, document.getElementById('f_e').value];
    }, [dy, jit]);
    const close = () => page.evaluate(() => document.getElementById('dlg').close());
    expect(await hold(0, 9)).toEqual([true, '10:00', '11:00']);
    await close();
    const hh = await app(page, () => HH);
    expect(await hold(Math.round(hh * 2.1), 0)).toEqual([true, '10:00', '12:15']);
  });
});

test.describe('Lizenzzentrale (Clear)', () => {
  test('Einladungslink: Firmen-Admin wählt Benutzername und Passwort und kann sich danach anmelden', async ({ page }) => {
    await page.goto('/?demo=neu#einladung=demo-einladung-offen-0001');
    await expect(page.locator('.invf')).toContainText('JK.PLANNER.001');
    await expect(page.locator('#i_n')).toHaveValue('Stefan Brenner');
    await page.fill('#i_u', 'brenner');
    await page.fill('#i_p', 'kurz');
    await page.fill('#i_p2', 'kurz');
    await page.click('#inv .b.p');
    await expect(page.locator('#i_e')).toContainText('mindestens 10');
    await page.fill('#i_p', 'sicheres-pw-123');
    await page.fill('#i_p2', 'sicheres-pw-124');
    await page.click('#inv .b.p');
    await expect(page.locator('#i_e')).toContainText('stimmen nicht');
    await page.fill('#i_p2', 'sicheres-pw-123');
    await page.click('#inv .b.p');
    await expect(page.locator('.invok h2')).toContainText('Konto ist angelegt');
    await expect(page.locator('.invok .invf')).toContainText('brenner');
    await page.click('.invok .b.p');
    await expect(page).not.toHaveURL(/einladung/);
    await expect(page.locator('#l_f')).toHaveValue('JK.PLANNER.001');
    await page.fill('#l_u', 'brenner');
    await page.fill('#l_p', 'sicheres-pw-123');
    await page.click('form.login .b.p');
    await expect(page.locator('body')).not.toHaveClass(/auth/);
    // derselbe Link geht nur einmal
    await page.goto('/?demo#einladung=demo-einladung-offen-0001');
    await expect(page.locator('.login .note')).toContainText('schon benutzt');
  });

  test('Abgelaufener oder falscher Link zeigt einen Hinweis statt des Formulars', async ({ page }) => {
    await page.goto('/?demo=neu#einladung=demo-einladung-alt-0001');
    await expect(page.locator('.login .note')).toContainText('nicht mehr gültig');
    await expect(page.locator('#inv')).toHaveCount(0);
    await page.goto('/?demo#einladung=gibt-es-nicht-000000000');
    await expect(page.locator('.login .note')).toContainText('nicht mehr gültig');
  });

  test('Besitzer-Ansicht nur zur Ansicht: Hinweis auf Clear, kein Anlegen, Bearbeiten oder Löschen', async ({ page }) => {
    await page.goto('/?demo=neu');
    await page.fill('#l_f', '');
    await page.fill('#l_u', 'besitzer@demo.local');
    await page.fill('#l_p', 'demo');
    await page.click('form.login .b.p');
    await expect(page.locator('.own .note.ro')).toContainText('in Clear verwaltet');
    await expect(page.locator('.own .job')).toHaveCount(1);
    await expect(page.locator('.own button', { hasText: 'Neue Firma' })).toHaveCount(0);
    await expect(page.locator('.own button', { hasText: 'Bearbeiten' })).toHaveCount(0);
    await expect(page.locator('.own .job button')).toHaveText([/Benutzer/]);
  });
});
