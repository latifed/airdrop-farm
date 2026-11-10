// ==========================================================================
// AIRDROP FARM VI // VICE CITY ALPHA TERMINAL - APP LOGIC
// WIDE SCREEN & COMPACT CARDS WITH LARGE BULLETINS & PERSISTENT DELETION
// ==========================================================================

// Global state
let projects = [];
let activeFilter = 'all';
let searchQuery = '';
let currentDetailProject = null;

// Determine if we are on a static host (GitHub Pages, file://, etc.) or Node.js backend
let isStaticHost = window.location.protocol === 'file:' || window.location.hostname.includes('github.io');

// DOM Elements
const projectsGrid = document.getElementById('projectsGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterContainer = document.getElementById('filterContainer');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statTge = document.getElementById('statTge');
const statEarly = document.getElementById('statEarly');

// Modals
const detailModal = document.getElementById('detailModal');
const formModal = document.getElementById('formModal');
const projectForm = document.getElementById('projectForm');

// Radio Elements
const btnRadioPlayPause = document.getElementById('btnRadioPlayPause');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
const radioStatusText = document.getElementById('radioStatusText');
const radioVolume = document.getElementById('radioVolume');
const volumeValueText = document.getElementById('volumeValueText');
const btnRadioMute = document.getElementById('btnRadioMute');
const iconVolume = document.getElementById('iconVolume');
const iconMuted = document.getElementById('iconMuted');
const eqContainer = document.getElementById('eqContainer');

// YouTube Player variables
let ytPlayer = null;
let isRadioPlaying = false;
let isRadioMuted = false;
let currentRadioVolume = 70;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchProjects();
  setupEventListeners();
  initRadioControls();
  window.addEventListener('hashchange', checkHashRoute);
});

// ==========================================================================
// YOUTUBE RADIO CONTROLLER (Justice — Flower In A Hurricane / GTA VI)
// ==========================================================================

window.onYouTubeIframeAPIReady = function() {
  try {
    ytPlayer = new YT.Player('ytPlayer', {
      height: '100',
      width: '100',
      videoId: '5dPwBWvmcbQ',
      playerVars: {
        autoplay: 1,
        controls: 0,
        loop: 1,
        playlist: '5dPwBWvmcbQ',
        playsinline: 1,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady: onRadioReady,
        onStateChange: onRadioStateChange,
        onError: onRadioError
      }
    });
  } catch (err) {
    console.warn('YouTube IFrame API init error:', err);
  }
};

function onRadioReady(event) {
  try {
    event.target.setVolume(currentRadioVolume);
    // Attempt autoplay; browsers may block unmuted playback until first user gesture
    const playPromise = event.target.playVideo();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setupFirstUserGestureAudioUnlock();
      });
    }
  } catch (err) {
    console.warn('Radio autoplay blocked by browser policy, waiting for user click:', err);
    setupFirstUserGestureAudioUnlock();
  }
}

function onRadioStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setRadioUIState(true);
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    setRadioUIState(false);
  } else if (event.data === YT.PlayerState.BUFFERING) {
    radioStatusText.textContent = 'YÜKLENİYOR';
  }
}

function onRadioError(event) {
  console.warn('YouTube Player encountered an error:', event.data);
  radioStatusText.textContent = 'RADYO ÇEVRİMDIŞI';
  setRadioUIState(false);
}

function setRadioUIState(playing) {
  isRadioPlaying = playing;
  if (playing) {
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
    radioStatusText.textContent = 'CANLI';
    radioStatusText.className = 'text-xs font-bold px-2 py-0.5 rounded bg-pink-500/30 text-pink-200 border border-pink-400';
    setEqualizerAnimation(true);
  } else {
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    radioStatusText.textContent = 'DURAKLATILDI';
    radioStatusText.className = 'text-xs font-bold px-2 py-0.5 rounded bg-[#240a4a] text-slate-300 border border-pink-500/30';
    setEqualizerAnimation(false);
  }
}

