// Planner – Seitenaufbau (render), Einstellungen, Mitarbeiter, Kunden, App installieren
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
function render(){render0();if(tab!='mehr')document.getElementById('hd').insertAdjacentHTML('afterbegin','<button class="ib pl" onclick="nw()" title="Neuer Termin">'+ic('plus')+'</button>');
 if(expired())document.getElementById('main').insertAdjacentHTML('afterbegin','<div class="warn">'+ic('alert')+' Die Lizenz ist am <b>'+dDE(ORG.valid_until)+'</b> abgelaufen – der Plan kann nur noch angesehen werden. '+(ME.role=='admin'?'Zur Verlängerung bitte an JoKe Smart Solutions wenden.':'Bitte den Admin informieren.')+'</div>');
 else if(ME.role=='admin'&&daysLeft()!=null&&daysLeft()<=30)document.getElementById('main').insertAdjacentHTML('afterbegin','<div class="note">'+ic('clock')+' Die Lizenz läuft '+(daysLeft()==0?'<b>heute</b>':'in <b>'+daysLeft()+' Tag'+(daysLeft()==1?'':'en')+'</b>')+' ab (am '+dDE(ORG.valid_until)+'). Zur Verlängerung bitte an JoKe Smart Solutions wenden.</div>');
 detRefresh()}
