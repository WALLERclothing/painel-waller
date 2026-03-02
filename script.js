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
    feedback.textContent = `Estampa encontrada: ${encontrada.nome}`;
    feedback.classList.add('ok');
    feedback.classList.remove('warn');
}

function adicionarAoCarrinho() {
    const cod = upper(el('codigoEstampa').value);
    const nom = upper(el('nomeEstampa').value);
    if (!cod || !nom) return alert('Preencha código e nome!');

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
}

function atualizarTelaCarrinho() {
    let soma = 0;
    el('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p) => {
        soma += p.quantidade * p.valorUnitario;
        el('listaCarrinho').innerHTML += `<div class="item-carrinho"><div><strong>${p.quantidade}x ${p.tipoPeca}</strong> • ${p.nomeEstampa}</div><div>${formatCurrency(p.valorUnitario)}</div></div>`;
    });
    el('valorTotal').value = formatCurrency(soma);
}

async function salvarPedidoCompleto() {
    const nome = upper(el('nome').value);
    if (!nome || carrinhoTemporario.length === 0) return alert('Dados incompletos!');

    const statusBase = el('statusPagamento').value === 'PENDENTE' ? 'AGUARDANDO PAGAMENTO' : 'PEDIDO FEITO';

    await db.collection('pedidos').add({
        numeroPedido: Math.floor(1000 + Math.random() * 9000).toString(),
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
        status: statusBase,
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Pedido salvo com sucesso!');
    carrinhoTemporario = [];
    atualizarTelaCarrinho();
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
        tipoPadrao: upper(el('editCatalogoTipo').value)
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
        container.innerHTML += `<article class="catalog-item"><div class="catalog-item-top"><p class="catalog-code">${est.codigo}</p><span class="catalog-tag">ESTAMPA</span></div><h3>${est.nome}</h3><p class="catalog-price">${formatCurrency(est.valor || 0)}</p><details class="sanfona-tipo"><summary>Tipo padrão</summary><p>${est.tipoPadrao || 'NÃO DEFINIDO'}</p></details><div class="catalog-actions"><button class="catalog-edit" onclick="abrirModalCatalogo('${est.codigo}')">Editar</button><button class="catalog-delete" onclick="db.collection('estampas').doc('${est.codigo}').delete()">Excluir</button></div></article>`;
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
    const itens = (pedido.itens || []).map((i) => `${i.quantidade || 1}x ${i.nomeEstampa || i.codigoEstampa || 'PEÇA'}`).join(', ') || 'seus itens';
    return `Oi, ${nome}! Passando pra te atualizar: seu pedido #${pedido.numeroPedido || ''} está em *${pedido.status || 'processamento'}* 🚀 Itens: ${itens}. Qualquer coisa me chama por aqui!`;
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
    if (!confirm('Excluir pedido?')) return;
    db.collection('pedidos').doc(id).delete();
}

function renderPedidosGrid(lista) {
    const container = el('gridPedidosContainer');
    container.innerHTML = '';

    const grupos = STATUS_LIST.map((status) => ({ status, itens: lista.filter((p) => upper(p.status || 'PEDIDO FEITO') === status) }));

    grupos.forEach((grupo) => {
        container.innerHTML += `<section class="kanban-col"><header><h3>${grupo.status}</h3><span>${grupo.itens.length}</span></header><div class="kanban-cards">${grupo.itens.map((pedido) => `
            <article class="pedido-card-v2">
                <div class="pedido-header"><strong>#${pedido.numeroPedido || '----'} • ${pedido.nome || 'SEM NOME'}</strong><span class="pedido-badge ${statusClass(grupo.status)}">${grupo.status}</span></div>
                <p><strong>Itens:</strong> ${getItensResumo(pedido.itens)}</p>
                <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
                <p><strong>Data:</strong> ${formatDate(pedido.dataCriacao)}</p>
                ${abrirSanfonaStatus(pedido.id, upper(pedido.status || 'PEDIDO FEITO'))}
                <div class="pedido-actions">
                    <a class="btn-whats" target="_blank" href="${linkWhatsPedido(pedido)}">WhatsApp</a>
                    <button class="catalog-edit" onclick="abrirVisualizacaoClientePedido('${pedido.id}')">Visualizar</button>
                    <button class="catalog-delete" onclick="excluirPedido('${pedido.id}')">Excluir</button>
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

function abrirVisualizacaoCliente(cliente) {
    el('fichaClienteTitulo').textContent = `Ficha: ${cliente.nome || 'Cliente'}`;
    el('fichaClienteConteudo').innerHTML = `
        <div class="cliente-ficha-grid">
            <p><strong>WhatsApp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>Instagram:</strong> ${cliente.instagram || '-'}</p>
            <p><strong>Documento:</strong> ${cliente.documento || '-'}</p>
            <p><strong>Aniversário:</strong> ${cliente.aniversario || '-'}</p>
            <p><strong>Cidade/UF:</strong> ${cliente.cidade || '-'} ${cliente.estado || ''}</p>
            <p><strong>Endereço:</strong> ${cliente.endereco || '-'} ${cliente.referencia ? `• ${cliente.referencia}` : ''}</p>
            <p><strong>Total de pedidos:</strong> ${cliente.totalPedidos || 0}</p>
            <p><strong>Total gasto:</strong> ${formatCurrency(cliente.totalGasto || 0)}</p>
        </div>
        <h3 class="form-section-title">Histórico de pedidos</h3>
        <div>${(cliente.historicoPedidos || []).map((p) => `<div class="item-carrinho"><div>#${p.numeroPedido} • ${formatDate(p.dataCriacao)} • ${p.status}</div><div>${formatCurrency(p.valorTotal || 0)}</div></div>`).join('') || 'Sem histórico'}</div>`;
    el('modalFichaCliente').style.display = 'flex';
}

function abrirVisualizacaoClientePedido(idPedido) {
    const pedido = pedidosCache.find((p) => p.id === idPedido);
    if (!pedido) return;
    const chave = onlyDigits(pedido.whatsapp) || `${upper(pedido.nome)}-${upper(pedido.documento)}`;
    const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === chave);
    if (cliente) abrirVisualizacaoCliente(cliente);
}


function visualizarClientePorId(idRef) {
    const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef);
    if (cliente) abrirVisualizacaoCliente(cliente);
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
            <p><strong>Cidade:</strong> ${cliente.cidade || '-'} ${cliente.estado || ''}</p>
            <div class="cliente-stats"><span>${cliente.totalPedidos || 0} pedido(s)</span><span>${formatCurrency(cliente.totalGasto || 0)}</span></div>
            <div class="pedido-actions">
                <button class="catalog-edit" onclick="visualizarClientePorId('${idRef}')">Visualizar</button>
                <button class="catalog-edit" onclick="editarCliente('${idRef}')">Editar</button>
                <button class="catalog-delete" onclick="excluirCliente('${idRef}')">Excluir</button>
            </div>
        </article>`;
    });
}

function filtrarClientes() {
    const busca = upper(el('filtroClientes').value);
    renderClientes(clientesCache.filter((cliente) => upper(`${cliente.nome} ${cliente.whatsapp} ${cliente.documento} ${cliente.cidade}`).includes(busca)));
}

function gerarPDF() {
    if (!pedidosCache.length) return alert('Sem pedidos para PDF.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Fila de Produção', 14, 14);
    doc.autoTable({
        startY: 20,
        head: [['Pedido', 'Cliente', 'Status', 'Total']],
        body: pedidosCache.map((p) => [`#${p.numeroPedido || '-'}`, p.nome || '-', p.status || '-', formatCurrency(p.valorTotal || 0)])
    });
    doc.save(`fila-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function salvarNovaEstampa(e) {
    e.preventDefault();
    const cod = upper(el('cadCodigoEstampa').value);
    await db.collection('estampas').doc(cod).set({
        codigo: cod,
        nome: upper(el('cadNomeEstampa').value),
        valor: unmaskCurrency(el('cadValorEstampa').value),
        tipoPadrao: upper(el('cadTipoPadrao').value)
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
            estampasCache.push({ codigo: upper(est.codigo), nome: upper(est.nome), valor: Number(est.valor) || 0, tipoPadrao: upper(est.tipoPadrao) });
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
