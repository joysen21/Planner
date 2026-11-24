// Planner – Zeiten buchen (nur mit ERP-Modul und Recht „Regie bearbeiten“): am Termin, fürs Team, ohne Termin,
// dazu der Reiter „Zeiten“ mit der eigenen Woche. Gespeichert wird in erp_time_entries (die Datenbank prüft Rechte und Sperren).
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
var ZJ={};      // Zeiten je Termin (alle Kollegen): job_id -> Zeilen
var ZRG={};     // Regieberichte je Termin: job_id -> [{id, work_date, status}]
var ZW={};      // eigene Zeiten je Woche: Montag -> Zeilen
var ZWK=null;   // angezeigte Woche (Montag)
var ZDS=null;   // Tagesfilter der Woche (null = ganze Woche)
var ZART=null;  // Verrechnungsartikel (für Zeiten freigeschaltete Leistungen)
var Z=null;     // offenes Buchungsblatt
var ZRS={};     // Stand der Regieberichte, an denen Zeiten hängen: regie_id -> status
var zSt=null;   // Suche Auftrag/Kunde (Verzögerung)

function zNum(h){return (Math.round((+h||0)*100)/100).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2})}
function zH(h){return zNum(h)+' h'}
function zMon(ds){var d=parse(ds);d.setDate(d.getDate()-((d.getDay()+6)%7));return fmt(d)}
function zAdd(ds,n){var d=parse(ds);d.setDate(d.getDate()+n);return fmt(d)}
function zToday(){return fmt(new Date())}
function zDay(ds){var d=parse(ds);return WD[d.getDay()]+' '+d.getDate()+'.'+(d.getMonth()+1)+'.'}
var WDL=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],MNL=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function zDayLong(ds){var d=parse(ds);return WDL[d.getDay()]+', '+d.getDate()+'. '+MNL[d.getMonth()]}
function zWeekNo(ds){var d=parse(ds);d.setDate(d.getDate()+3-((d.getDay()+6)%7));var y=new Date(d.getFullYear(),0,4);return 1+Math.round(((d-y)/864e5-3+((y.getDay()+6)%7))/7)}
function zSum(rows){return rows.reduce(function(s,x){return s+(+x.hours||0)},0)}
function zLocked(x){return !!(x.invoice_id||x.regie_id)}
// Abgerechnet wird entweder die Zeit selbst oder der Regiebericht, in dem sie steht
function zState(x){return x.invoice_id?'Abgerechnet'+(x.invoice_number?' · '+x.invoice_number:''):x.regie_id?(ZRS[x.regie_id]=='abgerechnet'?'Abgerechnet mit Regiebericht':'Im Regiebericht')+(x.regie_number?' '+x.regie_number:''):''}
// Stand der Berichte nachladen (abgerechnet oder nicht); ohne Leserecht bleibt es bei „Im Regiebericht“
function zRgState(rows){var ids=(rows||[]).map(function(x){return x.regie_id}).filter(function(id,i,a){return id&&a.indexOf(id)==i});if(!ids.length)return Promise.resolve(rows);
 return sb.from('erp_regie').select('id,status').in('id',ids).then(function(r){(r.data||[]).forEach(function(x){ZRS[x.id]=x.status});return rows},function(){return rows})}
// Termin, auf den gebucht werden kann: mit Datum, kein Urlaub, Kunde mit der ERP verknüpft
function zJobOk(j){return RGOK&&j&&j.start&&j.art!='urlaub'&&!!erpCust(j)}

// ---------------------------------------------------------------- Laden

function zLoadJob(id){return Promise.all([sb.rpc('erp_time_planner',{p_job:id}),sb.from('erp_regie').select('id,work_date,status').eq('job_id',id)]).then(function(q){
 if(!q[0].error)ZJ[id]=q[0].data||[];if(!q[1].error)ZRG[id]=q[1].data||[];return zRgState(ZJ[id]||[])})}
function zLoadWeek(mon){return sb.rpc('erp_time_planner',{p_from:mon,p_to:zAdd(mon,6)}).then(function(r){if(r.error)throw r.error;ZW[mon]=r.data||[];return zRgState(ZW[mon])})}
function zArts(){if(ZART)return Promise.resolve(ZART);return sb.rpc('erp_regie_articles',{p_search:'',p_kind:'leistung'}).then(function(r){ZART=r.error?[]:(r.data||[]);return ZART})}
// Nach dem Speichern: Termin und Woche neu laden
function zForget(jobId,ds){if(jobId)delete ZJ[jobId];if(ds)delete ZW[zMon(ds)]}

