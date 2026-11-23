// Planner – Reiter „ToDos“: dieselbe Liste wie in der ERP (Tabelle erp_todos, eine Liste je Firma).
// Anlegen, abhaken, bearbeiten, eigene offene löschen, „Termin daraus machen“. Wer und wann setzt die Datenbank.
// Nur mit ERP-Modul und Recht „todos“ (aus erp_me, siehe regieRights).
var TDR=false,TDW=false,TDP=false; // ToDos sehen / bearbeiten / Termin daraus machen
var TDE='',TD=null,TDF={st:'offen',q:'',mine:false,rg:'alle'},TDK={},TDB=false; // Liste, Filter, gerade abgehakt (bleiben stehen), Text-Feld offen
function tdRights(m,all){var pm=m&&m.role&&m.role.perms||{};TDW=all||pm.todos=='write';TDR=TDW||pm.todos=='read';TDP=TDW&&(all||pm.planung=='write')}
function tdLoad(){if(!TDR){TD=[];return Promise.resolve(TD)}
 return sb.from('erp_todos').select('*').then(function(r){if(r.error)throw r.error;TDE='';TD=r.data||[];tdCount();return TD})}
function tdCount(){var e=document.getElementById('tdc');if(!e)return;var n=(TD||[]).filter(function(t){return !t.done_at}).length;e.textContent=n?String(n):'';e.hidden=!n}
function tdName(id){var u=id&&uById(id);return u?u.display_name:'–'}
function tdDay(ts){return ts?fmt(new Date(ts)):''}
function tdDate(ts){var d=new Date(ts);return d.getDate()+'.'+(d.getMonth()+1)+'.'+(d.getFullYear()!=new Date().getFullYear()?d.getFullYear():'')}
// Zeitraum gilt fürs Erstelldatum, bei erledigten fürs Erledigt-Datum (wie in der ERP)
function tdFrom(){if(TDF.rg=='alle')return null;var t=new Date(),d=new Date(t.getFullYear(),t.getMonth(),TDF.rg=='monat'?1:t.getDate());if(TDF.rg=='woche')d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function tdShown(){var from=tdFrom(),w=TDF.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return (TD||[]).filter(function(t){if(TDK[t.id])return true;
  if(TDF.st=='offen'&&t.done_at||TDF.st=='erledigt'&&!t.done_at)return false;if(TDF.mine&&t.created_by!=ME.id)return false;
  if(from&&new Date(t.done_at||t.created_at)<from)return false;var h=(t.title+' '+t.body).toLowerCase();return w.every(function(x){return h.indexOf(x)>-1})})
 .sort(function(a,b){if(!a.done_at!=!b.done_at)return a.done_at?1:-1;return String(b.done_at||b.created_at).localeCompare(String(a.done_at||a.created_at))})}
function tdView(hd,m){
 if(TD===null){hd.innerHTML='<h1>ToDos</h1>';m.innerHTML='<div class="empty big">Wird geladen …</div>';tdLoad().catch(function(e){TD=[];TDE=e&&e.message||String(e)}).then(function(){if(tab=='todos')render()});return}
 var open=TD.filter(function(t){return !t.done_at}).length,td=fmt(new Date()),dn=TD.filter(function(t){return t.done_at&&tdDay(t.done_at)==td}).length;
 hd.innerHTML='<h1>ToDos</h1><span class="tdsum">'+open+' offen'+(dn?' · '+dn+' heute erledigt':'')+'</span>';
 var l=tdShown(),f=TDF;
 m.innerHTML=(TDW?'<form class="tdn" onsubmit="tdAdd(event)"><div class="tdr"><label class="sr" for="td_new">Neues ToDo</label><input id="td_new" placeholder="Neues ToDo …" maxlength="200" autocomplete="off" oninput="tdBtn()">'+
   '<button type="submit" class="b p" id="td_add" disabled>'+ic('plus')+'<span class="tlb"> Hinzufügen</span></button></div>'+
   (TDB?'<label class="sr" for="td_body">Text</label><textarea id="td_body" rows="2" maxlength="4000" placeholder="Text (optional)"></textarea>':'')+
   '<button type="button" class="lk tdtx" aria-expanded="'+TDB+'" onclick="tdTx()">'+(TDB?'Ohne Text':'+ Text dazu')+'</button></form>':'')+
  '<div class="tbar tdf"><div class="seg" role="group" aria-label="Anzeigen">'+[['offen','Offen'],['erledigt','Erledigt'],['alle','Alle']].map(function(x){return '<button type="button" aria-pressed="'+(f.st==x[0])+'"'+(f.st==x[0]?' class="on"':'')+' onclick="tdSet(\'st\',\''+x[0]+'\')">'+x[1]+'</button>'}).join('')+'</div>'+
  '<label class="chk tdm"><input type="checkbox"'+(f.mine?' checked':'')+' onchange="tdSet(\'mine\',this.checked)"> Nur meine</label>'+
  '<input id="td_q" type="search" placeholder="Suchen" aria-label="ToDos suchen" value="'+esc(f.q)+'" oninput="tdQ(this.value)">'+
  '<select aria-label="Zeitraum" onchange="tdSet(\'rg\',this.value)">'+[['alle','Alle Zeiten'],['woche','Diese Woche'],['monat','Dieser Monat']].map(function(x){return '<option value="'+x[0]+'"'+(f.rg==x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></div>'+
  '<div id="tdl">'+tdList(l)+'</div>'}
function tdList(l){
 if(TDE)return '<div class="empty big">'+ic('alert')+'<br><b>ToDos konnten nicht geladen werden</b><br><small>'+esc(TDE)+'</small><br><button class="b" onclick="TD=null;render()">Erneut laden</button></div>';
 if(!TD.length)return '<div class="empty big">'+ic('todo')+'<br><b>Noch keine ToDos</b><br><small>Kleine Arbeiten hier schnell notieren und abhaken.</small></div>';
 if(!l.length)return '<div class="empty big">'+ic('todo')+'<br><b>Nichts gefunden</b><br><small>Für diese Auswahl gibt es keine ToDos.</small></div>';
 return '<ul class="tdl" aria-label="ToDos">'+l.map(function(t){var d=!!t.done_at;
  return '<li class="td'+(d?' dn':'')+'"><button type="button" class="tdc" role="checkbox" aria-checked="'+d+'"'+(TDW?'':' disabled')+' aria-label="'+esc(t.title)+(d?' wieder öffnen':' erledigen')+'" onclick="tdDone(\''+t.id+'\')">'+ic('check')+'</button>'+
   '<div class="tdx">'+(TDW?'<button type="button" class="tdt" onclick="tdEdit(\''+t.id+'\')">'+esc(t.title)+'</button>':'<span class="tdt">'+esc(t.title)+'</span>')+
   (t.body?'<div class="tdb">'+esc(t.body)+'</div>':'')+
   '<div class="tdi"><span>Erstellt '+tdDate(t.created_at)+' · '+esc(tdName(t.created_by))+'</span>'+(d?'<span>Erledigt '+tdDate(t.done_at)+' · '+esc(tdName(t.done_by))+'</span>':'')+tdTerm(t)+'</div></div>'+
   (TDP&&!d?'<button type="button" class="b tdj" onclick="tdJob(\''+t.id+'\')" aria-label="Termin daraus machen: '+esc(t.title)+'">'+ic('plan')+'<span>Termin</span></button>':'')+'</li>'}).join('')+'</ul>'}
// Verweis auf den Termin, der daraus entstanden ist
function tdTerm(t){if(!t.job_id)return t.job_linked?'<span class="tdg bad">Termin gelöscht</span>':'';
 var j=byId(t.job_id),lb=j&&j.start?'Termin am '+tdDate(j.start+'T12:00'):j?'Termin ohne Datum':'Termin';
 return j?'<button type="button" class="tdg" onclick="tdGo(\''+j.id+'\')">'+ic('plan')+lb+'</button>':'<span class="tdg">'+ic('plan')+lb+'</span>'}
function tdGo(id){var j=byId(id);if(!j)return;if(j.start){an=j.start;tab='plan'}else tab='offen';render();setTimeout(function(){openJob(id)},50)}
function openJob(id){if(typeof edit=='function'&&byId(id))edit(id)}
function tdBtn(){var i=document.getElementById('td_new');document.getElementById('td_add').disabled=!i.value.trim()}
function tdTx(){var v=document.getElementById('td_new').value;TDB=!TDB;render();var i=document.getElementById('td_new');i.value=v;tdBtn();(TDB?document.getElementById('td_body'):i).focus()}
function tdSet(k,v){TDF[k]=v;TDK={};render()}
function tdQ(v){TDF.q=v;TDK={};document.getElementById('tdl').innerHTML=tdList(tdShown())}
function tdAdd(e){e.preventDefault();var i=document.getElementById('td_new'),b=document.getElementById('td_body'),t=i.value.trim();if(!t)return;
 document.getElementById('td_add').disabled=true;
 sb.from('erp_todos').insert({title:t.slice(0,200),body:(b?b.value.trim():'').slice(0,4000)}).then(function(r){if(r.error){tdBtn();fail(r.error);return}
  TDB=false;if(TDF.st=='erledigt')TDF.st='offen';return tdLoad().then(function(){render();var n=document.getElementById('td_new');if(n)n.focus()})}).catch(fail)}
function tdDone(id){var t=(TD||[]).filter(function(x){return x.id==id})[0];if(!t||!TDW)return;var was=!!t.done_at;
 sb.from('erp_todos').update({done_at:was?null:new Date().toISOString()}).eq('id',id).then(function(r){if(r.error){fail(r.error);return}
  TDK[id]=1;return tdLoad().then(function(){render();var c=document.querySelector('.tdc[onclick*="'+id+'"]');if(c)c.focus()})}).catch(fail)}
// Bearbeiten: Titel und Text; löschen nur, wer es erstellt hat, und nur solange es offen ist
function tdEdit(id){var t=(TD||[]).filter(function(x){return x.id==id})[0];if(!t)return;var d=document.getElementById('dlg'),mine=t.created_by==ME.id&&!t.done_at;
 d.innerHTML='<div class="dt2"><b>ToDo bearbeiten</b><button class="ib" aria-label="Schließen" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div>'+
  '<label for="td_et">Titel</label><input id="td_et" maxlength="200" value="'+esc(t.title)+'" autocomplete="off">'+
  '<label for="td_eb">Text</label><textarea id="td_eb" rows="4" maxlength="4000">'+esc(t.body)+'</textarea>'+
  '<div class="tdi tdei"><span>Erstellt '+tdDate(t.created_at)+' · '+esc(tdName(t.created_by))+'</span>'+(t.done_at?'<span>Erledigt '+tdDate(t.done_at)+' · '+esc(tdName(t.done_by))+'</span>':'')+'</div>'+
  '<div class="row tdeb">'+(mine?'<button type="button" class="b d" onclick="tdDel(\''+id+'\')">'+ic('trash')+' Löschen</button>':'')+'<span class="sp"></span>'+
  '<button type="button" class="b" onclick="document.getElementById(\'dlg\').close()">Abbrechen</button><button type="button" class="b p" onclick="tdSave(\''+id+'\')">'+ic('save')+' Speichern</button></div>';
 d.showModal();d.scrollTop=0}
function tdSave(id){var t=document.getElementById('td_et').value.trim();if(!t){alert('Bitte einen Titel angeben.');return}
 sb.from('erp_todos').update({title:t.slice(0,200),body:document.getElementById('td_eb').value.trim().slice(0,4000)}).eq('id',id).then(function(r){if(r.error){fail(r.error);return}
  document.getElementById('dlg').close();return tdLoad().then(render)}).catch(fail)}
function tdDel(id){var t=(TD||[]).filter(function(x){return x.id==id})[0];if(!t||!confirm('„'+t.title+'“ löschen?'))return;
 sb.from('erp_todos').delete().eq('id',id).then(function(r){if(r.error){fail(r.error);return}document.getElementById('dlg').close();return tdLoad().then(render)}).catch(fail)}
// Termin daraus machen: der gewohnte Termin-Dialog, schon ausgefüllt (Titel wird Kunde/Titel, Text die Notiz).
// Gespeichert über erp_todo_to_job (legt den Termin an und erledigt das ToDo in einem Schritt), danach die übrigen Angaben des Dialogs.
function tdJob(id){var t=(TD||[]).filter(function(x){return x.id==id})[0];if(!t||!TDP)return;
 edit(null,'',null,null,null,{kunde:t.title,notiz:t.body||''});cur.todo=id;
 var d=document.getElementById('dlg'),h=d.querySelector('.dt2 b');if(h)h.textContent='Termin aus ToDo';
 var r=d.querySelector('#f_r');if(r){r.parentNode.style.display='none';if(r.parentNode.previousElementSibling)r.parentNode.previousElementSibling.style.display='none'}}
async function tdJobSave(j){
 if(j.art=='urlaub'){alert('Aus einem ToDo wird kein Urlaub. Bitte eine andere Art wählen.');return false}
 var p={kunde:j.kunde,adresse:j.adresse||'',tel:j.tel||'',notiz:j.notiz||'',art:j.art,start:j.start||null,tage:j.tage||1,zeit:j.zeit||'',ende:j.ende||'',
  stunden:j.stunden!=null?j.stunden:null,wer:wer(j),customerId:erpCust(j),articleId:j.article_id||null};
 var r=await sb.rpc('erp_todo_to_job',{p_todo:cur.todo,p_job:p});if(r.error){fail(r.error);return false}
 j.id=r.data;S.jobs.push(j);save(j);TDK[cur.todo]=1;cur.todo=null;
 try{await tdLoad()}catch(e){}
 return true}
