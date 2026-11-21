// Planner – Auftragskarten, Kalenderansichten, Zeitraster, Ziehen & Ablegen, Feiertage, Filter
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
function card(j,ds,force){
 var o=force||openId==j.id,days=j.start?span(j):[],A={n:jName(j),ic:ART[j.art].ic},id=j.id,mt=(j.art=='montage'||j.art=='werkstatt');
 var pos=ds&&days.length>1?' · Tag '+(days.indexOf(ds)+1)+'/'+days.length:(j.tage>1&&!j.start&&!hrsJ(j)?' · '+j.tage+' Tage':'');
 var tg='<span class="tag fx">'+(PV(j)?ic('pv')+'provisorisch':ic('pin')+'fix')+'</span>';
 if(j.series)tg+='<span class="tag">'+ic('repeat')+'Serie</span>';
 if(j.adresse)tg+='<span class="tag">'+ic('place')+esc(j.adresse)+'</span>';
 var q=function(f,l,c){return '<button class="b '+(c||'')+'" onclick="'+f+'">'+l+'</button>'};
 var h='<div class="job a-'+j.art+wC(j)+' '+(PV(j)?'pv ':'fx ')+(j.done?'done ':'')+(o?'open':'')+'" style="'+wS(j)+'"><div class="jt"'+(force?'':' onclick="edit(\''+id+'\')"')+'><div class="top"><div class="k">'+(j.imp?ic('starf','starx')+' ':'')+esc(j.kunde||'(ohne Name)')+'</div><div class="ic"><button class="st" onclick="event.stopPropagation();impt(\''+id+'\')">'+(j.imp?ic('starf'):ic('star'))+'</button>'+A.ic+'</div></div>'+
 '<div class="sub">'+A.n+' · '+(wer(j).length>1?ic('users')+' ':'')+esc(who(j))+pos+(hrsJ(j)?' · '+ic('clock')+' '+[ds&&j.start?tLbl(j,ds):j.zeit?'ab '+j.zeit:'',hTxt(j.stunden)].filter(Boolean).join(' · '):j.zeit?' · '+ic('clock')+' '+j.zeit+(j.ende?'–'+j.ende:''):'')+'</div><div class="tags">'+tg+'</div>'+(j.notiz?'<div class="sub nt">'+esc(j.notiz)+'</div>':'')+'</div></div>';
 return h}
function tog(id){openId=openId==id?null:id;render()}
function mv(id,n){var j=byId(id);if(n==0)j.start='';else if(n==7)j.start=addDays(j.start,7);else j.start=R(j)?nextWork(norm(j.start),n):addDays(j.start,n);if(mode=='tag'&&j.start)an=j.start;save(j);render()}
function done(id){var j=byId(id);j.done=!j.done;save(j);render()}
// Löschen: nur Admin oder wer den Auftrag angelegt hat (wird zusätzlich in der Datenbank geprüft)
function canDel(j){return ME.role=='admin'||!!j.created_by&&j.created_by==ME.user_id}
function del(id){var j=byId(id);if(!j||!canDel(j)){alert('Löschen darf nur der Admin oder wer den Auftrag angelegt hat.');return false}
 // Serie: wahlweise auch alle folgenden Termine der Serie löschen
 var fol=j.series?S.jobs.filter(function(x){return x.series==j.series&&x.id!=id&&x.start&&j.start&&x.start>j.start&&canDel(x)}):[],ids=[id];
 if(fol.length){if(confirm('„'+(j.kunde||'Auftrag')+'“ gehört zu einer Serie.\n\nOK = diesen und die '+fol.length+' folgenden Termine löschen\nAbbrechen = andere Auswahl'))ids=ids.concat(fol.map(function(x){return x.id}));
  else if(!confirm('Nur diesen einen Termin löschen?'))return false}
 else if(!confirm('Auftrag löschen?'))return false;
 S.jobs=S.jobs.filter(function(x){return ids.indexOf(x.id)<0});render();sb.from('jobs').delete().in('id',ids).then(function(r){if(r.error)fail(r.error)});return true}
function clearDone(){if(ME.role!='admin')return;var ids=S.jobs.filter(function(j){return j.done}).map(function(j){return j.id});if(!ids.length||!confirm(ids.length+' erledigte Aufträge (aller Mitarbeiter) löschen?'))return;
 S.jobs=S.jobs.filter(function(j){return !j.done});render();sb.from('jobs').delete().in('id',ids).then(function(r){if(r.error)fail(r.error)})}
function exp(){var t=JSON.stringify({jobs:S.jobs,hol:S.hol,users:USERS.map(function(u){return {id:u.id,name:u.display_name,username:u.username}})}),a=document.getElementById('bk');a.value=t;a.select();try{navigator.clipboard.writeText(t)}catch(e){}}
// Übernimmt Backups der alten Handy-Version (wer: b/1/2, Aushilfen a/o) und eigene Sicherungen
function imp(){var d;try{d=JSON.parse(document.getElementById('bk').value);if(!d.jobs)throw 0}catch(e){alert('Backup nicht lesbar.');return}
 var byName=function(n){n=String(n||'').trim().toLowerCase();var u=USERS.filter(function(x){return x.display_name.toLowerCase()==n||x.username==n})[0];return u?u.id:null};
 var nm=(d.names||[]).map(byName),miss=(d.names||[]).filter(function(n,i){return !nm[i]});
 var ex={};S.jobs.forEach(function(j){ex[j.id]=1});
 var rows=d.jobs.map(function(j){var w;
  if(Array.isArray(j.wer))w=j.wer.filter(uById);
  else{w=j.wer=='b'?[nm[0],nm[1]]:j.wer=='1'?[nm[0]]:j.wer=='2'?[nm[1]]:[];(j.hf||[]).forEach(function(x){w.push(nm[x=='a'?2:3])})}
  w=w.filter(function(x,i){return x&&w.indexOf(x)==i});
  var id=/^[0-9a-f-]{36}$/.test(j.id)?j.id:uuid();
  return toRow(Object.assign({},j,{id:id,wer:w,zeit:j.zeit||'',ende:j.ende||''}))});
 var neu=rows.filter(function(r){return !ex[r.id]}).length;
 if(!confirm(rows.length+' Aufträge übernehmen ('+neu+' neu, '+(rows.length-neu)+' werden überschrieben)?'+(miss.length?'\n\nOhne passenden Mitarbeiter (bitte vorher anlegen, gleicher Name): '+miss.join(', '):'')))return;
 var hol=(d.hol||[]).map(function(h){return {d:h.d,n:h.n}});
 Promise.all([sb.from('jobs').upsert(rows),hol.length?sb.from('holidays').upsert(hol):{}]).then(function(r){var e=r.filter(function(x){return x.error})[0];if(e)fail(e.error);else{alert('Übernommen.');document.getElementById('bk').value='';reload()}})}

