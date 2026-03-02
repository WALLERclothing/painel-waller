const el = (id) => document.getElementById(id);

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

const STATUS_LIST = ['PEDIDO FEITO', 'AGUARDANDO PAGAMENTO', 'EM SEPARAÇÃO', 'ENVIO EFETUADO', 'PEDIDO ENTREGUE'];

let estampasCache = [];
let carrinhoTemporario = [];
let pedidosCache = [];
let clientesExtrasCache = [];
let clientesCache = [];
let filtroAtual = 'TODOS';
let pedidoEmEdicaoId = null; // Variável para controlar a edição de um pedido

function upper(v) { return (v || '').toString().trim().toUpperCase(); }
function onlyDigits(v) { return (v || '').toString().replace(/\D/g, ''); }

function formatCurrency(num) {
    const value = parseFloat(num) || 0;
    return `R$ ${value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`;
}

function unmaskCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

function formatDate(dateValue) {
    if (!dateValue) return '-';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('pt-BR');
}

function getItensResumo(itens = []) {
    if (!itens.length) return 'Sem itens';
    return itens.map((item) => `${item.quantidade || 1}x ${item.nomeEstampa || item.codigoEstampa || 'PEÇA'}`).join(' • ');
}

function primeiroNome(nome = '') {
    return (nome.trim().split(' ')[0] || 'cliente');
}

function mudarAba(aba) {
    el('aba-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
    el('aba-producao').style.display = aba === 'producao' ? 'block' : 'none';
    el('aba-estampas').style.display = aba === 'estampas' ? 'block' : 'none';
    el('aba-clientes').style.display = aba === 'clientes' ? 'block' : 'none';

    el('tabCadastroBtn').classList.toggle('tab-active', aba === 'cadastro');
    el('tabProducaoBtn').classList.toggle('tab-active', aba === 'producao');
    el('tabEstampasBtn').classList.toggle('tab-active', aba === 'estampas');
    el('tabClientesBtn').classList.toggle('tab-active', aba === 'clientes');

    el('btnGerarPDF').style.display = aba === 'producao' ? 'inline-block' : 'none';
}

function alternarTema() {
    const dark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('temaWaller', dark ? 'dark' : 'light');
    el('btnTema').textContent = dark ? '☀️ Tema claro' : '🌙 Tema escuro';
}

function carregarTema() {
    const tema = localStorage.getItem('temaWaller');
    if (tema === 'dark') {
        document.body.classList.add('dark-mode');
        el('btnTema').textContent = '☀️ Tema claro';
    }
}

function preencherEstampaPorCodigo() {
    const codigo = upper(el('codigoEstampa').value);
    el('codigoEstampa').value = codigo;
    const feedback = el('mensagemAutoPreenchimento');

    if (!codigo) {
        feedback.textContent = '';
        feedback.classList.remove('ok', 'warn');
        return;
    }

    const encontrada = estampasCache.find((item) => item.codigo === codigo);
    if (!encontrada) {
        feedback.textContent = 'Código não encontrado no catálogo.';
        feedback.classList.add('warn');
        feedback.classList.remove('ok');
        return;
    }

    el('nomeEstampa').value = encontrada.nome;
    el('valorUnitario').value = formatCurrency(encontrada.valor || 0);
    if (encontrada.tipoPadrao && Array.from(el('tipoPeca').options).some((opt) => opt.value === encontrada.tipoPadrao)) {
        el('tipoPeca').value = encontrada.tipoPadrao;
    }
    feedback.textContent = `Encontrado: ${encontrada.nome} (Estoque: ${encontrada.estoque})`;
    feedback.classList.add('ok');
    feedback.classList.remove('warn');
}

function adicionarAoCarrinho() {
    const cod = upper(el('codigoEstampa').value);
    const nom = upper(el('nomeEstampa').value);
    if (!cod || !nom) return alert('Preencha código e nome da peça!');

    carrinhoTemporario.push({
        codigoEstampa: cod,
        nomeEstampa: nom,
        tipoPeca: el('tipoPeca').value,
        tamanho: el('tamanho').value,
        cor: el('cor').value,
        quantidade: parseInt(el('quantidade').value, 10) || 1,
        valorUnitario: unmaskCurrency(el('valorUnitario').value)
    });

    atualizarTelaCarrinho();
    el('codigoEstampa').value = '';
    el('nomeEstampa').value = '';
    el('valorUnitario').value = '';
    el('quantidade').value = 1;
    el('mensagemAutoPreenchimento').textContent = '';
}

function atualizarTelaCarrinho() {
    let soma = 0;
    el('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p, index) => {
        soma += p.quantidade * p.valorUnitario;
        el('listaCarrinho').innerHTML += `
        <div class="item-carrinho">
            <div>
                <strong>${p.quantidade}x ${p.tipoPeca} (${p.tamanho})</strong> • ${p.nomeEstampa} <br>
                <small style="color: #6b7280;">Cor: ${p.cor} | Unitário: ${formatCurrency(p.valorUnitario)}</small>
            </div>
            <div>
                <strong>${formatCurrency(p.quantidade * p.valorUnitario)}</strong>
                <button type="button" class="btn-excluir-item" onclick="removerDoCarrinho(${index})">X</button>
            </div>
        </div>`;
    });
    el('valorTotal').value = formatCurrency(soma);
}

