/* ============================================================
   📋 APOLLOSURFACE — Contracts Module
   CRUD + Impressão de Contratos (17 cláusulas)
   ============================================================ */

// ==================== CRUD ====================

function openContractModal(id) {
    const modal = document.getElementById('contractModal');
    document.getElementById('contractForm').reset();
    document.getElementById('contractId').value = '';
    document.getElementById('contractModalTitle').textContent = 'Novo Contrato';
    populateTenantSelect();
    document.getElementById('cDataInicio').value = new Date().toISOString().split('T')[0];
    updateTotalContractDisplay();
    if (id) {
        const c = DB.getContract(id);
        if (!c) return;
        document.getElementById('contractModalTitle').textContent = 'Editar Contrato';
        document.getElementById('contractId').value = c.id;
        document.getElementById('cTenantId').value = c.tenantId || '';
        document.getElementById('cImovelEndereco').value = c.imovelEndereco || '';
        document.getElementById('cImovelTipo').value = c.imovelTipo || 'Apartamento';
        document.getElementById('cValorAluguel').value = c.valorAluguel || '';
        document.getElementById('cValorCondominio').value = c.valorCondominio || '';
        document.getElementById('cValorIPTU').value = c.valorIPTU || '';
        document.getElementById('cValorGaragem').value = c.valorGaragem || '';
        document.getElementById('cDataInicio').value = c.dataInicio || '';
        document.getElementById('cDiaVencimento').value = c.diaVencimento || '10';
        document.getElementById('cDataFim').value = c.dataFim || '';
        document.getElementById('cObservacoes').value = c.observacoes || '';
        updateTotalContractDisplay();
    }
    modal.classList.add('active');
}

function closeContractModal() {
    document.getElementById('contractModal').classList.remove('active');
}

function saveContract(e) {
    e.preventDefault();
    const id = document.getElementById('contractId').value;
    const aluguel = parseMoneyInput(document.getElementById('cValorAluguel').value);
    const condominio = parseMoneyInput(document.getElementById('cValorCondominio').value);
    const iptu = parseMoneyInput(document.getElementById('cValorIPTU').value);
    const garagem = parseMoneyInput(document.getElementById('cValorGaragem').value);
    const total = calculateTotal(aluguel, condominio, iptu, garagem);

    const data = {
        tenantId: document.getElementById('cTenantId').value,
        imovelEndereco: document.getElementById('cImovelEndereco').value.trim(),
        imovelTipo: document.getElementById('cImovelTipo').value,
        valorAluguel: aluguel,
        valorCondominio: condominio,
        valorIPTU: iptu,
        valorGaragem: garagem,
        valorTotal: total,
        dataInicio: document.getElementById('cDataInicio').value,
        diaVencimento: parseInt(document.getElementById('cDiaVencimento').value),
        dataFim: document.getElementById('cDataFim').value || null,
        observacoes: document.getElementById('cObservacoes').value.trim(),
        status: 'ativo'
    };

    if (data.dataFim) {
        if (new Date(data.dataFim+'T23:59:59') < new Date()) data.status = 'encerrado';
    }

    if (id) {
        DB.updateContract(id, data);
        showToast('Contrato atualizado!', 'success');
    } else {
        DB.addContract(data);
        showToast('Contrato criado!', 'success');
    }
    closeContractModal();
    renderContracts();
    updateDashboard();
}

function deleteContract(id) {
    const c = DB.getContract(id);
    if (!c) return;
    const t = DB.getTenant(c.tenantId);
    if (!confirm(`Excluir contrato de "${t?.nome || '—'}"? Todos os recibos relacionados serão removidos.`)) return;
    DB.deleteContract(id);
    showToast('Contrato excluído.', 'success');
    renderContracts();
    updateDashboard();
}