var ART={montage:{n:'Montage',ic:ic('montage')},werkstatt:{n:'Werkstatt',ic:ic('werkstatt')},planung:{n:'Planung',ic:ic('planung')},termin:{n:'Termin',ic:ic('clock')},urlaub:{n:'Urlaub',ic:ic('urlaub')}},COL={montage:'var(--mo)',werkstatt:'var(--we)',planung:'var(--pl)',termin:'var(--tm)',urlaub:'var(--ur)'};
var MF=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],MODES=[['liste','Liste'],['tag','Tag'],['team','Team'],['woche','Woche'],['monat','Monat'],['jahr','Jahr']];
// Plan: Kopfzeile (PC: eine Werkzeugleiste, Handy: Titel zum Aufklappen), darunter der Kalender.
// Seitenleiste (PC), Aufklapp-Menü (Handy), Liste, Filter usw. stehen in ansicht.js.
function plan(hd,m){
 var a=parse(an),t,h='',W=innerWidth>=900;
 capScr();
 dm={};S.jobs.forEach(function(j){if(j.start&&(mode=='team'||vis(j)))span(j).forEach(function(d){(dm[d]=dm[d]||[]).push(j)})});
 if(mode=='tag'||mode=='team')t=WD[a.getDay()]+' '+a.getDate()+'. '+MN[a.getMonth()];
 else if(mode=='liste')t='Ab '+WD[a.getDay()]+' '+a.getDate()+'. '+MN[a.getMonth()];
 else if(mode=='woche'){var w0=monday(a),e=new Date(w0);e.setDate(e.getDate()+(WW5?4:6));t='KW '+kw(w0)+' · '+w0.getDate()+'.–'+e.getDate()+'. '+MN[e.getMonth()]}
 else if(mode=='monat')t=MF[a.getMonth()]+' '+a.getFullYear();
 else t=''+a.getFullYear();
 hd.className='hdp';document.body.classList.toggle('cm-ma',CM=='ma');document.body.classList.toggle('fs',FS&&W);document.body.classList.toggle('ddo',DD&&!W);
 var sb=SBO&&!FS;
 if(W)hd.innerHTML='<button class="ib pnav" onclick="step(-1)" title="Zurück">'+ic('left')+'</button><button class="ib pnav" onclick="goToday()" title="Heute">'+ic('today')+'</button><button class="ib pnav" onclick="step(1)" title="Weiter">'+ic('right')+'</button><h1>'+t+fltSub()+'</h1>'+
  '<button class="ib" onclick="showSearch()" title="Suchen">'+ic('search')+'</button><button class="ib" onclick="printPlan()" title="Drucken / als PDF speichern">'+ic('print')+'</button>'+modesSeg()+
  '<button class="ib tgl'+(sb?' on':'')+'" onclick="sbTog()" title="Seitenleiste ein/aus (S)" aria-pressed="'+sb+'">'+ic('side')+'</button><button class="ib tgl'+(FS?' on':'')+'" onclick="fsTog()" title="Vollbild (F)" aria-pressed="'+FS+'">'+ic(FS?'shrink':'expand')+'</button>';
 else hd.innerHTML='<h1><button class="ttl" onclick="ddTog()" aria-expanded="'+DD+'">'+t+ic(DD?'up':'down')+'</button>'+fltSub()+'</h1><button class="ib" onclick="showSearch()" title="Suchen">'+ic('search')+'</button><button class="ib" onclick="goToday()" title="Heute">'+ic('today')+'</button>';
 var mv='';
 if(mvId){var mj=byId(mvId);mv='<div class="mvb">'+ic('move')+' <b>'+esc(mj.kunde||'Auftrag')+'</b> verschieben: Ziel antippen (Tag oder Uhrzeit). Ansicht darf gewechselt werden.<div class="row"><button class="b" onclick="mvId=null;render()">Abbrechen</button><button class="b" onclick="drop(\'\')">In „Offen“</button><button class="b" onclick="det()">Details</button></div></div>'}
 if(mode=='tag')h='<div class="dv"><div class="dvg">'+timeGrid(dayCols([an]))+'</div><div class="dvl">'+dayBlock(an)+'</div></div>';
 else if(mode=='liste')h=agenda();
 else if(mode=='team')h=teamGrid(an);
 else if(mode=='woche')h=weekGrid(monday(a));
 else if(mode=='monat')h=innerWidth<600?monthGrid(a.getFullYear(),a.getMonth(),'bars')+mDay(an):monthGrid(a.getFullYear(),a.getMonth(),'full');
 else{h='<div class="yr">';for(var q2=0;q2<12;q2++)h+=monthGrid(a.getFullYear(),q2,'mini');h+='</div>'}
 if(W)m.innerHTML='<div class="plw'+(sb?'':' nosb')+'">'+(sb?'<aside class="sbar" aria-label="Seitenleiste">'+sideBar()+'</aside>':'')+'<div class="plc">'+mv+'<div class="swp">'+h+'</div></div></div>';
 else m.innerHTML=(DD?ddPanel():'')+mv+'<div class="swp">'+h+'</div>'}
// Legende/Bedienung: offen/zu merken (Standard: Breitbild offen, Handy zu)
function lgOpen(){var v=lsGet('planer_lg');return v?v=='1':innerWidth>=900}
function lgSet(o){lsSet('planer_lg',o?'1':'0')}
function hintTxt(){if(mode=='liste')return 'Termin antippen = Details · Tag antippen = Tagesansicht · wischen = 30 Tage weiter';
 if(mode=='tag'||mode=='team'||mode=='woche')return 'Termin antippen = bearbeiten · halten und ziehen = verschieben · Rand oben/unten ziehen (Handy: lange drücken) = Dauer · freie Zeit antippen oder markieren = neuer Termin'+(mode=='team'?' · in andere Spalte ziehen = anderem Mitarbeiter zuteilen':'');
 if(mode=='monat')return innerWidth<600?'Tag antippen = Termine darunter · noch einmal antippen = Tagesansicht · halten und ziehen = verschieben':'Auftrag antippen = bearbeiten · halten und ziehen = verschieben · Tag antippen = Tagesansicht';
 return 'Tag antippen = Tagesansicht · halten und ziehen = verschieben'}
// Reihenfolge: ganztägige zuerst, dann nach Uhrzeit
function sortJ(js){return js.slice().sort(function(a,b){return (a.zeit?1:0)-(b.zeit?1:0)||t2m(a.zeit||'00:00')-t2m(b.zeit||'00:00')})}
function dayBlock(ds){var d=parse(ds),js=dm[ds]||[];
 return '<div class="day"><div class="dh'+(ds==fmt(new Date())?' today':'')+'"><span onclick="an=\''+ds+'\';setMode(\'tag\')">'+WD[d.getDay()]+' <small>'+d.getDate()+'. '+MN[d.getMonth()]+(HOL[ds]?' · '+ic('flag')+' '+esc(HOL[ds]):'')+'</small></span>'+(mvId?'<button class="b p" style="flex:none;min-height:34px" onclick="drop(\''+ds+'\')">Hierher</button>':'<button class="add" onclick="edit(null,\''+ds+'\')" title="Neuer Termin">'+ic('plus')+'</button>')+'</div>'+(js.length?sortJ(js).map(function(j){return card(j,ds)}).join(''):'<div class="empty">frei</div>')+'</div>'}