function removerDoCarrinho(index) {
    carrinhoTemporario.splice(index, 1);
    atualizarTelaCarrinho();
}

// LOGICA ALTERADA PARA SALVAR OU EDITAR O PEDIDO
async function salvarPedidoCompleto() {
    const nome = upper(el('nome').value);
    if (!nome || carrinhoTemporario.length === 0) return alert('Preencha o nome do cliente e adicione pelo menos um item!');

    const statusBase = el('statusPagamento').value === 'PENDENTE' ? 'AGUARDANDO PAGAMENTO' : 'PEDIDO FEITO';

    const dadosPedido = {
        nome,
        whatsapp: upper(el('whatsapp').value),
        instagram: upper(el('instagram').value),
        documento: upper(el('cpf').value),
        cep: upper(el('cep').value),
        cidade: upper(el('cidade').value),
        estado: upper(el('estado').value),
        endereco: upper(el('endereco').value),
        referencia: upper(el('referencia').value),
        valorTotal: unmaskCurrency(el('valorTotal').value),
        metodoPagamento: el('metodoPagamento').value,
        statusPagamento: el('statusPagamento').value,
        itens: carrinhoTemporario,
        status: statusBase
    };

    if (pedidoEmEdicaoId) {
        // Se estiver editando, atualiza o documento existente
        await db.collection('pedidos').doc(pedidoEmEdicaoId).update(dadosPedido);
        alert('🔥 Pedido atualizado com sucesso!');
        pedidoEmEdicaoId = null;
        el('btnSalvarPedido').textContent = 'GERAR ORDEM DE SERVIÇO';
    } else {
        // Se for novo, adiciona
        dadosPedido.numeroPedido = Math.floor(1000 + Math.random() * 9000).toString();
        dadosPedido.dataCriacao = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('pedidos').add(dadosPedido);
        alert('🔥 Pedido lançado com sucesso!');
    }
    
    // Limpar o formulário todo após o pedido ser salvo
    document.querySelectorAll('#aba-cadastro input').forEach(input => input.value = '');
    el('metodoPagamento').value = 'PIX';
    el('statusPagamento').value = 'PAGO';
    el('tipoPeca').value = 'OVERSIZED';
    el('tamanho').value = 'P';
    el('cor').value = 'PRETA';
    el('quantidade').value = 1;
    
    carrinhoTemporario = [];
    atualizarTelaCarrinho();
    mudarAba('producao');
}

function filtrarCatalogo() {
    const filtro = upper(el('filtroEstampas').value);
    renderCatalogo(estampasCache.filter((est) => est.codigo.includes(filtro) || est.nome.includes(filtro)));
}

function abrirModalCatalogo(codigo) {
    const item = estampasCache.find((est) => est.codigo === codigo);
    if (!item) return;
    el('editCatalogoCodigo').value = item.codigo;
    el('editCatalogoNome').value = item.nome;
    el('editCatalogoValor').value = formatCurrency(item.valor || 0);
    el('editCatalogoTipo').value = item.tipoPadrao || '';
    el('editCatalogoEstoque').value = item.estoque || 0;
    el('modalCatalogo').style.display = 'flex';
}
function fecharModalCatalogo() { el('modalCatalogo').style.display = 'none'; }

