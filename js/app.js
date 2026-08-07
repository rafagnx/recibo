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
        container.innerHTML = '<p class="empty-state">Nenhum contrato cadastrado</p>';
        return;
    }
    container.innerHTML = recent.map(c => `
        <div class="recent-item">
            <span class="recent-tenant">${c.tenantNome || '—'}</span>
            <span class="recent-address">${c.imovelEndereco || c.imovel_endereco || '—'}</span>
            <span class="recent-value">R$ ${Number(c.valorTotal || c.valor_total || 0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
    `).join('');
}

function renderDueSoon(receipts) {
    const container = document.getElementById('dueSoon');
    const now = new Date();
    const due = receipts
        .filter(r => r.status === 'pendente' || r.status === 'atrasado')
        .sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento))
        .slice(0,5);
    if (!due.length) {
        container.innerHTML = '<p class="empty-state">Nenhum vencimento próximo</p>';
        return;
    }
    container.innerHTML = due.map(r => `
        <div class="due-item ${r.status === 'atrasado' ? 'overdue' : ''}">
            <span class="due-tenant">${r.tenantNome || '—'}</span>
            <span class="due-date">${new Date(r.vencimento).toLocaleDateString('pt-BR')}</span>
            <span class="due-value">R$ ${Number(r.valorTotal).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
            <span class="due-status">${r.status}</span>
        </div>
    `).join('');
}

function renderRevenueChart(receipts) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    const months = [];
    const values = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const monthReceipts = receipts.filter(r => r.month === m && r.year === y && r.status === 'pago');
        const total = monthReceipts.reduce((s,r) => s + Number(r.valorTotal || 0), 0);
        months.push(d.toLocaleDateString('pt-BR',{month:'short'}));
        values.push(total);
    }
    if (window.revenueChart) window.revenueChart.destroy();
    window.revenueChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: months, datasets: [{ label: 'Recebido (R$)', data: values, backgroundColor: 'rgba(0, 179, 117, 0.6)', borderColor: '#00b375', borderWidth: 1, borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } } } }
    });
}

function updateCurrentDate() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ==================== OWNER DATA — Configurações ====================
// Carrega os dados do proprietário e preenche os campos de Configurações
function loadOwnerData() {
    const owner = DB.getOwnerData();
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };
    setVal('ownerName', owner.name);
    setVal('ownerCPF', owner.cpf);
    setVal('ownerBeneficiary', owner.beneficiary);
}

// Salva os dados do proprietário a partir dos campos de Configurações
function saveOwnerData() {
    const data = {
        name: document.getElementById('ownerName').value.trim(),
        cpf: document.getElementById('ownerCPF').value.trim(),
        beneficiary: document.getElementById('ownerBeneficiary').value.trim()
    };
    DB.saveOwnerData(data);
    if (SupabaseDB.isReady()) SupabaseDB.saveOwnerData(data);
}

// ==================== SETTINGS — Supabase ====================
function saveSupabaseConfig() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    if (!url || !key) { showToast('Preencha URL e Key', 'error'); return; }
    localStorage.setItem('recibo_supabase_config', JSON.stringify({ url, key }));
    showToast('Configuração salva!', 'success');
}

async function testSupabaseConnection() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    if (!url || !key) { showToast('Preencha URL e Key', 'error'); return; }
    document.getElementById('supabaseStatus').textContent = '⏳ Testando...';
    document.getElementById('supabaseStatus').style.color = '#f59e0b';
    const client = initSupabase(url, key);
    if (!client) { document.getElementById('supabaseStatus').textContent = '❌ Falha ao criar cliente'; document.getElementById('supabaseStatus').style.color = '#ef4444'; return; }
    try {
        const { data, error } = await client.from('owners').select('id').limit(1);
        if (error) throw error;
        document.getElementById('supabaseStatus').textContent = '✅ Conectado com sucesso!';
        document.getElementById('supabaseStatus').style.color = '#22c55e';
        showToast('Conexão OK', 'success');
    } catch (e) {
        document.getElementById('supabaseStatus').textContent = '❌ Erro: ' + e.message;
        document.getElementById('supabaseStatus').style.color = '#ef4444';
        showToast('Erro na conexão', 'error');
    }
}

async function connectSupabase() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    if (!url || !key) { showToast('Preencha URL e Key', 'error'); return; }
    document.getElementById('supabaseStatus').textContent = '⏳ Conectando...';
    document.getElementById('supabaseStatus').style.color = '#f59e0b';
    const ready = await SupabaseDB.init(url, key);
    if (ready) {
        document.getElementById('supabaseStatus').textContent = '☁️ Conectado e sincronizado!';
        document.getElementById('supabaseStatus').style.color = '#22c55e';
        showToast('Conectado ao Supabase!', 'success');
        loadOwnerData();
        populateTenantSelect();
        updateDashboard();
        renderTenants();
        renderContracts();
        populateMonthFilter();
        renderReceipts();
    } else {
        document.getElementById('supabaseStatus').textContent = '❌ Falha ao conectar';
        document.getElementById('supabaseStatus').style.color = '#ef4444';
        showToast('Falha ao conectar', 'error');
    }
}

function disconnectSupabase() {
    localStorage.removeItem('recibo_supabase_config');
    localStorage.removeItem('recibo_migrated_supabase');
    supabaseClient = null;
    SupabaseDB._client = null;
    SupabaseDB._ready = false;
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

// Force sync from Supabase to localStorage
async function forceSync() {
    if (!SupabaseDB.isReady()) {
        showToast('Supabase não conectado', 'error');
        return;
    }
    showToast('🔄 Sincronizando...', 'info');
    await SupabaseDB._syncDown();
    loadOwnerData();
    populateTenantSelect();
    updateDashboard();
    renderTenants();
    renderContracts();
    populateMonthFilter();
    renderReceipts();
    showToast('✅ Sincronizado do Supabase!', 'success');
}
