// Planner – Besitzer-Seite: Firmen, Lizenzen, Benutzer
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
// ---------------------------------------------------------------- Besitzer: Firmen & Lizenzen
var OWN=[];
function ownerLoad(){sb.rpc('owner_companies').then(function(r){if(r.error){showLogin('Laden fehlgeschlagen: '+r.error.message);return}OWN=r.data;ownerPage()})}
function coById(id){return OWN.filter(function(c){return c.id==id})[0]}
function ownerPage(){var td=fmt(new Date());
 authPage('<div class="own"><div class="login">'+authHead('Besitzer · Firmen & Lizenzen')+'<div class="sub">'+OWN.length+' Firmen · '+OWN.filter(function(c){return c.active}).length+' aktiv'+(function(){var n=OWN.filter(function(c){var d=daysLeft(c.valid_until);return c.active&&d!=null&&d>=0&&d<=30}).length;return n?' · <b class="soonx">'+n+' läuft bald ab</b>':''})()+'</div>'+
 '<div class="row" style="margin-top:10px"><button class="b" style="flex:none" onclick="logout()">Abmelden</button></div></div>'+
 '<div class="note ro"><b>Lizenzen werden jetzt in Clear verwaltet.</b> Hier nur zur Ansicht. Neue Firmen, Plätze, Laufzeit und Sperren bitte in Clear ändern. Benutzer ansehen und Passwörter zurücksetzen geht weiterhin hier.</div>'+
 (OWN.length?'<div class="ol">'+OWN.map(function(c){var q='\''+c.id+'\'',dl=daysLeft(c.valid_until),st=!c.active?['gesperrt',' bad']:c.valid_until&&c.valid_until<td?['abgelaufen',' bad']:dl!=null&&dl<=30?['läuft in '+dl+' Tag'+(dl==1?'':'en')+' ab',' soon']:['aktiv',''];
  return '<div class="job"><div class="top"><div class="k">'+esc(c.license_id)+'</div><span class="tag'+st[1]+'">'+st[0]+'</span></div>'+
  '<div class="sub"><b>'+esc(c.name)+'</b>'+(c.note?' · '+esc(c.note):'')+'</div>'+
  '<div class="sub">Anmeldungen <b>'+c.logins+' / '+c.max_users+'</b> · Mitarbeiter gesamt '+c.employees+' · gültig '+(c.valid_until?'bis '+dDE(c.valid_until):'unbegrenzt')+'</div>'+
  '<div class="sub">Admin: '+esc(c.admin_username||'–')+'</div>'+
  '<div class="row" style="margin-top:10px"><button class="b" onclick="coUsers('+q+')">'+ic('users')+' Benutzer</button></div></div>'}).join('')+'</div>'
 :'<div class="empty big">Noch keine Firmen.<br><small>Neue Lizenzen legst du in Clear an.</small></div>')+'</div>')}
