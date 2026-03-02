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

// Formatações
function formatCurrency(num) {
    let value = parseFloat(num) || 0;
    return "R$ " + value.toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

function unmaskCurrency(value) {
    if (!value) return 0;
    value = value.toString().replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(value) || 0;
}

// Troca de Abas
function mudarAba(aba) {
    el('aba-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
    el('aba-producao').style.display = aba === 'producao' ? 'block' : 'none';
    el('aba-estampas').style.display = aba === 'estampas' ? 'block' : 'none';
    
    el('tabCadastroBtn').classList.toggle('tab-active', aba === 'cadastro');
    el('tabProducaoBtn').classList.toggle('tab-active', aba === 'producao');
    el('tabEstampasBtn').classList.toggle('tab-active', aba === 'estampas');
    
    el('btnGerarPDF').style.display = aba === 'producao' ? 'block' : 'none';
}

// Carrinho Temporário
let carrinhoTemporario = [];
function adicionarAoCarrinho() {
    const cod = el('codigoEstampa').value.toUpperCase().trim();
    const nom = el('nomeEstampa').value.toUpperCase().trim();
    if(!cod || !nom) return alert("Preencha código e nome!");

    carrinhoTemporario.push({
        codigoEstampa: cod, nomeEstampa: nom, 
        tipoPeca: el('tipoPeca').value, tamanho: el('tamanho').value, 
        cor: el('cor').value, quantidade: parseInt(el('quantidade').value), 
        valorUnitario: unmaskCurrency(el('valorUnitario').value)
    });
    atualizarTelaCarrinho();
    el('codigoEstampa').value = ''; el('nomeEstampa').value = ''; el('codigoEstampa').focus();
}

function atualizarTelaCarrinho() {
    let soma = 0; el('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p, i) => {
        soma += (p.quantidade * p.valorUnitario);
        el('listaCarrinho').innerHTML += `<div style="padding:5px; border-bottom:1px solid #ccc;">${p.quantidade}x ${p.tipoPeca} [${p.codigoEstampa}] - ${formatCurrency(p.valorUnitario)}</div>`;
    });
    el('valorTotal').value = formatCurrency(soma);
}

async function salvarPedidoCompleto() {
    let nome = el('nome').value.toUpperCase();
    if(!nome || carrinhoTemporario.length === 0) return alert("Dados incompletos!");

    await db.collection("pedidos").add({
        numeroPedido: Math.floor(1000 + Math.random() * 9000).toString(),
        nome: nome, whatsapp: el('whatsapp').value,
        valorTotal: unmaskCurrency(el('valorTotal').value),
        metodoPagamento: el('metodoPagamento').value,
        statusPagamento: el('statusPagamento').value,
        itens: carrinhoTemporario, status: 'PEDIDO FEITO',
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Pedido Salvo!");
    carrinhoTemporario = []; atualizarTelaCarrinho();
}

// Catálogo de Estampas
db.collection("estampas").orderBy("codigo").onSnapshot(snap => {
    el('carregandoEstampas').style.display = 'none'; el('listaEstampas').innerHTML = '';
    snap.forEach(doc => {
        let est = doc.data();
        el('listaEstampas').innerHTML += `<tr><td><strong>${est.codigo}</strong></td><td>${est.nome}</td><td><button onclick="db.collection('estampas').doc('${doc.id}').delete()">X</button></td></tr>`;
    });
});

function salvarNovaEstampa(e) {
    e.preventDefault();
    let cod = el('cadCodigoEstampa').value.toUpperCase();
    db.collection("estampas").doc(cod).set({ codigo: cod, nome: el('cadNomeEstampa').value.toUpperCase() });
}

// ... Funções de PDF e Modal seguiriam aqui conforme o seu original ...
