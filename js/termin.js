// Planner – Termin-Dialog: anlegen, bearbeiten, wiederholen, aufteilen, speichern
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
var cur={};
function edit(id,ds,t,te,emp,pre){
 var j=id?Object.assign({},byId(id)):{id:uuid(),created_by:ME.user_id,kunde:'',adresse:'',tel:'',art:(SVC.length||ds&&isWE(ds)?'termin':'montage'),article_id:(!(ds&&isWE(ds))&&svcList()[0]?svcList()[0].id:null),wer:emp?(emp=='-'?[]:[emp]):[fltNew()],start:ds||'',fix:false,imp:false,tage:1,zeit:t||'',ende:t?(te||m2t(t2m(t)+60)):'',material:true,notiz:'',done:false};
 if(!id&&pre)Object.assign(j,pre);
 var h0=HRS()?rH(j.stunden!=null&&id?j.stunden:hFrom(j)):0;
 j.wer=wer(j);cur={j:j,isNew:!id,zt:!!j.zeit,fx:j.fix!==false};var d=document.getElementById('dlg');
 d.innerHTML='<div class="dt2"><b>'+(id?'Auftrag bearbeiten':'Neuer Termin')+'</b><button class="ib" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div>'+
 '<div class="eg"><div><div class="sec">Was</div><div class="seg wrap" id="s_art">'+artOpts(j).map(function(o){return '<button data-v="'+o.v+'">'+o.ic+' '+esc(o.n)+'</button>'}).join('')+'</div><div class="sub">'+(SVC.length?'Leistungen':'Montage, Planung und Werkstatt')+' nur an Werktagen (Mo–Fr, ohne Feiertage)</div>'+
 '<label>Kunde / Titel</label><input id="f_k" placeholder="z. B. Fam. Huber – Küche" value="'+esc(j.kunde)+'" oninput="kSug()" autocomplete="off"><div id="ksug" class="ksug"></div>'+
 '<label>Wer (mehrere möglich)</label><div class="seg wrap" id="s_wer">'+usersSorted().map(function(u){var me=ME&&u.id==ME.id;return '<button data-v="'+u.id+'"'+(me?' class="mew"':'')+'>'+(me?ic('user')+' ':'')+esc(u.display_name)+(me?' (ich)':'')+'</button>'}).join('')+'</div>'+
 '<label>Status</label><div class="seg" id="s_fx"><button data-v="0">'+ic('pv')+' Provisorisch</button><button data-v="1">'+ic('pin')+' Fix</button></div><label class="chk"><input id="f_i" type="checkbox"'+(j.imp?' checked':'')+'> '+ic('starf','starx')+' Wichtiger Termin</label>'+
 '</div><div><div class="sec">Wann</div><div class="seg" id="s_zt"><button data-v="0">Ganztags <small>('+(ORG.allday_start||'08:00')+'–'+(ORG.allday_end||'17:00')+')</small></button><button data-v="1">Uhrzeit</button></div>'+
 '<div id="tb" class="row" style="margin-top:6px"><div style="flex:1"><label>von</label><select id="f_z" onchange="zchg()">'+tOpts(j.zeit||'08:00')+'</select></div><div style="flex:1"><label>bis</label><select id="f_e" onchange="sug()">'+tOpts(j.ende||'09:00')+'</select></div></div>'+
 '<div id="db"><label>Dauer in Tagen</label><input id="f_d" oninput="sug()" type="number" min="1" max="60" value="'+j.tage+'"></div>'+
 // Termine in Stunden: Beginn + Dauer; mehr als ein Arbeitstag läuft am nächsten Tag ab Arbeitsbeginn weiter
 (HRS()?'<div id="hb"><label for="f_b">Beginn</label><select id="f_b" onchange="sug()">'+tOpts(j.zeit||m2t(d0m()))+'</select>'+
  '<label for="f_h">Dauer in Stunden</label><div class="hrow"><button type="button" class="b" onclick="hStep(-1)" aria-label="15 Minuten weniger">−</button><span class="hbx"><input id="f_h" inputmode="decimal" autocomplete="off" value="'+String(h0).replace('.',',')+'" oninput="sug()" onblur="hNorm()" onkeydown="hKey(event)"><span>h</span></span><button type="button" class="b" onclick="hStep(1)" aria-label="15 Minuten mehr">+</button></div>'+
  '<div class="hch" role="group" aria-label="Schnellwahl Stunden">'+[1,2,4,8,16,24,40].map(function(h){return '<button type="button" class="b" data-h="'+h+'" onclick="hPut('+h+')">'+h+' h</button>'}).join('')+'</div>'+
  '<div id="hs" class="hsum" aria-live="polite"></div></div>':'')+
 '<div id="sg"></div><label>Datum (leer = noch offen)</label><input id="f_s" type="date" value="'+j.start+'" oninput="hSum()">'+
 (id?'':'<label>Wiederholen</label><div class="row"><select id="f_r" style="flex:1 1 150px" onchange="document.getElementById(\'f_rb\').style.display=this.value?\'\':\'none\'"><option value="">Nicht wiederholen</option><option value="7">Wöchentlich</option><option value="14">Alle 2 Wochen</option><option value="m">Monatlich</option></select>'+
  '<div id="f_rb" style="flex:1 1 150px;display:none"><input id="f_ru" type="date" aria-label="Wiederholen bis" value="'+fmt(new Date(Date.now()+92*864e5))+'"><div class="sub">bis einschließlich</div></div></div>')+
 (id&&nDays(byId(id))>1?'<div class="sec">Aufteilen</div><div class="sub">Den mehrtägigen Auftrag in einzelne Einträge teilen – danach lässt sich jeder Teil einzeln verschieben und zuteilen.</div><div class="row" style="margin-top:8px">'+splitUI(byId(id))+'</div>':'')+
 '<div class="sec">Details</div><label>Adresse</label><input id="f_a" value="'+esc(j.adresse)+'"><label>Telefon</label><input id="f_t" type="tel" value="'+esc(j.tel)+'">'+(CUSTOK&&!kErp()?'<div class="row" style="margin-top:6px"><button type="button" class="b" style="flex:none" onclick="kFromDlg(this)">'+ic('plus')+' Als Kunde speichern</button></div>':'')+
 '<label class="chk"><input id="f_m" type="checkbox"'+(j.material?' checked':'')+'> Material ist da</label><label>Notiz</label><textarea id="f_n" rows="3">'+esc(j.notiz)+'</textarea>'+
 '</div></div><div class="row ft">'+(id&&canDel(byId(id))?'<button class="b d" style="flex:none" onclick="if(del(\''+id+'\'))document.getElementById(\'dlg\').close()" title="Auftrag löschen">'+ic('trash')+'</button>':'')+'<button class="b" onclick="document.getElementById(\'dlg\').close()">Abbrechen</button><button class="b p" onclick="sv()">Speichern</button></div>';
 var wb=d.querySelectorAll('#s_wer button');function wv(){wb.forEach(function(b){b.classList.toggle('on',j.wer.indexOf(b.dataset.v)>-1)})}
 wb.forEach(function(b){b.onclick=function(){var i=j.wer.indexOf(b.dataset.v);if(i>-1)j.wer.splice(i,1);else j.wer.push(b.dataset.v);wv();sug()}});wv();
 var sa=d.querySelector('#s_art');sa.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.dataset.v==artVal(j));b.onclick=function(){artSet(j,b.dataset.v);sa.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x==b)});sug()}});
 var zb=d.querySelectorAll('#s_zt button');
 function zv(){d.querySelector('#tb').style.display=cur.zt&&!hrsJ(j)?'flex':'none';zb.forEach(function(b){b.classList.toggle('on',(b.dataset.v=='1')==cur.zt)})}
 zb.forEach(function(b){b.onclick=function(){cur.zt=b.dataset.v=='1';zv();sug()}});zv();
 var fb=d.querySelectorAll('#s_fx button');function fv(){fb.forEach(function(b){b.classList.toggle('on',(b.dataset.v=='1')==cur.fx)})}fb.forEach(function(b){b.onclick=function(){cur.fx=b.dataset.v=='1';fv()}});fv();sug();
 d.showModal()}