function setEqualizerAnimation(animate) {
  if (!eqContainer) return;
  const bars = eqContainer.querySelectorAll('.eq-bar');
  bars.forEach((bar, index) => {
    if (animate) {
      bar.classList.add(`eq-anim-${(index % 4) + 1}`);
    } else {
      bar.className = 'eq-bar';
      bar.style.height = '4px';
    }
  });
}

function initRadioControls() {
  if (btnRadioPlayPause) {
    btnRadioPlayPause.addEventListener('click', toggleRadioPlayback);
  }

  if (radioVolume) {
    radioVolume.addEventListener('input', (e) => {
      currentRadioVolume = parseInt(e.target.value, 10);
      volumeValueText.textContent = `${currentRadioVolume}%`;
      if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
        ytPlayer.setVolume(currentRadioVolume);
      }
      if (currentRadioVolume === 0) {
        updateMuteUI(true);
      } else if (isRadioMuted) {
        updateMuteUI(false);
        if (ytPlayer && typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
      }
    });
  }

  if (btnRadioMute) {
    btnRadioMute.addEventListener('click', toggleRadioMute);
  }

  setupFirstUserGestureAudioUnlock();
}

function toggleRadioPlayback() {
  if (!ytPlayer || typeof ytPlayer.playVideo !== 'function') {
    showToast('Radyo oynatıcı hazırlanıyor...', 'info');
    return;
  }
  if (isRadioPlaying) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
}

function toggleRadioMute() {
  if (!ytPlayer) return;
  isRadioMuted = !isRadioMuted;
  if (isRadioMuted) {
    if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
    updateMuteUI(true);
  } else {
    if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
    if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(currentRadioVolume);
    updateMuteUI(false);
  }
}

function updateMuteUI(muted) {
  isRadioMuted = muted;
  if (muted) {
    iconVolume.classList.add('hidden');
    iconMuted.classList.remove('hidden');
  } else {
    iconVolume.classList.remove('hidden');
    iconMuted.classList.add('hidden');
  }
}

function setupFirstUserGestureAudioUnlock() {
  const unlockAudio = () => {
    if (ytPlayer && typeof ytPlayer.playVideo === 'function' && !isRadioPlaying) {
      ytPlayer.playVideo();
    }
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
}

// ==========================================================================
// LOCAL PERSISTENCE HELPERS (Bulletproof deletion & custom edits)
// ==========================================================================

function getDeletedProjectIds() {
  try {
    return JSON.parse(localStorage.getItem('airdrop_deleted_ids') || '[]');
  } catch (e) {
    return [];
  }
}

function getEditedMap() {
  try {
    return JSON.parse(localStorage.getItem('airdrop_edited_map') || '{}');
  } catch (e) {
    return {};
  }
}

function getCustomProjects() {
  try {
    return JSON.parse(localStorage.getItem('airdrop_custom_projects') || '[]');
  } catch (e) {
    return [];
  }
}

// Apply user deletions, edits, and custom additions on top of server data
function applyLocalOverrides(serverProjects) {
  const deletedIds = getDeletedProjectIds();
  const editedMap = getEditedMap();
  const customProjects = getCustomProjects();

  // 1. Filter out permanently deleted IDs (Never resurrect them on reload!)
  let result = serverProjects.filter(p => !deletedIds.includes(p.id));

  // 2. Apply locally saved user edits
  result = result.map(p => editedMap[p.id] ? { ...p, ...editedMap[p.id] } : p);

  // 3. Merge user added projects
  customProjects.forEach(cp => {
    if (!deletedIds.includes(cp.id) && !result.some(p => p.id === cp.id)) {
      result.push(cp);
    }
  });

  return result;
}

// ==========================================================================
// DATA FETCHING & SYNCHRONIZATION
// ==========================================================================

async function fetchProjects() {
  try {
    if (!isStaticHost) {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const serverData = await res.json();
          projects = applyLocalOverrides(serverData);
          saveLocalProjects();
          updateStats();
          renderProjects();
          checkHashRoute();
          return;
        }
      } catch (err) {
        console.warn('Backend API not responding, falling back to static/local mode...');
        isStaticHost = true;
      }
    }

    // Static / GitHub Pages Mode: Fetch latest data from projects.json AND apply user deletions/edits
    try {
      const res = await fetch('data/projects.json?v=' + Date.now());
      if (res.ok) {
        const serverData = await res.json();
        projects = applyLocalOverrides(serverData);
        saveLocalProjects();
        updateStats();
        renderProjects();
        checkHashRoute();
        return;
      }
    } catch (fetchErr) {
      console.warn('Network fetch failed, falling back to local storage cache:', fetchErr);
    }

    // Fallback if offline: Read from local storage
    const localSaved = localStorage.getItem('airdrop_projects_data');
    if (localSaved) {
      try {
        const cached = JSON.parse(localSaved);
        projects = applyLocalOverrides(cached);
        updateStats();
        renderProjects();
        checkHashRoute();
        return;
      } catch (e) {
        console.error('Local storage parse error:', e);
      }
    }
    renderProjects();
    checkHashRoute();
  } catch (err) {
    console.error('Fetch error:', err);
    showToast('Projeler yüklenirken hata oluştu', 'error');
  }
}

