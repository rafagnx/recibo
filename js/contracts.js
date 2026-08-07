/* ============================================================
   📋 APOLLOSURFACE — Contracts Module
   CRUD + Impressão de Contratos (18 cláusulas)
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

// ==================== CONTRACT PRINT (18 Cláusulas) ====================

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
        { title: 'CLÁUSULA SEGUNDA', text: `O prazo da locação é de 12 (doze) meses, iniciando-se em ${dataInicio} e a terminar ${dataFim}, independentemente de aviso, notificação ou interpelação judicial ou mesmo extrajudicial.` },
        { title: 'CLÁUSULA TERCEIRA', text: `O aluguel mensal deverá ser pago até o dia ${diaVenc} (dia ${numeroPorExtenso(diaVenc).toLowerCase()}) do mês subsequente ao vencido, no local indicado pelo LOCADOR, é de ${valorAluguel} (${valorExtenso}) mensais, reajustados anualmente, de conformidade com a variação do IGP-M apurada no ano anterior, e na sua falta, por outro índice criado pelo Governo Federal e, ainda, em sua substituição, pela Fundação Getúlio Vargas, reajustamento este sempre incidente e calculado sobre o último aluguel pago no último mês do ano anterior.` },
        { title: 'CLÁUSULA QUARTA', text: `O LOCATÁRIO pagará todos os impostos, tributos e taxas, despesas ordinárias de condomínio, bem como todas e quaisquer outras despesas incidentes sobre o imóvel e sua locação, ônus e encargos outros de que natureza seja, federal, estadual ou municipal, que recaiam ou venham a recair sobre o imóvel ora locado, sendo que correrão, também, por conta do LOCATÁRIO as despesas com ligação e consumo de luz, força que serão pagas diretamente às empresas concessionárias dos referidos serviços.` },
        { title: 'CLÁUSULA QUINTA', text: `Em caso de mora no pagamento do aluguel, aplicar-se-á uma multa de 2% (dois por cento) sobre o valor devido e juros mensais de 1% (um por cento) do montante devido.` },
        { title: 'CLÁUSULA SEXTA', text: `Fica convencionado ainda pelos contratantes que o pagamento da multa não significa a renúncia de qualquer direito ou aceitação da emenda judicial da mora, em caso de qualquer procedimento judicial contra o LOCATÁRIO.` },
        { title: 'CLÁUSULA SÉTIMA', text: `As obras e despesas com a conservação, limpeza e asseio do imóvel correrão por conta, risco e ônus do LOCATÁRIO, ficando este obrigado a devolver o imóvel em perfeitas condições de limpeza, asseio, conservação e pintura, quando finda ou rescindida esta avença, sem qualquer responsabilidade pecuniária para o LOCADOR. O LOCATÁRIO não poderá realizar obras de vulto e nem modificar a estrutura do imóvel ora locado, sem prévia autorização por escrito da LOCADORA. Caso este consinta na realização das obras, estas ficarão desde logo, incorporadas ao imóvel, sem que assista ao LOCATÁRIO qualquer indenização pelas obras ou retenção por benfeitorias. As benfeitorias removíveis poderão ser retiradas, desde que não desfigurem o imóvel locado.`, extra: `PARÁGRAFO ÚNICO – O LOCATÁRIO declara estar recebendo, como de fato recebe, no ato da assinatura deste contrato, o imóvel com todas as dependências em condições de serem ocupadas, conforme LAUDO DE VISTORIA INICIAL em anexo, que passa a integrar o presente instrumento, comprometendo-se a restituí-lo nas mesmas condições em que o recebe, procedendo aos consertos e reparos dos danos que ocorrem durante a locação, sendo-lhe facultado pintar o imóvel quando bem lhe prover, observada a mesma cor e qualidade do material empregado, por sua conta a sem direito a qualquer indenização. Qualquer discordância quanto ao relatório de vistoria do atual estado do imóvel deverá ser feita à ADMINISTRADORA do mesmo, POR ESCRITO, no prazo de 10 (DEZ) dias, a partir da data do início do contrato. Após este prazo considerar-se-á aceita sem qualquer restrição.` },
        { title: 'CLÁUSULA OITAVA', text: `O LOCATÁRIO declara, que o imóvel ora locado, destina-se única e exclusivamente para o seu uso residencial e de sua família.`, extra: `PARÁGRAFO ÚNICO: O LOCATÁRIO obriga por si e sua família, a cumprir e a fazer cumprir integralmente as disposições legais sobre o Condomínio, a sua Convenção e o seu Regulamento Interno.` },
        { title: 'CLÁUSULA NONA', text: `O LOCATÁRIO não poderá sublocar transferir ou ceder o imóvel, sendo nulo de pleno direito qualquer ato praticado com este fim sem o consentimento prévio e por escrito do LOCADOR.` },
        { title: 'CLÁUSULA DÉCIMA', text: `Em caso de sinistro parcial ou total do imóvel locado, que o torne inabitável, o presente contrato ficará rescindido, de pleno direito, independentemente de aviso ou interpelação judicial ou extrajudicial; no caso de incêndio parcial, obrigando a obras de reconstrução, o presente contrato terá suspendido a sua vigência e reduzida a renda do imóvel durante o período da reconstrução à metade do que na época for o aluguel, e sendo após a reconstrução devolvida o LOCATÁRIO pelo prazo restante do contrato, que ficará prorrogado pelo mesmo tempo de duração das obras de reconstrução.` },
        { title: 'CLÁUSULA DÉCIMA PRIMEIRA', text: `Em caso de desapropriação total ou parcial do imóvel locado, ficará rescindido de pleno direito o presente contrato de locação, independente de quaisquer indenizações de ambas as partes ou contratantes.` },
        { title: 'CLÁUSULA DÉCIMA SEGUNDA', text: `Em caso de falecimento do FIADOR, o LOCATÁRIO, deverá no prazo de 60 (sessenta) dias, dar substituto idôneo que possa garantir o valor locativo e encargos do referido imóvel, colocando o LOCADOR a salvaguarda.` },
        { title: 'CLÁUSULA DÉCIMA TERCEIRA', text: `No caso de alienação do imóvel, obriga-se o LOCADOR, dar preferência ao LOCATÁRIO, e se o mesmo não se utilizar dessa prerrogativa, o LOCADOR deverá constar da respectiva escritura pública, a existência do presente contrato, para que o adquirente o respeite nos termos da legislação vigente.` },
        { title: 'CLÁUSULA DÉCIMA QUARTA', text: `Como interveniente FIADOR e principal pagador do LOCATÁRIO, com este solidariamente responsável pelo pontual pagamento do aluguel, demais encargos e importâncias cobráveis e exigíveis, e, pelo fiel cumprimento de todas as cláusulas e condições deste contrato, não só até o final de seu prazo, como mesmo depois, até a efetiva entrega das chaves ao LOCADOR.` },
        { title: 'CLÁUSULA DÉCIMA QUINTA', text: `Ao LOCADOR é facultado, por si ou seus procuradores, vistoriar o imóvel, sempre que achar conveniente, para certeza do cumprimento das obrigações assumidas neste contrato.` },
        { title: 'CLÁUSULA DÉCIMA SEXTA', text: `Cabe ao LOCATÁRIO, o cumprimento, dentro dos prazos legais, de quaisquer multas ou intimações por infrações das leis, portarias ou regulamentos vigentes, originários de quaisquer repartições ou entidades. Obriga-se ainda, a entregar ao LOCADOR, dentro de prazos que permita o seu cumprimento, aviso ou notificação de interesse do imóvel, sob pena de, não o fazendo, assumir integral responsabilidade pela falta.` },
        { title: 'CLÁUSULA DÉCIMA SÉTIMA', text: `A infração de qualquer das cláusulas do presente contrato, sujeita o infrator à multa de duas vezes o valor do aluguel, tomando-se por base, o último aluguel vencido, cobrável ou não por ação executiva, sem prejuízo da rescisão imediata deste contrato, além do pagamento de todas as despesas por procedimentos judiciais e outras sanções que o caso indicar.` },
        { title: 'CLÁUSULA DÉCIMA OITAVA', text: `As partes contratantes obrigam-se por si, herdeiros e/ou sucessores, elegendo o Foro da Cidade de Nova Friburgo/RJ, para o processamento de qualquer ação oriunda da presente avença, renunciando, de futuro, a qualquer outro, por mais privilegiado que seja o domicílio dos mesmos.` }
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
                ${c.extra ? `<p class="clause-extra">${c.extra}</p>` : ''}
            </div>`).join('')}

            <div class="contract-closing">
                <p>E, por assim estarem justos e contratados, mandaram extrair o presente instrumento em duas (02) vias, para um só efeito, assinando-as, juntamente com as testemunhas, a tudo presentes.</p>
            </div>

            <div class="contract-date">
                <p>${contract.dataInicio ? fmtDate(contract.dataInicio) : 'Nova Friburgo, __ de ________ de ______'}.</p>
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
