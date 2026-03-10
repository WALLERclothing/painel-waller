// ==========================================
// PDV / LANÇAR DROPS
// ==========================================
function mudarTipoDesconto() { document.getElementById('valorDesconto').value = ''; atualizarTelaCarrinho(); document.getElementById('valorDesconto').focus(); }

function preencherVendaBalcao() {
    document.getElementById('whatsapp').value = '(00) 00000-0000'; document.getElementById('nome').value = 'CLIENTE AVULSO / BALCÃO'; document.getElementById('origemVenda').value = 'OUTRO'; document.getElementById('metodoPagamento').value = 'PIX'; document.getElementById('statusPagamento').value = 'PAGO'; document.getElementById('valorFrete').value = 'R$ 0,00'; document.getElementById('valorFreteReal').value = 'R$ 0,00'; document.getElementById('custoEmbalagem').value = 'R$ 0,00'; document.getElementById('valorDesconto').value = ''; document.getElementById('email').value = ''; atualizarTelaCarrinho(); document.getElementById('codigoEstampa').focus(); 
}

function autocompletarCliente(termo, tipo) {
    if (!termo || termo.length < 3) return; let cEncontrado = null;
    if (tipo === 'nome') { let n = termo.toUpperCase().trim(); cEncontrado = Object.values(clientesCadastrados).find(x => (x.nome || '').toUpperCase() === n); } 
    else if (tipo === 'whatsapp') { let w = termo.trim(); cEncontrado = clientesCadastrados[w]; }
    if (cEncontrado) {
        if(tipo === 'nome' && document.getElementById('whatsapp').value !== cEncontrado.whatsapp) document.getElementById('whatsapp').value = cEncontrado.whatsapp || '';
        if(tipo === 'whatsapp' && document.getElementById('nome').value !== cEncontrado.nome) document.getElementById('nome').value = cEncontrado.nome || '';
        document.getElementById('cpf').value = cEncontrado.cpf || ''; document.getElementById('email').value = cEncontrado.email || ''; document.getElementById('cep').value = cEncontrado.cep || ''; document.getElementById('endereco').value = cEncontrado.endereco || ''; document.getElementById('numeroEnd').value = cEncontrado.numero || ''; document.getElementById('complementoEnd').value = cEncontrado.complemento || ''; document.getElementById('alertaClienteFiel').style.display = 'inline-block';
    } else { document.getElementById('alertaClienteFiel').style.display = 'none'; }
}

async function sincronizarClienteEmMassa(whatsapp, dadosObj) {
    if(!whatsapp || whatsapp.length < 10) return;
    try { await db.collection("clientes").doc(whatsapp).set(dadosObj, {merge: true}); } catch(e) { console.error(e); }
    try {
        let snap = await db.collection("pedidos").where("whatsapp", "==", whatsapp).get();
        if(!snap.empty) { let batch = db.batch(); snap.forEach(doc => { batch.update(doc.ref, { nome: dadosObj.nome, cpf: dadosObj.cpf, email: dadosObj.email, cep: dadosObj.cep, endereco: dadosObj.endereco, numeroEnd: dadosObj.numero, complemento: dadosObj.complemento }); }); await batch.commit(); }
    } catch(e) { console.error(e); }
}

