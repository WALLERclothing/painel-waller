// ==========================================
// KANBAN, EDIÇÃO DE PEDIDOS, WHATSAPP E LOGÍSTICA REVERSA
// ==========================================
let pedidosSelecionadosBulk = new Set();

function renderizarKanban() {
    try {
        let htmlFeito = ''; let htmlFila = ''; let htmlPronta = ''; let htmlEnviado = '';
        todosPedidos.forEach(p => {
            try {
                let statusRender = p.statusAtualizado || 'PEDIDO FEITO';
                
                if (statusRender === 'PEDIDO FINALIZADO') return;

                let btnPgto = p.statusPagamento === 'PAGO' ? `<button class="btn-pgto pgto-pago" onclick="trocarPgto('${p.id}','PENDENTE')">💰 PAGO</button>` : `<button class="btn-pgto pgto-pendente" onclick="trocarPgto('${p.id}','PAGO')">⏳ PEND</button>`;

                let itensHtml = ''; let itensCount = 0; let tiposPecaPedido = [];
                if (p.itens && Array.isArray(p.itens)) {
                    itensCount = p.itens.length;
                    itensHtml = p.itens.map(i => {
                        if(!i) return '';
                        if(i.tipoPeca) tiposPecaPedido.push(i.tipoPeca.toUpperCase());
                        return `<div class="item-tag-compacto" style="background:#fff; border:1px solid #111; border-left:3px solid #c1121f; padding:6px; margin-bottom:4px;"><div class="item-tag-topo"><span>${i.quantidade || 1}x ${i.tipoPeca || 'PEÇA'}</span></div><div style="font-weight:700; color:#666; font-size:0.7rem;">Tam: ${i.tamanho || '-'} | Cor: ${i.cor || '-'}</div><div style="color:#c1121f; font-weight:900; font-size:0.75rem;">[${i.codigoEstampa || '-'}] ${i.nomeEstampa || '-'}</div></div>`;
                    }).join('');
                }

                let d = p.dataCriacaoSafe || new Date(); let diasAtraso = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
                let classeAlerta = ''; let badgeAlerta = '';

                if (statusRender !== 'PEDIDO ENVIADO') {
                    if (diasAtraso >= 7) { classeAlerta = 'atraso-absoluto'; badgeAlerta = `<span style="background: #000; color: #fff; font-size: 0.65rem; padding: 2px 6px; font-weight: 900; display: inline-block; margin-left: 5px;">💀 ${diasAtraso}D ATRASO</span>`; }
                    else if (diasAtraso >= 5) { classeAlerta = 'atraso-critico'; badgeAlerta = `<span style="background: var(--red); color: var(--white); font-size: 0.65rem; padding: 2px 6px; font-weight: 900; display: inline-block; margin-left: 5px;">🚨 ${diasAtraso}D</span>`; }
                    else if (diasAtraso >= 3) { classeAlerta = 'atraso-medio'; badgeAlerta = `<span style="background: #ffb703; color: #000; font-size: 0.65rem; padding: 2px 6px; font-weight: 900; display: inline-block; margin-left: 5px;">⚠️ ${diasAtraso}D</span>`; }
                }

                let isChecked = pedidosSelecionadosBulk.has(p.id) ? 'checked' : '';
                let checkboxHtml = statusRender !== 'PEDIDO ENVIADO' ? `<input type="checkbox" class="checkbox-batch" onchange="toggleBulkSelection('${p.id}', this.checked)" ${isChecked}>` : '';

                let iconeRastreio = p.rastreio ? '🚚 ' : ''; let numPedido = p.numeroPedido || '0000'; let dataFmt = p.dataFormatada || '--/--/----'; let nomeCliente = p.nome || 'Cliente'; let zapCliente = p.whatsapp || ''; let totalVal = formatCurrency(p.valorTotal); let metPgt = p.metodoPagamento || 'PIX';
                let infoCriador = p.criadoPor ? `<span style="font-size:0.65rem; color:var(--red); font-weight:900; display:block; margin-top:3px; text-transform:uppercase;">👤 Lançado por: ${p.criadoPor}</span>` : '';

                let btnEsquerdoInfo = '';
                if (statusRender === 'PEDIDO ENVIADO' && diasAtraso >= 7) {
                    btnEsquerdoInfo = `<button onclick="pedirFeedback('${p.id}')" title="Pedir Avaliação do Cliente" style="color:var(--white); background:var(--black); border-right:var(--border-thick); flex: 1.5; font-size:0.7rem;">⭐ FEEDBACK</button>`;
                } else {
                    btnEsquerdoInfo = `<button onclick="if(typeof enviarParaMelhorEnvio === 'function') enviarParaMelhorEnvio('${p.id}')" title="Gerar Etiqueta MelhorEnvio" style="color:var(--black); background:var(--white); border-right:var(--border-thick); flex: 1;"><span style="color:#ffb703; font-size:1rem;">🛒</span> ME</button>`;
                }

                let btnArquivar = `<button onclick="arquivarPedido('${p.id}')" title="Mandar para o Arquivo (Finalizados)" style="color:var(--black); flex: 0.8; font-size:1rem;">📁</button>`;

                let cardString = `
                <div class="pedido-card ${classeAlerta}" id="${p.id}" data-tipos="${tiposPecaPedido.join(',')}" data-mes="${p.dataMesAno}" style="display:flex; cursor: grab; flex-direction:column;">
                    <div class="pedido-header" style="display:flex; align-items:center;"><div class="header-linha-1" style="display:flex; align-items:center;">${checkboxHtml}<div class="id-container"><span class="pedido-id">${iconeRastreio}#${numPedido}</span>${badgeAlerta}</div><span class="pedido-data" style="margin-left:auto;">${dataFmt}</span></div>${btnPgto}</div>
                    <div class="pedido-body"><div class="cliente-nome">${nomeCliente} <br><span style="font-size:0.7rem; opacity:0.8; font-weight:500;">${zapCliente}</span>${infoCriador}</div><div class="cliente-financas">${totalVal} - ${metPgt}</div><div class="toggle-itens-btn" onclick="toggleItens('${p.id}')"><span>📦 PEÇAS (${itensCount})</span><span id="seta-${p.id}">▼</span></div><div class="pedido-itens-lista" id="itens-${p.id}" style="display:none;">${itensHtml}</div></div>
                    <div class="pedido-footer" style="margin-top:auto;">
                        ${btnEsquerdoInfo}
                        ${btnArquivar}
                        <button onclick="abrirModalTroca('${p.id}')" title="Troca ou Devolução" style="color:var(--black); flex: 0.8; font-size:1rem;">🔁</button>
                        <button onclick="enviarMensagemStatus('${p.id}')" title="Avisar cliente" style="color:var(--green); flex: 1;">💬</button>
                        <button onclick="abrirModalEdicao('${p.id}')" title="Editar" style="flex: 1;">✏️</button>
                        <button onclick="excluirPedido('${p.id}')" title="Lixeira (Estorna Estoque)" style="color:var(--red); flex: 0.5;">❌</button>
                    </div>
                </div>`;

                if (statusRender === 'AGUARDANDO ESTAMPA') htmlFila += cardString;
                else if (statusRender === 'ESTAMPA PRONTA') htmlPronta += cardString;
                else if (statusRender === 'PEDIDO ENVIADO') htmlEnviado += cardString;
                else htmlFeito += cardString;
            } catch (err) {}
        });

        let col1 = document.getElementById('col-PEDIDO-FEITO'); if(col1) col1.innerHTML = htmlFeito;
        let col2 = document.getElementById('col-AGUARDANDO-ESTAMPA'); if(col2) col2.innerHTML = htmlFila;
        let col3 = document.getElementById('col-ESTAMPA-PRONTA'); if(col3) col3.innerHTML = htmlPronta;
        let col4 = document.getElementById('col-PEDIDO-ENVIADO'); if(col4) col4.innerHTML = htmlEnviado;

        filtrarKanban();
        popularFiltroMeses();
        initSortable(); 
        atualizarBarraBulk();
    } catch(globalErr) {}
}

