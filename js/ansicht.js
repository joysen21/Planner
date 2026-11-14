// Planner – Kalender-Bedienung wie in Google/Apple/Outlook-Kalender:
// Handy: Titel antippen klappt Mini-Monat, Ansicht, Mitarbeiter und Darstellung auf; Plus schwebt unten rechts.
// PC: eine Werkzeugleiste, Seitenleiste mit Mini-Monat, Mitarbeitern und Legende, Tastaturkürzel, Vollbild.
// Beide: Liste (Agenda), Mitarbeiter-Filter mit mehreren Personen, Farbe nach Art oder Mitarbeiter,
// Zoom der Stundenhöhe (zwei Finger, Strg + Mausrad, Knöpfe), Wischen mit Mitlauf, Raster füllt den Bildschirm.
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.

ICONS.down='<path d="M7 10l5 5 5-5"/>';
ICONS.up='<path d="M7 14l5-5 5 5"/>';
ICONS.side='<rect x="3" y="4.5" width="18" height="15" rx="3" fill="currentColor" fill-opacity=".14" stroke="none"/><rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M9.5 4.5v15"/>';
ICONS.expand='<path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"/>';
ICONS.shrink='<path d="M9 4v3a2 2 0 0 1-2 2H4M20 9h-3a2 2 0 0 1-2-2V4M15 20v-3a2 2 0 0 1 2-2h3M4 15h3a2 2 0 0 1 2 2v3"/>';
ICONS.keys='<rect x="2.5" y="6" width="19" height="12" rx="2.5" fill="currentColor" fill-opacity=".14" stroke="none"/><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>';

// Einstellungen pro Gerät: zuletzt benutzte Ansicht, Farbe, Stundenhöhe, Seitenleiste
(function(){var m=lsGet('planer_mode');if(MODES.some(function(x){return x[0]==m}))mode=m})();
var CM=lsGet('planer_cm')=='ma'?'ma':'art',ZF=Math.min(2.5,Math.max(.5,parseFloat(lsGet('planer_zoom'))||1)),SBO=lsGet('planer_sb')!='0',
 FS=false,DD=false,MM='',LD=30,SCR=null,SCRL=false;

/* ---------- Mitarbeiter-Filter: Meine, Alle oder beliebige Auswahl (FLT = 'me' | 'alle' | [ids]) ---------- */
function fltIds(){if(FLT=='alle')return USERS.map(function(u){return u.id});if(FLT=='me')return ME?[ME.id]:[];return Array.isArray(FLT)?FLT:[FLT]}
function vis(j){if(FLT=='alle')return true;var s=fltIds();return (j.wer||[]).some(function(x){return s.indexOf(x)>-1})}
function setFlt(v){FLT=v;render()}
function togU(id){var s=fltIds().slice(),i=s.indexOf(id);if(i>-1)s.splice(i,1);else s.push(id);
 FLT=s.length==1&&s[0]==ME.id?'me':USERS.length&&USERS.every(function(u){return s.indexOf(u.id)>-1})?'alle':s;render()}
// Mitarbeiter für einen neuen Termin: ich, wenn ich ausgewählt bin, sonst die erste ausgewählte Person
function fltNew(){var s=fltIds();return !s.length||s.indexOf(ME.id)>-1?ME.id:s[0]}
function fltSub(){if(FLT=='alle'||tab=='plan'&&mode=='team')return '';var s=fltIds();
 return '<br><small>'+(FLT=='me'?'Meine Termine':!s.length?'Niemand ausgewählt':s.length==1?esc(uName(s[0])):s.length+' Personen')+'</small>'}
function fltBar(){var s=fltIds(),b=function(on,cls,st,oc,l){return '<button class="'+cls+(on?' on':'')+'"'+st+' aria-pressed="'+on+'" onclick="'+oc+'">'+l+'</button>'};
 return '<div class="seg flt">'+b(FLT=='me','fa','',"setFlt('me')",ic('user')+' Meine')+b(FLT=='alle','fa','',"setFlt('alle')",ic('users')+' Alle')+
  usersSorted().map(function(u){return b(s.indexOf(u.id)>-1,'fu',' style="--uc:'+esc(u.color)+'"',"togU('"+u.id+"')",esc(u.display_name))}).join('')+'</div>'}