function render0(){mkH();
 var hd=document.getElementById('hd'),m=document.getElementById('main');
 document.getElementById('oc').textContent='Offen ('+S.jobs.filter(function(j){return !j.start&&vis(j)}).length+')';
 document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('on',b.dataset.t==tab)});
 if(tab=='plan'){plan(hd,m)}else if(tab=='kunden'){kundenView(hd,m)}else if(tab=='offen'){
  hd.innerHTML='<h1>Noch ohne Termin'+fltSub()+'</h1>';
  var o=S.jobs.filter(function(j){return !j.start&&vis(j)});
  m.innerHTML='<div class="tbar"><span class="sp"></span><button class="b" onclick="showSearch()" title="Suchen">'+ic('search')+'<span class="tlb"> Suchen</span></button></div>'+fltBar()+(o.length?'<div class="ol">'+o.map(function(j){return card(j,'')}).join('')+'</div>':'<div class="empty big">'+ic('auftraege')+'<br><b>Nichts offen</b><br><small>Mit '+ic('plus')+' einen Auftrag ohne Termin anlegen</small></div>')
 }else{
  hd.innerHTML='<h1>Einstellungen</h1>';
  var adm=ME.role=='admin',nd=S.jobs.filter(function(j){return j.done}).length;
  // Einstellungen als klar getrennte Abschnitte (Breitbild: zweispaltig)
  var P={konto:pnl(ic('user')+'Mein Konto','<div class="kv"><span>Name</span><b>'+esc(ME.display_name)+'</b><span>Benutzername</span><b>'+esc(ME.username)+(adm?' · Admin':'')+'</b><span>Firma</span><b>'+esc(ORG.name)+'</b><span>Lizenz-ID</span><b>'+esc(ORG.license_id)+'</b></div>'+
   '<label>Neues Passwort</label><div class="row"><input id="pw1" type="password" autocomplete="new-password" placeholder="mind. '+pwMin()+' Zeichen" style="flex:1 1 160px"><button class="b" style="flex:none" onclick="ownPw()">Ändern</button></div>'+
   '<label>Darstellung</label><div class="seg sm thm">'+[['auto','Automatisch',''],['light','Hell','urlaub'],['dark','Dunkel','moon']].map(function(x){return '<button class="'+(curTheme()==x[0]?'on':'')+'" onclick="setTheme(\''+x[0]+'\')">'+(x[2]?ic(x[2])+' ':'')+x[1]+'</button>'}).join('')+'</div>'+
   '<div class="row" style="margin-top:6px"><button class="b d" style="flex:none" onclick="logout()">'+ic('logout')+' Abmelden</button></div>'),
  lic:adm?pnl(ic('key')+'Lizenz',lsec()):'',
  ma:adm?pnl(ic('users')+'Mitarbeiter',usec(),'wide'):'',
  hol:pnl(ic('flag')+'Feiertage Südtirol',hsec(adm)),
  done:!adm?'':pnl(ic('check')+'Erledigte Aufträge','<div class="sub">'+nd+' erledigte Aufträge (aller Mitarbeiter) sind gespeichert.</div><div class="row" style="margin-top:10px"><button class="b" style="flex:none" onclick="clearDone()"'+(nd?'':' disabled')+'>Erledigte löschen</button></div>'),
  app:appSec(),
  az:adm?pnl(ic('clock')+'Ganztägige Termine','<div class="sub">Ganztägige Termine werden im Kalender in diesem Zeitraum angezeigt.</div>'+
   '<div class="row" style="margin-top:10px"><div style="flex:1"><label>von</label><select id="ad_s">'+tOpts(ORG.allday_start||'08:00')+'</select></div><div style="flex:1"><label>bis</label><select id="ad_e">'+tOpts(ORG.allday_end||'17:00')+'</select></div></div>'+
   '<div class="row"><button class="b" style="flex:none" onclick="saveAd(this)">Speichern</button></div>'):'',
  bk:pnl(ic('save')+'Backup','<div class="sub">Die Daten liegen in der Datenbank und sind auf allen Geräten gleich. Hier kann eine Sicherung kopiert werden'+(adm?' – oder ein Backup der alten Handy-Version eingefügt und übernommen werden.':'.')+'</div>'+
   '<div class="row" style="margin-top:10px"><button class="b" onclick="exp()">Backup kopieren</button>'+(adm?'<button class="b p" onclick="imp()">Einfügen &amp; übernehmen</button>':'')+'</div><textarea id="bk" rows="4" placeholder="'+(adm?'Backup hier einfügen':'')+'"></textarea>')};
  // Breitbild: zwei Spalten, in denen sich die Kästen lückenlos stapeln; Mitarbeiter über die volle Breite
  m.innerHTML=(adm?cols(P.konto,P.lic,true)+P.ma+cols(P.hol+P.app,P.az+P.bk+P.done):cols(P.konto+P.app,P.hol+P.bk))+
  '<div class="mfoot">'+LOGO_H+'<span>Planner</span></div>'
 }
}
// Als App installieren: Android/Chrome über den Installations-Dialog, iPhone über „Zum Home-Bildschirm“
var IP=null;
addEventListener('beforeinstallprompt',function(e){e.preventDefault();IP=e;if(ME&&tab=='mehr')render()});
addEventListener('appinstalled',function(){IP=null;if(ME&&tab=='mehr')render()});
function isApp(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||navigator.platform=='MacIntel'&&navigator.maxTouchPoints>1}
function appSec(){if(isApp())return '';
 return pnl(ic('download')+'App installieren','<div class="sub">Planner als App auf diesem Gerät installieren – mit eigenem Symbol auf dem Home-Bildschirm und ohne Browserleiste.</div>'+
  (IP?'<div class="row" style="margin-top:10px"><button class="b p" style="flex:none" onclick="instApp()">'+ic('download')+' App installieren</button></div>'
   :isIOS()?'<div class="sub" style="margin-top:8px">Auf dem iPhone/iPad: in <b>Safari</b> unten auf <b>Teilen</b> tippen, dann <b>„Zum Home-Bildschirm“</b>.</div>'
   :'<div class="sub" style="margin-top:8px">Im Browser-Menü <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b> wählen.</div>'))}
function instApp(){if(!IP)return;IP.prompt();IP.userChoice.then(function(){IP=null;render()})}
function saveAd(b){var a=document.getElementById('ad_s').value,e=document.getElementById('ad_e').value;if(a>=e){alert('Das Ende muss nach dem Beginn liegen.');return}
 b.disabled=true;sb.rpc('admin_set_allday',{p_start:a,p_end:e}).then(function(r){b.disabled=false;if(rpcErr(r))return;ORG.allday_start=a;ORG.allday_end=e;alert('Gespeichert: ganztägige Termine von '+a+' bis '+e+'.');render()})}
