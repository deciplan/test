/* ===== Deciplan — script.js v21 ===== */

var TODAY = new Date();
TODAY.setHours(0,0,0,0);
var allData      = [];
var favorites    = JSON.parse(localStorage.getItem('deciplan_favs') || '[]');
var showFavsOnly = false;
var sortCol      = 'delai';
var sortDir      = 1;

var BG = {
  light: { normal:'#ffffff', fav:'#fef9ec', header:'#f8fafc' },
  dark:  { normal:'#1a1d27', fav:'#2a1c00', header:'#1e2130' }
};
function getTheme(){ return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'; }

/* ── Dates ── */
function parseDate(s){ if(!s)return null; var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
function fmt(s){ if(!s)return null; return parseDate(s).toLocaleDateString('fr-MA',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function daysLeft(r){ var c=parseDate(r.clo); return c?Math.round((c-TODAY)/86400000):null; }
function getStatus(r){
  var o=parseDate(r.ouv),c=parseDate(r.clo);
  if(!o&&!c) return 'attente';
  if(c&&TODAY>c) return 'ferme';
  if(o&&TODAY<o) return 'attente';
  var d=daysLeft(r); return(d!==null&&d<=7)?'bientot':'ouvert';
}

/* ── Villes ── */
function villesAll(r){ return Array.isArray(r.villes)?r.villes.join(', '):(r.villes||r.ville||'—'); }
function villesShort(r){
  var a=Array.isArray(r.villes)?r.villes:[r.villes||r.ville||'—'];
  if(a.length<=2) return a.join(', ');
  return a[0]+', '+a[1]+' <span class="more-cities">+'+(a.length-2)+'</span>';
}

/* ── Favoris ── */
function isFav(n){ return favorites.indexOf(n)!==-1; }
function saveFavs(){ localStorage.setItem('deciplan_favs',JSON.stringify(favorites)); }
window.toggleFav = function(btn){
  var nom=btn.getAttribute('data-nom');
  if(!nom) return;
  if(isFav(nom)) favorites=favorites.filter(function(f){return f!==nom;});
  else favorites.push(nom);
  saveFavs(); updateFavCount(); updateProgress(); render();
};
function updateFavCount(){
  var el=document.getElementById('fav-count');
  var btn=document.getElementById('favToggle');
  if(el)  el.textContent=favorites.length>0?'('+favorites.length+')':'';
  if(btn) btn.classList.toggle('active',showFavsOnly);
}
function updateProgress(){
  var total=allData.length||20;
  var pct=Math.round((favorites.length/total)*100);
  var fill=document.getElementById('progressFill');
  var cnt=document.getElementById('progressCount');
  if(fill) fill.style.width=pct+'%';
  if(cnt)  cnt.textContent=favorites.length+' / '+total;
}

/* ── Dark mode ── */
function initDark(){
  var t=localStorage.getItem('deciplan_theme')||'light';
  document.documentElement.setAttribute('data-theme',t);
  var b=document.getElementById('darkToggle');
  if(b) b.textContent=t==='dark'?'☀️':'🌙';
}
function toggleDark(){
  var cur=document.documentElement.getAttribute('data-theme');
  var next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('deciplan_theme',next);
  var b=document.getElementById('darkToggle');
  if(b) b.textContent=next==='dark'?'☀️':'🌙';
  render();
}

/* ── Countdown Bac ── */
function initCountdownBac(){
  var bac=new Date(2026,5,4); /* 4 juin 2026 */
  var diff=Math.round((bac-TODAY)/86400000);
  var el=document.getElementById('countdownBac');
  var banner=document.getElementById('bacBanner');
  if(!el) return;
  if(diff>0){
    el.textContent='Le Bac dans '+diff+' jours — 04-05-06 Juin 2026 !';
    if(diff<=30&&banner) banner.classList.add('urgent');
  } else if(diff===0){
    el.textContent='Le Bac commence aujourd\'hui — Bon courage !';
    if(banner) banner.classList.add('urgent');
  } else {
    el.textContent='Le Bac est terminé — Bonne continuation !';
  }
}

/* ── Filtres dynamiques ── */
function buildCats(){
  var cats=[];
  allData.forEach(function(r){ if(cats.indexOf(r.cat)===-1) cats.push(r.cat); });
  cats.sort();
  var s=document.getElementById('filter-cat');
  s.innerHTML='<option value="">Toutes les filières</option>';
  cats.forEach(function(c){ var o=document.createElement('option'); o.value=o.textContent=c; s.appendChild(o); });
}
function buildVilles(){
  var villes=[];
  allData.forEach(function(r){
    var arr=Array.isArray(r.villes)?r.villes:[r.villes||r.ville||''];
    arr.forEach(function(v){
      var v2=v.trim().split('(')[0].trim();
      if(v2&&villes.indexOf(v2)===-1) villes.push(v2);
    });
  });
  villes.sort();
  var s=document.getElementById('filter-ville');
  s.innerHTML='<option value="">Toutes les villes</option>';
  villes.forEach(function(v){ var o=document.createElement('option'); o.value=o.textContent=v; s.appendChild(o); });
}
function buildBacs(){
  var ORDER=['SM','SE','STM','ECO','LSH','ART'];
  var seen={};
  allData.forEach(function(r){
    (r.filieres||[]).forEach(function(f){ if(f&&f.code) seen[f.code]=f.label||f.code; });
  });
  var s=document.getElementById('filter-bac');
  if(!s) return;
  s.innerHTML='<option value="">Tous les bacs</option>';
  ORDER.forEach(function(c){
    if(seen[c]){ var o=document.createElement('option'); o.value=c; o.textContent=seen[c]; s.appendChild(o); }
  });
}
function buildFilieres(r){
  if(!r.filieres||!r.filieres.length) return '';
  return '<div class="fil-tags">'+r.filieres.map(function(f){
    return '<span class="fil-tag fil-'+f.code+'" title="'+(f.label||f.code)+'">'+(f.label||f.code)+'</span>';
  }).join('')+'</div>';
}

/* ── Tri ── */
function initSortHeaders(){
  document.querySelectorAll('th.sortable').forEach(function(th){
    th.addEventListener('click',function(){
      var col=th.getAttribute('data-col');
      if(sortCol===col) sortDir*=-1; else { sortCol=col; sortDir=1; }
      document.querySelectorAll('.sort-icon').forEach(function(i){ i.textContent='↕'; });
      var ic=th.querySelector('.sort-icon'); if(ic) ic.textContent=sortDir===1?'↑':'↓';
      render();
    });
  });
}
function sortRows(rows){
  var ord={bientot:0,ouvert:1,attente:2,ferme:3};
  return rows.sort(function(a,b){
    var fa=isFav(a.nom)?0:1,fb=isFav(b.nom)?0:1;
    if(fa!==fb) return fa-fb;
    var va,vb;
    switch(sortCol){
      case 'nom':    va=a.nom.toLowerCase();vb=b.nom.toLowerCase();return sortDir*(va<vb?-1:va>vb?1:0);
      case 'cat':    va=a.cat.toLowerCase();vb=b.cat.toLowerCase();return sortDir*(va<vb?-1:va>vb?1:0);
      case 'statut': return sortDir*((ord[getStatus(a)]||0)-(ord[getStatus(b)]||0));
      case 'delai':
        va=daysLeft(a);vb=daysLeft(b);
        if(va===null&&vb===null) return 0;
        if(va===null) return sortDir; if(vb===null) return -sortDir;
        return sortDir*(va-vb);
      default: return (ord[getStatus(a)]||0)-(ord[getStatus(b)]||0);
    }
  });
}

/* ── Share & Print ── */
function initShare(){
  var btn=document.getElementById('btnShare');
  if(btn) btn.addEventListener('click',function(){
    window.open('https://wa.me/?text='+encodeURIComponent('📚 Inscriptions post-bac Maroc 2026 : ')+encodeURIComponent(window.location.href),'_blank');
  });
}
function initPrint(){
  var btn=document.getElementById('printBtn');
  if(btn) btn.addEventListener('click',function(){
    if(favorites.length===0){ alert('⭐ Ajoutez des favoris pour les imprimer !'); return; }
    window.print();
  });
}

/* ── Helpers ── */
var bC={ouvert:'b-open',bientot:'b-soon',ferme:'b-closed',attente:'b-wait'};
var bL={ouvert:'✅ Ouvert',bientot:'⚠️ Bientôt',ferme:'❌ Fermé',attente:'🕐 En attente'};
function buildCountdown(dl){
  if(dl===null) return '<span class="countdown">—</span>';
  if(dl<0)      return '<span class="countdown expired">Expiré</span>';
  if(dl===0)    return '<span class="countdown urgent">Auj. !</span>';
  if(dl<=7)     return '<span class="countdown urgent">'+dl+' j</span>';
  if(dl<=14)    return '<span class="countdown warning">'+dl+' j</span>';
  return '<span class="countdown ok">'+dl+' j</span>';
}
function buildConcours(r){
  if(!r.concours) return '<span class="date-empty">—</span>';
  if(r.concours==='En attente') return '<span class="attente-tag">🕐 En attente</span>';
  return '<span class="concours-tag">📅 '+r.concours+'</span>';
}

/* ══════════════════════════════════════
   RENDER TABLEAU (desktop)
══════════════════════════════════════ */
function renderTable(rows){
  var t=getTheme(),colors=BG[t];
  document.querySelectorAll('th.col-fav,th.col-nom').forEach(function(th){
    th.style.backgroundColor=colors.header;
  });
  var tbody=document.getElementById('tbody');
  if(!tbody) return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="11" class="empty">'+(showFavsOnly?'⭐ Aucun favori.':'😔 Aucun résultat.')+'</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(function(r){
    var st=getStatus(r),dl=daysLeft(r),fav=isFav(r.nom);
    var sn=r.nom.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    var bg=fav?colors.fav:colors.normal;
    var s1='position:sticky;left:0;z-index:1;background-color:'+bg+';border-right:1px solid #e5e7eb;width:42px;text-align:center;padding:11px 12px;vertical-align:top;';
    var s2='position:sticky;left:42px;z-index:1;background-color:'+bg+';border-right:2px solid #9a7c2e;box-shadow:4px 0 10px rgba(0,0,0,.08);min-width:210px;max-width:270px;padding:11px 12px;vertical-align:top;';
    var newBadge=r.nouveau?'<span class="badge-new">Nouveau</span>':'';
    var of=fmt(r.ouv),cf=fmt(r.clo),ph;
    if(!of&&!cf) ph='<span class="date-empty">—</span>';
    else if(!of) ph='<span class="date-label">Jusqu\'au</span><br><span class="date-clo">'+cf+'</span>';
    else         ph='<span class="date-ouv">'+of+'</span><span class="date-arrow"> → </span><span class="date-clo">'+(cf||'?')+'</span>';
    var rc=fav?' class="fav-row"':'';
    return '<tr'+rc+'>'
      +'<td style="'+s1+'"><button class="fav-btn'+(fav?' active':'')+'" data-nom="'+sn+'" onclick="window.toggleFav(this)">'+(fav?'⭐':'☆')+'</button></td>'
      +'<td style="'+s2+'"><div class="school-name">'+r.nom+' '+newBadge+'</div>'+(r.note?'<div class="school-note">'+r.note+'</div>':'')+buildFilieres(r)+'</td>'
      +'<td class="col-cat"><span class="cat-pill">'+r.cat+'</span></td>'
      +'<td class="col-ville" title="'+villesAll(r)+'">📍 '+villesShort(r)+'</td>'
      +'<td class="col-statut"><span class="badge '+bC[st]+'">'+bL[st]+'</span></td>'
      +'<td class="col-periode">'+ph+'</td>'
      +'<td class="col-delai">'+buildCountdown(dl)+'</td>'
      +'<td class="col-modal">'+(r.modalite?'<span class="modal-tag">🎯 '+r.modalite+'</span>':'<span class="date-empty">—</span>')+'</td>'
      +'<td class="col-concours">'+buildConcours(r)+'</td>'
      +'<td class="col-avis">'+(r.avis?'<a class="avis-btn" href="'+r.avis+'" target="_blank" rel="noopener">📥 Voir</a>':'<span class="date-empty">—</span>')+'</td>'
      +'<td class="col-lien">'+(r.lien?'<a class="link-btn" href="'+r.lien+'" target="_blank" rel="noopener">🔗 Voir</a>':'<span class="link-btn disabled">—</span>')+'</td>'
      +'</tr>';
  }).join('');
}

/* ══════════════════════════════════════
   RENDER CARTES (mobile)
══════════════════════════════════════ */
function renderCards(rows){
  var grid=document.getElementById('cards-mobile');
  if(!grid) return;
  if(!rows.length){
    grid.innerHTML='<div class="card-empty">'+(showFavsOnly?'⭐ Aucun favori.':'😔 Aucun résultat.')+'</div>';
    return;
  }
  grid.innerHTML=rows.map(function(r){
    var st=getStatus(r),dl=daysLeft(r),fav=isFav(r.nom);
    var sn=r.nom.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    var cloFmt=fmt(r.clo);
    var liens='';
    if(r.lien) liens+='<a class="card-btn card-btn-link" href="'+r.lien+'" target="_blank" rel="noopener">🔗 Site officiel</a>';
    if(r.avis) liens+='<a class="card-btn card-btn-avis" href="'+r.avis+'" target="_blank" rel="noopener">📥 Avis</a>';
    return '<div class="school-card'+(fav?' card-fav':'')+'">'
      +'<div class="card-header">'
        +'<span class="badge '+bC[st]+'">'+bL[st]+'</span>'
        +'<button class="fav-btn'+(fav?' active':'')+'" data-nom="'+sn+'" onclick="window.toggleFav(this)">'+(fav?'⭐':'☆')+'</button>'
      +'</div>'
      +'<div class="card-name">'+r.nom+'</div>'
      +(r.note?'<div class="card-note">'+r.note+'</div>':'')
      +buildFilieres(r)
      +'<div class="card-meta">'
        +'<span class="card-meta-item">🎓 '+r.cat+'</span>'
        +'<span class="card-meta-item">📍 '+villesAll(r)+'</span>'
      +'</div>'
      +'<div class="card-dates">'
        +'<span>'+(cloFmt?'Clôture : <strong>'+cloFmt+'</strong>':'—')+'</span>'
        +'<span>'+buildCountdown(dl)+'</span>'
      +'</div>'
      +(r.modalite?'<div class="card-modal">🎯 '+r.modalite+'</div>':'')
      +(liens?'<div class="card-links">'+liens+'</div>':'')
      +'</div>';
  }).join('');
}

/* ══════════════════════════════════════
   RENDER PRINCIPAL
══════════════════════════════════════ */
function render(){
  var search=document.getElementById('search').value.toLowerCase().trim();
  var cat=document.getElementById('filter-cat').value;
  var bac=(document.getElementById('filter-bac')||{}).value||'';
  var ville=document.getElementById('filter-ville').value;
  var status=document.getElementById('filter-status').value;

  var rows=allData.filter(function(r){
    if(showFavsOnly&&!isFav(r.nom)) return false;
    if(search){
      /* Recherche uniquement sur le NOM de l'école (+ abréviation) */
      var h=(r.nom+' '+(r.abrev||'')).toLowerCase();
      if(h.indexOf(search)===-1) return false;
    }
    if(cat&&r.cat!==cat) return false;
    if(bac){
      var codes=(r.filieres||[]).map(function(f){return f.code;});
      /* filieres vide ou null = toutes séries acceptées → visible dans tous les filtres */
      if(codes.length && codes.indexOf(bac)===-1) return false;
    }
    if(ville&&villesAll(r).toLowerCase().indexOf(ville.toLowerCase())===-1) return false;
    if(status&&getStatus(r)!==status) return false;
    return true;
  });
  rows=sortRows(rows);

  /* Compteurs */
  var open=0,soon=0,closed=0;
  allData.forEach(function(r){
    var s=getStatus(r);
    if     (s==='bientot'){ open++; soon++; }
    else if(s==='ouvert')  { open++; }
    else if(s==='ferme')   { closed++; }
  });
  document.getElementById('cnt-open').textContent   = open;
  document.getElementById('cnt-soon').textContent   = soon;
  document.getElementById('cnt-closed').textContent = closed;
  document.getElementById('cnt-total').textContent  = allData.length;

  renderTable(rows);
  renderCards(rows);
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',function(){
  initDark();
  initCountdownBac();
  initShare();
  initPrint();
  document.getElementById('darkToggle').addEventListener('click',toggleDark);
  document.getElementById('favToggle').addEventListener('click',function(){
    showFavsOnly=!showFavsOnly; updateFavCount(); render();
  });
  fetch('ecoles_complet.json')
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(d){
      allData=d; buildCats(); buildBacs(); buildVilles(); initSortHeaders();
      updateFavCount(); updateProgress(); render();
      initCalendar(d);
    })
    .catch(function(e){
      console.error(e);
      var msg='⚠️ Impossible de charger ecoles_complet.json';
      var tb=document.getElementById('tbody');
      var cg=document.getElementById('cards-mobile');
      if(tb) tb.innerHTML='<tr><td colspan="11" class="empty">'+msg+'</td></tr>';
      if(cg) cg.innerHTML='<div class="card-empty">'+msg+'</div>';
    });
  document.getElementById('search').addEventListener('input',render);
  document.getElementById('filter-cat').addEventListener('change',render);
  var fb=document.getElementById('filter-bac'); if(fb) fb.addEventListener('change',render);
  document.getElementById('filter-ville').addEventListener('change',render);
  document.getElementById('filter-status').addEventListener('change',render);
});


/* ═══════════ CALENDRIER DES CONCOURS ═══════════ */
var CAL_MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
var calEvents = {};   /* 'YYYY-MM-DD' -> [{abrev,nom,cat,fam,label,lien}, ...] */
var calYear, calMonth;

/* ── 8 familles de couleurs ── */
var CAL_FAMILLES = {
  sante:   { nom:'Santé',            cats:['Médecine & Santé','Sport'] },
  inge:    { nom:'Ingénierie & Tech', cats:['Ingénierie','Technologie','Science & Technologie','Énergies renouvelables','Architecture','Urbanisme et aménagement du territoire'] },
  commerce:{ nom:'Commerce & Éco',    cats:['Commerce & Gestion','Sciences Po','Tourisme & Hôtellerie','Transport & Logistique'] },
  agro:    { nom:'Agronomie',         cats:['Agronomie'] },
  art:     { nom:'Art & Médias',      cats:['Art & Design','Médias & Communication','Patrimoine & Archéologie'] },
  militaire:{nom:'Militaire',         cats:['Militaire'] },
  pro:     { nom:'Formation Pro',     cats:['Formation Professionnelle'] },
  autre:   { nom:'Autre',             cats:['Éducation & Enseignement','Classes Préparatoires','Études Islamiques','Social'] }
};
function famOf(cat){
  for(var k in CAL_FAMILLES){
    if(CAL_FAMILLES[k].cats.indexOf(cat) !== -1) return k;
  }
  return 'autre';
}

function initCalendar(data){
  var grid = document.getElementById('calGrid');
  if(!grid) return;
  calEvents = {};
  for(var i=0;i<data.length;i++){
    var e = data[i];
    var dates = e.concours_dates || [];
    if(typeof dates === 'string') continue;
    for(var j=0;j<dates.length;j++){
      var parts = String(dates[j]).split('|');
      var key = parts[0];
      if(!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      if(!calEvents[key]) calEvents[key] = [];
      calEvents[key].push({
        abrev: e.abrev || e.nom.split('—')[0].trim(),
        nom: e.nom,
        cat: e.cat,
        fam: famOf(e.cat),
        label: parts[1] || '',
        lien: e.lien || ''
      });
    }
  }
  var now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
  buildCalLegend();
  var prev = document.getElementById('calPrev');
  var next = document.getElementById('calNext');
  if(prev) prev.addEventListener('click', function(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); });
  if(next) next.addEventListener('click', function(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); });
  var panel = document.getElementById('calPanelClose');
  if(panel) panel.addEventListener('click', function(){ document.getElementById('calPanel').hidden = true; });
}

function buildCalLegend(){
  var box = document.getElementById('calLegend');
  if(!box) return;
  var html = '';
  for(var k in CAL_FAMILLES){
    html += '<span class="cal-leg"><i class="cal-dot fam-'+k+'"></i>'+CAL_FAMILLES[k].nom+'</span>';
  }
  box.innerHTML = html;
}

/* ── Panneau détaillé au clic sur un jour ── */
function openCalDay(key){
  var panel = document.getElementById('calPanel');
  var body  = document.getElementById('calPanelBody');
  var ttl   = document.getElementById('calPanelTitle');
  if(!panel || !body) return;
  var evs = calEvents[key] || [];
  var p = key.split('-');
  var dt = new Date(+p[0], +p[1]-1, +p[2]);
  if(ttl) ttl.textContent = dt.getDate()+' '+CAL_MOIS[dt.getMonth()]+' '+dt.getFullYear()
        +' · '+evs.length+(evs.length>1?' concours':' concours');
  var html = '';
  for(var i=0;i<evs.length;i++){
    var e = evs[i];
    html += '<div class="cal-item fam-border-'+e.fam+'">'
         +  '<div class="cal-item-top"><span class="cal-item-abrev fam-'+e.fam+'">'+e.abrev+'</span>'
         +  (e.label?'<span class="cal-item-tag">'+e.label+'</span>':'')+'</div>'
         +  '<div class="cal-item-nom">'+e.nom+'</div>'
         +  '<div class="cal-item-cat">'+e.cat+'</div>'
         +  (e.lien?'<a class="cal-item-lien" href="'+e.lien+'" target="_blank" rel="noopener">Voir le site ↗</a>':'')
         +  '</div>';
  }
  body.innerHTML = html || '<p class="cal-empty-msg">Aucun concours ce jour.</p>';
  panel.hidden = false;
  panel.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function renderCalendar(){
  var grid = document.getElementById('calGrid');
  var title = document.getElementById('calTitle');
  if(!grid) return;
  if(title) title.textContent = 'Concours — ' + CAL_MOIS[calMonth] + ' ' + calYear;

  var first = new Date(calYear, calMonth, 1);
  var startDow = (first.getDay() + 6) % 7;           /* Lundi = 0 */
  var daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  var today = new Date(); today.setHours(0,0,0,0);

  var html = '';
  for(var b=0;b<startDow;b++) html += '<div class="cal-cell cal-empty"></div>';

  for(var d=1;d<=daysInMonth;d++){
    var key = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var evs = calEvents[key] || [];
    var cellDate = new Date(calYear, calMonth, d);
    var isToday = cellDate.getTime() === today.getTime();
    var isPast = cellDate < today;

    var cls = 'cal-cell' + (isToday?' cal-today':'') + (evs.length?' cal-has':'') + (isPast?' cal-past':'');
    if(evs.length) cls += ' cal-click';
    var cell = '<div class="'+cls+'"' + (evs.length?' data-key="'+key+'" role="button" tabindex="0"':'') + '>';
    cell += '<div class="cal-day">'+d+'</div>';
    var max = 3;
    for(var k=0;k<Math.min(evs.length,max);k++){
      var ev = evs[k];
      var t = ev.abrev + (ev.label?' ('+ev.label+')':'');
      cell += '<div class="cal-badge fam-'+ev.fam+'" title="'+ev.nom+(ev.label?' — '+ev.label:'')+'">'+t+'</div>';
    }
    if(evs.length>max) cell += '<div class="cal-more">+'+(evs.length-max)+' autre'+(evs.length-max>1?'s':'')+'</div>';
    cell += '</div>';
    html += cell;
  }
  grid.innerHTML = html;

  var cells = grid.querySelectorAll('.cal-click');
  for(var c=0;c<cells.length;c++){
    cells[c].addEventListener('click', function(){ openCalDay(this.getAttribute('data-key')); });
    cells[c].addEventListener('keydown', function(ev){
      if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); openCalDay(this.getAttribute('data-key')); }
    });
  }
}

/* ═══════════ ASSISTANT FLOTTANT ═══════════ */
document.addEventListener('DOMContentLoaded', function(){
  var btn = document.getElementById('fabBtn');
  var card = document.getElementById('fabCard');
  var close = document.getElementById('fabClose');
  if(!btn || !card) return;
  btn.addEventListener('click', function(){
    var open = !card.hidden;
    card.hidden = open;
    btn.classList.toggle('fab-open', !open);
  });
  if(close) close.addEventListener('click', function(){
    card.hidden = true;
    btn.classList.remove('fab-open');
  });
});