// Seitenleiste: Häkchen-Liste mit Farbe
function fltList(){var s=fltIds();
 return '<div class="sbs"><div class="sbt">Mitarbeiter<span class="lks"><button class="lk'+(FLT=='me'?' on':'')+'" onclick="setFlt(\'me\')">Nur ich</button><button class="lk'+(FLT=='alle'?' on':'')+'" onclick="setFlt(\'alle\')">Alle</button></span></div>'+
  (mode=='team'?'<div class="sub">Die Team-Ansicht zeigt immer alle.</div>':usersSorted().map(function(u){return '<label class="sbu" style="--uc:'+esc(u.color)+'"><input type="checkbox"'+(s.indexOf(u.id)>-1?' checked':'')+' onchange="togU(\''+u.id+'\')"><i></i><span>'+esc(u.display_name)+(ME&&u.id==ME.id?' <small>ich</small>':'')+'</span></label>'}).join(''))+'</div>'}

/* ---------- Farbe nach Mitarbeiter: eine Person = ihre Farbe, mehrere = schräge Streifen ---------- */
function maS(j){var cs=wer(j).map(function(id){return esc(uById(id).color)});
 if(!cs.length)return '--c:var(--mu);--cb:var(--mu);--cl:color-mix(in srgb,var(--mu) 22%,var(--card));';
 var st=function(f){return 'repeating-linear-gradient(135deg,'+cs.map(function(c,i){var x=f?'color-mix(in srgb,'+c+' 30%,var(--card))':c;return x+' '+(i*9)+'px '+((i+1)*9)+'px'}).join(',')+')'};
 return '--c:'+cs[0]+';--cb:'+(cs.length>1?st(false):cs[0])+';--cl:'+(cs.length>1?st(true):'color-mix(in srgb,'+cs[0]+' 22%,var(--card))')+';'}
function setCM(v){CM=v=='ma'?'ma':'art';lsSet('planer_cm',CM=='ma'?'ma':'');render()}

/* ---------- Bausteine für Kopfzeile, Seitenleiste und Aufklapp-Menü ---------- */
function modesSeg(){return '<div class="seg modes">'+MODES.map(function(x){return '<button class="'+(mode==x[0]?'on':'')+'" onclick="setMode(\''+x[0]+'\')">'+x[1]+'</button>'}).join('')+'</div>'}
function gridMode(){return mode=='tag'||mode=='team'||mode=='woche'}
function optsH(){var o='';
 if(mode=='woche')o+='<div class="sbt">Woche</div><div class="seg sm wwt"><button class="'+(WW5?'on':'')+'" onclick="setWW(true)">Mo–Fr</button><button class="'+(WW5?'':'on')+'" onclick="setWW(false)">Mo–So</button></div>';
 o+='<div class="sbt">Farbe</div><div class="seg sm cmt"><button class="'+(CM=='art'?'on':'')+'" onclick="setCM(\'art\')">nach Art</button><button class="'+(CM=='ma'?'on':'')+'" onclick="setCM(\'ma\')">nach Mitarbeiter</button></div>';
 if(gridMode())o+='<div class="sbt">Stundenhöhe</div><div class="seg sm zmt">'+[[.7,'Kompakt'],[1,'Normal'],[1.4,'Groß']].map(function(z){return '<button class="'+(Math.abs(ZF-z[0])<.02?'on':'')+'" onclick="setZoom('+z[0]+')">'+z[1]+'</button>'}).join('')+'</div>';
 return o}