function initSortable() {
    if(typeof Sortable === 'undefined') return;
    const cols = ['col-PEDIDO-FEITO', 'col-AGUARDANDO-ESTAMPA', 'col-ESTAMPA-PRONTA', 'col-PEDIDO-ENVIADO'];
    const statusMap = { 'col-PEDIDO-FEITO': 'PEDIDO FEITO', 'col-AGUARDANDO-ESTAMPA': 'AGUARDANDO ESTAMPA', 'col-ESTAMPA-PRONTA': 'ESTAMPA PRONTA', 'col-PEDIDO-ENVIADO': 'PEDIDO ENVIADO' };

    cols.forEach(colId => {
        let el = document.getElementById(colId);
        if(el) {
            Sortable.create(el, {
                group: 'kanban',
                animation: 150, delay: 150, delayOnTouchOnly: true, ghostClass: 'sortable-ghost',
                onEnd: function (evt) {
                    let itemEl = evt.item; let toCol = evt.to.id; let novoStatus = statusMap[toCol];
                    if(novoStatus) { db.collection("pedidos").doc(itemEl.id).update({ status: novoStatus }).then(() => { tocarSomDrop(); }); }
                },
            });
        }
    });
}

function arquivarPedido(id) {
    if(confirm("Deseja mandar este pedido para os Finalizados (Arquivo)?\n\nIsso fará com que ele suma do Kanban para manter a tela limpa.")) {
        db.collection("pedidos").doc(id).update({ status: 'PEDIDO FINALIZADO' }).then(() => {
            tocarSomSucesso();
            showToast("Pedido Arquivado com sucesso!");
        });
    }
}

