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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchProjects();
  setupEventListeners();

  window.addEventListener('hashchange', checkHashRoute);
});

// Fetch all projects (Hybrid: API if available, else LocalStorage/Static JSON)
async function fetchProjects() {
  try {
    if (!isStaticHost) {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          projects = await res.json();
          // Save backup copy to localStorage
          localStorage.setItem('airdrop_projects_backup', JSON.stringify(projects));
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

    // Static / GitHub Pages Mode
    const localSaved = localStorage.getItem('airdrop_projects_data');
    if (localSaved) {
      try {
        projects = JSON.parse(localSaved);
        updateStats();
        renderProjects();
        checkHashRoute();
        return;
      } catch (e) {
        console.error('Local storage parse error:', e);
      }
    }

    // Fallback: Fetch initial data from static JSON file
    const res = await fetch('data/projects.json');
    if (!res.ok) throw new Error('data/projects.json yüklenemedi');
    projects = await res.json();
    localStorage.setItem('airdrop_projects_data', JSON.stringify(projects));
    updateStats();
    renderProjects();
    checkHashRoute();
  } catch (err) {
    console.error('Fetch error:', err);
    showToast('Projeler yüklenirken hata oluştu', 'error');
  }
}

// Save projects state in static / GitHub Pages mode
function saveLocalProjects() {
  localStorage.setItem('airdrop_projects_data', JSON.stringify(projects));
}

// Update Header Statistics
function updateStats() {
  statTotal.textContent = projects.length;
  statActive.textContent = projects.filter(p => p.status && p.status.includes('Aktif')).length;
  statTge.textContent = projects.filter(p => p.status && (p.status.includes('TGE') || p.status.includes('Donduruluyor'))).length;
  statEarly.textContent = projects.filter(p => p.status && (p.status.includes('Erken') || p.status.includes('Çok Erken'))).length;
}

// Render Project Cards
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
    } else if (activeFilter === 'Geç') {
      matchesFilter = project.status && (project.status.includes('Geç') || project.riskTier.includes('Geç'));
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

// Generate Card HTML
function createCardHTML(p) {
  let statusBadgeClass = 'bg-surface-700 text-slate-300 border-surface-600';
  if (p.status && p.status.includes('Aktif')) {
    statusBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (p.status && (p.status.includes('TGE') || p.status.includes('Donduruluyor'))) {
    statusBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  } else if (p.status && p.status.includes('Erken')) {
    statusBadgeClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  } else if (p.status && p.status.includes('Geç')) {
    statusBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }

  const isStableStock = p.id === 'stablestock';

  return `
    <div class="project-card relative bg-surface-800/90 border ${isStableStock ? 'border-brand-500/50 shadow-brand-500/10' : 'border-surface-700/70'} rounded-3xl p-6 flex flex-col justify-between cursor-pointer group" onclick="openDetailModal('${p.id}')">
      
      ${isStableStock ? `
        <div class="absolute -top-3 right-6 bg-gradient-to-r from-brand-500 to-cyan-500 text-black text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-md tracking-wider">
          🔥 Özel Analiz
        </div>
      ` : ''}

      <div>
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center space-x-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr ${isStableStock ? 'from-brand-500 via-emerald-400 to-cyan-400 text-black' : 'from-surface-700 to-surface-600 text-brand-400'} flex items-center justify-center font-black text-base shadow-md">
              ${(p.symbol || 'PRJ').slice(0, 4)}
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-lg font-black text-white group-hover:text-brand-400 transition-colors">${p.name}</h3>
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-surface-700/80 text-slate-300">${p.symbol}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">${p.category || 'DeFi / Airdrop'}</p>
            </div>
          </div>

          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadgeClass}">
            ${p.status || 'Aktif'}
          </span>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-3">
          ${p.summary || 'Proje hakkında detaylar ve airdrop puan kasma kılavuzu için tıklayın.'}
        </p>

        <div class="flex flex-wrap gap-1.5 mb-5 text-[11px]">
          ${p.funding ? `<span class="px-2 py-0.5 rounded-md bg-surface-700/70 text-slate-300 border border-surface-600/50">💰 ${p.funding}</span>` : ''}
          ${p.riskTier ? `<span class="px-2 py-0.5 rounded-md bg-surface-700/70 text-amber-300/90 border border-surface-600/50">🛡️ ${p.riskTier}</span>` : ''}
        </div>
      </div>

      <div class="pt-4 border-t border-surface-700/60 flex items-center justify-between" onclick="event.stopPropagation()">
        <button onclick="openDetailModal('${p.id}')" class="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 group-hover:underline">
          <span>İncele & Alpha Oku</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </button>

        <div class="flex items-center space-x-1">
          <button onclick="openEditModal('${p.id}')" class="p-1.5 rounded-lg bg-surface-700/70 hover:bg-surface-600 text-slate-400 hover:text-white transition" title="Düzenle">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteProject('${p.id}', '${p.name}')" class="p-1.5 rounded-lg bg-surface-700/70 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition" title="Sil">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

    </div>
  `;
}

// Open Detail Modal
function openDetailModal(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  currentDetailProject = project;
  window.location.hash = project.id;

  document.getElementById('detailTitle').textContent = project.name;
  document.getElementById('detailSymbol').textContent = project.symbol;
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
    linksHTML += `<a href="${project.website}" target="_blank" rel="noopener" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-xs text-slate-200 transition font-medium"><i data-lucide="globe" class="w-3.5 h-3.5 text-brand-400"></i><span>Website</span></a>`;
  }
  if (project.appUrl) {
    linksHTML += `<a href="${project.appUrl}" target="_blank" rel="noopener" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-xs text-brand-300 transition font-bold border border-brand-500/30"><i data-lucide="external-link" class="w-3.5 h-3.5 text-brand-400"></i><span>DApp / Katıl</span></a>`;
  }
  if (project.twitter) {
    linksHTML += `<a href="${project.twitter}" target="_blank" rel="noopener" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-xs text-slate-200 transition font-medium"><i data-lucide="twitter" class="w-3.5 h-3.5 text-cyan-400"></i><span>X (Twitter)</span></a>`;
  }
  linksBar.innerHTML = linksHTML || '<span class="text-xs text-slate-500">Harici link eklenmemiş</span>';

  const markdownContainer = document.getElementById('detailMarkdownContent');
  if (project.content) {
    markdownContainer.innerHTML = marked.parse(project.content);
  } else {
    markdownContainer.innerHTML = `<p class="text-slate-400 italic">Bu proje için henüz detaylı analiz raporu yazılmadı.</p>`;
  }

  detailModal.classList.remove('hidden');
  lucide.createIcons();
}

// Close Detail Modal
function closeDetailModal() {
  detailModal.classList.add('hidden');
  if (window.location.hash) {
    history.replaceState(null, null, ' ');
  }
}

// Open Form Modal (Add New)
function openNewModal() {
  document.getElementById('formModalTitle').textContent = 'Yeni Proje Ekle';
  document.getElementById('formProjectId').value = '';
  projectForm.reset();
  formModal.classList.remove('hidden');
}

// Open Form Modal (Edit Existing)
function openEditModal(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  document.getElementById('formModalTitle').textContent = `Projeyi Düzenle: ${project.name}`;
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

// Close Form Modal
function closeFormModal() {
  formModal.classList.add('hidden');
  projectForm.reset();
}

// Handle Form Submission
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
        console.warn('Backend call failed, using local storage update...');
      }
    }

    // Static / GitHub Pages mode fallback:
    if (id) {
      const idx = projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...projectData, id };
      }
    } else {
      const newId = projectData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `proj-${Date.now()}`;
      projects.push({ ...projectData, id: newId });
    }

    saveLocalProjects();
    updateStats();
    renderProjects();
    closeFormModal();
    showToast(id ? 'Proje tarayıcı hafızasında güncellendi!' : 'Yeni proje tarayıcı hafızasına eklendi!', 'success');

  } catch (err) {
    console.error('Submit error:', err);
    showToast(err.message, 'error');
  }
}

