/* ============================================================
   Superior Boys Hostel — shared site logic
   Used by every page (index, about, rooms, facilities, gallery,
   blog, contact, login). Keep this file linked on every page.
   ============================================================ */

// Change these two lines to set your own admin login.
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "superior2026";

/* ---------- storage helpers ----------
   shared = true  -> same value for every visitor (site content) when running inside Claude
   shared = false -> only this browser (used for the login session)
   Outside Claude (e.g. after deploying to GitHub Pages), window.storage does not
   exist — everything falls back to this browser's own localStorage instead. */
function hasCloudStorage(){
  return (typeof window !== 'undefined') && window.storage && typeof window.storage.get === 'function';
}
function localKey(key, shared){
  return 'sbh:' + (shared ? 'shared' : 'local') + ':' + key;
}

async function safeGet(key, shared){
  if(hasCloudStorage()){
    try{
      const r = await window.storage.get(key, shared);
      return r ? r.value : null;
    }catch(e){ /* fall through to localStorage */ }
  }
  try{
    return localStorage.getItem(localKey(key, shared));
  }catch(e){
    return null;
  }
}
async function safeSet(key, value, shared){
  if(hasCloudStorage()){
    try{
      const r = await window.storage.set(key, value, shared);
      if(r) return true;
    }catch(e){ /* fall through to localStorage */ }
  }
  try{
    localStorage.setItem(localKey(key, shared), value);
    return true;
  }catch(e){
    console.error('Storage save failed', e);
    return false;
  }
}
async function safeDelete(key, shared){
  if(hasCloudStorage()){
    try{
      await window.storage.delete(key, shared);
      return true;
    }catch(e){ /* fall through to localStorage */ }
  }
  try{
    localStorage.removeItem(localKey(key, shared));
    return true;
  }catch(e){
    return false;
  }
}

/* ---------- image resize (keeps uploads small) ---------- */
function resizeImage(file, maxDim, quality){
  maxDim = maxDim || 900; quality = quality || 0.72;
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = function(e){
      const img = new Image();
      img.onload = function(){
        let w = img.width, h = img.height;
        if(w > h && w > maxDim){ h = h * (maxDim / w); w = maxDim; }
        else if(h >= w && h > maxDim){ w = w * (maxDim / h); h = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w); canvas.height = Math.round(h);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- session ---------- */
async function checkSession(){
  const s = await safeGet('admin:session', false);
  return s === 'true';
}
async function logout(){
  await safeDelete('admin:session', false);
  window.location.href = 'index.html';
}

/* ---------- logo (shown in the header on every page) ---------- */
async function renderLogo(){
  const plate = document.getElementById('logoPlate');
  if(!plate) return;
  const logo = await safeGet('site:logo', true);
  plate.innerHTML = logo ? '<img src="'+logo+'" alt="Superior Boys Hostel logo">' : 'SBH';
}
async function handleLogoUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  const dataUrl = await resizeImage(file, 300, 0.85);
  const ok = await safeSet('site:logo', dataUrl, true);
  if(!ok) alert('Logo upload failed to save — please try again.');
  await renderLogo();
  e.target.value = '';
}

/* ---------- shared header/footer/admin-bar setup — call on every page ---------- */
async function initHeaderFooter(){
  const isAdmin = await checkSession();
  document.body.classList.toggle('admin-on', isAdmin);

  const bar = document.getElementById('adminBar');
  if(bar) bar.classList.toggle('on', isAdmin);

  const footerAuth = document.getElementById('footerAuthArea');
  if(footerAuth){
    footerAuth.innerHTML = isAdmin
      ? '<span style="color:#9fd6a6; display:block; margin-bottom:6px;">● Logged in as admin</span><button onclick="logout()">Log out</button>'
      : '<a href="login.html">🔐 Admin Login</a>';
  }

  highlightCurrentNavLink();
  await renderLogo();
  return isAdmin;
}

function highlightCurrentNavLink(){
  const file = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('nav.links a[data-page]').forEach(function(a){
    if(a.getAttribute('data-page') === file){
      a.style.color = 'var(--brick)';
    }
  });
}