// Mehrtägigen Auftrag aufteilen: k=0 = jeder Tag einzeln, sonst nach Tag k in zwei Teile
// Anzahl Tage; ohne Datum ("Offen") zählt nur die eingetragene Dauer
function nDays(j){return j.start?span(j).length:Math.max(1,j.tage||1)}
function splitUI(j){var n=nDays(j),o='';for(var k=1;k<n;k++)o+='<option value="'+k+'">nach Tag '+k+' ('+k+' + '+(n-k)+' Tage)</option>';
 return '<button class="b" onclick="splitJ(\''+j.id+'\',0)">'+ic('split')+' In '+n+' Einzeltage</button>'+
  (n>2?'<select id="f_sp" style="flex:1 1 200px">'+o+'</select><button class="b" style="flex:none" onclick="splitJ(\''+j.id+'\',+document.getElementById(\'f_sp\').value)">Teilen</button>':'')}
function splitJ(id,k){var j=byId(id),n=nDays(j),days=j.start?span(j):[],parts=[];if(k)parts=[k,n-k];else for(var x=0;x<n;x++)parts.push(1);
 if(!confirm('„'+(j.kunde||'Auftrag')+'“ in '+parts.length+' Einträge aufteilen ('+parts.join(' + ')+' Tage)?\n\nNicht gespeicherte Änderungen in diesem Dialog gehen dabei verloren.'))return;
 var o=0,neu=[];
 // Termine in Stunden: jeder Teil bekommt die Stunden seiner Tage, ab dem zweiten Teil Beginn = Arbeitsbeginn
 var hp=hrsJ(j)?parts.map(function(len,i){var m=0,a=parts.slice(0,i).reduce(function(x,y){return x+y},0);for(var q=a;q<a+len;q++){var w=hWin(j,q,n);m+=w.e-w.s}return {h:m/60,z:a?'':j.zeit}}):null;
 parts.forEach(function(len,i){var p=i?Object.assign({},j,{id:uuid(),wer:(j.wer||[]).slice(),created_by:ME.user_id}):j;p.start=j.start?days[o]:'';p.tage=len;if(hp){p.stunden=rH(hp[i].h);p.zeit=hp[i].z;p.ende=''}o+=len;if(i)neu.push(p);save(p)});
 S.jobs=S.jobs.concat(neu);document.getElementById('dlg').close();render()}
