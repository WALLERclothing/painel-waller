// ==========================================
// PDV, LEITOR FÍSICO E LEITOR DE CÂMERA DO CELULAR
// ==========================================

// Variável para a Câmera do Celular
let html5QrCode = null;

// Leitor Físico (Pistola USB/Bluetooth)
let barcodeBuffer = '';
let barcodeTimer = null;
document.addEventListener('keypress', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.target.id !== 'codigoEstampa') return; 
    }
    if (e.key !== 'Enter') barcodeBuffer += e.key;
    clearTimeout(barcodeTimer);
    barcodeTimer = setTimeout(() => {
        if (barcodeBuffer.length >= 3) { processarCodigoBarras(barcodeBuffer); }
        barcodeBuffer = '';
    }, 60); 
});

// Ação de decodificar e jogar pro carrinho (Serve para Físico e Câmera)
function processarCodigoBarras(codigoBipado) {
    // 1. Limpa espaços acidentais e converte para maiúsculas
    let codBruto = codigoBipado.toUpperCase().trim();
    
    // 2. Remove qualquer lixo depois da barra vertical (caso leias uma etiqueta antiga)
    let textoPrincipal = codBruto.split('|')[0].trim();
    
    // 3. Separa o código do tamanho
    let partes = textoPrincipal.split('-');
    let sku = partes[0].trim();
    let tamanhoSugerido = partes[1] ? partes[1].trim() : null;

    // 4. Procura na base de dados (catalogoEstampas)
    if (catalogoEstampas[sku]) {
        document.getElementById('codigoEstampa').value = sku;
        autocompletarEstampa(sku); 
        
        let tamIdeal = 'M';
        let estq = catalogoEstampas[sku].estoqueGrade || {};
        
        if (tamanhoSugerido && ['P', 'M', 'G', 'GG'].includes(tamanhoSugerido)) {
            tamIdeal = tamanhoSugerido;
        } else {
            if (estq.M > 0) tamIdeal = 'M'; else if (estq.G > 0) tamIdeal = 'G'; else if (estq.P > 0) tamIdeal = 'P'; else if (estq.GG > 0) tamIdeal = 'GG';
        }
        
        document.getElementById('tamanho').value = tamIdeal;
        document.getElementById('quantidade').value = 1;
        adicionarAoCarrinho(); 
        tocarSomDrop();
    } else {
        // MENSAGEM DETETIVE: Diz-nos exatamente onde o sistema se perdeu
        showToast(`❌ ERRO: A câmara leu [${codBruto}] e tentou buscar o SKU [${sku}]. Verifica no Catálogo!`, true);
    }
}

// ==========================================
// FUNÇÕES DA CÂMERA DO CELULAR
// ==========================================
function abrirLeitorCamera() {
    let modal = document.getElementById('modalCamera');
    if(modal) modal.style.display = 'flex';
    if(!html5QrCode) { html5QrCode = new Html5Qrcode("qr-reader"); }
    const config = { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
    .catch(err => { showToast("Erro ao aceder à câmera! Permite o acesso no navegador.", true); fecharLeitorCamera(); });
}

function fecharLeitorCamera() {
    let modal = document.getElementById('modalCamera');
    if(modal) modal.style.display = 'none';
    if(html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => { html5QrCode.clear(); }).catch(err => console.error(err));
    }
}

function onScanSuccess(decodedText, decodedResult) {
    tocarSomDrop(); fecharLeitorCamera(); processarCodigoBarras(decodedText); showToast("QR Code Lido com Sucesso!");
}
function onScanFailure(error) {}

// ==========================================
// RESTANTE DO CÓDIGO DO PDV
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