function saveLocalProjects() {
  localStorage.setItem('airdrop_projects_data', JSON.stringify(projects));
}

// Update Header Statistics
function updateStats() {
  if (statTotal) statTotal.textContent = projects.length;
  if (statActive) statActive.textContent = projects.filter(p => p.status && p.status.includes('Aktif')).length;
  if (statTge) statTge.textContent = projects.filter(p => p.status && (p.status.includes('TGE') || p.status.includes('Donduruluyor'))).length;
  if (statEarly) statEarly.textContent = projects.filter(p => p.status && (p.status.includes('Erken') || p.status.includes('Çok Erken'))).length;
}

// ==========================================================================
// CARD RENDERING (Compact Box, Stretched Wide, Large Bulletins)
// ==========================================================================

function renderProjects() {
  const filtered = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.category && project.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (project.backers && project.backers.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesFilter = true;
    if (activeFilter === 'Aktif Puan Kasma') {
      matchesFilter = project.status && project.status.includes('Aktif');
    } else if (activeFilter === 'TGE') {
      matchesFilter = project.status && (project.status.includes('TGE') || project.status.includes('Donduruluyor'));
    } else if (activeFilter === 'Erken') {
      matchesFilter = project.status && (project.status.includes('Erken') || project.status.includes('Çok Erken'));
    }

    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    projectsGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  projectsGrid.innerHTML = filtered.map(p => createCardHTML(p)).join('');
  lucide.createIcons();
}

function createCardHTML(p) {
  let statusBadgeClass = 'bg-pink-950 text-white border-2 border-pink-400';
  if (p.status && p.status.includes('Aktif')) {
    statusBadgeClass = 'bg-[#400d2b] text-white border-2 border-pink-400 shadow-md';
  } else if (p.status && (p.status.includes('TGE') || p.status.includes('Donduruluyor'))) {
    statusBadgeClass = 'bg-[#3b2400] text-amber-200 border-2 border-amber-400 shadow-md';
  } else if (p.status && p.status.includes('Erken')) {
    statusBadgeClass = 'bg-[#003440] text-cyan-200 border-2 border-cyan-400 shadow-md';
  }

  const isStableStock = p.id === 'stablestock';

  // Render Large High-Contrast Bulletins
  let bulletinsHTML = '';
  if (p.bulletins && p.bulletins.length > 0) {
    bulletinsHTML = `
      <div class="space-y-2.5 my-3.5">
        ${p.bulletins.map(b => `
          <div class="text-[15px] sm:text-[16px] text-white leading-snug bg-[#1d093d]/85 border border-pink-500/35 rounded-xl px-3.5 py-2.5 shadow-sm">
            ${b}
          </div>
        `).join('')}
      </div>
    `;
  } else {
    bulletinsHTML = `
      <div class="space-y-2.5 my-3.5">
        <div class="text-[15px] sm:text-[16px] text-white leading-snug bg-[#1d093d]/85 border border-pink-500/35 rounded-xl px-3.5 py-2.5 shadow-sm">
          🎯 <b>Strateji & Özet:</b> ${p.summary || 'Proje detayları için tıklayın.'}
        </div>
        ${p.funding ? `
          <div class="text-[15px] sm:text-[16px] text-white leading-snug bg-[#1d093d]/85 border border-pink-500/35 rounded-xl px-3.5 py-2.5 shadow-sm">
            💰 <b>Değerleme:</b> ${p.funding}
          </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <div class="project-card relative rounded-2xl p-5 sm:p-6 flex flex-col justify-between cursor-pointer group"
         style="background: linear-gradient(180deg, #15072e 0%, #0d041c 100%) !important; border: 2px solid rgba(255, 0, 127, 0.55) !important; color: #ffffff !important;"
         onclick="openDetailModal('${p.id}')">
      
      ${isStableStock ? `
        <div class="absolute -top-3.5 right-6 bg-gradient-to-r from-[#ff007f] via-[#ff5500] to-[#ffbe0b] text-white text-[11px] font-black uppercase px-3.5 py-1 rounded-full shadow-lg shadow-pink-500/60 tracking-wider flex items-center space-x-1.5 border border-white/30">
          <span>🌴 ÖZEL DERİN ANALİZ</span>
        </div>
      ` : ''}

      <div>
        <!-- Card Header: Compact & Clear -->
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center space-x-3.5">
            <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-[#ff007f] via-[#ff5500] to-[#ffbe0b] p-[2px] shadow-lg flex-shrink-0">
              <div class="w-full h-full bg-[#0d041c] rounded-[10px] flex items-center justify-center font-black text-cyan-300 text-lg sm:text-xl tracking-wider">
                ${(p.symbol || 'PRJ').slice(0, 4)}
              </div>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-300 transition-colors tracking-tight">${p.name}</h3>
                <span class="text-xs sm:text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-pink-500/25 text-cyan-300 border border-pink-500/50">// ${p.symbol}</span>
              </div>
              <p class="text-xs sm:text-sm font-bold text-pink-300 mt-0.5">${p.category || 'DeFi & Airdrop'}</p>
            </div>
          </div>

          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass} flex-shrink-0">
            ${p.status || 'Aktif'}
          </span>
        </div>

        <!-- Card Body: Large, Readable Bulletins -->
        ${bulletinsHTML}
      </div>

      <!-- Card Action Footer: Compact & High Contrast -->
      <div class="pt-3.5 border-t-2 border-pink-500/25 flex items-center justify-between" onclick="event.stopPropagation()">
        <button onclick="openDetailModal('${p.id}')" class="inline-flex items-center space-x-2 text-sm sm:text-base font-black text-black bg-cyan-400 hover:bg-cyan-300 py-2.5 px-5 rounded-xl transition-all shadow-md shadow-cyan-400/30 transform hover:scale-[1.02]">
          <span>İNCELE & ALPHA OKU</span>
          <i data-lucide="arrow-right" class="w-4 h-4 text-black stroke-[3]"></i>
        </button>

        <div class="flex items-center space-x-2">
          <button onclick="openEditModal('${p.id}')" class="p-2.5 rounded-xl bg-[#240a4a] hover:bg-[#381073] border border-pink-400 text-pink-200 hover:text-white transition" title="Düzenle">
            <i data-lucide="edit-2" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </button>
          <button onclick="deleteProject('${p.id}', '${p.name}')" class="p-2.5 rounded-xl bg-[#240a4a] hover:bg-rose-900 border border-pink-400 text-pink-200 hover:text-rose-300 transition" title="Sil">
            <i data-lucide="trash-2" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </button>
        </div>
      </div>

    </div>
  `;
}

// ==========================================================================
// MODAL CONTROLS & ROUTING
// ==========================================================================

function openDetailModal(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  currentDetailProject = project;
  window.location.hash = project.id;

  document.getElementById('detailTitle').textContent = project.name;
  document.getElementById('detailSymbol').textContent = `// ${project.symbol}`;
  document.getElementById('detailSymbolBadge').textContent = (project.symbol || 'PRJ').slice(0, 4);
  document.getElementById('detailCategory').textContent = project.category || 'DeFi / Airdrop';
  document.getElementById('detailStatusBadge').textContent = project.status || 'Aktif';
  
  document.getElementById('detailFunding').textContent = project.funding || '-';
  document.getElementById('detailRisk').textContent = project.riskTier || '-';
  document.getElementById('detailFounders').textContent = project.founders || '-';
  document.getElementById('detailBackers').textContent = project.backers || '-';

  const linksBar = document.getElementById('detailLinksBar');
  let linksHTML = '';
  if (project.website) {
    linksHTML += `<a href="${project.website}" target="_blank" rel="noopener" class="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#240a4a] hover:bg-[#381073] text-base text-white hover:text-cyan-300 transition font-bold border-2 border-pink-400"><i data-lucide="globe" class="w-5 h-5 text-cyan-400"></i><span>Website</span></a>`;
  }
  if (project.appUrl) {
    linksHTML += `<a href="${project.appUrl}" target="_blank" rel="noopener" class="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-base text-white transition font-black shadow-lg shadow-pink-500/40"><i data-lucide="external-link" class="w-5 h-5 text-white"></i><span>DApp / Katıl</span></a>`;
  }
  if (project.twitter) {
    linksHTML += `<a href="${project.twitter}" target="_blank" rel="noopener" class="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#240a4a] hover:bg-[#381073] text-base text-white hover:text-cyan-300 transition font-bold border-2 border-pink-400"><i data-lucide="twitter" class="w-5 h-5 text-cyan-400"></i><span>X (Twitter)</span></a>`;
  }
  linksBar.innerHTML = linksHTML || '<span class="text-sm font-bold text-slate-300">Harici link eklenmemiş</span>';

  const markdownContainer = document.getElementById('detailMarkdownContent');
  if (project.content) {
    markdownContainer.innerHTML = marked.parse(project.content);
  } else {
    markdownContainer.innerHTML = `<p class="text-slate-300 italic text-base">Bu proje için henüz detaylı analiz raporu yazılmadı.</p>`;
  }

  detailModal.classList.remove('hidden');
  lucide.createIcons();
}

function closeDetailModal() {
  detailModal.classList.add('hidden');
  if (window.location.hash) {
    history.replaceState(null, null, ' ');
  }
}

function openNewModal() {
  document.getElementById('formModalTitle').textContent = 'YENİ HEDEF EKLE';
  document.getElementById('formProjectId').value = '';
  projectForm.reset();
  formModal.classList.remove('hidden');
}

function openEditModal(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  document.getElementById('formModalTitle').textContent = `HEDEFİ DÜZENLE: ${project.name}`;
  document.getElementById('formProjectId').value = project.id;
  document.getElementById('formName').value = project.name || '';
  document.getElementById('formSymbol').value = project.symbol || '';
  document.getElementById('formCategory').value = project.category || '';
  document.getElementById('formStatus').value = project.status || 'Aktif Puan Kasma';
  document.getElementById('formRiskTier').value = project.riskTier || '';
  document.getElementById('formFunding').value = project.funding || '';
  document.getElementById('formFounders').value = project.founders || '';
  document.getElementById('formBackers').value = project.backers || '';
  document.getElementById('formWebsite').value = project.website || '';
  document.getElementById('formAppUrl').value = project.appUrl || '';
  document.getElementById('formTwitter').value = project.twitter || '';
  document.getElementById('formSummary').value = project.summary || '';
  document.getElementById('formContent').value = project.content || '';

  closeDetailModal();
  formModal.classList.remove('hidden');
}

function closeFormModal() {
  formModal.classList.add('hidden');
  projectForm.reset();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('formProjectId').value;
  const projectData = {
    name: document.getElementById('formName').value.trim(),
    symbol: document.getElementById('formSymbol').value.trim().toUpperCase(),
    category: document.getElementById('formCategory').value.trim(),
    status: document.getElementById('formStatus').value,
    riskTier: document.getElementById('formRiskTier').value.trim(),
    funding: document.getElementById('formFunding').value.trim(),
    founders: document.getElementById('formFounders').value.trim(),
    backers: document.getElementById('formBackers').value.trim(),
    website: document.getElementById('formWebsite').value.trim(),
    appUrl: document.getElementById('formAppUrl').value.trim(),
    twitter: document.getElementById('formTwitter').value.trim(),
    summary: document.getElementById('formSummary').value.trim(),
    content: document.getElementById('formContent').value.trim()
  };

  try {
    if (!isStaticHost) {
      try {
        let res;
        if (id) {
          res = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
          });
        } else {
          res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
          });
        }

        if (res.ok) {
          closeFormModal();
          showToast(id ? 'Proje başarıyla güncellendi!' : 'Yeni proje eklendi!', 'success');
          await fetchProjects();
          return;
        }
      } catch (err) {
        console.warn('Backend call failed, using local persistent update...');
      }
    }

    // Static / GitHub Pages mode fallback with persistent overrides:
    if (id) {
      const idx = projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...projectData, id };
      }
      const editedMap = getEditedMap();
      editedMap[id] = { ...projectData, id };
      localStorage.setItem('airdrop_edited_map', JSON.stringify(editedMap));
    } else {
      const newId = projectData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `proj-${Date.now()}`;
      const newProj = { ...projectData, id: newId };
      projects.push(newProj);

      // Un-delete if this ID was previously marked deleted
      const deletedIds = getDeletedProjectIds().filter(dId => dId !== newId);
      localStorage.setItem('airdrop_deleted_ids', JSON.stringify(deletedIds));

      const customProjects = getCustomProjects();
      customProjects.push(newProj);
      localStorage.setItem('airdrop_custom_projects', JSON.stringify(customProjects));
    }

    saveLocalProjects();
    updateStats();
    renderProjects();
    closeFormModal();
    showToast(id ? 'Proje güncellendi ve kaydedildi!' : 'Yeni proje kaydedildi!', 'success');

  } catch (err) {
    console.error('Submit error:', err);
    showToast(err.message, 'error');
  }
}

