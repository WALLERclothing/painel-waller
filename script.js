const el = (id) => document.getElementById(id);

// --- Configuração Firebase ---
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

let todosPedidos = [];
let carrinhoTemporario = [];
let catalogoEstampas = {};

// --- Utilitários ---
function formatCurrency(num) {
    return "R$ " + (parseFloat(num) || 0).toFixed(2).replace(".", ",");
}

function unmaskCurrency(value) {
    return parseFloat(value.toString().replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

// --- Funções de Aba ---
function mudarAba(aba) {
    el('aba-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
    el('aba-producao').style.display = aba === 'producao' ? 'block' : 'none';
    el('aba-estampas').style.display = aba === 'estampas' ? 'block' : 'none';
}

// --- Lógica de Pedidos ---
function adicionarAoCarrinho() {
    const item = {
        codigoEstampa: el('codigoEstampa').value.toUpperCase(),
        nomeEstampa: el('nomeEstampa').value.toUpperCase(),
        tipoPeca: el('tipoPeca').value,
        tamanho: el('tamanho').value,
        cor: el('cor').value,
        quantidade: parseInt(el('quantidade').value),
        valorUnitario: unmaskCurrency(el('valorUnitario').value)
    };
    carrinhoTemporario.push(item);
    atualizarTelaCarrinho();
}

function atualizarTelaCarrinho() {
    let total = 0;
    el('listaCarrinho').innerHTML = carrinhoTemporario.map((p, i) => {
        total += (p.quantidade * p.valorUnitario);
        return `<div>${p.quantidade}x ${p.nomeEstampa} - ${formatCurrency(p.valorUnitario)}</div>`;
    }).join('');
    el('valorTotal').value = formatCurrency(total);
}

async function salvarPedidoCompleto() {
    const pedido = {
        nome: el('nome').value.toUpperCase(),
        whatsapp: el('whatsapp').value,
        valorTotal: unmaskCurrency(el('valorTotal').value),
        itens: carrinhoTemporario,
        status: 'PEDIDO FEITO',
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
        numeroPedido: Math.floor(1000 + Math.random() * 9000).toString()
    };
    await db.collection("pedidos").add(pedido);
    alert("Pedido salvo!");
    carrinhoTemporario = [];
    atualizarTelaCarrinho();
}

// --- Renderização da Fila ---
db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot(snap => {
    todosPedidos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    aplicarFiltros();
});

function aplicarFiltros() {
    const container = el('gridPedidosContainer');
    container.innerHTML = todosPedidos.map(p => `
        <div class="pedido-card">
            <div style="padding:1rem">
                <strong>#${p.numeroPedido} - ${p.nome}</strong><br>
                Status: ${p.status}
            </div>
        </div>
    `).join('');
}