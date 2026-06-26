// VITMATERNA — Medición de elementos para anotar capturas con precisión.
// Devuelve, para cada "target", el rectángulo real (getBoundingClientRect) del
// control, en coordenadas de PÍXEL de la imagen (CSS * devicePixelRatio).
//
// Uso (vía agent-browser eval, con TARGETS inyectado por el orquestador):
//   const TARGETS = ["Confirmar asistencia", {label:"Próxima Cita", mode:"contains"}, ...];
// Cada target puede ser:
//   - string  -> busca por aria-label exacto, luego por textContent exacto.
//   - {label, mode}: mode = "exact" (def) | "contains" | "aria".
// Resuelve al elemento tappable (role=button/link/tabindex) más PEQUEÑO que
// contenga el texto; si no, al nodo de texto mismo.
(function () {
  const dpr = window.devicePixelRatio || 1;

  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const st = window.getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0) return false;
    // dentro del viewport (con margen)
    if (r.bottom < -20 || r.top > window.innerHeight + 20) return false;
    return true;
  }

  function tappableAncestor(el) {
    let cur = el;
    for (let i = 0; i < 6 && cur; i++) {
      const role = cur.getAttribute && cur.getAttribute('role');
      const tab = cur.getAttribute && cur.getAttribute('tabindex');
      if (role === 'button' || role === 'link' || tab === '0' || (cur.onclick)) return cur;
      cur = cur.parentElement;
    }
    return el;
  }

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left * dpr),
      y: Math.round(r.top * dpr),
      w: Math.round(r.width * dpr),
      h: Math.round(r.height * dpr),
    };
  }

  function findByAria(label) {
    const nodes = Array.from(document.querySelectorAll('[aria-label]'));
    const matches = nodes.filter((n) => n.getAttribute('aria-label') === label && visible(n));
    if (!matches.length) return null;
    matches.sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) -
                           (b.getBoundingClientRect().width * b.getBoundingClientRect().height));
    return matches[0];
  }

  function findByText(text, contains) {
    const all = Array.from(document.querySelectorAll('div,span,a,button,p,text'));
    let matches = all.filter((n) => {
      if (!visible(n)) return false;
      const t = (n.textContent || '').trim();
      return contains ? t.includes(text) : t === text;
    });
    if (!matches.length) return null;
    // el más pequeño que contiene el texto (el nodo de texto más ajustado)
    matches.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (ra.width * ra.height) - (rb.width * rb.height);
    });
    return matches[0];
  }

  function climb(el, levels) {
    let cur = el;
    for (let i = 0; i < levels && cur.parentElement; i++) cur = cur.parentElement;
    return cur;
  }

  function resolve(target) {
    let label, mode, up;
    if (typeof target === 'string') { label = target; mode = 'auto'; up = 0; }
    else { label = target.label; mode = target.mode || 'auto'; up = target.up || 0; }

    let el = null;
    if (mode === 'aria') el = findByAria(label);
    else if (mode === 'contains') el = findByText(label, true);
    else if (mode === 'exact') el = findByText(label, false);
    else { // auto: aria -> exact -> contains
      el = findByAria(label) || findByText(label, false) || findByText(label, true);
    }
    if (!el) return null;
    // `up` sube N niveles desde el texto (para envolver la tarjeta/sección);
    // si up=0 usa el ancestro tappable (botón/enlace).
    const node = up > 0 ? climb(el, up) : tappableAncestor(el);
    return rectOf(node);
  }

  const out = {};
  for (let i = 0; i < TARGETS.length; i++) {
    const t = TARGETS[i];
    const key = typeof t === 'string' ? t : t.label;
    const r = resolve(t);
    if (r) out[key] = r;
  }
  return JSON.stringify({ dpr, vw: window.innerWidth, vh: window.innerHeight, rects: out });
})();