function lgdH(){
 var lg=CM=='ma'?usersSorted().map(function(u){return '<span><b style="background:'+esc(u.color)+'"></b>'+esc(u.display_name)+'</span>'}).join('')+'<span><b class="lgs"></b>mehrere (gestreift)</span>'
  :svcList().map(function(a){return '<span><b style="background:'+(a.plan_color||SVC_DEF)+'"></b>'+esc(a.name_de||a.name_it)+'</span>'}).join('')+Object.keys(ART).filter(function(k){return !SVC.length||k=='termin'||k=='urlaub'||S.jobs.some(function(j){return j.art==k&&!j.article_id})}).map(function(k){return '<span><b style="background:'+COL[k]+'"></b>'+ART[k].n+'</span>'}).join('')+
   USERS.map(function(u){return '<span><b class="lgo" style="outline-color:'+esc(u.color)+'"></b>'+esc(u.display_name)+'</span>'}).join('')+'<span><b class="lgo" style="outline-color:var(--pb)"></b>mehrere</span>';
 return '<details class="lgd"'+(lgOpen()?' open':'')+' ontoggle="lgSet(this.open)"><summary>'+ic('info')+' Legende &amp; Bedienung</summary>'+(mvId?'':'<div class="hint">'+hintTxt()+'</div>')+
  '<div class="lg">'+lg+'<span><b class="lgf"></b>fix</span><span><b class="lgp"></b>provisorisch</span><span>'+ic('starf','starx')+' wichtig</span><span>'+ic('users')+'3 = 3 Personen</span></div></details>'}
function sideBar(){return miniM()+fltList()+'<div class="sbs">'+optsH()+'</div>'+lgdH()+'<button class="lk kb" onclick="keyHelp()">'+ic('keys')+' Tastaturkürzel <kbd>?</kbd></button>'}
function ddPanel(){return '<div class="ddb" onclick="ddTog(false)"></div><div class="dd" aria-label="Ansicht und Filter">'+miniM()+
 '<div class="sbt">Ansicht</div>'+modesSeg()+'<div class="sbt">Mitarbeiter</div>'+(mode=='team'?'<div class="sub">Die Team-Ansicht zeigt immer alle.</div>':fltBar())+optsH()+lgdH()+
 '<div class="row ddf"><button class="b" onclick="ddTog(false);printPlan()">'+ic('print')+' Drucken</button><button class="b p" onclick="ddTog(false)">Fertig</button></div></div>'}
function ddTog(v){DD=v===undefined?!DD:!!v;MM='';render()}

