const el = (id) => document.getElementById(id);
const STATUS_CLASS_MAP = {
    'PEDIDO FEITO': 'status-pedido-feito',
    'AGUARDANDO ESTAMPA': 'status-aguardando',
    'ESTAMPA PRONTA': 'status-estampa-pronta',
    'PEDIDO ENVIADO': 'status-pedido-enviado',
    'PEDIDO ENTREGUE': 'status-pedido-entregue'
};

const FILTRO_BTN_MAP = {
    TODOS: 'filtro-todos',
    PENDENTE_PGTO: 'filtro-pendente',
    'AGUARDANDO ESTAMPA': 'filtro-estampa'
};

// ==========================================
// FORMATAÇÃO E UTILITÁRIOS
// ==========================================
function unmaskCurrency(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    value = value.toString().replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(value) || 0;
}

function formatCurrency(num) {
    let value = parseFloat(num) || 0;
    return "R$ " + value.toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

document.addEventListener('input', function(e) {
    if(e.target.classList.contains('moeda') && !e.target.readOnly) {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") { e.target.value = ""; return; }
        value = (parseInt(value) / 100).toFixed(2) + "";
        value = value.replace(".", ",");
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        e.target.value = "R$ " + value;
    }
});

function mudarAba(aba) {
    document.getElementById('aba-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
    document.getElementById('aba-producao').style.display = aba === 'producao' ? 'block' : 'none';
    document.getElementById('aba-estampas').style.display = aba === 'estampas' ? 'block' : 'none';
        
    document.getElementById('tabCadastroBtn').classList.toggle('tab-active', aba === 'cadastro');
    document.getElementById('tabProducaoBtn').classList.toggle('tab-active', aba === 'producao');
    document.getElementById('tabEstampasBtn').classList.toggle('tab-active', aba === 'estampas');
        
    document.getElementById('btnGerarPDF').style.display = aba === 'producao' ? 'block' : 'none';
}

function aplicarMascaraTelefone(e) {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length <= 2) { e.target.value = v; } else if (v.length <= 6) { e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`; } else if (v.length <= 10) { e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`; } else { e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`; }
}
if(el('whatsapp')) el('whatsapp').addEventListener('input', aplicarMascaraTelefone);
if(el('editWhatsapp')) el('editWhatsapp').addEventListener('input', aplicarMascaraTelefone);

// ==========================================
// FUNÇÃO SANFONA (OCULTAR/MOSTRAR PEÇAS)
// ==========================================
function toggleItens(id) {
    let lista = document.getElementById('itens-' + id);
    let seta = document.getElementById('seta-' + id);
    if (lista.style.display === 'none') {
        lista.style.display = 'flex';
        seta.innerHTML = '▲';
    } else {
        lista.style.display = 'none';
        seta.innerHTML = '▼';
    }
}

// ==========================================
// FIREBASE INIT
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDnch84Sl5VyIi0YmOAde4jTftsssLEsNA",
    authDomain: "banco-de-dados-waller.firebaseapp.com",
    projectId: "banco-de-dados-waller",
    storageBucket: "banco-de-dados-waller.firebasestorage.app",
    messagingSenderId: "595978694752",
    appId: "1:595978694752:web:69aa74348560268a5a1305"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// CATÁLOGO DE ESTAMPAS 
// ==========================================
let catalogoEstampas = {}; 
db.collection("estampas").orderBy("codigo").onSnapshot((querySnapshot) => {
    el('carregandoEstampas').style.display = 'none';
    el('listaEstampas').innerHTML = '';
    catalogoEstampas = {}; 
    querySnapshot.forEach((doc) => {
        let estampa = doc.data();
        catalogoEstampas[estampa.codigo] = estampa.nome;
        el('listaEstampas').innerHTML += `<tr><td><strong>${estampa.codigo}</strong></td><td>${estampa.nome}</td><td><button class="btn-icone btn-excluir" onclick="excluirEstampa('${doc.id}')">X</button></td></tr>`;
    });
});

function salvarNovaEstampa(e) {
    e.preventDefault();
    let cod = el('cadCodigoEstampa').value.toUpperCase().trim();
    let nom = el('cadNomeEstampa').value.toUpperCase().trim();
    db.collection("estampas").doc(cod).set({ codigo: cod, nome: nom })
    .then(() => { el('cadCodigoEstampa').value = ''; el('cadNomeEstampa').value = ''; el('cadCodigoEstampa').focus(); });
}
function excluirEstampa(idCodigo) { if(confirm(`Apagar estampa ${idCodigo}?`)) db.collection("estampas").doc(idCodigo).delete(); }

el('codigoEstampa').addEventListener('input', function(e) {
    let cod = e.target.value.toUpperCase().trim();
    if(catalogoEstampas[cod]) el('nomeEstampa').value = catalogoEstampas[cod];
});
    
el('editItensContainer').addEventListener('input', function(e) {
    if(e.target.classList.contains('edit-cod')) {
        let cod = e.target.value.toUpperCase().trim();
        if(catalogoEstampas[cod]) e.target.closest('.item-edit-wrapper').querySelector('.edit-nom').value = catalogoEstampas[cod];
    }
    if(e.target.classList.contains('edit-valor') || e.target.classList.contains('edit-qtd')) { recalcularSomaEdicao(); }
});

// ==========================================
// CADASTRO DE PEDIDOS (CARRINHO)
// ==========================================
let todosPedidos = []; 
let carrinhoTemporario = []; 
let filtroStatusAtivo = "TODOS";

function adicionarAoCarrinho() {
    const cod = el('codigoEstampa').value.toUpperCase().trim();
    const nom = el('nomeEstampa').value.toUpperCase().trim();
    const tip = el('tipoPeca').value;
    const tam = el('tamanho').value;
    const cor = el('cor').value;
    const val = unmaskCurrency(el('valorUnitario').value);
    const qtd = el('quantidade').value;

    if(!cod || !nom) { alert("Preencha o código e o nome da peça!"); return; }
        
    carrinhoTemporario.push({ codigoEstampa: cod, nomeEstampa: nom, tipoPeca: tip, tamanho: tam, cor: cor, quantidade: parseInt(qtd), valorUnitario: parseFloat(val) });
    atualizarTelaCarrinho();
    el('codigoEstampa').value = ''; el('nomeEstampa').value = ''; el('codigoEstampa').focus();
}
    
function removerDoCarrinho(index) { carrinhoTemporario.splice(index, 1); atualizarTelaCarrinho(); }
    
function atualizarTelaCarrinho() {
    let somaCarrinho = 0; el('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((peca, index) => {
        somaCarrinho += (peca.quantidade * peca.valorUnitario);
        let valFormat = formatCurrency(peca.valorUnitario);
        el('listaCarrinho').innerHTML += `
            <div class="carrinho-item">
                <span><strong>${peca.quantidade}x</strong> ${peca.tipoPeca} (${peca.tamanho}) - [${peca.codigoEstampa}] ${peca.nomeEstampa} - <strong>${valFormat} un</strong></span>
                <button class="btn-remove-item" onclick="removerDoCarrinho(${index})">X</button>
            </div>`;
    });
    el('valorTotal').value = formatCurrency(somaCarrinho);
    el('carrinho-container').style.display = carrinhoTemporario.length === 0 ? 'none' : 'block'; 
}

async function salvarPedidoCompleto() {
    let nome = el('nome').value.toUpperCase();
    let whatsapp = el('whatsapp').value;
    let valorTotal = unmaskCurrency(el('valorTotal').value);
    let metodo = el('metodoPagamento').value;
    let statusPgto = el('statusPagamento').value;

    if(!nome || !whatsapp) { alert("Preencha o Nome e WhatsApp!"); return; }
    if(carrinhoTemporario.length === 0) { alert("Adicione 1 peça!"); return; }

    el('carregando').style.display = 'inline'; el('carregando').innerText = 'Salvando pedido...';
    let numeroGerado = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        await db.collection("pedidos").add({
            numeroPedido: numeroGerado, nome: nome, whatsapp: whatsapp, 
            valorTotal: parseFloat(valorTotal), metodoPagamento: metodo, statusPagamento: statusPgto,
            itens: carrinhoTemporario, status: 'PEDIDO FEITO', dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        el('nome').value = ''; el('whatsapp').value = ''; el('valorTotal').value = '';
        carrinhoTemporario = []; atualizarTelaCarrinho();
        alert(`Pedido #${numeroGerado} salvo com sucesso!`);
    } catch (error) { alert("Erro ao salvar."); }
}

// ==========================================
// ESCUTAR BANCO E RENDERIZAR GRID
// ==========================================
db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot((querySnapshot) => {
    el('carregando').style.display = 'none'; 
    todosPedidos = []; 

    let metricas = { pedMes: 0, filaEstampa: 0, paraEnviar: 0, faturamento: 0 };
    let mesAtual = new Date().getMonth();

    querySnapshot.forEach((doc) => {
        let pedido = doc.data(); pedido.id = doc.id; 
            
        if(!pedido.itens) pedido.itens = [{ codigoEstampa: pedido.codigoEstampa||"-", nomeEstampa: pedido.nomeEstampa||"-", tipoPeca: pedido.tipoPeca||"OVERSIZED", tamanho: pedido.tamanho||"-", cor: pedido.cor||"-", quantidade: pedido.quantidade||1, valorUnitario: 0 }];
        if(!pedido.numeroPedido) pedido.numeroPedido = "ANTIGO";
        if(pedido.statusPagamento === undefined) pedido.statusPagamento = "PAGO";
        if(pedido.valorTotal === undefined) pedido.valorTotal = 0;
            
        let currentStatus = (pedido.status || 'PEDIDO FEITO').toUpperCase();
        if(currentStatus === 'PRONTA / ESTAMPADA') currentStatus = 'ESTAMPA PRONTA';
        pedido.statusAtualizado = currentStatus;
            
        let dataObj = pedido.dataCriacao ? pedido.dataCriacao.toDate() : new Date();
        pedido.dataFormatada = dataObj.toLocaleDateString('pt-BR');

        if(dataObj.getMonth() === mesAtual) {
            metricas.pedMes++;
            if(pedido.statusPagamento === 'PAGO') metricas.faturamento += parseFloat(pedido.valorTotal);
        }
        if(currentStatus === 'AGUARDANDO ESTAMPA') { pedido.itens.forEach(i => metricas.filaEstampa += parseInt(i.quantidade)); }
        if(currentStatus === 'ESTAMPA PRONTA') metricas.paraEnviar++;

        todosPedidos.push(pedido);
    });

    el('dashPedidosMes').innerText = metricas.pedMes;
    el('dashFilaEstampa').innerText = metricas.filaEstampa;
    el('dashEnviar').innerText = metricas.paraEnviar;
    el('dashFaturamento').innerText = formatCurrency(metricas.faturamento);

    aplicarFiltros(); 
});

function setFiltroBtn(tipo) {
    filtroStatusAtivo = tipo;
    document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('ativo'));
    const filtroId = FILTRO_BTN_MAP[tipo];
    if (filtroId) el(filtroId).classList.add('ativo');
    aplicarFiltros();
}

