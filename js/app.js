/* ============================================================
   🚀 ZEUSMIND — App Orchestrator v2
   SPA Router, Dashboard, Settings
   ============================================================ */

// ==================== AUTH ====================
const AUTH_USER = 'admin';
const AUTH_PASS = '25261020';

function doLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const error = document.getElementById('loginError');

    if (user === AUTH_USER && pass === AUTH_PASS) {
        sessionStorage.setItem('recibo_logged_in', 'true');
        document.getElementById('loginOverlay').classList.add('hidden');
        error.textContent = '';
        // Start the app
        initApp();
    } else {
        error.textContent = '❌ Usuário ou senha incorretos!';
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
    }
}

function doLogout() {
    sessionStorage.removeItem('recibo_logged_in');
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').textContent = '';
}

async function initApp() {
    updateCurrentDate();
    
    // 🔄 Auto-conecta no Supabase e sincroniza dados
    const ready = await SupabaseDB.init(
        'https://mohxyhnxmhkexhqapoxg.supabase.co',
        'sb_publishable_G6Oow9uVsgd3-HD3NGvyMw_l9q3GfqW'
    );
    if (ready) {
        console.log('☁️ Supabase conectado automaticamente');
    }
    
    loadOwnerData();
    populateTenantSelect();
    updateDashboard();
    renderTenants();
    renderContracts();
    populateMonthFilter();
    renderReceipts();
    autoGenerateMonthReceipts();
    setInterval(updateCurrentDate, 60000);
}

function autoGenerateMonthReceipts() {
    const now = new Date();
    DB.generateMonthReceipts(now.getFullYear(), now.getMonth());
}

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
    const titles = { dashboard:'Dashboard', tenants:'Inquilinos', contracts:'Contratos', receipts:'Recibos', settings:'Configurações' };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    if (page === 'dashboard') updateDashboard();
    if (page === 'tenants') renderTenants();
    if (page === 'contracts') { populateTenantSelect(); renderContracts(); }
    if (page === 'receipts') { populateMonthFilter(); renderReceipts(); }
    if (page === 'settings') loadOwnerData();
}

function updateDashboard() {
    const tenants = DB.getTenants();
    const contracts = DB.getContracts();
    const receipts = DB.getReceipts();
    const activeContracts = contracts.filter(c => c.status === 'ativo');
    const now = new Date();
    const thisMonth = receipts.filter(r => r.month === now.getMonth() && r.year === now.getFullYear());
    const paid = thisMonth.filter(r => r.status === 'pago');
    const pending = thisMonth.filter(r => r.status === 'pendente' || r.status === 'atrasado');

    document.getElementById('statTenants').textContent = tenants.length;
    document.getElementById('statActiveContracts').textContent = activeContracts.length;
    document.getElementById('statPaidReceipts').textContent = paid.length;
    document.getElementById('statPendingReceipts').textContent = pending.length;

    renderRecentContracts(contracts);
    renderDueSoon(receipts);
    renderRevenueChart(receipts);
}

function renderRecentContracts(contracts) {
    const container = document.getElementById('recentContracts');
    const recent = contracts.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
    if (!recent.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file"></i><p>Nenhum contrato ainda.</p>
            <button class="btn btn-primary" onclick="navigateTo('contracts')"><i class="fas fa-plus"></i> Criar Contrato</button></div>`;
        return;
    }
    container.innerHTML = recent.map(c => {
        const t = DB.getTenant(c.tenantId);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-color);gap:12px;">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:500;color:var(--text-primary);font-size:var(--font-size-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t?.nome||'—')}</div>
                <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.imovelEndereco||''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-weight:600;color:var(--text-primary);font-size:var(--font-size-sm);">${formatCurrency(c.valorTotal)}</div>
                <span class="status-badge ${getStatusClass(c.status)}" style="font-size:0.625rem;display:inline-block;margin-top:2px;">${c.status}</span>
            </div>
        </div>`;
    }).join('');
}

function renderDueSoon(receipts) {
    const container = document.getElementById('dueSoon');
    const now = new Date(); now.setHours(0,0,0,0);
    const pending = receipts.filter(r => r.status === 'pendente' || r.status === 'atrasado');
    const upcoming = pending.filter(r => {
        const due = new Date(r.vencimento+'T12:00:00');
        return Math.ceil((due-now)/(86400000)) <= 7 || r.status === 'atrasado';
    }).sort((a,b) => new Date(a.vencimento)-new Date(b.vencimento));

    if (!upcoming.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Tudo em dia! 🎉</p></div>`;
        return;
    }
    container.innerHTML = upcoming.slice(0,5).map(r => {
        const t = DB.getTenant(r.tenantId);
        const due = new Date(r.vencimento+'T12:00:00');
        const diff = Math.ceil((due-now)/86400000);
        const daysText = r.status==='atrasado'?'⚠️ Vencido': diff===0?'🔴 Hoje': diff===1?'🔴 Amanhã':`🟡 Em ${diff} dias`;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-color);gap:12px;">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:500;color:var(--text-primary);font-size:var(--font-size-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t?.nome||'—')}</div>
                <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${daysText}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-weight:600;color:var(--text-primary);font-size:var(--font-size-sm);">${formatCurrency(r.valorTotal)}</div>
                <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-top:2px;">${formatDate(r.vencimento)}</div>
            </div>
        </div>`;
    }).join('');
}

