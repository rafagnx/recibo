// ============================================================
// 🔌 Supabase Client — Config
// ============================================================
// 🚀 INSTRUÇÕES DE SETUP:
// 1. Crie uma conta em https://supabase.com
// 2. Crie um novo projeto
// 3. Vá em Settings > API e copie a URL e a Anon Key
// 4. Cole abaixo no SUPABASE_URL e SUPABASE_ANON_KEY
// 5. Vá em SQL Editor e cole o conteúdo de supabase/migrations/001_init.sql
// 6. Rode o script
// ============================================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Inicializa o cliente Supabase (será usado globalmente)
let supabaseClient = null;

function initSupabase(url, key) {
    if (!url || url === 'YOUR_SUPABASE_URL') {
        console.warn('⚠️ Supabase não configurado. Configure SUPABASE_URL e SUPABASE_ANON_KEY.');
        return null;
    }
    supabaseClient = supabase.createClient(url, key);
    return supabaseClient;
}

// Tenta carregar do localStorage (configuração persistida)
function getSupabaseConfig() {
    const saved = localStorage.getItem('recibo_supabase_config');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            return config;
        } catch (e) {
            return null;
        }
    }
    return null;
}

function saveSupabaseConfig(url, key) {
    localStorage.setItem('recibo_supabase_config', JSON.stringify({ url, key }));
}

// Auto-init on load
const config = getSupabaseConfig();
if (config) {
    initSupabase(config.url, config.key);
}