function abrirModalFinalizados() {
    renderizarFinalizados();
    document.getElementById('modalArquivo').style.display = 'flex';
}

function fecharModalFinalizados() {
    document.getElementById('modalArquivo').style.display = 'none';
}

function renderizarFinalizados() {
    let tbody = document.getElementById('bodyTabelaFinalizados');
    if (!tbody) return;

    let finalizados = todosPedidos.filter(p => p.statusAtualizado === 'PEDIDO FINALIZADO');
    finalizados.sort((a,b) => b.dataCriacaoSafe - a.dataCriacaoSafe); 

    if(finalizados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; font-weight:bold; color:var(--text-muted);">Nenhum pedido finalizado ainda.</td></tr>';
        return;
    }

    tbody.innerHTML = finalizados.map(p => {
        return `
        <tr style="border-bottom: 1px solid var(--gray); background: var(--white);">
            <td style="padding: 15px 10px; font-size:0.85rem; font-weight:bold; color:var(--text-muted);">${p.dataFormatada}</td>
            <td style="padding: 15px 10px; font-weight:900;">#${p.numeroPedido}</td>
            <td style="padding: 15px 10px; font-weight:bold;">${p.nome}</td>
            <td style="padding: 15px 10px; color:var(--green); font-weight:900; font-size:1.1rem;">${formatCurrency(p.valorTotal)}</td>
            <td style="padding: 15px 10px; text-align:center;">
                <button onclick="abrirModalEdicao('${p.id}'); fecharModalFinalizados();" style="background:var(--white); border:2px solid var(--black); font-weight:bold; padding:6px 10px; cursor:pointer;">✏️ VER / EDITAR</button>
                <button onclick="voltarParaKanban('${p.id}')" style="background:var(--black); color:var(--white); font-weight:bold; border:none; padding:8px 10px; cursor:pointer;">🔙 VOLTAR PRO KANBAN</button>
            </td>
        </tr>`;
    }).join('');
}

function voltarParaKanban(id) {
    if(confirm("Deseja voltar este pedido para a fila do Kanban (PEDIDO FEITO)?")) {
        db.collection("pedidos").doc(id).update({ status: 'PEDIDO FEITO' }).then(() => {
            renderizarFinalizados();
            showToast("Pedido voltou para o Kanban!");
        });
    }
}

function popularFiltroMeses() {
    let selectMes = document.getElementById('filtroMesKanban'); if(!selectMes) return;
    let mesesUnicos = new Set();
    todosPedidos.forEach(p => { if(p.dataMesAno) mesesUnicos.add(p.dataMesAno); });
    let optionsHTML = '<option value="">📅 QUALQUER MÊS</option>';
    Array.from(mesesUnicos).sort().reverse().forEach(m => optionsHTML += `<option value="${m}">${m}</option>`);
    if(selectMes.innerHTML !== optionsHTML) selectMes.innerHTML = optionsHTML;
}

