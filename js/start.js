// Planner – Navigation einrichten, App starten, Service Worker
// Klassisches Skript (kein Modul): alle Funktionen sind global; Ladereihenfolge siehe index.html.
document.querySelector('nav').insertAdjacentHTML('afterbegin','<div class="nlg" title="JoKe Smart Solutions">'+LOGO_I+'</div>');
document.querySelectorAll('nav [data-i]').forEach(function(x){x.innerHTML=ic(x.dataset.i)});
document.querySelectorAll('nav button').forEach(function(b){b.onclick=function(){tab=b.dataset.t;window.scrollTo(0,0);render()}});
an=fmt(new Date());  // angezeigtes Datum (fmt kommt aus daten.js, daher erst hier)
boot();
if('serviceWorker' in navigator&&(location.protocol=='https:'||location.hostname=='localhost'))navigator.serviceWorker.register('sw.js').catch(function(e){console.warn('Service Worker:',e)});
