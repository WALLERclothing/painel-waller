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

let estampasCache = [];
let carrinhoTemporario = [];
let pedidosCache = [];
let clientesCache = [];
let filtroAtual = 'TODOS';

const STATUSS = ['PEDIDO FEITO', 'AGUARDANDO PAGAMENTO', 'EM SEPARAÇÃO', 'ENVIO EFETUADO', 'RECEBIDO'];

function formatCurrency(num) {
    const value = parseFloat(num) || 0;
    return 'R$ ' + value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function unmaskCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

function upper(v) { return (v || '').toString().trim().toUpperCase(); }
function onlyDigits(v) { return (v || '').toString().replace(/\D/g, ''); }

function formatDate(dateValue) {
    if (!dateValue) return '-';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('pt-BR');
}

function getItensResumo(itens = []) {
    if (!itens.length) return 'Sem itens';
    return itens.map((item) => `${item.quantidade || 1}x ${item.nomeEstampa || item.codigoEstampa || 'PEÇA'}`).join(' • ');
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

    const encontrada = estampasCache.find((estampa) => estampa.codigo === codigo);
    if (encontrada) {
        el('nomeEstampa').value = encontrada.nome;
        el('valorUnitario').value = formatCurrency(encontrada.valor || 0);
        if (encontrada.tipoPadrao && Array.from(el('tipoPeca').options).some((opt) => opt.value === encontrada.tipoPadrao)) {
            el('tipoPeca').value = encontrada.tipoPadrao;
        }
        feedback.textContent = `Estampa encontrada: ${encontrada.nome}`;
        feedback.classList.add('ok');
        feedback.classList.remove('warn');
    } else {
        feedback.textContent = 'Código não encontrado no catálogo. Preencha o nome manualmente.';
        feedback.classList.add('warn');
        feedback.classList.remove('ok');
    }
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
    el('mensagemAutoPreenchimento').textContent = '';
    el('mensagemAutoPreenchimento').classList.remove('ok', 'warn');
}

function atualizarTelaCarrinho() {
    let soma = 0;
    el('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p) => {
        soma += p.quantidade * p.valorUnitario;
        el('listaCarrinho').innerHTML += `<div class="item-carrinho"><div><strong>${p.quantidade}x ${p.tipoPeca}</strong> • ${p.nomeEstampa} [${p.codigoEstampa}]</div><div>${formatCurrency(p.valorUnitario)}</div></div>`;
    });
    el('valorTotal').value = formatCurrency(soma);
}

async function salvarPedidoCompleto() {
    const nome = upper(el('nome').value);
    if (!nome || carrinhoTemporario.length === 0) return alert('Dados incompletos!');

    const payload = {
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
        status: el('statusPagamento').value === 'PENDENTE' ? 'AGUARDANDO PAGAMENTO' : 'PEDIDO FEITO',
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('pedidos').add(payload);
        alert('Pedido salvo com sucesso!');
        carrinhoTemporario = [];
        atualizarTelaCarrinho();
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar pedido.');
    }
}

function abrirCadastroCliente() { el('modalCliente').style.display = 'flex'; }
function fecharCadastroCliente() { el('modalCliente').style.display = 'none'; }

async function salvarCliente(event) {
    event.preventDefault();
    const whatsapp = onlyDigits(el('clienteWhatsapp').value);
    const id = whatsapp || `${Date.now()}`;
    const payload = {
        nome: upper(el('clienteNome').value),
        whatsapp,
        instagram: upper(el('clienteInstagram').value),
        documento: upper(el('clienteDocumento').value),
        aniversario: el('clienteAniversario').value || '',
        cidade: upper(el('clienteCidade').value),
        estado: upper(el('clienteEstado').value),
        endereco: upper(el('clienteEndereco').value),
        referencia: upper(el('clienteReferencia').value),
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('clientes').doc(id).set(payload, { merge: true });
        event.target.reset();
        fecharCadastroCliente();
        alert('Cliente cadastrado com sucesso!');
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar cliente.');
    }
}

