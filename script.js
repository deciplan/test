/* ═══════════════════════════════════════════════════════════
   Deciplan — script.js v4 (chiffrement par CIN)
   ═══════════════════════════════════════════════════════════ */

/* ── Utilitaires base64 ↔ ArrayBuffer ── */
function b64ToBuf(b64){
  var bin=atob(b64), u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  return u.buffer;
}

/* ── Dérivation de clé PBKDF2 ── */
async function deriveKey(cin, salt, iter){
  var enc=new TextEncoder();
  var keyMat=await crypto.subtle.importKey(
    "raw", enc.encode(cin.trim().toUpperCase()),
    {name:"PBKDF2"}, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {name:"PBKDF2", salt:salt, iterations:iter, hash:"SHA-256"},
    keyMat,
    {name:"AES-GCM", length:256},
    false, ["decrypt"]
  );
}

/* ── Déchiffrement AES-GCM ── */
async function decryptPayload(payload, cin){
  var salt=b64ToBuf(payload.salt);
  var iv  =b64ToBuf(payload.iv);
  var data=b64ToBuf(payload.data);
  var key =await deriveKey(cin, salt, payload.iter||200000);
  var plainBuf=await crypto.subtle.decrypt({name:"AES-GCM", iv:iv}, key, data);
  var json=new TextDecoder().decode(plainBuf);
  return JSON.parse(json);
}

/* ═══════════════════════════════════════════════════════════
   ÉCRAN DE VERROUILLAGE
   ═══════════════════════════════════════════════════════════ */

var ENCRYPTED_PAYLOAD=null;

async function loadPayload(){
  if(ENCRYPTED_PAYLOAD) return ENCRYPTED_PAYLOAD;
  var r=await fetch('etudiants.json',{cache:'no-store'});
  if(!r.ok) throw new Error('Fichier introuvable');
  ENCRYPTED_PAYLOAD=await r.json();
  return ENCRYPTED_PAYLOAD;
}

function setLockMsg(text, cls){
  var m=document.getElementById('lockMsg');
  if(!m) return;
  m.className='lock-msg '+(cls||'');
  m.textContent=text||'';
}

async function handleUnlock(e){
  if(e) e.preventDefault();
  var cin=document.getElementById('cinInput').value.trim();
  if(!cin){ setLockMsg('Veuillez saisir votre CIN.','error'); return; }

  var btn=document.getElementById('lockBtn');
  btn.disabled=true;
  setLockMsg('🔄 Vérification en cours…','loading');

  try{
    var payload=await loadPayload();
    var data=await decryptPayload(payload, cin);

    /* ✓ Succès : on cache l'écran de verrouillage et on affiche tout */
    document.getElementById('lockScreen').style.display='none';
    document.getElementById('mainContent').hidden=false;
    bootApp(data);
  }catch(err){
    console.warn('Échec déchiffrement :', err);
    setLockMsg('❌ CIN incorrecte. Réessayez ou contactez M. Abounaim.','error');
    btn.disabled=false;
    var input=document.getElementById('cinInput');
    input.value=''; input.focus();
  }
}

/* ═══════════════════════════════════════════════════════════
   FONCTIONS DE RENDU
   ═══════════════════════════════════════════════════════════ */

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
}
function relock(){
  /* Recharge la page pour repasser par l'écran de verrouillage */
  ENCRYPTED_PAYLOAD=null;
  location.reload();
}

function initBac(){
  var today=new Date(); today.setHours(0,0,0,0);
  var bac=new Date(2026,5,4);
  var diff=Math.round((bac-today)/86400000);
  var el=document.getElementById('countdownBac');
  var banner=document.getElementById('bacBanner');
  if(!el) return;
  if(diff>0){
    el.textContent='Bac dans '+diff+' jours — 04 · 05 · 06 Juin 2026';
    if(diff<=30&&banner) banner.classList.add('urgent');
  } else if(diff===0){
    el.textContent='Le Bac commence aujourd\'hui — Bon courage !';
    if(banner) banner.classList.add('urgent');
  } else {
    el.textContent='Bac terminé — Bonne continuation !';
  }
}