function filtrarKanban() {
    try {
        let input = document.getElementById('inputBusca'); let termo = input ? input.value.toUpperCase().trim() : '';
        let filtroPeca = document.getElementById('filtroPecaKanban') ? document.getElementById('filtroPecaKanban').value.toUpperCase() : '';
        let filtroMes = document.getElementById('filtroMesKanban') ? document.getElementById('filtroMesKanban').value : '';

        document.querySelectorAll('.pedido-card').forEach(card => {
            let textoCard = card.innerText.toUpperCase();
            let tiposCard = card.getAttribute('data-tipos') || '';
            let mesCard = card.getAttribute('data-mes') || '';
            
            let matchTexto = textoCard.includes(termo);
            let matchPeca = filtroPeca === '' || tiposCard.includes(filtroPeca);
            let matchMes = filtroMes === '' || mesCard === filtroMes;

            card.style.display = (matchTexto && matchPeca && matchMes) ? 'flex' : 'none';
        });
    } catch(e){}
}

function toggleBulkSelection(id, isChecked) {
    if(isChecked) pedidosSelecionadosBulk.add(id); else pedidosSelecionadosBulk.delete(id);
    atualizarBarraBulk();
}

function atualizarBarraBulk() {
    let barra = document.getElementById('bulk-action-bar');
    if(!barra) return;
    let countSpan = document.getElementById('bulk-count');
    
    if(pedidosSelecionadosBulk.size > 0) {
        if(countSpan) countSpan.innerText = pedidosSelecionadosBulk.size;
        barra.style.display = 'flex';
        setTimeout(() => barra.classList.add('show'), 10);
    } else {
        barra.classList.remove('show');
        setTimeout(() => { if(pedidosSelecionadosBulk.size === 0) barra.style.display = 'none'; }, 300);
    }
}

function limparBulk() {
    pedidosSelecionadosBulk.clear();
    document.querySelectorAll('.checkbox-batch').forEach(cb => cb.checked = false);
    atualizarBarraBulk();
}

async function executarBulkUpdate() {
    let novoStatus = document.getElementById('bulk-status-select').value;
    if(pedidosSelecionadosBulk.size === 0) return;
    if(!confirm(`Mover ${pedidosSelecionadosBulk.size} pedidos de uma vez para ${novoStatus}?`)) return;

    let batch = db.batch();
    pedidosSelecionadosBulk.forEach(id => {
        let ref = db.collection("pedidos").doc(id);
        batch.update(ref, { status: novoStatus });
    });

    await batch.commit();
    showToast(`${pedidosSelecionadosBulk.size} pedidos atualizados com sucesso!`);
    limparBulk();
    tocarSomDrop();
}

function trocarPgto(id, status) { db.collection("pedidos").doc(id).update({ statusPagamento: status }); }

async function excluirPedido(id) { 
    if (confirm("Tens a certeza? Se apagares, os itens deste pedido vão VOLTAR PARA O ESTOQUE automaticamente.")) {
        let p = todosPedidos.find(x => x.id === id);
        if (p && p.itens && p.itens.length > 0) {
            let batch = db.batch();
            p.itens.forEach(item => {
                if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) {
                    let ref = db.collection("estampas").doc(item.codigoEstampa);
                    batch.update(ref, { ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(parseInt(item.quantidade || 1)) });
                }
            });
            batch.update(db.collection("pedidos").doc(id), { apagado: true });
            await batch.commit();
            showToast("Pedido apagado e Peças devolvidas ao estoque!");
        } else {
            db.collection("pedidos").doc(id).update({apagado: true}).then(()=> showToast("Pedido apagado."));
        }
    } 
}

function pedirFeedback(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;
    let zap = p.whatsapp.replace(/\D/g, ''); let primeiroNome = p.nome.split(' ')[0];
    let texto = `Fala ${primeiroNome}, tudo beleza? Aqui é da Waller Clothing! 💀\n\nVimos que o teu drop chegou há uns dias. Curtiu as peças? Se puderes tirar uma foto e marcar a @wallerclothing no Insta, ajuda muito a firma!\n\nSe precisares de alguma coisa, tamo junto! 👊`;
    window.open(`https://wa.me/55${zap}?text=${encodeURIComponent(texto)}`, '_blank');
}