function sv(){var j=cur.j,g=function(i){return document.getElementById(i)},st=g('f_s').value;
 if(st&&R(j)&&isWE(st)){alert(WEMSG);return}
 j.kunde=g('f_k').value.trim();j.adresse=g('f_a').value.trim();j.tel=g('f_t').value.trim();j.start=st;j.fix=cur.fx;j.imp=g('f_i').checked;j.material=g('f_m').checked;j.notiz=g('f_n').value.trim();
 if(hrsJ(j)){var hh=hVal();if(!hh){alert('Bitte eine Dauer in Stunden angeben.');return}j.stunden=hh;j.zeit=g('f_b').value;j.ende='';fit(j)}
 else{if(cur.zt){j.zeit=g('f_z').value||'08:00';j.ende=g('f_e').value;if(!j.ende||j.ende<=j.zeit)j.ende=m2t(t2m(j.zeit)+60)}else{j.zeit='';j.ende=''}
  j.tage=Math.max(1,parseInt(g('f_d').value)||1)}
 // Wiederholen: Kopien bis zum Enddatum anlegen (gleiche Serien-ID), höchstens 120
 var rp=g('f_r')&&g('f_r').value,ru=g('f_ru')&&g('f_ru').value,extra=[];
 if(cur.isNew&&rp&&j.start){if(!ru||ru<j.start){alert('Bitte ein Enddatum für die Wiederholung angeben.');return}
  j.series=uuid();var b0=parse(j.start),k=1;
  while(extra.length<120){var d;if(rp=='m'){d=new Date(b0.getFullYear(),b0.getMonth()+k,b0.getDate());if(d.getDate()!=b0.getDate())d=new Date(b0.getFullYear(),b0.getMonth()+k+1,0)}else d=new Date(b0.getTime()+k*rp*864e5);
   k++;var ds=fmt(d);if(ds>ru)break;if(R(j))ds=norm(ds);if(ds>ru)break;
   extra.push(Object.assign({},j,{id:uuid(),wer:j.wer.slice(),start:ds}))}}
 if(cur.isNew)S.jobs.push(j);else S.jobs=S.jobs.map(function(o){return o.id==j.id?j:o});save(j);
 extra.forEach(function(x){S.jobs.push(x);save(x)});if(extra.length)alert('Serie angelegt: '+(extra.length+1)+' Termine.');g('dlg').close();if(j.start)an=j.start;tab=j.start?'plan':'offen';render()}
