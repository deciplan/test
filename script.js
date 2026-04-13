/* ===== Deciplan — script.js v16 ===== */

var TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
var allData      = [];
var favorites    = JSON.parse(localStorage.getItem('deciplan_favs') || '[]');
var showFavsOnly = false;
var sortCol      = 'delai';
var sortDir      = 1;

var BG = {
  light: { normal:'#ffffff', hover:'#f5f8ff', fav:'#fef9ec', favHov:'#fef3c7', header:'#f8fafc' },
  dark:  { normal:'#1a1d27', hover:'#1e2235', fav:'#2a1c00', favHov:'#3a2600', header:'#1e2130' }
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
  var bac=new Date(2026,5,15);
  var diff=Math.round((bac-TODAY)/86400000);
  var el=document.getElementById('countdownBac');
  var banner=document.getElementById('bacBanner');
  if(!el) return;
  if(diff>0){
    el.textContent='Bac dans ' + diff + ' jours — Consultez vos inscriptions maintenant !';
    if(diff<=30){
      if(banner) banner.classList.add('urgent');
    }
  } else if(diff===0){
    el.textContent='🔴 Le Bac commence aujourd'hui — Bon courage !';
    if(banner) banner.classList.add('urgent');
  } else {
    el.textContent='Le Bac est terminé — Consultez les résultats !';
  }
}

/* ── Filtres ── */
function buildCats(){
  var cats=[];
  allData.forEach(function(r){if(cats.indexOf(r.cat)===-1)cats.push(r.cat);});
  cats.sort();
  var s=document.getElementById('filter-cat');
  s.innerHTML='<option value="">Toutes les filières</option>';
  cats.forEach(function(c){var o=document.createElement('option');o.value=o.textContent=c;s.appendChild(o);});
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
  villes.forEach(function(v){var o=document.createElement('option');o.value=o.textContent=v;s.appendChild(o);});
}