function aniversarioProximo(dataIso) {
    if (!dataIso) return false;
    const hoje = new Date();
    const niver = new Date(dataIso + 'T00:00:00');
    const prox = new Date(hoje.getFullYear(), niver.getMonth(), niver.getDate());
    const diff = Math.ceil((prox - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
    return diff >= 0 && diff <= 15;
}

function renderCatalogo(lista = estampasCache) {
    const container = el('catalogoEstampas');
    container.innerHTML = '';
    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhuma estampa cadastrada.</div>';
        return;
    }
    lista.forEach((est) => {
        container.innerHTML += `<article class="catalog-item"><div class="catalog-item-top"><p class="catalog-code">${est.codigo}</p><span class="catalog-tag">ESTAMPA</span></div><h3>${est.nome}</h3><p class="catalog-price">${formatCurrency(est.valor || 0)}</p><p class="catalog-type">Tipo padrão: <strong>${est.tipoPadrao || '-'}</strong></p><div class="catalog-actions"><button class="catalog-edit" onclick="editarProdutoCatalogo('${est.codigo}')">Editar</button><button class="catalog-delete" onclick="db.collection('estampas').doc('${est.codigo}').delete()">Remover</button></div></article>`;
    });
}

function editarProdutoCatalogo(codigo) {
    const produto = estampasCache.find((item) => item.codigo === codigo);
    if (!produto) return;
    const novoNome = prompt('Editar nome da estampa:', produto.nome);
    if (novoNome === null) return;
    const novoValor = prompt('Editar valor base (R$):', (produto.valor || 0).toFixed(2).replace('.', ','));
    if (novoValor === null) return;
    const novoTipo = prompt('Editar tipo padrão (opcional):', produto.tipoPadrao || '');
    if (novoTipo === null) return;
    db.collection('estampas').doc(codigo).set({ codigo, nome: upper(novoNome), valor: unmaskCurrency(novoValor), tipoPadrao: upper(novoTipo) });
}

function filtrarCatalogo() {
    const filtro = upper(el('filtroEstampas').value);
    renderCatalogo(estampasCache.filter((est) => est.codigo.includes(filtro) || est.nome.includes(filtro)));
}

function getWhatsappLink(whatsapp, pedido) {
    const numero = onlyDigits(whatsapp);
    if (!numero) return '#';
    const msg = encodeURIComponent(`Olá ${pedido.nome || ''}, atualizamos o status do pedido #${pedido.numeroPedido || ''}: ${pedido.status || ''}.`);
    return `https://wa.me/55${numero}?text=${msg}`;
}

function editarPedido(id) {
    const pedido = pedidosCache.find((p) => p.id === id);
    if (!pedido) return;
    const novoStatus = prompt(`Status do pedido (${STATUSS.join(', ')}):`, pedido.status || 'PEDIDO FEITO');
    if (novoStatus === null) return;
    const novoPagamento = prompt('Status do pagamento (PAGO/PENDENTE):', pedido.statusPagamento || 'PENDENTE');
    if (novoPagamento === null) return;
    db.collection('pedidos').doc(id).update({ status: upper(novoStatus), statusPagamento: upper(novoPagamento) });
}

function excluirPedido(id) {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    db.collection('pedidos').doc(id).delete();
}

function statusBadgeClass(status) {
    if (status === 'AGUARDANDO PAGAMENTO') return 'badge-pendente';
    if (status === 'EM SEPARAÇÃO') return 'badge-estampa';
    if (status === 'ENVIO EFETUADO') return 'badge-enviado';
    if (status === 'RECEBIDO') return 'badge-default';
    return 'badge-default';
}

function renderPedidosGrid(lista) {
    const container = el('gridPedidosContainer');
    container.innerHTML = '';
    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhum pedido encontrado.</div>';
        return;
    }

    const grupos = ['PEDIDO FEITO', 'AGUARDANDO PAGAMENTO', 'EM SEPARAÇÃO', 'ENVIO EFETUADO', 'RECEBIDO'];
    grupos.forEach((status) => {
        const pedidosStatus = lista.filter((pedido) => upper(pedido.status || 'PEDIDO FEITO') === status);
        container.innerHTML += `<section class="status-group"><h3>${status} <span>(${pedidosStatus.length})</span></h3><div class="status-group-grid">${pedidosStatus.map((pedido) => `
            <article class="pedido-card-v2">
                <div class="pedido-header"><strong>#${pedido.numeroPedido || '----'} • ${pedido.nome || 'SEM NOME'}</strong><span class="pedido-badge ${statusBadgeClass(status)}">${status}</span></div>
                <p><strong>WhatsApp:</strong> ${pedido.whatsapp || '-'}</p>
                <p><strong>Itens:</strong> ${getItensResumo(pedido.itens)}</p>
                <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
                <p><strong>Data:</strong> ${formatDate(pedido.dataCriacao)}</p>
                <div class="pedido-actions">
                    <button class="catalog-edit" onclick="editarPedido('${pedido.id}')">Editar</button>
                    <button class="catalog-delete" onclick="excluirPedido('${pedido.id}')">Excluir</button>
                    <a class="btn-whats" target="_blank" href="${getWhatsappLink(pedido.whatsapp, pedido)}">WhatsApp</a>
                </div>
            </article>
        `).join('')}</div></section>`;
    });
}

