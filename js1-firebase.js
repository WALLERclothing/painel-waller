// ==========================================
// VARIÁVEIS GLOBAIS, FIREBASE E AUTENTICAÇÃO
// ==========================================
const isVitrine = window.location.search.includes('vitrine=true');
let historicoNotificacoes = [];
let filtroAniversarioAtivo = false;
let despesasGlobais = []; 
let itensEdicaoTemporario = []; 
let transacoesManuais = [];
let todosPedidos = []; 
let carrinhoTemporario = []; 
let catalogoEstampas = {}; 
let clientesCadastrados = {};
let mapaClientes = {};
let chartInstancia = null;
let chartCategoriasInstancia = null;

// Variáveis para guardar Email e Nome da pessoa logada
let currentUserEmail = ""; 
let currentUserName = ""; 

// Configuração Firebase da Waller
const firebaseConfig = { apiKey: "AIzaSyDnch84Sl5VyIi0YmOAde4jTftsssLEsNA", authDomain: "banco-de-dados-waller.firebaseapp.com", projectId: "banco-de-dados-waller", storageBucket: "banco-de-dados-waller.firebasestorage.app", messagingSenderId: "595978694752", appId: "1:595978694752:web:69aa74348560268a5a1305" };
firebase.initializeApp(firebaseConfig); 
const db = firebase.firestore();

// Verificador de Sessão (Auth) e Perfil de Usuário
firebase.auth().onAuthStateChanged(async (user) => {
    if (user || isVitrine) {
        if(user) {
            currentUserEmail = user.email;
            
            try {
                let userDoc = await db.collection("usuarios_equipe").doc(currentUserEmail).get();
                
                if (userDoc.exists && userDoc.data().apelido) {
                    currentUserName = userDoc.data().apelido;
                } else {
                    currentUserName = currentUserEmail.split('@')[0];
                }
                
                let btnPerfil = document.getElementById('btnPerfilNome');
                if(btnPerfil) btnPerfil.innerHTML = `👤 ${currentUserName.toUpperCase()}`;
                
            } catch(err) {
                console.error("Erro ao buscar perfil", err);
                currentUserName = currentUserEmail.split('@')[0];
            }
        }
        
        let overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
        
        if(todosPedidos.length === 0 && !isVitrine) {
            iniciarListenersFirestore();
        }
    } else {
        let overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'flex';
    }
});

function realizarLogin(e) {
    e.preventDefault();
    let email = document.getElementById('loginEmail').value;
    let pass = document.getElementById('loginPass').value;
    
    let btn = e.target.querySelector('button');
    let textoOriginal = btn.innerText;
    btn.innerText = "A VERIFICAR...";
    
    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            showToast("Acesso Liberado! Bem-vindo de volta.");
        })
        .catch(err => {
            showToast("Acesso Negado: E-mail ou Palavra-passe incorretos.", true);
            btn.innerText = textoOriginal;
        });
}

function fazerLogout() {
    firebase.auth().signOut().then(() => {
        window.location.reload(); 
    });
}

// ==========================================
// FUNÇÕES DO PERFIL DO USUÁRIO
// ==========================================
function abrirModalPerfil() {
    let modal = document.getElementById('modalPerfil');
    if(!modal) return;
    document.getElementById('perfilEmail').value = currentUserEmail;
    document.getElementById('perfilApelido').value = currentUserName;
    modal.style.display = 'flex';
}

function fecharModalPerfil() {
    let modal = document.getElementById('modalPerfil');
    if(modal) modal.style.display = 'none';
}

