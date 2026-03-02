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
let pedidosCache = [];
let clientesExtrasCache = [];
let clientesCache = [];
let carrinhoTemporario = [];
let filtroAtual = 'TODOS';
let clienteEditandoId = null;

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

function primeiroNome(nome = '') { return (nome.trim().split(' ')[0] || 'cliente'); }

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
    if (localStorage.getItem('temaWaller') === 'dark') {
        document.body.classList.add('dark-mode');
        el('btnTema').textContent = '☀️ Tema claro';
    }
}

function getItensResumo(itens = []) {
    if (!itens.length) return 'Sem itens';
    return itens.map((i) => `${i.quantidade || 1}x ${i.nomeEstampa || i.codigoEstampa || 'PEÇA'}`).join(' • ');
}

async function buscarCep(tipo) {
    const isCliente = tipo === 'cliente';
    const cepId = isCliente ? 'clienteCep' : 'cep';
    const enderecoId = isCliente ? 'clienteEndereco' : 'endereco';
    const cidadeId = isCliente ? 'clienteCidade' : 'cidade';
    const estadoId = isCliente ? 'clienteEstado' : 'estado';
    const referenciaId = isCliente ? 'clienteReferencia' : 'referencia';

    const cep = onlyDigits(el(cepId).value);
    if (cep.length !== 8) return;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) return;

        el(enderecoId).value = upper(data.logradouro || el(enderecoId).value);
        el(cidadeId).value = upper(data.localidade || el(cidadeId).value);
        el(estadoId).value = upper(data.uf || el(estadoId).value);
        el(referenciaId).value = upper(data.bairro || el(referenciaId).value);
    } catch (err) {
        console.error(err);
    }
}

function preencherEstampaPorCodigo() {
    const codigo = upper(el('codigoEstampa').value);
    el('codigoEstampa').value = codigo;
    const feedback = el('mensagemAutoPreenchimento');
    if (!codigo) return;

    const item = estampasCache.find((est) => est.codigo === codigo);
    if (!item) {
        feedback.textContent = 'Código não encontrado no catálogo.';
        feedback.className = 'helper-text warn';
        return;
    }

    el('nomeEstampa').value = item.nome;
    el('valorUnitario').value = formatCurrency(item.valor || 0);
    if (item.tipoPadrao && Array.from(el('tipoPeca').options).some((opt) => opt.value === item.tipoPadrao)) {
        el('tipoPeca').value = item.tipoPadrao;
    }

    feedback.textContent = `Estampa encontrada: ${item.nome}`;
    feedback.className = 'helper-text ok';
}

function preencherClientePorWhatsapp() {
    const numero = onlyDigits(el('whatsapp').value);
    if (!numero) return;

    const cliente = clientesCache.find((c) => onlyDigits(c.whatsapp) === numero);
    if (!cliente) return;

    el('nome').value = cliente.nome || '';
    el('instagram').value = cliente.instagram || '';
    el('cpf').value = cliente.documento || '';
    el('cep').value = cliente.cep || '';
    el('cidade').value = cliente.cidade || '';
    el('estado').value = cliente.estado || '';
    el('endereco').value = cliente.endereco || '';
    el('numeroEndereco').value = cliente.numeroEndereco || '';
    el('complemento').value = cliente.complemento || '';
    el('referencia').value = cliente.referencia || '';
}

function adicionarAoCarrinho() {
    const cod = upper(el('codigoEstampa').value);
    const nom = upper(el('nomeEstampa').value);
    const qtd = parseInt(el('quantidade').value, 10) || 1;
    if (!cod || !nom) return alert('Preencha código e nome!');

    carrinhoTemporario.push({
        codigoEstampa: cod,
        nomeEstampa: nom,
        tipoPeca: el('tipoPeca').value,
        tamanho: el('tamanho').value,
        cor: el('cor').value,
        quantidade: qtd,
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
        el('listaCarrinho').innerHTML += `<div class="item-carrinho"><div>${p.quantidade}x ${p.nomeEstampa} (${p.tipoPeca})</div><div>${formatCurrency(p.valorUnitario)}</div></div>`;
    });
    const frete = unmaskCurrency(el('frete').value);
    el('valorTotal').value = formatCurrency(soma + frete);
}

