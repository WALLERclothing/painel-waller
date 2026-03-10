// ==========================================
// VARIÁVEIS GLOBAIS E FIREBASE
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

const firebaseConfig = { apiKey: "AIzaSyDnch84Sl5VyIi0YmOAde4jTftsssLEsNA", authDomain: "banco-de-dados-waller.firebaseapp.com", projectId: "banco-de-dados-waller", storageBucket: "banco-de-dados-waller.firebasestorage.app", messagingSenderId: "595978694752", appId: "1:595978694752:web:69aa74348560268a5a1305" };
firebase.initializeApp(firebaseConfig); 
const db = firebase.firestore();

if(!isVitrine) { 
    db.collection("despesas").onSnapshot(snap => { 
        despesasGlobais = []; 
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; despesasGlobais.push(d); }); 
        if(typeof calcularFaturamentoMensal === 'function') calcularFaturamentoMensal(); 
    }); 
    
    db.collection("transacoes_manuais").onSnapshot(snap => { 
        transacoesManuais = []; 
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; transacoesManuais.push(d); }); 
        if(document.getElementById('modalFluxoCaixa') && document.getElementById('modalFluxoCaixa').style.display === 'flex' && typeof renderizarFluxoCaixa === 'function') renderizarFluxoCaixa();
    });

    db.collection("clientes").where("apagadoCRM", "==", false).onSnapshot(snap => { 
        clientesCadastrados = {}; 
        snap.forEach(doc => clientesCadastrados[doc.id] = doc.data()); 
        if(typeof renderizarCRM === 'function') renderizarCRM(); 
        if(typeof atualizarListasDeSugestao === 'function') atualizarListasDeSugestao(); 
    }); 

    db.collection("pedidos").onSnapshot((querySnapshot) => {
        todosPedidos = []; mapaClientes = {}; let meses = new Set();
        let met = { pedMes: 0 }; let mAtual = new Date().getMonth(); let aAtual = new Date().getFullYear();
        let vendasPorMes = {}; 

        querySnapshot.forEach((doc) => {
            try {
                let p = doc.data(); if(p.apagado === true) return; 
                p.id = doc.id; 
                let s = (p.status || 'PEDIDO FEITO').toUpperCase().trim();
                if(s === 'PRONTA / ESTAMPADA') s = 'ESTAMPA PRONTA';
                p.statusAtualizado = s;
                let d = getSafeDate(p.dataCriacao); p.dataCriacaoSafe = d;
                p.dataFormatada = d.toLocaleDateString('pt-BR'); 
                p.dataMesAno = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                
                if(p.statusPagamento === 'PAGO') {
                    meses.add(p.dataMesAno); if(!vendasPorMes[p.dataMesAno]) vendasPorMes[p.dataMesAno] = 0; vendasPorMes[p.dataMesAno] += safeNum(p.valorTotal);
                }
                if(d.getMonth() === mAtual && d.getFullYear() === aAtual) met.pedMes++;
                if(p.whatsapp) {
                    if(!mapaClientes[p.whatsapp]) mapaClientes[p.whatsapp] = { nome: p.nome, totalGasto: 0, qtd: 0, ultimaCompra: d };
                    mapaClientes[p.whatsapp].qtd++;
                    if(d > mapaClientes[p.whatsapp].ultimaCompra) mapaClientes[p.whatsapp].ultimaCompra = d;
                    if(p.statusPagamento === 'PAGO') mapaClientes[p.whatsapp].totalGasto += safeNum(p.valorTotal);
                }
                todosPedidos.push(p);
            } catch (err) {}
        });

        try { todosPedidos.sort((a, b) => (b.dataCriacaoSafe ? b.dataCriacaoSafe.getTime() : 0) - (a.dataCriacaoSafe ? a.dataCriacaoSafe.getTime() : 0)); } catch(e){}
        try { document.getElementById('dashPedidosMes').innerText = met.pedMes; } catch(e){}
        try { if(typeof atualizarSelectFaturamento === 'function') atualizarSelectFaturamento(meses); } catch(e){}
        try { if(typeof renderizarCRM === 'function') renderizarCRM(); } catch(e){}
        try { if(typeof renderizarKanban === 'function') renderizarKanban(); } catch(e){}
        try { if(typeof renderizarGrafico === 'function') renderizarGrafico(vendasPorMes); } catch(e){}
    });
}

