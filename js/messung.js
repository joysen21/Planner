// Planner – Nutzungszählung: wie viele Klicks und Sekunden ein Ablauf braucht und ob er abgebrochen wird.
// Ohne Personenbezug: gespeichert werden nur Ablauf, Ergebnis, Klicks, Sekunden, Gerät und Einstieg (usage_log, Firma aus der Anmeldung).
// Hängt sich von außen an die bestehenden Funktionen; je Fenster (#dlg, #kdlg) und für „Verschieben“ läuft höchstens ein Ablauf.
var MS={};        // laufende Abläufe je Platz: {flow, entry, t, c, done}
var MSE='';       // Einstieg für den nächsten Start (z. B. 'plus'), sonst der aktuelle Reiter
var MSBACK=false; // Rückkehr ins Bearbeiten nach „Zeit buchen“: kein neuer Ablauf

function msDevice(){var c=matchMedia('(pointer:coarse)').matches,w=Math.min(innerWidth,screen.width||innerWidth);return !c?'pc':w<600?'handy':'tablet'}
function msEntry(){var e=MSE;MSE='';if(e)return e;return tab=='plan'?'plan_'+mode:tab}
// Start: der Klick, der den Ablauf öffnet, zählt schon mit
function msStart(slot,flow,entry){MS[slot]={flow:flow,entry:entry||msEntry(),t:Date.now(),c:1}}
function msEnd(slot,outcome,flow){var m=MS[slot];if(!m)return;delete MS[slot];msSend(flow||m.flow,outcome,m.c,Math.round((Date.now()-m.t)/1000),m.entry)}
function msDrop(slot){delete MS[slot]}
function msSend(flow,outcome,clicks,sec,entry){
 try{if(!sb||!ME)return;sb.rpc('usage_log',{p_app:'planner',p_flow:flow,p_outcome:outcome,p_clicks:clicks,p_seconds:sec,p_device:msDevice(),p_entry:(entry||'').replace(/[^a-z0-9_]/g,'_').slice(0,40)}).then(function(){},function(){})}catch(e){}}
function msClick(){Object.keys(MS).forEach(function(k){MS[k].c++})}
document.addEventListener('pointerdown',msClick,true);
document.addEventListener('keydown',function(e){if(e.key=='Enter'&&!e.repeat)msClick()},true);
// Fenster ohne Abschluss geschlossen = Abbruch
['dlg','kdlg'].forEach(function(id){var d=document.getElementById(id);if(d)d.addEventListener('close',function(){var m=MS[id];if(!m)return;if(m.draft)msDrop(id);else msEnd(id,'abbruch')})});

// Einstiege
(function(){var n=nw;nw=function(){MSE='plus';return n.apply(this,arguments)}})();
(function(){var n=kNeuerTermin;kNeuerTermin=function(){MSE='kunde';return n.apply(this,arguments)}})();

// Termin anlegen / bearbeiten
(function(){var o=edit;edit=function(id){var back=MSBACK;MSBACK=false;var r=o.apply(this,arguments);
  if(!back)msStart('dlg',id?'termin_bearbeiten':'termin_anlegen');return r}})();
(function(){var o=sv;sv=function(){var m=MS.dlg,r=o.apply(this,arguments);
  if(m&&/^termin_/.test(m.flow)&&(!document.getElementById('dlg').open||!document.querySelector('#dlg #f_k')))msEnd('dlg','ok');return r}})();
(function(){var o=del;del=function(){var r=o.apply(this,arguments);if(r)msDrop('dlg');return r}})();

// Termin verschieben: über „Verschieben“ (Ziel antippen) oder Ziehen
(function(){var o=pick;pick=function(){var e=msEntry();var r=o.apply(this,arguments);msStart('mv','termin_verschieben',e);return r}})();
(function(){var o=drop;drop=function(){if(!MS.mv)msStart('mv','termin_verschieben','ziehen');var r=o.apply(this,arguments);if(!mvId)msEnd('mv','ok');return r}})();

// Zeit buchen
(function(){var o=zBook;zBook=function(){var e=document.querySelector('#dlg #f_k')?'termin':msEntry();var r=o.apply(this,arguments);if(Z)msStart('dlg','zeit_buchen',e);return r}})();
(function(){var o=zNew;zNew=function(){var e=msEntry();var r=o.apply(this,arguments);msStart('dlg','zeit_buchen',e);return r}})();
(function(){var o=zEdit;zEdit=function(){var e=msEntry();var r=o.apply(this,arguments);if(Z)msStart('dlg','zeit_aendern',e);return r}})();
(function(){var o=zClose;zClose=function(){MSBACK=true;try{return o.apply(this,arguments)}finally{MSBACK=false}}})();
(function(){var o=zSave;zSave=async function(){var m=MS.dlg,r=await o.apply(this,arguments);if(m&&MS.dlg===m&&!Z)msEnd('dlg','ok');return r}})();
// Bericht gleich aus dem Buchungsblatt: eigener Ablauf mit eigenem Einstieg
(function(){var o=zSaveRg;zSaveRg=async function(){MSE='zeit_buchen';try{return await o.apply(this,arguments)}finally{MSE=''}}})();
(function(){var o=zDel;zDel=async function(){var m=MS.dlg;await o.apply(this,arguments);if(m&&MS.dlg===m&&!Z)msDrop('dlg')}})();

// Regiebericht: Senden = ok; nur gespeicherter Entwurf zählt beim Schließen nicht als Abbruch
(function(){var o=regie;regie=function(){var e=document.querySelector('#dlg #f_k')?'termin':msEntry();msStart('dlg','regie_senden',e);return o.apply(this,arguments)}})();
(function(){var o=rgCust;rgCust=function(){var e=msEntry();msStart('dlg','regie_senden',e+'_ohne_termin');return o.apply(this,arguments)}})();
(function(){var o=rgSave;rgSave=async function(send){var m=MS.dlg,ok=await o.apply(this,arguments);
  if(ok&&m&&MS.dlg===m&&m.flow=='regie_senden'){if(send)msEnd('dlg','ok');else m.draft=true}return ok}})();

// Kunde anlegen (Stammdaten-Fenster)
(function(){var o=kNeuDlg;kNeuDlg=function(init,then){var e=document.querySelector('#dlg #f_k')?'termin':msEntry();
  var r=o.call(this,init,function(c){msEnd('kdlg','ok');if(then)return then(c)});msStart('kdlg','kunde_anlegen',e);return r}})();
// Nur ansehen (gesendeter Bericht, „Bericht ansehen“) ist kein Abbruch
(function(){var o=rgOpen;rgOpen=async function(){var r=await o.apply(this,arguments);if(RG&&RG.ro&&MS.dlg&&MS.dlg.flow=='regie_senden')MS.dlg.draft=true;return r}})();
