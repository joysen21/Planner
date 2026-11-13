// Supabase-Zugang (Supabase → Project Settings → API).
// Nur die Project URL und den anon/publishable Key eintragen – niemals den service_role Key.
// Der anon Key ist öffentlich; die Daten schützt die Zeilenrechte-Prüfung (RLS) in der Datenbank.
//
// Zwei Umgebungen (siehe TESTUMGEBUNG.md im ERP-Repo): Nur die Live-Adresse nutzt die Live-Datenbank.
// Jede andere Adresse (test-planner.joke-solutions.eu, Vercel-Vorschau, localhost) nutzt die Testdatenbank
// und zeigt oben das orange Band „TESTUMGEBUNG · Testdaten“.
(function () {
  var LIVE_HOST = 'planner.joke-solutions.eu';
  var live = {
    url: 'https://vuaqhpxolvjsrzbvyekl.supabase.co',
    erpUrl: 'https://handwerk-erp-ivory.vercel.app',
    anonKey: 'sb_publishable_mvrfGuXmKG2lXUyjgIEc1A_fMENBK0E'
  };
  var test = {
    url: 'https://emcakpenzsybviairwlh.supabase.co',
    erpUrl: 'https://test-erp.joke-solutions.eu',
    anonKey: 'sb_publishable_aXEVa5e2s9u7NE__okPdTQ_Orn4nGkU',
    test: true
  };
  window.PLANER_CONFIG = location.hostname === LIVE_HOST ? live : test;

  if (!window.PLANER_CONFIG.test) return;
  document.addEventListener('DOMContentLoaded', function () {
    if (window.DEMO || document.querySelector('.test-band')) return;
    var band = document.createElement('div');
    band.className = 'test-band';
    band.setAttribute('role', 'note');
    band.innerHTML = '<span>TESTUMGEBUNG · Testdaten</span>';
    document.body.appendChild(band);
    document.title = 'TEST · ' + document.title;
  });
})();