async function salvarEdicaoCatalogo(e) {
    e.preventDefault();
    const codigo = upper(el('editCatalogoCodigo').value);
    await db.collection('estampas').doc(codigo).set({
        codigo,
        nome: upper(el('editCatalogoNome').value),
        valor: unmaskCurrency(el('editCatalogoValor').value),
        tipoPadrao: upper(el('editCatalogoTipo').value),
        estoque: parseInt(el('editCatalogoEstoque').value) || 0
    });
    fecharModalCatalogo();
}

function renderCatalogo(lista = estampasCache) {
    const container = el('catalogoEstampas');
    container.innerHTML = '';
    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhum item no catálogo.</div>';
        return;
    }

    lista.forEach((est) => {
        const estoqueMsg = est.estoque > 0 ? `📦 Estoque: ${est.estoque}` : '🔴 ESGOTADO';
        const estoqueClass = est.estoque > 0 ? '' : 'stock-esgotado';
        
        container.innerHTML += `<article class="catalog-item"><div class="catalog-item-top"><p class="catalog-code">${est.codigo}</p><span class="catalog-tag">ESTAMPA</span></div><h3>${est.nome}</h3><p class="catalog-price">${formatCurrency(est.valor || 0)}</p><p class="catalog-stock ${estoqueClass}">${estoqueMsg}</p><details class="sanfona-tipo"><summary>Tipo padrão</summary><p>${est.tipoPadrao || 'NÃO DEFINIDO'}</p></details><div class="catalog-actions"><button class="catalog-edit" onclick="abrirModalCatalogo('${est.codigo}')">Editar</button><button class="catalog-delete" onclick="db.collection('estampas').doc('${est.codigo}').delete()">🗑️</button></div></article>`;
    });
}

function statusClass(status) {
    if (status === 'AGUARDANDO PAGAMENTO') return 'badge-pendente';
    if (status === 'EM SEPARAÇÃO') return 'badge-estampa';
    if (status === 'ENVIO EFETUADO') return 'badge-enviado';
    if (status === 'PEDIDO ENTREGUE') return 'badge-entregue';
    return 'badge-default';
}

function statusOptionsSelecionado(atual) {
    return STATUS_LIST.map((status) => `<option value="${status}" ${status === atual ? 'selected' : ''}>${status}</option>`).join('');
}

function mensagemWhatsInformal(pedido) {
    const nome = primeiroNome(pedido.nome);
    let itensTexto = '';
    
    (pedido.itens || []).forEach(i => {
        itensTexto += `\n▪ ${i.quantidade || 1}x ${i.tipoPeca || 'PEÇA'} | ${i.nomeEstampa || i.codigoEstampa}\n   Tamanho: ${i.tamanho || '-'} | Cor: ${i.cor || '-'}\n   Valor: ${formatCurrency(i.valorUnitario || 0)}\n`;
    });

    return `Fala, ${nome}! 💀\n\nPassando pra atualizar que seu pedido *#${pedido.numeroPedido || ''}* está: *${pedido.status || 'PROCESSANDO'}* 🚀\n\n*🛒 RESUMO DO SEU DROP:*\n${itensTexto}\n*💰 TOTAL DO PEDIDO:* ${formatCurrency(pedido.valorTotal || 0)}\n\nQualquer dúvida, é só dar um salve por aqui!`;
}

