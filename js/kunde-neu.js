// Planner – neuer Kunde mit allen Stammdaten wie im Schnellfenster der ERP (nur mit ERP-Modul).
// Eigenes Fenster (#kdlg) über dem Termin- oder Kunden-Dialog; nach dem Speichern bekommt der Aufrufer die Planner-Kopie.
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
var KN=null;
// Orte mit eigener PLZ in Südtirol (deutsch, italienisch), wie in der ERP; geteilte PLZ (39010, 39020 …) bewusst nicht
var KZIP={39100:['Bozen','Bolzano'],39011:['Lana','Lana'],39012:['Meran','Merano'],39018:['Terlan','Terlano'],39019:['Dorf Tirol','Tirolo'],
 39021:['Latsch','Laces'],39022:['Algund','Lagundo'],39023:['Laas','Lasa'],39024:['Mals','Malles Venosta'],39025:['Naturns','Naturno'],
 39026:['Prad am Stilfser Joch','Prato allo Stelvio'],39027:['Graun im Vinschgau','Curon Venosta'],39028:['Schlanders','Silandro'],
 39031:['Bruneck','Brunico'],39032:['Sand in Taufers','Campo Tures'],39033:['Corvara','Corvara in Badia'],39034:['Toblach','Dobbiaco'],
 39035:['Welsberg-Taisten','Monguelfo-Tesido'],39037:['Mühlbach','Rio di Pusteria'],39038:['Innichen','San Candido'],39039:['Niederdorf','Villabassa'],
 39041:['Brenner','Brennero'],39042:['Brixen','Bressanone'],39043:['Klausen','Chiusa'],39044:['Neumarkt','Egna'],
 39046:['St. Ulrich','Ortisei'],39047:['St. Christina','Santa Cristina Valgardena'],39048:['Wolkenstein','Selva di Val Gardena'],39049:['Sterzing','Vipiteno'],
 39051:['Branzoll','Bronzolo'],39052:['Kaltern','Caldaro'],39054:['Ritten','Renon'],39055:['Leifers','Laives'],39056:['Welschnofen','Nova Levante'],
 39057:['Eppan','Appiano'],39058:['Sarntal','Sarentino']};
var KPROV={39:'BZ',38:'TN',37:'VR',36:'VI',35:'PD',32:'BL',31:'TV',30:'VE'};

// Prüfungen wie in der ERP (Partita IVA, Codice Fiscale, SDI, PLZ, Provinz, E-Mail)
function kPiva(v){if(!/^\d{11}$/.test(v))return false;var s=0;for(var i=0;i<11;i++){var d=+v[i];if(i%2){d*=2;if(d>9)d-=9}s+=d}return s%10==0}
var KCFO={0:1,1:0,2:5,3:7,4:9,5:13,6:15,7:17,8:19,9:21,A:1,B:0,C:5,D:7,E:9,F:13,G:15,H:17,I:19,J:21,K:2,L:4,M:18,N:20,O:11,P:3,Q:6,R:8,S:12,T:14,U:16,V:10,W:22,X:25,Y:24,Z:23};
function kCf(v){if(/^\d{11}$/.test(v))return kPiva(v);if(!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(v))return false;
 var s=0;for(var i=0;i<15;i++)s+=i%2==0?KCFO[v[i]]:(/\d/.test(v[i])?+v[i]:v.charCodeAt(i)-65);return String.fromCharCode(65+s%26)==v[15]}
function kMail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)}

/** Adresse aus dem Termin („Straße, PLZ Ort“) in Felder zerlegen */
function kSplitAdr(a){a=(a||'').trim();var i=a.lastIndexOf(',');if(i<0)return {street:a,zip:'',city:''};
 var tail=a.slice(i+1).trim(),m=/^(\d{5})(?:\s+(.*))?$/.exec(tail);return {street:a.slice(0,i).trim(),zip:m?m[1]:'',city:m?(m[2]||''):tail}}

function kNorm(d){var up=function(v){return (v||'').replace(/\s/g,'').toUpperCase()};
 return Object.assign({},d,{name:d.name.trim(),name2:d.name2.trim(),vat_id:up(d.vat_id).replace(/^IT(?=\d{11}$)/,''),tax_code:up(d.tax_code),sdi_code:up(d.sdi_code),
  pec:d.pec.trim().toLowerCase(),street:d.street.trim(),zip:d.zip.trim(),city:d.city.trim(),province:d.province.trim().toUpperCase(),country:d.country.trim().toUpperCase()||'IT',
  email:d.email.trim(),phone:d.phone.trim()})}