// ---------------------------------------------------------------- Am Termin: Zeiten und Knöpfe

function zBox(j){var rows=ZJ[j.id];
 var h='<div class="zbox" data-zj="'+j.id+'"><div class="zbh"><span>Zeiten zu diesem Termin</span><b>'+(rows&&rows.length?zH(zSum(rows)):'')+'</b></div>';
 if(!rows)return h+'<div class="sub">Wird geladen …</div></div>';
 // je Tag und Mitarbeiter eine Zeile
 var g={};rows.forEach(function(x){var k=x.work_date+'|'+x.employee_id;g[k]=(g[k]||0)+(+x.hours||0)});
 var ks=Object.keys(g).sort().reverse();
 h+=ks.slice(0,6).map(function(k){var p=k.split('|');return '<div class="zbr"><span>'+zDay(p[0])+' · '+esc(uName(p[1]))+'</span><span>'+zH(g[k])+'</span></div>'}).join('');
 if(ks.length>6)h+='<div class="sub">… und '+(ks.length-6)+' weitere</div>';
 var td=zToday();
 if(span(j).indexOf(td)>-1&&!rows.some(function(x){return x.work_date==td}))h+='<div class="sub">Heute noch nichts gebucht</div>';
 else if(!rows.length)h+='<div class="sub">Noch nichts gebucht</div>';
 return h+'</div>'}
// Offene Kästen nachladen (nach jedem Zeichnen aufgerufen)
function zFill(){if(!RGOK)return;document.querySelectorAll('.zbox[data-zj]').forEach(function(el){var id=el.dataset.zj;if(ZJ[id]||el.dataset.ld)return;
 if(!el.closest('.job.open')&&!el.closest('dialog'))return;el.dataset.ld='1';
 zLoadJob(id).then(function(){var j=byId(id);document.querySelectorAll('.zbox[data-zj="'+id+'"]').forEach(function(x){if(j)x.outerHTML=zBox(j)})})})}

// ---------------------------------------------------------------- Buchungsblatt

// Vorschlag von/bis aus dem Termin: Uhrzeit oder ganztags (Zeitraum der Firma, ab 6 Stunden 60 Minuten Pause)
function zDefault(j){var a=j&&j.zeit||ORG.allday_start||'08:00',b=j&&j.ende||ORG.allday_end||'17:00';if(t2m(b)<=t2m(a))b=m2t(t2m(a)+60);
 return {from:a,to:b,brk:!(j&&j.zeit)&&t2m(b)-t2m(a)>360?60:0}}
function zBook(id,ds){var j=byId(id);if(!zJobOk(j))return;var td=zToday(),days=span(j);
 var day=ds&&days.indexOf(ds)>-1?ds:days.indexOf(td)>-1?td:(days.filter(function(x){return x<=td}).pop()||j.start);
 var dv=zDefault(j),meOn=wer(j).indexOf(ME.id)>-1;
 Z={job:j,id:null,order_id:j.erp_order_id||null,customer_id:erpCust(j),cust:erpCust(j),title:j.kunde||'(ohne Name)',sub:(j.erp_order_id?'Auftrag':'Ohne Auftrag – das Büro ordnet ihn zu')+' · aus dem Termin',
  date:day,mode:'vb',from:dv.from,to:dv.to,brk:dv.brk,hours:rgDefHours(j)||1,who:meOn?[ME.id]:[],art:null,act:'',back:!!document.querySelector('#dlg #f_k')};
 zOpen()}
function zNew(){var dv=zDefault(null);
 Z={job:null,id:null,order_id:null,customer_id:null,cust:null,title:'',sub:'',date:tab=='zeiten'&&ZDS||zToday(),mode:'h',from:dv.from,to:dv.to,brk:dv.brk,hours:1,who:[ME.id],art:null,act:'',back:false};
 zOpen()}