function pnl(t,b,c){return '<section class="pnl'+(c?' '+c:'')+'"><h2>'+t+'</h2>'+b+'</section>'}
function cols(a,b,eq){return '<div class="pgrid'+(eq?' eq':'')+'"><div class="pcol">'+a+'</div><div class="pcol">'+b+'</div></div>'}
// Lizenz: belegte Anmeldungen und Laufzeit (ändern kann nur der Besitzer der Seite)
function lsec(){var n=nLogins(),p=Math.min(100,Math.round(n*100/ORG.max_users));
 return '<div class="kv"><span>Lizenz-ID</span><b>'+esc(ORG.license_id)+'</b><span>Anmeldungen</span><b>'+n+' von '+ORG.max_users+' belegt</b><span>Ohne Anmeldung</span><b>unbegrenzt</b><span>Gültig</span><b'+(expired()?' style="color:var(--bad)"':'')+'>'+(ORG.valid_until?'bis '+dDE(ORG.valid_until):'unbegrenzt')+'</b></div>'+
  '<div class="meter'+(n>=ORG.max_users?' full':'')+'"><i style="width:'+p+'%"></i></div>'+
  '<div class="sub" style="margin-top:10px">Mehr Anmeldungen oder Verlängerung: bitte an JoKe Smart Solutions wenden.</div>'}
// Mitarbeiter: mit Anmeldung (zählt zur Lizenz) oder ohne Anmeldung (nur verplanbar)
function usec(){var full=nLogins()>=ORG.max_users;
 return '<div class="sub">Mitarbeiter <b>mit Anmeldung</b> melden sich mit Lizenz-ID <b>'+esc(ORG.license_id)+'</b>, Benutzername und Passwort an. Mitarbeiter <b>ohne Anmeldung</b> werden nur verplant und zählen nicht zur Lizenz.</div><div class="ul">'+USERS.map(function(u){var me=u.id==ME.id,q='\''+u.id+'\'';
  return '<div class="ur"><input type="color" value="'+esc(u.color)+'" onchange="uUpd('+q+',{color:this.value})" title="Farbe im Kalender"><div class="nm"><input value="'+esc(u.display_name)+'" onchange="uUpd('+q+',{display_name:this.value.trim()||this.defaultValue})"><small>'+(u.role=='admin'?'Admin · Benutzername: <b>'+esc(u.username||'–')+'</b>':u.user_id?'Benutzername: <b>'+esc(u.username)+'</b>':'Ohne Anmeldung (nur Planung)')+'</small></div>'+
  (u.role=='admin'?'':u.user_id?'<button class="b" onclick="uUname('+q+')">'+ic('edit')+' Benutzername</button><button class="b" onclick="uPw('+q+')">'+ic('key')+' Passwort</button><button class="b" onclick="uNoLogin('+q+')">Anmeldung entfernen</button>':'<button class="b" onclick="uLogin('+q+')"'+(full?' disabled title="Lizenzlimit erreicht"':'')+'>'+ic('plus')+' Anmeldung</button>')+
  (me?'':'<button class="b d" onclick="uDel('+q+')" title="Löschen">'+ic('trash')+'</button>')+'</div>'}).join('')+'</div>'+
  '<div class="sec">Neuer Mitarbeiter</div><div class="g2"><div><label>Name (Anzeige)</label><input id="u_n" placeholder="z. B. Stefan"></div><div><label>Farbe</label><input id="u_c" type="color" value="'+COLORS[USERS.length%COLORS.length]+'"></div></div>'+
  '<label class="chk"><input id="u_l" type="checkbox" onchange="document.getElementById(\'u_lb\').style.display=this.checked?\'\':\'none\'"'+(full?' disabled':' checked')+'> Darf sich anmelden'+(full?' (Lizenzlimit erreicht)':'')+'</label>'+
  '<div id="u_lb" class="g2"'+(full?' style="display:none"':'')+'><div><label>Benutzername</label><input id="u_u" placeholder="z. B. stefan"'+NC+'></div><div><label>Passwort</label><input id="u_p" type="text" autocomplete="off" placeholder="mind. 8 Zeichen"></div></div>'+
  '<div class="row"><button class="b p" onclick="uNew(this)">'+ic('plus')+' Mitarbeiter anlegen</button></div>'}
function rpcErr(r){if(r.error){alert(r.error.message);return true}return false}
// Passwort-Mindestlänge: Firmen-Admins 10, Mitarbeiter 8 Zeichen
function pwMin(){return ME&&ME.role=='admin'?10:8}
function chkLogin(u,p,min){min=min||8;
 if(!/^[a-z0-9][a-z0-9._-]{1,29}$/.test(u)){alert('Benutzername: 2–30 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich (keine Umlaute, keine Leerzeichen).');return false}
 if(p.length<min){alert('Passwort: mindestens '+min+' Zeichen.');return false}return true}