function atualizarDashboard(lista) {
    const hoje = new Date();
    const pedidosMes = lista.filter((p) => p.dataCriacao && ((p.dataCriacao.toDate ? p.dataCriacao.toDate() : new Date(p.dataCriacao)).getMonth() === hoje.getMonth())).length;
    const aguardandoPgto = lista.filter((p) => upper(p.status) === 'AGUARDANDO PAGAMENTO').length;
    const enviados = lista.filter((p) => upper(p.status) === 'ENVIO EFETUADO').length;
    const faturamento = lista.filter((p) => upper(p.statusPagamento) === 'PAGO').reduce((acc, p) => acc + (p.valorTotal || 0), 0);

    el('dashPedidosMes').textContent = pedidosMes;
    el('dashAguardandoPagamento').textContent = aguardandoPgto;
    el('dashEnviar').textContent = enviados;
    el('dashFaturamento').textContent = formatCurrency(faturamento);
}

function aplicarFiltros() {
    const busca = upper(el('inputBusca').value);
    const filtrada = pedidosCache.filter((pedido) => {
        const texto = `${upper(pedido.nome)} ${upper(pedido.whatsapp)} ${upper(pedido.numeroPedido)} ${upper(getItensResumo(pedido.itens))}`;
        const okBusca = texto.includes(busca);
        if (filtroAtual === 'TODOS') return okBusca;
        return upper(pedido.status) === filtroAtual && okBusca;
    });
    renderPedidosGrid(filtrada);
}

function setFiltroBtn(filtro) {
    filtroAtual = filtro;
    document.querySelectorAll('.btn-filtro').forEach((btn) => btn.classList.remove('ativo'));
    const idMap = { TODOS: 'filtro-todos', 'AGUARDANDO PAGAMENTO': 'filtro-pendente', 'EM SEPARAÇÃO': 'filtro-separacao' };
    if (idMap[filtro]) el(idMap[filtro]).classList.add('ativo');
    aplicarFiltros();
}