function zEdit(id){var all=[].concat(ZW[ZWK]||[]);Object.keys(ZJ).forEach(function(k){all=all.concat(ZJ[k])});var x=all.filter(function(r){return r.id==id})[0];if(!x||zLocked(x))return;
 var j=x.job_id?byId(x.job_id):null;
 Z={job:j,id:x.id,order_id:x.order_id,customer_id:x.customer_id,cust:x.customer_id,name:x.customer_name||'',title:x.customer_name||(j&&j.kunde)||'',sub:x.order_number?'Auftrag '+x.order_number:'Ohne Auftrag',
  date:x.work_date,mode:x.time_from&&x.time_to?'vb':'h',from:x.time_from||zDefault(j).from,to:x.time_to||zDefault(j).to,brk:+x.break_min||0,hours:+x.hours,who:[x.employee_id],art:x.article_id,act:x.activity||'',back:false};
 zOpen()}
function zOpen(){var d=document.getElementById('dlg');SVALL=false;d.scrollTop=0;d.innerHTML='<div class="dt2"><b>Zeit buchen</b></div><div class="sub">Wird geladen …</div>';if(!d.open)d.showModal();
 var w=[zArts()];if(Z.job&&!ZJ[Z.job.id])w.push(zLoadJob(Z.job.id));
 Promise.all(w).then(function(){if(Z)zRender()})}
function zClose(){var b=Z&&Z.back&&Z.job;Z=null;if(b)edit(b.id);else document.getElementById('dlg').close()}

function zHours(){if(Z.mode=='h')return Math.round(Z.hours*100)/100;var m=t2m(Z.to)-t2m(Z.from)-Z.brk;return m>0?Math.round(m/60*100)/100:0}
function zProblem(){if(!Z.order_id&&!Z.customer_id)return 'Bitte einen Auftrag oder Kunden wählen.';
 if(!Z.date)return 'Bitte den Tag wählen.';if(Z.date>zToday())return 'Zeiten nur für heute oder vergangene Tage buchen.';
 if(Z.mode=='vb'&&t2m(Z.to)<=t2m(Z.from))return 'Bis muss nach Von liegen.';
 if(Z.mode=='vb'&&Z.brk>=t2m(Z.to)-t2m(Z.from))return 'Die Pause muss kürzer als die Arbeitszeit sein.';
 var h=zHours();if(!(h>0)||h>24)return 'Bitte von–bis oder Stunden bis 24 angeben.';
 if(!Z.who.length)return 'Bitte wählen, für wen gebucht wird.';
 if(Z.who.some(function(e){return !zArtFor(e)}))return 'Kein Verrechnungsartikel vorhanden – das Büro muss in einer Warengruppe „Für Zeiten verrechenbar“ einschalten.';
 return ''}
// Verrechnungsartikel: gewählt, sonst Standard des Mitarbeiters, sonst Leistung des Termins, sonst der erste
function zArtFor(emp){var ok=function(id){return id&&(ZART||[]).some(function(a){return a.id==id})},u=uById(emp);
 if(ok(Z.art))return Z.art;if(u&&ok(u.erp_labor_article_id))return u.erp_labor_article_id;if(Z.job&&ok(Z.job.article_id))return Z.job.article_id;return (ZART||[])[0]&&ZART[0].id||null}
// Wer auf dem Termin steht (ich zuerst); im Bearbeiten nur die eine Person
function zPeople(){if(Z.id||!Z.job)return Z.who.slice();var w=wer(Z.job),me=w.indexOf(ME.id)>-1;return (me?[ME.id]:[]).concat(w.filter(function(x){return x!=ME.id}))}