async function salvarPedidoCompleto() {
    const nome = upper(el('nome').value);
    if (!nome || carrinhoTemporario.length === 0) return alert('Dados incompletos!');

    const frete = unmaskCurrency(el('frete').value);
    const subtotal = carrinhoTemporario.reduce((acc, i) => acc + ((i.quantidade || 1) * (i.valorUnitario || 0)), 0);
    const total = subtotal + frete;

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
        numeroEndereco: upper(el('numeroEndereco').value),
        complemento: upper(el('complemento').value),
        referencia: upper(el('referencia').value),
        valorFrete: frete,
        valorSubtotal: subtotal,
        valorTotal: total,
        metodoPagamento: el('metodoPagamento').value,
        statusPagamento: el('statusPagamento').value,
        itens: carrinhoTemporario,
        status: el('statusPagamento').value === 'PENDENTE' ? 'AGUARDANDO PAGAMENTO' : 'PEDIDO FEITO',
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Pedido salvo com sucesso!');
    carrinhoTemporario = [];
    atualizarTelaCarrinho();
}

function montarMensagemWhatsapp(pedido) {
    const nome = primeiroNome(pedido.nome || '');
    const itens = (pedido.itens || []).map((i) => `• ${i.quantidade || 1}x ${i.nomeEstampa || i.codigoEstampa} — ${formatCurrency((i.quantidade || 1) * (i.valorUnitario || 0))}`).join('\n');
    const linhas = [
        `Oi, ${nome}! 😊`,
        '',
        `Atualização do pedido #${pedido.numeroPedido || '-'}`,
        `Status: ${pedido.status || 'EM PROCESSO'}`,
        '',
        'Itens:',
        itens || '• Sem itens cadastrados',
        ''
    ];

    if (upper(pedido.status) === 'PEDIDO FEITO') {
        linhas.push(`Subtotal: ${formatCurrency(pedido.valorSubtotal || 0)}`);
        linhas.push(`Frete: ${formatCurrency(pedido.valorFrete || 0)}`);
        linhas.push(`Total: ${formatCurrency(pedido.valorTotal || 0)}`);
        linhas.push('');
    }

    linhas.push('Qualquer dúvida, me chama por aqui! 💬');
    return linhas.join('\n');
}

function linkWhatsapp(pedido) {
    const numero = onlyDigits(pedido.whatsapp);
    if (!numero) return '#';
    return `https://wa.me/55${numero}?text=${encodeURIComponent(montarMensagemWhatsapp(pedido))}`;
}

function statusClass(status) {
    if (status === 'AGUARDANDO PAGAMENTO') return 'badge-pendente';
    if (status === 'EM SEPARAÇÃO') return 'badge-separacao';
    if (status === 'ENVIO EFETUADO') return 'badge-enviado';
    if (status === 'PEDIDO ENTREGUE') return 'badge-entregue';
    return 'badge-default';
}

async function salvarStatusPedido(id, selectId) {
    await db.collection('pedidos').doc(id).update({ status: upper(el(selectId).value) });
}

async function confirmarPagamento(id) {
    await db.collection('pedidos').doc(id).update({ statusPagamento: 'PAGO', status: 'PEDIDO FEITO' });
}

async function excluirPedido(id) {
    if (!confirm('Excluir pedido?')) return;
    await db.collection('pedidos').doc(id).delete();
}

function sanfonaStatus(id, statusAtual) {
    const selectId = `status-${id}`;
    return `<details class="status-sanfona"><summary>Alterar status</summary><select id="${selectId}">${STATUS_LIST.map((s) => `<option value="${s}" ${s===statusAtual?'selected':''}>${s}</option>`).join('')}</select><button class="btn-add" onclick="salvarStatusPedido('${id}','${selectId}')">Salvar</button></details>`;
}

function renderPedidosGrid(lista) {
    const container = el('gridPedidosContainer');
    container.innerHTML = '';

    STATUS_LIST.forEach((status) => {
        const itens = lista.filter((p) => upper(p.status || 'PEDIDO FEITO') === status);
        container.innerHTML += `<section class="kanban-col"><header><h3>${status}</h3><span>${itens.length}</span></header><div class="kanban-cards">${itens.map((pedido) => `
            <article class="pedido-card-v2">
                <div class="pedido-header"><strong>#${pedido.numeroPedido || '-'} • ${pedido.nome || 'SEM NOME'}</strong><span class="pedido-badge ${statusClass(status)}">${status}</span></div>
                <p><strong>Itens:</strong> ${getItensResumo(pedido.itens)}</p>
                <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
                <p><strong>Data:</strong> ${formatDate(pedido.dataCriacao)}</p>
                ${sanfonaStatus(pedido.id, upper(pedido.status || 'PEDIDO FEITO'))}
                <div class="pedido-actions">
                    <a class="btn-whats" target="_blank" href="${linkWhatsapp(pedido)}">WhatsApp</a>
                    ${upper(pedido.statusPagamento) === 'PENDENTE' ? `<button class="catalog-edit" onclick="confirmarPagamento('${pedido.id}')">Confirmar Pgto</button>` : ''}
                    <button class="catalog-delete" onclick="excluirPedido('${pedido.id}')">Excluir</button>
                </div>
            </article>`).join('')}</div></section>`;
    });
}

