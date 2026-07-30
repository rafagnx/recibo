// Script para rodar migration SQL no Supabase PostgreSQL
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '001_init.sql'), 'utf8');
    
    const client = new Client({
        connectionString: 'postgresql://postgres:rAFA040388@@db.mohxyhnxmhkexhqapoxg.supabase.co:5432/postgres?sslmode=require',
    });

    try {
        console.log('🔄 Conectando ao banco...');
        await client.connect();
        console.log('✅ Conectado!');
        
        console.log('🔄 Executando migration...');
        await client.query(sql);
        console.log('✅ Migration executada com sucesso!');
        
        await client.end();
        console.log('🔌 Conexão fechada.');
    } catch (err) {
        console.error('❌ Erro:', err.message);
        process.exit(1);
    }
}

runMigration();
