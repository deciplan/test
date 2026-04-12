/* ===== Deciplan — script.js v15 ===== */

var TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
var allData      = [];
var favorites    = JSON.parse(localStorage.getItem('deciplan_favs') || '[]');
var showFavsOnly = false;
var sortCol      = 'delai';
var sortDir      = 1; /* 1=asc, -1=desc */

/* Couleurs solides par thème */
var BG = {
  light: { normal:'#ffffff', hover:'#f5f8ff', fav:'#fef9ec', favHov:'#fef3c7', header:'#f8fafc' },
  dark:  { normal:'#1a1d27', hover:'#1e2235', fav:'#2a1c00', favHov:'#3a2600', header:'#1e2130' }
};
function getTheme(){ return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'; }

/* ══════════════════════════════════════
   DATES
══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   COUNTDOWN BAC (Bac marocain ~mi-juin)
══════════════════════════════════════ */
function initCountdownBac(){
  var bac = new Date(2026, 5, 15); /* 15 juin 2026 */
  var diff = Math.round((bac - TODAY) / 86400000);
  var el = document.getElementById('countdownBac');
  if(!el) return;
  if(diff > 0){
    el.textContent = '🎓 Bac dans ' + diff + ' j';
    if(diff <= 30) el.classList.add('urgent');
  } else {
    el.textContent = '🎓 Bac en cours';
  }
}

/* ══════════════════════════════════════
   VILLES
══════════════════════════════════════ */
function villesAll(r){ return Array.isArray(r.villes)?r.villes.join(', '):(r.villes||r.ville||'—'); }
function villesShort(r){
  var a=Array.isArray(r.villes)?r.villes:[r.villes||r.ville||'—'];
  if(a.length<=2) return a.join(', ');
  return a[0]+', '+a[1]+' <span class="more-cities">+'+(a.length-2)+'</span>';
}

/* ══════════════════════════════════════
   FAVORIS
══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   BARRE DE PROGRESSION
══════════════════════════════════════ */
function updateProgress(){
  var total=allData.length||20;
  var count=favorites.length;
  var pct=Math.round((count/total)*100);
  var fill=document.getElementById('progressFill');
  var cnt=document.getElementById('progressCount');
  if(fill) fill.style.width=pct+'%';
  if(cnt)  cnt.textContent=count+' / '+total;
}

/* ══════════════════════════════════════
   DARK MODE
══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   TRI DES COLONNES
══════════════════════════════════════ */
function initSortHeaders(){
  document.querySelectorAll('th.sortable').forEach(function(th){
    th.style.cursor='pointer';
    th.addEventListener('click',function(){
      var col=th.getAttribute('data-col');
      if(sortCol===col) sortDir*=-1;
      else { sortCol=col; sortDir=1; }
      document.querySelectorAll('th.sortable .sort-icon').forEach(function(i){ i.textContent='↕'; });
      th.querySelector('.sort-icon').textContent=sortDir===1?'↑':'↓';
      render();
    });
  });
}

function sortRows(rows){
  var ord={bientot:0,ouvert:1,attente:2,ferme:3};
  return rows.sort(function(a,b){
    var fa=isFav(a.nom)?0:1, fb=isFav(b.nom)?0:1;
    if(fa!==fb) return fa-fb;
    var va,vb;
    switch(sortCol){
      case 'nom':
        va=a.nom.toLowerCase(); vb=b.nom.toLowerCase();
        return sortDir*(va<vb?-1:va>vb?1:0);
      case 'cat':
        va=a.cat.toLowerCase(); vb=b.cat.toLowerCase();
        return sortDir*(va<vb?-1:va>vb?1:0);
      case 'statut':
        va=ord[getStatus(a)]||99; vb=ord[getStatus(b)]||99;
        return sortDir*(va-vb);
      case 'delai':
        va=daysLeft(a); vb=daysLeft(b);
        if(va===null&&vb===null) return 0;
        if(va===null) return sortDir;
        if(vb===null) return -sortDir;
        return sortDir*(va-vb);
      default:
        return ord[getStatus(a)]-ord[getStatus(b)];
    }
  });
}

/* ══════════════════════════════════════
   FILTRES DYNAMIQUES
══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   PARTAGE WHATSAPP
══════════════════════════════════════ */
function initShare(){
  var btn=document.getElementById('btnShare');
  if(!btn) return;
  btn.addEventListener('click',function(){
    var url=encodeURIComponent(window.location.href);
    var msg=encodeURIComponent('📚 Découvrez ce site pour suivre toutes les inscriptions post-bac au Maroc 2026 : ');
    window.open('https://wa.me/?text='+msg+url,'_blank');
  });
}

/* ══════════════════════════════════════
   IMPRESSION DES FAVORIS
══════════════════════════════════════ */
function initPrint(){
  var btn=document.getElementById('printBtn');
  if(!btn) return;
  btn.addEventListener('click',function(){
    if(favorites.length===0){
      alert('⭐ Ajoutez d\'abord des favoris pour les imprimer !');
      return;
    }
    window.print();
  });
}

/* ══════════════════════════════════════
   RENDER
══════════════════════════════════════ */
function render(){
  var search=document.getElementById('search').value.toLowerCase().trim();
  var cat=document.getElementById('filter-cat').value;
  var ville=document.getElementById('filter-ville').value;
  var status=document.getElementById('filter-status').value;
  var t=getTheme();
  var colors=BG[t];

  var rows=allData.filter(function(r){
    if(showFavsOnly&&!isFav(r.nom)) return false;
    if(search){
      var h=[r.nom,r.cat,villesAll(r),r.note||'',r.modalite||'',r.concours||''].join(' ').toLowerCase();
      if(h.indexOf(search)===-1) return false;
    }
    if(cat&&r.cat!==cat) return false;
    if(ville){
      var vstr=villesAll(r).toLowerCase();
      if(vstr.indexOf(ville.toLowerCase())===-1) return false;
    }
    if(status&&getStatus(r)!==status) return false;
    return true;
  });

  rows=sortRows(rows);

  /* Compteurs */
  var open=0,soon=0,urgent=0,closed=0;
  allData.forEach(function(r){
    var s=getStatus(r);
    var dl=daysLeft(r);
    if(s==='bientot'){open++;soon++;}
    else if(s==='ouvert') open++;
    else if(s==='ferme')  closed++;
    if(dl!==null&&dl>=0&&dl<=7) urgent++;
  });
  document.getElementById('cnt-open').textContent=open;
  document.getElementById('cnt-soon').textContent=soon;
  document.getElementById('cnt-urgent').textContent=urgent;
  document.getElementById('cnt-total').textContent=allData.length;

  /* th sticky couleur thème */
  document.querySelectorAll('th.col-fav,th.col-nom').forEach(function(th){
    th.style.backgroundColor=colors.header;
  });

  var tbody=document.getElementById('tbody');
  if(!rows.length){
    var msg=showFavsOnly?'⭐ Aucun favori. Cliquez sur ☆ pour en ajouter.':'😔 Aucun résultat.';
    tbody.innerHTML='<tr><td colspan="11" class="empty">'+msg+'</td></tr>';
    return;
  }

  var bC={ouvert:'b-open',bientot:'b-soon',ferme:'b-closed',attente:'b-wait'};
  var bL={ouvert:'✅ Ouvert',bientot:'⚠️ Bientôt',ferme:'❌ Fermé',attente:'🕐 En attente'};

  /* Date il y a 7 jours pour badge Nouveau */
  var newThresh=new Date(TODAY); newThresh.setDate(newThresh.getDate()-7);

  tbody.innerHTML=rows.map(function(r){
    var st=getStatus(r),dl=daysLeft(r),fav=isFav(r.nom);
    var sn=r.nom.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    var bg=fav?colors.fav:colors.normal;

    /* Badge "Nouveau" si r.nouveau=true ou date d'ajout récente */
    var isNew=r.nouveau===true;
    var newBadge=isNew?'<span class="badge-new">Nouveau</span>':'';

    var s1='position:sticky;left:0;z-index:1;background-color:'+bg+';border-right:1px solid #e5e7eb;width:42px;text-align:center;padding:11px 12px;vertical-align:top;';
    var s2='position:sticky;left:42px;z-index:1;background-color:'+bg+';border-right:2px solid #9a7c2e;box-shadow:4px 0 10px rgba(0,0,0,.08);min-width:210px;max-width:270px;padding:11px 12px;vertical-align:top;';

    var c0='<td style="'+s1+'"><button class="fav-btn'+(fav?' active':'')+'" data-nom="'+sn+'" onclick="window.toggleFav(this)" title="'+(fav?'Retirer des favoris':'Ajouter aux favoris')+'">'+(fav?'⭐':'☆')+'</button></td>';
    var nd=r.note?'<div class="school-note">'+r.note+'</div>':'';
    var c1='<td style="'+s2+'"><div class="school-name">'+r.nom+' '+newBadge+'</div>'+nd+'</td>';
    var c2='<td class="col-cat"><span class="cat-pill">'+r.cat+'</span></td>';
    var c3='<td class="col-ville" title="'+villesAll(r)+'">📍 '+villesShort(r)+'</td>';
    var c4='<td class="col-statut"><span class="badge '+bC[st]+'">'+bL[st]+'</span></td>';

    var of=fmt(r.ouv),cf=fmt(r.clo),ph;
    if(!of&&!cf) ph='<span class="date-empty">—</span>';
    else if(!of) ph='<span class="date-label">Jusqu\'au</span><br><span class="date-clo">'+cf+'</span>';
    else         ph='<span class="date-ouv">'+of+'</span><span class="date-arrow"> → </span><span class="date-clo">'+(cf||'?')+'</span>';
    var c5='<td class="col-periode">'+ph+'</td>';

    var cd='<span class="countdown">—</span>';
    if(dl!==null){
      if(dl<0)       cd='<span class="countdown expired">Expiré</span>';
      else if(dl===0)cd='<span class="countdown urgent">Auj. !</span>';
      else if(dl<=7) cd='<span class="countdown urgent">'+dl+' j</span>';
      else if(dl<=14)cd='<span class="countdown warning">'+dl+' j</span>';
      else           cd='<span class="countdown ok">'+dl+' j</span>';
    }
    var c6='<td class="col-delai">'+cd+'</td>';
    var c7='<td class="col-modal">'+(r.modalite?'<span class="modal-tag">🎯 '+r.modalite+'</span>':'<span class="date-empty">—</span>')+'</td>';

    var ch;
    if(!r.concours)                    ch='<span class="date-empty">—</span>';
    else if(r.concours==='En attente') ch='<span class="attente-tag">🕐 En attente</span>';
    else                               ch='<span class="concours-tag">📅 '+r.concours+'</span>';
    var c8='<td class="col-concours">'+ch+'</td>';
    var c9='<td class="col-avis">'+(r.avis?'<a class="avis-btn" href="'+r.avis+'" target="_blank" rel="noopener">📥 Voir</a>':'<span class="date-empty">—</span>')+'</td>';
    var c10='<td class="col-lien">'+(r.lien?'<a class="link-btn" href="'+r.lien+'" target="_blank" rel="noopener">🔗 Voir</a>':'<span class="link-btn disabled">—</span>')+'</td>';

    var rc=fav?' class="fav-row"':'';
    return '<tr'+rc+'>'+c0+c1+c2+c3+c4+c5+c6+c7+c8+c9+c10+'</tr>';
  }).join('');
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
    if(typeof gtag!=='undefined') gtag('event','toggle_favorites',{event_category:'Filtres'});
  });

  fetch('ecoles_complet.json')
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(d){
      allData=d;
      buildCats();
      buildVilles();
      initSortHeaders();
      updateFavCount();
      updateProgress();
      render();
    })
    .catch(function(e){
      console.error(e);
      document.getElementById('tbody').innerHTML='<tr><td colspan="11" class="empty">⚠️ Impossible de charger <strong>ecoles_complet.json</strong>.</td></tr>';
    });

  document.getElementById('search').addEventListener('input',function(){
    render();
    if(typeof gtag!=='undefined'&&this.value.length>2) gtag('event','search',{event_category:'Filtres',event_label:this.value});
  });
  document.getElementById('filter-cat').addEventListener('change',render);
  document.getElementById('filter-ville').addEventListener('change',render);
  document.getElementById('filter-status').addEventListener('change',render);
});