function zRender(){var d=document.getElementById('dlg'),st=d.scrollTop,td=zToday(),h=zHours();
 var x='<div class="dt2"><b>'+(Z.id?'Zeit ändern':'Zeit buchen')+'</b><button class="ib" onclick="zClose()" aria-label="Schließen">'+ic('x')+'</button></div>';
 // Wofür
 if(Z.order_id||Z.customer_id)x+='<div class="ztg"><div><b>'+esc(Z.title)+'</b><span class="sub">'+esc(Z.sub)+(Z.job&&Z.date?' · '+zDay(Z.date):'')+'</span></div>'+(Z.job||Z.id?'':'<button class="lk" onclick="zTarget(null)">Ändern</button>')+'</div>';
 else x+='<label for="z_q">Kunde oder Auftrag</label><input id="z_q" type="search" placeholder="Name, Nummer oder Titel" autocomplete="off" oninput="zSearch(this.value)"><div id="z_res" class="zres"></div>';
 // Leistung: der Artikel, nach dem abgerechnet wird; ohne eigene Wahl gilt der Standard je Mitarbeiter (Namen stehen dann dabei)
 var ds=Z.who.length?Z.who:[ME.id],a0=zArtFor(ds[0]),same=ds.every(function(e){return zArtFor(e)==a0});
 if((ZART||[]).length)x+='<div class="sec zls">Leistung</div>'+svRows(ZART.map(function(a){var m=ds.filter(function(e){return zArtFor(e)==a.id}),c=SVC.filter(function(s){return s.id==a.id})[0];
  return {v:a.id,n:a.name_de||a.name_it||a.number,ic:'<b class="svd" style="background:'+(c&&c.plan_color||SVC_DEF)+'"></b>',on:m.length>0,ex:same||!m.length?'':m.map(uName).join(', ')}}),'zArtSet');
 // Wann: am Termin der Tag des Termins (mehrtägig: Tag wählen), sonst ein Datumsfeld
 if(Z.job){var jd=span(Z.job).filter(function(x){return x<=td});
  if(jd.length>1)x+='<div class="zdt" role="group" aria-label="Tag des Termins">'+jd.slice(-5).map(function(x){return '<button class="'+(Z.date==x?'on':'')+'" onclick="zSet(\'date\',\''+x+'\')">'+zDay(x)+'</button>'}).join('')+'</div>'}
 else x+='<label for="z_d">Tag</label><input id="z_d" class="zdi" type="date" max="'+td+'" value="'+Z.date+'" onchange="zSet(\'date\',this.value||Z.date)">';
 x+='<div class="seg zmd"><button class="'+(Z.mode=='vb'?'on':'')+'" onclick="zSet(\'mode\',\'vb\')">Von – bis</button><button class="'+(Z.mode=='h'?'on':'')+'" onclick="zSet(\'mode\',\'h\')">Nur Stunden</button></div>';
 if(Z.mode=='vb'){
  var tp=function(k,l){return '<div><label for="z_'+k+'">'+l+'</label><div class="zst"><button aria-label="'+l+' 15 Minuten früher" onclick="zT(\''+k+'\',-15)">−</button><input id="z_'+k+'" type="time" step="900" value="'+Z[k]+'" onchange="zSet(\''+k+'\',this.value||Z.'+k+')"><button aria-label="'+l+' 15 Minuten später" onclick="zT(\''+k+'\',15)">+</button></div></div>'};
  x+='<div class="zvb">'+tp('from','Von')+tp('to','Bis')+'</div>'+
  '<div class="zl">Pause</div><div class="zch" role="group" aria-label="Pause">'+[0,15,30,45,60].map(function(m){return '<button class="'+(Z.brk==m?'on':'')+'" onclick="zSet(\'brk\','+m+')">'+m+(m==60?' Min.':'')+'</button>'}).join('')+'</div>'+
  '<div class="zres2"><span>Ergibt</span><b>'+zH(h)+'</b></div>'}
 else x+='<div class="zbig"><button aria-label="Eine Viertelstunde weniger" onclick="zHStep(-0.25)">−</button><b>'+zH(h)+'</b><button aria-label="Eine Viertelstunde mehr" onclick="zHStep(0.25)">+</button></div>'+
  '<div class="zch" role="group" aria-label="Schnellwahl Stunden">'+[[0.5,'½'],[1,'1'],[2,'2'],[4,'4'],[8,'8 h']].map(function(q){return '<button class="'+(Z.hours==q[0]?'on':'')+'" onclick="zSet(\'hours\','+q[0]+')">'+q[1]+'</button>'}).join('')+'</div>';
 // Für wen
 var ppl=zPeople();
 if(Z.job&&!Z.id&&ppl.length>1){
  var done=(ZJ[Z.job.id]||[]).filter(function(r){return r.work_date==Z.date}).map(function(r){return r.employee_id}),
   miss=ppl.filter(function(e){return e!=ME.id&&done.indexOf(e)<0}).map(uName);
  x+='<div class="zl">Für wen</div><div class="zwho">'+ppl.map(function(e){var on=Z.who.indexOf(e)>-1;return '<button aria-pressed="'+on+'" class="'+(on?'on':'')+'" onclick="zWho(\''+e+'\')">'+(on?ic('check'):'＋')+' '+esc(uName(e))+(e==ME.id?' (ich)':'')+'</button>'}).join('')+'</div>'+
  '<div class="sub">Nur wer auf dem Termin eingeteilt ist.'+(miss.length?' '+esc(miss.join(' und '))+(miss.length==1?' hat':' haben')+' für diesen Tag noch nichts gebucht.':'')+'</div>'}
 x+='<label for="z_a">Tätigkeit (optional)</label><input id="z_a" maxlength="300" placeholder="z. B. Oberschränke montiert" value="'+esc(Z.act)+'" oninput="Z.act=this.value">';
 // Hinweis: Bericht am selben Tag
 var rg=Z.job&&(ZRG[Z.job.id]||[]).filter(function(r){return r.work_date==Z.date})[0];
 if(rg&&!Z.id)x+='<div class="note">'+ic('info')+''+(rg.status=='entwurf'?' Für diesen Tag gibt es schon einen Regiebericht (Entwurf). „Regiebericht“ bucht die Zeit und trägt sie dort ein.':' Für diesen Tag gibt es schon einen Regiebericht. Stunden dort eintragen, sonst werden sie doppelt verrechnet.')+'</div>';
 x+='<div id="z_e" class="err" role="alert"></div><div class="row ft">'+(Z.id?'<button class="b d" style="flex:none" onclick="zDel()" aria-label="Zeit löschen">'+ic('trash')+'</button>':'')+
  (RGOK&&(Z.order_id||Z.customer_id)&&Z.cust&&!(rg&&rg.status!='entwurf')?'<button class="b zrs" onclick="zSaveRg()" aria-label="'+(Z.id?'Speichern':'Zeit buchen')+' und Regiebericht ausfüllen">'+ic('plus')+' Regiebericht</button>':'')+
  '<button class="b p zgo" onclick="zSave()">'+(Z.id?'Speichern':(Z.who.length>1?Z.who.length+' × ':'')+zH(h)+' buchen')+'</button></div>';
 d.innerHTML=x;d.scrollTop=st}