db.collection("estampas").orderBy("codigo").onSnapshot((querySnapshot) => {
    let lista = document.getElementById('listaEstampas'); if(lista) lista.innerHTML = ''; 
    let dlist = document.getElementById('estampas-list'); if(dlist) dlist.innerHTML = '';
    catalogoEstampas = {}; let setCategorias = new Set(); 

    querySnapshot.forEach((doc) => {
        let est = doc.data(); if(est.apagado === true) return; 
        let cat = est.categoria || 'CAMISETA'; setCategorias.add(cat);
        let custo = est.custo || 0; let preco = est.precoVenda || 0; let e = est.estoqueGrade || { P:0, M:0, G:0, GG:0 };
        catalogoEstampas[est.codigo] = { id: doc.id, nome: est.nome, estoque: e, categoria: cat, custo: custo, precoVenda: preco };
        
        if(!isVitrine && dlist) dlist.innerHTML += `<option value="${est.codigo}">${est.nome}</option>`;
        
        let totalEstoque = parseInt(e.P)+parseInt(e.M)+parseInt(e.G)+parseInt(e.GG); let badgeSoldOut = '';
        if (totalEstoque <= 0) badgeSoldOut = `<span class="badge-soldout" style="position:absolute; top:-12px; right:-12px; font-size:0.75rem; padding:6px 12px; background:var(--red);">🔴 ESGOTADO</span>`;
        else if (!isVitrine && totalEstoque <= 5) badgeSoldOut = `<span class="badge-soldout" style="position:absolute; top:-12px; right:-12px; font-size:0.75rem; padding:6px 12px; background:#ffb703; color:#000; border-color:#000;">🟡 ESTOQUE BAIXO (${totalEstoque})</span>`;
        
        if (isVitrine) {
            let tamsDisp = []; if(e.P > 0) tamsDisp.push('P'); if(e.M > 0) tamsDisp.push('M'); if(e.G > 0) tamsDisp.push('G'); if(e.GG > 0) tamsDisp.push('GG'); let tamsStr = tamsDisp.length > 0 ? tamsDisp.join(', ') : 'Indisponível no momento';
            if(lista) lista.innerHTML += `<div class="catalog-card">${badgeSoldOut}<div class="catalog-card-header"><div><h3 class="catalog-card-title" style="font-size:1.4rem;">${est.nome}</h3><div class="catalog-card-subtitle">${cat}</div></div><div style="text-align: right;"><div class="catalog-price" style="font-size:1.4rem;">${formatCurrency(preco)}</div></div></div><div style="margin-top: 15px; border-top:1px dashed var(--border-color); padding-top:10px;"><div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">TAMANHOS DISPONÍVEIS:</div><div style="font-weight:900; color:var(--black); font-size:1.1rem;">${tamsStr}</div></div></div>`;
        } else {
            if(lista) lista.innerHTML += `<div class="catalog-card">${badgeSoldOut}<div class="catalog-card-header"><div><h3 class="catalog-card-title">${est.nome}</h3><div class="catalog-card-subtitle">[${est.codigo}] • ${cat}</div></div><div style="text-align: right;"><div class="catalog-price">${formatCurrency(preco)}</div><div class="catalog-cost">Custo: ${formatCurrency(custo)}</div></div></div><div style="margin-top: 5px;"><div style="font-size: 0.75rem; font-weight: 800; color: var(--red); margin-bottom: 5px; text-transform: uppercase;">AJUSTE RÁPIDO:</div><div class="grade-tamanhos"><div class="grade-box">P <input type="number" value="${e.P || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'P', this.value)"></div><div class="grade-box">M <input type="number" value="${e.M || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'M', this.value)"></div><div class="grade-box">G <input type="number" value="${e.G || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'G', this.value)"></div><div class="grade-box">GG<input type="number" value="${e.GG || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'GG', this.value)"></div></div></div><div class="crm-actions" style="margin-top: 15px;"><button onclick="prepararEdicaoEstampa('${est.codigo}')" style="flex: 1;">✏️ EDITAR PRODUTO</button><button onclick="excluirEstampa('${doc.id}')" style="color:var(--red); flex: 0.3;">❌</button></div></div>`;
        }
    });
    let dCatBD = document.getElementById('listaCategoriasBD');
    if(!isVitrine && dCatBD) { dCatBD.innerHTML = Array.from(setCategorias).map(c => `<option value="${c}">`).join(''); }
});