function enviarMensagemStatus(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;
    let zap = p.whatsapp.replace(/\D/g, ''); let primeiroNome = p.nome.split(' ')[0];
    let texto = `Olá ${primeiroNome}! Tudo bem?\n\nO status do teu pedido #${p.numeroPedido} da Waller Clothing foi atualizado para: ${p.statusAtualizado}\n\nRESUMO DO PEDIDO:\n`; 
    let subtotal = 0;
    (p.itens||[]).forEach(i => { let qtd = parseInt(i.quantidade || 1); let valorUn = safeNum(i.valorUnitario); let totalItem = qtd * valorUn; subtotal += totalItem; texto += `[+] ${qtd}x ${i.tipoPeca||''} (${i.nomeEstampa||''} Tam: ${i.tamanho||''}) = ${formatCurrency(totalItem)}\n`; });
    texto += `\nVALORES FINANCEIROS:\nSubtotal: ${formatCurrency(subtotal)}\n`;
    let frete = safeNum(p.valorFrete); if (frete > 0) texto += `Frete: ${formatCurrency(frete)}\n`;
    let desconto = safeNum(p.valorDesconto); if (desconto > 0) texto += `Desconto: ${formatCurrency(desconto)} (abatido)\n`;
    texto += `TOTAL FINAL: ${formatCurrency(safeNum(p.valorTotal))}\n`;
    if(p.rastreio && p.statusAtualizado === 'PEDIDO ENVIADO') { texto += `\nO TEU PEDIDO ESTÁ A CAMINHO!\nCódigo de Rastreio: ${p.rastreio}\nAcompanha no link: https://rastreamento.correios.com.br/app/index.php\n`; }
    let linkFinal = `https://wa.me/55${zap}?text=${encodeURIComponent(texto)}`; window.open(linkFinal, '_blank');
}

function abrirModalTroca(id) {
    const p = todosPedidos.find(x => x.id === id); if(!p) return;
    document.getElementById('trocaPedidoId').value = p.id;
    
    let container = document.getElementById('listaItensTroca');
    container.innerHTML = '';
    
    if(!p.itens || p.itens.length === 0) {
        container.innerHTML = '<p>Não há itens neste pedido para devolver.</p>';
    } else {
        p.itens.forEach((item, index) => {
            container.innerHTML += `
            <div style="background:var(--gray); border:1px solid var(--border-color); padding:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:var(--black); font-size:1rem;">${item.quantidade}x ${item.nomeEstampa}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">Tam: ${item.tamanho} | Cod: ${item.codigoEstampa}</span>
                </div>
                <button onclick="devolverItemTroca('${p.id}', ${index})" style="background:var(--black); color:var(--white); border:none; padding:8px 15px; font-weight:900; font-size:0.8rem; cursor:pointer;">↩️ DEVOLVER</button>
            </div>`;
        });
    }
    
    document.getElementById('valorFreteTroca').value = '';
    document.getElementById('modalTroca').style.display = 'flex';
}

async function devolverItemTroca(pedidoId, indexItem) {
    if(!confirm("A peça vai ser devolvida para o estoque atual. Confirmas?")) return;
    
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;
    let itemRemovido = p.itens[indexItem];
    
    p.itens.splice(indexItem, 1);
    
    let batch = db.batch();
    if(itemRemovido.codigoEstampa && catalogoEstampas[itemRemovido.codigoEstampa]) {
        let refEstampa = db.collection("estampas").doc(itemRemovido.codigoEstampa);
        batch.update(refEstampa, { ["estoqueGrade." + itemRemovido.tamanho]: firebase.firestore.FieldValue.increment(parseInt(itemRemovido.quantidade || 1)) });
    }
    
    batch.update(db.collection("pedidos").doc(pedidoId), { itens: p.itens, complemento: (p.complemento || '') + " [1 PEÇA ESTORNADA]" });
    await batch.commit();
    
    showToast("Peça devolvida ao estoque com sucesso!");
    abrirModalTroca(pedidoId); 
}

function lancarDespesaTroca() {
    let valor = safeNum(document.getElementById('valorFreteTroca').value);
    let desc = document.getElementById('descFreteTroca').value.toUpperCase().trim();
    if(valor <= 0) { showToast("Digite um valor válido de frete", true); return; }
    
    let hoje = new Date().toISOString().split('T')[0];
    db.collection("transacoes_manuais").add({ 
        tipo: 'SAIDA', conta: 'CONTA PJ', categoria: 'LOGISTICA', descricao: desc, valor: valor, dataIso: hoje, dataCriacao: firebase.firestore.FieldValue.serverTimestamp() 
    }).then(() => { 
        document.getElementById('valorFreteTroca').value = ''; 
        showToast("Custo do Frete lançado no Caixa!"); 
    });
}