function zArtSet(v){zSet('art',v)}
function zSet(k,v){if(k=='hours')v=Math.max(0.25,Math.min(24,v));if(k=='mode'&&v=='h'&&Z.mode=='vb')Z.hours=zHoursFrom();Z[k]=v;zRender()}
function zHoursFrom(){var m=t2m(Z.to)-t2m(Z.from)-Z.brk;return m>0?Math.round(m/15)/4:Z.hours}
function zT(k,dm){zSet(k,m2t(t2m(Z[k])+dm))}
function zHStep(dh){zSet('hours',Math.round((Z.hours+dh)*4)/4)}
function zWho(e){var i=Z.who.indexOf(e);if(i>-1)Z.who.splice(i,1);else Z.who.push(e);zRender()}
function zTarget(t){if(!t){Z.order_id=null;Z.customer_id=null;Z.cust=null;Z.title='';Z.sub='';zRender();var q=document.getElementById('z_q');if(q)q.focus();return}
 Z.order_id=t.order_id||null;Z.customer_id=t.customer_id||null;Z.cust=t.cust||t.customer_id||null;Z.name=t.name||'';Z.title=t.title;Z.sub=t.sub;zRender()}

// Suche: bestätigte Aufträge und Kunden (ohne Auftrag ordnet das Büro später zu)
function zSearch(s){clearTimeout(zSt);s=s.trim();var el=document.getElementById('z_res');if(!s){el.innerHTML='';return}
 zSt=setTimeout(function(){Promise.all([sb.rpc('erp_time_orders',{p_search:s}),sb.rpc('erp_time_customers',{p_search:s})]).then(function(q){
  var el=document.getElementById('z_res');if(!el||!Z)return;var o=(q[0].data||[]).slice(0,6),c=(q[1].data||[]).slice(0,6);Z.found={o:o,c:c};
  el.innerHTML=(o.length?'<div class="zrh">Aufträge</div>'+o.map(function(x,i){return '<button type="button" onclick="zPickO('+i+')"><b>'+esc(x.number)+' · '+esc(x.customer_name||'')+'</b><small>'+esc(x.title||'')+'</small></button>'}).join(''):'')+
   (c.length?'<div class="zrh">Kunde ohne Auftrag</div>'+c.map(function(x,i){return '<button type="button" onclick="zPickC('+i+')"><b>'+esc(x.name)+'</b><small>'+esc(x.number||'')+' · Auftrag ordnet das Büro später zu</small></button>'}).join(''):'')+
   (o.length||c.length?'':'<div class="empty">Nichts gefunden.</div>')})},250)}