// Vereinheitlichen; Felder, die zur Art nicht passen, gehen nicht mit
function kClean(d){var c=kNorm(d);if(c.kind=='privat'){c.vat_id='';c.sdi_code='';c.pec=''}if(c.kind=='oeffentlich')c.pec='';return c}
function kCheck(c){var e={};
 if(!c.name)e.name='Pflichtfeld.';
 if(c.country=='IT'&&c.vat_id&&!kPiva(c.vat_id))e.vat_id='Keine gültige Partita IVA.';
 if(c.tax_code&&!kCf(c.tax_code))e.tax_code='Kein gültiger Codice Fiscale.';
 if(c.sdi_code&&!(c.kind=='oeffentlich'?/^[A-Z0-9]{6}$/:/^[A-Z0-9]{7}$/).test(c.sdi_code))e.sdi_code=c.kind=='oeffentlich'?'Der IPA-Code hat 6 Zeichen.':'Der SDI-Code hat 7 Zeichen.';
 if(c.pec&&!kMail(c.pec))e.pec='Keine gültige E-Mail-Adresse.';
 if(c.email&&!kMail(c.email))e.email='Keine gültige E-Mail-Adresse.';
 if(c.country=='IT'&&c.zip&&!/^\d{5}$/.test(c.zip))e.zip='Die PLZ hat 5 Ziffern.';
 if(c.province&&!/^[A-Z]{2}$/.test(c.province))e.province='Zwei Buchstaben, z. B. BZ.';
 if(!/^[A-Z]{2}$/.test(c.country))e.country='Zwei Buchstaben, z. B. IT.';
 return e}

/** Fenster öffnen; init: Vorbelegung (z. B. aus dem Termin), then(c): gespeicherte Planner-Kopie */
function kNeuDlg(init,then){
 KN={d:Object.assign({kind:'firma',name:'',name2:'',language:'de',vat_id:'',tax_code:'',sdi_code:'',pec:'',street:'',zip:'',city:'',province:'',country:'IT',email:'',phone:'',notiz:''},init||{}),then:then,e:{}};
 if(KN.d.zip&&!KN.d.province)kZipFill(KN.d.zip);
 kNeuRender();var k=document.getElementById('kdlg');if(!k.open)k.showModal();setTimeout(function(){var n=document.getElementById('kn_name');if(n&&!n.value)n.focus()},0)}
function kZipFill(z){var d=KN.d,c=KZIP[z],p=/^\d{5}$/.test(z)&&KPROV[z.slice(0,2)];if(p)d.province=p;if(c&&!d.city.trim())d.city=c[d.language=='it'?1:0]}
function kNeuSet(k,v){KN.d[k]=v;if(KN.e[k]){delete KN.e[k];var el=document.getElementById('kn_e_'+k);if(el)el.remove()}
 if(k=='zip'){var before=[KN.d.city,KN.d.province].join();kZipFill(v.trim());if([KN.d.city,KN.d.province].join()!=before){document.getElementById('kn_city').value=KN.d.city;document.getElementById('kn_province').value=KN.d.province}}}
