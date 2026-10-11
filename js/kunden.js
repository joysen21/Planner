// Planner – Kunden: eigener Reiter mit Liste, Detail (Stammdaten, Notizen, Termine) und Vorschlägen im Termin-Dialog
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
var CUSTOK=false,KF='',KLAST='';
function kById(id){return S.cust.filter(function(c){return c.id==id})[0]}
// Termine eines Kunden: fest verknüpft (customer_id) oder – bei älteren Terminen – über den Namen im Titel
function kJobs(c){var n=c.name.toLowerCase();return S.jobs.filter(function(j){return j.customer_id?j.customer_id==c.id:!!n&&(j.kunde||'').toLowerCase().indexOf(n)>-1})}
function kCanDel(c){return ME.role=='admin'||c.created_by==ME.user_id}

// ---------------------------------------------------------------- Reiter „Kunden“
function kundenView(hd,m){hd.innerHTML='<h1>Kunden</h1>';
 if(!CUSTOK){m.innerHTML='<div class="empty big">'+ic('kunde')+'<br><b>Kundenstamm noch nicht verfügbar</b><br><small>Bitte das Datenbank-Update ausführen.</small></div>';return}
 m.innerHTML='<div class="tbar"><input id="kf" type="search" placeholder="Kunden suchen (Name, Adresse, Telefon, Notiz) …" value="'+esc(KF)+'" oninput="KF=this.value;kListe()"'+NC+' style="flex:1 1 220px;width:auto">'+
  '<button class="b p kneu" onclick="kEdit()">'+ic('plus')+' Neuer Kunde</button></div><div id="kl">'+kListHtml()+'</div>'}
function kListHtml(){var f=KF.trim().toLowerCase(),td=fmt(new Date());
 var ls=S.cust.filter(function(c){return !f||[c.name,c.adresse,c.tel,c.notiz].join(' ').toLowerCase().indexOf(f)>-1}).sort(function(a,b){return a.name.localeCompare(b.name,'de')});
 if(!ls.length)return '<div class="empty big">'+ic('kunde')+'<br><b>'+(S.cust.length?'Kein Kunde gefunden':'Noch keine Kunden')+'</b><br><small>'+(S.cust.length?'Suchbegriff ändern':'Mit „Neuer Kunde“ den ersten Kunden anlegen')+'</small></div>';
 return '<div class="ol">'+ls.map(function(c){var js=kJobs(c),up=js.filter(function(j){return j.start&&j.start>=td&&!j.done}).length;
  return '<div class="job kc" onclick="kEdit(\''+c.id+'\')"><div class="k">'+esc(c.name)+'</div>'+
   '<div class="sub">'+esc([c.adresse,c.tel].filter(Boolean).join(' · ')||'keine Adresse')+'</div>'+
   '<div class="tags"><span class="tag">'+ic('plan')+js.length+' Termin'+(js.length==1?'':'e')+'</span>'+(up?'<span class="tag fx">'+up+' kommend</span>':'')+'</div>'+
   (c.notiz?'<div class="sub nt">'+esc(c.notiz.length>120?c.notiz.slice(0,120)+' …':c.notiz)+'</div>':'')+'</div>'}).join('')+'</div>'}
function kListe(){var l=document.getElementById('kl');if(l)l.innerHTML=kListHtml()}

// ---------------------------------------------------------------- Detail bzw. neuer Kunde
function kEdit(id){var c=id?kById(id):{id:'',name:'',adresse:'',tel:'',notiz:''},d=document.getElementById('dlg'),q='\''+(id||'')+'\'';if(!c)return;
 d.innerHTML='<div class="dt2"><b>'+(id?'Kunde':'Neuer Kunde')+'</b><button class="ib" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div>'+
  '<div class="eg"><div><div class="sec">Stammdaten</div><label>Name</label><input id="k_n" value="'+esc(c.name)+'" placeholder="z. B. Fam. Huber">'+
  '<label>Adresse</label><input id="k_a" value="'+esc(c.adresse)+'"><label>Telefon</label><input id="k_t" type="tel" value="'+esc(c.tel)+'">'+
  (c.tel||c.adresse?'<div class="ft2" style="margin-top:10px">'+(c.tel?'<a class="b" href="tel:'+esc(c.tel)+'">'+ic('phone')+' Anrufen</a>':'')+(c.adresse?'<a class="b" target="_blank" href="https://maps.google.com/?q='+encodeURIComponent(c.adresse)+'">'+ic('route')+' Route</a>':'')+'</div>':'')+
  '<label>Notizen</label><textarea id="k_no" rows="5" placeholder="z. B. Ansprechpartner, Zufahrt, Besonderheiten …">'+esc(c.notiz||'')+'</textarea></div>'+
  (id?'<div><div class="sec">Termine</div><div class="row"><button class="b" onclick="kNeuerTermin('+q+')">'+ic('plus')+' Neuer Termin für diesen Kunden</button></div>'+kTermine(c)+'</div>':'')+'</div>'+
  '<div class="row ft">'+(id&&kCanDel(c)?'<button class="b d" style="flex:none" onclick="kDel('+q+')" title="Kunde löschen">'+ic('trash')+'</button>':'')+
  '<button class="b" onclick="document.getElementById(\'dlg\').close()">Abbrechen</button><button class="b p" onclick="kSaveDlg('+q+',this)">Speichern</button></div>';
 if(!d.open)d.showModal()}
