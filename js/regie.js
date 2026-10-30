// Planner – Regiebericht am Handy (nur mit ERP-Modul und Recht „Regie“): Stunden, Material, Fotos, Unterschrift, An Büro senden.
// Gespeichert wird in den ERP-Tabellen erp_regie* (dieselben Regeln wie in der ERP, die Datenbank prüft Rechte und Sperren).
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
var RG=null;   // offener Bericht: {job, r (Kopf), hours, mat, photos, urls, others, ro, dirty, signed}
var RGOK=false; // darf Regieberichte schreiben (aus erp_me)

// Recht aus der ERP holen (fehlt das ERP-Modul oder die Funktion, bleibt Regie aus)
async function regieRights(){RGOK=false;if(!ORG||(ORG.modules||[]).indexOf('erp')<0)return;
 try{var r=await sb.rpc('erp_me');var m=r.data;if(r.error||!m)return;
  RGOK=m.employee.plannerRole=='admin'||!!(m.role&&(m.role.isSystem||m.role.perms&&m.role.perms.regie=='write'))}catch(e){}}
// ERP-Kunde des Termins: direkt am Termin oder über den verknüpften Planner-Kunden
function erpCust(j){if(j.erp_customer_id)return j.erp_customer_id;var c=j.customer_id&&(S.cust||[]).filter(function(x){return x.id==j.customer_id})[0];return c&&c.erp_customer_id||null}
function regieBtn(j){if(!RGOK||!j.start||j.art=='urlaub')return '';
 if(!erpCust(j))return '<div class="sub rgh">'+ic('info')+' Regiebericht: Kunde ist noch nicht mit der ERP verknüpft.</div>';
 return '<div class="ft2"><button class="b rgb" onclick="regie(\''+j.id+'\')">'+ic('regie')+' Regiebericht</button></div>'}

function rgHours(h){return Math.round(h*100)/100}
function rgFmt(h){return h.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2})+' h'}
// Vorschlag Stunden aus dem Termin: Uhrzeit oder ganztags (Zeitraum der Firma, ab 6 Stunden 1 Stunde Pause)
function rgDefHours(j){var a=j.zeit||ORG.allday_start||'08:00',b=j.ende||ORG.allday_end||'17:00',m=t2m(b)-t2m(a);if(!j.zeit&&m>360)m-=60;return Math.max(0,Math.round(m/30)/2)}
function rgDay(j,ds){var days=span(j),td=fmt(new Date());if(ds&&days.indexOf(ds)>-1&&ds<=td)return ds;if(days.indexOf(td)>-1)return td;return days.filter(function(d){return d<=td}).pop()||j.start}

async function regie(id,ds){var j=byId(id),d=document.getElementById('dlg');if(!j)return;
 d.innerHTML='<div class="dt2"><b>Regiebericht</b><button class="ib" onclick="rgClose()">'+ic('x')+'</button></div><div class="sub">Wird geladen …</div>';if(!d.open)d.showModal();
 var r=await sb.from('erp_regie').select('*').eq('job_id',id).order('work_date');
 if(r.error){d.querySelector('.sub').textContent='Laden fehlgeschlagen: '+r.error.message;return}
 var all=r.data||[],day=rgDay(j,ds),ex=all.filter(function(x){return x.work_date==day})[0];
 if(ex)await rgOpen(j,ex,all);else rgNew(j,day,all)}

function rgNew(j,day,all){var h=rgDefHours(j);
 var title=(j.notiz||'').split('\n').map(function(l){return l.trim()}).filter(function(l){return l&&l.charAt(0)!='-'})[0]||j.kunde||'';
 RG={job:j,r:{id:null,status:'entwurf',work_date:day,job_id:j.id,customer_id:erpCust(j),order_id:j.erp_order_id||null,title:title.slice(0,200),remark:'',signature_path:null,signer_name:'',signed_at:null},
  hours:wer(j).map(function(id){var u=uById(id);return {employee_id:id,hours:h,article_id:u&&u.erp_labor_article_id||null}}),
  mat:[],photos:[],urls:{},others:all,ro:false,dirty:false,signed:false};
 rgRender()}

