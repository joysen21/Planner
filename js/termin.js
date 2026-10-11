// Planner – Termin-Dialog: anlegen, bearbeiten, wiederholen, aufteilen, speichern
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
var cur={};
function edit(id,ds,t,te,emp,pre){
 var j=id?Object.assign({},byId(id)):{id:uuid(),created_by:ME.user_id,kunde:'',adresse:'',tel:'',art:(ds&&isWE(ds)?'termin':'montage'),wer:emp?(emp=='-'?[]:[emp]):[FLT=='me'||FLT=='alle'?ME.id:FLT],start:ds||'',fix:false,imp:false,tage:1,zeit:t||'',ende:t?(te||m2t(t2m(t)+60)):'',material:true,notiz:'',done:false};
 if(!id&&pre)Object.assign(j,pre);
 j.wer=wer(j);cur={j:j,isNew:!id,zt:!!j.zeit,fx:j.fix!==false};var d=document.getElementById('dlg');
 d.innerHTML='<div class="dt2"><b>'+(id?'Auftrag bearbeiten':'Neuer Termin')+'</b><button class="ib" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div>'+
 '<div class="eg"><div><div class="sec">Was</div><div class="seg wrap" id="s_art">'+Object.keys(ART).map(function(k){return '<button data-v="'+k+'">'+ART[k].ic+' '+ART[k].n+'</button>'}).join('')+'</div><div class="sub">Montage, Planung und Werkstatt nur an Werktagen (Mo–Fr, ohne Feiertage)</div>'+
 '<label>Kunde / Titel</label><input id="f_k" placeholder="z. B. Fam. Huber – Küche" value="'+esc(j.kunde)+'" oninput="kSug()" autocomplete="off"><div id="ksug" class="ksug"></div>'+
 '<label>Wer (mehrere möglich)</label><div class="seg wrap" id="s_wer">'+usersSorted().map(function(u){var me=ME&&u.id==ME.id;return '<button data-v="'+u.id+'"'+(me?' class="mew"':'')+'>'+(me?ic('user')+' ':'')+esc(u.display_name)+(me?' (ich)':'')+'</button>'}).join('')+'</div>'+
 '<label>Status</label><div class="seg" id="s_fx"><button data-v="0">'+ic('pv')+' Provisorisch</button><button data-v="1">'+ic('pin')+' Fix</button></div><label class="chk"><input id="f_i" type="checkbox"'+(j.imp?' checked':'')+'> '+ic('starf','starx')+' Wichtiger Termin</label>'+
 '</div><div><div class="sec">Wann</div><div class="seg" id="s_zt"><button data-v="0">Ganztags <small>('+(ORG.allday_start||'08:00')+'–'+(ORG.allday_end||'17:00')+')</small></button><button data-v="1">Uhrzeit</button></div>'+
 '<div id="tb" class="row" style="margin-top:6px"><div style="flex:1"><label>von</label><select id="f_z" onchange="zchg()">'+tOpts(j.zeit||'08:00')+'</select></div><div style="flex:1"><label>bis</label><select id="f_e" onchange="sug()">'+tOpts(j.ende||'09:00')+'</select></div></div>'+
 '<div id="db"><label>Dauer in Tagen</label><input id="f_d" oninput="sug()" type="number" min="1" max="60" value="'+j.tage+'"></div>'+
 '<div id="sg"></div><label>Datum (leer = noch offen)</label><input id="f_s" type="date" value="'+j.start+'">'+
 (id?'':'<label>Wiederholen</label><div class="row"><select id="f_r" style="flex:1 1 150px" onchange="document.getElementById(\'f_rb\').style.display=this.value?\'\':\'none\'"><option value="">Nicht wiederholen</option><option value="7">Wöchentlich</option><option value="14">Alle 2 Wochen</option><option value="m">Monatlich</option></select>'+
  '<div id="f_rb" style="flex:1 1 150px;display:none"><input id="f_ru" type="date" aria-label="Wiederholen bis" value="'+fmt(new Date(Date.now()+92*864e5))+'"><div class="sub">bis einschließlich</div></div></div>')+
 (id&&nDays(byId(id))>1?'<div class="sec">Aufteilen</div><div class="sub">Den mehrtägigen Auftrag in einzelne Einträge teilen – danach lässt sich jeder Teil einzeln verschieben und zuteilen.</div><div class="row" style="margin-top:8px">'+splitUI(byId(id))+'</div>':'')+
 '<div class="sec">Details</div><label>Adresse</label><input id="f_a" value="'+esc(j.adresse)+'"><label>Telefon</label><input id="f_t" type="tel" value="'+esc(j.tel)+'">'+(CUSTOK?'<div class="row" style="margin-top:6px"><button type="button" class="b" style="flex:none" onclick="kFromDlg(this)">'+ic('plus')+' Als Kunde speichern</button></div>':'')+
 '<label class="chk"><input id="f_m" type="checkbox"'+(j.material?' checked':'')+'> Material ist da</label><label>Notiz</label><textarea id="f_n" rows="3">'+esc(j.notiz)+'</textarea>'+
 '</div></div><div class="row ft">'+(id&&canDel(byId(id))?'<button class="b d" style="flex:none" onclick="if(del(\''+id+'\'))document.getElementById(\'dlg\').close()" title="Auftrag löschen">'+ic('trash')+'</button>':'')+'<button class="b" onclick="document.getElementById(\'dlg\').close()">Abbrechen</button><button class="b p" onclick="sv()">Speichern</button></div>';
 var wb=d.querySelectorAll('#s_wer button');function wv(){wb.forEach(function(b){b.classList.toggle('on',j.wer.indexOf(b.dataset.v)>-1)})}
 wb.forEach(function(b){b.onclick=function(){var i=j.wer.indexOf(b.dataset.v);if(i>-1)j.wer.splice(i,1);else j.wer.push(b.dataset.v);wv();sug()}});wv();
 ['art'].forEach(function(k){var s=d.querySelector('#s_'+k);s.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.dataset.v==j[k]);b.onclick=function(){j[k]=b.dataset.v;s.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x==b)});sug()}})});
 var zb=d.querySelectorAll('#s_zt button');
 function zv(){d.querySelector('#tb').style.display=cur.zt?'flex':'none';zb.forEach(function(b){b.classList.toggle('on',(b.dataset.v=='1')==cur.zt)})}
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
 parts.forEach(function(len,i){var p=i?Object.assign({},j,{id:uuid(),wer:(j.wer||[]).slice(),created_by:ME.user_id}):j;p.start=j.start?days[o]:'';p.tage=len;o+=len;if(i)neu.push(p);save(p)});
 S.jobs=S.jobs.concat(neu);document.getElementById('dlg').close();render()}