function kNeuKind(k){KN.d.kind=k;kNeuRender()}
function kNeuRender(){var d=KN.d,e=KN.e,k=document.getElementById('kdlg');
 var f=function(key,label,o){o=o||{};return '<div class="kf'+(o.wide?' w':'')+'"><label for="kn_'+key+'">'+label+(o.req?' *':'')+'</label><input id="kn_'+key+'" value="'+esc(d[key])+'"'+(o.type?' type="'+o.type+'"':'')+(o.max?' maxlength="'+o.max+'"':'')+(o.up?' style="text-transform:uppercase"':'')+
  (e[key]?' aria-invalid="true" aria-describedby="kn_e_'+key+'"':'')+' oninput="kNeuSet(\''+key+'\',this.value)"'+(o.ac?' autocomplete="'+o.ac+'"':'')+'>'+(e[key]?'<small class="ferr" id="kn_e_'+key+'">'+esc(e[key])+'</small>':'')+'</div>'};
 var kinds=[['firma','Firma'],['privat','Privat'],['oeffentlich','Öffentlich']];
 k.innerHTML='<div class="dt2"><b>Neuer Kunde</b><button class="ib" onclick="kNeuClose()" title="Schließen">'+ic('x')+'</button></div>'+
  '<label id="kn_kl">Art</label><div class="seg" role="group" aria-labelledby="kn_kl">'+kinds.map(function(x){return '<button type="button" class="'+(d.kind==x[0]?'on':'')+'" aria-pressed="'+(d.kind==x[0])+'" onclick="kNeuKind(\''+x[0]+'\')">'+x[1]+'</button>'}).join('')+'</div>'+
  '<div class="kg">'+f('name','Name',{req:true,max:160})+f('name2','Name 2 / Zusatz',{max:160})+
  '<div class="kf"><label for="kn_language">Sprache</label><select id="kn_language" onchange="kNeuSet(\'language\',this.value)"><option value="de"'+(d.language=='de'?' selected':'')+'>Deutsch</option><option value="it"'+(d.language=='it'?' selected':'')+'>Italiano</option></select></div>'+
  (d.kind!='privat'?f('vat_id','MwSt.-Nr. (Partita IVA)',{up:true,max:30}):'')+f('tax_code','Steuernummer (Codice Fiscale)',{up:true,max:16})+
  (d.kind=='firma'?f('sdi_code','SDI-Code',{up:true,max:7})+f('pec','PEC',{type:'email'}):'')+(d.kind=='oeffentlich'?f('sdi_code','IPA-Code',{up:true,max:6}):'')+
  f('street','Straße',{wide:true,ac:'street-address'})+f('zip','PLZ',{max:10,ac:'postal-code'})+f('city','Ort')+f('province','Provinz',{up:true,max:2})+f('country','Land',{up:true,max:2})+
  f('email','E-Mail',{type:'email',ac:'email'})+f('phone','Telefon',{type:'tel',ac:'tel'})+'</div>'+
  '<label for="kn_notiz">Notizen für die Baustelle</label><textarea id="kn_notiz" rows="3" oninput="KN.d.notiz=this.value">'+esc(d.notiz)+'</textarea>'+
  '<div class="khint">Der Kunde entsteht direkt in der ERP. Kontakte, Lieferadressen und Konditionen ergänzt das Büro dort.</div>'+
  '<div class="row ft"><button class="b" onclick="kNeuClose()">Abbrechen</button><button class="b p" id="kn_save" onclick="kNeuSave(this)">Speichern und übernehmen</button></div>'}
function kNeuClose(){document.getElementById('kdlg').close();KN=null}
function kNeuSave(b){var c=kClean(KN.d);KN.e=kCheck(c);
 if(Object.keys(KN.e).length){KN.d=c;kNeuRender();var x=document.querySelector('#kdlg [aria-invalid="true"]');if(x)x.focus();return}
 var p={};['kind','name','name2','language','vat_id','tax_code','sdi_code','pec','street','zip','city','province','country','email','phone'].forEach(function(k){p[k]=c[k]});
 var adr=[c.street,[c.zip,c.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),then=KN.then;b.disabled=true;
 sb.rpc('erp_planner_customer_create',{p:p}).then(function(r){
  // Datenbank-Update noch nicht eingespielt: wie bisher nur Name, Adresse und Telefon
  if(r.error&&r.error.code=='PGRST202')return kCreate([c.name,c.name2].filter(Boolean).join(' '),adr,c.phone).then(function(r2){if(!r2.error)alert('Hinweis: Das Datenbank-Update für alle Stammdaten fehlt noch. Gespeichert sind Name, Adresse und Telefon; den Rest bitte in der ERP ergänzen.');return r2});
  if(!r.error&&r.data){KLAST=r.data.id;if(!kById(KLAST))S.cust.push(r.data)}return r})
 .then(function(r){if(r.error){b.disabled=false;fail(r.error);return}var cn=kById(KLAST);
  return (c.notiz.trim()?sb.from('customers').update({notiz:c.notiz.trim()}).eq('id',KLAST).then(function(r3){if(r3.error)fail(r3.error);else cn.notiz=c.notiz.trim()}):Promise.resolve()).then(function(){kNeuClose();if(then)then(cn)})})}
