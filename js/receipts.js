/* ============================================================
   📄 APOLLOSURFACE — Receipts Module
   Estilo Clássico Brasileiro (duas vias lado a lado)
   ============================================================ */

function openReceiptModal(receiptId) {
    const receipt = DB.getReceipt(receiptId);
    if (!receipt) return;
    const contract = DB.getContract(receipt.contractId);
    if (!contract) return;
    const tenant = DB.getTenant(receipt.tenantId);
    if (!tenant) return;
    const owner = DB.getOwnerData();

    const modal = document.getElementById('receiptModal');
    const printArea = document.getElementById('receiptPrintArea');

    const rNum = formatReceiptNumber(receipt.numero);
    const monthName = getMonthName(receipt.month);
    const year = receipt.year;
    const emissao = formatDateBR(receipt.dataEmissao);
    const vencimento = formatDateBR(receipt.vencimento);
    const valorExtenso = numeroPorExtenso(receipt.valorTotal);

    // Generate two identical vias side-by-side
        function makeVia(label) {
        const hasCondominio = receipt.valorCondominio > 0;
        const hasIPTU = receipt.valorIPTU > 0;
        const hasGaragem = receipt.valorGaragem > 0;
        
        return `
        <div class="via-container">
            <div class="via">
                <div class="via-header">
                    <div class="via-header-row">
                        <span class="via-label">${label}</span>
                        <span class="via-numero">RECIBO Nº ${rNum}</span>
                        <span class="via-data">${emissao}</span>
                    </div>
                </div>
                
                <table class="via-content-table">
                    <tr>
                        <td class="label-cell">RECEBI(EMOS) DE</td>
                        <td class="value-cell" colspan="3">${escapeHtml(tenant.nome)}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">CPF</td>
                        <td class="value-cell" colspan="3">${tenant.cpf || '__________________________'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">ENDEREÇO</td>
                        <td class="value-cell" colspan="3">${escapeHtml(contract.imovelEndereco)}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">A QUANTIA DE</td>
                        <td class="value-cell" colspan="3">${formatCurrency(receipt.valorTotal)} (${valorExtenso})</td>
                    </tr>
                    <tr>
                        <td class="label-cell">REFERENTE</td>
                        <td class="value-cell" colspan="3">Aluguel ${monthName.toUpperCase()} / ${year}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">VENCIMENTO</td>
                        <td class="value-cell" style="width:120px;">${vencimento}</td>
                        <td class="label-cell" style="width:70px;">VALOR</td>
                        <td class="value-cell-bold">${formatCurrency(receipt.valorTotal)}</td>
                    </tr>
                    ${hasCondominio ? `
                    <tr>
                        <td class="label-cell">CONDOMÍNIO</td>
                        <td class="value-cell" colspan="2">${formatCurrency(receipt.valorCondominio)}</td>
                        <td class="value-cell" style="text-align:right;font-weight:700;">${formatCurrency(receipt.valorCondominio)}</td>
                    </tr>` : ''}
                    ${hasIPTU ? `
                    <tr>
                        <td class="label-cell">IPTU</td>
                        <td class="value-cell" colspan="2">${formatCurrency(receipt.valorIPTU)}</td>
                        <td class="value-cell" style="text-align:right;font-weight:700;">${formatCurrency(receipt.valorIPTU)}</td>
                    </tr>` : ''}
                    ${hasGaragem ? `
                    <tr>
                        <td class="label-cell">GARAGEM</td>
                        <td class="value-cell" colspan="2">${formatCurrency(receipt.valorGaragem)}</td>
                        <td class="value-cell" style="text-align:right;font-weight:700;">${formatCurrency(receipt.valorGaragem)}</td>
                    </tr>` : ''}
                    <tr>
                        <td class="total-cell-label">TOTAL</td>
                        <td colspan="2"></td>
                        <td class="value-cell-bold">${formatCurrency(receipt.valorTotal)}</td>
                    </tr>
                </table>
                
                <div class="via-obs-area">
                    <div class="via-obs-row">
                        <span class="obs-label">OBS:</span>
                        <span class="obs-value">______________________________________________</span>
                    </div>
                    <div class="via-obs-row">
                        <span class="obs-label">COMPETÊNCIA:</span>
                        <span class="obs-value">${monthName.toUpperCase()} / ${year}</span>
                    </div>
                    <div class="via-obs-row">
                        <span class="obs-label">PAGO EM:</span>
                        <span class="obs-value">${receipt.status === 'pago' ? formatDateBR(receipt.dataPagamento) : '____________________'}</span>
                    </div>
                </div>

                <div class="via-signature-area">
                    <div class="via-signature-line"></div>
                    <div class="via-signature-label">${owner.name || '(Assinatura do Locador)'}</div>
                </div>

                <div class="via-cut-area">
                    <span class="scissors">✂</span>
                    <span>Corte aqui para separar as vias</span>
                    <span class="scissors">✂</span>
                </div>
            </div>
        </div>`;
    }

    printArea.innerHTML = `
        <div class="receipt-modal-print">
            <div class="receipt-double">
                ${makeVia('1ª VIA')}
                <div class="via-separator"></div>
                ${makeVia('2ª VIA')}
            </div>
        </div>`;

    modal.classList.add('active');
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('active');
}