function sv(){var j=cur.j,g=function(i){return document.getElementById(i)},st=g('f_s').value;
 if(st&&R(j.art)&&isWE(st)){alert(WEMSG);return}
 j.kunde=g('f_k').value.trim();j.adresse=g('f_a').value.trim();j.tel=g('f_t').value.trim();j.start=st;j.fix=cur.fx;j.imp=g('f_i').checked;j.material=g('f_m').checked;j.notiz=g('f_n').value.trim();
 if(cur.zt){j.zeit=g('f_z').value||'08:00';j.ende=g('f_e').value;if(!j.ende||j.ende<=j.zeit)j.ende=m2t(t2m(j.zeit)+60)}else{j.zeit='';j.ende=''}
 j.tage=Math.max(1,parseInt(g('f_d').value)||1);
 // Wiederholen: Kopien bis zum Enddatum anlegen (gleiche Serien-ID), höchstens 120
 var rp=g('f_r')&&g('f_r').value,ru=g('f_ru')&&g('f_ru').value,extra=[];
 if(cur.isNew&&rp&&j.start){if(!ru||ru<j.start){alert('Bitte ein Enddatum für die Wiederholung angeben.');return}
  j.series=uuid();var b0=parse(j.start),k=1;
  while(extra.length<120){var d;if(rp=='m'){d=new Date(b0.getFullYear(),b0.getMonth()+k,b0.getDate());if(d.getDate()!=b0.getDate())d=new Date(b0.getFullYear(),b0.getMonth()+k+1,0)}else d=new Date(b0.getTime()+k*rp*864e5);
   k++;var ds=fmt(d);if(ds>ru)break;if(R(j.art))ds=norm(ds);if(ds>ru)break;
   extra.push(Object.assign({},j,{id:uuid(),wer:j.wer.slice(),start:ds}))}}
 if(cur.isNew)S.jobs.push(j);else S.jobs=S.jobs.map(function(o){return o.id==j.id?j:o});save(j);
 extra.forEach(function(x){S.jobs.push(x);save(x)});if(extra.length)alert('Serie angelegt: '+(extra.length+1)+' Termine.');g('dlg').close();if(j.start)an=j.start;tab=j.start?'plan':'offen';render()}
