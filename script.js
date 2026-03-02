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

function formatCurrency(num) {
    let value = parseFloat(num) || 0;
    return "R$ " + value.toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

function unmaskCurrency(value) {
    if (!value) return 0;
    value = value.toString().replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(value) || 0;
}

function upper(v) {
    return (v || '').toString().trim().toUpperCase();
}

function mudarAba(aba) {
    el('aba-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
    el('aba-producao').style.display = aba === 'producao' ? 'block' : 'none';
    el('aba-estampas').style.display = aba === 'estampas' ? 'block' : 'none';

    el('tabCadastroBtn').classList.toggle('tab-active', aba === 'cadastro');
    el('tabProducaoBtn').classList.toggle('tab-active', aba === 'producao');
    el('tabEstampasBtn').classList.toggle('tab-active', aba === 'estampas');

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
    if (!cod || !nom) return alert("Preencha código e nome!");

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
    if (!nome || carrinhoTemporario.length === 0) return alert("Dados incompletos!");

    await db.collection("pedidos").add({
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

    alert("Pedido Salvo!");
    carrinhoTemporario = [];
    atualizarTelaCarrinho();
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
                <p class="catalog-code">${est.codigo}</p>
                <h3>${est.nome}</h3>
                <button class="catalog-delete" onclick="db.collection('estampas').doc('${est.codigo}').delete()">Remover</button>
            </article>`;
    });
}

function filtrarCatalogo() {
    const filtro = upper(el('filtroEstampas').value);
    const filtradas = estampasCache.filter((est) => (
        est.codigo.includes(filtro) || est.nome.includes(filtro)
    ));
    renderCatalogo(filtradas);
}

// Catálogo de Estampas
const codigoEstampaInput = el('codigoEstampa');
codigoEstampaInput.addEventListener('input', preencherEstampaPorCodigo);
codigoEstampaInput.addEventListener('blur', preencherEstampaPorCodigo);

el('valorUnitario').addEventListener('blur', () => {
    const value = unmaskCurrency(el('valorUnitario').value);
    if (value > 0) el('valorUnitario').value = formatCurrency(value);
});

db.collection("estampas").orderBy("codigo").onSnapshot((snap) => {
    el('carregandoEstampas').style.display = 'none';
    estampasCache = [];

    snap.forEach((doc) => {
        const est = doc.data();
        estampasCache.push({ codigo: upper(est.codigo), nome: upper(est.nome) });
    });

    renderCatalogo();
    preencherEstampaPorCodigo();
});

function salvarNovaEstampa(e) {
    e.preventDefault();
    const cod = upper(el('cadCodigoEstampa').value);
    const nome = upper(el('cadNomeEstampa').value);
    db.collection("estampas").doc(cod).set({ codigo: cod, nome });
    e.target.reset();
}

// ... Funções de PDF e Modal seguiriam aqui conforme o seu original ...
