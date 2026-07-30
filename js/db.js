/* ============================================================
   💾 GAIACORE — Database Layer v2
   localStorage CRUD — Tenants, Contracts, Receipts, Docs
   ============================================================ */

const DB = {
    // ==================== OWNER DATA ====================
    getOwnerData() {
        return JSON.parse(localStorage.getItem('recibo_owner') || '{"name":"","cpf":"","beneficiary":""}');
    },
    saveOwnerData(data) {
        localStorage.setItem('recibo_owner', JSON.stringify(data));
    },

    // ==================== TENANTS ====================
    getTenants() {
        return JSON.parse(localStorage.getItem('recibo_tenants') || '[]');
    },
    saveTenants(t) {
        localStorage.setItem('recibo_tenants', JSON.stringify(t));
    },
    getTenant(id) {
        return this.getTenants().find(t => t.id === id) || null;
    },
    addTenant(tenant) {
        const list = this.getTenants();
        tenant.id = this.generateId();
        tenant.createdAt = new Date().toISOString();
        list.push(tenant);
        this.saveTenants(list);
        return tenant;
    },
    updateTenant(id, updates) {
        const list = this.getTenants();
        const idx = list.findIndex(t => t.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
        this.saveTenants(list);
        return list[idx];
    },
    deleteTenant(id) {
        // Also delete associated documents
        const docs = this.getTenantDocs(id);
        docs.forEach(d => this.deleteDocument(d.id));
        const list = this.getTenants().filter(t => t.id !== id);
        this.saveTenants(list);
    },

    // ==================== DOCUMENTS (IndexedDB-like via localStorage with file metadata) ====================
    getTenantDocs(tenantId) {
        const all = this._getAllDocs();
        return all.filter(d => d.tenantId === tenantId);
    },
    _getAllDocs() {
        return JSON.parse(localStorage.getItem('recibo_documents') || '[]');
    },
    _saveDocs(docs) {
        localStorage.setItem('recibo_documents', JSON.stringify(docs));
    },
    addDocument(file, tenantId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const docs = this._getAllDocs();
                const doc = {
                    id: this.generateId(),
                    tenantId: tenantId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result, // Base64
                    uploadedAt: new Date().toISOString()
                };
                docs.push(doc);
                this._saveDocs(docs);
                resolve(doc);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    deleteDocument(docId) {
        const docs = this._getAllDocs().filter(d => d.id !== docId);
        this._saveDocs(docs);
    },
    getDocument(id) {
        return this._getAllDocs().find(d => d.id === id) || null;
    },

    // ==================== CONTRACTS ====================
    getContracts() {
        return JSON.parse(localStorage.getItem('recibo_contracts') || '[]');
    },
    saveContracts(c) {
        localStorage.setItem('recibo_contracts', JSON.stringify(c));
    },
    getContract(id) {
        return this.getContracts().find(c => c.id === id) || null;
    },
    addContract(contract) {
        const list = this.getContracts();
        contract.id = this.generateId();
        contract.createdAt = new Date().toISOString();
        list.push(contract);
        this.saveContracts(list);
        return contract;
    },
    updateContract(id, updates) {
        const list = this.getContracts();
        const idx = list.findIndex(c => c.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
        this.saveContracts(list);
        return list[idx];
    },
    deleteContract(id) {
        const list = this.getContracts().filter(c => c.id !== id);
        this.saveContracts(list);
        const receipts = this.getReceipts().filter(r => r.contractId !== id);
        this.saveReceipts(receipts);
    },
    getContractsByTenant(tenantId) {
        return this.getContracts().filter(c => c.tenantId === tenantId);
    },

    // ==================== RECEIPTS ====================
    getReceipts() {
        return JSON.parse(localStorage.getItem('recibo_receipts') || '[]');
    },
    saveReceipts(r) {
        localStorage.setItem('recibo_receipts', JSON.stringify(r));
    },
    getReceipt(id) {
        return this.getReceipts().find(r => r.id === id) || null;
    },
    addReceipt(receipt) {
        const list = this.getReceipts();
        receipt.id = this.generateId();
        receipt.createdAt = new Date().toISOString();
        receipt.numero = list.length + 1;
        list.push(receipt);
        this.saveReceipts(list);
        return receipt;
    },
    updateReceipt(id, updates) {
        const list = this.getReceipts();
        const idx = list.findIndex(r => r.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
        this.saveReceipts(list);
        return list[idx];
    },

    // ==================== GENERATE MONTHLY RECEIPTS ====================
    generateMonthReceipts(year, month) {
        const contracts = this.getContracts().filter(c => c.status === 'ativo');
        const receipts = this.getReceipts();
        const created = [];

        for (const contract of contracts) {
            const exists = receipts.some(r =>
                r.contractId === contract.id && r.year === year && r.month === month
            );
            if (!exists) {
                const dueDate = new Date(year, month, contract.diaVencimento);
                const r = this.addReceipt({
                    contractId: contract.id,
                    tenantId: contract.tenantId,
                    year,
                    month,
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
    },

    // ==================== UTILITY ====================
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // ==================== BACKUP ====================
    exportBackup() {
        return {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            owner: this.getOwnerData(),
            tenants: this.getTenants(),
            documents: this._getAllDocs().map(d => ({ ...d, data: null })), // Don't export file data
            contracts: this.getContracts(),
            receipts: this.getReceipts()
        };
    },
    importBackup(data) {
        if (!data.contracts || !data.receipts || !data.tenants) {
            throw new Error('Formato de backup inválido');
        }
        if (data.owner) this.saveOwnerData(data.owner);
        this.saveTenants(data.tenants);
        this.saveContracts(data.contracts);
        this.saveReceipts(data.receipts);
    },
    clearAll() {
        if (confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita!')) {
            localStorage.removeItem('recibo_owner');
            localStorage.removeItem('recibo_tenants');
            localStorage.removeItem('recibo_documents');
            localStorage.removeItem('recibo_contracts');
            localStorage.removeItem('recibo_receipts');
            return true;
        }
        return false;
    }
};