function zPickO(i){var x=Z.found.o[i];zTarget({order_id:x.id,cust:x.customer_id,name:x.customer_name||'',title:x.number+' · '+(x.customer_name||''),sub:x.title||'Auftrag'})}
function zPickC(i){var x=Z.found.c[i];zTarget({customer_id:x.id,name:x.name,title:x.name,sub:(x.number?x.number+' · ':'')+'Ohne Auftrag – das Büro ordnet ihn zu'})}

function zErr(t){var el=document.getElementById('z_e');if(el)el.textContent=t}
// rep=true: danach geht der Regiebericht auf (Fenster bleibt offen). Liefert dann die Ids der gebuchten Zeiten.
async function zSave(rep){var p=zProblem();if(p){zErr(p);return}
 var h=zHours(),j=Z.job,base={work_date:Z.date,time_from:Z.mode=='vb'?Z.from:'',time_to:Z.mode=='vb'?Z.to:'',break_min:Z.mode=='vb'?Z.brk:0,hours:h,activity:(Z.act||'').trim().slice(0,300)};
 if(!Z.id&&j){var dup=(ZJ[j.id]||[]).filter(function(r){return r.work_date==Z.date&&Z.who.indexOf(r.employee_id)>-1}).map(function(r){return uName(r.employee_id)});
  if(dup.length&&!confirm('Für '+dup.filter(function(v,i,a){return a.indexOf(v)==i}).join(' und ')+' ist an diesem Tag schon Zeit gebucht. Trotzdem zusätzlich buchen?'))return}
 var bs=document.querySelectorAll('#dlg .ft .b');bs.forEach(function(b){b.disabled=true});
 try{var q,ids=Z.id?[Z.id]:Z.who.map(function(){return uuid()});
  if(Z.id)q=await sb.from('erp_time_entries').update(Object.assign({article_id:zArtFor(Z.who[0])},base)).eq('id',Z.id);
  else q=await sb.from('erp_time_entries').insert(Z.who.map(function(e,i){return Object.assign({id:ids[i],order_id:Z.order_id,customer_id:Z.order_id?null:Z.customer_id,employee_id:e,article_id:zArtFor(e),job_id:j?j.id:null},base)}));
  if(q.error)throw q.error;
  var n=Z.who.length,msg=(Z.id?'Geändert: ':'Gebucht: ')+(n>1?n+' × ':'')+zH(h)+' am '+zDay(Z.date);
  zForget(j&&j.id,Z.date);if(Z.id&&ZWK)delete ZW[ZWK];
  if(ZDS&&ZDS!=Z.date)ZDS=null;
  if(rep){Z=null;render();return ids}
  zClose();render();zToast(msg)}
 catch(e){zErr('Speichern fehlgeschlagen: '+(e&&e.message||e));bs.forEach(function(b){b.disabled=false})}}
// „Regiebericht“ im Buchungsblatt: Zeit buchen und gleich den Bericht des Tages öffnen; ein Entwurf bekommt die neue Zeit dazu
async function zSaveRg(){var p=zProblem();if(p){zErr(p);return}
 var j=Z.job,c=Z.cust,o=Z.order_id,ds=Z.date,n=Z.name||Z.title,q=await sb.from('erp_regie').select('id,status,job_id,order_id').eq('customer_id',c).eq('work_date',ds);
 if(!Z)return;
 if(q.error){zErr('Laden fehlgeschlagen: '+q.error.message);return}
 var ex=(q.data||[]).filter(function(x){return j?x.job_id==j.id:!x.job_id&&(x.order_id||null)==(o||null)})[0];
 if(ex&&ex.status!='entwurf'){zErr('Für diesen Tag liegt der Regiebericht schon im Büro. Die Zeit ohne Bericht buchen.');return}
 var ids=await zSave(true);if(!ids)return;
 await (j?regie(j.id,ds):rgCust(c,o||'',ds,n));
 if(ex&&RG&&!RG.ro&&RG.r.id)rgTake(ids)}
