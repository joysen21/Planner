// Planner – Besitzer-Seite: Firmen, Lizenzen, Benutzer
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
// ---------------------------------------------------------------- Besitzer: Firmen & Lizenzen
var OWN=[];
function ownerLoad(){sb.rpc('owner_companies').then(function(r){if(r.error){showLogin('Laden fehlgeschlagen: '+r.error.message);return}OWN=r.data;ownerPage()})}
function coById(id){return OWN.filter(function(c){return c.id==id})[0]}
function ownerPage(){var td=fmt(new Date());
 authPage('<div class="own"><div class="login">'+authHead('Besitzer · Firmen & Lizenzen')+'<div class="sub">'+OWN.length+' Firmen · '+OWN.filter(function(c){return c.active}).length+' aktiv'+(function(){var n=OWN.filter(function(c){var d=daysLeft(c.valid_until);return c.active&&d!=null&&d>=0&&d<=30}).length;return n?' · <b class="soonx">'+n+' läuft bald ab</b>':''})()+'</div>'+
 '<div class="row" style="margin-top:10px"><button class="b p" onclick="coEdit()">'+ic('plus')+' Neue Firma</button><button class="b" style="flex:none" onclick="logout()">Abmelden</button></div></div>'+
 (OWN.length?'<div class="ol">'+OWN.map(function(c){var q='\''+c.id+'\'',dl=daysLeft(c.valid_until),st=!c.active?['gesperrt',' bad']:c.valid_until&&c.valid_until<td?['abgelaufen',' bad']:dl!=null&&dl<=30?['läuft in '+dl+' Tag'+(dl==1?'':'en')+' ab',' soon']:['aktiv',''];
  return '<div class="job"><div class="top"><div class="k">'+esc(c.license_id)+'</div><span class="tag'+st[1]+'">'+st[0]+'</span></div>'+
  '<div class="sub"><b>'+esc(c.name)+'</b>'+(c.note?' · '+esc(c.note):'')+'</div>'+
  '<div class="sub">Anmeldungen <b>'+c.logins+' / '+c.max_users+'</b> · Mitarbeiter gesamt '+c.employees+' · gültig '+(c.valid_until?'bis '+dDE(c.valid_until):'unbegrenzt')+'</div>'+
  '<div class="sub">Admin: '+esc(c.admin_username||'–')+'</div>'+
  '<div class="row" style="margin-top:10px"><button class="b" onclick="coEdit('+q+')">'+ic('edit')+' Bearbeiten</button><button class="b" onclick="coUsers('+q+')">'+ic('users')+' Benutzer</button><button class="b d" style="flex:none" onclick="coDel('+q+')" title="Löschen">'+ic('trash')+'</button></div></div>'}).join('')+'</div>'
 :'<div class="empty big">Noch keine Firmen.<br><small>Mit „Neue Firma“ die erste Lizenz vergeben.</small></div>')+'</div>')}
function genPw(){var a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789',r=new Uint32Array(12),s='';crypto.getRandomValues(r);for(var i=0;i<12;i++)s+=a[r[i]%a.length];return s}
function coEdit(id){var c=id?coById(id):null,d=document.getElementById('dlg'),y=new Date();y.setFullYear(y.getFullYear()+1);
 var f=function(i,l,v,ex){return '<label>'+l+'</label><input id="'+i+'" value="'+esc(v==null?'':v)+'"'+(ex||'')+'>'};
 d.innerHTML='<div class="dt2"><b>'+(c?esc(c.license_id)+' bearbeiten':'Neue Firma')+'</b><button class="ib" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div>'+
 (c?'':'<div class="sub">Die Lizenz-ID wird automatisch fortlaufend vergeben.</div>')+
 '<div class="sec">Firma & Lizenz</div>'+f('c_n','Firmenname',c&&c.name)+
 '<div class="g2"><div>'+f('c_m','Anmeldungen (inkl. Admin)',c?c.max_users:5,' type="number" min="1"')+'</div><div>'+f('c_v','Gültig bis (leer = unbegrenzt)',c?c.valid_until:fmt(y),' type="date"')+'</div></div>'+
 f('c_o','Notiz (nur für dich sichtbar)',c&&c.note)+
 (c?'<label class="chk"><input id="c_a" type="checkbox"'+(c.active?' checked':'')+'> Lizenz aktiv</label><div class="sub">Ausgeschaltet kann sich niemand der Firma mehr anmelden. Die Daten bleiben erhalten.</div>'
  :'<div class="sec">Admin der Firma</div>'+f('c_an','Name (Anzeige)','',' placeholder="z. B. Uwe Meier"')+
   '<div class="g2"><div>'+f('c_au','Benutzername','',NC+' placeholder="z. B. uwe"')+'</div><div>'+f('c_ap','Passwort (mind. 10 Zeichen)',genPw(),NC+' autocomplete="off"')+'</div></div>')+
 '<div class="row ft"><button class="b" onclick="document.getElementById(\'dlg\').close()">Abbrechen</button><button class="b p" onclick="coSave(\''+(id||'')+'\',this)">'+(c?'Speichern':'Firma anlegen')+'</button></div>';
 d.showModal()}
function coSave(id,b){var g=function(i){var x=document.getElementById(i);return x?x.value.trim():''},n=g('c_n'),m=parseInt(g('c_m'),10)||0,v=g('c_v')||null;
 if(!n){alert('Bitte den Firmennamen angeben.');return}
 if(m<1){alert('Mindestens 1 Anmeldung (für den Admin).');return}
 if(id){b.disabled=true;sb.rpc('owner_update_company',{p_id:id,p_name:n,p_max_users:m,p_valid_until:v,p_active:document.getElementById('c_a').checked,p_note:g('c_o')}).then(function(r){b.disabled=false;if(!rpcErr(r))ownerLoad()});return}
 var u=g('c_au').toLowerCase(),p=document.getElementById('c_ap').value;if(!chkLogin(u,p,10))return;
 b.disabled=true;sb.rpc('owner_create_company',{p_name:n,p_max_users:m,p_valid_until:v,p_admin_name:g('c_an'),p_admin_username:u,p_admin_password:p,p_note:g('c_o')}).then(function(r){b.disabled=false;if(rpcErr(r))return;
  sb.rpc('owner_companies').then(function(x){if(!x.error)OWN=x.data;ownerPage();showCreds('Firma angelegt',n,r.data,u,p)})})}
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
function coDel(id){var c=coById(id),x=prompt('Firma „'+c.name+'“ mit ALLEN Mitarbeitern, Anmeldungen und Aufträgen endgültig löschen?\n\nZur Bestätigung die Lizenz-ID eingeben: '+c.license_id);if(x==null)return;
 sb.rpc('owner_delete_company',{p_id:id,p_confirm:x}).then(function(r){if(!rpcErr(r))ownerLoad()})}