function linkWhatsPedido(pedido) {
    const numero = onlyDigits(pedido.whatsapp);
    if (!numero) return '#';
    return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagemWhatsInformal(pedido))}`;
}

function abrirSanfonaStatus(id, statusAtual) {
    const selectId = `status-select-${id}`;
    return `<details class="status-sanfona"><summary>Alterar status</summary><select id="${selectId}">${statusOptionsSelecionado(statusAtual)}</select><button class="btn-add" onclick="salvarStatusPedido('${id}','${selectId}')">Salvar</button></details>`;
}

async function salvarStatusPedido(id, selectId) {
    const status = upper(el(selectId).value);
    await db.collection('pedidos').doc(id).update({ status });
}

function excluirPedido(id) {
    if (!confirm('Tem certeza que deseja excluir este pedido? Essa ação não tem volta.')) return;
    db.collection('pedidos').doc(id).delete();
}

function renderPedidosGrid(lista) {
    const container = el('gridPedidosContainer');
    container.innerHTML = '';

    const grupos = STATUS_LIST.map((status) => ({ status, itens: lista.filter((p) => upper(p.status || 'PEDIDO FEITO') === status) }));

    const svgWhats = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;

    grupos.forEach((grupo) => {
        container.innerHTML += `<section class="kanban-col"><header><h3>${grupo.status}</h3><span>${grupo.itens.length}</span></header><div class="kanban-cards">${grupo.itens.map((pedido) => `
            <article class="pedido-card-v2">
                <div class="pedido-header"><strong>#${pedido.numeroPedido || '----'} • ${pedido.nome || 'SEM NOME'}</strong><span class="pedido-badge ${statusClass(grupo.status)}">${grupo.status}</span></div>
                <p><strong>Itens:</strong> ${getItensResumo(pedido.itens)}</p>
                <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
                <p><strong>Data:</strong> ${formatDate(pedido.dataCriacao)}</p>
                ${abrirSanfonaStatus(pedido.id, upper(pedido.status || 'PEDIDO FEITO'))}
                <div class="pedido-actions">
                    <a class="btn-whats" target="_blank" href="${linkWhatsPedido(pedido)}">${svgWhats}</a>
                    <button class="catalog-edit" onclick="abrirFichaPedido('${pedido.id}')">Ver Ficha</button>
                    <button class="catalog-delete" onclick="excluirPedido('${pedido.id}')">🗑️</button>
                </div>
            </article>`).join('')}</div></section>`;
    });
}

function aplicarFiltros() {
    const busca = upper(el('inputBusca').value);
    const filtrado = pedidosCache.filter((pedido) => {
        const texto = `${upper(pedido.nome)} ${upper(pedido.whatsapp)} ${upper(getItensResumo(pedido.itens))}`;
        const matchBusca = texto.includes(busca);
        if (filtroAtual === 'TODOS') return matchBusca;
        if (filtroAtual === 'AGUARDANDO PAGAMENTO') return upper(pedido.status) === 'AGUARDANDO PAGAMENTO' && matchBusca;
        if (filtroAtual === 'EM PRODUÇÃO') return ['PEDIDO FEITO', 'EM SEPARAÇÃO'].includes(upper(pedido.status)) && matchBusca;
        if (filtroAtual === 'EM ENVIO') return ['ENVIO EFETUADO'].includes(upper(pedido.status)) && matchBusca;
        return matchBusca;
    });
    renderPedidosGrid(filtrado);
}

function setFiltroBtn(filtro) {
    filtroAtual = filtro;
    document.querySelectorAll('.btn-filtro').forEach((btn) => btn.classList.remove('ativo'));
    const idMap = { TODOS: 'filtro-todos', 'AGUARDANDO PAGAMENTO': 'filtro-pagamento', 'EM PRODUÇÃO': 'filtro-producao', 'EM ENVIO': 'filtro-envio' };
    if (idMap[filtro]) el(idMap[filtro]).classList.add('ativo');
    aplicarFiltros();
}

function atualizarDashboard(lista) {
    const hoje = new Date();
    const pedidosMes = lista.filter((pedido) => {
        if (!pedido.dataCriacao) return false;
        const d = pedido.dataCriacao.toDate ? pedido.dataCriacao.toDate() : new Date(pedido.dataCriacao);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }).length;
    el('dashPedidosMes').textContent = pedidosMes;
    el('dashAguardandoPagamento').textContent = lista.filter((p) => upper(p.status) === 'AGUARDANDO PAGAMENTO').length;
    el('dashEnviar').textContent = lista.filter((p) => upper(p.status) === 'ENVIO EFETUADO').length;
    el('dashFaturamento').textContent = formatCurrency(lista.filter((p) => upper(p.statusPagamento) === 'PAGO').reduce((acc, p) => acc + (p.valorTotal || 0), 0));
}

function aniversarioProximo(dataIso) {
    if (!dataIso) return false;
    const hoje = new Date();
    const data = new Date(`${dataIso}T00:00:00`);
    const prox = new Date(hoje.getFullYear(), data.getMonth(), data.getDate());
    const diff = Math.ceil((prox - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
    return diff >= 0 && diff <= 15;
}

function extrairClientesDosPedidos() {
    const mapa = new Map();
    clientesExtrasCache.forEach((cliente) => {
        const chave = onlyDigits(cliente.whatsapp) || `${upper(cliente.nome)}-${upper(cliente.documento)}`;
        if (chave) mapa.set(chave, { ...cliente, totalPedidos: 0, totalGasto: 0, historicoPedidos: [] });
    });

    pedidosCache.forEach((pedido) => {
        const chave = onlyDigits(pedido.whatsapp) || `${upper(pedido.nome)}-${upper(pedido.documento)}`;
        if (!chave) return;
        const base = mapa.get(chave) || {
            nome: upper(pedido.nome), whatsapp: upper(pedido.whatsapp), instagram: upper(pedido.instagram), documento: upper(pedido.documento), aniversario: '', cidade: upper(pedido.cidade), estado: upper(pedido.estado), endereco: upper(pedido.endereco), referencia: upper(pedido.referencia), totalPedidos: 0, totalGasto: 0, historicoPedidos: []
        };
        base.totalPedidos += 1;
        base.totalGasto += Number(pedido.valorTotal) || 0;
        base.historicoPedidos.push(pedido);
        mapa.set(chave, base);
    });

    clientesCache = Array.from(mapa.values()).sort((a, b) => {
        const aNiver = aniversarioProximo(a.aniversario) ? 0 : 1;
        const bNiver = aniversarioProximo(b.aniversario) ? 0 : 1;
        if (aNiver !== bNiver) return aNiver - bNiver;
        return (a.nome || '').localeCompare(b.nome || '');
    });
}

// FICHA DO CLIENTE
function abrirVisualizacaoCliente(cliente) {
    const idRef = onlyDigits(cliente.whatsapp) || `${upper(cliente.nome)}-${upper(cliente.documento)}`;
    
    el('fichaClienteTitulo').textContent = `Ficha Completa: ${cliente.nome || 'Cliente'}`;
    el('fichaClienteConteudo').innerHTML = `
        <div class="cliente-ficha-grid">
            <p><strong>WhatsApp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>Instagram:</strong> ${cliente.instagram || '-'}</p>
            <p><strong>Documento/CPF:</strong> ${cliente.documento || '-'}</p>
            <p><strong>Aniversário:</strong> ${cliente.aniversario || '-'}</p>
            <p><strong>Cidade/UF:</strong> ${cliente.cidade || '-'} / ${cliente.estado || ''}</p>
            <p><strong>Endereço:</strong> ${cliente.endereco || '-'} ${cliente.referencia ? `(Ref: ${cliente.referencia})` : ''}</p>
            <p><strong>Total de pedidos:</strong> ${cliente.totalPedidos || 0}</p>
            <p><strong>Total gasto:</strong> ${formatCurrency(cliente.totalGasto || 0)}</p>
        </div>
        <button class="btn-primary" style="margin-top: 1rem;" onclick="editarCliente('${idRef}'); fecharFichaCliente();">✏️ EDITAR DADOS DO CLIENTE</button>

        <h3 class="form-section-title" style="margin-top:1.5rem;">Histórico de pedidos</h3>
        <div>${(cliente.historicoPedidos || []).map((p) => `<div class="item-carrinho"><div>#${p.numeroPedido} • ${formatDate(p.dataCriacao)} • ${p.status}</div><div>${formatCurrency(p.valorTotal || 0)}</div></div>`).join('') || 'Sem histórico'}</div>`;
    el('modalFichaCliente').style.display = 'flex';
}

function visualizarClientePorId(idRef) {
    const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef);
    if (cliente) abrirVisualizacaoCliente(cliente);
}

// NOVA FICHA DE PEDIDO COM BOTÃO DE EDIÇÃO
function abrirFichaPedido(idPedido) {
    const pedido = pedidosCache.find((p) => p.id === idPedido);
    if (!pedido) return;

    el('fichaPedidoTitulo').textContent = `Detalhes do Pedido #${pedido.numeroPedido || '----'}`;
    el('fichaPedidoConteudo').innerHTML = `
        <div class="cliente-ficha-grid" style="margin-bottom: 1rem;">
            <p><strong>Cliente:</strong> ${pedido.nome || '-'}</p>
            <p><strong>WhatsApp:</strong> ${pedido.whatsapp || '-'}</p>
            <p><strong>Status:</strong> ${pedido.status || '-'}</p>
            <p><strong>Pagamento:</strong> ${pedido.metodoPagamento || '-'} (${pedido.statusPagamento || '-'})</p>
            <p><strong>Endereço:</strong> ${pedido.endereco || '-'}, ${pedido.cidade || '-'}/${pedido.estado || '-'}</p>
            <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
        </div>
        <h3 class="form-section-title">Peças no pedido</h3>
        <div style="margin-bottom: 1.5rem;">
            ${(pedido.itens || []).map(i => `<div class="item-carrinho"><div><strong>${i.quantidade}x ${i.tipoPeca} (${i.tamanho})</strong> • ${i.nomeEstampa || i.codigoEstampa}<br><small>Cor: ${i.cor} | ${formatCurrency(i.valorUnitario)}</small></div></div>`).join('')}
        </div>
        <button class="btn-primary" onclick="carregarPedidoParaEdicao('${pedido.id}')">✏️ EDITAR ESTE PEDIDO</button>
    `;
    el('modalFichaPedido').style.display = 'flex';
}

