/* ===== Deciplan — script.js v4 ===== */

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

let allData   = [];
let favorites = JSON.parse(localStorage.getItem('deciplan_favs') || '[]');
let showFavsOnly = false;

/* ══════════════════════════════════════
   UTILITAIRES DATE
══════════════════════════════════════ */
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-');
  return new Date(+y, +m - 1, +d);
}

function fmt(s) {
  if (!s) return null;
  return parseDate(s).toLocaleDateString('fr-MA', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function daysLeft(r) {
  const clo = parseDate(r.clo);
  return clo ? Math.round((clo - TODAY) / 86400000) : null;
}

function getStatus(r) {
  const ouv = parseDate(r.ouv);
  const clo = parseDate(r.clo);
  if (!ouv && !clo) return 'attente';
  if (clo && TODAY > clo) return 'ferme';
  if (ouv && TODAY < ouv) return 'attente';
  const dl = daysLeft(r);
  return (dl !== null && dl <= 7) ? 'bientot' : 'ouvert';
}

/* ══════════════════════════════════════
   VILLES
══════════════════════════════════════ */
function fmtVillesAll(r) {
  if (Array.isArray(r.villes)) return r.villes.join(', ');
  return r.ville || '—';
}

function fmtVillesShort(r) {
  const arr = Array.isArray(r.villes) ? r.villes : (r.ville ? [r.ville] : ['—']);
  if (arr.length <= 2) return arr.join(', ');
  return arr[0] + ', ' + arr[1] + ' <span class="more-cities">+' + (arr.length - 2) + '</span>';
}

/* ══════════════════════════════════════
   FAVORIS
══════════════════════════════════════ */
function isFav(nom) {
  return favorites.includes(nom);
}

function toggleFav(nom) {  // exposée globalement plus bas
  if (isFav(nom)) {
    favorites = favorites.filter(f => f !== nom);
  } else {
    favorites.push(nom);
  }
  localStorage.setItem('deciplan_favs', JSON.stringify(favorites));
  updateFavCount();
  render();
}

/* Exposer toggleFav au scope global pour les onclick HTML */
window.toggleFav = toggleFav;

function updateFavCount() {
  const el = document.getElementById('fav-count');
  if (el) el.textContent = favorites.length > 0 ? `(${favorites.length})` : '';
  const btn = document.getElementById('favToggle');
  if (btn) btn.classList.toggle('active', showFavsOnly);
}

/* ══════════════════════════════════════
   MODE SOMBRE
══════════════════════════════════════ */
function initDarkMode() {
  const saved = localStorage.getItem('deciplan_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateDarkBtn(saved);
}

function toggleDark() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('deciplan_theme', next);
  updateDarkBtn(next);
}

function updateDarkBtn(theme) {
  const btn = document.getElementById('darkToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ══════════════════════════════════════
   CATÉGORIES DYNAMIQUES
══════════════════════════════════════ */
function buildCatFilter() {
  const cats = [...new Set(allData.map(r => r.cat))].sort();
  const sel = document.getElementById('filter-cat');
  sel.innerHTML = '<option value="">Toutes les filières</option>';
  cats.forEach(c => {
    const o = document.createElement('option');
    o.value = o.textContent = c;
    sel.appendChild(o);
  });
}

/* ══════════════════════════════════════
   RENDER
══════════════════════════════════════ */
function render() {
  const search = document.getElementById('search').value.toLowerCase().trim();
  const cat    = document.getElementById('filter-cat').value;
  const status = document.getElementById('filter-status').value;

  let rows = allData.filter(r => {
    if (showFavsOnly && !isFav(r.nom)) return false;
    if (search) {
      const hay = [r.nom, r.cat, fmtVillesAll(r), r.note||'', r.modalite||'', r.concours||'']
                  .join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (cat    && r.cat !== cat)           return false;
    if (status && getStatus(r) !== status) return false;
    return true;
  });

  /* Tri : favoris en premier, puis par statut */
  const order = { bientot: 0, ouvert: 1, attente: 2, ferme: 3 };
  rows.sort((a, b) => {
    const fa = isFav(a.nom) ? 0 : 1;
    const fb = isFav(b.nom) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return order[getStatus(a)] - order[getStatus(b)];
  });

  /* Compteurs */
  let cntOpen = 0, cntSoon = 0, cntClosed = 0;
  allData.forEach(r => {
    const s = getStatus(r);
    if      (s === 'bientot') { cntOpen++; cntSoon++; }
    else if (s === 'ouvert')  { cntOpen++; }
    else if (s === 'ferme')   { cntClosed++; }
  });
  document.getElementById('cnt-open').textContent   = cntOpen;
  document.getElementById('cnt-soon').textContent   = cntSoon;
  document.getElementById('cnt-closed').textContent = cntClosed;
  document.getElementById('cnt-total').textContent  = allData.length;

  const tbody = document.getElementById('tbody');
  if (!rows.length) {
    const msg = showFavsOnly
      ? '⭐ Aucun favori enregistré. Cliquez sur ☆ pour en ajouter.'
      : '😔 Aucun résultat pour ces filtres.';
    tbody.innerHTML = `<tr><td colspan="11" class="empty">${msg}</td></tr>`;
    return;
  }

  const badgeClass = { ouvert:'b-open', bientot:'b-soon', ferme:'b-closed', attente:'b-wait' };
  const badgeLabel = { ouvert:'✅ Ouvert', bientot:'⚠️ Bientôt', ferme:'❌ Fermé', attente:'🕐 En attente' };

  tbody.innerHTML = rows.map(r => {
    const st      = getStatus(r);
    const days    = daysLeft(r);
    const fav     = isFav(r.nom);
    const favClass = fav ? 'fav-btn active' : 'fav-btn';
    const favIcon  = fav ? '⭐' : '☆';

    /* Col ⭐ Favori */
    const col0 = `<td class="col-fav">
      <button class="${favClass}" onclick="toggleFav(${JSON.stringify(r.nom)})" title="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${favIcon}</button>
    </td>`;

    /* Col 1 Établissement */
    const noteDiv = r.note ? `<div class="school-note">${r.note}</div>` : '';
    const rowClass = fav ? ' class="fav-row"' : '';
    const col1 = `<td class="col-nom"><div class="school-name">${r.nom}</div>${noteDiv}</td>`;

    /* Col 2 Filière */
    const col2 = `<td class="col-cat"><span class="cat-pill">${r.cat}</span></td>`;

    /* Col 3 Ville */
    const col3 = `<td class="col-ville" title="${fmtVillesAll(r)}">📍 ${fmtVillesShort(r)}</td>`;

    /* Col 4 Statut */
    const col4 = `<td class="col-statut"><span class="badge ${badgeClass[st]}">${badgeLabel[st]}</span></td>`;

    /* Col 5 Période */
    const ouvFmt = fmt(r.ouv);
    const cloFmt = fmt(r.clo);
    let periodeHtml;
    if (!ouvFmt && !cloFmt) {
      periodeHtml = '<span class="date-empty">—</span>';
    } else if (!ouvFmt) {
      periodeHtml = `<span class="date-label">Jusqu'au</span><br><span class="date-clo">${cloFmt}</span>`;
    } else {
      periodeHtml = `<span class="date-ouv">${ouvFmt}</span><span class="date-arrow"> → </span><span class="date-clo">${cloFmt||'?'}</span>`;
    }
    const col5 = `<td class="col-periode">${periodeHtml}</td>`;

    /* Col 6 Délai */
    let cd = '<span class="countdown">—</span>';
    if (days !== null) {
      if      (days < 0)   cd = '<span class="countdown expired">Expiré</span>';
      else if (days === 0) cd = '<span class="countdown urgent">Auj. !</span>';
      else if (days <= 7)  cd = `<span class="countdown urgent">${days} j</span>`;
      else if (days <= 14) cd = `<span class="countdown warning">${days} j</span>`;
      else                 cd = `<span class="countdown ok">${days} j</span>`;
    }
    const col6 = `<td class="col-delai">${cd}</td>`;

    /* Col 7 Modalité */
    const col7 = `<td class="col-modal">${r.modalite
      ? `<span class="modal-tag">🎯 ${r.modalite}</span>`
      : '<span class="date-empty">—</span>'}</td>`;

    /* Col 8 Date concours */
    const col8 = `<td class="col-concours">${r.concours
      ? `<span class="concours-tag">📅 ${r.concours}</span>`
      : '<span class="date-empty">—</span>'}</td>`;

    /* Col 9 Avis PDF */
    const col9 = `<td class="col-avis">${r.avis
      ? `<a class="avis-btn" href="${r.avis}" target="_blank" rel="noopener">📥 Voir</a>`
      : '<span class="date-empty">—</span>'}</td>`;

    /* Col 10 Lien */
    const col10 = `<td class="col-lien">${r.lien
      ? `<a class="link-btn" href="${r.lien}" target="_blank" rel="noopener">🔗 Voir</a>`
      : '<span class="link-btn disabled">—</span>'}</td>`;

    return `<tr${rowClass}>${col0}${col1}${col2}${col3}${col4}${col5}${col6}${col7}${col8}${col9}${col10}</tr>`;
  }).join('');
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Mode sombre */
  initDarkMode();
  document.getElementById('darkToggle').addEventListener('click', toggleDark);

  /* Filtre favoris */
  document.getElementById('favToggle').addEventListener('click', () => {
    showFavsOnly = !showFavsOnly;
    updateFavCount();
    render();
  });

  /* Chargement JSON */
  fetch('ecoles_complet.json')
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then(data => {
      allData = data;
      buildCatFilter();
      updateFavCount();
      render();
    })
    .catch(err => {
      console.error('Erreur chargement JSON :', err);
      document.getElementById('tbody').innerHTML =
        `<tr><td colspan="11" class="empty">⚠️ Impossible de charger <strong>ecoles_complet.json</strong>.<br>Vérifiez que le fichier est dans le même dossier.</td></tr>`;
    });

  document.getElementById('search').addEventListener('input', render);
  document.getElementById('filter-cat').addEventListener('change', render);
  document.getElementById('filter-status').addEventListener('change', render);
});