// ==================== RENOVAR CONTRATO ====================
function renewContract(id) {
    const c = DB.getContract(id);
    if (!c) return;
    const t = DB.getTenant(c.tenantId);

    // SEMPRE renova a partir da data de fim atual do contrato.
    // Se não houver data fim, usa a data de hoje.
    const fimAtual = c.dataFim
        ? new Date(c.dataFim + 'T12:00:00')
        : new Date();
    const baseDate = fimAtual;

    // Soma o número de meses à data base
    function addMonths(date, months) {
        const d = new Date(date);
        const day = d.getDate();
        d.setDate(1);
        d.setMonth(d.getMonth() + months);
        // Ajusta para não estourar o último dia (ex: 31/01 + 1 mês = 28/02)
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(day, lastDay));
        return d;
    }

    const tenantNome = escapeHtml(t?.nome || '—');
    const baseFmt = baseDate.toLocaleDateString('pt-BR');
    const fimAtualFmt = c.dataFim ? new Date(c.dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Indeterminado';

    showQuickModal('Renovar Contrato', `
        <div style="color:var(--text-primary);">
            <p style="margin-bottom:12px;font-size:0.875rem;color:var(--text-secondary);">
                <strong style="color:var(--text-primary);">${tenantNome}</strong> — ${escapeHtml(c.imovelEndereco)}
            </p>
            <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(129,140,248,0.2);border-radius:12px;padding:12px 16px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;font-size:0.813rem;margin-bottom:6px;">
                    <span style="color:var(--text-tertiary);">Fim atual:</span>
                    <span style="color:var(--text-primary);font-weight:600;">${fimAtualFmt}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.813rem;">
                    <span style="color:var(--text-tertiary);">Renova a partir de:</span>
                    <span style="color:var(--accent-400);font-weight:600;">${baseFmt}</span>
                </div>
            </div>
            <label for="renewMonths" style="font-size:0.813rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;">Por quantos meses?</label>
            <select id="renewMonths" style="width:100%;margin-top:6px;padding:10px 14px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-light);border-radius:10px;font-size:0.938rem;">
                <option value="6">6 meses</option>
                <option value="12" selected>12 meses (1 ano)</option>
                <option value="24">24 meses (2 anos)</option>
                <option value="36">36 meses (3 anos)</option>
            </select>
            <div style="margin-top:16px;font-size:0.813rem;color:var(--text-tertiary);" id="renewPreview">
                Nova data de término: <strong style="color:var(--accent-400);" id="renewPreviewDate">—</strong>
            </div>
            <div style="display:flex;gap:10px;margin-top:20px;">
                <button class="btn btn-primary" style="flex:1;" onclick="confirmRenewContract('${c.id}')">Renovar</button>
                <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            </div>
        </div>`);

    // Atualiza a prévia ao trocar os meses
    const sel = document.getElementById('renewMonths');
    sel.addEventListener('change', () => {
        const nova = addMonths(baseDate, parseInt(sel.value));
        document.getElementById('renewPreviewDate').textContent = nova.toLocaleDateString('pt-BR');
    });
    // Mostra a prévia inicial
    document.getElementById('renewPreviewDate').textContent = addMonths(baseDate, 12).toLocaleDateString('pt-BR');

    // Guarda no escopo da função para o confirm
    window._renewBaseDate = baseDate;
    window._renewContractId = id;
}

function confirmRenewContract(id) {
    const months = parseInt(document.getElementById('renewMonths')?.value || 12);
    const baseDate = window._renewBaseDate || new Date();
    const c = DB.getContract(id);
    if (!c) return;

    // Calcula nova data fim
    function addMonths(date, months) {
        const d = new Date(date);
        const day = d.getDate();
        d.setDate(1);
        d.setMonth(d.getMonth() + months);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(day, lastDay));
        return d;
    }
    const novaDataFim = addMonths(baseDate, months).toISOString().split('T')[0];

    const updates = {
        dataFim: novaDataFim,
        status: 'ativo',
        ultimaRenovacao: new Date().toISOString()
    };

    // Salva no localStorage
    DB.updateContract(id, updates);

    // Sincroniza com Supabase se conectado
    if (window.SupabaseDB && SupabaseDB.isReady()) {
        SupabaseDB.updateContract(id, {
            data_fim: novaDataFim,
            status: 'ativo',
            updated_at: new Date().toISOString()
        }).catch(err => console.error('Erro ao renovar no Supabase:', err));
    }

    // Fecha o modal e atualiza
    const overlay = document.querySelector('.modal-overlay.active');
    if (overlay) overlay.remove();
    showToast(`Contrato renovado até ${new Date(novaDataFim + 'T12:00:00').toLocaleDateString('pt-BR')}!`, 'success');
    renderContracts();
    updateDashboard();
}