async function rgOpen(j,r,all){
 var q=await Promise.all([sb.from('erp_regie_hours').select('*').eq('regie_id',r.id).order('pos'),sb.from('erp_regie_material').select('*').eq('regie_id',r.id).order('pos'),sb.from('erp_regie_photos').select('*').eq('regie_id',r.id)]);
 var e=q.filter(function(x){return x.error})[0];if(e){alert('Laden fehlgeschlagen: '+e.error.message);return}
 RG={job:j,r:r,hours:q[0].data.map(function(x){return {employee_id:x.employee_id,hours:+x.hours,article_id:x.article_id,work_date:x.work_date,time_from:x.time_from,time_to:x.time_to,break_min:x.break_min,activity:x.activity}}),
  mat:q[1].data.map(function(x){return {article_id:x.article_id,text:x.text,qty:+x.qty,unit:x.unit}}),photos:q[2].data,urls:{},others:all,ro:r.status!='entwurf',dirty:false,signed:false};
 rgRender();rgUrls()}
// Vorschaubilder (Fotos, Unterschrift) über zeitlich begrenzte Adressen
function rgUrls(){var p=RG.photos.map(function(x){return x.path});if(RG.r.signature_path)p.push(RG.r.signature_path);
 p.filter(function(x){return !RG.urls[x]}).forEach(function(x){sb.storage.from('erp-files').createSignedUrl(x,3600).then(function(r){if(r.data&&RG){RG.urls[x]=r.data.signedUrl;var im=document.querySelector('#dlg img[data-p="'+x+'"]');if(im)im.src=r.data.signedUrl}})})}