function aplicarFiltros() {
    let termo = el('inputBusca').value.toUpperCase();
    let container = el('gridPedidosContainer');
    container.innerHTML = '';

    let pedidosFiltrados = todosPedidos.filter(p => {
        let textoBusca = `${p.nome} ${p.numeroPedido} ${p.whatsapp}`.toUpperCase();
        let bateuBusca = textoBusca.includes(termo);
        let bateuFiltro = true;
        if(filtroStatusAtivo === 'PENDENTE_PGTO') bateuFiltro = p.statusPagamento === 'PENDENTE';
        if(filtroStatusAtivo === 'AGUARDANDO ESTAMPA') bateuFiltro = p.statusAtualizado === 'AGUARDANDO ESTAMPA';
        return bateuBusca && bateuFiltro;
    });

    if(pedidosFiltrados.length === 0){
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; font-weight:bold; color:#777;">Nenhum pedido encontrado.</div>`;
        return;
    }

    pedidosFiltrados.forEach(pedido => {
        let classeLogistica = `select-status ${STATUS_CLASS_MAP[pedido.statusAtualizado] || ''}`.trim();

        let btnPagamento = pedido.statusPagamento === 'PAGO' 
            ? `<button class="btn-pgto pgto-pago" onclick="trocarPagamento('${pedido.id}', 'PENDENTE')" title="Mudar para Pendente">💰 PAGO</button>`
            : `<button class="btn-pgto pgto-pendente" onclick="trocarPagamento('${pedido.id}', 'PAGO')" title="Mudar para Pago">⏳ PEND</button>`;

        let valorFormatado = formatCurrency(pedido.valorTotal);

        let htmlItens = pedido.itens.map(i => `
            <div class="item-tag-compacto">
                <div class="item-tag-topo"><span>${i.quantidade}x ${i.tipoPeca}</span> <span>${formatCurrency(i.valorUnitario)}</span></div>
                <div class="item-tag-cor-tam">Cor: ${i.cor} | Tam: ${i.tamanho}</div>
                <div class="item-tag-estampa">[${i.codigoEstampa}] ${i.nomeEstampa}</div>
            </div>
        `).join('');
            
        let itensWhats = pedido.itens.map(i => `- ${i.quantidade}x ${i.tipoPeca} ${i.cor} (Tam: ${i.tamanho}) | [${i.codigoEstampa}] ${i.nomeEstampa} - ${formatCurrency(i.valorUnitario)} un`).join('\n');
        let mensagemWhats = "";
        if (pedido.statusAtualizado === 'PEDIDO FEITO') {
            mensagemWhats = `Salve ${pedido.nome}! O seu pedido #${pedido.numeroPedido} foi recebido com sucesso pela Waller. 💀🔥\n\n*Resumo do Pedido:*\n${itensWhats}\n\n*Valor Total:* ${valorFormatado}\n*Pagamento:* ${pedido.metodoPagamento || '-'} (${pedido.statusPagamento})\n\nLogo menos avisaremos sobre a produção!`;
        } else {
            mensagemWhats = `Salve ${pedido.nome}! O status do seu pedido #${pedido.numeroPedido} da Waller foi atualizado para: *${pedido.statusAtualizado}*.\n\n*Itens do pedido:*\n${itensWhats}`;
        }
        let linkWhats = `https://wa.me/55${pedido.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemWhats)}`;

        let card = document.createElement('div');
        card.className = 'pedido-card';
        card.innerHTML = `
            <div class="pedido-header">
                <div class="header-linha-1">
                    <div class="pedido-id">#${pedido.numeroPedido}</div>
                    <div class="pedido-data">📅 ${pedido.dataFormatada}</div>
                </div>
                <div class="header-linha-2">
                    ${btnPagamento}
                    <select class="${classeLogistica}" onchange="mudarStatusLogistica('${pedido.id}', this.value)">
                        <option value="PEDIDO FEITO" ${pedido.statusAtualizado === 'PEDIDO FEITO' ? 'selected' : ''}>PEDIDO FEITO</option>
                        <option value="AGUARDANDO ESTAMPA" ${pedido.statusAtualizado === 'AGUARDANDO ESTAMPA' ? 'selected' : ''}>FILA ESTAMPA</option>
                        <option value="ESTAMPA PRONTA" ${pedido.statusAtualizado === 'ESTAMPA PRONTA' ? 'selected' : ''}>PRONTO / ENVIAR</option>
                        <option value="PEDIDO ENVIADO" ${pedido.statusAtualizado === 'PEDIDO ENVIADO' ? 'selected' : ''}>ENVIADO</option>
                        <option value="PEDIDO ENTREGUE" ${pedido.statusAtualizado === 'PEDIDO ENTREGUE' ? 'selected' : ''}>ENTREGUE</option>
                    </select>
                </div>
            </div>
            <div class="pedido-body">
                <div class="pedido-cliente">
                    <div class="cliente-nome">${pedido.nome}</div>
                    <div class="cliente-zap">${pedido.whatsapp}</div>
                    <div class="cliente-financas">${valorFormatado} - ${pedido.metodoPagamento || 'PIX'}</div>
                </div>
                <div class="pedido-separador"></div>
                    
                <div class="toggle-itens-btn" onclick="toggleItens('${pedido.id}')">
                    <span>📦 PEÇAS DO PEDIDO (${pedido.itens.length})</span>
                    <span id="seta-${pedido.id}">▲</span>
                </div>

                <div class="pedido-itens-lista" id="itens-${pedido.id}" style="display: flex;">
                    ${htmlItens}
                </div>
            </div>
            <div class="pedido-footer">
                <a href="${linkWhats}" target="_blank" style="flex:1; display:flex; text-decoration:none;">
                    <button class="btn-card-whats" title="Avisar WhatsApp" style="width:100%;">💬</button>
                </a>
                <button class="btn-card-edit" onclick="abrirModalEdicao('${pedido.id}')" title="Editar" style="flex:1;">✏️</button>
                <button class="btn-card-del" onclick="excluirPedido('${pedido.id}')" title="Excluir" style="flex:1;">❌</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function mudarStatusLogistica(id, novoStatus) { db.collection("pedidos").doc(id).update({ status: novoStatus }); }
function trocarPagamento(id, novoStatusPgto) { db.collection("pedidos").doc(id).update({ statusPagamento: novoStatusPgto }); }
function excluirPedido(id) { if (confirm("Deletar pedido inteiro?")) db.collection("pedidos").doc(id).delete(); }

// ==========================================
// EDIÇÃO DE PEDIDOS
// ==========================================
function abrirModalEdicao(id) {
    const p = todosPedidos.find(x => x.id === id); if(!p) return;
    el('editId').value = p.id;
    el('tituloEditPedido').innerText = "#" + p.numeroPedido;
    el('editNome').value = p.nome || '';
    el('editWhatsapp').value = p.whatsapp || '';
    el('editValorTotal').value = formatCurrency(p.valorTotal || 0);
    if(p.metodoPagamento) el('editMetodoPagamento').value = p.metodoPagamento;
        
    let container = el('editItensContainer'); container.innerHTML = '';
    p.itens.forEach((item) => { container.innerHTML += gerarHtmlLinhaEdicao(item); });
        
    el('modalEdicao').style.display = 'flex';
    recalcularSomaEdicao(); 
}

function adicionarItemEdicao() {
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = gerarHtmlLinhaEdicao({ codigoEstampa: "", nomeEstampa: "", tipoPeca: "OVERSIZED", tamanho: "G", cor: "PRETA", valorUnitario: 0, quantidade: 1 });
    el('editItensContainer').appendChild(tempDiv.firstElementChild);
    recalcularSomaEdicao();
}

function gerarHtmlLinhaEdicao(item) {
    const t = item.tipoPeca; const tam = item.tamanho; const c = item.cor;
    return `
    <div class="item-edit-wrapper">
        <button type="button" class="btn-remove-peca" onclick="this.closest('.item-edit-wrapper').remove(); recalcularSomaEdicao();">X REMOVER PEÇA</button>
        <div class="form-grid" style="margin-bottom: 10px; padding-right: 120px;">
            <input type="text" class="edit-cod" value="${item.codigoEstampa}" placeholder="CÓDIGO" style="flex:0.5;">
            <input type="text" class="edit-nom" value="${item.nomeEstampa}" placeholder="ESTAMPA" style="flex:1.5;">
        </div>
        <div class="form-grid">
            <select class="edit-tip">
                <option value="OVERSIZED" ${t==='OVERSIZED'?'selected':''}>OVERSIZED</option>
                <option value="MOLETOM" ${t==='MOLETOM'?'selected':''}>MOLETOM</option>
                <option value="REGATA" ${t==='REGATA'?'selected':''}>REGATA</option>
                <option value="CAMISETA TRADICIONAL" ${t==='CAMISETA TRADICIONAL'?'selected':''}>CAM. TRADICIONAL</option>
            </select>
            <select class="edit-tam">
                <option value="P" ${tam==='P'?'selected':''}>P</option>
                <option value="M" ${tam==='M'?'selected':''}>M</option>
                <option value="G" ${tam==='G'?'selected':''}>G</option>
                <option value="GG" ${tam==='GG'?'selected':''}>GG</option>
                <option value="XG" ${tam==='XG'?'selected':''}>XG</option>
            </select>
            <select class="edit-cor">
                <option value="PRETA" ${c==='PRETA'?'selected':''}>PRETA</option>
                <option value="BRANCA" ${c==='BRANCA'?'selected':''}>BRANCA</option>
                <option value="MESCLA" ${c==='MESCLA'?'selected':''}>MESCLA</option>
                <option value="OFF-WHITE" ${c==='OFF-WHITE'?'selected':''}>OFF-WHITE</option>
            </select>
            <input type="text" class="edit-valor moeda" value="${formatCurrency(item.valorUnitario)}" placeholder="R$ UN" style="flex: 0.5;">
            <input type="number" class="edit-qtd" value="${item.quantidade}" placeholder="QTD" min="1" style="flex: 0.3;">
        </div>
    </div>`;
}

function recalcularSomaEdicao() {
    let soma = 0;
    document.querySelectorAll('.item-edit-wrapper').forEach(row => {
        let v = unmaskCurrency(row.querySelector('.edit-valor').value);
        let q = parseInt(row.querySelector('.edit-qtd').value) || 1;
        soma += (v * q);
    });
    el('editValorTotal').value = formatCurrency(soma);
}

function fecharModalEdicao() { el('modalEdicao').style.display = 'none'; }

function salvarAlteracoesEdicao() {
    const id = el('editId').value;
    let itens = [];
    document.querySelectorAll('.item-edit-wrapper').forEach(row => {
        itens.push({
            codigoEstampa: row.querySelector('.edit-cod').value.toUpperCase().trim(),
            nomeEstampa: row.querySelector('.edit-nom').value.toUpperCase().trim(),
            tipoPeca: row.querySelector('.edit-tip').value,
            tamanho: row.querySelector('.edit-tam').value,
            cor: row.querySelector('.edit-cor').value,
            valorUnitario: unmaskCurrency(row.querySelector('.edit-valor').value),
            quantidade: parseInt(row.querySelector('.edit-qtd').value) || 1
        });
    });
    if(itens.length === 0) { alert("O pedido precisa de pelo menos 1 peça."); return; }

    let valorTotalCalculado = unmaskCurrency(el('editValorTotal').value);

    db.collection("pedidos").doc(id).update({
        nome: el('editNome').value.toUpperCase(),
        whatsapp: el('editWhatsapp').value,
        valorTotal: valorTotalCalculado,
        metodoPagamento: el('editMetodoPagamento').value,
        itens: itens 
    }).then(() => { fecharModalEdicao(); }).catch(e => { alert("Erro ao atualizar banco."); });
}

// ==========================================
// GERADOR DE PDF 
// ==========================================
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("WALLER CLOTHING - RELATORIO COMPLETO", 14, 15);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); 
    let dataHoje = new Date().toLocaleDateString('pt-BR'); doc.text("Documento gerado em: " + dataHoje, 14, 21);

    const statusList = ['PEDIDO FEITO', 'AGUARDANDO ESTAMPA', 'ESTAMPA PRONTA', 'PEDIDO ENVIADO', 'PEDIDO ENTREGUE'];
    let currentY = 30; let encontrouPedidos = false;

    statusList.forEach(status => {
        const pendentes = todosPedidos.filter(p => p.statusAtualizado === status);
        if (pendentes.length > 0) {
            encontrouPedidos = true;
            doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(217, 4, 41); 
            doc.text(`> STATUS: ${status}`, 14, currentY); currentY += 5; 

            let totalPecasBloco = 0; 
            const contagem = {};
            pendentes.forEach(pedido => {
                pedido.itens.forEach(item => {
                    let cod = item.codigoEstampa || "-";
                    let nom = item.nomeEstampa || "Desconhecido";
                    let peca = item.tipoPeca || "OVERSIZED";
                    let qtd = parseInt(item.quantidade) || 1; 
                    totalPecasBloco += qtd; 
                    const chave = `${cod} | ${nom} | ${peca} | ${item.cor} | ${item.tamanho}`;
                    if(!contagem[chave]) contagem[chave] = 0;
                    contagem[chave] += qtd; 
                });
            });

            const dadosTabela = Object.keys(contagem).map(chave => {
                const [codigo, nome, peca, cor, tamanho] = chave.split(' | ');
                return [codigo, nome, peca, cor, tamanho, contagem[chave]]; 
            });

            dadosTabela.sort((a, b) => {
                let codA = String(a[0]).trim().toUpperCase(); let codB = String(b[0]).trim().toUpperCase();
                if(codA === "-" && codB !== "-") return 1; if(codB === "-" && codA !== "-") return -1;
                return codA.localeCompare(codB, 'pt-BR', { numeric: true, sensitivity: 'base' });
            });

            doc.autoTable({
                startY: currentY, head: [['Cód', 'Estampa', 'Peça', 'Cor', 'Tam', 'Qtd']], body: dadosTabela, 
                foot: [[ { content: 'TOTAL DE PEÇAS:', colSpan: 5, styles: { halign: 'right', fillColor: [217, 4, 41], textColor: [255,255,255] } }, { content: totalPecasBloco.toString(), styles: { halign: 'center', fillColor: [217, 4, 41], textColor: [255,255,255] } } ]],
                theme: 'grid', headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' }, styles: { font: 'helvetica', fontSize: 9 },
                columnStyles: { 0: { cellWidth: 15 }, 4: { cellWidth: 15, halign: 'center' }, 5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 15; 
            if(currentY > 270) { doc.addPage(); currentY = 20; }
        }
    });

    if(!encontrouPedidos) { alert("Nenhum pedido encontrado!"); return; }
    doc.save(`relatorio_waller_${dataHoje.replace(/\//g, '-')}.pdf`);
}
