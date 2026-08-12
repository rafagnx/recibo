/* ============================================================
   👥 APOLLOSURFACE — Tenants Module (Inquilinos)
   ============================================================ */

function openTenantModal(id) {
    const modal = document.getElementById('tenantModal');
    const form = document.getElementById('tenantForm');
    form.reset();
    document.getElementById('tenantId').value = '';
    document.getElementById('tenantModalTitle').textContent = 'Novo Inquilino';
    if (id) {
        const t = DB.getTenant(id);
        if (!t) return;
        document.getElementById('tenantModalTitle').textContent = 'Editar Inquilino';
        document.getElementById('tenantId').value = t.id;
        document.getElementById('tNome').value = t.nome || '';
        document.getElementById('tCPF').value = t.cpf || '';
        document.getElementById('tTelefone').value = t.telefone || '';
        document.getElementById('tEmail').value = t.email || '';
        document.getElementById('tRG').value = t.rg || '';
        document.getElementById('tNascimento').value = t.nascimento || '';
        document.getElementById('tEndereco').value = t.endereco || '';
        document.getElementById('tObs').value = t.obs || '';
    }
    modal.classList.add('active');
}

function closeTenantModal() {
    document.getElementById('tenantModal').classList.remove('active');
}

function saveTenant(e) {
    e.preventDefault();
    const id = document.getElementById('tenantId').value;
    const data = {
        nome: document.getElementById('tNome').value.trim(),
        cpf: document.getElementById('tCPF').value.trim(),
        telefone: document.getElementById('tTelefone').value.trim(),
        email: document.getElementById('tEmail').value.trim(),
        rg: document.getElementById('tRG').value.trim(),
        nascimento: document.getElementById('tNascimento').value,
        endereco: document.getElementById('tEndereco').value.trim(),
        obs: document.getElementById('tObs').value.trim()
    };
    if (id) {
        DB.updateTenant(id, data);
        showToast('Inquilino atualizado!', 'success');
    } else {
        DB.addTenant(data);
        showToast('Inquilino cadastrado!', 'success');
    }
    closeTenantModal();
    renderTenants();
    populateTenantSelect();
    updateDashboard();
}

function deleteTenant(id) {
    const t = DB.getTenant(id);
    if (!t) return;
    if (!confirm(`Excluir "${t.nome}" e todos os seus documentos?`)) return;
    DB.deleteTenant(id);
    showToast('Inquilino excluído.', 'success');
    renderTenants();
    populateTenantSelect();
    updateDashboard();
}

function viewTenant(id) {
    const t = DB.getTenant(id);
    if (!t) return;
    document.getElementById('tenantDetailTitle').textContent = `📋 ${t.nome}`;
    let html = `
    <div style="color:var(--text-primary);">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;white-space:nowrap;vertical-align:top;">Nome</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${escapeHtml(t.nome)}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">CPF</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${t.cpf || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">RG</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${t.rg || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Telefone</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${t.telefone || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Email</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${t.email || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Nascimento</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${t.nascimento ? formatDate(t.nascimento) : '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Endereço</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${escapeHtml(t.endereco || '—')}</td></tr>
            ${t.obs ? `<tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;vertical-align:top;">Obs</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${escapeHtml(t.obs)}</td></tr>` : ''}
        </table>
        <hr style="border:none;border-top:1px solid var(--border-color);margin:16px 0;">
        <h4 style="margin-bottom:12px;font-size:0.938rem;color:var(--text-primary);">📎 Documentos</h4>
        <div id="tenantDocsList">`;
    
    const docs = DB.getTenantDocs(id);
    if (docs.length === 0) {
        html += `<p style="color:var(--text-tertiary);font-size:0.813rem;">Nenhum documento anexado.</p>`;
    } else {
        docs.forEach(d => {
            const isImage = d.type?.startsWith('image/');
            const isPDF = d.type === 'application/pdf';
            const icon = isImage ? 'fa-image' : isPDF ? 'fa-file-pdf' : 'fa-file-alt';
            html += `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                <i class="fas ${icon}" style="color:var(--accent-500);width:20px;"></i>
                <div style="flex:1;">
                    <div style="font-weight:500;font-size:0.875rem;color:var(--text-primary);">${escapeHtml(d.name)}</div>
                    <div style="font-size:0.75rem;color:var(--text-tertiary);">${formatFileSize(d.size)}</div>
                </div>
                <button class="action-btn" onclick="downloadDoc('${d.id}')" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteDoc('${d.id}','${id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        });
    }
    
    html += `</div>
        <div style="margin-top:16px;">
            <label style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border:2px dashed var(--border-color);border-radius:8px;cursor:pointer;font-size:0.875rem;color:var(--text-tertiary);transition:all 0.2s;" 
                   onmouseover="this.style.borderColor='var(--accent-500)';this.style.color='var(--accent-500)'" 
                   onmouseout="this.style.borderColor='var(--border-color)';this.style.color='var(--text-tertiary)'">
                <i class="fas fa-upload"></i> Anexar Documento (PDF, DOCX, Imagens...)
                <input type="file" style="display:none" multiple onchange="uploadDocs('${id}',event)">
            </label>
        </div>
    </div>`;
    
    document.getElementById('tenantDetailBody').innerHTML = html;
    document.getElementById('tenantDetailModal').classList.add('active');
}