function fecharFichaPedido() { el('modalFichaPedido').style.display = 'none'; }

function carregarPedidoParaEdicao(idPedido) {
    const pedido = pedidosCache.find(p => p.id === idPedido);
    if (!pedido) return;
    
    pedidoEmEdicaoId = pedido.id;

    // Preenche os inputs do formulário
    el('nome').value = pedido.nome || '';
    el('whatsapp').value = pedido.whatsapp || '';
    el('instagram').value = pedido.instagram || '';
    el('cpf').value = pedido.documento || '';
    el('cep').value = pedido.cep || '';
    el('cidade').value = pedido.cidade || '';
    el('estado').value = pedido.estado || '';
    el('endereco').value = pedido.endereco || '';
    el('referencia').value = pedido.referencia || '';
    el('metodoPagamento').value = pedido.metodoPagamento || 'PIX';
    el('statusPagamento').value = pedido.statusPagamento || 'PAGO';

    // Preenche o carrinho
    carrinhoTemporario = [...pedido.itens];
    atualizarTelaCarrinho();

    // Muda o texto do botão salvar e troca de tela
    el('btnSalvarPedido').textContent = 'SALVAR ALTERAÇÕES DO PEDIDO';
    fecharFichaPedido();
    mudarAba('cadastro');
}