function loginMsg(u){return 'Anmeldung mit\nLizenz-ID: '+ORG.license_id+'\nBenutzername: '+u+'\nPasswort: das eben vergebene'}
function uNew(b){var g=function(i){return document.getElementById(i).value.trim()},n=g('u_n'),u=g('u_u').toLowerCase(),p=document.getElementById('u_p').value;
 if(!document.getElementById('u_l').checked){if(!n){alert('Bitte einen Namen angeben.');return}
  b.disabled=true;sb.rpc('admin_add_employee',{p_display_name:n,p_color:g('u_c')}).then(function(r){b.disabled=false;if(!rpcErr(r))reload()});return}
 if(!chkLogin(u,p))return;
 b.disabled=true;sb.rpc('admin_create_user',{p_username:u,p_password:p,p_display_name:n||u,p_color:g('u_c')}).then(function(r){b.disabled=false;if(rpcErr(r))return;alert('Mitarbeiter angelegt.\n\n'+loginMsg(u));reload()})}
function uLogin(id){var s=uName(id).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9._-]/g,'');
 var u=prompt('Benutzername für '+uName(id)+' (a–z, 0–9, Punkt, Minus, Unterstrich):',s);if(u==null)return;u=u.trim().toLowerCase();
 var p=prompt('Passwort für '+uName(id)+' (mind. 8 Zeichen):');if(p==null||!chkLogin(u,p))return;
 sb.rpc('admin_create_login',{p_id:id,p_username:u,p_password:p}).then(function(r){if(rpcErr(r))return;alert('Anmeldung angelegt.\n\n'+loginMsg(u));reload()})}
function uNoLogin(id){if(!confirm(uName(id)+': Anmeldung entfernen?\n\nDie Person bleibt mit allen Terminen als Mitarbeiter erhalten, kann sich aber nicht mehr anmelden. Der Lizenzplatz wird frei.'))return;
 sb.rpc('admin_remove_login',{p_id:id}).then(function(r){if(!rpcErr(r))reload()})}
function uUpd(id,ch){var u=uById(id);Object.assign(u,ch);sb.from('employees').update(ch).eq('id',id).then(function(r){if(r.error)fail(r.error);else render()})}
// Firmen-Admin: Benutzername eines Mitarbeiters ändern (neue Anmeldung: Lizenz-ID + neuer Benutzername)
function uUname(id){var u=uById(id),v=prompt('Neuer Benutzername für '+u.display_name+' (a–z, 0–9, Punkt, Minus, Unterstrich):',u.username||'');if(v==null)return;v=v.trim().toLowerCase();if(v==u.username)return;
 if(!/^[a-z0-9][a-z0-9._-]{1,29}$/.test(v)){alert('Benutzername: 2–30 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich (keine Umlaute, keine Leerzeichen).');return}
 sb.rpc('admin_set_username',{p_id:id,p_username:v}).then(function(r){if(rpcErr(r))return;alert('Benutzername geändert.\n\n'+loginMsg(v).replace('Passwort: das eben vergebene','Passwort: unverändert'));reload()})}
function uPw(id){var p=prompt('Neues Passwort für '+uName(id)+' (mind. 8 Zeichen):');if(p==null)return;if(p.length<8){alert('Passwort: mindestens 8 Zeichen.');return}
 sb.rpc('admin_set_password',{p_id:id,p_password:p}).then(function(r){if(!rpcErr(r))alert('Passwort geändert.')})}
function uDel(id){if(!confirm(uName(id)+' wirklich löschen? Die Person wird aus allen Aufträgen entfernt'+(uById(id).user_id?' und kann sich nicht mehr anmelden':'')+'.'))return;
 sb.rpc('admin_delete_employee',{p_id:id}).then(function(r){if(!rpcErr(r)){if(FLT==id)FLT='me';reload()}})}
function ownPw(){var p=document.getElementById('pw1').value;if(p.length<pwMin()){alert('Passwort: mindestens '+pwMin()+' Zeichen.');return}
 sb.auth.updateUser({password:p}).then(function(r){if(r.error)alert(r.error.message);else{document.getElementById('pw1').value='';alert('Passwort geändert.')}})}
function logout(){sb.auth.signOut().then(function(){showLogin()})}