function autocompletarEstampa(val) {
    let code = val.toUpperCase().trim();
    if(catalogoEstampas[code]) {
        document.getElementById('nomeEstampa').value = catalogoEstampas[code].nome;
        document.getElementById('valorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda);
        let c = catalogoEstampas[code].categoria ? catalogoEstampas[code].categoria.toUpperCase() : '';
        let selectTipo = document.getElementById('tipoPeca');
        for(let i=0; i<selectTipo.options.length; i++) { if(c.includes(selectTipo.options[i].value)) { selectTipo.selectedIndex = i; break; } }
    }
}

function adicionarAoCarrinho() {
    const cod = document.getElementById('codigoEstampa').value.toUpperCase().trim(); 
    const nom = document.getElementById('nomeEstampa').value.toUpperCase().trim();
    const tip = document.getElementById('tipoPeca').value; 
    const tam = document.getElementById('tamanho').value; 
    const cor = document.getElementById('cor').value;
    const val = safeNum(document.getElementById('valorUnitario').value); 
    const qtd = parseInt(document.getElementById('quantidade').value) || 1;
    
    let faltantesPeca = [];
    if(!cod) faltantesPeca.push("CÓDIGO/SKU");
    if(!nom) faltantesPeca.push("NOME DA PEÇA");
    if(val <= 0) faltantesPeca.push("PREÇO");
    if(faltantesPeca.length > 0) { showToast("Faltou na peça: " + faltantesPeca.join(', '), true); return; }
    
    if(catalogoEstampas[cod] && (catalogoEstampas[cod].estoqueGrade[tam] || 0) < qtd) showToast(`Aviso: Estoque baixo para tamanho ${tam}!`, true); 
    const custoProduto = catalogoEstampas[cod] ? safeNum(catalogoEstampas[cod].custo) : 0;
    
    carrinhoTemporario.push({ codigoEstampa: cod, nomeEstampa: nom, tipoPeca: tip, tamanho: tam, cor: cor, quantidade: qtd, valorUnitario: val, custoUnitario: custoProduto });
    atualizarTelaCarrinho(); 
    document.getElementById('codigoEstampa').value = ''; document.getElementById('nomeEstampa').value = ''; document.getElementById('codigoEstampa').focus();
}

function removerDoCarrinho(i) { carrinhoTemporario.splice(i, 1); atualizarTelaCarrinho(); }

function atualizarTelaCarrinho() {
    let somaProdutos = 0; document.getElementById('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p, i) => { somaProdutos += (p.quantidade * safeNum(p.valorUnitario)); document.getElementById('listaCarrinho').innerHTML += `<div class="carrinho-item"><span><strong>${p.quantidade}x</strong> ${p.tipoPeca} (${p.tamanho}) - [${p.codigoEstampa}]</span><div><span style="color:var(--red); font-weight:900;">${formatCurrency(p.valorUnitario)}</span> <button class="btn-remove-item" onclick="removerDoCarrinho(${i})">X</button></div></div>`; });

    let freteInput = document.getElementById('valorFrete');
    if(somaProdutos >= 300) { freteInput.value = 'R$ 0,00'; freteInput.style.color = 'var(--green)'; freteInput.style.borderColor = 'var(--green)'; } 
    else { freteInput.style.color = ''; freteInput.style.borderColor = ''; }

    let freteCobrado = safeNum(freteInput.value); 
    let tipoDescEl = document.getElementById('tipoDesconto'); let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$'; let descontoInput = safeNum(document.getElementById('valorDesconto').value); let descontoReal = tipoDesc === '%' ? somaProdutos * (descontoInput / 100) : descontoInput;
    let total = Math.max(0, somaProdutos + freteCobrado - descontoReal); 
    document.getElementById('valorTotal').value = formatCurrency(total); 
    document.getElementById('carrinho-container').style.display = carrinhoTemporario.length === 0 ? 'none' : 'block'; 

    let metodo = document.getElementById('metodoPagamento').value;
    let containerTroco = document.getElementById('containerTroco');
    if (metodo === 'DINHEIRO' && containerTroco) {
        containerTroco.style.display = 'flex';
        let valorRecebido = safeNum(document.getElementById('valorRecebido').value);
        let troco = valorRecebido > total ? valorRecebido - total : 0;
        document.getElementById('valorTroco').value = formatCurrency(troco);
    } else if (containerTroco) { containerTroco.style.display = 'none'; document.getElementById('valorRecebido').value = ''; }
}

function limparFormularioPedido(ignorarConfirm = false) {
    if(!ignorarConfirm && !confirm("Tens a certeza que queres apagar tudo?")) return;
    document.getElementById('whatsapp').value = ''; document.getElementById('nome').value = ''; document.getElementById('cpf').value = ''; document.getElementById('origemVenda').value = 'INSTAGRAM'; document.getElementById('cep').value = ''; document.getElementById('endereco').value = ''; document.getElementById('numeroEnd').value = ''; document.getElementById('complementoEnd').value = ''; document.getElementById('valorFrete').value = ''; document.getElementById('valorFreteReal').value = ''; document.getElementById('custoEmbalagem').value = 'R$ 4,50'; if(document.getElementById('tipoDesconto')) document.getElementById('tipoDesconto').value = 'R$'; document.getElementById('valorDesconto').value = ''; document.getElementById('valorTotal').value = ''; document.getElementById('codigoEstampa').value = ''; document.getElementById('nomeEstampa').value = ''; document.getElementById('valorUnitario').value = ''; document.getElementById('quantidade').value = '1'; document.getElementById('alertaClienteFiel').style.display = 'none'; carrinhoTemporario = []; atualizarTelaCarrinho(); document.getElementById('whatsapp').focus(); 
}

// === LÓGICA DE PROMISES PARA OS MODAIS (Elegância) ===
function pedirPagamentoModal(metodoAtual) {
    return new Promise((resolve) => {
        let modal = document.getElementById('modalConfirmarPagamento');
        let select = document.getElementById('modalPgtoSelect');
        select.value = metodoAtual;
        modal.style.display = 'flex';
        
        window.fecharModalPagamento = function(confirmado) {
            modal.style.display = 'none';
            if(confirmado) resolve(select.value);
            else resolve(null);
        };
    });
}

function pedirTipoVendaModal() {
    return new Promise((resolve) => {
        let modal = document.getElementById('modalTipoVenda');
        modal.style.display = 'flex';
        
        window.fecharModalTipoVenda = function(tipo) {
            modal.style.display = 'none';
            resolve(tipo); // Vai retornar 'NO_ATO', 'ENCOMENDA', ou null (cancelar)
        };
    });
}

async function salvarPedidoCompleto() {
    let w = document.getElementById('whatsapp').value; let nome = document.getElementById('nome').value.toUpperCase(); let cpfVal = document.getElementById('cpf').value;
    let faltantesGeral = [];
    if(!nome || nome.trim() === '') faltantesGeral.push("NOME DO CLIENTE");
    if(!w || w.replace(/\D/g, '').length < 10) faltantesGeral.push("WHATSAPP INVÁLIDO");
    if(carrinhoTemporario.length === 0) faltantesGeral.push("1 PEÇA NO CARRINHO");
    if(cpfVal && cpfVal.length > 0 && !validarCPF(cpfVal)) faltantesGeral.push("CPF FALSO OU INCORRETO");
    
    if(faltantesGeral.length > 0) { showToast("Faltou preencher/corrigir: " + faltantesGeral.join(' | '), true); return; }

    // 1. Abre o Modal de Pagamento se estiver "PAGO"
    let statusPgto = document.getElementById('statusPagamento').value;
    let metodoPgto = document.getElementById('metodoPagamento').value;

    if (statusPgto === 'PAGO') {
        let metodoEscolhido = await pedirPagamentoModal(metodoPgto);
        if (!metodoEscolhido) { showToast("Geração de OS cancelada.", true); return; }
        metodoPgto = metodoEscolhido;
        document.getElementById('metodoPagamento').value = metodoPgto; 
    }

    // 2. Abre o Modal Elegante de Escolha do Tipo de Venda
    let tipoVenda = await pedirTipoVendaModal();
    if(!tipoVenda) { showToast("Geração de OS cancelada.", true); return; }
    
    let statusInicialPedido = tipoVenda === 'NO_ATO' ? 'PEDIDO FINALIZADO' : 'PEDIDO FEITO';

    let freteCobrado = safeNum(document.getElementById('valorFrete').value); let freteRealInput = safeNum(document.getElementById('valorFreteReal').value); let embalagem = safeNum(document.getElementById('custoEmbalagem').value);
    let somaVendaPecas = 0; carrinhoTemporario.forEach(item => { somaVendaPecas += (safeNum(item.valorUnitario) * parseInt(item.quantidade)); });
    let tipoDescEl = document.getElementById('tipoDesconto'); let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$'; let descontoInput = safeNum(document.getElementById('valorDesconto').value); let descontoRealDB = tipoDesc === '%' ? somaVendaPecas * (descontoInput / 100) : descontoInput; let totalCobrado = safeNum(document.getElementById('valorTotal').value);
    let somaCustoPecas = 0; carrinhoTemporario.forEach(item => { somaCustoPecas += (safeNum(item.custoUnitario) * parseInt(item.quantidade)); });
    
    let custoTotal = somaCustoPecas + embalagem + freteRealInput; let lucroCalculado = totalCobrado - custoTotal;
    
    let btnSalvar = document.getElementById('btnGerarOrdem'); btnSalvar.innerText = "SALVANDO..."; btnSalvar.disabled = true; let numGerado = Math.floor(1000 + Math.random() * 9000).toString();
    let dadosObj = { whatsapp: w, nome: nome, cpf: cpfVal, email: document.getElementById('email').value.toLowerCase().trim(), cep: document.getElementById('cep').value, endereco: document.getElementById('endereco').value, numero: document.getElementById('numeroEnd').value, complemento: document.getElementById('complementoEnd').value, apagadoCRM: false };
    let enderecoMontado = dadosObj.endereco + (dadosObj.numero ? ", " + dadosObj.numero : "");
    
    let userCriador = typeof currentUserName !== 'undefined' && currentUserName ? currentUserName : (typeof currentUserEmail !== 'undefined' && currentUserEmail ? currentUserEmail.split('@')[0] : 'Desconhecido');

    try {
        await db.collection("pedidos").add({ 
            numeroPedido: numGerado, nome: dadosObj.nome, whatsapp: w, cpf: dadosObj.cpf, email: dadosObj.email, origemVenda: document.getElementById('origemVenda').value, cep: dadosObj.cep, endereco: enderecoMontado, numeroEnd: dadosObj.numero, complemento: dadosObj.complemento, valorFrete: freteCobrado, valorFreteReal: freteRealInput, custoEmbalagem: embalagem, valorDesconto: descontoRealDB, valorTotal: totalCobrado, custoTotalPedido: somaCustoPecas, lucroTotalPedido: lucroCalculado, apagado: false, metodoPagamento: metodoPgto, statusPagamento: statusPgto, itens: carrinhoTemporario, status: statusInicialPedido, rastreio: '', 
            criadoPor: userCriador,
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp() 
        });
        if(typeof sincronizarClienteEmMassa === 'function') await sincronizarClienteEmMassa(w, dadosObj);
        carrinhoTemporario.forEach(item => { if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) { db.collection("estampas").doc(item.codigoEstampa).update({ ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(-item.quantidade) }); } });
        
        limparFormularioPedido(true); tocarSomSucesso(); showToast(`PEDIDO #${numGerado} SALVO!`);
        setTimeout(() => document.getElementById('whatsapp').focus(), 100);
    } catch (e) { showToast("Erro ao salvar", true); } finally { btnSalvar.innerText = "GERAR ORDEM DE SERVIÇO"; btnSalvar.disabled = false; }
}