function printReceipts() {
    window.print();
}

function generateAllReceipts() {
    const now = new Date();
    const created = DB.generateMonthReceipts(now.getFullYear(), now.getMonth());
    if (created.length > 0) {
        showToast(`${created.length} recibo(s) gerado(s) para este mês!`, 'success');
    } else {
        showToast('Todos os recibos deste mês já foram gerados.', 'info');
    }
    renderReceipts();
    updateDashboard();
}

function markAsPaid(receiptId) {
    const r = DB.getReceipt(receiptId);
    if (!r) return;
    const today = new Date().toISOString().split('T')[0];
    DB.updateReceipt(receiptId, { status: 'pago', dataPagamento: today });
    showToast('Recibo marcado como pago!', 'success');
    renderReceipts();
    updateDashboard();
}

function markAsPending(receiptId) {
    DB.updateReceipt(receiptId, { status: 'pendente', dataPagamento: null });
    showToast('Recibo marcado como pendente.', 'info');
    renderReceipts();
    updateDashboard();
}

function deleteReceipt(receiptId) {
    if (!confirm('Excluir este recibo permanentemente?')) return;
    const receipts = DB.getReceipts().filter(r => r.id !== receiptId);
    DB.saveReceipts(receipts);
    showToast('Recibo excluído.', 'info');
    renderReceipts();
    updateDashboard();
}

function renderReceipts() {
    const tbody = document.getElementById('receiptsTableBody');
    const search = (document.getElementById('receiptSearch')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('receiptStatusFilter')?.value || 'all';
    const monthFilter = document.getElementById('receiptMonthFilter')?.value || 'all';
    
    let receipts = DB.getReceipts();
    if (search) {
        receipts = receipts.filter(r => {
            const t = DB.getTenant(r.tenantId);
            return t?.nome?.toLowerCase().includes(search) || r.competencia?.includes(search);
        });
    }
    if (statusFilter !== 'all') receipts = receipts.filter(r => r.status === statusFilter);
    if (monthFilter !== 'all') {
        const [m,y] = monthFilter.split('/');
        receipts = receipts.filter(r => r.month === parseInt(m) && r.year === parseInt(y));
    }
    receipts.sort((a,b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return b.numero - a.numero;
    });

    // Auto-update overdue
    receipts.forEach(r => {
        if (r.status === 'pendente' && isOverdue(r.vencimento, r.status)) {
            DB.updateReceipt(r.id, { status: 'atrasado' });
            r.status = 'atrasado';
        }
    });

    if (!receipts.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">
            <div class="empty-state"><i class="fas fa-receipt"></i><p>Nenhum recibo encontrado.</p></div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = receipts.map(r => {
        const t = DB.getTenant(r.tenantId);
        return `<tr>
            <td><div style="font-weight:600;color:var(--text-primary);">${escapeHtml(t?.nome||'—')}</div></td>
            <td>${r.competencia}</td>
            <td style="font-weight:600;color:var(--text-primary);">${formatCurrency(r.valorTotal)}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td><span class="status-badge ${getStatusClass(r.status)}">${r.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn print-btn" onclick="openReceiptModal('${r.id}')" title="Ver/Imprimir"><i class="fas fa-receipt"></i></button>
                    ${r.status !== 'pago' ? `
                    <button class="action-btn" style="color:var(--green-500);" onclick="markAsPaid('${r.id}')" title="Pago"><i class="fas fa-check"></i></button>` : `
                    <button class="action-btn" style="color:var(--gold-400);" onclick="markAsPending('${r.id}')" title="Pendente"><i class="fas fa-undo"></i></button>`}
                    <button class="action-btn delete-btn" onclick="deleteReceipt('${r.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function populateMonthFilter() {
    const select = document.getElementById('receiptMonthFilter');
    const receipts = DB.getReceipts();
    const months = new Set();
    receipts.forEach(r => months.add(`${r.month}/${r.year}`));
    const now = new Date();
    months.add(`${now.getMonth()}/${now.getFullYear()}`);
    const sorted = Array.from(months).sort((a,b) => {
        const [ma,ya] = a.split('/').map(Number);
        const [mb,yb] = b.split('/').map(Number);
        if (ya !== yb) return yb - ya;
        return mb - ma;
    });
    select.innerHTML = '<option value="all">Todos os meses</option>' +
        sorted.map(m => {
            const [mi, y] = m.split('/').map(Number);
            return `<option value="${m}">${getMonthName(mi)} / ${y}</option>`;
        }).join('');
}