function renderRevenueChart(receipts) {
    const container = document.getElementById('revenueChart');
    const now = new Date();
    const months = [];
    for (let i=11; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        months.push({month:d.getMonth(), year:d.getFullYear()});
    }
    const hasData = receipts.some(r => r.status === 'pago');
    if (!hasData) {
        container.innerHTML = `<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Receita aparece aqui conforme pagamentos são registrados.</p></div>`;
        return;
    }
    const totalValues = months.map(m => receipts.filter(r=>r.month===m.month&&r.year===m.year&&r.status==='pago').reduce((s,r)=>s+r.valorTotal,0));
    const maxValue = Math.max(...totalValues, 1);
    container.innerHTML = `<div class="chart-container">${months.map((m,idx) => {
        const h = (totalValues[idx]/maxValue)*100;
        return `<div class="chart-bar-wrapper">
            <div class="chart-bar-value">${formatCurrency(totalValues[idx])}</div>
            <div class="chart-bar" style="height:${Math.max(h,4)}%"></div>
            <div class="chart-bar-label">${getShortMonthName(m.month)}/${String(m.year).slice(2)}</div>
        </div>`;
    }).join('')}</div>`;
}

// ==================== OWNER DATA ====================
function loadOwnerData() {
    const data = DB.getOwnerData();
    const nameEl = document.getElementById('ownerName');
    const cpfEl = document.getElementById('ownerCPF');
    const benEl = document.getElementById('ownerBeneficiary');
    if (nameEl) nameEl.value = data.name || '';
    if (cpfEl) cpfEl.value = data.cpf || '';
    if (benEl) benEl.value = data.beneficiary || '';
}

function saveOwnerData() {
    const data = {
        name: document.getElementById('ownerName')?.value || '',
        cpf: document.getElementById('ownerCPF')?.value || '',
        beneficiary: document.getElementById('ownerBeneficiary')?.value || ''
    };
    DB.saveOwnerData(data);
}

// ==================== BACKUP ====================
function exportBackup() {
    const data = DB.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-alugueis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportado!', 'success');
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            DB.importBackup(data);
            showToast('Backup importado!', 'success');
            initApp();
        } catch(err) {
            showToast('Erro: '+err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    if (DB.clearAll()) {
        showToast('Dados limpos.', 'info');
        initApp();
    }
}

// ==================== EVENTS ====================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('menuToggle');
        if (window.innerWidth<=768 && sidebar?.classList.contains('open') && !sidebar.contains(e.target) && !toggle?.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', (e) => { if (e.target === o) o.classList.remove('active'); });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key==='Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    });

    // Auto-login check
    if (sessionStorage.getItem('recibo_logged_in') === 'true') {
        document.getElementById('loginOverlay').classList.add('hidden');
        initApp();
    }
});

// ==================== SUPABASE SETTINGS ====================
function saveSupabaseSettings() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    const status = document.getElementById('supabaseStatus');
    if (url && key) {
        saveSupabaseConfig(url, key);
    }
}

function connectSupabase() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    const status = document.getElementById('supabaseStatus');

    if (!url || !key) {
        status.textContent = '❌ Preencha a URL e a Key primeiro!';
        status.style.color = '#ef4444';
        return;
    }

    SupabaseDB.init(url, key).then(ready => {
        if (ready) {
            status.textContent = '✅ Conectado ao Supabase!';
            status.style.color = '#22c55e';
            showToast('☁️ Supabase conectado com sucesso!', 'success');
        } else {
            status.textContent = '❌ Falha na conexão. Verifique URL e Key.';
            status.style.color = '#ef4444';
        }
    });
}

function disconnectSupabase() {
    supabaseClient = null;
    SupabaseDB._client = null;
    SupabaseDB._ready = false;
    localStorage.removeItem('recibo_supabase_config');
    document.getElementById('supabaseStatus').textContent = '🔌 Desconectado';
    document.getElementById('supabaseStatus').style.color = '#6b7280';
    showToast('Desconectado do Supabase.', 'info');
}

// Load saved supabase config on page load
function loadSupabaseConfig() {
    const config = getSupabaseConfig();
    if (config) {
        document.getElementById('supabaseUrl').value = config.url;
        document.getElementById('supabaseKey').value = config.key;
        document.getElementById('supabaseStatus').textContent = '💤 Configurado, clique em Conectar';
        document.getElementById('supabaseStatus').style.color = '#6b7280';
    }
}

// Override initApp to also load supabase config
const _origInitApp = initApp;
initApp = function() {
    loadSupabaseConfig();
    _origInitApp();
};