/* ---------- Mini-Monat: Punkt = Termine an diesem Tag, Antippen springt dorthin ---------- */
function selDays(){if(mode=='tag'||mode=='team')return [an];if(mode=='woche'){var w=fmt(monday(parse(an))),r=[];for(var i=0;i<(WW5?5:7);i++)r.push(addDays(w,i));return r}return []}
function miniM(){var b=MM||an.slice(0,7),y=+b.slice(0,4),mo=+b.slice(5,7)-1,n=new Date(y,mo+1,0).getDate(),td=fmt(new Date()),sel=selDays(),h='';
 for(var p=0;p<(new Date(y,mo,1).getDay()+6)%7;p++)h+='<span></span>';
 for(var d=1;d<=n;d++){var ds=fmt(new Date(y,mo,d)),js=(dm[ds]||[]).filter(function(j){return mode!='team'||vis(j)});
  h+='<button class="mmd'+(ds==td?' td':'')+(sel.indexOf(ds)>-1?' sel':'')+(satSun(ds)||HOL[ds]?' wd':'')+'" onclick="mmGo(\''+ds+'\')" aria-label="'+d+'. '+MF[mo]+(js.length?', '+js.length+' Termine':'')+'">'+d+(js.length?'<i></i>':'')+'</button>'}
 return '<div class="mm"><div class="mmh"><b>'+MF[mo]+' '+y+'</b><button class="mmn" onclick="mmStep(-1)" title="Monat zurück">'+ic('left')+'</button><button class="mmn" onclick="mmStep(1)" title="Monat weiter">'+ic('right')+'</button></div>'+
  '<div class="mmg">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(function(x){return '<span class="mmw">'+x+'</span>'}).join('')+h+'</div></div>'}
function mmStep(n){var b=MM||an.slice(0,7);MM=fmt(new Date(+b.slice(0,4),+b.slice(5,7)-1+n,1)).slice(0,7);render()}
function mmGo(ds){if(mvId){drop(ds);return}an=ds;MM='';DD=false;render()}

/* ---------- Liste (Agenda): kommende Termine nach Tagen, leere Tage ausgelassen ---------- */
function agenda(){var td=fmt(new Date()),out='',any=false;
 for(var i=0;i<LD;i++){var ds=addDays(an,i),js=sortJ(dm[ds]||[]),p=parse(ds);if(!js.length&&ds!=td&&i)continue;any=any||js.length>0;
  out+='<div class="agd'+(ds==td?' td':'')+'"><button class="agh" data-drop="'+ds+'" onclick="hdr(\''+ds+'\')"><b>'+WD[p.getDay()]+' '+p.getDate()+'. '+MN[p.getMonth()]+'</b>'+(ds==td?'<span>Heute</span>':'')+(HOL[ds]?'<em>'+ic('flag')+' '+esc(HOL[ds])+'</em>':'')+'</button>'+
   (js.length?js.map(function(j){return agRow(j,ds)}).join(''):'<div class="empty">Keine Termine</div>')+'</div>'}
 return '<div class="ag">'+(any?out:'')+(any?'':'<div class="empty big">'+ic('plan')+'<br><b>In den nächsten '+LD+' Tagen nichts geplant</b></div>')+
  '<button class="b agm" onclick="LD+=30;render()">Weitere 30 Tage</button></div>'}
function agRow(j,ds){var tl=tLbl(j,ds).split('–');
 return '<button class="agr a-'+j.art+(PV(j)?' pv':'')+(j.done?' dn':'')+(mvId==j.id?' sel':'')+'" style="'+wS(j)+'" onclick="evClick(\''+j.id+'\',\''+ds+'\')">'+
  '<span class="agt">'+tl[0]+(tl[1]?'<small>'+tl[1]+'</small>':'')+'</span><i class="agc"></i><span class="agx"><b>'+(j.imp?ic('starf','starx')+' ':'')+esc(j.kunde||'(ohne Name)')+'</b>'+
  '<small>'+jName(j)+' · '+icPpl(j)+esc(who(j))+(j.adresse?' · '+esc(j.adresse):'')+'</small></span></button>'}

/* ---------- Raster füllt den Bildschirm und scrollt in sich; Bildlauf bleibt beim Neuzeichnen erhalten ---------- */
function capScr(){if(SCRL)return;var g=document.querySelector('#main .tg'),b=g&&g.querySelector('.tgb');if(!b)return;
 var off=b.getBoundingClientRect().top-g.getBoundingClientRect().top+g.scrollTop;
 SCR={k:mode,min:g.scrollTop/HH*60+H0*60,yr:off,x:g.scrollLeft}}
function fitGrid(){var g=tab=='plan'&&document.querySelector('#main .tg');document.body.classList.toggle('pfit',!!g);fitMonth();if(!g){SCRL=false;return}
 g.style.maxHeight='';var r=g.getBoundingClientRect(),pb=parseFloat(getComputedStyle(document.body).paddingBottom)||0;
 g.style.maxHeight=Math.max(300,Math.floor(innerHeight-(r.top+scrollY)-pb-8))+'px';
 var b=g.querySelector('.tgb');if(!b)return;
 var off=b.getBoundingClientRect().top-g.getBoundingClientRect().top+g.scrollTop,s;
 if(SCR&&SCR.k==mode){s=off+(SCR.min/60-H0)*HH-SCR.yr;g.scrollLeft=SCR.x||0}else s=(adWin().s/60-H0)*HH-HH/2;
 g.scrollTop=Math.max(0,s);SCRL=false}
var FGT=null;
addEventListener('resize',function(){clearTimeout(FGT);FGT=setTimeout(function(){if(ME&&!DG&&!RZ){capScr();fitGrid()}},120)});

/* ---------- Zoom der Stundenhöhe: Knöpfe, Strg + Mausrad, zwei Finger. Die Uhrzeit unter Finger/Maus bleibt stehen ---------- */
function setZoom(z,cy){z=Math.min(2.5,Math.max(.5,z));if(Math.abs(z-ZF)<.002)return;
 var g=document.querySelector('#main .tg'),b=g&&g.querySelector('.tgb');
 if(b){var gr=g.getBoundingClientRect(),br=b.getBoundingClientRect(),y=cy==null?(Math.max(gr.top,br.top)+gr.bottom)/2:cy;
  SCR={k:mode,min:(y-br.top)/HH*60+H0*60,yr:y-gr.top,x:g.scrollLeft};SCRL=true}
 ZF=z;lsSet('planer_zoom',String(Math.round(z*100)/100));render()}
function zoomBy(f,cy){setZoom(ZF*f,cy)}
document.addEventListener('wheel',function(e){if(!e.ctrlKey||!ME||tab!='plan')return;var g=e.target.closest&&e.target.closest('#main .tg');if(!g)return;
 e.preventDefault();zoomBy(e.deltaY<0?1.1:1/1.1,e.clientY)},{passive:false});
var PZ=null,PZR=0;
function pzStart(e){var a=e.touches[0],b=e.touches[1];PZ={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1,z:ZF};
 if(DG&&!DG.on){clearTimeout(DG.tm);DG=null}if(SL&&!SL.on){clearTimeout(SL.tm);SL=null}if(RZP){clearTimeout(RZP.tm);RZP=null}}
function pzMove(e){var a=e.touches[0],b=e.touches[1];PZ.nz=PZ.z*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/PZ.d;PZ.cy=(a.clientY+b.clientY)/2;
 if(!PZR)PZR=requestAnimationFrame(function(){PZR=0;if(PZ&&PZ.nz)setZoom(PZ.nz,PZ.cy)})}
document.addEventListener('gesturestart',function(e){if(e.target.closest&&e.target.closest('#main .tg'))e.preventDefault()});

/* ---------- Wischen mit Mitlauf: der Kalender folgt dem Finger und gleitet zum nächsten Zeitraum ---------- */
// nicht in seitlich scrollbaren Bereichen (Mitarbeiter-Leiste, Team-Raster): dort scrollt Wischen nur den Bereich
function hScroll(t){for(var e=t;e&&e.nodeType==1&&e.tagName!='MAIN';e=e.parentNode){var o=getComputedStyle(e).overflowX;
 if((o=='auto'||o=='scroll')&&e.scrollWidth>e.clientWidth+1)return true}return false}
var sw=null;
document.addEventListener('touchstart',function(e){var t=e.target;
 if(e.touches.length==2){sw=null;if(tab=='plan'&&t.closest&&t.closest('#main .tg'))pzStart(e);return}
 sw=(tab=='plan'&&e.touches.length==1&&!DD&&!(DG&&DG.on)&&t.closest&&t.closest('#main .swp')&&!hScroll(t))?{x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now(),on:false}:null},{passive:true});
document.addEventListener('touchmove',function(e){
 if(PZ){if(e.touches.length>=2){e.preventDefault();pzMove(e)}return}
 if(!sw||e.touches.length!=1)return;if(DG&&DG.on||SL&&SL.on||RZ){swBack(sw);sw=null;return}
 var dx=e.touches[0].clientX-sw.x,dy=e.touches[0].clientY-sw.y;
 if(!sw.on){if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.3){sw.on=true;sw.el=document.querySelector('#main .swp')}else if(Math.abs(dy)>12)sw=null;return}
 e.preventDefault();sw.dx=dx;if(sw.el)sw.el.style.transform='translateX('+dx+'px)'},{passive:false});