function fecharFichaCliente() { el('modalFichaCliente').style.display = 'none'; }
function abrirCadastroCliente() { el('modalCliente').style.display = 'flex'; }
function fecharCadastroCliente() { el('modalCliente').style.display = 'none'; }

async function salvarCliente(e) {
    e.preventDefault();
    const id = onlyDigits(el('clienteWhatsapp').value) || `${Date.now()}`;
    await db.collection('clientes').doc(id).set({
        nome: upper(el('clienteNome').value),
        whatsapp: upper(el('clienteWhatsapp').value),
        instagram: upper(el('clienteInstagram').value),
        documento: upper(el('clienteDocumento').value),
        aniversario: el('clienteAniversario').value || '',
        cidade: upper(el('clienteCidade').value),
        estado: upper(el('clienteEstado').value),
        endereco: upper(el('clienteEndereco').value),
        referencia: upper(el('clienteReferencia').value)
    }, { merge: true });
    e.target.reset();
    fecharCadastroCliente();
}

function editarCliente(idRef) {
    const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef);
    if (!cliente) return;
    abrirCadastroCliente();
    el('clienteNome').value = cliente.nome || '';
    el('clienteWhatsapp').value = cliente.whatsapp || '';
    el('clienteInstagram').value = cliente.instagram || '';
    el('clienteDocumento').value = cliente.documento || '';
    el('clienteAniversario').value = cliente.aniversario || '';
    el('clienteCidade').value = cliente.cidade || '';
    el('clienteEstado').value = cliente.estado || '';
    el('clienteEndereco').value = cliente.endereco || '';
    el('clienteReferencia').value = cliente.referencia || '';
}