function adicionarAoCarrinho() {
    const cod = document.getElementById('codigoEstampa').value.toUpperCase().trim(); 
    const nom = document.getElementById('nomeEstampa').value.toUpperCase().trim();
    const tip = document.getElementById('tipoPeca').value; 
    const tam = document.getElementById('tamanho').value; 
    const cor = document.getElementById('cor').value;
    const val = safeNum(document.getElementById('valorUnitario').value); 
    const qtd = parseInt(document.getElementById('quantidade').value) || 1;
    
    // NOVO: Verifica detalhadamente o que faltou preencher na peça
    let faltantesPeca = [];
    if(!cod) faltantesPeca.push("CÓDIGO/SKU");
    if(!nom) faltantesPeca.push("NOME DA PEÇA");
    if(val <= 0) faltantesPeca.push("PREÇO");
    
    if(faltantesPeca.length > 0) { 
        showToast("Faltou na peça: " + faltantesPeca.join(', '), true); 
        return; 
    }
    
    if(catalogoEstampas[cod] && (catalogoEstampas[cod].estoque[tam] || 0) < qtd) showToast(`Aviso: Estoque baixo para tamanho ${tam}!`, true); 
    const custoProduto = catalogoEstampas[cod] ? safeNum(catalogoEstampas[cod].custo) : 0;
    
    carrinhoTemporario.push({ codigoEstampa: cod, nomeEstampa: nom, tipoPeca: tip, tamanho: tam, cor: cor, quantidade: qtd, valorUnitario: val, custoUnitario: custoProduto });
    atualizarTelaCarrinho(); 
    document.getElementById('codigoEstampa').value = ''; 
    document.getElementById('nomeEstampa').value = ''; 
    document.getElementById('codigoEstampa').focus();
}

function removerDoCarrinho(i) { carrinhoTemporario.splice(i, 1); atualizarTelaCarrinho(); }