function aplicarFiltros() {
    const busca = upper(el('inputBusca').value);
    const filtrada = pedidosCache.filter((p) => {
        const blob = `${upper(p.nome)} ${upper(p.whatsapp)} ${upper(getItensResumo(p.itens))}`;
        const okBusca = blob.includes(busca);
        if (filtroAtual === 'TODOS') return okBusca;
        if (filtroAtual === 'AGUARDANDO PAGAMENTO') return upper(p.status) === 'AGUARDANDO PAGAMENTO' && okBusca;
        if (filtroAtual === 'EM PRODUÇÃO') return ['PEDIDO FEITO', 'EM SEPARAÇÃO'].includes(upper(p.status)) && okBusca;
        if (filtroAtual === 'EM ENVIO') return upper(p.status) === 'ENVIO EFETUADO' && okBusca;
        return okBusca;
    });
    renderPedidosGrid(filtrada);
}

function setFiltroBtn(filtro) {
    filtroAtual = filtro;
    document.querySelectorAll('.btn-filtro').forEach((b) => b.classList.remove('ativo'));
    const map = { TODOS:'filtro-todos', 'AGUARDANDO PAGAMENTO':'filtro-pagamento', 'EM PRODUÇÃO':'filtro-producao', 'EM ENVIO':'filtro-envio' };
    if (map[filtro]) el(map[filtro]).classList.add('ativo');
    aplicarFiltros();
}

