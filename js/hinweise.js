// Planner – Hinweise: Überschneidungen je Person, Meldeleiste unten (Toast) und Speichern ohne Datenverlust.
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.

/* ---------- Überschneidungen ---------- */
// Andere Termine, bei denen eine Person aus c zur gleichen Zeit eingeteilt ist (Urlaub zählt den ganzen Tag).
// Ergebnis je anderem Termin: {j, ds (erster gemeinsamer Tag), n (Anzahl gemeinsamer Tage), p (Personen)}
function clashes(c){if(!c||!c.start||c.done)return [];var W=wer(c);if(!W.length)return [];var cd=span(c),out=[];
 S.jobs.forEach(function(o){if(o.id==c.id||!o.start||o.done)return;
  var p=wer(o).filter(function(x){return W.indexOf(x)>-1});if(!p.length)return;
  var od=span(o),hit=cd.filter(function(ds){if(od.indexOf(ds)<0)return false;if(o.art=='urlaub'||c.art=='urlaub')return true;
   var a=jWin(c,ds),b=jWin(o,ds);return a.s<b.e&&b.s<a.e});
  if(hit.length)out.push({j:o,ds:hit[0],n:hit.length,p:p})});
 return out.sort(function(a,b){return a.ds<b.ds?-1:a.ds>b.ds?1:0})}
function clashDay(ds){var d=parse(ds);return WD[d.getDay()]+' '+d.getDate()+'.'+(d.getMonth()+1)+'.'}
function clashNames(p){var n=p.map(function(id){var u=uById(id);return u?u.display_name:'?'});return n.length>1?n.slice(0,-1).join(', ')+' und '+n[n.length-1]:n[0]}
// Ein Satz je Überschneidung: „Uwe ist Mo 23.11. 08:00–12:00 schon bei Kevin“ / „Uwe hat Mo 23.11. Urlaub“
function clashLine(x){var o=x.j,more=x.n>1?' (und '+(x.n-1)+' weitere'+(x.n==2?'r Tag':' Tage')+')':'',pl=x.p.length>1;
 if(o.art=='urlaub')return clashNames(x.p)+(pl?' haben ':' hat ')+clashDay(x.ds)+' Urlaub'+more;
 return clashNames(x.p)+(pl?' sind ':' ist ')+clashDay(x.ds)+' '+tLbl(o,x.ds)+' schon bei '+(jTit(o)||'einem anderen Termin')+more}
function clashBox(l){if(!l.length)return '';var h=l.slice(0,3).map(function(x){return '<li>'+esc(clashLine(x))+'</li>'}).join('')+(l.length>3?'<li>… und '+(l.length-3)+' weitere</li>':'');
 return '<div class="cfl" role="status">'+ic('alert')+'<div><b>Überschneidung</b><ul>'+h+'</ul></div></div>'}
// Im Termin-Dialog: aus den aktuellen Eingaben prüfen (ohne den Termin zu ändern)
function cfl(){var d=document.getElementById('dlg'),el=d&&d.querySelector('#cfl'),j=cur.j;if(!el||!j)return;
 var g=function(i){return d.querySelector('#'+i)},c=Object.assign({},j,{wer:(j.wer||[]).slice(),start:g('f_s')?g('f_s').value:j.start});
 if(hrsJ(c)){c.stunden=hVal()||1;c.zeit=g('f_b')?g('f_b').value:c.zeit;c.ende='';fit(c)}
 else{if(cur.zt){c.zeit=g('f_z').value||'08:00';c.ende=g('f_e').value;if(!c.ende||c.ende<=c.zeit)c.ende=m2t(t2m(c.zeit)+60)}else{c.zeit='';c.ende=''}
  c.tage=Math.max(1,parseInt(g('f_d')&&g('f_d').value)||1)}
 el.innerHTML=clashBox(clashes(c))}

/* ---------- Meldeleiste unten ---------- */
// toast(text, [[Beschriftung, Funktion], …], {warn, sticky}): ersetzt die vorige Meldung; ohne sticky nach 8 s weg
var TST=null;
function toast(msg,acts,o){o=o||{};var t=document.getElementById('toast');
 if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t)}
 clearTimeout(TST);var A=acts||[];
 t.className='tst'+(o.warn?' warn':'');
 t.innerHTML=(o.warn?ic('alert'):'')+'<span class="tsm">'+esc(msg)+'</span><span class="tsa">'+A.map(function(a,i){return '<button type="button" class="lk" data-i="'+i+'">'+esc(a[0])+'</button>'}).join('')+
  '<button type="button" class="ib tsx" aria-label="Meldung schließen">'+ic('x')+'</button></span>';
 t.querySelectorAll('button[data-i]').forEach(function(b){b.onclick=function(){toastOff();A[+b.dataset.i][1]()}});
 t.querySelector('.tsx').onclick=toastOff;t.hidden=false;
 if(!o.sticky)TST=setTimeout(toastOff,8000)}
function toastOff(){clearTimeout(TST);var t=document.getElementById('toast');if(t)t.hidden=true}

/* ---------- Ziehen im Kalender: Warnung mit Rückgängig ---------- */
// SAVED: letzter gespeicherter Stand je Termin (für Rückgängig). Aufrufen, bevor der Termin gespeichert wird.
var SAVED={};
function jClone(j){return JSON.parse(JSON.stringify(j))}
function rememberAll(){SAVED={};S.jobs.forEach(function(j){SAVED[j.id]=jClone(j)})}
function moved(j){var l=clashes(j);if(!l.length)return;var prev=SAVED[j.id];
 toast(clashLine(l[0])+(l.length>1?' · '+(l.length-1)+' weitere Überschneidung'+(l.length>2?'en':''):''),prev?[['Rückgängig',function(){var x=byId(j.id);if(!x)return;
  Object.keys(x).forEach(function(k){if(!(k in prev))delete x[k]});Object.assign(x,jClone(prev));save(x);render()}]]:[],{warn:true})}

/* ---------- Speichern ohne Datenverlust ---------- */
// Verständlicher Fehlertext statt der rohen Servermeldung
function errTxt(e){var m=String(e&&e.message||e||'');
 if(/failed to fetch|networkerror|load failed|network|timeout|fetch/i.test(m))return 'Keine Verbindung zum Server.';
 if(/row-level security|permission denied|42501|not allowed|keine berechtigung/i.test(m))return 'Keine Berechtigung für diese Änderung.';
 if(/jwt|expired|not authenticated/i.test(m))return 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.';
 return m||'Unbekannter Fehler.'}
// Nicht gespeicherte Änderungen: bleiben sichtbar, bis sie gespeichert oder verworfen sind
var PEND={};
function pendN(){return Object.keys(PEND).length}
function failShow(e){var n=pendN();
 toast('Nicht gespeichert'+(n>1?' ('+n+' Änderungen)':'')+': '+errTxt(e),
  n?[['Verwerfen',function(){PEND={};reload()}],['Erneut versuchen',retryAll]]:[['Neu laden',reload]],{warn:true,sticky:true})}
function retryAll(){var l=Object.keys(PEND).map(function(k){return PEND[k]});PEND={};l.forEach(function(f){f()})}
