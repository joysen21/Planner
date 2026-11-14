// Barrierefreiheit: verbindet jedes <label> mit seinem Feld, auch in Dialogen, die später gerendert werden.
// Feld direkt danach (input/select/textarea) -> for=id; Schalter-Gruppe (.seg) oder Zeile mit Knöpfen -> role=group + aria-labelledby;
// Zeile mit einem Feld (z. B. Passwort + Knopf) -> for auf das erste Feld.
(function () {
  var n = 0;
  var CTRL = 'input,select,textarea';
  function uid(el, pre) {
    if (!el.id) el.id = pre + (++n);
    return el.id;
  }
  function link(l) {
    if (l.htmlFor || l.hasAttribute('data-a11y') || l.querySelector(CTRL)) return;
    l.setAttribute('data-a11y', '1');
    var s = l.nextElementSibling;
    if (!s) return;
    if (s.matches(CTRL)) { l.htmlFor = uid(s, 'a11y-f'); return; }
    if (s.matches('.seg') || !s.querySelector(CTRL)) {
      if (s.querySelector('button')) {
        s.setAttribute('role', 'group');
        s.setAttribute('aria-labelledby', uid(l, 'a11y-l'));
      }
      return;
    }
    l.htmlFor = uid(s.querySelector(CTRL), 'a11y-f');
  }
  function scan(root) {
    if (!root.querySelectorAll) return;
    if (root.tagName === 'LABEL') link(root);
    root.querySelectorAll('label').forEach(link);
  }
  function start() {
    scan(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(scan); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