// Delete Project
async function deleteProject(id, name) {
  const confirmDelete = confirm(`"${name}" projesini ve tüm analiz verilerini silmek istediğinize emin misiniz?`);
  if (!confirmDelete) return;

  try {
    if (!isStaticHost) {
      try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`"${name}" başarıyla silindi.`, 'success');
          await fetchProjects();
          return;
        }
      } catch (err) {
        console.warn('Backend delete failed, falling back to local storage...');
      }
    }

    projects = projects.filter(p => p.id !== id);
    saveLocalProjects();
    updateStats();
    renderProjects();
    showToast(`"${name}" başarıyla silindi.`, 'success');

  } catch (err) {
    console.error('Delete error:', err);
    showToast('Proje silinirken hata oluştu', 'error');
  }
}

// Check URL Hash routing
function checkHashRoute() {
  const hash = window.location.hash.replace('#', '').trim();
  if (!hash) return;

  const project = projects.find(p => p.id === hash || p.name.toLowerCase() === hash.toLowerCase() || p.symbol.toLowerCase() === hash.toLowerCase());
  if (project) {
    openDetailModal(project.id);
  }
}

// Export JSON to File (for pushing updates to GitHub)
function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "projects.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('projects.json indirildi! GitHub reponuza yükleyebilirsiniz.', 'success');
}