// Monat: mit Mo–Fr (Schalter WW5) ohne Sa/So; liegen dort Termine, steht am Freitag „+n Sa/So“
function monthGrid(y,mo,kind){
 var n=new Date(y,mo+1,0).getDate(),td=fmt(new Date()),first=true,f5=WW5&&kind!='mini',pk=mode=='monat'&&kind=='bars',h='<div class="mg '+kind+'">';
 if(kind!='full'&&mode!='monat')h+='<div class="mt" onclick="an=\''+fmt(new Date(y,mo,1))+'\';setMode(\'monat\')">'+(kind=='mini'?MN[mo]:MF[mo]+' '+y)+'</div>';
 if(kind!='mini')h+='<div class="gr wl'+(f5?' w5':'')+'"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span>'+(f5?'':'<span>Sa</span><span>So</span>')+'</div>';
 h+='<div class="gr'+(f5?' w5':'')+'">';
 for(var d=1;d<=n;d++){var dt=new Date(y,mo,d),g=dt.getDay();if(first){for(var p=0;p<(f5?(g>=1&&g<=5?g-1:0):(g+6)%7);p++)h+='<div></div>';first=false}
  if(f5&&(g==0||g==6))continue;
  var ds=fmt(dt),js=sortJ(dm[ds]||[]),c='c'+(ds==td?' td':'')+(g==0||g==6?' wd':'')+(HOL[ds]?' hol':'')+(pk&&ds==an?' sel':''),oc=' data-drop="'+ds+'" onclick="cell(\''+ds+'\')"';
  var we=f5?weHint(ds,g,d):'';
  if(kind=='mini'){var ar=[],fxs={},anyF=false;js.forEach(function(j){var k=jCol(j);if(ar.indexOf(k)<0)ar.push(k);if(!PV(j)){fxs[k]=1;anyF=true}});var cl=function(a){return fxs[a]?a:'color-mix(in srgb,'+a+' 40%,var(--card))'};var bg=ar.length?(ar.length>1?'linear-gradient(135deg,'+cl(ar[0])+' 50%,'+cl(ar[1])+' 50%)':cl(ar[0])):'';h+='<div class="'+c+(anyF?' f':(ar.length?' pvc':''))+(js.length?wC(js[0]):'')+(js.some(function(j){return j.imp})?' imp':'')+'"'+oc+(js.length?' data-id="'+js[0].id+'" data-ds="'+ds+'"':'')+' style="'+(js.length?wS(js[0]):'')+(bg?'background:'+bg:'')+'"><i>'+d+'</i></div>'}
  else if(kind=='bars')h+='<div class="'+c+'"'+oc+'><i>'+d+'</i>'+js.slice(0,4).map(function(j){return '<u class="bar '+j.art+wC(j)+(PV(j)?' pv':'')+(j.imp?' imp':'')+'" style="'+wS(j)+'" data-id="'+j.id+'" data-ds="'+ds+'"'+(cnt(j)>1?' data-n="'+cnt(j)+'"':'')+'></u>'}).join('')+(js.length>4?'<i class="more">+'+(js.length-4)+'</i>':'')+we+'</div>';
  else h+='<div class="'+c+'"'+oc+'><i>'+d+'</i>'+(HOL[ds]?'<em class="hn">'+esc(HOL[ds])+'</em>':'')+js.map(function(j){return '<span class="ch '+j.art+wC(j)+(PV(j)?' pv':'')+(j.done?' dn':'')+(mvId==j.id?' sel':'')+'" style="'+wS(j)+'" data-id="'+j.id+'" data-ds="'+ds+'" onclick="event.stopPropagation();evClick(\''+j.id+'\',\''+ds+'\')">'+chLines(j,ds)+'</span>'}).join('')+(js.length?'<i class="more" hidden></i>':'')+we+'</div>'}
 return h+'</div></div>'}
// PC-Monat: Zeilen eines Termins; was davon sichtbar bleibt, entscheidet fillMonth (ansicht.js) je nach Platz
function chLines(j,ds){var t=j.zeit?(hrsJ(j)?tLbl(j,ds).split('–')[0]:j.zeit):'',l=[jName(j)+' · '+who(j)];
 if(j.adresse)l.push(ic('place')+' '+esc(j.adresse));if(j.notiz)l.push(esc(j.notiz));
 return '<span class="cl">'+(j.imp?ic('starf','starx')+' ':'')+(t?'<b>'+t+'</b> ':'')+esc(j.kunde||'?')+'</span>'+l.map(function(x){return '<span class="cl">'+x+'</span>'}).join('')}
// Handy-Monat: erstes Antippen zeigt die Termine des Tages darunter, zweites öffnet die Tagesansicht
function cell(ds){if(mvId)drop(ds);else if(mode=='monat'&&innerWidth<600&&an!=ds){an=ds;render()}else{an=ds;setMode('tag')}}
// mvE: Mitarbeiter-Spalte, aus der in der Team-Ansicht verschoben wird ('-' = nicht zugeteilt)
var mvE='';
function drop(ds){var j=byId(mvId);if(ds&&R(j)&&isWE(ds)){alert(WEMSG);return}
 if(ds){var st=ds,i=!j.start?0:Math.max(0,span(j).indexOf(mvG));for(;i>0;i--)st=R(j)?nextWork(st,-1):addDays(st,-1);j.start=st}else j.start='';
 mvG='';mvE='';if(ds&&(mode=='tag'||mode=='team'))an=j.start;mvId=null;save(j);render()}
// Team-Ansicht: in eine andere Mitarbeiter-Spalte gezogen = statt der Ausgangsperson die Zielperson zuteilen
function reassign(j,from,to){if(!to||!from||from==to)return;
 var w=(j.wer||[]).filter(function(x){return x!=from});if(to!='-'&&w.indexOf(to)<0)w.push(to);j.wer=w}
// Uhrzeit (Minuten, im Raster STEP) an der Zeigerposition in einer Stundenspalte
var STEP=15;
// Ganztägige Termine erscheinen im Raster über den Zeitraum der Firma (Einstellung des Admins, Standard 08:00–17:00)
function adWin(){return {s:t2m(ORG&&ORG.allday_start||'08:00'),e:t2m(ORG&&ORG.allday_end||'17:00')}}
// Beginn/Ende eines Termins im Raster (Minuten); bei Terminen in Stunden je Tag (ds)
function jWin(j,ds){if(hrsJ(j)){var dd=j.start?span(j):[],w=hWin(j,Math.max(0,dd.indexOf(ds)),dd.length||1);return {s:w.s,e:Math.max(w.e,w.s+30)}}
 if(!j.zeit){var a=adWin();return {s:a.s,e:a.e}}var s0=t2m(j.zeit);return {s:s0,e:Math.max(t2m(j.ende||j.zeit),s0+30)}}
// Uhrzeit-Text eines Termins an einem Tag
function tLbl(j,ds){if(hrsJ(j)&&j.zeit){var w=jWin(j,ds);return m2t(w.s)+'–'+m2t(w.e)}return j.zeit?j.zeit+(j.ende?'–'+j.ende:''):'ganztags'}
// Ränder zum Ändern der Dauer: bei mehrtägigen Terminen in Stunden oben nur am ersten, unten nur am letzten Tag
function rzH(j,ds,hp){var dd=hrsJ(j)&&j.start?span(j):null,t=!dd||dd[0]==ds,b=!dd||dd[dd.length-1]==ds;
 return (t&&hp>=36?'<i class="rz rt" data-rz="t"></i>':'')+(b?'<i class="rz rb" data-rz="b"></i>':'')}
function slotMin(e,down){var r=e.currentTarget.getBoundingClientRect(),m=((e.clientY-r.top)/HH+H0)*60;m=(down?Math.floor(m/STEP):Math.round(m/STEP))*STEP;return Math.max(0,Math.min(1440-STEP,m))}
// Stundenspalte: im Verschiebemodus Ziel (ganztägige Termine bleiben ganztägig), sonst freie Zeit = neuer Termin
function dropT(ds,e){var emp=e.currentTarget.dataset.emp;
 if(!mvId){if(e.target===e.currentTarget||e.target.classList.contains('now'))edit(null,ds,m2t(slotMin(e,true)),null,emp);return}
 var j=byId(mvId);if(R(j)&&isWE(ds)){alert(WEMSG);return}
 var m0=slotMin(e);
 if(j.zeit){if(hrsJ(j)){j.zeit=m2t(m0);fit(j)}else{var du=(t2m(j.ende||j.zeit)-t2m(j.zeit))||60;j.zeit=m2t(m0);j.ende=m2t(m0+du)}}
 reassign(j,mvE,emp);drop(ds)}