function excluirCliente(idRef) {
    if (!confirm('Excluir ficha de cliente?')) return;
    db.collection('clientes').doc(idRef).delete();
}

function renderClientes(lista = clientesCache) {
    const container = el('listaClientes');
    container.innerHTML = '';
    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhum cliente encontrado.</div>';
        return;
    }

    lista.forEach((cliente) => {
        const idRef = onlyDigits(cliente.whatsapp) || `${upper(cliente.nome)}-${upper(cliente.documento)}`;
        const destaque = aniversarioProximo(cliente.aniversario);
        container.innerHTML += `<article class="cliente-card ${destaque ? 'cliente-alerta' : ''}">
            <h3>${cliente.nome || 'SEM NOME'}</h3>
            ${destaque ? '<span class="niver-tag pulse">🎂 Aniversário próximo</span>' : ''}
            <p><strong>Whatsapp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>Cidade:</strong> ${cliente.cidade || '-'} / ${cliente.estado || ''}</p>
            <div class="cliente-stats"><span>${cliente.totalPedidos || 0} pedido(s)</span><span>${formatCurrency(cliente.totalGasto || 0)}</span></div>
            <div class="pedido-actions">
                <button class="catalog-edit" onclick="visualizarClientePorId('${idRef}')">Ficha Completa</button>
                <button class="catalog-delete" onclick="excluirCliente('${idRef}')">🗑️</button>
            </div>
        </article>`;
    });
}

function gerarPDF() {
    if (!pedidosCache.length) return alert('Sem pedidos para PDF.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Fila de Produção - Waller Clothing', 14, 14);
    doc.autoTable({
        startY: 20,
        head: [['Pedido', 'Cliente', 'Status', 'Total']],
        body: pedidosCache.map((p) => [`#${p.numeroPedido || '-'}`, p.nome || '-', p.status || '-', formatCurrency(p.valorTotal || 0)])
    });
    doc.save(`fila-producao-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function salvarNovaEstampa(e) {
    e.preventDefault();
    const cod = upper(el('cadCodigoEstampa').value);
    await db.collection('estampas').doc(cod).set({
        codigo: cod,
        nome: upper(el('cadNomeEstampa').value),
        valor: unmaskCurrency(el('cadValorEstampa').value),
        tipoPadrao: upper(el('cadTipoPadrao').value),
        estoque: parseInt(el('cadEstoqueEstampa').value) || 0
    });
    e.target.reset();
}

function iniciarListeners() {
    db.collection('pedidos').orderBy('dataCriacao', 'desc').onSnapshot((snap) => {
        pedidosCache = [];
        snap.forEach((doc) => pedidosCache.push({ id: doc.id, ...doc.data() }));
        atualizarDashboard(pedidosCache);
        aplicarFiltros();
        extrairClientesDosPedidos();
        renderClientes();
        el('carregando').style.display = 'none';
    });

    db.collection('estampas').orderBy('codigo').onSnapshot((snap) => {
        estampasCache = [];
        snap.forEach((doc) => {
            const est = doc.data();
            estampasCache.push({ codigo: upper(est.codigo), nome: upper(est.nome), valor: Number(est.valor) || 0, tipoPadrao: upper(est.tipoPadrao), estoque: Number(est.estoque) || 0 });
        });
        renderCatalogo();
        el('carregandoEstampas').style.display = 'none';
    });

    db.collection('clientes').onSnapshot((snap) => {
        clientesExtrasCache = [];
        snap.forEach((doc) => clientesExtrasCache.push(doc.data()));
        extrairClientesDosPedidos();
        renderClientes();
        el('carregandoClientes').style.display = 'none';
    });
}

el('codigoEstampa').addEventListener('input', preencherEstampaPorCodigo);
el('cadValorEstampa').addEventListener('blur', () => {
    const value = unmaskCurrency(el('cadValorEstampa').value);
    if (value > 0) el('cadValorEstampa').value = formatCurrency(value);
});
el('editCatalogoValor').addEventListener('blur', () => {
    const value = unmaskCurrency(el('editCatalogoValor').value);
    if (value > 0) el('editCatalogoValor').value = formatCurrency(value);
});

carregarTema();
iniciarListeners();