async function zDel(){if(!confirm('Diese Zeit löschen?'))return;var q=await sb.from('erp_time_entries').delete().eq('id',Z.id);
 if(q.error){zErr('Löschen fehlgeschlagen: '+q.error.message);return}zForget(Z.job&&Z.job.id,Z.date);zClose();render();zToast('Zeit gelöscht')}
function zToast(t){var el=document.getElementById('ztoast');if(!el){el=document.createElement('div');el.id='ztoast';el.className='ztoast';el.setAttribute('role','status');document.body.appendChild(el)}
 el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('on')},2600)}

// ---------------------------------------------------------------- Reiter „Zeiten“: meine Woche

function zView(hd,m){var td=zToday(),cw=zMon(td);if(!ZWK)ZWK=cw;var mon=ZWK,sun=zAdd(mon,6),rows=ZW[mon];
 var a=parse(mon),b=parse(sun),rng=a.getMonth()==b.getMonth()?a.getDate()+'.–'+b.getDate()+'. '+MN[b.getMonth()]:a.getDate()+'. '+MN[a.getMonth()]+' – '+b.getDate()+'. '+MN[b.getMonth()];
 hd.innerHTML='<h1>Zeiten</h1>';
 var days=[];for(var i=0;i<7;i++)days.push(zAdd(mon,i));
 var soll=days.filter(function(x){return !isWE(x)}).length*dayH(),ist=rows?zSum(rows):0;
 var h='<div class="zwk"><button class="ib" onclick="zWeek(-7)" aria-label="Woche zurück">'+ic('left')+'</button><div><b>KW '+zWeekNo(mon)+' · '+rng+'</b><span class="sub">Meine Zeiten'+(rows?' · '+zNum(ist)+' von '+zNum(soll)+' h':'')+'</span></div>'+
  '<button class="ib" onclick="zWeek(7)" aria-label="Woche weiter"'+(mon>=cw?' disabled':'')+'>'+ic('right')+'</button></div>';
 if(!rows){m.innerHTML=h+'<div class="swp"><div class="empty">Wird geladen …</div></div>';zLoadWeek(mon).then(function(){if(tab=='zeiten'&&ZWK==mon)render()}).catch(function(e){if(tab=='zeiten')m.innerHTML=h+'<div class="err">Laden fehlgeschlagen: '+esc(e.message||String(e))+'</div>'});return}
 var by={};rows.forEach(function(x){(by[x.work_date]=by[x.work_date]||[]).push(x)});
 // Termine ohne eigene Zeit je Tag
 var sug={};days.forEach(function(x){sug[x]=x>td?[]:S.jobs.filter(function(j){return zJobOk(j)&&!j.done&&wer(j).indexOf(ME.id)>-1&&span(j).indexOf(x)>-1&&!(by[x]||[]).some(function(e){return e.job_id==j.id})})});
 if(ZDS&&days.indexOf(ZDS)<0)ZDS=null;
 // Tagesleiste: Summe und Balken gegen die Tagesstunden, Punkt = Termin ohne Zeit; Tipp filtert die Liste
 // Tagesleiste und Liste lassen sich wischen (nächste/vorige Woche); die Kopfzeile mit den Pfeilen bleibt stehen
 h+='<div class="swp"><div class="zdays" role="group" aria-label="Tag auswählen">'+days.map(function(x){var s=zSum(by[x]||[]),p=parse(x),on=ZDS==x,o=sug[x].length;return '<button class="'+(x==td?'td ':'')+(isWE(x)?'we ':'')+(on?'on':'')+'" aria-pressed="'+on+'"'+(x>td?' disabled':'')+' onclick="zGo(\''+x+'\')" aria-label="'+zDayLong(x)+': '+zH(s)+(o?', '+o+(o==1?' Termin':' Termine')+' ohne Zeit':'')+'"><span>'+WD[p.getDay()]+'</span><b>'+p.getDate()+'</b><span>'+(s?zNum(s):'–')+'</span><i><i style="width:'+Math.min(100,Math.round(s/dayH()*100))+'%"></i></i>'+(o?'<em></em>':'')+'</button>'}).join('')+'</div>';
 // Liste: neuester Tag zuerst (oder nur der gewählte); Termine ohne eigene Zeit als Vorschlag
 var list='';(ZDS?[ZDS]:days.slice().reverse()).forEach(function(x){if(x>td)return;var r=by[x]||[];
  if(!r.length&&!sug[x].length)return;
  list+='<div class="zdh" id="zd-'+x+'"><span>'+zDayLong(x)+'</span><b>'+zH(zSum(r))+'</b></div>'+
   sug[x].map(function(j){return '<div class="zsug"><div><small>Termin ohne Zeit</small><b>'+esc(j.kunde||'(ohne Name)')+'</b><span class="sub">'+(j.zeit?esc(j.zeit)+(j.ende?'–'+esc(j.ende):''):'Ganztags')+'</span></div><button class="b" onclick="zBook(\''+j.id+'\',\''+x+'\')">Buchen</button></div>'}).join('')+
   zGroups(r).map(function(g){return g.rows.map(function(e,i){var lk=zLocked(e),sub=[e.time_from&&e.time_to?e.time_from+'–'+e.time_to:'',+e.break_min?e.break_min+' Min. Pause':'',e.order_number||'Ohne Auftrag',e.activity||''].filter(Boolean).join(' · ');
    return '<div class="zrow'+(lk?' zlk':'')+'"><button class="zrm"'+(lk?' aria-disabled="true"':' onclick="zEdit(\''+e.id+'\')"')+'><div><b>'+esc(e.customer_name||'')+'</b><span class="sub">'+(lk?ic('lock')+' '+esc(zState(e))+' · ':'')+esc(sub)+'</span></div><b>'+zH(e.hours)+'</b></button>'+(!i&&zRgBtn(g,x)||'<span class="zrx"></span>')+'</div>'}).join('')}).join('')});
 var all=ZDS?'<button class="lk zall" onclick="zGo(null)">Ganze Woche anzeigen</button>':'';
 m.innerHTML=h+(list?'<div class="zlist">'+list+'</div>'+all:'<div class="empty big">'+ic('zeiten')+'<br><b>'+(ZDS?zDayLong(ZDS)+': noch keine Zeiten':'Diese Woche noch keine Zeiten')+'</b><br><small>Mit '+ic('plus')+' eine Zeit buchen</small></div>'+all)+'</div>'}