async function salvarPerfil(e) {
    e.preventDefault();
    let novoApelido = document.getElementById('perfilApelido').value.trim();
    if(!novoApelido) {
        showToast("O apelido não pode estar vazio!", true);
        return;
    }
    
    let btnSalvar = e.target.querySelector('button');
    btnSalvar.innerText = "SALVANDO...";
    btnSalvar.disabled = true;

    try {
        await db.collection("usuarios_equipe").doc(currentUserEmail).set({ 
            email: currentUserEmail, 
            apelido: novoApelido,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        currentUserName = novoApelido;
        let btnPerfil = document.getElementById('btnPerfilNome');
        if(btnPerfil) btnPerfil.innerHTML = `👤 ${currentUserName.toUpperCase()}`;
        
        showToast("Perfil atualizado! Os próximos pedidos sairão com o teu novo nome.");
        fecharModalPerfil();
    } catch(err) {
        showToast("Erro ao salvar perfil", true);
        console.error(err);
    } finally {
        btnSalvar.innerText = "💾 SALVAR PERFIL";
        btnSalvar.disabled = false;
    }
}

// Inicializa a extração de dados
function iniciarListenersFirestore() {
    if(isVitrine) return;

    db.collection("despesas").onSnapshot(snap => { 
        despesasGlobais = []; 
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; despesasGlobais.push(d); }); 
        if(typeof renderizarFluxoCaixa === 'function') renderizarFluxoCaixa(); 
    });
    
    db.collection("transacoes_manuais").onSnapshot(snap => { 
        transacoesManuais = []; 
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; transacoesManuais.push(d); }); 
        if(typeof renderizarFluxoCaixa === 'function') renderizarFluxoCaixa(); 
    });

    db.collection("clientes").onSnapshot(snap => { 
        clientesCadastrados = {}; 
        snap.forEach(doc => { clientesCadastrados[doc.id] = doc.data(); }); 
        if(typeof atualizarListasDeSugestao === 'function') atualizarListasDeSugestao(); 
        if(typeof renderizarCRM === 'function') renderizarCRM(); 
    });

    // Removido o where("apagado", "==", false) para evitar bugs com produtos antigos
    db.collection("estampas").onSnapshot(snap => { 
        catalogoEstampas = {}; 
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; catalogoEstampas[d.codigo] = d; }); 
        if(typeof renderizarCatalogo === 'function') renderizarCatalogo(); 
    });

    db.collection("pedidos").where("apagado", "==", false).onSnapshot(snap => {
        todosPedidos = []; mapaClientes = {}; let meses = new Set();
        let met = { pedMes: 0 }; let mAtual = new Date().getMonth(); let aAtual = new Date().getFullYear();
        let vendasPorMes = {}; 
        
        snap.forEach(doc => {
            let p = doc.data(); p.id = doc.id;
            p.dataCriacaoSafe = getSafeDate(p.dataCriacao); p.dataFormatada = p.dataCriacaoSafe.toLocaleDateString('pt-BR');
            p.dataMesAno = `${String(p.dataCriacaoSafe.getMonth() + 1).padStart(2, '0')}/${p.dataCriacaoSafe.getFullYear()}`;
            p.statusAtualizado = p.status || 'PEDIDO FEITO'; p.statusPagamento = p.statusPagamento || 'PENDENTE';
            todosPedidos.push(p);
            
            if(p.statusPagamento === 'PAGO') {
                meses.add(p.dataMesAno); if(!vendasPorMes[p.dataMesAno]) vendasPorMes[p.dataMesAno] = 0; vendasPorMes[p.dataMesAno] += safeNum(p.valorTotal);
            }
            if(p.dataCriacaoSafe.getMonth() === mAtual && p.dataCriacaoSafe.getFullYear() === aAtual) met.pedMes++;

            let w = p.whatsapp;
            if(w && w.length >= 10) {
                if(!mapaClientes[w]) mapaClientes[w] = { nome: p.nome, qtd: 0, totalGasto: 0, ultimaCompra: p.dataCriacaoSafe };
                mapaClientes[w].qtd++; 
                if(p.statusPagamento === 'PAGO') mapaClientes[w].totalGasto += safeNum(p.valorTotal);
                if (p.dataCriacaoSafe > mapaClientes[w].ultimaCompra) mapaClientes[w].ultimaCompra = p.dataCriacaoSafe;
            }
        });
        todosPedidos.sort((a,b) => b.dataCriacaoSafe - a.dataCriacaoSafe);
        try { document.getElementById('dashPedidosMes').innerText = met.pedMes; } catch(e){}
        if(typeof renderizarKanban === 'function') renderizarKanban();
        if(typeof atualizarDashboard === 'function') atualizarDashboard();
        if(typeof renderizarCRM === 'function') renderizarCRM();
        if(typeof atualizarSelectFaturamento === 'function') atualizarSelectFaturamento(meses);
        if(typeof renderizarGrafico === 'function') renderizarGrafico(vendasPorMes);
    });
}