function atualizarDashboard(lista) {
    const now = new Date();
    el('dashPedidosMes').textContent = lista.filter((p) => p.dataCriacao && ((p.dataCriacao.toDate ? p.dataCriacao.toDate() : new Date(p.dataCriacao)).getMonth() === now.getMonth())).length;
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

function montarClientesCache() {
    const map = new Map();

    clientesExtrasCache.forEach((c) => {
        const key = onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`;
        if (!key) return;
        map.set(key, { ...c, totalPedidos: 0, totalGasto: 0, historicoPedidos: [] });
    });

    pedidosCache.forEach((p) => {
        const key = onlyDigits(p.whatsapp) || `${upper(p.nome)}-${upper(p.documento)}`;
        if (!key) return;
        const base = map.get(key) || {
            nome: upper(p.nome), whatsapp: upper(p.whatsapp), instagram: upper(p.instagram), documento: upper(p.documento),
            cep: upper(p.cep), cidade: upper(p.cidade), estado: upper(p.estado), endereco: upper(p.endereco), numeroEndereco: upper(p.numeroEndereco),
            complemento: upper(p.complemento), referencia: upper(p.referencia), aniversario: '', totalPedidos: 0, totalGasto: 0, historicoPedidos: []
        };
        base.totalPedidos += 1;
        base.totalGasto += Number(p.valorTotal) || 0;
        base.historicoPedidos.push(p);
        map.set(key, base);
    });

    clientesCache = Array.from(map.values()).sort((a, b) => {
        const pa = aniversarioProximo(a.aniversario) ? 0 : 1;
        const pb = aniversarioProximo(b.aniversario) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return (a.nome || '').localeCompare(b.nome || '');
    });
}

function abrirFichaCliente(cliente) {
    el('fichaClienteTitulo').textContent = `Ficha: ${cliente.nome || 'Cliente'}`;
    el('fichaClienteConteudo').innerHTML = `
        <div class="cliente-ficha-grid">
            <p><strong>WhatsApp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>Instagram:</strong> ${cliente.instagram || '-'}</p>
            <p><strong>Documento:</strong> ${cliente.documento || '-'}</p>
            <p><strong>Aniversário:</strong> ${cliente.aniversario || '-'}</p>
            <p><strong>CEP:</strong> ${cliente.cep || '-'}</p>
            <p><strong>Cidade/UF:</strong> ${cliente.cidade || '-'} ${cliente.estado || ''}</p>
            <p><strong>Endereço:</strong> ${cliente.endereco || '-'}, ${cliente.numeroEndereco || 'S/N'} ${cliente.complemento ? `• ${cliente.complemento}` : ''}</p>
            <p><strong>Referência:</strong> ${cliente.referencia || '-'}</p>
            <p><strong>Total de pedidos:</strong> ${cliente.totalPedidos || 0}</p>
            <p><strong>Total gasto:</strong> ${formatCurrency(cliente.totalGasto || 0)}</p>
        </div>
        <h3 class="form-section-title">Histórico de pedidos</h3>
        ${(cliente.historicoPedidos || []).map((p) => `<div class="item-carrinho"><div>#${p.numeroPedido || '-'} • ${formatDate(p.dataCriacao)} • ${p.status || '-'}</div><div>${formatCurrency(p.valorTotal || 0)}</div></div>`).join('') || '<div class="catalog-empty">Sem histórico de pedidos</div>'}
    `;
    el('modalFichaCliente').style.display = 'flex';
}

function fecharFichaCliente() { el('modalFichaCliente').style.display = 'none'; }

function abrirCadastroCliente(idRef = null) {
    clienteEditandoId = idRef;
    el('formCliente').reset();
    if (idRef) {
        const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef);
        if (cliente) {
            el('clienteNome').value = cliente.nome || '';
            el('clienteWhatsapp').value = cliente.whatsapp || '';
            el('clienteInstagram').value = cliente.instagram || '';
            el('clienteDocumento').value = cliente.documento || '';
            el('clienteAniversario').value = cliente.aniversario || '';
            el('clienteCep').value = cliente.cep || '';
            el('clienteCidade').value = cliente.cidade || '';
            el('clienteEstado').value = cliente.estado || '';
            el('clienteEndereco').value = cliente.endereco || '';
            el('clienteNumeroEndereco').value = cliente.numeroEndereco || '';
            el('clienteComplemento').value = cliente.complemento || '';
            el('clienteReferencia').value = cliente.referencia || '';
        }
    }
    el('modalCliente').style.display = 'flex';
}

function fecharCadastroCliente() {
    clienteEditandoId = null;
    el('modalCliente').style.display = 'none';
}

async function salvarCliente(event) {
    event.preventDefault();
    const id = clienteEditandoId || onlyDigits(el('clienteWhatsapp').value) || `${Date.now()}`;
    await db.collection('clientes').doc(id).set({
        nome: upper(el('clienteNome').value),
        whatsapp: upper(el('clienteWhatsapp').value),
        instagram: upper(el('clienteInstagram').value),
        documento: upper(el('clienteDocumento').value),
        aniversario: el('clienteAniversario').value || '',
        cep: upper(el('clienteCep').value),
        cidade: upper(el('clienteCidade').value),
        estado: upper(el('clienteEstado').value),
        endereco: upper(el('clienteEndereco').value),
        numeroEndereco: upper(el('clienteNumeroEndereco').value),
        complemento: upper(el('clienteComplemento').value),
        referencia: upper(el('clienteReferencia').value)
    }, { merge: true });
    fecharCadastroCliente();
}

async function excluirCliente(idRef) {
    if (!confirm('Excluir ficha de cliente?')) return;
    if (!/^\d+$/.test(idRef)) {
        alert('Este cliente veio apenas do histórico de pedidos. Cadastre-o para excluir a ficha manual.');
        return;
    }
    await db.collection('clientes').doc(idRef).delete();
}

function visualizarClientePorId(idRef) {
    const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef);
    if (cliente) abrirFichaCliente(cliente);
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
            <p><strong>WhatsApp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>CEP:</strong> ${cliente.cep || '-'}</p>
            <p><strong>Endereço:</strong> ${cliente.endereco || '-'}, ${cliente.numeroEndereco || 'S/N'} ${cliente.complemento ? `• ${cliente.complemento}` : ''}</p>
            <div class="cliente-stats"><span>${cliente.totalPedidos || 0} pedido(s)</span><span>${formatCurrency(cliente.totalGasto || 0)}</span></div>
            <div class="pedido-actions">
                <button class="catalog-edit" onclick="visualizarClientePorId('${idRef}')">Visualizar</button>
                <button class="catalog-edit" onclick="abrirCadastroCliente('${idRef}')">Editar</button>
                <button class="catalog-delete" onclick="excluirCliente('${idRef}')">Excluir</button>
            </div>
        </article>`;
    });
}

function filtrarClientes() {
    const busca = upper(el('filtroClientes').value);
    renderClientes(clientesCache.filter((c) => upper(`${c.nome} ${c.whatsapp} ${c.documento} ${c.cidade} ${c.cep}`).includes(busca)));
}

function abrirModalCatalogo(codigo) {
    const item = estampasCache.find((e) => e.codigo === codigo);
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
        estoque: parseInt(el('editCatalogoEstoque').value, 10) || 0
    }, { merge: true });
    fecharModalCatalogo();
}

