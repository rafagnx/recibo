// ============================================================
// 💾 SUPABASE DB — Cloud Database Layer
// Substitui localStorage pelo Supabase PostgreSQL
// ============================================================

const SupabaseDB = {
    // ==================== INIT ====================
    _client: null,
    _ready: false,

    async init(url, key) {
        if (this._ready) return true;
        
        if (!url || url === 'YOUR_SUPABASE_URL') {
            const config = getSupabaseConfig();
            if (!config) return false;
            url = config.url;
            key = config.key;
        }
        
        const client = initSupabase(url, key);
        if (!client) return false;
        
        this._client = client;
        this._ready = true;
        saveSupabaseConfig(url, key);
        
        // Auto-migrate: se tiver dados no localStorage, migra pro Supabase
        await this._autoMigrate();
        
        return true;
    },

    isReady() {
        return this._ready && !!this._client;
    },

    // ==================== AUTO-MIGRATION ====================
    async _autoMigrate() {
        const migrated = localStorage.getItem('recibo_migrated_supabase');
        if (migrated) return;

        // Check if we have localStorage data to migrate
        const localOwner = localStorage.getItem('recibo_owner');
        
        try {
            // Check if supabase already has data
            const { data: ownersData } = await this._client
                .from('owners')
                .select('id')
                .limit(1);
            
            const hasSupabaseData = ownersData && ownersData.length > 0;
            
            if (hasSupabaseData && !localOwner) {
                // Supabase has data but local is empty → sync DOWN
                localStorage.setItem('recibo_migrated_supabase', 'true');
                await this._syncDown();
                return;
            }

            if (hasSupabaseData) {
                // Already has data, no need to migrate up
                localStorage.setItem('recibo_migrated_supabase', 'true');
                return;
            }

            // ⬇️ Only reaches here if Supabase is empty AND local has data
            // Migrate owner
            if (localOwner) {
                const owner = JSON.parse(localOwner);
                if (owner.name) {
                    // Can't insert if empty — update the existing row
                    const { data: existingOwners } = await this._client
                        .from('owners')
                        .select('id')
                        .limit(1);
                    if (existingOwners && existingOwners.length > 0) {
                        await this._client
                            .from('owners')
                            .update({ name: owner.name, cpf: owner.cpf || '', beneficiary: owner.beneficiary || '' })
                            .eq('id', existingOwners[0].id);
                    }
                }
            }

            // Migrate tenants
            const localTenants = localStorage.getItem('recibo_tenants');
            if (localTenants) {
                const tenants = JSON.parse(localTenants);
                for (const t of tenants) {
                    await this._client.from('tenants').insert({
                        id: t.id, nome: t.nome, cpf: t.cpf || '',
                        telefone: t.telefone || '', email: t.email || ''
                    });
                }
            }

            // Migrate contracts
            const localContracts = localStorage.getItem('recibo_contracts');
            if (localContracts) {
                const contracts = JSON.parse(localContracts);
                for (const c of contracts) {
                    const mapped = {
                        id: c.id, tenant_id: c.tenantId,
                        imovel_endereco: c.imovelEndereco,
                        valor_aluguel: c.valorAluguel || 0,
                        valor_condominio: c.valorCondominio || 0,
                        valor_iptu: c.valorIPTU || 0,
                        valor_garagem: c.valorGaragem || 0,
                        valor_total: c.valorTotal || 0,
                        dia_vencimento: c.diaVencimento || 5,
                        data_inicio: c.dataInicio || null,
                        data_fim: c.dataFim || null,
                        status: c.status || 'ativo'
                    };
                    await this._client.from('contracts').insert(mapped);
                }
            }

            // Migrate receipts
            const localReceipts = localStorage.getItem('recibo_receipts');
            if (localReceipts) {
                const receipts = JSON.parse(localReceipts);
                for (const r of receipts) {
                    const mapped = {
                        id: r.id, contract_id: r.contractId, tenant_id: r.tenantId,
                        numero: r.numero || 1, year: r.year, month: r.month,
                        competencia: r.competencia || `${String(r.month + 1).padStart(2, '0')}/${r.year}`,
                        valor_aluguel: r.valorAluguel || 0,
                        valor_condominio: r.valorCondominio || 0,
                        valor_iptu: r.valorIPTU || 0,
                        valor_garagem: r.valorGaragem || 0,
                        valor_total: r.valorTotal || 0,
                        vencimento: r.vencimento || null,
                        status: r.status || 'pendente',
                        data_emissao: r.dataEmissao || new Date().toISOString().split('T')[0],
                        data_pagamento: r.dataPagamento || null
                    };
                    await this._client.from('receipts').insert(mapped);
                }
            }

            localStorage.setItem('recibo_migrated_supabase', 'true');
            console.log('✅ Dados migrados do localStorage para Supabase!');
        } catch (e) {
            console.error('❌ Erro na migração:', e);
        }
    },

    // ==================== SYNC DOWN (Supabase → localStorage) ====================
    async _syncDown() {
        try {
            // Sync owner
            const { data: owners } = await this._client
                .from('owners')
                .select('*')
                .limit(1);
            if (owners && owners.length > 0) {
                const o = owners[0];
                localStorage.setItem('recibo_owner', JSON.stringify({
                    name: o.name || '', cpf: o.cpf || '', beneficiary: o.beneficiary || ''
                }));
            }

            // Sync tenants
            const { data: tenants } = await this._client
                .from('tenants')
                .select('*');
            if (tenants && tenants.length > 0) {
                localStorage.setItem('recibo_tenants', JSON.stringify(tenants.map(t => ({
                    id: t.id, nome: t.nome, cpf: t.cpf || '',
                    telefone: t.telefone || '', email: t.email || ''
                }))));
            }

            // Sync contracts
            const { data: contracts } = await this._client
                .from('contracts')
                .select('*');
            if (contracts && contracts.length > 0) {
                localStorage.setItem('recibo_contracts', JSON.stringify(contracts.map(c => ({
                    id: c.id, tenantId: c.tenant_id,
                    imovelEndereco: c.imovel_endereco,
                    imovelTipo: c.imovel_tipo || 'residencial',
                    valorAluguel: c.valor_aluguel,
                    valorCondominio: c.valor_condominio || 0,
                    valorIPTU: c.valor_iptu || 0,
                    valorGaragem: c.valor_garagem || 0,
                    valorTotal: c.valor_total,
                    diaVencimento: c.dia_vencimento || 5,
                    dataInicio: c.data_inicio || null,
                    dataFim: c.data_fim || null,
                    status: c.status || 'ativo'
                }))));
            }

            // Sync receipts
            const { data: receipts } = await this._client
                .from('receipts')
                .select('*');
            if (receipts && receipts.length > 0) {
                localStorage.setItem('recibo_receipts', JSON.stringify(receipts.map(r => ({
                    id: r.id, contractId: r.contract_id, tenantId: r.tenant_id,
                    numero: r.numero || 1, year: r.year, month: r.month,
                    competencia: r.competencia,
                    valorAluguel: r.valor_aluguel,
                    valorCondominio: r.valor_condominio || 0,
                    valorIPTU: r.valor_iptu || 0,
                    valorGaragem: r.valor_garagem || 0,
                    valorTotal: r.valor_total,
                    vencimento: r.vencimento || null,
                    status: r.status || 'pendente',
                    dataEmissao: r.data_emissao,
                    dataPagamento: r.data_pagamento || null
                }))));
            }

            console.log('✅ Dados sincronizados do Supabase para localStorage!');
        } catch (e) {
            console.error('❌ Erro na sincronização:', e);
        }
    },

    // ==================== OWNER ====================
    async getOwnerData() {
        if (!this.isReady()) return JSON.parse(localStorage.getItem('recibo_owner') || '{"name":"","cpf":"","beneficiary":""}');
        const { data } = await this._client.from('owners').select('*').limit(1).single();
        if (data) return { name: data.name || '', cpf: data.cpf || '', beneficiary: data.beneficiary || '' };
        return { name: '', cpf: '', beneficiary: '' };
    },

    async saveOwnerData(ownerData) {
        if (!this.isReady()) { localStorage.setItem('recibo_owner', JSON.stringify(ownerData)); return; }
        const { data: existing } = await this._client.from('owners').select('id').limit(1);
        if (existing && existing.length > 0) {
            await this._client.from('owners').update(ownerData).eq('id', existing[0].id);
        } else {
            await this._client.from('owners').insert(ownerData);
        }
    },

    // ==================== TENANTS ====================
    async getTenants() {
        if (!this.isReady()) return JSON.parse(localStorage.getItem('recibo_tenants') || '[]');
        const { data } = await this._client.from('tenants').select('*').order('created_at', { ascending: false });
        return data || [];
    },

    async getTenant(id) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_tenants') || '[]');
            return list.find(t => t.id === id) || null;
        }
        const { data } = await this._client.from('tenants').select('*').eq('id', id).single();
        return data || null;
    },

    async addTenant(tenant) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_tenants') || '[]');
            tenant.id = DB.generateId();
            tenant.createdAt = new Date().toISOString();
            list.push(tenant);
            localStorage.setItem('recibo_tenants', JSON.stringify(list));
            return tenant;
        }
        const id = DB.generateId();
        const { data } = await this._client.from('tenants').insert({
            id, nome: tenant.nome, cpf: tenant.cpf || '',
            telefone: tenant.telefone || '', email: tenant.email || ''
        }).select().single();
        return data || { ...tenant, id };
    },

    async updateTenant(id, updates) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_tenants') || '[]');
            const idx = list.findIndex(t => t.id === id);
            if (idx === -1) return null;
            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('recibo_tenants', JSON.stringify(list));
            return list[idx];
        }
        const { data } = await this._client.from('tenants').update(updates).eq('id', id).select().single();
        return data;
    },

    async deleteTenant(id) {
        if (!this.isReady()) {
            const docs = DB.getTenantDocs(id);
            docs.forEach(d => DB.deleteDocument(d.id));
            const list = JSON.parse(localStorage.getItem('recibo_tenants') || '[]').filter(t => t.id !== id);
            localStorage.setItem('recibo_tenants', JSON.stringify(list));
            return;
        }
        await this._client.from('tenants').delete().eq('id', id);
    },

    // ==================== CONTRACTS ====================
    async getContracts() {
        if (!this.isReady()) return JSON.parse(localStorage.getItem('recibo_contracts') || '[]');
        const { data } = await this._client.from('contracts').select('*').order('created_at', { ascending: false });
        return (data || []).map(c => this._mapContractFromDB(c));
    },

    async getContract(id) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_contracts') || '[]');
            return list.find(c => c.id === id) || null;
        }
        const { data } = await this._client.from('contracts').select('*').eq('id', id).single();
        return data ? this._mapContractFromDB(data) : null;
    },

    async addContract(contract) {
        const id = DB.generateId();
        const mapped = {
            id, tenant_id: contract.tenantId,
            imovel_endereco: contract.imovelEndereco,
            valor_aluguel: contract.valorAluguel || 0,
            valor_condominio: contract.valorCondominio || 0,
            valor_iptu: contract.valorIPTU || 0,
            valor_garagem: contract.valorGaragem || 0,
            valor_total: contract.valorTotal || 0,
            dia_vencimento: contract.diaVencimento || 5,
            data_inicio: contract.dataInicio || null,
            data_fim: contract.dataFim || null,
            status: contract.status || 'ativo'
        };

        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_contracts') || '[]');
            contract.id = id;
            contract.createdAt = new Date().toISOString();
            list.push(contract);
            localStorage.setItem('recibo_contracts', JSON.stringify(list));
            return contract;
        }

        const { data } = await this._client.from('contracts').insert(mapped).select().single();
        return data ? this._mapContractFromDB(data) : contract;
    },

    async updateContract(id, updates) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_contracts') || '[]');
            const idx = list.findIndex(c => c.id === id);
            if (idx === -1) return null;
            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('recibo_contracts', JSON.stringify(list));
            return list[idx];
        }
        const { data } = await this._client.from('contracts').update(updates).eq('id', id).select().single();
        return data ? this._mapContractFromDB(data) : null;
    },

    async deleteContract(id) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_contracts') || '[]').filter(c => c.id !== id);
            localStorage.setItem('recibo_contracts', JSON.stringify(list));
            const receipts = JSON.parse(localStorage.getItem('recibo_receipts') || '[]').filter(r => r.contractId !== id);
            localStorage.setItem('recibo_receipts', JSON.stringify(receipts));
            return;
        }
        await this._client.from('contracts').delete().eq('id', id);
    },

    async getContractsByTenant(tenantId) {
        if (!this.isReady()) {
            return JSON.parse(localStorage.getItem('recibo_contracts') || '[]').filter(c => c.tenantId === tenantId);
        }
        const { data } = await this._client.from('contracts').select('*').eq('tenant_id', tenantId);
        return (data || []).map(c => this._mapContractFromDB(c));
    },

    // ==================== RECEIPTS ====================
    async getReceipts() {
        if (!this.isReady()) return JSON.parse(localStorage.getItem('recibo_receipts') || '[]');
        const { data } = await this._client.from('receipts').select('*').order('year', { ascending: false }).order('month', { ascending: false });
        return (data || []).map(r => this._mapReceiptFromDB(r));
    },

    async getReceipt(id) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_receipts') || '[]');
            return list.find(r => r.id === id) || null;
        }
        const { data } = await this._client.from('receipts').select('*').eq('id', id).single();
        return data ? this._mapReceiptFromDB(data) : null;
    },

    async addReceipt(receipt) {
        const id = DB.generateId();
        const maxNum = await this._getNextReceiptNumber();
        
        const mapped = {
            id, contract_id: receipt.contractId, tenant_id: receipt.tenantId,
            numero: maxNum, year: receipt.year, month: receipt.month,
            competencia: receipt.competencia || `${String(receipt.month + 1).padStart(2, '0')}/${receipt.year}`,
            valor_aluguel: receipt.valorAluguel || 0,
            valor_condominio: receipt.valorCondominio || 0,
            valor_iptu: receipt.valorIPTU || 0,
            valor_garagem: receipt.valorGaragem || 0,
            valor_total: receipt.valorTotal || 0,
            vencimento: receipt.vencimento || null,
            status: receipt.status || 'pendente',
            data_emissao: receipt.dataEmissao || new Date().toISOString().split('T')[0],
            data_pagamento: receipt.dataPagamento || null
        };

        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_receipts') || '[]');
            receipt.id = id;
            receipt.numero = list.length + 1;
            receipt.createdAt = new Date().toISOString();
            list.push(receipt);
            localStorage.setItem('recibo_receipts', JSON.stringify(list));
            return receipt;
        }

        const { data } = await this._client.from('receipts').insert(mapped).select().single();
        return data ? this._mapReceiptFromDB(data) : receipt;
    },

    async updateReceipt(id, updates) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_receipts') || '[]');
            const idx = list.findIndex(r => r.id === id);
            if (idx === -1) return null;
            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem('recibo_receipts', JSON.stringify(list));
            return list[idx];
        }
        const { data } = await this._client.from('receipts').update(updates).eq('id', id).select().single();
        return data ? this._mapReceiptFromDB(data) : null;
    },

    async deleteReceipt(id) {
        if (!this.isReady()) {
            const list = JSON.parse(localStorage.getItem('recibo_receipts') || '[]');
            localStorage.setItem('recibo_receipts', JSON.stringify(list.filter(r => r.id !== id)));
            return true;
        }
        const { error } = await this._client.from('receipts').delete().eq('id', id);
        if (error) {
            console.error('Erro ao excluir recibo no Supabase:', error);
            return false;
        }
        // Também remove do localStorage para manter consistência
        const list = JSON.parse(localStorage.getItem('recibo_receipts') || '[]');
        localStorage.setItem('recibo_receipts', JSON.stringify(list.filter(r => r.id !== id)));
        return true;
    },

    async _getNextReceiptNumber() {
        const { data } = await this._client
            .from('receipts')
            .select('numero')
            .order('numero', { ascending: false })
            .limit(1);
        return (data && data.length > 0) ? data[0].numero + 1 : 1;
    },

    // ==================== MAP HELPERS ====================
    _mapContractFromDB(c) {
        return {
            id: c.id, tenantId: c.tenant_id,
            imovelEndereco: c.imovel_endereco,
            valorAluguel: c.valor_aluguel,
            valorCondominio: c.valor_condominio,
            valorIPTU: c.valor_iptu,
            valorGaragem: c.valor_garagem,
            valorTotal: c.valor_total,
            diaVencimento: c.dia_vencimento,
            dataInicio: c.data_inicio,
            dataFim: c.data_fim,
            status: c.status,
            createdAt: c.created_at
        };
    },

    _mapReceiptFromDB(r) {
        return {
            id: r.id, contractId: r.contract_id, tenantId: r.tenant_id,
            numero: r.numero, year: r.year, month: r.month,
            competencia: r.competencia,
            valorAluguel: Number(r.valor_aluguel),
            valorCondominio: Number(r.valor_condominio),
            valorIPTU: Number(r.valor_iptu),
            valorGaragem: Number(r.valor_garagem),
            valorTotal: Number(r.valor_total),
            vencimento: r.vencimento,
            status: r.status,
            dataEmissao: r.data_emissao,
            dataPagamento: r.data_pagamento,
            createdAt: r.created_at
        };
    },

    // ==================== DOCUMENTS ====================
    async getTenantDocs(tenantId) {
        if (!this.isReady()) return DB._getAllDocs().filter(d => d.tenantId === tenantId);
        const { data } = await this._client.from('documents').select('*').eq('tenant_id', tenantId);
        return (data || []).map(d => ({
            id: d.id, tenantId: d.tenant_id,
            name: d.name, type: d.type, size: d.size,
            data: d.data, uploadedAt: d.uploaded_at
        }));
    },

    async addDocument(file, tenantId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!this.isReady()) {
                    const docs = DB._getAllDocs();
                    const doc = {
                        id: DB.generateId(), tenantId,
                        name: file.name, type: file.type, size: file.size,
                        data: e.target.result, uploadedAt: new Date().toISOString()
                    };
                    docs.push(doc);
                    DB._saveDocs(docs);
                    resolve(doc);
                    return;
                }
                const { data } = await this._client.from('documents').insert({
                    tenant_id: tenantId, name: file.name,
                    type: file.type, size: file.size, data: e.target.result
                }).select().single();
                resolve(data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async deleteDocument(docId) {
        if (!this.isReady()) {
            const docs = DB._getAllDocs().filter(d => d.id !== docId);
            DB._saveDocs(docs);
            return;
        }
        await this._client.from('documents').delete().eq('id', docId);
    },

    async getDocument(id) {
        if (!this.isReady()) return DB._getAllDocs().find(d => d.id === id) || null;
        const { data } = await this._client.from('documents').select('*').eq('id', id).single();
        return data;
    },

    // ==================== BACKUP ====================
    async exportBackup() {
        if (!this.isReady()) return DB.exportBackup();
        const owner = await this.getOwnerData();
        const tenants = await this.getTenants();
        const contracts = await this.getContracts();
        const receipts = await this.getReceipts();
        return { version: '2.0.0', exportedAt: new Date().toISOString(), owner, tenants, documents: [], contracts, receipts };
    },

    async importBackup(data) {
        if (!data.contracts || !data.receipts || !data.tenants) {
            throw new Error('Formato de backup inválido');
        }
        if (!this.isReady()) {
            if (data.owner) localStorage.setItem('recibo_owner', JSON.stringify(data.owner));
            localStorage.setItem('recibo_tenants', JSON.stringify(data.tenants));
            localStorage.setItem('recibo_contracts', JSON.stringify(data.contracts));
            localStorage.setItem('recibo_receipts', JSON.stringify(data.receipts));
            return;
        }
        // For supabase, just overwrite by deleting all and re-inserting
        await this._client.from('owners').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await this._client.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await this._client.from('contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await this._client.from('receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (data.owner) await this.saveOwnerData(data.owner);
        for (const t of data.tenants) await this.addTenant(t);
        for (const c of data.contracts) await this.addContract(c);
        for (const r of data.receipts) {
            const mapped = {
                contractId: r.contractId, tenantId: r.tenantId,
                year: r.year, month: r.month, competencia: r.competencia,
                valorAluguel: r.valorAluguel, valorCondominio: r.valorCondominio,
                valorIPTU: r.valorIPTU, valorGaragem: r.valorGaragem,
                valorTotal: r.valorTotal, vencimento: r.vencimento,
                status: r.status, dataEmissao: r.dataEmissao, dataPagamento: r.dataPagamento
            };
            await this._client.from('receipts').insert({
                numero: r.numero, contract_id: mapped.contractId, tenant_id: mapped.tenantId,
                year: mapped.year, month: mapped.month, competencia: mapped.competencia,
                valor_aluguel: mapped.valorAluguel, valor_condominio: mapped.valorCondominio,
                valor_iptu: mapped.valorIPTU, valor_garagem: mapped.valorGaragem,
                valor_total: mapped.valorTotal, vencimento: mapped.vencimento,
                status: mapped.status, data_emissao: mapped.dataEmissao, data_pagamento: mapped.dataPagamento
            });
        }
    },

    async clearAll() {
        if (!confirm('Tem certeza que deseja limpar TODOS os dados?')) return false;
        if (!this.isReady()) {
            localStorage.removeItem('recibo_owner');
            localStorage.removeItem('recibo_tenants');
            localStorage.removeItem('recibo_documents');
            localStorage.removeItem('recibo_contracts');
            localStorage.removeItem('recibo_receipts');
            return true;
        }
        await this._client.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await this._client.from('receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await this._client.from('contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await this._client.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return true;
    },

    // ==================== GENERATE MONTHLY ====================
    async generateMonthReceipts(year, month) {
        const contracts = await this.getContracts();
        const contractsAtivos = contracts.filter(c => c.status === 'ativo');
        const receipts = await this.getReceipts();
        const created = [];

        for (const contract of contractsAtivos) {
            const exists = receipts.some(r =>
                r.contractId === contract.id && r.year === year && r.month === month
            );
            if (!exists) {
                const dueDate = new Date(year, month, contract.diaVencimento);
                const r = await this.addReceipt({
                    contractId: contract.id,
                    tenantId: contract.tenantId,
                    year, month,
                    competencia: `${String(month + 1).padStart(2, '0')}/${year}`,
                    valorAluguel: contract.valorAluguel,
                    valorCondominio: contract.valorCondominio || 0,
                    valorIPTU: contract.valorIPTU || 0,
                    valorGaragem: contract.valorGaragem || 0,
                    valorTotal: contract.valorTotal,
                    vencimento: dueDate.toISOString().split('T')[0],
                    status: 'pendente',
                    dataEmissao: new Date().toISOString().split('T')[0],
                    dataPagamento: null
                });
                created.push(r);
            }
        }
        return created;
    }
};
