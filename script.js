const el = (id) => document.getElementById(id);
const STATUS_CLASS_MAP = {
    'PEDIDO FEITO': 'status-pedido-feito',
    'AGUARDANDO ESTAMPA': 'status-aguardando',
    'ESTAMPA PRONTA': 'status-estampa-pronta',
    'PEDIDO ENVIADO': 'status-pedido-enviado',
    'PEDIDO ENTREGUE': 'status-pedido-entregue'
};

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

function formatCurrency(num) {
    let value = parseFloat(num) || 0;
    return 'R$ ' + value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function unmaskCurrency(value) {
    if (!value) return 0;
    value = value.toString().replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(value) || 0;
}

function upper(v) {
    return (v || '').toString().trim().toUpperCase();
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

function getPedidoBadgeClass(pedido) {
    if (pedido.statusPagamento === 'PENDENTE') return 'badge-pendente';
    if (pedido.status === 'AGUARDANDO ESTAMPA') return 'badge-estampa';
    if (pedido.status === 'PEDIDO ENVIADO') return 'badge-enviado';
    return 'badge-default';
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

    el('btnGerarPDF').style.display = aba === 'producao' ? 'block' : 'none';
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
        if (encontrada.tipoPadrao) {
            const option = Array.from(el('tipoPeca').options).find((opt) => opt.value === encontrada.tipoPadrao);
            if (option) el('tipoPeca').value = encontrada.tipoPadrao;
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
    el('codigoEstampa').focus();
}

function atualizarTelaCarrinho() {
    let soma = 0;
    el('listaCarrinho').innerHTML = '';

    carrinhoTemporario.forEach((p) => {
        soma += (p.quantidade * p.valorUnitario);
        el('listaCarrinho').innerHTML += `
            <div class="item-carrinho">
                <div>
                    <strong>${p.quantidade}x ${p.tipoPeca}</strong> • ${p.nomeEstampa} [${p.codigoEstampa}]<br>
                    ${p.tamanho} • ${p.cor}
                </div>
                <div>${formatCurrency(p.valorUnitario)}</div>
            </div>`;
    });

    el('valorTotal').value = formatCurrency(soma);
}

async function salvarPedidoCompleto() {
    const nome = upper(el('nome').value);
    if (!nome || carrinhoTemporario.length === 0) return alert('Dados incompletos!');

    try {
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
            status: 'PEDIDO FEITO',
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Pedido salvo com sucesso!');
        carrinhoTemporario = [];
        atualizarTelaCarrinho();
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar pedido. Verifique sua conexão e tente novamente.');
    }
}

function renderCatalogo(lista = estampasCache) {
    const container = el('catalogoEstampas');
    container.innerHTML = '';

    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhuma estampa cadastrada.</div>';
        return;
    }

    lista.forEach((est) => {
        container.innerHTML += `
            <article class="catalog-item">
                <div class="catalog-item-top">
                    <p class="catalog-code">${est.codigo}</p>
                    <span class="catalog-tag">ESTAMPA</span>
                </div>
                <h3>${est.nome}</h3>
                <p class="catalog-price">${formatCurrency(est.valor || 0)}</p>
                <p class="catalog-type">Tipo padrão: <strong>${est.tipoPadrao || '-'}</strong></p>
                <div class="catalog-actions">
                    <button class="catalog-edit" onclick="editarProdutoCatalogo('${est.codigo}')">Editar</button>
                    <button class="catalog-delete" onclick="db.collection('estampas').doc('${est.codigo}').delete()">Remover</button>
                </div>
            </article>`;
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

    db.collection('estampas').doc(codigo).set({
        codigo,
        nome: upper(novoNome),
        valor: unmaskCurrency(novoValor),
        tipoPadrao: upper(novoTipo)
    });
}

function filtrarCatalogo() {
    const filtro = upper(el('filtroEstampas').value);
    const filtradas = estampasCache.filter((est) => est.codigo.includes(filtro) || est.nome.includes(filtro));
    renderCatalogo(filtradas);
}


function extrairClientesDosPedidos(pedidos = []) {
    const mapa = new Map();

    pedidos.forEach((pedido) => {
        const chave = upper(pedido.whatsapp) || `${upper(pedido.nome)}-${upper(pedido.documento)}`;
        if (!chave) return;

        const atual = mapa.get(chave) || {
            nome: upper(pedido.nome),
            whatsapp: upper(pedido.whatsapp),
            instagram: upper(pedido.instagram),
            documento: upper(pedido.documento),
            cidade: upper(pedido.cidade),
            estado: upper(pedido.estado),
            endereco: upper(pedido.endereco),
            referencia: upper(pedido.referencia),
            cep: upper(pedido.cep),
            totalPedidos: 0,
            totalGasto: 0,
            ultimaCompra: null
        };

        atual.totalPedidos += 1;
        atual.totalGasto += Number(pedido.valorTotal) || 0;

        const data = pedido.dataCriacao && (pedido.dataCriacao.toDate ? pedido.dataCriacao.toDate() : new Date(pedido.dataCriacao));
        if (data && (!atual.ultimaCompra || data > atual.ultimaCompra)) atual.ultimaCompra = data;

        mapa.set(chave, atual);
    });

    clientesCache = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function renderClientes(lista = clientesCache) {
    const container = el('listaClientes');
    container.innerHTML = '';

    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhum cliente encontrado.</div>';
        return;
    }

    lista.forEach((cliente) => {
        container.innerHTML += `
            <article class="cliente-card">
                <h3>${cliente.nome || 'SEM NOME'}</h3>
                <p><strong>Whatsapp:</strong> ${cliente.whatsapp || '-'}</p>
                <p><strong>Instagram:</strong> ${cliente.instagram || '-'}</p>
                <p><strong>Documento:</strong> ${cliente.documento || '-'}</p>
                <p><strong>Cidade:</strong> ${cliente.cidade || '-'} ${cliente.estado || ''}</p>
                <p><strong>Endereço:</strong> ${cliente.endereco || '-'} ${cliente.referencia ? `• ${cliente.referencia}` : ''}</p>
                <div class="cliente-stats">
                    <span>${cliente.totalPedidos} pedido(s)</span>
                    <span>${formatCurrency(cliente.totalGasto)}</span>
                    <span>Última compra: ${cliente.ultimaCompra ? cliente.ultimaCompra.toLocaleDateString('pt-BR') : '-'}</span>
                </div>
            </article>`;
    });
}

function filtrarClientes() {
    const busca = upper(el('filtroClientes').value);
    const filtrados = clientesCache.filter((cliente) => {
        const blob = `${cliente.nome} ${cliente.whatsapp} ${cliente.instagram} ${cliente.documento} ${cliente.cidade} ${cliente.estado} ${cliente.endereco}`;
        return upper(blob).includes(busca);
    });
    renderClientes(filtrados);
}

function renderPedidosGrid(lista) {
    const container = el('gridPedidosContainer');
    container.innerHTML = '';

    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhum pedido encontrado para os filtros selecionados.</div>';
        return;
    }

    lista.forEach((pedido) => {
        container.innerHTML += `
            <article class="pedido-card-v2">
                <div class="pedido-header">
                    <strong>#${pedido.numeroPedido || '----'} • ${pedido.nome || 'SEM NOME'}</strong>
                    <span class="pedido-badge ${getPedidoBadgeClass(pedido)}">${pedido.statusPagamento === 'PENDENTE' ? 'PENDENTE PGTO' : (pedido.status || 'PEDIDO FEITO')}</span>
                </div>
                <p><strong>WhatsApp:</strong> ${pedido.whatsapp || '-'}</p>
                <p><strong>Itens:</strong> ${getItensResumo(pedido.itens)}</p>
                <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
                <p><strong>Data:</strong> ${formatDate(pedido.dataCriacao)}</p>
            </article>`;
    });
}

function atualizarDashboard(lista) {
    const hoje = new Date();
    const pedidosMes = lista.filter((pedido) => {
        if (!pedido.dataCriacao) return false;
        const data = pedido.dataCriacao.toDate ? pedido.dataCriacao.toDate() : new Date(pedido.dataCriacao);
        return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    }).length;

    const filaEstampa = lista.filter((pedido) => pedido.status === 'AGUARDANDO ESTAMPA').length;
    const enviar = lista.filter((pedido) => pedido.status === 'ESTAMPA PRONTA' || pedido.status === 'PEDIDO FEITO').length;
    const faturamento = lista
        .filter((pedido) => pedido.statusPagamento === 'PAGO')
        .reduce((acc, pedido) => acc + (pedido.valorTotal || 0), 0);

    el('dashPedidosMes').textContent = pedidosMes;
    el('dashFilaEstampa').textContent = filaEstampa;
    el('dashEnviar').textContent = enviar;
    el('dashFaturamento').textContent = formatCurrency(faturamento);
}

function aplicarFiltros() {
    const busca = upper(el('inputBusca').value);

    const filtrada = pedidosCache.filter((pedido) => {
        const texto = `${upper(pedido.nome)} ${upper(pedido.whatsapp)} ${upper(pedido.numeroPedido)} ${upper(getItensResumo(pedido.itens))}`;
        const matchBusca = texto.includes(busca);

        if (filtroAtual === 'TODOS') return matchBusca;
        if (filtroAtual === 'PENDENTE_PGTO') return pedido.statusPagamento === 'PENDENTE' && matchBusca;
        return pedido.status === filtroAtual && matchBusca;
    });

    renderPedidosGrid(filtrada);
}

function setFiltroBtn(filtro) {
    filtroAtual = filtro;
    document.querySelectorAll('.btn-filtro').forEach((btn) => btn.classList.remove('ativo'));

    const idMap = {
        TODOS: 'filtro-todos',
        PENDENTE_PGTO: 'filtro-pendente',
        'AGUARDANDO ESTAMPA': 'filtro-estampa'
    };

    const botao = el(idMap[filtro]);
    if (botao) botao.classList.add('ativo');

    aplicarFiltros();
}

function gerarPDF() {
    if (!pedidosCache.length) {
        alert('Não há pedidos para gerar PDF.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(14);
        doc.text('Waller Clothing - Fila de Produção', 14, 14);

        const linhas = pedidosCache.map((pedido) => [
            `#${pedido.numeroPedido || '-'}`,
            pedido.nome || '-',
            pedido.status || '-',
            pedido.statusPagamento || '-',
            formatCurrency(pedido.valorTotal || 0)
        ]);

        doc.autoTable({
            startY: 20,
            head: [['Pedido', 'Cliente', 'Status', 'Pagamento', 'Total']],
            body: linhas,
            styles: { fontSize: 9 }
        });

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
        extrairClientesDosPedidos(pedidosCache);
        renderClientes();
        el('carregando').style.display = 'none';
        el('carregandoClientes').style.display = 'none';
    }, (error) => {
        console.error(error);
        el('carregando').textContent = 'Erro ao sincronizar pedidos';
    });
}

function salvarNovaEstampa(e) {
    e.preventDefault();
    const cod = upper(el('cadCodigoEstampa').value);
    const nome = upper(el('cadNomeEstampa').value);
    const valor = unmaskCurrency(el('cadValorEstampa').value);
    const tipoPadrao = upper(el('cadTipoPadrao').value);
    if (!cod || !nome) return;

    db.collection('estampas').doc(cod).set({ codigo: cod, nome, valor, tipoPadrao });
    e.target.reset();
}

const codigoEstampaInput = el('codigoEstampa');
codigoEstampaInput.addEventListener('input', preencherEstampaPorCodigo);
codigoEstampaInput.addEventListener('blur', preencherEstampaPorCodigo);

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
        estampasCache.push({
            codigo: upper(est.codigo),
            nome: upper(est.nome),
            valor: Number(est.valor) || 0,
            tipoPadrao: upper(est.tipoPadrao)
        });
    });

    renderCatalogo();
    preencherEstampaPorCodigo();
}, (error) => {
    console.error(error);
    el('carregandoEstampas').textContent = 'Erro';
});

carregarPedidosTempoReal();
