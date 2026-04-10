/* ===== Deciplan — script.js v6 ===== */

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

let allData      = [];
let favorites    = JSON.parse(localStorage.getItem('deciplan_favs') || '[]');
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
   FAVORIS — stockés dans localStorage
══════════════════════════════════════ */
function isFav(nom) {
  return favorites.includes(nom);
}

function saveFavs() {
  localStorage.setItem('deciplan_favs', JSON.stringify(favorites));
}

/* Exposé sur window pour être accessible depuis les onclick HTML */
window.toggleFav = function(btn) {
  const nom = btn.getAttribute('data-nom');
  if (!nom) return;
  if (isFav(nom)) {
    favorites = favorites.filter(f => f !== nom);
  } else {
    favorites.push(nom);
  }
  saveFavs();
  updateFavCount();
  render();
};

function updateFavCount() {
  const el  = document.getElementById('fav-count');
  const btn = document.getElementById('favToggle');
  if (el)  el.textContent = favorites.length > 0 ? '(' + favorites.length + ')' : '';
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
  const next    = current === 'dark' ? 'light' : 'dark';
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
  const sel  = document.getElementById('filter-cat');
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
      const hay = [r.nom, r.cat, fmtVillesAll(r),
                   r.note || '', r.modalite || '', r.concours || '']
                  .join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (cat    && r.cat !== cat)           return false;
    if (status && getStatus(r) !== status) return false;
    return true;
  });

  /* Tri : favoris en tête, puis bientôt > ouvert > attente > fermé */
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
      ? '⭐ Aucun favori. Cliquez sur ☆ pour en ajouter.'
      : '😔 Aucun résultat pour ces filtres.';
    tbody.innerHTML = '<tr><td colspan="11" class="empty">' + msg + '</td></tr>';
    return;
  }

  const badgeClass = { ouvert:'b-open', bientot:'b-soon', ferme:'b-closed', attente:'b-wait' };
  const badgeLabel = { ouvert:'✅ Ouvert', bientot:'⚠️ Bientôt', ferme:'❌ Fermé', attente:'🕐 En attente' };

  tbody.innerHTML = rows.map(r => {
    const st  = getStatus(r);
    const days = daysLeft(r);
    const fav  = isFav(r.nom);

    /* ── Étoile favori — data-nom + onclick propre ── */
    const safeNom = r.nom.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const col0 = '<td class="col-fav">'
      + '<button class="fav-btn' + (fav ? ' active' : '') + '" '
      + 'data-nom="' + safeNom + '" '
      + 'onclick="window.toggleFav(this)" '
      + 'title="' + (fav ? 'Retirer des favoris' : 'Ajouter aux favoris') + '">'
      + (fav ? '⭐' : '☆')
      + '</button></td>';

    /* ── Établissement ── */
    const noteDiv = r.note ? '<div class="school-note">' + r.note + '</div>' : '';
    const col1 = '<td class="col-nom">'
      + '<div class="school-name">' + r.nom + '</div>'
      + noteDiv + '</td>';

    /* ── Filière ── */
    const col2 = '<td class="col-cat"><span class="cat-pill">' + r.cat + '</span></td>';

    /* ── Ville(s) ── */
    const col3 = '<td class="col-ville" title="' + fmtVillesAll(r) + '">📍 ' + fmtVillesShort(r) + '</td>';

    /* ── Statut ── */
    const col4 = '<td class="col-statut"><span class="badge ' + badgeClass[st] + '">' + badgeLabel[st] + '</span></td>';

    /* ── Période ── */
    const ouvFmt = fmt(r.ouv);
    const cloFmt = fmt(r.clo);
    let periodeHtml;
    if (!ouvFmt && !cloFmt) {
      periodeHtml = '<span class="date-empty">—</span>';
    } else if (!ouvFmt) {
      periodeHtml = '<span class="date-label">Jusqu\'au</span><br>'
                  + '<span class="date-clo">' + cloFmt + '</span>';
    } else {
      periodeHtml = '<span class="date-ouv">' + ouvFmt + '</span>'
                  + '<span class="date-arrow"> → </span>'
                  + '<span class="date-clo">' + (cloFmt || '?') + '</span>';
    }
    const col5 = '<td class="col-periode">' + periodeHtml + '</td>';

    /* ── Délai ── */
    let cd = '<span class="countdown">—</span>';
    if (days !== null) {
      if      (days < 0)   cd = '<span class="countdown expired">Expiré</span>';
      else if (days === 0) cd = '<span class="countdown urgent">Auj. !</span>';
      else if (days <= 7)  cd = '<span class="countdown urgent">' + days + ' j</span>';
      else if (days <= 14) cd = '<span class="countdown warning">' + days + ' j</span>';
      else                 cd = '<span class="countdown ok">' + days + ' j</span>';
    }
    const col6 = '<td class="col-delai">' + cd + '</td>';

    /* ── Modalité ── */
    const col7 = '<td class="col-modal">'
      + (r.modalite
        ? '<span class="modal-tag">🎯 ' + r.modalite + '</span>'
        : '<span class="date-empty">—</span>')
      + '</td>';

    /* ── Date concours ── */
    const col8 = '<td class="col-concours">'
      + (r.concours
        ? '<span class="concours-tag">📅 ' + r.concours + '</span>'
        : '<span class="date-empty">—</span>')
      + '</td>';

    /* ── Avis PDF ── */
    const col9 = '<td class="col-avis">'
      + (r.avis
        ? '<a class="avis-btn" href="' + r.avis + '" target="_blank" rel="noopener">📥 Voir</a>'
        : '<span class="date-empty">—</span>')
      + '</td>';

    /* ── Lien officiel ── */
    const col10 = '<td class="col-lien">'
      + (r.lien
        ? '<a class="link-btn" href="' + r.lien + '" target="_blank" rel="noopener">🔗 Voir</a>'
        : '<span class="link-btn disabled">—</span>')
      + '</td>';

    const rowClass = fav ? ' class="fav-row"' : '';
    return '<tr' + rowClass + '>'
      + col0 + col1 + col2 + col3 + col4
      + col5 + col6 + col7 + col8 + col9 + col10
      + '</tr>';
  }).join('');
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {

  initDarkMode();

  document.getElementById('darkToggle').addEventListener('click', toggleDark);

  document.getElementById('favToggle').addEventListener('click', function() {
    showFavsOnly = !showFavsOnly;
    updateFavCount();
    render();
  });

  fetch('ecoles_complet.json')
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      allData = data;
      buildCatFilter();
      updateFavCount();
      render();
    })
    .catch(function(err) {
      console.error('Erreur chargement JSON :', err);
      document.getElementById('tbody').innerHTML =
        '<tr><td colspan="11" class="empty">⚠️ Impossible de charger <strong>ecoles_complet.json</strong>.<br>'
        + 'Vérifiez que le fichier est dans le même dossier.</td></tr>';
    });

  document.getElementById('search').addEventListener('input', render);
  document.getElementById('filter-cat').addEventListener('change', render);
  document.getElementById('filter-status').addEventListener('change', render);
});
