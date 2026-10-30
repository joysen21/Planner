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
const neuerTermin = async (page) => { await page.click('#hd .ib.pl'); await expect(page.locator('#dlg .dt2 b')).toHaveText('Neuer Termin'); };

test.describe('Anmeldung', () => {
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
  test('Woche: Sa/So grau, umschaltbar auf Mo–Fr (bleibt gemerkt)', async ({ page }) => {
    await login(page);
    await expect(page.locator('.tgh .wh2')).toHaveCount(7);
    await expect(page.locator('.tgh .wh2.wkd')).toHaveCount(2);
    await expect(page.locator('.dcol.wkd')).toHaveCount(2);
    await page.click('.wwt button:has-text("Mo–Fr")');
    await expect(page.locator('.tgh .wh2')).toHaveCount(5);
    await page.goto('/?demo');                        // neu laden ohne Demo-Reset (bleibt angemeldet)
    await expect(page.locator('.tgh .wh2')).toHaveCount(5);
    await page.click('.wwt button:has-text("Mo–So")');
    await expect(page.locator('.tgh .wh2')).toHaveCount(7);
  });

  test('Monat: Wochenenden grau', async ({ page }) => {
    await login(page);
    await page.click('.seg.modes button:has-text("Monat")');
    expect(await page.locator('.mg .c.wd').count()).toBeGreaterThanOrEqual(8);
  });

  test('Ganztägige Termine stehen im Stundenraster (keine Ganztags-Zeile)', async ({ page }) => {
    await login(page);
    await page.click('.flt button:has-text("Alle")');
    await expect(page.locator('.tga')).toHaveCount(0);
    await expect(page.locator('.ev', { hasText: 'ganztags' }).first()).toBeVisible();
  });

  test('Team: angemeldeter Benutzer zuerst, dann alphabetisch', async ({ page }) => {
    await login(page, 'uwe');
    await page.click('.seg.modes button:has-text("Team")');
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
    await page.click('.tbar button[title="Suchen"]');
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

  test('Neuen Kunden über „+“ anlegen', async ({ page }) => {
    await login(page);
    await page.click('nav button[data-t="kunden"]');
    await page.click('#hd .ib.pl');
    await expect(page.locator('#dlg .dt2 b')).toHaveText('Neuer Kunde');
    await page.fill('#k_n', 'E2E Kunde');
    await page.fill('#k_a', 'Teststraße 1');
    await page.click('#dlg .ft .b.p');
    await page.click('#dlg .dt2 .ib');
    await expect(page.locator('.job.kc', { hasText: 'E2E Kunde' })).toBeVisible();
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