// Termin antippen: Tagesansicht = Details öffnen, sonst zum Verschieben auswählen
function evClick(id,ds,emp){if(mvId){drop(ds);return}edit(id)}
// Früher Detailfenster: Antippen führt jetzt direkt ins Bearbeiten (Aufrufer bleiben gültig)
function showDet(id){edit(id)}
function detRefresh(){var d=document.getElementById('dlg'),v=d.open&&d.querySelector('.detv');if(!v)return;if(byId(v.dataset.id))showDet(v.dataset.id,v.dataset.ds);else d.close()}
function hdr(ds){if(mvId)drop(ds);else{an=ds;setMode('tag')}}
function pick(id){var j=byId(id),dd=document.getElementById('dlg');if(dd.open)dd.close();mvId=id;mvG='';mvE='';tab='plan';openId=null;if(mode=='tag'||mode=='team')mode='monat';if(j.start)an=j.start;window.scrollTo(0,0);render()}
function det(){var j=byId(mvId);if(j.start)an=j.start;openId=mvId;mvId=null;mvE='';setMode('tag')}
// Suche über alle Aufträge: Kunde, Adresse, Telefon, Notiz, Art und Mitarbeiter
var SQ='';
function showSearch(){var d=document.getElementById('dlg');
 d.innerHTML='<div class="dt2"><b>Suchen</b><button class="ib" onclick="document.getElementById(\'dlg\').close()">'+ic('x')+'</button></div>'+
  '<input id="q" type="search" placeholder="Kunde, Adresse, Telefon, Notiz, Mitarbeiter …" oninput="doSearch()" autocomplete="off"'+NC+'><div id="qr" class="qr"></div>';
 if(!d.open)d.showModal();var q=document.getElementById('q');q.value=SQ;q.focus();doSearch()}
// Trefferzeile (Suche, Kunden-Detail): Datum, Titel, Art · Mitarbeiter · Adresse – Tippen öffnet die Details
function qRow(j){var p=j.start?parse(j.start):null;return '<button class="qrr a-'+j.art+(j.done?' dn':'')+'" style="'+wS(j)+'" onclick="edit(\''+j.id+'\')"><span class="qd">'+(p?WD[p.getDay()]+' '+dDE(j.start)+(j.zeit?' · '+j.zeit:''):'ohne Termin')+(j.done?' · erledigt':'')+'</span><b>'+esc(j.kunde||'(ohne Name)')+'</b><small>'+ART[j.art].n+' · '+esc(who(j))+(j.adresse?' · '+esc(j.adresse):'')+'</small></button>'}
function doSearch(){var q=document.getElementById('q');if(!q)return;SQ=q.value;var t=SQ.trim().toLowerCase(),out=document.getElementById('qr'),td=fmt(new Date());
 if(t.length<2){out.innerHTML='<div class="sub">Mindestens 2 Zeichen eingeben.</div>';return}
 var hit=S.jobs.filter(function(j){return [j.kunde,j.adresse,j.tel,j.notiz,who(j),jName(j)].join(' ').toLowerCase().indexOf(t)>-1});
 var up=hit.filter(function(j){return j.start&&j.start>=td}).sort(function(a,b){return a.start<b.start?-1:a.start>b.start?1:t2m(a.zeit||'00:00')-t2m(b.zeit||'00:00')}),
  op=hit.filter(function(j){return !j.start}),
  pa=hit.filter(function(j){return j.start&&j.start<td}).sort(function(a,b){return a.start<b.start?1:-1});
 var row=qRow;
 var grp=function(t,l){return l.length?'<div class="lbl" style="margin-top:12px">'+t+' ('+l.length+')</div>'+l.slice(0,40).map(row).join(''):''};
 out.innerHTML=hit.length?grp('Kommend',up)+grp('Ohne Termin',op)+grp('Vergangen',pa):'<div class="sub">Nichts gefunden.</div>'}
// Drucken bzw. „Als PDF speichern“: aktuelle Ansicht, Querformat, immer hell
function printPlan(){var r=document.documentElement,t=r.getAttribute('data-theme');r.setAttribute('data-theme','light');
 var back=function(){if(t)r.setAttribute('data-theme',t);else r.removeAttribute('data-theme');removeEventListener('afterprint',back)};
 addEventListener('afterprint',back);setTimeout(function(){window.print()},50)}
function setMode(k){mode=k;DD=false;MM='';lsSet('planer_mode',k);render()}
function goToday(){an=fmt(new Date());MM='';render()}
function step(n){MM='';if(mode=='tag'||mode=='team')an=addDays(an,n);else if(mode=='liste')an=addDays(an,30*n);else if(mode=='woche')an=addDays(an,7*n);else{var d=parse(an);d.setDate(1);d.setMonth(d.getMonth()+({monat:1,jahr:12}[mode])*n);an=fmt(d)}render()}
// Spalten des Zeitrasters: Tage (Tag/Woche) oder Mitarbeiter (Team)
function satSun(ds){var g=parse(ds).getDay();return g==0||g==6}
function dayCols(days){var td=fmt(new Date());return days.map(function(ds){var d=parse(ds);
 return {ds:ds,head:'<div class="wh2'+(ds==td?' today':'')+(HOL[ds]?' hol':'')+(satSun(ds)?' wkd':'')+'" data-drop="'+ds+'" onclick="hdr(\''+ds+'\')">'+WD[d.getDay()]+'<b>'+d.getDate()+'</b>'+(HOL[ds]?'<em class="hn">'+esc(HOL[ds])+'</em>':'')+'</div>'}})}
// Woche: wahlweise nur Arbeitswoche Mo–Fr (Einstellung pro Gerät)
var WW5=lsGet('planer_ww')=='5';
function setWW(v){WW5=v;lsSet('planer_ww',v?'5':'');render()}
function weekGrid(w){var days=[];for(var i=0;i<(WW5?5:7);i++){var x=new Date(w);x.setDate(w.getDate()+i);days.push(fmt(x))}return timeGrid(dayCols(days))}
// Team wie Outlook „Nebeneinander“: ein Tag, eine Spalte pro Mitarbeiter
function teamGrid(ds){
 var cols=usersSorted().map(function(u){return {ds:ds,emp:u.id,head:'<div class="wh2 tmh" style="--uc:'+esc(u.color)+'"><b>'+esc(u.display_name)+'</b>'+(u.user_id?'':'<em class="hn">ohne Anmeldung</em>')+'</div>'}});
 if((dm[ds]||[]).some(function(j){return !wer(j).length}))cols.push({ds:ds,emp:'-',head:'<div class="wh2 tmh"><b>Nicht zugeteilt</b></div>'});
 return timeGrid(cols,true)}
