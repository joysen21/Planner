// Planner – Laden, Speichern, Live-Aktualisierung, Datums- und Mitarbeiter-Hilfen
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
async function loadAll(){
 var r=await Promise.all([sb.from('employees').select('*').order('display_name'),sb.from('jobs').select('*'),sb.from('holidays').select('d,n').order('d'),sb.from('organizations').select('*').single(),sb.from('customers').select('*').order('name')]);
 r.slice(0,4).forEach(function(x){if(x.error)throw x.error});
 USERS=r[0].data;S.jobs=r[1].data.map(fromRow);S.hol=r[2].data;ORG=r[3].data;
 // Kundenstamm (fehlt die Tabelle noch, läuft die App ohne ihn weiter)
 CUSTOK=!r[4].error;S.cust=CUSTOK?r[4].data:[];
 await regieRights();
 if(ME){var me=uById(ME.id);if(me){me.email=ME.email;ME=me}
  // Darstellung: laufende Auswahl behalten, sonst Änderung von einem anderen Gerät übernehmen
  if(THP)ME.theme=THP;else if(ME.theme&&ME.theme!=(lsGet('planer_theme')||'auto'))applyTheme(ME.theme)}}
// Tage bis zum Lizenzablauf (null = unbegrenzt)
function daysLeft(v){v=v===undefined?ORG&&ORG.valid_until:v;if(!v)return null;return Math.round((parse(v)-parse(fmt(new Date())))/864e5)}
function expired(){return !!(ORG&&ORG.valid_until&&ORG.valid_until<fmt(new Date()))}
function dDE(s){var p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0]}
function nLogins(){return USERS.filter(function(u){return u.user_id}).length}
function fromRow(r){return {erp_customer_id:r.erp_customer_id||null,erp_order_id:r.erp_order_id||null,customer_id:r.customer_id||null,series:r.series||null,created_by:r.created_by||null,id:r.id,kunde:r.kunde,adresse:r.adresse,tel:r.tel,art:r.art,wer:r.wer||[],start:r.start||'',tage:r.tage,zeit:r.zeit,ende:r.ende,fix:r.fix,imp:r.imp,material:r.material,notiz:r.notiz,done:r.done}}
function toRow(j){var o={id:j.id,kunde:j.kunde||'',adresse:j.adresse||'',tel:j.tel||'',art:j.art,wer:j.wer||[],start:j.start||null,tage:Math.min(366,Math.max(1,j.tage||1)),zeit:j.zeit||'',ende:j.ende||'',fix:j.fix!==false,imp:!!j.imp,material:j.material!==false,notiz:j.notiz||'',done:!!j.done};if(j.series)o.series=j.series;if(j.customer_id)o.customer_id=j.customer_id;return o}
function uuid(){if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c=='x'?r:(r&3|8)).toString(16)})}
function fail(e){alert('Speichern fehlgeschlagen: '+(e&&e.message||e)+'\nDie Daten werden neu geladen.');reload()}
function reload(){return loadAll().then(render).catch(function(e){alert('Laden fehlgeschlagen: '+(e.message||e))})}
function save(j){if(j)sb.from('jobs').upsert(toRow(j)).then(function(r){if(r.error)fail(r.error)})}
function subscribe(){if(CH)sb.removeChannel(CH);CH=sb.channel('planer');[['jobs','org_id'],['holidays','org_id'],['employees','org_id'],['organizations','id']].concat(CUSTOK?[['customers','org_id']]:[]).forEach(function(t){CH.on('postgres_changes',{event:'*',schema:'public',table:t[0],filter:t[1]+'=eq.'+ORG.id},rt)});CH.subscribe()}
// Änderungen anderer Benutzer nachladen, aber nicht mitten im Ziehen oder im offenen Dialog
function rt(){clearTimeout(rtT);rtT=setTimeout(function(){if(DG||RZ||document.getElementById('dlg').open||document.activeElement&&document.activeElement.closest&&document.activeElement.closest('main input,main textarea')){rt();return}reload()},500)}
// Reihenfolge der Mitarbeiter: zuerst der angemeldete Benutzer, dann die übrigen alphabetisch
function usersSorted(){return USERS.filter(function(u){return ME&&u.id==ME.id}).concat(USERS.filter(function(u){return !ME||u.id!=ME.id}).sort(function(a,b){return a.display_name.localeCompare(b.display_name,'de')}))}
function uById(id){return USERS.filter(function(u){return u.id==id})[0]}
function uName(id){var u=uById(id);return u?u.display_name:'?'}
function wer(j){return (j.wer||[]).filter(uById)}
function pcol(j){var w=wer(j);return w.length>1?'var(--pb)':w.length?uById(w[0]).color:''}
function wC(j){return pcol(j)?' wp':''}
function wS(j){var c=pcol(j);return c?'--pc:'+c+';':''}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fmt(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parse(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function monday(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return fmt(d)}
function norm(s){var d=parse(s);while(d.getDay()==0||d.getDay()==6||HOL[fmt(d)])d.setDate(d.getDate()+1);return fmt(d)}
function nextWork(s,dir){var d=parse(s);do{d.setDate(d.getDate()+dir)}while(d.getDay()==0||d.getDay()==6||HOL[fmt(d)]);return fmt(d)}
function R(a){return a=='montage'||a=='werkstatt'||a=='planung'}
function isWE(ds){var g=parse(ds).getDay();return g==0||g==6||!!HOL[ds]}
var WEMSG='Montage, Planung und Werkstatt nur an Werktagen (Mo–Fr, ohne Feiertage).',HH=28,H0=6;
function span(j){var out=[],r=R(j.art),d=r?norm(j.start):j.start,n=Math.max(1,j.tage||1);for(var i=0;i<n;i++){out.push(d);d=r?nextWork(d,1):addDays(d,1)}return out}
function t2m(t){var p=(t||'0:0').split(':');return +p[0]*60+(+p[1]||0)}
function m2t(m){m=Math.max(0,Math.min(1439,m));return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
var WD=['So','Mo','Di','Mi','Do','Fr','Sa'],MN=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
function kw(d){var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));var n=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-n);var y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y)/864e5+1)/7)}
function who(j){var w=wer(j);return w.length?w.map(uName).join(', '):'niemand zugeteilt'}
function byId(id){return S.jobs.filter(function(j){return j.id==id})[0]}

