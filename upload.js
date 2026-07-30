const fs = require('fs');
async function run() {
    const backup = JSON.parse(fs.readFileSync('C:/Users/Rafael/Downloads/Nova pasta/backup-alugueis-2026-07-30.json', 'utf8'));
    const url = 'https://mohxyhnxmhkexhqapoxg.supabase.co/rest/v1';
    const h = { 
        'apikey': 'sb_publishable_G6Oow9uVsgd3-HD3NGvyMw_l9q3GfqW',
        'Authorization': 'Bearer sb_publishable_G6Oow9uVsgd3-HD3NGvyMw_l9q3GfqW',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    // 1. Owner
    if (backup.owner) {
        const ownerRes = await fetch(`${url}/owners?limit=1`, { headers: h });
        const existingOwner = await ownerRes.json();
        if (existingOwner && existingOwner.length > 0) {
            await fetch(`${url}/owners?id=eq.${existingOwner[0].id}`, {
                method: 'PATCH',
                headers: h,
                body: JSON.stringify(backup.owner)
            });
        }
    }

    // Tenant Map
    const tenantMap = {};
    for (const t of backup.tenants) {
        const payload = { nome: t.nome, cpf: t.cpf, telefone: t.telefone, email: t.email };
        const res = await fetch(`${url}/tenants`, { method: 'POST', headers: h, body: JSON.stringify(payload) });
        const data = await res.json();
        tenantMap[t.id] = data[0].id;
        console.log(`Migrated tenant ${t.nome}`);
    }

    // Contract Map
    const contractMap = {};
    for (const c of backup.contracts) {
        const payload = {
            tenant_id: tenantMap[c.tenantId],
            imovel_endereco: c.imovelEndereco,
            valor_aluguel: c.valorAluguel,
            valor_total: c.valorTotal,
            data_inicio: c.dataInicio,
            dia_vencimento: c.diaVencimento,
            data_fim: c.dataFim,
            status: c.status
        };
        const res = await fetch(`${url}/contracts`, { method: 'POST', headers: h, body: JSON.stringify(payload) });
        const data = await res.json();
        contractMap[c.id] = data[0].id;
        console.log(`Migrated contract`);
    }

    // Receipts
    for (const r of backup.receipts) {
        const payload = {
            contract_id: contractMap[r.contractId],
            tenant_id: tenantMap[r.tenantId],
            numero: r.numero,
            year: r.year,
            month: r.month,
            competencia: r.competencia,
            valor_aluguel: r.valorAluguel,
            valor_total: r.valorTotal,
            vencimento: r.vencimento,
            status: r.status,
            data_emissao: r.dataEmissao
        };
        const res = await fetch(`${url}/receipts`, { method: 'POST', headers: h, body: JSON.stringify(payload) });
        console.log(`Migrated receipt`);
    }

    console.log("ALL DONE!");
}
run();