function colJobs(c){return (dm[c.ds]||[]).filter(function(j){if(!c.emp)return true;var w=wer(j);return c.emp=='-'?!w.length:w.indexOf(c.emp)>-1})}
// Zeitraster wie in Outlook: oben die Ganztags-Zeile, darunter die Stunden mit 30-Minuten-Linien.
// Ganztägige Termine stehen als Block im Firmen-Zeitraum. Halten und ziehen = verschieben, Rand oben/unten ziehen = Dauer.
function timeGrid(cols,team){
 var one=cols.length==1,wide=innerWidth>=900,lo=360,hi=1200,td=fmt(new Date()),nw0=new Date(),nm=nw0.getHours()*60+nw0.getMinutes(),det=one||team;
 cols.forEach(function(c){colJobs(c).forEach(function(j){var w=jWin(j,c.ds);lo=Math.min(lo,w.s);hi=Math.max(hi,w.e)})});
 var h0=Math.floor(lo/60),h1=Math.min(24,Math.ceil(hi/60));
 // Stundenhöhe: mindestens so hoch, dass die Stunden den freien Platz füllen; Zoom (ZF) darauf
 HH=Math.max(14,Math.round(Math.max(one?56:team?48:wide?44:30,gridAvail()/(h1-h0))*ZF));var H=(h1-h0)*HH;H0=h0;H1=h1;
 var row=function(cls,first,cells){return '<div class="wk '+cls+'" style="grid-template-columns:'+(one||wide||team?'52px':'30px')+' repeat('+cols.length+','+(team?'minmax(130px,1fr)':'minmax(0,1fr)')+')'+(team?';min-width:'+(52+cols.length*130)+'px':'')+'">'+first+cells+'</div>'};
 var ea=function(c){return c.emp?' data-emp="'+c.emp+'"':''},ce=function(c){return c.emp?',\''+c.emp+'\'':''};
 var cls=function(j){return j.art+wC(j)+(PV(j)?' pv':'')+(j.done?' dn':'')+(mvId==j.id?' sel':'')},att=function(j,c){return ' data-id="'+j.id+'" data-ds="'+c.ds+'"'+ea(c)+' onclick="event.stopPropagation();evClick(\''+j.id+'\',\''+c.ds+'\''+ce(c)+')"'};
 var h='<div class="tg'+(one?' one':'')+(team?' team':'')+'" style="--hh:'+HH+'px">';
 h+=row('tgh','<div></div>',cols.map(function(c){return c.head}).join(''));
 var hl='<div>';for(var k=h0;k<h1;k++)hl+='<div class="hl" style="height:'+HH+'px">'+(one||wide||team?String(k).padStart(2,'0')+':00':k)+'</div>';hl+='</div>';
 h+=row('tgb',hl,cols.map(function(c){var ds=c.ds;
  var js=colJobs(c).sort(function(a,b){return jWin(a,ds).s-jWin(b,ds).s||jWin(b,ds).e-jWin(a,ds).e});
  var pl=layLanes(js.map(function(j){var w=jWin(j,ds);return {j:j,s:w.s,e:w.e}}));
  return '<div class="dcol'+(HOL[ds]?' hol':'')+(ds==td&&!team?' tdc':'')+(satSun(ds)?' wkd':'')+'" data-drop="'+ds+'"'+ea(c)+' style="height:'+H+'px" onclick="dropT(\''+ds+'\',event)">'+
   (ds==td&&nm>=h0*60&&nm<=h1*60?'<div class="now" style="top:'+((nm/60-h0)*HH)+'px"></div>':'')+
   (function(){
    // Woche: höchstens 2 Termine nebeneinander (auch am Handy), ab dem dritten „+n“ – Tippen öffnet den Tag
    var maxL=one||team?99:2,hid=pl.filter(function(q){return q.l>=maxL}),rs=hid.length?'24px':'0px',out='',k=null;
    var mo=function(x){return '<div class="evm" style="top:'+((x.s/60-h0)*HH+2)+'px" onclick="event.stopPropagation();an=\''+ds+'\';setMode(\'tag\')" title="Weitere Termine – Tag öffnen">+'+x.n+'</div>'};
    hid.forEach(function(q){if(k&&q.s<k.e){k.n++;k.e=Math.max(k.e,q.e)}else{if(k)out+=mo(k);k={s:q.s,e:q.e,n:1}}});if(k)out+=mo(k);
    // Mehrere Termine gleichzeitig wie Google Kalender: nebeneinander nur, wo sie sich überschneiden, jeder so breit wie frei ist,
    // Schrift bleibt waagrecht und wird mit „…“ gekürzt (alles im Tooltip)
    return pl.filter(function(q){return q.l<maxL}).map(function(q){var j=q.j,hp=(q.e-q.s)/60*HH,cmp=hp<64,nv=Math.min(q.n,maxL),sp=Math.min(q.sp,nv-q.l),nar=sp<nv;
     return '<div class="ch ev '+cls(j)+(hp<36?' sh':'')+(cmp?' cmp':'')+(nar?' nar':'')+'"'+att(j,c)+(nar?' title="'+esc([j.kunde||'?',tLbl(j,ds),who(j)].join(' · '))+'"':'')+' style="'+wS(j)+'top:'+((q.s/60-h0)*HH+1)+'px;height:'+(hp-2)+'px;left:calc((100% - '+rs+') * '+(q.l/nv)+' + 1px);width:calc((100% - '+rs+') * '+(sp/nv)+' - 2px)">'+
     (j.imp?ic('starf','starx')+' ':'')+(det?'':pc(j))+
     // kurze Termine (bis ca. 1 Stunde) einzeilig: „12:00 Titel · Mitarbeiter“
     (cmp?'<b class="evt">'+(hrsJ(j)&&j.zeit?m2t(q.s):(j.zeit||'ganztags'))+'</b> '+esc(j.kunde||'?')+'<small> · '+esc(who(j))+'</small>'
        :'<span class="evk">'+esc(j.kunde||'?')+'</span><small>'+tLbl(j,ds)+'</small><small class="evw">'+icPpl(j)+esc(who(j))+'</small>'+(det&&j.adresse?'<small>'+ic('place')+' '+esc(j.adresse)+'</small>':''))+
     (j.done?'':rzH(j,ds,hp))+'</div>'}).join('')+out})()+'</div>'}).join(''));
 return h+'</div>'}
// Spalten für gleichzeitige Termine wie Google Kalender: je Gruppe sich überschneidender Termine eigene Spaltenzahl (n),
// jeder Termin dehnt sich nach rechts über freie Spalten aus (sp). Eingabe nach Beginn sortiert, {s,e} in Minuten.
function layLanes(items){var grp=[],end=-1;
 function fin(){var lanes=[];grp.forEach(function(q){var l=0;while(lanes[l]!=null&&lanes[l]>q.s)l++;lanes[l]=q.e;q.l=l});var n=lanes.length;
  grp.forEach(function(q){q.n=n;var sp=1;while(q.l+sp<n&&!grp.some(function(o){return o.l==q.l+sp&&o.s<q.e&&o.e>q.s}))sp++;q.sp=sp})}
 items.forEach(function(q){if(grp.length&&q.s>=end){fin();grp=[]}grp.push(q);end=Math.max(end,q.e)});if(grp.length)fin();return items}