function atualizarTelaCarrinho() {
    let somaProdutos = 0; document.getElementById('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p, i) => { somaProdutos += (p.quantidade * safeNum(p.valorUnitario)); document.getElementById('listaCarrinho').innerHTML += `<div class="carrinho-item"><span><strong>${p.quantidade}x</strong> ${p.tipoPeca} (${p.tamanho}) - [${p.codigoEstampa}]</span><div><span style="color:var(--red); font-weight:900;">${formatCurrency(p.valorUnitario)}</span> <button class="btn-remove-item" onclick="removerDoCarrinho(${i})">X</button></div></div>`; });
    let freteCobrado = safeNum(document.getElementById('valorFrete').value); let tipoDescEl = document.getElementById('tipoDesconto'); let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$'; let descontoInput = safeNum(document.getElementById('valorDesconto').value); let descontoReal = tipoDesc === '%' ? somaProdutos * (descontoInput / 100) : descontoInput;
    let total = Math.max(0, somaProdutos + freteCobrado - descontoReal); document.getElementById('valorTotal').value = formatCurrency(total); document.getElementById('carrinho-container').style.display = carrinhoTemporario.length === 0 ? 'none' : 'block'; 
}

function limparFormularioPedido(ignorarConfirm = false) {
    if(!ignorarConfirm && !confirm("Tem certeza que deseja apagar tudo?")) return;
    document.getElementById('whatsapp').value = ''; document.getElementById('nome').value = ''; document.getElementById('cpf').value = ''; document.getElementById('origemVenda').value = 'INSTAGRAM'; document.getElementById('cep').value = ''; document.getElementById('endereco').value = ''; document.getElementById('numeroEnd').value = ''; document.getElementById('complementoEnd').value = ''; document.getElementById('valorFrete').value = ''; document.getElementById('valorFreteReal').value = ''; document.getElementById('custoEmbalagem').value = 'R$ 4,50'; if(document.getElementById('tipoDesconto')) document.getElementById('tipoDesconto').value = 'R$'; document.getElementById('valorDesconto').value = ''; document.getElementById('valorTotal').value = ''; document.getElementById('codigoEstampa').value = ''; document.getElementById('nomeEstampa').value = ''; document.getElementById('valorUnitario').value = ''; document.getElementById('quantidade').value = '1'; document.getElementById('alertaClienteFiel').style.display = 'none'; carrinhoTemporario = []; atualizarTelaCarrinho(); document.getElementById('whatsapp').focus(); 
}

async function salvarPedidoCompleto() {
    let w = document.getElementById('whatsapp').value; 
    let nome = document.getElementById('nome').value.toUpperCase(); 
    
    // NOVO: Verifica detalhadamente o que faltou preencher no formulário geral
    let faltantesGeral = [];
    if(!nome || nome.trim() === '') faltantesGeral.push("NOME DO CLIENTE");
    if(!w || w.replace(/\D/g, '').length < 10) faltantesGeral.push("WHATSAPP INVÁLIDO");
    if(carrinhoTemporario.length === 0) faltantesGeral.push("1 PEÇA NO CARRINHO");
    
    if(faltantesGeral.length > 0) { 
        showToast("Faltou preencher: " + faltantesGeral.join(' | '), true); 
        return; 
    }

    let freteCobrado = safeNum(document.getElementById('valorFrete').value); let freteRealInput = safeNum(document.getElementById('valorFreteReal').value); let embalagem = safeNum(document.getElementById('custoEmbalagem').value);
    let somaVendaPecas = 0; carrinhoTemporario.forEach(item => { somaVendaPecas += (safeNum(item.valorUnitario) * parseInt(item.quantidade)); });
    let tipoDescEl = document.getElementById('tipoDesconto'); let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$'; let descontoInput = safeNum(document.getElementById('valorDesconto').value); let descontoRealDB = tipoDesc === '%' ? somaVendaPecas * (descontoInput / 100) : descontoInput; let totalCobrado = safeNum(document.getElementById('valorTotal').value);
    let somaCustoPecas = 0; carrinhoTemporario.forEach(item => { somaCustoPecas += (safeNum(item.custoUnitario) * parseInt(item.quantidade)); });
    let freteRealCalculo = freteRealInput > 0 ? freteRealInput : freteCobrado; let custoTotal = somaCustoPecas + embalagem + freteRealCalculo; let lucroCalculado = totalCobrado - custoTotal;
    let btnSalvar = document.getElementById('btnGerarOrdem'); btnSalvar.innerText = "SALVANDO..."; btnSalvar.disabled = true; let numGerado = Math.floor(1000 + Math.random() * 9000).toString();
    let dadosObj = { whatsapp: w, nome: nome, cpf: document.getElementById('cpf').value, email: document.getElementById('email').value.toLowerCase().trim(), cep: document.getElementById('cep').value, endereco: document.getElementById('endereco').value, numero: document.getElementById('numeroEnd').value, complemento: document.getElementById('complementoEnd').value, apagadoCRM: false };
    let enderecoMontado = dadosObj.endereco + (dadosObj.numero ? ", " + dadosObj.numero : "");
    try {
        await db.collection("pedidos").add({ numeroPedido: numGerado, nome: dadosObj.nome, whatsapp: w, cpf: dadosObj.cpf, email: dadosObj.email, origemVenda: document.getElementById('origemVenda').value, cep: dadosObj.cep, endereco: enderecoMontado, numeroEnd: dadosObj.numero, complemento: dadosObj.complemento, valorFrete: freteCobrado, valorFreteReal: freteRealInput, custoEmbalagem: embalagem, valorDesconto: descontoRealDB, valorTotal: totalCobrado, custoTotalPedido: somaCustoPecas, lucroTotalPedido: lucroCalculado, apagado: false, metodoPagamento: document.getElementById('metodoPagamento').value, statusPagamento: document.getElementById('statusPagamento').value, itens: carrinhoTemporario, status: 'PEDIDO FEITO', rastreio: '', dataCriacao: firebase.firestore.FieldValue.serverTimestamp() });
        await sincronizarClienteEmMassa(w, dadosObj);
        carrinhoTemporario.forEach(item => { if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) { db.collection("estampas").doc(item.codigoEstampa).update({ ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(-item.quantidade) }); } });
        limparFormularioPedido(true); tocarSomSucesso(); showToast(`PEDIDO #${numGerado} SALVO!`);
    } catch (e) { showToast("Erro ao salvar", true); } finally { btnSalvar.innerText = "GERAR ORDEM DE SERVIÇO"; btnSalvar.disabled = false; }
}