function filtrarCatalogo() {
    const f = upper(el('filtroEstampas').value);
    renderCatalogo(estampasCache.filter((e) => e.codigo.includes(f) || e.nome.includes(f)));
}

function renderCatalogo(lista = estampasCache) {
    const container = el('catalogoEstampas');
    container.innerHTML = '';
    if (!lista.length) {
        container.innerHTML = '<div class="catalog-empty">Nenhum item no catálogo.</div>';
        return;
    }

    lista.forEach((item) => {
        const semEstoque = (item.estoque || 0) <= 0;
        container.innerHTML += `<article class="catalog-item ${semEstoque ? 'sem-estoque' : ''}">
            <div class="catalog-item-top"><p class="catalog-code">${item.codigo}</p><span class="catalog-tag">${semEstoque ? 'ZERADO' : 'EM ESTOQUE'}</span></div>
            <h3>${item.nome}</h3>
            <p class="catalog-price">${formatCurrency(item.valor || 0)}</p>
            <p><strong>Estoque:</strong> ${item.estoque || 0}</p>
            <details class="sanfona-tipo"><summary>Tipo padrão</summary><p>${item.tipoPadrao || 'NÃO DEFINIDO'}</p></details>
            <div class="catalog-actions">
                <button class="catalog-edit" onclick="abrirModalCatalogo('${item.codigo}')">Editar</button>
                <button class="catalog-delete" onclick="db.collection('estampas').doc('${item.codigo}').delete()">Excluir</button>
            </div>
        </article>`;
    });
}

function gerarPDF() {
    if (!pedidosCache.length) return alert('Sem pedidos para PDF.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Fila de Produção', 14, 14);
    doc.autoTable({
        startY: 20,
        head: [['Pedido', 'Cliente', 'Status', 'Pagamento', 'Total']],
        body: pedidosCache.map((p) => [`#${p.numeroPedido || '-'}`, p.nome || '-', p.status || '-', p.statusPagamento || '-', formatCurrency(p.valorTotal || 0)])
    });
    doc.save(`fila-producao-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function salvarNovaEstampa(e) {
    e.preventDefault();
    const codigo = upper(el('cadCodigoEstampa').value);
    await db.collection('estampas').doc(codigo).set({
        codigo,
        nome: upper(el('cadNomeEstampa').value),
        valor: unmaskCurrency(el('cadValorEstampa').value),
        tipoPadrao: upper(el('cadTipoPadrao').value),
        estoque: parseInt(el('cadEstoque').value, 10) || 0
    }, { merge: true });
    e.target.reset();
}

function iniciarListeners() {
    db.collection('pedidos').orderBy('dataCriacao', 'desc').onSnapshot((snap) => {
        pedidosCache = [];
        snap.forEach((doc) => pedidosCache.push({ id: doc.id, ...doc.data() }));
        atualizarDashboard(pedidosCache);
        aplicarFiltros();
        montarClientesCache();
        renderClientes();
        el('carregando').style.display = 'none';
    });

    db.collection('clientes').onSnapshot((snap) => {
        clientesExtrasCache = [];
        snap.forEach((doc) => clientesExtrasCache.push(doc.data()));
        montarClientesCache();
        renderClientes();
        el('carregandoClientes').style.display = 'none';
    });

    db.collection('estampas').orderBy('codigo').onSnapshot((snap) => {
        estampasCache = [];
        snap.forEach((doc) => {
            const data = doc.data();
            estampasCache.push({
                codigo: upper(data.codigo),
                nome: upper(data.nome),
                valor: Number(data.valor) || 0,
                tipoPadrao: upper(data.tipoPadrao),
                estoque: Number(data.estoque) || 0
            });
        });
        renderCatalogo();
        el('carregandoEstampas').style.display = 'none';
    });
}

el('codigoEstampa').addEventListener('input', preencherEstampaPorCodigo);
el('whatsapp').addEventListener('blur', preencherClientePorWhatsapp);
el('cep').addEventListener('blur', () => buscarCep('pedido'));
el('clienteCep').addEventListener('blur', () => buscarCep('cliente'));
el('frete').addEventListener('blur', atualizarTelaCarrinho);
el('cadValorEstampa').addEventListener('blur', () => {
    const v = unmaskCurrency(el('cadValorEstampa').value);
    if (v > 0) el('cadValorEstampa').value = formatCurrency(v);
});
el('editCatalogoValor').addEventListener('blur', () => {
    const v = unmaskCurrency(el('editCatalogoValor').value);
    if (v > 0) el('editCatalogoValor').value = formatCurrency(v);
});

carregarTema();
iniciarListeners();