/* ── Tri ── */
function initSortHeaders(){
  document.querySelectorAll('th.sortable').forEach(function(th){
    th.style.cursor='pointer';
    th.addEventListener('click',function(){
      var col=th.getAttribute('data-col');
      if(sortCol===col) sortDir*=-1;
      else { sortCol=col; sortDir=1; }
      document.querySelectorAll('.sort-icon').forEach(function(i){ i.textContent='↕'; });
      var icon=th.querySelector('.sort-icon');
      if(icon) icon.textContent=sortDir===1?'↑':'↓';
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
      case 'nom': va=a.nom.toLowerCase();vb=b.nom.toLowerCase();return sortDir*(va<vb?-1:va>vb?1:0);
      case 'cat': va=a.cat.toLowerCase();vb=b.cat.toLowerCase();return sortDir*(va<vb?-1:va>vb?1:0);
      case 'statut': return sortDir*(ord[getStatus(a)]-ord[getStatus(b)]);
      case 'delai':
        va=daysLeft(a);vb=daysLeft(b);
        if(va===null&&vb===null) return 0;
        if(va===null) return sortDir;
        if(vb===null) return -sortDir;
        return sortDir*(va-vb);
      default: return ord[getStatus(a)]-ord[getStatus(b)];
    }
  });
}

/* ── Share & Print ── */
function initShare(){
  var btn=document.getElementById('btnShare');
  if(!btn) return;
  btn.addEventListener('click',function(){
    var url=encodeURIComponent(window.location.href);
    var msg=encodeURIComponent('📚 Suivi des inscriptions post-bac Maroc 2026 : ');
    window.open('https://wa.me/?text='+msg+url,'_blank');
  });
}
function initPrint(){
  var btn=document.getElementById('printBtn');
  if(!btn) return;
  btn.addEventListener('click',function(){
    if(favorites.length===0){ alert('⭐ Ajoutez des favoris pour les imprimer !'); return; }
    window.print();
  });
}

/* ── Badges ── */
var bC={ouvert:'b-open',bientot:'b-soon',ferme:'b-closed',attente:'b-wait'};
var bL={ouvert:'✅ Ouvert',bientot:'⚠️ Bientôt',ferme:'❌ Fermé',attente:'🕐 En attente'};

function buildCountdown(dl){
  if(dl===null) return '<span class="countdown">—</span>';
  if(dl<0)       return '<span class="countdown expired">Expiré</span>';
  if(dl===0)     return '<span class="countdown urgent">Auj. !</span>';
  if(dl<=7)      return '<span class="countdown urgent">'+dl+' j</span>';
  if(dl<=14)     return '<span class="countdown warning">'+dl+' j</span>';
  return '<span class="countdown ok">'+dl+' j</span>';
}
function buildConcours(r){
  if(!r.concours) return '<span class="date-empty">—</span>';
  if(r.concours==='En attente') return '<span class="attente-tag">🕐 En attente</span>';
  return '<span class="concours-tag">📅 '+r.concours+'</span>';
}

/* ══════════════════════════════════════
   RENDER — tableau desktop
══════════════════════════════════════ */
function renderTable(rows){
  var t=getTheme();
  var colors=BG[t];
  document.querySelectorAll('th.col-fav,th.col-nom').forEach(function(th){
    th.style.backgroundColor=colors.header;
  });
  var tbody=document.getElementById('tbody');
  if(!tbody) return;
  if(!rows.length){
    var msg=showFavsOnly?'⭐ Aucun favori.':'😔 Aucun résultat.';
    tbody.innerHTML='<tr><td colspan="11" class="empty">'+msg+'</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(function(r){
    var st=getStatus(r),dl=daysLeft(r),fav=isFav(r.nom);
    var sn=r.nom.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    var bg=fav?colors.fav:colors.normal;
    var s1='position:sticky;left:0;z-index:1;background-color:'+bg+';border-right:1px solid #e5e7eb;width:42px;text-align:center;padding:11px 12px;vertical-align:top;';
    var s2='position:sticky;left:42px;z-index:1;background-color:'+bg+';border-right:2px solid #9a7c2e;box-shadow:4px 0 10px rgba(0,0,0,.08);min-width:210px;max-width:270px;padding:11px 12px;vertical-align:top;';
    var isNew=r.nouveau===true;
    var newBadge=isNew?'<span class="badge-new">Nouveau</span>':'';
    var c0='<td style="'+s1+'"><button class="fav-btn'+(fav?' active':'')+'" data-nom="'+sn+'" onclick="window.toggleFav(this)" title="'+(fav?'Retirer':'Ajouter')+'">'+(fav?'⭐':'☆')+'</button></td>';
    var nd=r.note?'<div class="school-note">'+r.note+'</div>':'';
    var c1='<td style="'+s2+'"><div class="school-name">'+r.nom+' '+newBadge+'</div>'+nd+'</td>';
    var c2='<td class="col-cat"><span class="cat-pill">'+r.cat+'</span></td>';
    var c3='<td class="col-ville" title="'+villesAll(r)+'">📍 '+villesShort(r)+'</td>';
    var c4='<td class="col-statut"><span class="badge '+bC[st]+'">'+bL[st]+'</span></td>';
    var of=fmt(r.ouv),cf=fmt(r.clo),ph;
    if(!of&&!cf) ph='<span class="date-empty">—</span>';
    else if(!of) ph='<span class="date-label">Jusqu\'au</span><br><span class="date-clo">'+cf+'</span>';
    else ph='<span class="date-ouv">'+of+'</span><span class="date-arrow"> → </span><span class="date-clo">'+(cf||'?')+'</span>';
    var c5='<td class="col-periode">'+ph+'</td>';
    var c6='<td class="col-delai">'+buildCountdown(dl)+'</td>';
    var c7='<td class="col-modal">'+(r.modalite?'<span class="modal-tag">🎯 '+r.modalite+'</span>':'<span class="date-empty">—</span>')+'</td>';
    var c8='<td class="col-concours">'+buildConcours(r)+'</td>';
    var c9='<td class="col-avis">'+(r.avis?'<a class="avis-btn" href="'+r.avis+'" target="_blank" rel="noopener">📥 Voir</a>':'<span class="date-empty">—</span>')+'</td>';
    var c10='<td class="col-lien">'+(r.lien?'<a class="link-btn" href="'+r.lien+'" target="_blank" rel="noopener">🔗 Voir</a>':'<span class="link-btn disabled">—</span>')+'</td>';
    var rc=fav?' class="fav-row"':'';
    return '<tr'+rc+'>'+c0+c1+c2+c3+c4+c5+c6+c7+c8+c9+c10+'</tr>';
  }).join('');
}