var RGST={entwurf:'Entwurf',eingereicht:'Im Büro',freigegeben:'Freigegeben',abgerechnet:'Abgerechnet'};
function rgRender(){var d=document.getElementById('dlg'),j=RG.job,r=RG.r,ro=RG.ro,tot=rgHours(RG.hours.reduce(function(s,x){return s+x.hours},0));
 var days=span(j).filter(function(x){return x<=fmt(new Date())}),p=parse(r.work_date);
 var h='<div class="dt2"><b>Regiebericht</b><button class="ib" onclick="rgClose()" aria-label="Schließen">'+ic('x')+'</button></div>'+
 '<div class="rgk"><div class="k">'+esc(j.kunde||'(ohne Name)')+'</div><div class="sub">'+esc(r.title||'')+'</div>'+
 '<div class="sub">'+WD[p.getDay()]+' '+dDE(r.work_date)+(r.number?' · '+esc(r.number):'')+' · <span class="rgs '+r.status+'">'+RGST[r.status]+'</span></div></div>';
 // Mehrtägige Termine: je Tag ein Bericht
 if(days.length>1||RG.others.length>1)h+='<div class="seg sm rgd">'+days.map(function(x){var q=parse(x),has=RG.others.some(function(o){return o.work_date==x});
  return '<button class="'+(x==r.work_date?'on':'')+'" onclick="rgSwitch(\''+x+'\')">'+WD[q.getDay()]+' '+q.getDate()+'.'+(has?' ●':'')+'</button>'}).join('')+'</div>';
 if(r.status=='eingereicht')h+='<div class="note">'+ic('info')+' Der Bericht liegt im Büro und wird dort geprüft. Änderungen macht jetzt das Büro.</div>';
 if(r.status=='freigegeben'||r.status=='abgerechnet')h+='<div class="note">'+ic('check')+' Vom Büro freigegeben'+(r.number?' als '+esc(r.number):'')+'.</div>';

 h+='<div class="sec">Arbeitszeit <span class="rgt">'+rgFmt(tot)+'</span></div>'+(!r.id&&!ro&&RG.hours.length?'<div class="sub rgvb">Aus dem Termin vorbelegt'+(j.zeit?' ('+esc(j.zeit)+(j.ende?'–'+esc(j.ende):'')+')':'')+'. Bitte prüfen.</div>':'')+'<div class="rgl">'+RG.hours.map(function(x,i){return '<div class="rgr"><div class="nm">'+esc(uName(x.employee_id))+(x.article_id?'':'<small class="bad">ohne Leistungsartikel – das Büro ergänzt ihn</small>')+'</div>'+
  (ro?'<b class="rgv">'+rgFmt(x.hours)+'</b>':'<div class="stp"><button aria-label="Eine halbe Stunde weniger für '+esc(uName(x.employee_id))+'" onclick="rgH('+i+',-0.5)">−</button><b class="rgv">'+rgFmt(x.hours)+'</b><button aria-label="Eine halbe Stunde mehr für '+esc(uName(x.employee_id))+'" onclick="rgH('+i+',0.5)">+</button></div><button class="ib rgx" aria-label="'+esc(uName(x.employee_id))+' entfernen" onclick="rgDelH('+i+')">'+ic('x')+'</button>')+'</div>'}).join('')+
  (RG.hours.length?'':'<div class="empty">Noch keine Stunden.</div>')+'</div>';
 var free=USERS.filter(function(u){return !RG.hours.some(function(x){return x.employee_id==u.id})});
 if(!ro&&free.length)h+='<select class="rgadd" aria-label="Mitarbeiter hinzufügen" onchange="rgAddH(this.value)"><option value="">＋ Mitarbeiter hinzufügen</option>'+free.map(function(u){return '<option value="'+u.id+'">'+esc(u.display_name)+'</option>'}).join('')+'</select>';

 h+='<div class="sec">Material</div><div class="rgl">'+RG.mat.map(function(x,i){return '<div class="rgr"><div class="nm">'+esc(x.text)+(x.nr?'<small>'+esc(x.nr)+'</small>':'')+'</div>'+
  (ro?'<b class="rgv">'+x.qty.toLocaleString('de-DE')+' '+esc(x.unit)+'</b>':'<div class="stp"><button aria-label="'+esc(x.text)+' verringern" onclick="rgQ('+i+',-1)">−</button><b class="rgv">'+x.qty.toLocaleString('de-DE')+' '+esc(x.unit)+'</b><button aria-label="'+esc(x.text)+' erhöhen" onclick="rgQ('+i+',1)">+</button></div><button class="ib rgx" aria-label="'+esc(x.text)+' entfernen" onclick="rgDelM('+i+')">'+ic('x')+'</button>')+'</div>'}).join('')+
  (RG.mat.length?'':'<div class="empty">Kein Material.</div>')+'</div>';
 if(!ro)h+='<div class="rgsr"><input id="rg_q" type="search" placeholder="＋ Artikel suchen (Nummer oder Name)" autocomplete="off" oninput="rgSearch(this.value)" aria-label="Artikel suchen"><div id="rg_res" class="ksug"></div></div>'+rgRecentHtml();

 h+='<div class="sec">Fotos &amp; Notiz</div><div class="rgph">'+RG.photos.map(function(x){return '<figure><img data-p="'+esc(x.path)+'" src="'+esc(RG.urls[x.path]||'')+'" alt="Foto">'+(ro?'':'<button class="ib rgx" aria-label="Foto entfernen" onclick="rgDelP(\''+x.id+'\')">'+ic('x')+'</button>')+'</figure>'}).join('')+
  (ro?'':'<label class="rgcam">'+ic('plus')+'<span>Foto</span><input type="file" accept="image/*" capture="environment" multiple onchange="rgPhotos(this)"></label>')+'</div>'+
  (ro?(r.remark?'<div class="sub nt">'+esc(r.remark)+'</div>':''):'<textarea id="rg_n" rows="3" placeholder="Notiz für das Büro (z. B. was noch fehlt)" oninput="RG.r.remark=this.value;RG.dirty=true">'+esc(r.remark)+'</textarea>');

 h+='<div class="sec">Unterschrift Kunde</div>';
 if(r.signature_path)h+='<div class="rgsig"><img data-p="'+esc(r.signature_path)+'" src="'+esc(RG.urls[r.signature_path]||'')+'" alt="Unterschrift"><div class="sub">'+esc(r.signer_name||'')+(r.signed_at?' · '+new Date(r.signed_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'')+'</div></div>'+
  (ro?'':'<button class="b" style="width:100%" onclick="RG.r.signature_path=null;RG.r.signer_name=\'\';RG.r.signed_at=null;RG.dirty=true;rgRender()">Neu unterschreiben lassen</button>');
 else if(ro)h+='<div class="empty">Nicht unterschrieben.</div>';
 else h+='<input id="rg_sn" placeholder="Name des Kunden" value="'+esc(r.signer_name)+'" oninput="RG.r.signer_name=this.value"><div class="rgpad"><canvas id="rg_c" aria-label="Unterschriftsfeld"></canvas><span>Hier unterschreiben lassen</span><button class="ib rgx" aria-label="Unterschrift löschen" onclick="rgClear()">'+ic('undo')+'</button></div>';

 if(r.signature_path)h+=rgPdfBtn();
 h+='<div id="rg_e" class="err"></div>';
 if(!ro)h+='<div class="row ft"><button class="b" onclick="rgSave(false)">'+ic('save')+' Speichern</button><button class="b p" onclick="rgSave(true)">'+ic('check')+' An Büro senden</button></div>';
 d.innerHTML=h;if(!ro)rgPad()}

function rgH(i,dx){var x=RG.hours[i];x.hours=Math.max(0,Math.min(24,rgHours(x.hours+dx)));RG.dirty=true;rgRender()}
function rgDelH(i){RG.hours.splice(i,1);RG.dirty=true;rgRender()}
function rgAddH(id){if(!id)return;var u=uById(id);RG.hours.push({employee_id:id,hours:rgDefHours(RG.job),article_id:u&&u.erp_labor_article_id||null});RG.dirty=true;rgRender()}
function rgQ(i,dx){var x=RG.mat[i];x.qty=Math.max(1,x.qty+dx);RG.dirty=true;rgRender()}
function rgDelM(i){RG.mat.splice(i,1);RG.dirty=true;rgRender()}
var rgT=null;
function rgSearch(s){clearTimeout(rgT);var el=document.getElementById('rg_res');s=s.trim();if(!s){el.innerHTML='';return}
 rgT=setTimeout(function(){sb.rpc('erp_regie_articles',{p_search:s,p_kind:'material'}).then(function(r){if(!document.getElementById('rg_res'))return;
  var l=r.data||[];RG.found=l;
  el.innerHTML=l.slice(0,8).map(function(a,i){return '<button type="button" onclick="rgPick('+i+')">'+esc(a.name_de)+'<small>'+esc(a.number)+' · '+esc(a.unit)+'</small></button>'}).join('')+
   '<button type="button" onclick="rgFree()">„'+esc(s)+'“ als freien Text<small>ohne Artikelnummer</small></button>'})},250)}
// Gleicher Artikel nochmal = eine Zeile mehr Menge, keine zweite Zeile
function rgAddArt(a){var x=RG.mat.filter(function(m){return m.article_id==a.id})[0];if(x)x.qty+=1;else RG.mat.push({article_id:a.id,text:a.text,nr:a.nr,qty:1,unit:a.unit});rgRemember(a);RG.dirty=true;rgRender()}
function rgPick(i){var a=RG.found[i];rgAddArt({id:a.id,text:a.name_de,nr:a.number,unit:a.unit||'Stk'})}
// Zuletzt verwendetes Material je Firma auf diesem Gerät
function rgRecentKey(){return 'planner-regie-recent:'+ORG.id}
function rgRecent(){try{return JSON.parse(localStorage.getItem(rgRecentKey())||'[]')}catch(e){return []}}
function rgRemember(a){var l=[a].concat(rgRecent().filter(function(x){return x.id!=a.id})).slice(0,6);try{localStorage.setItem(rgRecentKey(),JSON.stringify(l))}catch(e){}}
function rgRecentHtml(){var l=rgRecent();if(!l.length)return '';return '<div class="rgrec"><span class="sub">Zuletzt verwendet</span>'+l.map(function(a,i){return '<button type="button" class="chip" aria-label="'+esc(a.text)+' hinzufügen" onclick="rgAddRecent('+i+')">＋ '+esc(a.text)+'</button>'}).join('')+'</div>'}
function rgAddRecent(i){var a=rgRecent()[i];if(a)rgAddArt(a)}
function rgFree(){var s=document.getElementById('rg_q').value.trim();if(!s)return;RG.mat.push({article_id:null,text:s.slice(0,300),qty:1,unit:'Stk'});RG.dirty=true;rgRender()}
function rgSwitch(ds){if(RG.dirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;regie(RG.job.id,ds)}
function rgClose(){if(RG&&RG.dirty&&!RG.ro&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;RG=null;document.getElementById('dlg').close()}

// Unterschriftsfeld: Finger, Stift oder Maus; Fläche immer hell, Linie dunkel (wie auf dem PDF)
function rgPad(){var c=document.getElementById('rg_c');if(!c)return;var r=window.devicePixelRatio||1;c.width=c.offsetWidth*r;c.height=c.offsetHeight*r;
 var x=c.getContext('2d');x.scale(r,r);x.lineWidth=2.2;x.lineCap='round';x.lineJoin='round';x.strokeStyle=getComputedStyle(c).getPropertyValue('--ink').trim()||'#1a1f1c';
 var last=null,pt=function(e){var b=c.getBoundingClientRect();return {x:e.clientX-b.left,y:e.clientY-b.top}};
 c.onpointerdown=function(e){c.setPointerCapture(e.pointerId);last=pt(e);c.onpointermove(e)};
 c.onpointermove=function(e){if(!last)return;var p=pt(e);x.beginPath();x.moveTo(last.x,last.y);x.lineTo(p.x+.01,p.y+.01);x.stroke();last=p;if(!RG.signed){RG.signed=true;RG.dirty=true;c.parentNode.classList.add('on')}};
 c.onpointerup=c.onpointercancel=function(){last=null}}
function rgClear(){var c=document.getElementById('rg_c');c.getContext('2d').clearRect(0,0,c.width,c.height);RG.signed=false;c.parentNode.classList.remove('on')}

function rgUpload(blob,ext){var path=ORG.id+'/regie/'+uuid()+'.'+ext;
 return sb.storage.from('erp-files').upload(path,blob,{contentType:blob.type||undefined}).then(function(r){if(r.error)throw r.error;return path})}
// Fotos verkleinern (längste Seite 1600 px, JPEG) – spart Datenvolumen auf der Baustelle
function rgShrink(f){return createImageBitmap(f).then(function(b){var s=Math.min(1,1600/Math.max(b.width,b.height)),c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);c.getContext('2d').drawImage(b,0,0,c.width,c.height);
 return new Promise(function(ok,no){c.toBlob(function(x){x?ok(x):no(new Error('Bild konnte nicht verarbeitet werden.'))},'image/jpeg',.85)})})}
async function rgPhotos(inp){var fs=[].slice.call(inp.files||[]);inp.value='';if(!fs.length)return;
 try{if(!RG.r.id&&!(await rgSave(false,true)))return;
  for(var i=0;i<fs.length;i++){var path=await rgUpload(await rgShrink(fs[i]),'jpg'),row={id:uuid(),regie_id:RG.r.id,path:path,caption:''};
   var r=await sb.from('erp_regie_photos').insert(row);if(r.error)throw r.error;RG.photos.push(row)}
  rgRender();rgUrls()}catch(e){rgErr(e)}}
async function rgDelP(id){var r=await sb.from('erp_regie_photos').delete().eq('id',id);if(r.error){rgErr(r.error);return}RG.photos=RG.photos.filter(function(x){return x.id!=id});rgRender()}
function rgErr(e){var el=document.getElementById('rg_e');if(el)el.textContent='Speichern fehlgeschlagen: '+(e&&e.message||e)}

// Speichern wie in der ERP: Kopf, dann Stunden und Material komplett ersetzen; „An Büro senden“ setzt den Status auf eingereicht
async function rgSave(send,quiet){var r=RG.r,el=document.getElementById('rg_e');if(el)el.textContent='';
 if(send&&!RG.hours.some(function(x){return x.hours>0})&&!RG.mat.length){rgErr('Bitte Stunden oder Material eintragen.');return false}
 var bs=document.querySelectorAll('#dlg .ft .b');bs.forEach(function(b){b.disabled=true});
 try{
  if(RG.signed){var c=document.getElementById('rg_c'),blob=await new Promise(function(ok){c.toBlob(ok,'image/png')});
   r.signature_path=await rgUpload(blob,'png');r.signer_name=(document.getElementById('rg_sn').value||'').trim().slice(0,120);r.signed_at=new Date().toISOString();RG.signed=false}
  var head={work_date:r.work_date,title:r.title,remark:(r.remark||'').slice(0,4000),signature_path:r.signature_path,signer_name:r.signer_name||'',signed_at:r.signed_at},q;
  if(!r.id){r.id=uuid();q=await sb.from('erp_regie').insert(Object.assign({id:r.id,job_id:r.job_id,customer_id:r.customer_id,order_id:r.order_id},head));if(q.error){r.id=null;throw q.error}RG.others=RG.others.concat([Object.assign({},r)])}
  else{q=await sb.from('erp_regie').update(head).eq('id',r.id);if(q.error)throw q.error}
  q=await sb.from('erp_regie_hours').delete().eq('regie_id',r.id);if(q.error)throw q.error;
  q=await sb.from('erp_regie_material').delete().eq('regie_id',r.id);if(q.error)throw q.error;
  var hs=RG.hours.map(function(x,i){return {regie_id:r.id,pos:(i+1)*10,work_date:x.work_date||r.work_date,employee_id:x.employee_id,hours:x.hours,article_id:x.article_id,time_from:x.time_from||'',time_to:x.time_to||'',break_min:x.break_min||0,activity:x.activity||''}});
  var ms=RG.mat.map(function(x,i){return {regie_id:r.id,pos:(i+1)*10,article_id:x.article_id,text:x.text,qty:x.qty,unit:x.unit}});
  if(hs.length){q=await sb.from('erp_regie_hours').insert(hs);if(q.error)throw q.error}
  if(ms.length){q=await sb.from('erp_regie_material').insert(ms);if(q.error)throw q.error}
  if(send){q=await sb.from('erp_regie').update({status:'eingereicht'}).eq('id',r.id);if(q.error)throw q.error;r.status='eingereicht';RG.ro=true}
  RG.dirty=false;
  if(send){rgDone();return true}
  if(!quiet){rgRender();rgUrls();rgToast('Gespeichert')}
  return true}
 catch(e){rgErr(e);bs.forEach(function(b){b.disabled=false});return false}}
function rgDone(){var tot=rgHours(RG.hours.reduce(function(s,x){return s+x.hours},0)),n=RG.mat.length,d=document.getElementById('dlg');
 d.innerHTML='<div class="dt2"><b>Regiebericht</b><button class="ib" onclick="rgClose()" aria-label="Schließen">'+ic('x')+'</button></div>'+
 '<div class="rgok">'+ic('check')+'<h2>Bericht übermittelt</h2><p class="sub">'+rgFmt(tot)+' und '+n+' Materialposition'+(n==1?'':'en')+' liegen jetzt im Büro als Grundlage für die Rechnung.</p>'+(RG.r.signature_path?rgPdfBtn():'')+
 '<div class="row"><button class="b" onclick="regie(\''+RG.job.id+'\',\''+RG.r.work_date+'\')">Bericht ansehen</button><button class="b p" onclick="rgClose()">Fertig</button></div></div>'}
function rgToast(t){var el=document.getElementById('rg_e');if(!el)return;el.className='ok';el.textContent=t;setTimeout(function(){if(el.isConnected){el.textContent='';el.className='err'}},2000)}