function fmtNote(n){
  if(n===null||n===undefined||n==='') return '<span class="note-na">—</span>';
  var v=parseFloat(n); if(isNaN(v)) return '<span class="note-na">—</span>';
  var cls=v>=14?'note-good':v>=12?'note-avg':'note-low';
  return '<span class="'+cls+'">'+v.toFixed(2)+'</span>';
}
function fmtDate(s){
  if(!s||s.indexOf('—')>=0||s.indexOf('À')>=0||s.indexOf('confirm')>=0) return s||'—';
  if(typeof s==='string' && s.match(/^\d{4}-\d{2}-\d{2}$/)){ var p=s.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
  return s;
}
function isEmpty(v){
  if(v===null||v===undefined) return true;
  var s=String(v).trim();
  if(s==='') return true;
  if(s==='-'||s.charCodeAt(0)===8212) return true;
  var low=s.toLowerCase();
  return low.indexOf('complet')>=0||low.indexOf('confirm')>=0||low.indexOf('remplir')>=0;
}
function esc(s){
  if(s===null||s===undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

var ST={
  inscrit   :{label:'📝 Inscrit',          cls:'s-inscrit'},
  preselect :{label:'📋 Présélectionné',    cls:'s-preselect'},
  convoque  :{label:'📅 Convoqué',          cls:'s-convoque'},
  principale:{label:'🏆 Liste principale',  cls:'s-principal'},
  attente_1 :{label:'🟡 Att. 1',            cls:'s-att1'},
  attente_2 :{label:'🟠 Att. 2',            cls:'s-att2'},
  attente_3 :{label:'🔶 Att. 3',            cls:'s-att3'},
  confirme  :{label:'✅ Confirmé',          cls:'s-confirme'},
  refuse    :{label:'❌ Non retenu',         cls:'s-refuse'},
  en_cours  :{label:'⏳ En traitement',      cls:'s-cours'}
};
function listeBadge(v){
  if(v===null||v===undefined) return '<span class="cell-na">—</span>';
  if(v===true)  return '<span class="liste-oui">✅ Oui</span>';
  if(v===false) return '<span class="liste-non">❌ Non</span>';
  return '<span class="cell-na">—</span>';
}

/* ── PHOTO ── */
function setPhoto(e){
  var ph=document.getElementById('profile-photo');
  if(!ph) return;
  var src=(e.photo_b64||e.photo||e.photo_url||'').toString().trim();
  function showInitials(){
    var ini=((e.prenom||'')[0]||'')+((e.nom||'')[0]||'');
    ini=ini.toUpperCase()||'?';
    var div=document.createElement('div');
    div.className='profile-photo-initials'; div.id='profile-photo'; div.textContent=ini;
    if(ph.parentNode) ph.parentNode.replaceChild(div,ph);
  }
  if(!src){ showInitials(); return; }
  if(/\.pdf$/i.test(src)){ showInitials(); return; }
  var isPath=/^https?:\/\//i.test(src)||src.indexOf('/')>=0||/\.(jpe?g|png|webp|gif|svg)$/i.test(src);
  ph.onerror=function(){ showInitials(); };
  if(isPath){
    ph.src=src;
  } else {
    var mime='image/jpeg';
    if(src.indexOf('iVBOR')===0)       mime='image/png';
    else if(src.indexOf('R0lGOD')===0) mime='image/gif';
    else if(src.indexOf('UklGR')===0)  mime='image/webp';
    ph.src='data:'+mime+';base64,'+src;
  }
}

function renderProfil(e){
  setPhoto(e);
  var nomEl=document.getElementById('profile-nom');
  if(nomEl){
    var n=''; if(!isEmpty(e.prenom)) n+=e.prenom;
    if(!isEmpty(e.nom)){ if(n) n+=' '; n+=e.nom; }
    nomEl.textContent=n||'Étudiant(e)';
  }
  var filEl=document.getElementById('profile-filiere');
  if(filEl){
    var parts=[];
    if(!isEmpty(e.serie_bac)) parts.push(e.serie_bac);
    parts.push('Bac '+(e.annee_bac||2026));
    if(!isEmpty(e.academie))  parts.push(e.academie);
    filEl.textContent=parts.join(' · ');
  }
  var tagsEl=document.getElementById('profile-tags');
  if(tagsEl){
    var tags=[
      {k:'CIN',      v:e.cin},
      {k:'CNE',      v:e.cne},
      {k:'Né(e) le', v:e.date_naissance},
      {k:'Ville',    v:e.ville},
      {k:'Email',    v:e.email||e.Email},
      {k:'Tél',      v:e.telephone}
    ];
    tagsEl.innerHTML=tags.filter(function(t){return t.v && !isEmpty(t.v);}).map(function(t){
      var val=t.k==='Email'
        ?'<a href="mailto:'+esc(t.v)+'" style="color:var(--acc)">'+esc(t.v)+'</a>'
        :esc(t.v);
      return '<span class="id-tag"><strong>'+t.k+' :</strong> '+val+'</span>';
    }).join('');
  }
  var cc=document.getElementById('conseil-text');
  var rem=e.remarque||e.remarque_conseiller;
  if(cc&&rem) cc.textContent=rem;
}

function renderNotes(n){
  if(!n) return;
  ['an1_s1','an1_s2','moy_an1','an2_s1','an2_s2','moy_an2',
   'moy_reg','moy_nationale','moy_gen_bac','moy_25reg_75nat'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.innerHTML=fmtNote(n[id]);
  });
}

function renderStats(cands){
  var cnt={inscrit:0,preselect:0,convoque:0,principale:0,attente_1:0,attente_2:0,attente_3:0,confirme:0,refuse:0,en_cours:0};
  cands.forEach(function(c){ if(cnt[c.statut]!==undefined) cnt[c.statut]++; });
  var items=[
    {l:'Total',     v:cands.length,                              cls:'cs-total'},
    {l:'Inscrits',  v:cnt.inscrit+cnt.preselect+cnt.convoque,    cls:'cs-inscrit'},
    {l:'Admis',     v:cnt.principale+cnt.confirme,               cls:'cs-admis'},
    {l:'En attente',v:cnt.attente_1+cnt.attente_2+cnt.attente_3, cls:'cs-attente'},
    {l:'En cours',  v:cnt.en_cours,                              cls:'cs-cours'},
    {l:'Non retenus',v:cnt.refuse,                               cls:'cs-refuse'}
  ];
  var el=document.getElementById('stats-row');
  if(el) el.innerHTML=items.filter(function(i){return i.v>0||i.l==='Total';}).map(function(i){
    return '<div class="stat-box '+i.cls+'"><div class="stat-val">'+i.v+'</div><div class="stat-lbl">'+i.l+'</div></div>';
  }).join('');
  var nb=document.getElementById('nb-cand');
  if(nb) nb.textContent=cands.length+' candidature'+(cands.length>1?'s':'');
}

/* ── CRÉDENTIELS (login / mot de passe) ── */
function loginCell(login){
  if(isEmpty(login)) return '<span class="cred-empty">—</span>';
  var v=esc(login);
  return '<div class="cred-wrap">'
       +   '<span class="cred-val" title="'+v+'">'+v+'</span>'
       +   '<button class="cred-btn" data-copy="'+v+'" title="Copier">📋</button>'
       + '</div>';
}
function pwdCell(pwd){
  if(isEmpty(pwd)) return '<span class="cred-empty">—</span>';
  var v=esc(pwd);
  return '<div class="cred-wrap">'
       +   '<span class="cred-val masked" data-clear="'+v+'" data-mask="••••••••">••••••••</span>'
       +   '<button class="cred-btn" data-toggle="1" title="Afficher/Masquer">👁️</button>'
       +   '<button class="cred-btn" data-copy="'+v+'" title="Copier">📋</button>'
       + '</div>';
}

function renderTable(cands){
  var tbody=document.getElementById('tbody');
  if(!tbody) return;
  tbody.innerHTML=cands.map(function(c,i){
    var st=ST[c.statut]||ST['en_cours'];
    var recu=c.recu_inscription===true?'<span class="liste-oui">✅</span>':
             c.recu_inscription===false?'<span class="liste-non">⏳</span>':'<span class="cell-na">—</span>';
    var lien=c.lien?'<a class="btn-lien-sm" href="'+esc(c.lien)+'" target="_blank">🔗</a>':'—';
    return '<tr class="tr-'+(i%2===0?'even':'odd')+'">'
      +'<td class="tc c-num">'+(i+1)+'</td>'
      +'<td class="c-ecole"><strong>'+esc(c.ecole)+'</strong>'+(c.groupe?'<div class="ecole-groupe">'+esc(c.groupe)+'</div>':'')+'</td>'
      +'<td>'+loginCell(c.login)+'</td>'
      +'<td>'+pwdCell(c.motdepasse)+'</td>'
      +'<td class="tc">'+esc(c.ville||'—')+'</td>'
      +'<td class="tc">'+fmtDate(c.date_inscription)+'</td>'
      +'<td class="tc">'+fmtDate(c.date_concours)+'</td>'
      +'<td class="tc">'+recu+'</td>'
      +'<td class="tc"><span class="statut-badge '+st.cls+'">'+st.label+'</span></td>'
      +'<td class="tc">'+listeBadge(c.liste_principale)+'</td>'
      +'<td class="tc">'+listeBadge(c.attente_1)+'</td>'
      +'<td class="tc">'+listeBadge(c.attente_2)+'</td>'
      +'<td class="tc">'+listeBadge(c.attente_3)+'</td>'
      +'<td class="tc">'+lien+'</td>'
      +'</tr>';
  }).join('');
}

function renderCards(cands){
  var grid=document.getElementById('cards-mobile');
  if(!grid) return;
  grid.innerHTML=cands.map(function(c,i){
    var st=ST[c.statut]||ST['en_cours'];
    var lien=c.lien?'<a class="card-btn-link" href="'+esc(c.lien)+'" target="_blank">🔗 Site officiel</a>':'';
    var creds='';
    if(!isEmpty(c.login)||!isEmpty(c.motdepasse)){
      creds='<div class="cand-creds">';
      if(!isEmpty(c.login))
        creds+='<div class="cand-cred-row"><span class="cand-cred-lbl">🆔 Login</span>'+loginCell(c.login)+'</div>';
      if(!isEmpty(c.motdepasse))
        creds+='<div class="cand-cred-row"><span class="cand-cred-lbl">🔑 Mdp</span>'+pwdCell(c.motdepasse)+'</div>';
      creds+='</div>';
    }
    var listes='';
    if(c.liste_principale!==null&&c.liste_principale!==undefined)
      listes+='<div class="card-liste-item"><span class="cli-k">Liste princ.</span>'+listeBadge(c.liste_principale)+'</div>';
    if(c.attente_1!==null&&c.attente_1!==undefined)
      listes+='<div class="card-liste-item"><span class="cli-k">Attente 1</span>'+listeBadge(c.attente_1)+'</div>';
    if(c.attente_2!==null&&c.attente_2!==undefined)
      listes+='<div class="card-liste-item"><span class="cli-k">Attente 2</span>'+listeBadge(c.attente_2)+'</div>';
    if(c.attente_3!==null&&c.attente_3!==undefined)
      listes+='<div class="card-liste-item"><span class="cli-k">Attente 3</span>'+listeBadge(c.attente_3)+'</div>';
    return '<div class="cand-card">'
      +'<div class="cand-card-header">'
        +'<div class="cand-num">'+(i+1)+'</div>'
        +'<span class="statut-badge '+st.cls+'">'+st.label+'</span>'
      +'</div>'
      +'<div class="cand-card-nom">'+esc(c.ecole)+'</div>'
      +(c.groupe?'<div class="cand-card-groupe">'+esc(c.groupe)+' · '+esc(c.ville||'')+'</div>':'')
      +creds
      +'<div class="cand-card-infos">'
        +'<div class="ci-item"><span class="ci-k">📅 Inscription</span><span class="ci-v">'+fmtDate(c.date_inscription)+'</span></div>'
        +'<div class="ci-item"><span class="ci-k">🎯 Concours</span><span class="ci-v">'+fmtDate(c.date_concours)+'</span></div>'
      +'</div>'
      +(listes?'<div class="cand-listes">'+listes+'</div>':'')
      +(lien?'<div style="margin-top:10px">'+lien+'</div>':'')
      +'</div>';
  }).join('');
}

/* ── Gestion des boutons révéler/copier (délégation événements) ── */
function setupCredButtons(){
  document.addEventListener('click', function(ev){
    var btn=ev.target.closest('.cred-btn');
    if(!btn) return;
    /* Bouton "afficher/masquer" */
    if(btn.hasAttribute('data-toggle')){
      var wrap=btn.parentElement;
      var span=wrap.querySelector('.cred-val');
      if(!span) return;
      if(span.classList.contains('masked')){
        span.textContent=span.getAttribute('data-clear');
        span.classList.remove('masked');
        btn.textContent='🙈';
      } else {
        span.textContent=span.getAttribute('data-mask')||'••••••••';
        span.classList.add('masked');
        btn.textContent='👁️';
      }
    }
    /* Bouton "copier" */
    else if(btn.hasAttribute('data-copy')){
      var val=btn.getAttribute('data-copy');
      var done=function(){
        var old=btn.textContent;
        btn.textContent='✓'; btn.classList.add('ok');
        setTimeout(function(){ btn.textContent=old; btn.classList.remove('ok'); },1100);
      };
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(val).then(done).catch(function(){ fallbackCopy(val); done(); });
      } else { fallbackCopy(val); done(); }
    }
  });
}
function fallbackCopy(text){
  var ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

/* ═══════════════════════════════════════════════════════════
   BOOT DE L'APPLICATION (après déverrouillage)
   ═══════════════════════════════════════════════════════════ */

function bootApp(data){
  initBac();
  var dt=document.getElementById('darkToggle');
  if(dt) dt.addEventListener('click', toggleDark);
  var bp=document.getElementById('btnPrint');
  if(bp) bp.addEventListener('click', function(){ window.print(); });
  var bl=document.getElementById('btnLock');
  if(bl) bl.addEventListener('click', relock);

  setupCredButtons();

  var e=data[0]; if(!e) return;
  document.title='Deciplan — '+(e.prenom||'Étudiant');
  renderProfil(e);
  renderNotes(e.notes||{});
  renderStats(e.candidatures||[]);
  renderTable(e.candidatures||[]);
  renderCards(e.candidatures||[]);
}

/* ═══════════════════════════════════════════════════════════
   INITIALISATION
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function(){
  initDark();
  var form=document.getElementById('lockForm');
  if(form) form.addEventListener('submit', handleUnlock);
  var input=document.getElementById('cinInput');
  if(input) input.focus();

  /* Vérification de compatibilité */
  if(!window.crypto || !window.crypto.subtle){
    setLockMsg('❌ Votre navigateur ne supporte pas le chiffrement. Utilisez Chrome, Firefox, Safari ou Edge récent.','error');
    document.getElementById('lockBtn').disabled=true;
  }
});