function abrirModalEdicao(id) {
    const p = todosPedidos.find(x => x.id === id); if(!p) return;
    let modal = document.getElementById('modalEdicao');
    if(!modal) return;
    document.getElementById('editId').value = p.id; document.getElementById('tituloEditPedido').innerText = "#" + (p.numeroPedido||'');
    document.getElementById('editNome').value = p.nome || ''; document.getElementById('editWhatsapp').value = p.whatsapp || ''; document.getElementById('editCPF').value = p.cpf || ''; document.getElementById('editEmail').value = p.email || ''; document.getElementById('editCEP').value = p.cep || ''; document.getElementById('editEndereco').value = p.endereco || ''; document.getElementById('editNumero').value = p.numeroEnd || ''; document.getElementById('editComplemento').value = p.complemento || ''; document.getElementById('editRastreio').value = p.rastreio || ''; document.getElementById('editValorFrete').value = formatCurrency(safeNum(p.valorFrete)); document.getElementById('editValorFreteReal').value = formatCurrency(safeNum(p.valorFreteReal)); document.getElementById('editValorDesconto').value = formatCurrency(safeNum(p.valorDesconto));
    if(p.metodoPagamento) document.getElementById('editMetodoPagamento').value = p.metodoPagamento;
    itensEdicaoTemporario = JSON.parse(JSON.stringify(p.itens || [])); renderizarItensEdicao(); recalcularSomaEdicao(); 
    modal.style.display = 'flex';
}

