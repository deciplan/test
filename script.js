/* ===== Deciplan — script.js v7 ===== */

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
   FAVORIS
══════════════════════════════════════ */
function isFav(nom) {
  return favorites.includes(nom);
}

function saveFavs() {
  localStorage.setItem('deciplan_favs', JSON.stringify(favorites));
}

window.toggleFav = function(btn) {
  var nom = btn.getAttribute('data-nom');
  if (!nom) return;
  if (isFav(nom)) {
    favorites = favorites.filter(function(f) { return f !== nom; });
  } else {
    favorites.push(nom);
  }
  saveFavs();
  updateFavCount();
  render();

  /* Événement Google Analytics */
  if (typeof gtag !== 'undefined') {
    gtag('event', isFav(nom) ? 'remove_favorite' : 'add_favorite', {
      event_category: 'Favoris',
      event_label: nom
    });
  }
};

function updateFavCount() {
  var el  = document.getElementById('fav-count');
  var btn = document.getElementById('favToggle');
  if (el)  el.textContent = favorites.length > 0 ? '(' + favorites.length + ')' : '';
  if (btn) btn.classList.toggle('active', showFavsOnly);
}

/* ══════════════════════════════════════
   MODE SOMBRE
══════════════════════════════════════ */
function initDarkMode() {
  var saved = localStorage.getItem('deciplan_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateDarkBtn(saved);
}

function toggleDark() {
  var current = document.documentElement.getAttribute('data-theme');
  var next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('deciplan_theme', next);
  updateDarkBtn(next);
}

function updateDarkBtn(theme) {
  var btn = document.getElementById('darkToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ══════════════════════════════════════
   CATÉGORIES DYNAMIQUES
══════════════════════════════════════ */
function buildCatFilter() {
  var cats = [];
  allData.forEach(function(r) {
    if (cats.indexOf(r.cat) === -1) cats.push(r.cat);
  });
  cats.sort();
  var sel = document.getElementById('filter-cat');
  sel.innerHTML = '<option value="">Toutes les filières</option>';
  cats.forEach(function(c) {
    var o = document.createElement('option');
    o.value = o.textContent = c;
    sel.appendChild(o);
  });
}

/* ══════════════════════════════════════
   RENDER
══════════════════════════════════════ */
function render() {
  var search = document.getElementById('search').value.toLowerCase().trim();
  var cat    = document.getElementById('filter-cat').value;
  var status = document.getElementById('filter-status').value;

  var rows = allData.filter(function(r) {
    if (showFavsOnly && !isFav(r.nom)) return false;
    if (search) {
      var hay = [r.nom, r.cat, fmtVillesAll(r),
                 r.note || '', r.modalite || '', r.concours || '']
                .join(' ').toLowerCase();
      if (hay.indexOf(search) === -1) return false;
    }
    if (cat    && r.cat !== cat)           return false;
    if (status && getStatus(r) !== status) return false;
    return true;
  });

  /* Tri : favoris en tête, puis bientôt > ouvert > attente > fermé */
  var order = { bientot: 0, ouvert: 1, attente: 2, ferme: 3 };
  rows.sort(function(a, b) {
    var fa = isFav(a.nom) ? 0 : 1;
    var fb = isFav(b.nom) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return order[getStatus(a)] - order[getStatus(b)];
  });

  /* Compteurs */
  var cntOpen = 0, cntSoon = 0, cntClosed = 0;
  allData.forEach(function(r) {
    var s = getStatus(r);
    if      (s === 'bientot') { cntOpen++; cntSoon++; }
    else if (s === 'ouvert')  { cntOpen++; }
    else if (s === 'ferme')   { cntClosed++; }
  });
  document.getElementById('cnt-open').textContent   = cntOpen;
  document.getElementById('cnt-soon').textContent   = cntSoon;
  document.getElementById('cnt-closed').textContent = cntClosed;
  document.getElementById('cnt-total').textContent  = allData.length;

  var tbody = document.getElementById('tbody');

  if (!rows.length) {
    var msg = showFavsOnly
      ? '⭐ Aucun favori. Cliquez sur ☆ pour en ajouter.'
      : '😔 Aucun résultat pour ces filtres.';
    tbody.innerHTML = '<tr><td colspan="11" class="empty">' + msg + '</td></tr>';
    return;
  }

  var badgeClass = { ouvert:'b-open', bientot:'b-soon', ferme:'b-closed', attente:'b-wait' };
  var badgeLabel = { ouvert:'✅ Ouvert', bientot:'⚠️ Bientôt', ferme:'❌ Fermé', attente:'🕐 En attente' };

  tbody.innerHTML = rows.map(function(r) {
    var st   = getStatus(r);
    var days = daysLeft(r);
    var fav  = isFav(r.nom);

    /* Étoile favori — data-nom pour éviter le bug des guillemets */
    var safeNom = r.nom.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    var col0 = '<td class="col-fav">'
      + '<button class="fav-btn' + (fav ? ' active' : '') + '" '
      + 'data-nom="' + safeNom + '" '
      + 'onclick="window.toggleFav(this)" '
      + 'title="' + (fav ? 'Retirer des favoris' : 'Ajouter aux favoris') + '">'
      + (fav ? '⭐' : '☆')
      + '</button></td>';

    /* Établissement */
    var noteDiv = r.note ? '<div class="school-note">' + r.note + '</div>' : '';
    var col1 = '<td class="col-nom">'
      + '<div class="school-name">' + r.nom + '</div>'
      + noteDiv + '</td>';

    /* Filière */
    var col2 = '<td class="col-cat"><span class="cat-pill">' + r.cat + '</span></td>';

    /* Ville(s) */
    var col3 = '<td class="col-ville" title="' + fmtVillesAll(r) + '">📍 ' + fmtVillesShort(r) + '</td>';

    /* Statut */
    var col4 = '<td class="col-statut"><span class="badge ' + badgeClass[st] + '">' + badgeLabel[st] + '</span></td>';

    /* Période */
    var ouvFmt = fmt(r.ouv);
    var cloFmt = fmt(r.clo);
    var periodeHtml;
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
    var col5 = '<td class="col-periode">' + periodeHtml + '</td>';

    /* Délai */
    var cd = '<span class="countdown">—</span>';
    if (days !== null) {
      if      (days < 0)   cd = '<span class="countdown expired">Expiré</span>';
      else if (days === 0) cd = '<span class="countdown urgent">Auj. !</span>';
      else if (days <= 7)  cd = '<span class="countdown urgent">' + days + ' j</span>';
      else if (days <= 14) cd = '<span class="countdown warning">' + days + ' j</span>';
      else                 cd = '<span class="countdown ok">' + days + ' j</span>';
    }
    var col6 = '<td class="col-delai">' + cd + '</td>';

    /* Modalité */
    var col7 = '<td class="col-modal">'
      + (r.modalite
        ? '<span class="modal-tag">🎯 ' + r.modalite + '</span>'
        : '<span class="date-empty">—</span>')
      + '</td>';

    /* Date concours */
    var concoursHtml;
    if (!r.concours) {
      concoursHtml = '<span class="date-empty">—</span>';
    } else if (r.concours === 'En attente') {
      concoursHtml = '<span class="attente-tag">🕐 En attente</span>';
    } else {
      concoursHtml = '<span class="concours-tag">📅 ' + r.concours + '</span>';
    }
    var col8 = '<td class="col-concours">' + concoursHtml + '</td>';

    /* Avis PDF */
    var col9 = '<td class="col-avis">'
      + (r.avis
        ? '<a class="avis-btn" href="' + r.avis + '" target="_blank" rel="noopener">📥 Voir</a>'
        : '<span class="date-empty">—</span>')
      + '</td>';

    /* Lien officiel */
    var col10 = '<td class="col-lien">'
      + (r.lien
        ? '<a class="link-btn" href="' + r.lien + '" target="_blank" rel="noopener">🔗 Voir</a>'
        : '<span class="link-btn disabled">—</span>')
      + '</td>';

    var rowClass = fav ? ' class="fav-row"' : '';
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
    /* Tracking GA */
    if (typeof gtag !== 'undefined') {
      gtag('event', 'toggle_favorites', { event_category: 'Filtres' });
    }
  });

  /* Chargement JSON */
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
        '<tr><td colspan="11" class="empty">'
        + '⚠️ Impossible de charger <strong>ecoles_complet.json</strong>.<br>'
        + 'Vérifiez que le fichier est dans le même dossier.'
        + '</td></tr>';
    });

  document.getElementById('search').addEventListener('input', function() {
    render();
    /* Tracking GA recherche */
    if (typeof gtag !== 'undefined' && this.value.length > 2) {
      gtag('event', 'search', {
        event_category: 'Filtres',
        event_label: this.value
      });
    }
  });

  document.getElementById('filter-cat').addEventListener('change', render);
  document.getElementById('filter-status').addEventListener('change', render);
});