document.addEventListener('touchend',function(e){if(PZ&&e.touches.length<2)PZ=null;var s0=sw;sw=null;if(s0&&s0.on&&!sup)swEnd(s0);else if(s0)swBack(s0)},{passive:true});
document.addEventListener('touchcancel',function(){PZ=null;if(sw)swBack(sw);sw=null},{passive:true});
function swBack(s){var el=s&&s.el;if(!el||!el.style.transform)return;el.style.transition='transform .18s ease-out';el.style.transform='';setTimeout(function(){el.style.transition=''},200)}
function swEnd(s){var dx=s.dx||0,v=Math.abs(dx)/Math.max(1,Date.now()-s.t),el=s.el;
 if(!(Math.abs(dx)>70||Math.abs(dx)>30&&v>.45)){swBack(s);return}
 var d=dx<0?1:-1,W=innerWidth;
 if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches){if(el)el.style.transform='';step(d);return}
 el.style.transition='transform .15s ease-in';el.style.transform='translateX('+(-d*W)+'px)';
 setTimeout(function(){step(d);var n=document.querySelector('#main .swp');if(!n)return;n.style.transition='none';n.style.transform='translateX('+(d*W*.35)+'px)';
  void n.offsetWidth;n.style.transition='transform .2s ease-out';n.style.transform='';setTimeout(function(){n.style.transition=''},230)},150)}