function autocompletarEstampaEdicao(val) { 
    let code = val.toUpperCase().trim(); 
    if(catalogoEstampas[code]) { document.getElementById('editNomeEstampa').value = catalogoEstampas[code].nome; document.getElementById('editValorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda); } 
}

// NOVO: Autocompletar por NOME na Edição de Pedido
function autocompletarEstampaPorNomeEdicao(val) {
    let nomeBuscado = val.toUpperCase().trim();
    let p = Object.values(catalogoEstampas).find(x => !x.apagado && x.nome.toUpperCase() === nomeBuscado);
    if (p) {
        document.getElementById('editCodigoEstampa').value = p.codigo;
        document.getElementById('editValorUnitario').value = formatCurrency(p.precoVenda);
        let c = p.categoria ? p.categoria.toUpperCase() : '';
        let selectTipo = document.getElementById('editTipoPeca');
        if(selectTipo) {
            for(let i=0; i<selectTipo.options.length; i++) { if(c.includes(selectTipo.options[i].value)) { selectTipo.selectedIndex = i; break; } }
        }
    }
}

function renderizarItensEdicao() {
    let container = document.getElementById('editItensContainer'); if(!container) return; container.innerHTML = '';
    itensEdicaoTemporario.forEach((item, index) => { 
        container.innerHTML += `<div style="border: 2px dashed var(--border-color); padding: 10px; margin-bottom: 10px; background: var(--gray); display: flex; justify-content: space-between; align-items: center;"><div><div style="font-weight:900;">${item.quantidade||1}x ${item.tipoPeca||''} [${item.codigoEstampa||''}]</div><div style="font-size:0.8rem;">${item.nomeEstampa||''} - Tam: ${item.tamanho||''} - Cor: ${item.cor||''} - Preço: ${formatCurrency(item.valorUnitario)}</div></div><button type="button" class="btn-remove-item" onclick="removerDoCarrinhoEdicao(${index})" style="padding: 10px; font-size: 1rem;">X</button></div>`; 
    });
}

function adicionarAoCarrinhoEdicao() {
    const cod = document.getElementById('editCodigoEstampa').value.toUpperCase().trim(); const nom = document.getElementById('editNomeEstampa').value.toUpperCase().trim(); const tip = document.getElementById('editTipoPeca').value; const tam = document.getElementById('editTamanho').value; const cor = document.getElementById('editCor').value; const val = safeNum(document.getElementById('editValorUnitario').value); const qtd = parseInt(document.getElementById('editQuantidade').value) || 1;
    if(!cod || !nom) { showToast("Preenche o código e nome!", true); return; }
    const custoProduto = catalogoEstampas[cod] ? safeNum(catalogoEstampas[cod].custo) : 0;
    itensEdicaoTemporario.push({ codigoEstampa: cod, nomeEstampa: nom, tipoPeca: tip, tamanho: tam, cor: cor, quantidade: qtd, valorUnitario: val, custoUnitario: custoProduto });
    document.getElementById('editCodigoEstampa').value = ''; document.getElementById('editNomeEstampa').value = ''; document.getElementById('editCodigoEstampa').focus();
    renderizarItensEdicao(); recalcularSomaEdicao();
}

function removerDoCarrinhoEdicao(i) { itensEdicaoTemporario.splice(i, 1); renderizarItensEdicao(); recalcularSomaEdicao(); }

function recalcularSomaEdicao() {
    let somaVendaPecas = 0; itensEdicaoTemporario.forEach(item => { somaVendaPecas += (safeNum(item.valorUnitario) * parseInt(item.quantidade||1)); });
    let freteCobrado = safeNum(document.getElementById('editValorFrete').value); let desconto = safeNum(document.getElementById('editValorDesconto').value);
    document.getElementById('editValorTotal').value = formatCurrency(Math.max(0, somaVendaPecas + freteCobrado - desconto));
}

function fecharModalEdicao() { let modal = document.getElementById('modalEdicao'); if(modal) modal.style.display = 'none'; }

async function salvarAlteracoesEdicao() {
    const id = document.getElementById('editId').value; const pedido = todosPedidos.find(x => x.id === id); if(!pedido) return;
    let freteCobradoNovo = safeNum(document.getElementById('editValorFrete').value); let freteRealNovo = safeNum(document.getElementById('editValorFreteReal').value); let descontoNovo = safeNum(document.getElementById('editValorDesconto').value); let rastreio = document.getElementById('editRastreio').value.toUpperCase().trim(); 
    let w = document.getElementById('editWhatsapp').value; 
    let dadosObj = { whatsapp: w, nome: document.getElementById('editNome').value.toUpperCase(), cpf: document.getElementById('editCPF').value, email: document.getElementById('editEmail').value.toLowerCase().trim(), cep: document.getElementById('editCEP').value, endereco: document.getElementById('editEndereco').value.toUpperCase(), numero: document.getElementById('editNumero').value, complemento: document.getElementById('editComplemento').value.toUpperCase() };
    
    let somaCustoPecas = 0; let somaVendaPecas = 0; 
    itensEdicaoTemporario.forEach(item => { somaVendaPecas += (safeNum(item.valorUnitario) * parseInt(item.quantidade||1)); somaCustoPecas += (safeNum(item.custoUnitario) * parseInt(item.quantidade||1)); });
    let custoTotal = somaCustoPecas + safeNum(pedido.custoEmbalagem) + (freteRealNovo > 0 ? freteRealNovo : freteCobradoNovo);
    let novoTotal = Math.max(0, somaVendaPecas + freteCobradoNovo - descontoNovo); let novoLucro = novoTotal - custoTotal;

    let batch = db.batch();
    (pedido.itens || []).forEach(item => { if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) batch.update(db.collection("estampas").doc(item.codigoEstampa), { ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(parseInt(item.quantidade||1)) }); });
    itensEdicaoTemporario.forEach(item => { if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) batch.update(db.collection("estampas").doc(item.codigoEstampa), { ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(-parseInt(item.quantidade||1)) }); });

    batch.update(db.collection("pedidos").doc(id), { nome: dadosObj.nome, whatsapp: dadosObj.whatsapp, cpf: dadosObj.cpf, email: dadosObj.email, cep: dadosObj.cep, endereco: dadosObj.endereco, numeroEnd: dadosObj.numero, complemento: dadosObj.complemento, metodoPagamento: document.getElementById('editMetodoPagamento').value, rastreio: rastreio, valorFrete: freteCobradoNovo, valorFreteReal: freteRealNovo, valorDesconto: descontoNovo, valorTotal: novoTotal, custoTotalPedido: somaCustoPecas, lucroTotalPedido: novoLucro, itens: itensEdicaoTemporario });
    await batch.commit();
    if(typeof sincronizarClienteEmMassa === 'function') await sincronizarClienteEmMassa(w, dadosObj);
    fecharModalEdicao(); showToast("Pedido Atualizado e Sincronizado!");
}