/* ══════════════════════════════════════
   RENDER — cartes mobile
══════════════════════════════════════ */
function renderCards(rows){
  var grid=document.getElementById('cardsGrid');
  if(!grid) return;
  if(!rows.length){
    var msg=showFavsOnly?'⭐ Aucun favori. Cliquez sur ☆ pour en ajouter.':'😔 Aucun résultat pour ces filtres.';
    grid.innerHTML='<div class="card-empty">'+msg+'</div>';
    return;
  }
  grid.innerHTML=rows.map(function(r){
    var st=getStatus(r),dl=daysLeft(r),fav=isFav(r.nom);
    var sn=r.nom.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    var isNew=r.nouveau===true;
    var newBadge=isNew?'<span class="badge-new">Nouveau</span>':'';

    /* Période courte */
    var cloFmt=fmt(r.clo);
    var periodeShort=cloFmt?'Clôture : <strong>'+cloFmt+'</strong>':'—';

    /* Liens */
    var liens='';
    if(r.lien) liens+='<a class="card-btn card-btn-link" href="'+r.lien+'" target="_blank" rel="noopener">🔗 Site officiel</a>';
    if(r.avis) liens+='<a class="card-btn card-btn-avis" href="'+r.avis+'" target="_blank" rel="noopener">📥 Avis</a>';

    return '<div class="school-card'+(fav?' card-fav':'')+'">'
      +'<div class="card-header">'
        +'<div class="card-header-left">'
          +'<span class="badge '+bC[st]+'">'+bL[st]+'</span>'
          +newBadge
        +'</div>'
        +'<button class="fav-btn'+(fav?' active':'')+'" data-nom="'+sn+'" onclick="window.toggleFav(this)" title="'+(fav?'Retirer':'Ajouter')+'">'+(fav?'⭐':'☆')+'</button>'
      +'</div>'
      +'<div class="card-name">'+r.nom+'</div>'
      +(r.note?'<div class="card-note">'+r.note+'</div>':'')
      +'<div class="card-meta">'
        +'<span class="card-meta-item">🎓 '+r.cat+'</span>'
        +'<span class="card-meta-item">📍 '+villesAll(r)+'</span>'
      +'</div>'
      +'<div class="card-dates">'
        +'<span>'+periodeShort+'</span>'
        +'<span>'+buildCountdown(dl)+'</span>'
      +'</div>'
      +(r.modalite?'<div class="card-modal">🎯 '+r.modalite+'</div>':'')
      +(r.concours&&r.concours!=='—'?'<div class="card-concours">'+buildConcours(r)+'</div>':'')
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
  var ville=document.getElementById('filter-ville').value;
  var status=document.getElementById('filter-status').value;

  var rows=allData.filter(function(r){
    if(showFavsOnly&&!isFav(r.nom)) return false;
    if(search){
      var h=[r.nom,r.cat,villesAll(r),r.note||'',r.modalite||'',r.concours||''].join(' ').toLowerCase();
      if(h.indexOf(search)===-1) return false;
    }
    if(cat&&r.cat!==cat) return false;
    if(ville&&villesAll(r).toLowerCase().indexOf(ville.toLowerCase())===-1) return false;
    if(status&&getStatus(r)!==status) return false;
    return true;
  });
  rows=sortRows(rows);

  /* Compteurs */
  var open=0,soon=0,urgent=0;
  allData.forEach(function(r){
    var s=getStatus(r);
    var dl=daysLeft(r);
    if(s==='bientot'){open++;soon++;}
    else if(s==='ouvert') open++;
    if(dl!==null&&dl>=0&&dl<=7) urgent++;
  });
  document.getElementById('cnt-open').textContent=open;
  document.getElementById('cnt-soon').textContent=soon;
  document.getElementById('cnt-urgent').textContent=urgent;
  document.getElementById('cnt-total').textContent=allData.length;

  renderTable(rows);
  renderCards(rows);
}

/* ── Init ── */
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
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(d){
      allData=d;
      buildCats(); buildVilles(); initSortHeaders();
      updateFavCount(); updateProgress(); render();
    })
    .catch(function(e){
      console.error(e);
      var empty='<tr><td colspan="11" class="empty">⚠️ Impossible de charger ecoles_complet.json</td></tr>';
      var tb=document.getElementById('tbody');
      var cg=document.getElementById('cardsGrid');
      if(tb) tb.innerHTML=empty;
      if(cg) cg.innerHTML='<div class="card-empty">⚠️ Impossible de charger ecoles_complet.json</div>';
    });
  document.getElementById('search').addEventListener('input',render);
  document.getElementById('filter-cat').addEventListener('change',render);
  document.getElementById('filter-ville').addEventListener('change',render);
  document.getElementById('filter-status').addEventListener('change',render);
});
