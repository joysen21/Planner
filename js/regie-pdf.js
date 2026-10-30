// Planner – Regiebericht als PDF für den Kunden: ohne Preise und ohne die Notiz fürs Büro.
// Kleiner eigener PDF-Schreiber (Helvetica, JPEG-Bilder), damit die App keine große Bibliothek laden muss.

function pdfText(s){return '('+String(s==null?'':s).replace(/[^\x20-\x7e\xa0-\xff€–„“”’]/g,' ').replace(/([\\()])/g,'\\$1')+')'}
// Windows-1252: die wenigen Zeichen außerhalb von Latin-1, die in Berichten vorkommen
var PDF_MAP={'€':0x80,'–':0x96,'„':0x84,'“':0x93,'”':0x94,'’':0x92};
function pdfBytes(s){var o=new Uint8Array(s.length);for(var i=0;i<s.length;i++){var c=s.charAt(i);o[i]=PDF_MAP[c]||(s.charCodeAt(i)&255)}return o}
// Helvetica ist im Schnitt etwa halb so breit wie hoch; etwas Luft, damit nichts über den Rand läuft
function pdfWrap(s,size,w){var max=Math.floor(w/(size*0.52)),out=[];String(s||'').split('\n').forEach(function(p){var l='';p.split(/\s+/).forEach(function(x){
  while(x.length>max){if(l){out.push(l);l=''}out.push(x.slice(0,max));x=x.slice(max)}
  if((l+' '+x).trim().length>max){out.push(l);l=x}else l=(l+' '+x).trim()});out.push(l)});return out}

function PdfDoc(){var W=595,H=842,M=48,pages=[],imgs=[],cur=null,y=0;
 function page(){cur=[];pages.push(cur);y=H-M}
 function room(h){if(y-h<M)page()}
 function text(s,x,yy,size,bold){cur.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+yy+' Td '+pdfText(s)+' Tj ET')}
 page();
 return {W:W,M:M,
  line:function(s,size,bold,gap){size=size||10;pdfWrap(s,size,W-2*M).forEach(function(l){room(size+4);y-=size+3;text(l,M,y,size,bold)});y-=gap||0},
  // Zeile mit Wert rechts, für Stunden und Material
  row:function(a,b){var ls=pdfWrap(a,10,W-2*M-90);room(ls.length*13+5);ls.forEach(function(l,i){y-=13;text(l,M,y,10,false);if(!i)text(b,W-M-85,y,10,true)});y-=2;cur.push('0.85 G '+M+' '+y+' m '+(W-M)+' '+y+' l S 0 G');y-=3},
  space:function(n){y-=n},
  image:function(im,maxW,maxH){var s=Math.min(maxW/im.w,maxH/im.h,1),w=Math.round(im.w*s),h=Math.round(im.h*s);room(h+6);y-=h;imgs.push(im);cur.push('q '+w+' 0 0 '+h+' '+M+' '+y+' cm /I'+imgs.length+' Do Q');y-=6},
  build:function(){var parts=[],offs=[],len=0,add=function(b){if(typeof b=='string')b=pdfBytes(b);parts.push(b);len+=b.length};
   var nImg=imgs.length,nPage=pages.length,first=5+nImg;   // 1 Katalog, 2 Seiten, 3–4 Schriften, dann Bilder, dann je Seite Inhalt + Seite
   var obj=function(n,body,stream){offs[n]=len;add(n+' 0 obj\n');if(stream){add('<<'+body+' /Length '+stream.length+'>>\nstream\n');add(stream);add('\nendstream')}else add(body);add('\nendobj\n')};
   add('%PDF-1.4\n');
   var kids=pages.map(function(_,i){return (first+i*2+1)+' 0 R'}).join(' ');
   obj(1,'<</Type/Catalog/Pages 2 0 R>>');
   obj(2,'<</Type/Pages/Count '+nPage+'/Kids['+kids+']>>');
   obj(3,'<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>');
   obj(4,'<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>');
   imgs.forEach(function(m,i){obj(5+i,'/Type/XObject/Subtype/Image/Width '+m.w+'/Height '+m.h+'/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode',m.data)});
   var xo=imgs.map(function(_,i){return '/I'+(i+1)+' '+(5+i)+' 0 R'}).join('');
   pages.forEach(function(ops,i){var n=first+i*2;
    obj(n,'',pdfBytes(ops.join('\n')));
    obj(n+1,'<</Type/Page/Parent 2 0 R/MediaBox[0 0 '+W+' '+H+']/Contents '+n+' 0 R/Resources<</Font<</F1 3 0 R/F2 4 0 R>>/XObject<<'+xo+'>>>>>>')});
   var total=first+nPage*2,x=len,t='xref\n0 '+total+'\n0000000000 65535 f \n';
   for(var k=1;k<total;k++)t+=String(offs[k]).padStart(10,'0')+' 00000 n \n';
   add(t+'trailer\n<</Size '+total+'/Root 1 0 R>>\nstartxref\n'+x+'\n%%EOF\n');
   return new Blob(parts,{type:'application/pdf'})}}}