/* ---------- PC: Seitenleiste, Vollbild, Tastaturkürzel ---------- */
function sbTog(){SBO=!SBO;lsSet('planer_sb',SBO?'':'0');if(FS&&SBO)FS=false;render()}
function fsTog(){FS=!FS;try{if(FS&&document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(function(){});
 else if(!FS&&document.fullscreenElement)document.exitFullscreen().catch(function(){})}catch(x){}render()}
document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement&&FS){FS=false;if(ME)render()}});
var KEYS=[['T','Heute'],['← →  oder  K J','Zurück / Weiter'],['A','Liste'],['D','Tag'],['E','Team'],['W','Woche'],['M','Monat'],['Q','3 Monate'],['Y','Jahr'],['N','Neuer Termin'],['/','Suchen'],['+ −','Stundenhöhe (auch Strg + Mausrad)'],['S','Seitenleiste ein/aus'],['F','Vollbild'],['Esc','Schließen / Abbrechen'],['?','Diese Übersicht']];
function keyHelp(){var d=document.getElementById('dlg');
 d.innerHTML='<div class="dt2"><b>Tastaturkürzel</b><button class="ib" onclick="document.getElementById(\'dlg\').close()" title="Schließen">'+ic('x')+'</button></div><div class="kh">'+KEYS.map(function(k){return '<kbd>'+k[0]+'</kbd><span>'+k[1]+'</span>'}).join('')+'</div>';
 if(!d.open)d.showModal()}
document.addEventListener('keydown',function(e){
 if(!ME||e.ctrlKey||e.metaKey||e.altKey||document.body.classList.contains('auth'))return;var t=e.target;
 if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))||document.querySelector('dialog[open]'))return;
 var k=e.key.length==1?e.key.toLowerCase():e.key,M={a:'liste',d:'tag',e:'team',w:'woche',m:'monat',q:'quartal',y:'jahr'};
 if(k=='Escape'){if(DD)ddTog(false);else if(mvId){mvId=null;mvE='';render()}else if(FS)fsTog();return}
 if(k=='?'){keyHelp()}else if(k=='/'){showSearch()}else if(k=='n'&&tab!='mehr'){nw()}
 else if(tab!='plan')return;
 else if(k=='t')goToday();else if(k=='ArrowLeft'||k=='k')step(-1);else if(k=='ArrowRight'||k=='j')step(1);
 else if(M[k])setMode(M[k]);else if(k=='+'||k=='=')zoomBy(1.25);else if(k=='-')zoomBy(.8);
 else if(k=='f'&&innerWidth>=900)fsTog();else if(k=='s'&&innerWidth>=900)sbTog();else return;
 e.preventDefault()});
// Freie Höhe für die Stunden (ohne Kopfzeile, Tageszeile, untere Leiste) – damit „Normal“ den Bildschirm füllt
function gridAvail(){var W=innerWidth>=900,el=document.getElementById('hd'),top=(el?el.getBoundingClientRect().height:56)+(W?12:6)+56+(mvId?110:0);
 return Math.max(0,innerHeight-top-(W?16:68))}
// Monat: Zellen so hoch, dass der Monat den Bildschirm füllt
function fitMonth(){var gr=tab=='plan'&&mode=='monat'&&document.querySelector('#main .swp>.mg>.gr:last-child');if(!gr)return;
 var cs=gr.querySelectorAll('.c');cs.forEach(function(c){c.style.minHeight=''});
 var n=Math.ceil(gr.children.length/7),r=gr.getBoundingClientRect(),pb=parseFloat(getComputedStyle(document.body).paddingBottom)||0,
  h=Math.floor((innerHeight-(r.top+scrollY)-pb-(innerWidth<900?40:44))/n)-3;
 if(h>(innerWidth<900?60:124))cs.forEach(function(c){c.style.minHeight=h+'px'})}