// Beim Wechsel zwischen Handy- und Breitbild das Raster neu zeichnen
function bp(){return innerWidth>=900?2:innerWidth>=600?1:0}
var WIDE=bp();addEventListener('resize',function(){var w=bp();if(w!=WIDE){WIDE=w;if(ME&&!DG&&!RZ)render()}});
function PV(j){return j.fix===false}
function nw(){if(tab=='kunden'){kEdit();return}if(tab=='zeiten'){zNew();return}edit(null,tab=='plan'&&(mode=='tag'||mode=='team'||mode=='monat'&&innerWidth<600)?an:'')}
function fixt(id){var j=byId(id);j.fix=PV(j);save(j);render()}
function conflict(ds,c){return S.jobs.some(function(o){
 if(o.id==c.id||o.done||!o.start)return false;
 if(!(o.wer||[]).some(function(x){return c.wer.indexOf(x)>-1}))return false;
 if(span(o).indexOf(ds)<0)return false;
 if(HRS()&&(hrsJ(o)||hrsJ(c))){if(!hrsJ(o)&&!o.zeit)return true;var a=jWin(o,ds),b=jWin(c,ds);return a.s<b.e&&b.s<a.e}
 if(!o.zeit)return true;
 if(c.zeit)return t2m(o.zeit)<t2m(c.ende)&&t2m(c.zeit)<t2m(o.ende||o.zeit);
 return false})}
function sug(){
 var d=document.getElementById('dlg'),el=d.querySelector('#sg'),j=cur.j;if(!el)return;
 hv();var c={id:j.id,art:j.art,article_id:j.article_id,wer:j.wer,tage:Math.max(1,parseInt(d.querySelector('#f_d').value)||1),zeit:'',ende:'',start:''};
 if(hrsJ(j)){var hh=hVal()||1,L=lay(hh,d.querySelector('#f_b').value);c.stunden=hh;c.tage=L.tage;c.zeit=L.zeit;c.ende=L.ende}
 else if(cur.zt){c.zeit=d.querySelector('#f_z').value||'08:00';c.ende=d.querySelector('#f_e').value;if(!c.ende||c.ende<=c.zeit)c.ende=m2t(t2m(c.zeit)+60)}
 var out=[],ds=fmt(new Date());
 for(var i=0;i<200&&out.length<3;i++,ds=addDays(ds,1)){
  if(isWE(ds))continue;
  c.start=ds;var sp=span(c);if(isWE(sp[sp.length-1]))continue;
  if(sp.every(function(x){return !conflict(x,c)})){out.push({s:ds,e:sp[sp.length-1]});ds=sp[sp.length-1]}}
 var f=function(x){var a=parse(x);return WD[a.getDay()]+' '+a.getDate()+'.'+(a.getMonth()+1)+'.'};
 el.innerHTML=out.length?'<label>Freie Plätze (tippen zum Übernehmen)</label><div class="row">'+out.map(function(o){return '<button class="b" data-s="'+o.s+'" onclick="useS(\''+o.s+'\')">'+f(o.s)+(o.e!=o.s?' – '+f(o.e):'')+(c.zeit?' '+c.zeit:'')+'</button>'}).join('')+'</div>':'<div class="sub">Kein freier Platz in den nächsten 6 Monaten.</div>';hSum()}