// „Was“: Leistungsartikel aus der ERP (mit Farbpunkt), dazu Termin und Urlaub; Montage, Werkstatt und Planung nur ohne Leistungsartikel
// oder wenn der Termin sie schon hat. Wert: Artikel-ID oder „kind:art“.
function artVal(j){return j.article_id?j.article_id:'kind:'+j.art}
function artSet(j,v){if(v.indexOf('kind:')==0){j.art=v.slice(5);j.article_id=null}else{j.art='termin';j.article_id=v}}
function artOpts(j){var dot=function(c){return '<b class="svd" style="background:'+c+'"></b>'};
 return svcList(j.article_id).map(function(a){return {v:a.id,n:a.name_de||a.name_it,ic:dot(a.plan_color||SVC_DEF)}})
  .concat(Object.keys(ART).filter(function(k){return !SVC.length||k=='termin'||k=='urlaub'||(!j.article_id&&j.art==k)}).map(function(k){return {v:'kind:'+k,n:ART[k].n,ic:ART[k].ic}}))}
// Dauer in Stunden: Felder ein-/ausblenden (Urlaub bleibt in Tagen), ± in 0,25-Schritten, Vorschau auf Tage und Ende
function hv(){var d=document.getElementById('dlg'),q=function(s){return d.querySelector(s)};if(!q('#hb'))return;var h=hrsJ(cur.j);
 q('#s_zt').style.display=h?'none':'';q('#tb').style.display=!h&&cur.zt?'flex':'none';q('#db').style.display=h?'none':'';q('#hb').style.display=h?'':'none'}
function hVal(){var e=document.getElementById('f_h'),v=e?parseFloat(String(e.value).replace(',','.')):NaN;return v>0?rH(v):null}
function hPut(h){document.getElementById('f_h').value=String(rH(h)).replace('.',',');sug()}
function hStep(k){hPut((hVal()||0)+k*0.25)}
function hNorm(){var v=hVal();if(v)hPut(v)}
function hKey(e){if(e.key=='ArrowUp'||e.key=='ArrowDown'){e.preventDefault();hStep(e.key=='ArrowUp'?1:-1)}}
function hSum(){var d=document.getElementById('dlg'),el=d.querySelector('#hs');if(!el||!hrsJ(cur.j))return;var h=hVal();
 d.querySelectorAll('.hch .b').forEach(function(b){b.classList.toggle('on',+b.dataset.h==h)});
 if(!h){el.textContent='Bitte eine Dauer in Stunden angeben.';return}
 var L=lay(h,d.querySelector('#f_b').value),st=d.querySelector('#f_s').value;
 if(!st){el.textContent='≈ '+String(Math.round(h/dayH()*10)/10).replace('.',',')+' Arbeitstage ('+hTxt(dayH())+' pro Tag)';return}
 var t={art:cur.j.art,article_id:cur.j.article_id,start:st,tage:L.tage,zeit:L.zeit,ende:L.ende},dd=span(t),n=dd.length,
  f=function(x){var a=parse(x);return WD[a.getDay()]+' '+a.getDate()+'.'+(a.getMonth()+1)+'.'},w=function(i){var x=hWin(t,i,n);return m2t(x.s)+'–'+m2t(x.e)};
 el.innerHTML='<b>'+n+(n==1?' Arbeitstag':' Arbeitstage')+'</b> · endet '+f(dd[n-1])+' um '+m2t(hWin(t,n-1,n).e)+
  (n>1?'<small>'+dd.map(function(x,i){return f(x)+' '+w(i)}).join(' · ')+'</small>':'')}