// Reset data to default data/projects.json
async function resetToDefaults() {
  if (!confirm('Tüm özel eklemeler sıfırlanıp varsayılan proje listesine dönülsün mü?')) return;
  try {
    const res = await fetch('data/projects.json');
    if (!res.ok) throw new Error('data/projects.json okunamadı');
    projects = await res.json();
    saveLocalProjects();
    updateStats();
    renderProjects();
    showToast('Veriler varsayılana sıfırlandı.', 'info');
  } catch (e) {
    showToast('Sıfırlama başarısız oldu: ' + e.message, 'error');
  }
}

// Setup Event Listeners
function setupEventListeners() {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderProjects();
  });

  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderProjects();
  });

  document.getElementById('btnNewProject').addEventListener('click', openNewModal);

  document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);
  document.getElementById('btnCloseDetailFooter').addEventListener('click', closeDetailModal);
  document.getElementById('btnCloseForm').addEventListener('click', closeFormModal);
  document.getElementById('btnCancelForm').addEventListener('click', closeFormModal);

  document.getElementById('btnEditFromDetail').addEventListener('click', () => {
    if (currentDetailProject) {
      openEditModal(currentDetailProject.id);
    }
  });

  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });
  formModal.addEventListener('click', (e) => {
    if (e.target === formModal) closeFormModal();
  });

  projectForm.addEventListener('submit', handleFormSubmit);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closeFormModal();
    }
  });

  const btnExport = document.getElementById('btnExportJSON');
  if (btnExport) btnExport.addEventListener('click', exportJSON);

  const btnReset = document.getElementById('btnResetDefault');
  if (btnReset) btnReset.addEventListener('click', resetToDefaults);
}

// Toast Helper
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  toastMsg.textContent = message;
  
  if (type === 'success') {
    toastIcon.innerHTML = `<span class="text-brand-400 font-bold">✓</span>`;
    toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-0 opacity-100 transition-all duration-300 px-5 py-3 rounded-2xl bg-surface-800 border border-brand-500/50 shadow-2xl flex items-center space-x-3 text-sm font-semibold text-white';
  } else if (type === 'error') {
    toastIcon.innerHTML = `<span class="text-rose-400 font-bold">✕</span>`;
    toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-0 opacity-100 transition-all duration-300 px-5 py-3 rounded-2xl bg-surface-800 border border-rose-500/50 shadow-2xl flex items-center space-x-3 text-sm font-semibold text-white';
  } else {
    toastIcon.innerHTML = `<span class="text-cyan-400 font-bold">ℹ</span>`;
    toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-0 opacity-100 transition-all duration-300 px-5 py-3 rounded-2xl bg-surface-800 border border-surface-600 shadow-2xl flex items-center space-x-3 text-sm font-semibold text-white';
  }

  setTimeout(() => {
    toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none px-5 py-3 rounded-2xl bg-surface-700';
  }, 3500);
}