// PERMANENT DELETION: Never resurrect deleted projects on page reload!
async function deleteProject(id, name) {
  const confirmDelete = confirm(`"${name}" projesini tablodan silmek istediğinize emin misiniz?`);
  if (!confirmDelete) return;

  try {
    // 1. Permanently record deletion ID so fetchProjects() NEVER resurrects it
    const deletedIds = getDeletedProjectIds();
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('airdrop_deleted_ids', JSON.stringify(deletedIds));
    }

    // 2. Remove from custom projects if locally added
    let customProjects = getCustomProjects().filter(cp => cp.id !== id);
    localStorage.setItem('airdrop_custom_projects', JSON.stringify(customProjects));

    // 3. Remove from edited map
    let editedMap = getEditedMap();
    delete editedMap[id];
    localStorage.setItem('airdrop_edited_map', JSON.stringify(editedMap));

    // 4. Try backend deletion if available
    if (!isStaticHost) {
      try {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Backend delete failed, persistent local deletion applied.');
      }
    }

    // 5. Update active memory and local cache
    projects = projects.filter(p => p.id !== id);
    saveLocalProjects();
    updateStats();
    renderProjects();
    showToast(`"${name}" silindi ve kalıcı olarak kaldırıldı!`, 'success');

  } catch (err) {
    console.error('Delete error:', err);
    showToast('Proje silinirken hata oluştu', 'error');
  }
}