function genPw(){var a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789',r=new Uint32Array(12),s='';crypto.getRandomValues(r);for(var i=0;i<12;i++)s+=a[r[i]%a.length];return s}
// Zugangsdaten zum Weitergeben anzeigen (das Passwort wird danach nirgends mehr angezeigt)
function showCreds(t,name,lic,u,p){var d=document.getElementById('dlg'),txt='Planner – Zugang für '+name+'\nAdresse: '+location.origin+location.pathname+'\nLizenz-ID: '+lic+'\nBenutzername: '+u+'\nPasswort: '+p;
 d.innerHTML='<div class="dt2"><b>'+esc(t)+'</b><button class="ib" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div><div class="sub">Zugangsdaten für den Admin – jetzt kopieren und weitergeben. Das Passwort wird später nicht mehr angezeigt.</div>'+
 '<textarea id="cr" rows="6" readonly style="margin-top:10px">'+esc(txt)+'</textarea><div class="row ft"><button class="b p" onclick="copyCr(this)">'+ic('copy')+' Kopieren</button></div>';
 if(!d.open)d.showModal()}
function copyCr(b){var a=document.getElementById('cr');a.select();try{navigator.clipboard.writeText(a.value)}catch(e){}b.innerHTML=ic('check')+' Kopiert'}
// Besitzer: Benutzernamen und Passwörter aller Anmeldungen einer Firma (auch des Firmen-Admins)
var CU=[];
function coUsers(id){var c=coById(id),d=document.getElementById('dlg');
 sb.rpc('owner_company_users',{p_org:id}).then(function(r){if(rpcErr(r))return;CU=(r.data||[]).filter(function(u){return u.has_login});
  d.innerHTML='<div class="dt2"><b>Benutzer · '+esc(c.name)+'</b><button class="ib" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div>'+
  '<div class="sub">Anmeldung mit Lizenz-ID <b>'+esc(c.license_id)+'</b>, Benutzername und Passwort. Ein geänderter Benutzername gilt ab dem nächsten Anmelden.</div>'+
  (CU.length?'<div class="ul" style="margin-top:10px">'+CU.map(function(u){var q='\''+u.id+'\',\''+id+'\'';
   return '<div class="ur"><div class="nm">'+esc(u.display_name)+'<small>'+(u.role=='admin'?'Admin':'Mitarbeiter')+'</small></div><input id="cu_'+u.id+'" value="'+esc(u.username||'')+'"'+NC+' style="flex:1 1 140px;width:auto" aria-label="Benutzername">'+
   '<button class="b" onclick="coUname('+q+')">'+ic('check')+' Speichern</button><button class="b" onclick="coUpw('+q+')">'+ic('key')+' Passwort</button></div>'}).join('')+'</div>'
   :'<div class="sub" style="margin-top:10px">Diese Firma hat keine Mitarbeiter mit Anmeldung.</div>');
  // nach dem Schließen die Firmenliste aktualisieren (Admin-Benutzername)
  d.onclose=function(){d.onclose=null;if(!ME)sb.rpc('owner_companies').then(function(x){if(x.error)return;OWN=x.data;if(!d.open)ownerPage()})};
  if(!d.open)d.showModal()})}
function coUname(emp,org){var v=document.getElementById('cu_'+emp).value.trim().toLowerCase(),u=CU.filter(function(x){return x.id==emp})[0];
 if(u&&u.username==v)return;
 if(!/^[a-z0-9][a-z0-9._-]{1,29}$/.test(v)){alert('Benutzername: 2–30 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich.');return}
 sb.rpc('owner_set_username',{p_emp:emp,p_username:v}).then(function(r){if(rpcErr(r))return;alert('Benutzername von '+u.display_name+' ist jetzt „'+v+'“.');coUsers(org)})}
function coUpw(emp,org){var c=coById(org),u=CU.filter(function(x){return x.id==emp})[0],min=u.role=='admin'?10:8;
 var p=prompt('Neues Passwort für '+u.display_name+' (mind. '+min+' Zeichen):',genPw());if(p==null)return;if(p.length<min){alert('Passwort: mindestens '+min+' Zeichen.');return}
 sb.rpc('owner_set_password',{p_emp:emp,p_password:p}).then(function(r){if(!rpcErr(r))showCreds('Passwort geändert',c.name,c.license_id,u.username,p)})}
// ---------------------------------------------------------------- Einladung als Firmen-Admin (Link aus Clear)
// Link: …/#einladung=<token>. Der Token steht nur im Hash (geht nie an einen Server) und gilt 7 Tage, einmal.
var INV=null;
function inviteToken(){var m=location.hash.match(/^#einladung=([A-Za-z0-9_-]{20,})$/);return m?m[1]:''}
function inviteHead(){return authHead('Einladung als Firmen-Admin')}
function invitePage(){var t=inviteToken();
 authPage('<div class="login">'+inviteHead()+'<div class="sub" style="margin-top:10px">Einladung wird geprüft …</div></div>');
 sb.rpc('invite_info',{p_token:t}).then(function(r){
  if(r.error){inviteDead('Die Einladung konnte nicht geprüft werden: '+r.error.message);return}
  var i=r.data||{};INV=i;
  if(i.state=='used'){inviteDead('Dieser Einladungslink wurde schon benutzt. Wenn du dein Konto angelegt hast, melde dich einfach an.');return}
  if(i.state=='blocked'){inviteDead('Die Lizenz dieser Firma ist gesperrt. Bitte an JoKe Smart Solutions wenden.');return}
  if(i.state!='open'){inviteDead('Dieser Einladungslink ist nicht mehr gültig. Er war 7 Tage gültig und kann nur einmal benutzt werden.');return}
  authPage('<form class="login" id="inv" onsubmit="return inviteSave(event)" novalidate>'+inviteHead()+
  '<div class="invf"><b>'+esc(i.company)+'</b>Lizenz-ID <span class="lic">'+esc(i.licenseId)+'</span></div>'+
  '<label for="i_n">Dein Name</label><input id="i_n" value="'+esc(i.adminName||'')+'" autocomplete="name">'+
  '<label for="i_u">Benutzername</label><input id="i_u" autocomplete="username"'+NC+' placeholder="z. B. stefan" aria-describedby="i_uh">'+
  '<div class="sub" id="i_uh">Kleinbuchstaben, Ziffern, Punkt, Minus oder Unterstrich. Damit meldest du dich später an.</div>'+
  '<label for="i_p">Passwort</label><input id="i_p" type="password" autocomplete="new-password" aria-describedby="i_ph">'+
  '<div class="sub" id="i_ph">Mindestens 10 Zeichen.</div>'+
  '<label for="i_p2">Passwort wiederholen</label><input id="i_p2" type="password" autocomplete="new-password">'+
  '<div id="i_e" class="err" role="alert"></div><button class="b p" style="width:100%;margin-top:8px">Konto anlegen</button>'+
  '<div class="sub" style="margin-top:12px;text-align:center">Der Link gilt bis '+dDE(String(i.expiresAt).slice(0,10))+' und nur einmal.</div></form>')})}
function inviteDead(msg){authPage('<div class="login">'+inviteHead()+'<div class="note" style="margin-top:12px">'+esc(msg)+'</div>'+
 '<div class="sub">Einen neuen Link bekommst du bei JoKe Smart Solutions.</div><button class="b" style="width:100%;margin-top:12px" onclick="inviteDone()">Zur Anmeldung</button></div>')}
function inviteSave(e){e.preventDefault();var g=function(i){return document.getElementById(i).value},er=document.getElementById('i_e'),b=e.target.querySelector('.b.p'),
 u=g('i_u').trim().toLowerCase(),p=g('i_p');
 var bad=function(m,f){er.textContent=m;document.getElementById(f).focus();return false};
 if(!/^[a-z0-9][a-z0-9._-]{1,29}$/.test(u))return bad('Benutzername: 2–30 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich (keine Umlaute, keine Leerzeichen).','i_u');
 if(p.length<10)return bad('Das Passwort braucht mindestens 10 Zeichen.','i_p');
 if(p!==g('i_p2'))return bad('Die Passwörter stimmen nicht überein.','i_p2');
 b.disabled=true;er.textContent='';
 sb.rpc('invite_accept',{p_token:inviteToken(),p_name:g('i_n').trim(),p_username:u,p_password:p}).then(function(r){b.disabled=false;
  if(r.error){er.textContent=r.error.message;return}
  lsSet('planer_lizenz',r.data.licenseId);
  authPage('<div class="login invok">'+inviteHead()+'<div class="big" aria-hidden="true">'+ic('check')+'</div><h2>Fertig! Dein Konto ist angelegt.</h2>'+
  '<div class="invf"><div><span>Lizenz-ID</span><b class="lic">'+esc(r.data.licenseId)+'</b></div><div><span>Benutzername</span><b>'+esc(r.data.username)+'</b></div></div>'+
  '<div class="sub">Diese Angaben brauchst du bei jeder Anmeldung. Weitere Mitarbeiter legst du danach unter Einstellungen an.</div>'+
  '<button class="b p" style="width:100%;margin-top:12px" onclick="inviteDone()">Zur Anmeldung</button></div>')});return false}
// Link aus der Adresse nehmen (nicht im Verlauf lassen), dann normale Anmeldung
function inviteDone(){history.replaceState(null,'',location.pathname+location.search);showLogin()}