// Bild aus dem Speicher als JPEG auf weißem Grund (Unterschriften sind durchsichtig)
async function pdfImage(path,maxPx){var u=await sb.storage.from('erp-files').createSignedUrl(path,300);if(!u.data)throw new Error('Bild fehlt');
 var blob=await (await fetch(u.data.signedUrl)).blob(),b=await createImageBitmap(blob),s=Math.min(1,maxPx/Math.max(b.width,b.height)),c=document.createElement('canvas');
 c.width=Math.max(1,Math.round(b.width*s));c.height=Math.max(1,Math.round(b.height*s));var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(b,0,0,c.width,c.height);
 var jpg=await new Promise(function(ok){c.toBlob(ok,'image/jpeg',0.8)});
 return {w:c.width,h:c.height,data:new Uint8Array(await jpg.arrayBuffer())}}

async function rgPdfBuild(){var r=RG.r,j=RG.job,p=parse(r.work_date),d=PdfDoc(),miss=0;
 d.line(ORG.name||'',11,true,10);
 d.line('Regiebericht'+(r.number?' '+r.number:''),18,true,6);
 d.line(WD[p.getDay()]+' '+dDE(r.work_date),10,false,8);
 d.line(j.kunde||'',11,true);
 if(j.adresse)d.line(j.adresse,10);
 if(r.title)d.line(r.title,10,false,0);
 d.space(14);
 d.line('Arbeitszeit',12,true,4);
 RG.hours.forEach(function(x){d.row(uName(x.employee_id),rgFmt(x.hours))});
 d.row('Summe',rgFmt(rgHours(RG.hours.reduce(function(s,x){return s+x.hours},0))));
 d.space(12);
 if(RG.mat.length){d.line('Material',12,true,4);RG.mat.forEach(function(x){d.row(x.text,x.qty.toLocaleString('de-DE')+' '+x.unit)});d.space(12)}
 for(var i=0;i<RG.photos.length;i++){if(!i)d.line('Fotos',12,true,4);
  try{d.image(await pdfImage(RG.photos[i].path,1000),300,220)}catch(e){miss++}}
 d.space(12);
 d.line('Unterschrift Kunde',12,true,4);
 try{d.image(await pdfImage(r.signature_path,800),220,90)}catch(e){miss++}
 d.line((r.signer_name||'')+(r.signed_at?' · '+new Date(r.signed_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):''),10);
 return {blob:d.build(),miss:miss}}

// Zwei Schritte: Das Teilen-Menü des Handys öffnet nur direkt nach einem Fingertipp, das Erstellen kann aber dauern
async function rgPdf(btn){var box=document.getElementById('rg_pdf');
 if(RG.dirty&&!RG.ro){var ok=await rgSave(false,true);if(!ok)return;box=document.getElementById('rg_pdf')}
 if(btn)btn.disabled=true;box.innerHTML='<div class="sub">PDF wird erstellt …</div>';
 try{var o=await rgPdfBuild(),name='Regiebericht_'+(RG.r.number||RG.r.work_date)+'.pdf';
  RG.pdf=new File([o.blob],name,{type:'application/pdf'});
  var can=navigator.canShare&&navigator.canShare({files:[RG.pdf]});
  box.innerHTML=(o.miss?'<div class="sub bad">'+o.miss+' Bild(er) konnten nicht eingefügt werden.</div>':'')+
   '<div class="row">'+(can?'<button class="b p" onclick="rgPdfShare()">'+ic('check')+' PDF teilen</button>':'')+'<button class="b'+(can?'':' p')+'" onclick="rgPdfSave()">PDF herunterladen</button></div>'}
 catch(e){box.innerHTML='<div class="err">PDF nicht möglich: '+esc(e.message||String(e))+'</div>'}}
function rgPdfSave(){var a=document.createElement('a'),u=URL.createObjectURL(RG.pdf);a.href=u;a.download=RG.pdf.name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},10000)}
function rgPdfShare(){navigator.share({files:[RG.pdf],title:RG.pdf.name}).catch(function(e){if(e.name!='AbortError')rgPdfSave()})}
function rgPdfBtn(){return '<div id="rg_pdf" class="rgpdf"><button class="b" style="width:100%" onclick="rgPdf(this)">PDF für den Kunden</button></div>'}