function checkHashRoute() {
  const hash = window.location.hash.replace('#', '').trim();
  if (!hash) return;

  const project = projects.find(p => p.id === hash || p.name.toLowerCase() === hash.toLowerCase() || p.symbol.toLowerCase() === hash.toLowerCase());
  if (project) {
    openDetailModal(project.id);
  }
}

function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "projects.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('projects.json indirildi! Güncel listenizi saklayabilirsiniz.', 'success');
}

// Reset data to default data/projects.json (Clears all user deletions)
async function resetToDefaults() {
  if (!confirm('Silinen tüm varsayılan projeler geri yüklenip sıfırlansın mı?')) return;
  try {
    localStorage.removeItem('airdrop_deleted_ids');
    localStorage.removeItem('airdrop_edited_map');
    localStorage.removeItem('airdrop_custom_projects');
    localStorage.removeItem('airdrop_projects_data');
    showToast('Varsayılan projeler geri yükleniyor...', 'info');
    await fetchProjects();
    showToast('Tüm varsayılan projeler başarıyla geri yüklendi!', 'success');
  } catch (e) {
    showToast('Sıfırlama başarısız oldu: ' + e.message, 'error');
  }
}

function setupEventListeners() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderProjects();
    });
  }

  if (filterContainer) {
    filterContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderProjects();
    });
  }

  const btnNew = document.getElementById('btnNewProject');
  if (btnNew) btnNew.addEventListener('click', openNewModal);

  const btnCloseDetail = document.getElementById('btnCloseDetail');
  if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeDetailModal);

  const btnCloseDetailFooter = document.getElementById('btnCloseDetailFooter');
  if (btnCloseDetailFooter) btnCloseDetailFooter.addEventListener('click', closeDetailModal);

  const btnCloseForm = document.getElementById('btnCloseForm');
  if (btnCloseForm) btnCloseForm.addEventListener('click', closeFormModal);

  const btnCancelForm = document.getElementById('btnCancelForm');
  if (btnCancelForm) btnCancelForm.addEventListener('click', closeFormModal);

  const btnEditFromDetail = document.getElementById('btnEditFromDetail');
  if (btnEditFromDetail) {
    btnEditFromDetail.addEventListener('click', () => {
      if (currentDetailProject) {
        openEditModal(currentDetailProject.id);
      }
    });
  }

  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeDetailModal();
    });
  }
  if (formModal) {
    formModal.addEventListener('click', (e) => {
      if (e.target === formModal) closeFormModal();
    });
  }

  if (projectForm) {
    projectForm.addEventListener('submit', handleFormSubmit);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closeFormModal();
    }
  });

  const btnExport = document.getElementById('btnExportJSON');
  if (btnExport) btnExport.addEventListener('click', exportJSON);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  
  if (type === 'success') {
    toastIcon.innerHTML = `<span class="text-cyan-400 font-bold">✓</span>`;
    toast.className = 'fixed bottom-32 right-8 z-50 transform translate-y-0 opacity-100 transition-all duration-300 px-6 py-4 rounded-2xl bg-[#140626] border-2 border-cyan-400 shadow-2xl flex items-center space-x-3 text-base font-semibold text-white';
  } else if (type === 'error') {
    toastIcon.innerHTML = `<span class="text-rose-400 font-bold">✕</span>`;
    toast.className = 'fixed bottom-32 right-8 z-50 transform translate-y-0 opacity-100 transition-all duration-300 px-6 py-4 rounded-2xl bg-[#140626] border-2 border-rose-500 shadow-2xl flex items-center space-x-3 text-base font-semibold text-white';
  } else {
    toastIcon.innerHTML = `<span class="text-pink-400 font-bold">ℹ</span>`;
    toast.className = 'fixed bottom-32 right-8 z-50 transform translate-y-0 opacity-100 transition-all duration-300 px-6 py-4 rounded-2xl bg-[#140626] border-2 border-pink-400 shadow-2xl flex items-center space-x-3 text-base font-semibold text-white';
  }

  setTimeout(() => {
    toast.className = 'fixed bottom-32 right-8 z-50 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none px-6 py-4 rounded-2xl bg-[#140626]';
  }, 3500);
}
