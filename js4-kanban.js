// ==========================================
// KANBAN, EDIÇÃO DE PEDIDOS E WHATSAPP
// ==========================================
function renderizarKanban() {
    try {
        let htmlFeito = ''; let htmlFila = ''; let htmlPronta = ''; let htmlEnviado = '';
        todosPedidos.forEach(p => {
            try {
                let statusRender = p.statusAtualizado || 'PEDIDO FEITO';
                let btnPgto = p.statusPagamento === 'PAGO' ? `<button class="btn-pgto pgto-pago" onclick="trocarPgto('${p.id}','PENDENTE')">💰 PAGO</button>` : `<button class="btn-pgto pgto-pendente" onclick="trocarPgto('${p.id}','PAGO')">⏳ PEND</button>`;
                
                let itensHtml = ''; let itensCount = 0;
                if (p.itens && Array.isArray(p.itens)) {
                    itensCount = p.itens.length;
                    itensHtml = p.itens.map(i => {
                        if(!i) return '';
                        return `<div class="item-tag-compacto" style="background:#fff; border:1px solid #111; border-left:3px solid #c1121f; padding:6px; margin-bottom:4px;"><div class="item-tag-topo"><span>${i.quantidade || 1}x ${i.tipoPeca || 'PEÇA'}</span></div><div style="font-weight:700; color:#666; font-size:0.7rem;">Tam: ${i.tamanho || '-'} | Cor: ${i.cor || '-'}</div><div style="color:#c1121f; font-weight:900; font-size:0.75rem;">[${i.codigoEstampa || '-'}] ${i.nomeEstampa || '-'}</div></div>`;
                    }).join('');
                }
                
                let d = p.dataCriacaoSafe || new Date(); let diasAtraso = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
                let classeAlerta = ''; let badgeAlerta = '';
                
                if (statusRender !== 'PEDIDO ENVIADO') {
                    if (diasAtraso >= 5) { classeAlerta = 'atraso-critico'; badgeAlerta = `<span style="background: var(--red); color: var(--white); font-size: 0.65rem; padding: 2px 6px; font-weight: 900; display: inline-block; margin-left: 5px;">🚨 ${diasAtraso} D</span>`; } 
                    else if (diasAtraso >= 3) { classeAlerta = 'atraso-medio'; badgeAlerta = `<span style="background: #ffb703; color: #000; font-size: 0.65rem; padding: 2px 6px; font-weight: 900; display: inline-block; margin-left: 5px;">⚠️ ${diasAtraso} D</span>`; }
                }
                
                let iconeRastreio = p.rastreio ? '🚚 ' : ''; let numPedido = p.numeroPedido || '0000'; let dataFmt = p.dataFormatada || '--/--/----'; let nomeCliente = p.nome || 'Cliente'; let zapCliente = p.whatsapp || ''; let totalVal = formatCurrency(p.valorTotal); let metPgt = p.metodoPagamento || 'PIX';

                let cardString = `
                <div class="pedido-card ${classeAlerta}" id="${p.id}" draggable="true" ondragstart="drag(event)" style="display:flex;">
                    <div class="pedido-header"><div class="header-linha-1"><div class="id-container"><span class="pedido-id">${iconeRastreio}#${numPedido}</span>${badgeAlerta}</div><span class="pedido-data">${dataFmt}</span></div>${btnPgto}</div>
                    <div class="pedido-body"><div class="cliente-nome">${nomeCliente} <br><span style="font-size:0.7rem; color:var(--text-muted); font-weight:500;">${zapCliente}</span></div><div class="cliente-financas">${totalVal} - ${metPgt}</div><div class="toggle-itens-btn" onclick="toggleItens('${p.id}')"><span>📦 PEÇAS (${itensCount})</span><span id="seta-${p.id}">▼</span></div><div class="pedido-itens-lista" id="itens-${p.id}">${itensHtml}</div></div>
                    <div class="pedido-footer">
                        <button onclick="if(typeof enviarParaMelhorEnvio === 'function') enviarParaMelhorEnvio('${p.id}')" title="Gerar Etiqueta MelhorEnvio" style="color:var(--black); background:var(--white); border-right:var(--border-thick); flex: 1;"><span style="color:#ffb703; font-size:1rem;">🛒</span> ME</button>
                        <button onclick="enviarMensagemStatus('${p.id}')" title="Avisar cliente" style="color:var(--green); flex: 1;">💬</button>
                        <button onclick="abrirModalEdicao('${p.id}')" title="Editar" style="flex: 1;">✏️</button>
                        <button onclick="excluirPedido('${p.id}')" title="Lixeira" style="color:var(--red); flex: 0.5;">❌</button>
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
    } catch(globalErr) {}
}

function filtrarKanban() {
    try {
        let input = document.getElementById('inputBusca'); let termo = input ? input.value.toUpperCase().trim() : '';
        document.querySelectorAll('.pedido-card').forEach(card => { card.style.display = card.innerText.toUpperCase().includes(termo) ? 'flex' : 'none'; });
    } catch(e){}
}

function drag(ev) { ev.dataTransfer.setData("text", ev.target.id); }
function allowDrop(ev) { ev.preventDefault(); }
function drop(ev, novoStatus) { ev.preventDefault(); let pedidoId = ev.dataTransfer.getData("text"); db.collection("pedidos").doc(pedidoId).update({ status: novoStatus }).then(() => { tocarSomDrop(); }); }

function trocarPgto(id, status) { db.collection("pedidos").doc(id).update({ statusPagamento: status }); }
function excluirPedido(id) { if (confirm("Mandar pedido para a lixeira?")) db.collection("pedidos").doc(id).update({apagado: true}); }

function enviarMensagemStatus(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;
    let zap = p.whatsapp.replace(/\D/g, ''); let primeiroNome = p.nome.split(' ')[0];
    let texto = `Olá ${primeiroNome}! Tudo bem?\n\nO status do seu pedido #${p.numeroPedido} da Waller Clothing foi atualizado para: ${p.statusAtualizado}\n\nRESUMO DO PEDIDO:\n`; 
    let subtotal = 0;
    (p.itens||[]).forEach(i => { let qtd = parseInt(i.quantidade || 1); let valorUn = safeNum(i.valorUnitario); let totalItem = qtd * valorUn; subtotal += totalItem; texto += `[+] ${qtd}x ${i.tipoPeca||''} (${i.nomeEstampa||''} Tam: ${i.tamanho||''}) = ${formatCurrency(totalItem)}\n`; });
    texto += `\nVALORES FINANCEIROS:\nSubtotal: ${formatCurrency(subtotal)}\n`;
    let frete = safeNum(p.valorFrete); if (frete > 0) texto += `Frete: ${formatCurrency(frete)}\n`;
    let desconto = safeNum(p.valorDesconto); if (desconto > 0) texto += `Desconto: ${formatCurrency(desconto)} (abatido)\n`;
    texto += `TOTAL FINAL: ${formatCurrency(safeNum(p.valorTotal))}\n`;
    if(p.rastreio && p.statusAtualizado === 'PEDIDO ENVIADO') { texto += `\nSEU PEDIDO ESTÁ A CAMINHO!\nCódigo de Rastreio: ${p.rastreio}\nAcompanhe no link: https://rastreamento.correios.com.br/app/index.php\n`; }
    let linkFinal = `https://wa.me/55${zap}?text=${encodeURIComponent(texto)}`; window.open(linkFinal, '_blank');
}

function abrirModalEdicao(id) {
    const p = todosPedidos.find(x => x.id === id); if(!p) return;
    document.getElementById('editId').value = p.id; document.getElementById('tituloEditPedido').innerText = "#" + (p.numeroPedido||'');
    document.getElementById('editNome').value = p.nome || ''; document.getElementById('editWhatsapp').value = p.whatsapp || ''; document.getElementById('editCPF').value = p.cpf || ''; document.getElementById('editEmail').value = p.email || ''; document.getElementById('editCEP').value = p.cep || ''; document.getElementById('editEndereco').value = p.endereco || ''; document.getElementById('editNumero').value = p.numeroEnd || ''; document.getElementById('editComplemento').value = p.complemento || ''; document.getElementById('editRastreio').value = p.rastreio || ''; document.getElementById('editValorFrete').value = formatCurrency(safeNum(p.valorFrete)); document.getElementById('editValorFreteReal').value = formatCurrency(safeNum(p.valorFreteReal)); document.getElementById('editValorDesconto').value = formatCurrency(safeNum(p.valorDesconto));
    if(p.metodoPagamento) document.getElementById('editMetodoPagamento').value = p.metodoPagamento;
    itensEdicaoTemporario = JSON.parse(JSON.stringify(p.itens || [])); renderizarItensEdicao(); recalcularSomaEdicao(); document.getElementById('modalEdicao').style.display = 'flex';
}

function autocompletarEstampaEdicao(val) { let code = val.toUpperCase().trim(); if(catalogoEstampas[code]) { document.getElementById('editNomeEstampa').value = catalogoEstampas[code].nome; document.getElementById('editValorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda); } }

function renderizarItensEdicao() {
    let container = document.getElementById('editItensContainer'); container.innerHTML = '';
    itensEdicaoTemporario.forEach((item, index) => { container.innerHTML += `<div style="border: 2px dashed var(--border-color); padding: 10px; margin-bottom: 10px; background: var(--gray); display: flex; justify-content: space-between; align-items: center;"><div><div style="font-weight:900;">${item.quantidade||1}x ${item.tipoPeca||''} [${item.codigoEstampa||''}]</div><div style="font-size:0.8rem;">${item.nomeEstampa||''} - Tam: ${item.tamanho||''} - Cor: ${item.cor||''} - Preço: ${formatCurrency(item.valorUnitario)}</div></div><button type="button" class="btn-remove-item" onclick="removerDoCarrinhoEdicao(${index})" style="padding: 10px; font-size: 1rem;">X</button></div>`; });
}

function adicionarAoCarrinhoEdicao() {
    const cod = document.getElementById('editCodigoEstampa').value.toUpperCase().trim(); const nom = document.getElementById('editNomeEstampa').value.toUpperCase().trim(); const tip = document.getElementById('editTipoPeca').value; const tam = document.getElementById('editTamanho').value; const cor = document.getElementById('editCor').value; const val = safeNum(document.getElementById('editValorUnitario').value); const qtd = parseInt(document.getElementById('editQuantidade').value) || 1;
    if(!cod || !nom) { showToast("Preencha código e nome!", true); return; }
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

function fecharModalEdicao() { document.getElementById('modalEdicao').style.display = 'none'; }

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