function zWeek(n){var cw=zMon(zToday()),w=zAdd(ZWK,n);if(w>cw)w=cw;ZWK=w;ZDS=null;render()}
// Tag antippen = nur diesen Tag zeigen, nochmals = wieder die ganze Woche
function zGo(ds){ZDS=ds&&ds!=ZDS?ds:null;render()}
// Zeiten eines Tages je Termin bzw. je Kunde/Auftrag ohne Termin bündeln (für den Regiebericht)
function zGroups(r){var o=[],m={};r.forEach(function(e){var k=e.job_id?'j'+e.job_id:'c'+e.customer_id+'|'+(e.order_id||'');if(!m[k]){m[k]={rows:[],job:e.job_id||null,cust:e.customer_id,order:e.order_id||null,name:e.customer_name||''};o.push(m[k])}m[k].rows.push(e)});return o}
function zRgBtn(g,ds){if(!RGOK||!g.cust)return '';var rg=g.rows.filter(function(e){return e.regie_id})[0];
 if(!rg&&g.rows.every(function(e){return e.invoice_id}))return '';
 var a=g.job&&byId(g.job)?'regie(\''+g.job+'\',\''+ds+'\')':'rgCust(\''+g.cust+'\',\''+(g.order||'')+'\',\''+ds+'\',this.dataset.n)';
 var t=rg?'Regiebericht'+(rg.regie_number?' '+rg.regie_number:'')+' öffnen':'Regiebericht schreiben';
 return '<button class="zrg'+(rg?' has':'')+'" data-n="'+esc(g.name)+'" onclick="'+a+'" title="'+esc(t)+'" aria-label="'+esc(t+' · '+g.name)+'">'+ic('regie')+'</button>'}