function kTermine(c){var js=kJobs(c),td=fmt(new Date());if(!js.length)return '<div class="sub" style="margin-top:8px">Noch keine Termine für diesen Kunden.</div>';
 var up=js.filter(function(j){return j.start&&j.start>=td}).sort(function(a,b){return a.start<b.start?-1:a.start>b.start?1:t2m(a.zeit||'00:00')-t2m(b.zeit||'00:00')}),
  op=js.filter(function(j){return !j.start}),pa=js.filter(function(j){return j.start&&j.start<td}).sort(function(a,b){return a.start<b.start?1:-1});
 var grp=function(t,l){return l.length?'<div class="lbl" style="margin-top:12px">'+t+' ('+l.length+')</div>'+l.map(qRow).join(''):''};
 return grp('Geplant',up)+grp('Ohne Termin',op)+grp('Vergangen',pa)}
function kSaveDlg(id,b){var g=function(i){return document.getElementById(i).value.trim()},n=g('k_n');if(!n){alert('Bitte einen Namen angeben.');return}
 var ch={name:n,adresse:g('k_a'),tel:g('k_t'),notiz:document.getElementById('k_no').value.trim()};b.disabled=true;
 var p,c;if(id){c=kById(id);Object.assign(c,ch);p=sb.from('customers').update(ch).eq('id',id)}
 else{c=Object.assign({id:uuid()},ch);S.cust.push(Object.assign({created_by:ME.user_id},c));p=sb.from('customers').insert(c)}
 p.then(function(r){b.disabled=false;if(r.error){fail(r.error);return}if(tab=='kunden')render();kEdit(c.id)})}
function kDel(id){var c=kById(id),n=kJobs(c).length;if(!confirm('Kunde „'+c.name+'“ löschen?'+(n?'\n\nDie '+n+' Termine bleiben erhalten, sind dann aber nicht mehr mit dem Kunden verknüpft.':'')))return;
 S.cust=S.cust.filter(function(x){return x.id!=id});S.jobs.forEach(function(j){if(j.customer_id==id)j.customer_id=null});
 document.getElementById('dlg').close();render();sb.from('customers').delete().eq('id',id).then(function(r){if(r.error)fail(r.error)})}
// Neuer Termin mit den Kundendaten vorausgefüllt und fest mit dem Kunden verknüpft
function kNeuerTermin(id){var c=kById(id);edit(null,'',null,null,null,{kunde:c.name,adresse:c.adresse,tel:c.tel,customer_id:c.id})}

// ---------------------------------------------------------------- Termin-Dialog: Kunden vorschlagen / übernehmen
// Kunde speichern (bzw. per Name aktualisieren); KLAST = ID des gespeicherten Kunden
function kSave(name,adresse,tel){var ex=S.cust.filter(function(c){return c.name.toLowerCase()==name.toLowerCase()})[0];
 if(ex){ex.adresse=adresse;ex.tel=tel;KLAST=ex.id;return sb.from('customers').update({adresse:adresse,tel:tel}).eq('id',ex.id)}
 var c={id:uuid(),name:name,adresse:adresse,tel:tel};KLAST=c.id;S.cust.push(Object.assign({created_by:ME.user_id,notiz:''},c));
 return sb.from('customers').insert(c)}
function kSug(){var el=document.getElementById('ksug'),v=document.getElementById('f_k').value.trim().toLowerCase();if(!el)return;
 var ls=v.length<2?[]:S.cust.filter(function(c){return c.name.toLowerCase().indexOf(v)>-1}).slice(0,6);
 el.innerHTML=ls.map(function(c){return '<button type="button" onclick="kPick(\''+c.id+'\')"><b>'+esc(c.name)+'</b><small>'+esc([c.adresse,c.tel].filter(Boolean).join(' · '))+'</small></button>'}).join('')}
function kPick(id){var c=kById(id),g=function(i){return document.getElementById(i)};g('f_k').value=c.name;if(c.adresse)g('f_a').value=c.adresse;if(c.tel)g('f_t').value=c.tel;g('ksug').innerHTML='';cur.j.customer_id=c.id}
function kFromDlg(b){var g=function(i){return document.getElementById(i).value.trim()},n=g('f_k');if(!n){alert('Bitte zuerst Kunde / Titel ausfüllen.');return}
 b.disabled=true;kSave(n,g('f_a'),g('f_t')).then(function(r){b.disabled=false;if(r.error){fail(r.error);return}cur.j.customer_id=KLAST;b.innerHTML=ic('check')+' Als Kunde gespeichert'})}