function useS(ds){document.getElementById('f_s').value=ds;document.querySelectorAll('#sg .b').forEach(function(b){b.classList.toggle('p',b.dataset.s==ds)})}
function tOpts(v){v=m2t(Math.round(t2m(v)/STEP)*STEP);var o='';for(var m=0;m<1440;m+=STEP){var t=m2t(m);o+='<option'+(t==v?' selected':'')+'>'+t+'</option>'}return o}
function zchg(){var z=document.getElementById('f_z'),e=document.getElementById('f_e');if(e.value<=z.value)e.value=m2t(Math.min(t2m(z.value)+60,1440-STEP));sug()}
var mvG='',DG=null,sup=false;
document.addEventListener('touchmove',function(e){if(DG&&DG.on||SL&&SL.on||RZ)e.preventDefault()},{passive:false});
document.addEventListener('contextmenu',function(e){if(DG||RZ||RZP||SL)e.preventDefault()});
document.addEventListener('click',function(e){if(sup){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('pointerdown',function(e){
 if(e.button>0||mvId)return;var el=e.target.closest&&e.target.closest('[data-id]');if(!el||e.target.closest('.rz'))return;
 // oy: Abstand vom oberen Rand des Termins, damit er beim Ablegen nicht um den Greifpunkt springt
 DG={el:el,id:el.dataset.id,ds:el.dataset.ds,x:e.clientX,y:e.clientY,t:e.pointerType,on:false,emp:el.dataset.emp||'',oy:el.classList.contains('ev')?e.clientY-el.getBoundingClientRect().top:0};
 DG.tm=setTimeout(dgStart,280)});
document.addEventListener('pointermove',function(e){if(!DG)return;
 if(!DG.on){if(Math.abs(e.clientX-DG.x)>8||Math.abs(e.clientY-DG.y)>8){if(DG.t=='mouse')dgStart();else{clearTimeout(DG.tm);DG=null}}return}
 DG.cx=e.clientX;DG.cy=e.clientY;dgMove()});
function dgStart(){if(!DG||DG.on)return;DG.on=true;sup=true;
 var j=byId(DG.id),n=span(j).length,g=document.createElement('div');
 g.className='ghost '+j.art;DG.lb=(j.kunde||'Auftrag')+(n>1?' · '+n+' Tage':'');g.textContent=DG.lb;document.body.appendChild(g);DG.g=g;
 document.querySelectorAll('[data-id="'+DG.id+'"]').forEach(function(x){x.classList.add('drg')});
 DG.cx=DG.x;DG.cy=DG.y;dgMove();
 DG.iv=setInterval(function(){if(DG&&DG.on){var sg=document.querySelector('#main .tg'),sr=sg&&sg.getBoundingClientRect();
  if(sr&&DG.cy>sr.top&&DG.cy<sr.bottom){if(DG.cy<sr.top+70)sg.scrollTop-=14;else if(DG.cy>sr.bottom-50)sg.scrollTop+=14}
  else if(DG.cy<90)scrollBy(0,-14);else if(DG.cy>innerHeight-120)scrollBy(0,14);
  var dr=DG.cx>innerWidth-40?1:DG.cx<40?-1:0;document.body.classList.toggle('er',dr>0);document.body.classList.toggle('el',dr<0);
  if(dr!=DG.dir){DG.dir=dr;DG.t0=Date.now()}else if(dr&&Date.now()-DG.t0>600){DG.t0=Date.now();step(dr);document.querySelectorAll('[data-id="'+DG.id+'"]').forEach(function(x){x.classList.add('drg')});DG.hl=null;dgMove()}}},30);
 try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}}
function dgMove(){DG.g.style.left=(DG.cx+10)+'px';DG.g.style.top=(DG.cy-40)+'px';
 var t=document.elementFromPoint(DG.cx,DG.cy),d=t&&t.closest?t.closest('[data-drop]'):null;DG.hl=d;
 var r=dgPrev(d);DG.g.textContent=DG.lb+(r?' · '+r:'')}
// Vorschau beim Ziehen wie in Outlook: genau dort, wo der Eintrag landen würde (Uhrzeit, Dauer, alle Tage).
// Rechnet wie drop/dropT, ändert den Auftrag aber nicht.
function dgPrev(d){var m=document.getElementById('main');
 m.querySelectorAll('.dpv').forEach(function(x){x.remove()});m.querySelectorAll('.dt').forEach(function(x){x.classList.remove('dt','bad')});
 if(!d)return '';
 var j=byId(DG.id),ds=d.dataset.drop,grid=d.classList.contains('dcol'),t=Object.assign({},j),st=ds,i=!j.start?0:Math.max(0,span(j).indexOf(DG.ds));
 for(;i>0;i--)st=R(j)?nextWork(st,-1):addDays(st,-1);t.start=st;
 if(grid&&j.zeit){var s0=slotMin({currentTarget:d,clientY:DG.cy-DG.oy});if(hrsJ(t)){t.zeit=m2t(s0);fit(t)}else{var du=(t2m(j.ende||j.zeit)-t2m(j.zeit))||60;t.zeit=m2t(s0);t.ende=m2t(s0+du)}}
 var bad=R(j)&&isWE(ds);if(bad){d.classList.add('dt','bad');return 'nur Werktage'}
 var es=d.dataset.emp?'[data-emp="'+d.dataset.emp+'"]':'',hasGrid=!!m.querySelector('.dcol'),sel=d.classList.contains('wh2')?'.wh2':'.c',lbl=hrsJ(t)?(t.zeit||'ganztags')+' · '+hTxt(t.stunden):t.zeit?t.zeit+'–'+t.ende:'ganztags';
 span(t).forEach(function(x){
  var c=hasGrid?m.querySelector('.dcol[data-drop="'+x+'"]'+es):null;
  if(c){var w=jWin(t,x),p=document.createElement('div');p.className='dpv '+j.art;p.style.top=((w.s/60-H0)*HH)+'px';p.style.height=((w.e-w.s)/60*HH)+'px';p.textContent=hrsJ(t)?tLbl(t,x):lbl;c.appendChild(p);return}
  if(hasGrid)return;
  c=m.querySelector(sel+'[data-drop="'+x+'"]'+es);if(c)c.classList.add('dt')});
 return grid?lbl:''}
function dgEnd(ok){if(!DG)return;clearTimeout(DG.tm);
 if(DG.on){clearInterval(DG.iv);DG.g.remove();document.body.classList.remove('er','el');var d=DG.hl,id=DG.id,g=DG.ds,fe=DG.emp,y=DG.cy-DG.oy;dgPrev(null);
  setTimeout(function(){sup=false},80);DG=null;
  if(ok&&d){mvId=id;mvG=g;mvE=fe;var ds=d.dataset.drop;if(d.classList.contains('dcol'))dropT(ds,{currentTarget:d,clientY:y});else drop(ds);if(mvId){mvId=null;mvG='';mvE='';render()}}
  else render();return}
 DG=null}
document.addEventListener('pointerup',function(e){if(DG&&DG.on){DG.cx=e.clientX;DG.cy=e.clientY;dgMove()}dgEnd(true)});
document.addEventListener('pointercancel',function(){dgEnd(false)});
var HOL={};
function easter(y){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);return new Date(y,Math.floor((h+l-7*m+114)/31)-1,(h+l-7*m+114)%31+1)}
function holList(y){var e=easter(y),k=function(m,d,n){return {d:fmt(new Date(y,m-1,d)),n:n}},o=function(n,t){var x=new Date(e);x.setDate(x.getDate()+n);return {d:fmt(x),n:t}};
 var l=[k(1,1,'Neujahr'),k(1,6,'Dreikönigsfest'),o(1,'Ostermontag'),k(4,25,'Tag der Befreiung'),k(5,1,'Tag der Arbeit'),o(50,'Pfingstmontag'),k(6,2,'Tag der Republik'),k(8,15,'Mariä Himmelfahrt')];
 if(y>=2026)l.push(k(10,4,'Hl. Franz von Assisi'));
 l.push(k(11,1,'Allerheiligen'),k(12,8,'Mariä Empfängnis'),k(12,25,'Weihnachten'),k(12,26,'Stefanitag'));return l}
// Feiertage: gesetzliche Feiertage Südtirol werden für jedes Jahr automatisch berechnet (kein Import nötig).
// In der Tabelle holidays stehen nur zusätzliche freie Tage der Firma (z. B. Betriebsurlaub, Patronatsfest).
var HY={};
function statHol(y){if(!HY[y]){HY[y]={};holList(y).forEach(function(h){HY[y][h.d]=h.n})}return HY[y]}
function mkH(){HOL={};var y0=new Date().getFullYear(),ya=+an.slice(0,4),ys={},y;
 for(y=y0-3;y<=y0+10;y++)ys[y]=1;for(y=ya-1;y<=ya+1;y++)ys[y]=1;
 Object.keys(ys).forEach(function(k){var m=statHol(+k);for(var d in m)HOL[d]=m[d]});
 custH().forEach(function(h){HOL[h.d]=h.n})}
// eigene freie Tage = Einträge, die kein gesetzlicher Feiertag sind (alte Importe werden so ausgeblendet)
function custH(){return (S.hol||[]).filter(function(h){return statHol(+h.d.slice(0,4))[h.d]!==h.n}).sort(function(a,b){return a.d<b.d?-1:1})}
function addH(){var d=document.getElementById('h_d').value,n=document.getElementById('h_n').value.trim();
 if(!d||!n){alert('Bitte Datum und Bezeichnung angeben.');return}
 S.hol=(S.hol||[]).filter(function(h){return h.d!=d}).concat([{d:d,n:n}]);render();
 sb.from('holidays').upsert({d:d,n:n}).then(function(r){if(r.error)fail(r.error)})}
function delH(d){S.hol=(S.hol||[]).filter(function(h){return h.d!=d});render();
 sb.from('holidays').delete().eq('d',d).then(function(r){if(r.error)fail(r.error)})}
function hsec(adm){var td=fmt(new Date()),f=function(s){var p=parse(s);return WD[p.getDay()]+' '+p.getDate()+'. '+MN[p.getMonth()]+(s.slice(0,4)!=td.slice(0,4)?' '+s.slice(0,4):'')};
 var nx=Object.keys(HOL).filter(function(d){return d>=td}).sort().slice(0,4),cu=custH().filter(function(h){return h.d>=td});
 return '<div class="sub">Die gesetzlichen Feiertage werden für jedes Jahr automatisch berechnet und im Kalender markiert – ein Import ist nicht nötig. Montage, Planung und Werkstatt werden dort nicht eingeplant.</div>'+
  '<div class="lbl" style="margin-top:12px">Nächste freie Tage</div><div class="kv">'+nx.map(function(d){return '<span>'+f(d)+'</span><b>'+esc(HOL[d])+'</b>'}).join('')+'</div>'+
  '<div class="lbl" style="margin-top:4px">Zusätzliche freie Tage der Firma</div>'+
  (cu.length?'<div class="ul">'+cu.map(function(h){return '<div class="ur"><div class="nm">'+esc(h.n)+'<small>'+f(h.d)+'</small></div>'+(adm?'<button class="b d" onclick="delH(\''+h.d+'\')" title="Entfernen">'+ic('trash')+'</button>':'')+'</div>'}).join('')+'</div>':'<div class="sub">Keine eingetragen.</div>')+
  (adm?'<div class="row" style="margin-top:10px"><input id="h_d" type="date" style="flex:1 1 140px"><input id="h_n" placeholder="z. B. Betriebsurlaub" style="flex:2 1 160px"><button class="b" style="flex:none" onclick="addH()">'+ic('plus')+' Hinzufügen</button></div>':'')}
function impt(id){var j=byId(id);j.imp=!j.imp;save(j);render()}
// Wischen (mit Mitlauf) und Zoom: siehe ansicht.js
function cnt(j){return wer(j).length}
function icPpl(j){return ic(wer(j).length>1?'users':'user')+' '}
function pc(j){return cnt(j)>1?ic('users')+cnt(j)+' ':''}
// Dauer ändern über den oberen/unteren Rand eines Termins.
// Maus: Rand greifen und ziehen. Touch (wie Outlook): lange auf den Rand drücken, dann ziehen – kurzes Wischen scrollt weiter.
var RZ=null,RZP=null,H1=20;
function rzStart(h,ev,j,pid){var w=jWin(j,ev.dataset.ds),s0=w.s,e0=w.e;
 // Termine in Stunden: unten höchstens bis Arbeitsende bzw. einen Arbeitstag lang, sonst ginge der Rest auf den nächsten Tag
 var mx=hrsJ(j)?Math.max(d0m()+Math.round(dayH()*60),s0+Math.round(dayH()*60)*(span(j).length>1?0:1)):1440;
 RZ={ev:ev,col:ev.parentNode,j:j,side:h.dataset.rz,s:s0,e:e0,s0:s0,e0:e0,mx:mx};sup=true;ev.classList.add('rzon');
 try{h.setPointerCapture(pid)}catch(x){}}
document.addEventListener('pointerdown',function(e){var h=e.target.closest&&e.target.closest('.rz');if(!h||mvId)return;
 var ev=h.parentNode,j=byId(ev.dataset.id);if(!j)return;
 if(e.pointerType=='mouse'){rzStart(h,ev,j,e.pointerId);e.preventDefault();return}
 RZP={x:e.clientX,y:e.clientY,tm:setTimeout(function(){RZP=null;rzStart(h,ev,j,e.pointerId);try{navigator.vibrate&&navigator.vibrate(15)}catch(x){}},400)}});
document.addEventListener('pointermove',function(e){
 if(RZP){if(Math.abs(e.clientX-RZP.x)>8||Math.abs(e.clientY-RZP.y)>8){clearTimeout(RZP.tm);RZP=null}return}
 if(!RZ)return;
 var r=RZ.col.getBoundingClientRect(),m=Math.round(((e.clientY-r.top)/HH*60+H0*60)/STEP)*STEP;
 if(RZ.side=='b')RZ.e=Math.max(RZ.s+STEP,Math.min(H1*60,RZ.mx,m));else RZ.s=Math.min(RZ.e-STEP,Math.max(H0*60,m));
 RZ.ev.style.top=((RZ.s/60-H0)*HH+1)+'px';RZ.ev.style.height=((RZ.e-RZ.s)/60*HH-2)+'px'});
function rzEnd(ok){if(RZP){clearTimeout(RZP.tm);RZP=null}if(!RZ)return;var z=RZ,j=z.j;RZ=null;setTimeout(function(){sup=false},80);
 if(ok){if(hrsJ(j)){j.stunden=rH((j.stunden==null?hFrom(j):j.stunden)+((z.e-z.e0)-(z.s-z.s0))/60);if(z.side=='t')j.zeit=m2t(z.s);fit(j)}else{j.zeit=m2t(z.s);j.ende=m2t(z.e)}save(j)}render()}
document.addEventListener('pointerup',function(){rzEnd(true)});
document.addEventListener('pointercancel',function(){rzEnd(false)});
// Zeitraum markieren wie in Outlook: in freier Zeit drücken und ziehen → neuer Termin mit dieser Zeit.
// Handy wie Google Kalender: kurz halten → sofort ein 1-Stunden-Block (Vibration), ziehen verlängert, loslassen öffnet „Neuer Termin“.
// Leichtes Zittern beim Halten (bis 12 px) bricht nicht ab; am Rand des Rasters scrollt es beim Ziehen mit.
var SL=null,SLH=280,SLT=12;
document.addEventListener('pointerdown',function(e){
 if(mvId||e.button>0)return;var c=e.target.closest&&e.target.closest('.dcol');
 if(!c||(e.target!==c&&!e.target.classList.contains('now')))return;
 SL={c:c,ds:c.dataset.drop,x:e.clientX,y:e.clientY,cy:e.clientY,a:slotMin({currentTarget:c,clientY:e.clientY},true),on:false,t:e.pointerType};
 if(SL.t!='mouse')SL.tm=setTimeout(slOn,SLH)});
function slOn(){if(!SL||SL.on)return;SL.on=true;SL.def=SL.t!='mouse';sup=true;slDraw(SL.cy);
 SL.iv=setInterval(function(){if(!SL||!SL.on)return;var sg=document.querySelector('#main .tg'),sr=sg&&sg.getBoundingClientRect();if(!sr)return;
  var h=sg.querySelector('.tgh'),top=sr.top+(h?h.offsetHeight:0),d=SL.cy<top+40&&SL.cy<SL.y-8?-12:SL.cy>sr.bottom-40&&SL.cy>SL.y+8?12:0;
  if(d){var o=sg.scrollTop;sg.scrollTop+=d;if(sg.scrollTop!=o){SL.def=false;slDraw(SL.cy)}}},30);
 try{navigator.vibrate&&navigator.vibrate(15)}catch(x){}}
document.addEventListener('pointermove',function(e){if(!SL||e.pointerType!=SL.t)return;SL.cy=e.clientY;
 if(!SL.on){if(Math.abs(e.clientX-SL.x)>(SL.t=='mouse'?6:SLT)||Math.abs(e.clientY-SL.y)>(SL.t=='mouse'?6:SLT)){if(SL.t=='mouse')slOn();else{clearTimeout(SL.tm);SL=null}}return}
 if(SL.def&&Math.abs(e.clientY-SL.y)>HH/4)SL.def=false;
 slDraw(e.clientY)});
function slDraw(y){var b=slotMin({currentTarget:SL.c,clientY:y},true);
 if(SL.def){SL.s=SL.a;SL.e=Math.min(1440,SL.a+60)}else{SL.s=Math.min(SL.a,b);SL.e=Math.min(1440,Math.max(SL.a,b)+STEP)}
 var r=SL.c.querySelector('.slr');if(!r){r=document.createElement('div');r.className='slr';SL.c.appendChild(r)}
 r.style.top=((SL.s/60-H0)*HH)+'px';r.style.height=((SL.e-SL.s)/60*HH)+'px';r.innerHTML='<b>'+m2t(SL.s)+'–'+m2t(SL.e)+'</b>'+(SL.t!='mouse'?'<span>ziehen = länger · loslassen = neuer Termin</span>':'')}
function slEnd(ok){if(!SL)return;clearTimeout(SL.tm);clearInterval(SL.iv);var z=SL;SL=null;if(!z.on)return;
 var r=z.c.querySelector('.slr');if(r)r.remove();setTimeout(function(){sup=false},80);
 if(ok)edit(null,z.ds,m2t(z.s),m2t(z.e),z.c.dataset.emp)}
// Handy: solange der Finger beim Halten nur zittert, startet der Browser kein Scrollen (sonst bräche das Halten ab)
document.addEventListener('touchmove',function(e){if(SL&&!SL.on&&SL.t!='mouse'&&e.touches.length==1){var t=e.touches[0];
 if(Math.abs(t.clientX-SL.x)<=SLT&&Math.abs(t.clientY-SL.y)<=SLT)e.preventDefault()}},{passive:false});
document.addEventListener('pointerup',function(e){if(SL&&e.pointerType==SL.t)slEnd(true)});
document.addEventListener('pointercancel',function(e){if(SL&&e.pointerType==SL.t)slEnd(false)});
