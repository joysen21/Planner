// Automatische Oberflächentests im Demo-Modus (?demo) – ohne Datenbank.
// Projekte: Chrome (Desktop), Safari (Desktop, WebKit) und iPhone (Safari/WebKit, Touch).
// Start: npm test   ·   nur Safari/iPhone: npm run test:safari
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5181', locale: 'de-DE', timezoneId: 'Europe/Rome', serviceWorkers: 'block' },
  projects: [
    { name: 'chrome-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } },
    { name: 'safari-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1400, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } }
  ],
  webServer: { command: 'npx --yes serve@14.2.4 -l 5181 .', url: 'http://localhost:5181', reuseExistingServer: !process.env.CI, timeout: 60000 }
});