function viewContract(id) {
    const c = DB.getContract(id);
    if (!c) return;
    const t = DB.getTenant(c.tenantId);
    showQuickModal('Detalhes do Contrato', `
    <div style="color:var(--text-primary);">
        <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Inquilino</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${escapeHtml(t?.nome||'—')}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">CPF</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${t?.cpf||'—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Imóvel</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${escapeHtml(c.imovelEndereco)}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Tipo</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${c.imovelTipo}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Aluguel</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${formatCurrency(c.valorAluguel)}</td></tr>
            ${c.valorCondominio ? `<tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Condomínio</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${formatCurrency(c.valorCondominio)}</td></tr>` : ''}
            ${c.valorIPTU ? `<tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">IPTU</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${formatCurrency(c.valorIPTU)}</td></tr>` : ''}
            ${c.valorGaragem ? `<tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Garagem</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${formatCurrency(c.valorGaragem)}</td></tr>` : ''}
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Total</td>
                <td style="padding:6px 12px;font-size:0.875rem;font-weight:700;color:var(--text-primary);">${formatCurrency(c.valorTotal)}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Início</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${formatDate(c.dataInicio)}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Término</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${c.dataFim ? formatDate(c.dataFim) : 'Indeterminado'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Vencimento</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">Dia ${c.diaVencimento}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;">Status</td>
                <td style="padding:6px 12px;font-size:0.875rem;"><span class="status-badge ${getStatusClass(c.status)}">${c.status}</span></td></tr>
            ${c.observacoes ? `<tr><td style="padding:6px 12px;font-weight:600;color:var(--text-tertiary);font-size:0.813rem;vertical-align:top;">Obs</td>
                <td style="padding:6px 12px;font-size:0.875rem;color:var(--text-primary);">${escapeHtml(c.observacoes)}</td></tr>` : ''}
        </table>
        <div style="margin-top:16px;">
            <button class="btn btn-primary" onclick="printContract('${c.id}');this.closest('.modal-overlay').remove()">
                <i class="fas fa-print"></i> Imprimir Contrato Completo
            </button>
        </div>
    </div>`);
}

function renderContracts() {
    const tbody = document.getElementById('contractsTableBody');
    const search = (document.getElementById('contractSearch')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('contractStatusFilter')?.value || 'all';
    let contracts = DB.getContracts();
    if (search) {
        contracts = contracts.filter(c => {
            const t = DB.getTenant(c.tenantId);
            return c.imovelEndereco?.toLowerCase().includes(search) ||
                   t?.nome?.toLowerCase().includes(search) ||
                   t?.cpf?.includes(search);
        });
    }
    if (statusFilter !== 'all') contracts = contracts.filter(c => c.status === statusFilter);
    contracts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!contracts.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">
            <div class="empty-state"><i class="fas fa-file-contract"></i><p>Nenhum contrato encontrado.</p></div>
        </td></tr>`;
        return;
    }
    tbody.innerHTML = contracts.map(c => {
        const t = DB.getTenant(c.tenantId);
        return `<tr>
            <td>
                <div class="tb-user">
                    ${avatarHtml(t?.nome)}
                    <div class="tb-user-name">${escapeHtml(t?.nome||'—')}</div>
                </div>
            </td>
            <td><div class="tb-address"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(c.imovelEndereco)}</div></td>
            <td style="font-weight:700;color:var(--text-primary);">${formatCurrency(c.valorTotal)}</td>
            <td><span class="due-chip"><i class="fas fa-calendar-day"></i> Dia ${c.diaVencimento}</span></td>
            <td>${statusBadge(c.status)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn renew-btn" onclick="renewContract('${c.id}')" title="Renovar Contrato"><i class="fas fa-sync-alt"></i></button>
                    <button class="action-btn view-btn" onclick="viewContract('${c.id}')" title="Visualizar"><i class="fas fa-eye"></i></button>
                    <button class="action-btn print-btn" onclick="printContract('${c.id}')" title="Imprimir Contrato"><i class="fas fa-print"></i></button>
                    <button class="action-btn edit-btn" onclick="openContractModal('${c.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteContract('${c.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateTotalContractDisplay() {
    const aluguel = parseMoneyInput(document.getElementById('cValorAluguel').value);
    const condominio = parseMoneyInput(document.getElementById('cValorCondominio').value);
    const iptu = parseMoneyInput(document.getElementById('cValorIPTU').value);
    const garagem = parseMoneyInput(document.getElementById('cValorGaragem').value);
    document.getElementById('totalDisplay').textContent = formatCurrency(calculateTotal(aluguel, condominio, iptu, garagem));
}

document.addEventListener('DOMContentLoaded', () => {
    ['cValorAluguel','cValorCondominio','cValorIPTU','cValorGaragem'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateTotalContractDisplay);
    });
});

// ==================== CONTRACT PRINT (17 Cláusulas) ====================

function getContractClauses(contract, tenant, owner) {
    const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    
    function fmtDate(d) {
        const dt = new Date(d + 'T12:00:00');
        return `${dt.getDate()} de ${monthNames[dt.getMonth()].toUpperCase()} de ${dt.getFullYear()}`;
    }
    
    const dataInicio = fmtDate(contract.dataInicio);
    const dataFim = contract.dataFim ? fmtDate(contract.dataFim) : '__ de ________ de ______';
    const valorAluguel = formatCurrency(contract.valorAluguel);
    const valorExtenso = numeroPorExtenso(contract.valorAluguel);
    const diaVenc = contract.diaVencimento;
    const imovel = contract.imovelEndereco || '_________________________________________';

    return [
        { title: 'CLÁUSULA PRIMEIRA', text: `O objeto da presente locação é o imóvel situado na: ${imovel}` },
        { title: 'CLÁUSULA SEGUNDA', text: `O prazo da locação é de 12 (doze) meses, iniciando-se em ${dataInicio} e terminando em ${dataFim}.` },
        { title: 'CLÁUSULA TERCEIRA', text: `O aluguel mensal é de ${valorAluguel} (${valorExtenso}), com vencimento todo dia ${diaVenc} de cada mês, reajustado anualmente pelo IGP-M ou, na sua falta, por índice oficial que o substitua.` },
        { title: 'CLÁUSULA QUARTA', text: `Correrão por conta da LOCATÁRIA as despesas ordinárias de condomínio, quando houver, e os consumos de água, energia elétrica e demais serviços utilizados no imóvel. Outros tributos e encargos somente serão atribuídos à LOCATÁRIA quando expressamente previstos neste contrato ou permitidos pela legislação.` },
        { title: 'CLÁUSULA QUINTA', text: `Em caso de atraso no pagamento do aluguel, aplicar-se-á multa de 2% (dois por cento) sobre o valor devido e juros de 1% (um por cento) ao mês.` },
        { title: 'CLÁUSULA SEXTA', text: `O pagamento da multa por atraso não implica renúncia a qualquer direito da LOCADORA nem impede a adoção das medidas legais cabíveis.` },
        { title: 'CLÁUSULA SÉTIMA', text: `A LOCATÁRIA deverá conservar, limpar e manter o imóvel em boas condições, devolvendo-o ao final da locação nas mesmas condições em que o recebeu, ressalvado o desgaste natural. Não poderá realizar obras ou alterar a estrutura do imóvel sem autorização prévia e escrita da LOCADORA. Benfeitorias não autorizadas não gerarão direito a indenização ou retenção, observada a legislação aplicável.`, extra: `PARÁGRAFO ÚNICO – A LOCATÁRIA declara receber o imóvel em condições de uso, conforme LAUDO DE VISTORIA INICIAL, que integra este contrato. Eventual discordância deverá ser comunicada por escrito no prazo de 10 (dez) dias do início da locação; após esse prazo, a vistoria será considerada aceita.` },
        { title: 'CLÁUSULA OITAVA', text: `O imóvel destina-se única e exclusivamente ao uso residencial da LOCATÁRIA e de sua família. A LOCATÁRIA obriga-se a cumprir e fazer cumprir a Convenção de Condomínio e o Regulamento Interno.` },
        { title: 'CLÁUSULA NONA', text: `A LOCATÁRIA não poderá sublocar, transferir ou ceder o imóvel, total ou parcialmente, sem consentimento prévio e por escrito da LOCADORA.` },
        { title: 'CLÁUSULA DÉCIMA', text: `Em caso de sinistro que torne o imóvel inabitável, serão observadas as disposições legais aplicáveis quanto à continuidade ou rescisão da locação. Havendo necessidade de reconstrução, serão observados os efeitos legais sobre o aluguel e o prazo contratual.` },
        { title: 'CLÁUSULA DÉCIMA PRIMEIRA', text: `Em caso de desapropriação total ou parcial do imóvel, serão observadas as disposições legais aplicáveis.` },
        { title: 'CLÁUSULA DÉCIMA SEGUNDA', text: `No caso de alienação do imóvel, serão observadas as regras legais relativas ao direito de preferência da LOCATÁRIA, quando aplicáveis.` },
        { title: 'CLÁUSULA DÉCIMA TERCEIRA', text: `A LOCADORA poderá vistoriar o imóvel mediante aviso prévio à LOCATÁRIA e em horário razoável, salvo situação emergencial.` },
        { title: 'CLÁUSULA DÉCIMA QUARTA', text: `A LOCATÁRIA deverá cumprir, dentro dos prazos legais, multas ou intimações decorrentes de infrações praticadas por ela, seus familiares, visitantes ou prestadores, e comunicar à LOCADORA qualquer aviso ou notificação de interesse do imóvel.` },
        { title: 'CLÁUSULA DÉCIMA QUINTA', text: `O descumprimento das obrigações deste contrato poderá ensejar notificação para regularização, aplicação das penalidades cabíveis e, quando previsto em lei, rescisão da locação. A LOCATÁRIA responderá pelos danos causados ao imóvel ou às áreas comuns por si, seus familiares, visitantes ou prestadores.` },
        { title: 'CLÁUSULA DÉCIMA SEXTA', text: `Além da Convenção de Condomínio e do Regulamento Interno, a LOCATÁRIA, seus familiares, visitantes e prestadores deverão:`, items: [`a) Horário de silêncio: guardar silêncio e evitar ruídos, sons ou atividades que perturbem o sossego dos demais moradores, especialmente no período das 22h (vinte e duas horas) às 8h (oito horas), todos os dias da semana, sem prejuízo de horário mais restritivo previsto no Regulamento Interno do condomínio;`, `b) manter o imóvel e áreas sob sua responsabilidade limpos, sem descarte inadequado de lixo ou objetos;`, `c) respeitar as regras de segurança, portaria e acesso de visitantes;`, `d) utilizar adequadamente as áreas comuns;`, `e) realizar obras ou serviços ruidosos somente em dias úteis, das 8h às 18h, mediante comunicação prévia à administração.`], extra: `PARÁGRAFO ÚNICO – O descumprimento das regras desta cláusula, após notificação por escrito e não regularização no prazo de 5 (cinco) dias, poderá caracterizar infração contratual, sem prejuízo das multas condominiais e demais medidas legais cabíveis.` },
        { title: 'CLÁUSULA DÉCIMA SÉTIMA', text: `Fica eleito o Foro da Comarca de Nova Friburgo/RJ para dirimir questões decorrentes deste contrato, ressalvadas as regras legais de competência.` }
    ];
}

function printContract(contractId) {
    const contract = DB.getContract(contractId);
    if (!contract) { showToast('Contrato não encontrado.', 'error'); return; }
    const tenant = DB.getTenant(contract.tenantId);
    if (!tenant) { showToast('Inquilino não encontrado.', 'error'); return; }
    const owner = DB.getOwnerData();

    const clauses = getContractClauses(contract, tenant, owner);
    const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    
    function fmtDate(d) {
        const dt = new Date(d + 'T12:00:00');
        return `${dt.getDate()} de ${monthNames[dt.getMonth()].toUpperCase()} de ${dt.getFullYear()}`;
    }

    const html = `
    <div class="contract-print-wrapper">
        <div class="contract-print">
            <div class="contract-title">CONTRATO DE LOCAÇÃO ${contract.imovelTipo?.toUpperCase() || 'RESIDENCIAL'}</div>
            
            <div class="contract-parties">
                <p>SÃO PARTES NESTE INSTRUMENTO:</p>
                <p><strong>LOCADOR:</strong> ${owner.name || '_________________________________________'}</p>
                <p><strong>LOCATÁRIO:</strong> ${tenant.nome}, ${tenant.rg ? 'RG: '+tenant.rg : ''} ${tenant.cpf ? 'CPF: '+tenant.cpf : ''}</p>
            </div>

            ${clauses.map(c => `
            <div class="contract-clause">
                <p class="clause-title">${c.title}:</p>
                <p class="clause-text">${c.text}</p>
                ${c.items ? `<div class="clause-items">${c.items.map(i => `<p class="clause-item">${i}</p>`).join('')}</div>` : ''}
                ${c.extra ? `<p class="clause-extra">${c.extra}</p>` : ''}
            </div>`).join('')}

            <div class="contract-closing">
                <p>E, por assim estarem justos e contratados, assinam o presente instrumento em duas (02) vias de igual teor e forma, juntamente com as testemunhas.</p>
            </div>

            <div class="contract-date">
                <p>Nova Friburgo, ____ de _______________ de ______.</p>
            </div>

            <div class="contract-signatures">
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="signature-label"><strong>LOCADOR:</strong> ${owner.name || '________________________'}</div>
                    <div class="signature-name">${owner.name || ''}</div>
                </div>
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="signature-label"><strong>LOCATÁRIO:</strong> ${tenant.nome}</div>
                    <div class="signature-name">${tenant.nome}</div>
                </div>
            </div>

            <div class="contract-witnesses">
                <p style="margin-top:40px;"><strong>TESTEMUNHAS:</strong></p>
                <div class="witness-row">
                    <div class="witness-block">
                        <div class="signature-line"></div>
                        <div class="witness-label">Nome: _____________________________</div>
                        <div class="witness-label">CPF: ______________________________</div>
                    </div>
                    <div class="witness-block">
                        <div class="signature-line"></div>
                        <div class="witness-label">Nome: _____________________________</div>
                        <div class="witness-label">CPF: ______________________________</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    showContractPrintModal(html);
}

function showContractPrintModal(html) {
    const existing = document.getElementById('contractPrintModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'contractPrintModal';
    overlay.innerHTML = `
        <div class="modal glass modal-xl">
            <div class="modal-header">
                <h2><i class="fas fa-file-contract"></i> Visualizar Contrato</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height:80vh;overflow-y:auto;">
                <div class="contract-modal-print">${html}</div>
            </div>
            <div class="print-toolbar">
                <button class="btn btn-primary" onclick="window.print()">
                    <i class="fas fa-print"></i> Imprimir Contrato
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ==================== SHORT MODAL UTILITY ====================
function showQuickModal(title, content) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `<div class="modal glass" style="max-width:500px;">
        <div class="modal-header"><h2>${title}</h2>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <div class="modal-body">${content}</div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
