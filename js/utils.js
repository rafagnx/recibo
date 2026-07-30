/* ============================================================
   🔧 Utils v2 — Helper Functions / Extenso por extenso
   ============================================================ */

// ==================== CURRENCY ====================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

// ==================== DATES ====================
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateBR(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SHORT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function getMonthName(m) { return MONTHS[m]; }
function getShortMonthName(m) { return SHORT_MONTHS[m]; }

// ==================== INPUT FORMATTING ====================
function formatPhone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length <= 2) v = `(${v}`;
    else if (v.length <= 7) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length <= 11) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`;
    input.value = v;
}

function formatCPF(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length <= 3) {}
    else if (v.length <= 6) v = `${v.slice(0,3)}.${v.slice(3)}`;
    else if (v.length <= 9) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    else v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9,11)}`;
    input.value = v;
}

// ==================== COMPUTATION ====================
function calculateTotal(aluguel, condominio, iptu, garagem) {
    return (parseFloat(aluguel)||0)+(parseFloat(condominio)||0)+(parseFloat(iptu)||0)+(parseFloat(garagem)||0);
}

function parseMoneyInput(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

function getStatusClass(status) {
    const map = { ativo:'ativo', encerrado:'encerrado', pago:'pago', pendente:'pendente', atrasado:'atrasado' };
    return map[status] || 'pendente';
}

function isOverdue(vencimento, status) {
    if (status !== 'pendente') return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(vencimento+'T12:00:00');
    return due < today;
}

// ==================== FORMAT RECEIPT NUMBER ====================
function formatReceiptNumber(num) {
    return String(num).padStart(4, '0');
}

// ==================== VALUE BY EXTENSIVE (Brazilian Portuguese) ====================
const UNIDADES = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
const DEZENAS = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
const DEZ_ONZE = ['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
const CENTENAS = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];

function numeroPorExtenso(n) {
    if (n === 0) return 'zero';
    if (n === 1) return 'um';
    
    let inteiro = Math.floor(n);
    let centavos = Math.round((n - inteiro) * 100);
    
    let ext = '';
    
    // Milhões
    if (inteiro >= 1000000) {
        let milhao = Math.floor(inteiro / 1000000);
        if (milhao === 1) ext += 'um milhão';
        else ext += numeroAte999(milhao) + ' milhões';
        inteiro %= 1000000;
        if (inteiro > 0) ext += ' e ';
    }
    
    // Mil
    if (inteiro >= 1000) {
        let milhar = Math.floor(inteiro / 1000);
        if (milhar === 1) ext += 'mil';
        else ext += numeroAte999(milhar) + ' mil';
        inteiro %= 1000;
        if (inteiro > 0) ext += ' e ';
    }
    
    ex246 = numeroAte999(inteiro);
    if (ex246) ext += ex246;
    
    if (centavos > 0) {
        ext += ' reais e ' + numeroAte999(centavos);
        if (centavos === 1) ext += ' centavo';
        else ext += ' centavos';
    } else {
        if (n >= 2 || (Math.floor(n) >= 2)) ext += ' reais';
        else if (ext) ext += ' real';
    }
    
    return ext.charAt(0).toUpperCase() + ext.slice(1);
}

function numeroAte999(n) {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    
    let ext = '';
    let c = Math.floor(n / 100);
    let d = Math.floor((n % 100) / 10);
    let u = n % 10;
    
    if (c > 0) {
        ext += CENTENAS[c];
        if (n % 100 > 0) ext += ' e ';
    }
    
    let resto = n % 100;
    if (resto > 0) {
        if (resto < 10) ext += UNIDADES[resto];
        else if (resto < 20) ext += DEZ_ONZE[resto - 10];
        else {
            ext += DEZENAS[d];
            if (u > 0) ext += ' e ' + UNIDADES[u];
        }
    }
    
    return ext;
}

// ==================== UI HELPERS ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateCurrentDate() {
    const el = document.getElementById('currentDate');
    if (!el) return;
    const now = new Date();
    const days = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    el.textContent = `${days[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
}
