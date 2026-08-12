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
    // 🧭 Bind de navegação das abas do menu lateral
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
            // Auto-fecha sidebar no mobile após navegar
            closeSidebarMobile();
        });
    });
    // Menu mobile (toggle) com backdrop
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('active', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
    }
    if (backdrop) {
        backdrop.addEventListener('click', closeSidebarMobile);
    }
    // Swipe to close on mobile (right-to-left swipe on sidebar edge)
    if (sidebar) {
        let touchStartX = 0;
        sidebar.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        sidebar.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const delta = touchEndX - touchStartX;
            if (delta < -50) closeSidebarMobile();
        }, { passive: true });
    }

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

function closeSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
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
    // Scroll to top ao trocar de página no mobile
    if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

    // Hero date
    const heroDate = document.getElementById('heroDate');
    if (heroDate) {
        heroDate.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // Total recebido no mês (badge do gráfico)
    const revenueTotal = document.getElementById('revenueTotal');
    if (revenueTotal) {
        const totalMes = paid.reduce((s, r) => s + Number(r.valorTotal || 0), 0);
        revenueTotal.textContent = formatCurrency(totalMes);
    }

    renderRecentContracts(contracts);
    renderDueSoon(receipts);
    renderRevenueChart(receipts);
}

function renderRecentContracts(contracts) {
    const container = document.getElementById('recentContracts');
    const recent = [...contracts].sort((a,b) => new Date(b.createdAt || 0)-new Date(a.createdAt || 0)).slice(0,5);
    if (!recent.length) {
        container.innerHTML = `<div class="dash-empty"><i class="fas fa-file-contract"></i><p>Nenhum contrato ainda</p><button class="btn btn-primary btn-sm" onclick="navigateTo('contracts')"><i class="fas fa-plus"></i> Criar</button></div>`;
        return;
    }
    container.innerHTML = recent.map(c => {
        const t = DB.getTenant(c.tenantId);
        const stClass = c.status === 'ativo' ? 'st-active' : 'st-inactive';
        return `
        <div class="dash-list-item">
            <div class="dli-icon"><i class="fas fa-home"></i></div>
            <div class="dli-main">
                <span class="dli-title">${escapeHtml(t?.nome || c.tenantNome || '—')}</span>
                <span class="dli-sub">${escapeHtml(c.imovelEndereco || c.imovel_endereco || '')}</span>
            </div>
            <div class="dli-value">
                <span class="dli-amount">${formatCurrency(c.valorTotal || c.valor_total || 0)}</span>
                <span class="dli-status ${stClass}">${c.status}</span>
            </div>
        </div>`;
    }).join('');
}

function renderDueSoon(receipts) {
    const container = document.getElementById('dueSoon');
    const due = receipts
        .filter(r => r.status === 'pendente' || r.status === 'atrasado')
        .sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento))
        .slice(0,5);
    if (!due.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Tudo em dia! 🎉</p></div>`;
        return;
    }
    container.innerHTML = due.map(r => {
        const t = DB.getTenant(r.tenantId);
        const overdue = r.status === 'atrasado';
        const daysText = overdue ? '⚠️ Vencido' : formatDate(r.vencimento);
        return `
        <div class="dash-list-item ${overdue ? 'overdue' : ''}">
            <div class="dli-icon ${overdue ? 'dli-icon-warn' : ''}"><i class="fas ${overdue ? 'fa-exclamation-triangle' : 'fa-calendar'}"></i></div>
            <div class="dli-main">
                <span class="dli-title">${escapeHtml(t?.nome || r.tenantNome || '—')}</span>
                <span class="dli-sub">${daysText}</span>
            </div>
            <div class="dli-value">
                <span class="dli-amount">${formatCurrency(r.valorTotal)}</span>
                <span class="dli-status ${overdue ? 'st-late' : 'st-pending'}">${r.status}</span>
            </div>
        </div>`;
    }).join('');
}

function renderRevenueChart(receipts) {
    const container = document.getElementById('revenueChart');
    if (!container) return;

    // Destrói instância anterior de forma segura
    if (window.revenueChart && typeof window.revenueChart.destroy === 'function') {
        window.revenueChart.destroy();
    }

    // Se Chart.js não estiver disponível, mostra placeholder
    if (!window.Chart) {
        container.innerHTML = '<div class="chart-placeholder"><i class="fas fa-chart-bar"></i><p>Gráfico indisponível</p></div>';
        return;
    }

    // Garante que haja um <canvas> dentro do container (Chart.js exige canvas)
    container.innerHTML = '<canvas></canvas>';
    const canvas = container.querySelector('canvas');

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

    try {
        window.revenueChart = new Chart(canvas, {
            type: 'bar',
            data: { labels: months, datasets: [{ label: 'Recebido (R$)', data: values, backgroundColor: 'rgba(0, 201, 167, 0.7)', borderColor: '#00c9a7', borderWidth: 1, borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#6b6b8a', callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.04)' } }, x: { ticks: { color: '#6b6b8a' }, grid: { display: false } } } }
        });
    } catch (e) {
        console.error('Falha ao criar o gráfico:', e);
        container.innerHTML = '<div class="chart-placeholder"><i class="fas fa-chart-bar"></i><p>Gráfico indisponível</p></div>';
    }
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