function extrairClientesDosPedidos(pedidos = [], clientesExtras = []) {
    const mapa = new Map();

    clientesExtras.forEach((c) => {
        const chave = onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`;
        if (!chave) return;
        mapa.set(chave, { ...c, nome: upper(c.nome), totalPedidos: 0, totalGasto: 0, ultimaCompra: null });
    });

    pedidos.forEach((pedido) => {
        const chave = onlyDigits(pedido.whatsapp) || `${upper(pedido.nome)}-${upper(pedido.documento)}`;
        if (!chave) return;
        const atual = mapa.get(chave) || {
            nome: upper(pedido.nome), whatsapp: onlyDigits(pedido.whatsapp), instagram: upper(pedido.instagram), documento: upper(pedido.documento),
            cidade: upper(pedido.cidade), estado: upper(pedido.estado), endereco: upper(pedido.endereco), referencia: upper(pedido.referencia), aniversario: '', totalPedidos: 0, totalGasto: 0, ultimaCompra: null
        };
        atual.totalPedidos += 1;
        atual.totalGasto += Number(pedido.valorTotal) || 0;
        const data = pedido.dataCriacao && (pedido.dataCriacao.toDate ? pedido.dataCriacao.toDate() : new Date(pedido.dataCriacao));
        if (data && (!atual.ultimaCompra || data > atual.ultimaCompra)) atual.ultimaCompra = data;
        mapa.set(chave, atual);
    });

    clientesCache = Array.from(mapa.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

function renderClientes(lista = clientesCache) {
    const container = el('listaClientes');
    container.innerHTML = '';
    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhum cliente encontrado.</div>';
        return;
    }

    lista.forEach((cliente) => {
        container.innerHTML += `<article class="cliente-card ${aniversarioProximo(cliente.aniversario) ? 'cliente-alerta' : ''}">
            <h3>${cliente.nome || 'SEM NOME'}</h3>
            ${aniversarioProximo(cliente.aniversario) ? '<span class="niver-tag">🎂 Aniversário próximo</span>' : ''}
            <p><strong>Whatsapp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>Instagram:</strong> ${cliente.instagram || '-'}</p>
            <p><strong>Documento:</strong> ${cliente.documento || '-'}</p>
            <p><strong>Cidade:</strong> ${cliente.cidade || '-'} ${cliente.estado || ''}</p>
            <p><strong>Endereço:</strong> ${cliente.endereco || '-'} ${cliente.referencia ? `• ${cliente.referencia}` : ''}</p>
            <div class="cliente-stats"><span>${cliente.totalPedidos || 0} pedido(s)</span><span>${formatCurrency(cliente.totalGasto || 0)}</span><span>Última compra: ${cliente.ultimaCompra ? cliente.ultimaCompra.toLocaleDateString('pt-BR') : '-'}</span></div>
        </article>`;
    });
}

function filtrarClientes() {
    const busca = upper(el('filtroClientes').value);
    const filtrados = clientesCache.filter((cliente) => upper(`${cliente.nome} ${cliente.whatsapp} ${cliente.instagram} ${cliente.documento} ${cliente.cidade} ${cliente.estado} ${cliente.endereco}`).includes(busca));
    renderClientes(filtrados);
}

function gerarPDF() {
    if (!pedidosCache.length) return alert('Não há pedidos para gerar PDF.');
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text('Waller Clothing - Fila de Produção', 14, 14);
        const linhas = pedidosCache.map((p) => [`#${p.numeroPedido || '-'}`, p.nome || '-', p.status || '-', p.statusPagamento || '-', formatCurrency(p.valorTotal || 0)]);
        doc.autoTable({ startY: 20, head: [['Pedido', 'Cliente', 'Status', 'Pagamento', 'Total']], body: linhas, styles: { fontSize: 9 } });
        doc.save(`fila-producao-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
        console.error(error);
        alert('Falha ao gerar PDF.');
    }
}

function carregarPedidosTempoReal() {
    db.collection('pedidos').orderBy('dataCriacao', 'desc').onSnapshot((snap) => {
        pedidosCache = [];
        snap.forEach((doc) => pedidosCache.push({ id: doc.id, ...doc.data() }));
        atualizarDashboard(pedidosCache);
        aplicarFiltros();
        carregarClientes();
        el('carregando').style.display = 'none';
    }, () => {
        el('carregando').textContent = 'Erro ao sincronizar pedidos';
    });
}

function carregarClientes() {
    db.collection('clientes').onSnapshot((snap) => {
        const clientesExtras = [];
        snap.forEach((doc) => clientesExtras.push(doc.data()));
        extrairClientesDosPedidos(pedidosCache, clientesExtras);
        renderClientes();
        el('carregandoClientes').style.display = 'none';
    }, () => {
        extrairClientesDosPedidos(pedidosCache, []);
        renderClientes();
        el('carregandoClientes').textContent = 'Erro';
    });
}

function salvarNovaEstampa(e) {
    e.preventDefault();
    const cod = upper(el('cadCodigoEstampa').value);
    const nome = upper(el('cadNomeEstampa').value);
    const valor = unmaskCurrency(el('cadValorEstampa').value);
    const tipoPadrao = upper(el('cadTipoPadrao').value);
    db.collection('estampas').doc(cod).set({ codigo: cod, nome, valor, tipoPadrao });
    e.target.reset();
}

el('codigoEstampa').addEventListener('input', preencherEstampaPorCodigo);
el('codigoEstampa').addEventListener('blur', preencherEstampaPorCodigo);
el('valorUnitario').addEventListener('blur', () => {
    const value = unmaskCurrency(el('valorUnitario').value);
    if (value > 0) el('valorUnitario').value = formatCurrency(value);
});
el('cadValorEstampa').addEventListener('blur', () => {
    const value = unmaskCurrency(el('cadValorEstampa').value);
    if (value > 0) el('cadValorEstampa').value = formatCurrency(value);
});

db.collection('estampas').orderBy('codigo').onSnapshot((snap) => {
    el('carregandoEstampas').style.display = 'none';
    estampasCache = [];
    snap.forEach((doc) => {
        const est = doc.data();
        estampasCache.push({ codigo: upper(est.codigo), nome: upper(est.nome), valor: Number(est.valor) || 0, tipoPadrao: upper(est.tipoPadrao) });
    });
    renderCatalogo();
    preencherEstampaPorCodigo();
});

carregarTema();
carregarPedidosTempoReal();