function closeTenantDetailModal() {
    document.getElementById('tenantDetailModal').classList.remove('active');
}

async function uploadDocs(tenantId, event) {
    const files = event.target.files;
    if (!files.length) return;
    let count = 0;
    for (const file of files) {
        try { await DB.addDocument(file, tenantId); count++; }
        catch(e) { console.error(e); }
    }
    showToast(`${count} documento(s) anexado(s)!`, 'success');
    viewTenant(tenantId);
    renderTenants();
}

function downloadDoc(docId) {
    const doc = DB.getDocument(docId);
    if (!doc) return;
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.name;
    a.click();
}

function deleteDoc(docId, tenantId) {
    if (!confirm('Excluir este documento?')) return;
    DB.deleteDocument(docId);
    showToast('Documento excluído.', 'info');
    viewTenant(tenantId);
    renderTenants();
}

function renderTenants() {
    const tbody = document.getElementById('tenantsTableBody');
    const search = (document.getElementById('tenantSearch')?.value || '').toLowerCase();
    let tenants = DB.getTenants();
    if (search) {
        tenants = tenants.filter(t => 
            t.nome?.toLowerCase().includes(search) ||
            t.cpf?.includes(search) ||
            t.telefone?.includes(search) ||
            t.email?.toLowerCase().includes(search)
        );
    }
    tenants.sort((a,b) => (a.nome||'').localeCompare(b.nome||''));
    if (!tenants.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">
            <div class="empty-state"><i class="fas fa-users"></i><p>Nenhum inquilino cadastrado.</p></div>
        </td></tr>`;
        return;
    }
    tbody.innerHTML = tenants.map(t => {
        const docs = DB.getTenantDocs(t.id);
        return `<tr>
            <td data-label="Nome">
                <div class="tb-user">
                    ${avatarHtml(t.nome)}
                    <div class="tb-user-name">${escapeHtml(t.nome)}</div>
                </div>
            </td>
            <td data-label="CPF">${t.cpf || '—'}</td>
            <td data-label="Telefone">${t.telefone || '—'}</td>
            <td data-label="Email">${t.email || '—'}</td>
            <td data-label="Documentos"><span class="doc-count-badge"><i class="fas fa-paperclip"></i> ${docs.length}</span></td>
            <td data-label="Ações">
                <div class="action-btns">
                    <button class="action-btn view-btn" onclick="viewTenant('${t.id}')" title="Detalhes"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" onclick="openTenantModal('${t.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteTenant('${t.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function populateTenantSelect() {
    const sel = document.getElementById('cTenantId');
    if (!sel) return;
    const tenants = DB.getTenants();
    sel.innerHTML = '<option value="">Selecione um inquilino...</option>' +
        tenants.map(t => `<option value="${t.id}">${escapeHtml(t.nome)} ${t.cpf ? '- CPF: '+t.cpf : ''}</option>`).join('');
}
