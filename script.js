// ==========================================
// ATALHOS DE TECLADO E THEME
// ==========================================
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); mudarAba('cadastro'); }
    if (e.altKey && e.key.toLowerCase() === 'c') { e.preventDefault(); mudarAba('clientes'); }
    if (e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); mudarAba('producao'); }
    if (e.altKey && e.key.toLowerCase() === 'e') { e.preventDefault(); mudarAba('estampas'); }
});

function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light'); }
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    localStorage.setItem('waller_theme', isDark ? 'light' : 'dark');
    applyTheme(isDark ? 'light' : 'dark');
}
applyTheme(localStorage.getItem('waller_theme') || 'light');

function showToast(msg, isError = false) {
    let toast = document.createElement('div');
    toast.className = 'brutal-toast';
    toast.style.borderColor = isError ? 'var(--red)' : 'var(--green)';
    toast.style.color = isError ? 'var(--red)' : 'var(--green)';
    toast.innerText = msg;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ==========================================
// UTILITÁRIOS E FRETE
// ==========================================
function unmaskCurrency(value) {
    if (!value) return 0; if (typeof value === 'number') return value;
    return parseFloat(value.toString().replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}
function formatCurrency(num) { return "R$ " + (parseFloat(num) || 0).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); }

document.addEventListener('input', function(e) {
    if(e.target.classList.contains('moeda') && !e.target.readOnly) {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") { e.target.value = ""; return; }
        e.target.value = "R$ " + (parseInt(value) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    }
});

function aplicarMascaraEPular(e) {
    let v = e.target.value.replace(/\D/g, ''); 
    if(v.length <= 2) e.target.value = v; 
    else if(v.length <= 6) e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`; 
    else if(v.length <= 10) e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`; 
    else e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`;
    if (e.target.value.length === 15) { 
        if(e.target.id === 'whatsapp') document.getElementById('nome').focus(); 
    }
}

function aplicarMascaraCepEPular(e) {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 5) e.target.value = v.slice(0, 5) + '-' + v.slice(5, 8);
    else e.target.value = v;
    if (v.length === 8) { buscarCEP(v); document.getElementById('numeroEnd').focus(); }
}

async function buscarCEP(cep) {
    let cleanCep = cep.replace(/\D/g, '');
    if(cleanCep.length === 8) {
        try {
            let res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            let data = await res.json();
            if(!data.erro) {
                document.getElementById('endereco').value = `${data.logradouro}, Bairro: ${data.bairro} - ${data.localidade}/${data.uf}`;
                const tabelaFrete = { 'SP': 15.00, 'RJ': 20.00, 'MG': 20.00, 'ES': 20.00, 'PR': 25.00, 'SC': 25.00, 'RS': 25.00, 'DF': 25.00, 'GO': 25.00, 'MT': 30.00, 'MS': 30.00 };
                document.getElementById('valorFrete').value = formatCurrency(tabelaFrete[data.uf] || 35.00);
                atualizarTelaCarrinho(); 
                showToast("CEP Encontrado!", false);
            } else { showToast("CEP Inválido", true); }
        } catch(e) { showToast("Erro ao buscar CEP", true); }
    }
}

function mudarAba(aba) {
    ['cadastro', 'producao', 'estampas', 'clientes'].forEach(a => document.getElementById('aba-' + a).style.display = a === aba ? 'block' : 'none');
    ['Cadastro', 'Producao', 'Estampas', 'Clientes'].forEach(a => document.getElementById('tab' + a + 'Btn').classList.toggle('tab-active', a.toLowerCase() === aba));
}

function toggleItens(id) {
    let lista = document.getElementById('itens-' + id);
    let seta = document.getElementById('seta-' + id);
    if(lista.style.display === 'none') { lista.style.display = 'flex'; seta.innerHTML = '▲'; } 
    else { lista.style.display = 'none'; seta.innerHTML = '▼'; }
}

function toggleGrafico() {
    let cont = document.getElementById('container-grafico');
    let seta = document.getElementById('seta-grafico');
    if(cont.style.display === 'none') { cont.style.display = 'block'; seta.innerText = '▲'; } 
    else { cont.style.display = 'none'; seta.innerText = '▼'; }
}

// ==========================================
// FIREBASE INIT
// ==========================================
const firebaseConfig = { apiKey: "AIzaSyDnch84Sl5VyIi0YmOAde4jTftsssLEsNA", authDomain: "banco-de-dados-waller.firebaseapp.com", projectId: "banco-de-dados-waller", storageBucket: "banco-de-dados-waller.firebasestorage.app", messagingSenderId: "595978694752", appId: "1:595978694752:web:69aa74348560268a5a1305" };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// CATÁLOGO: GRADE DE CARDS E ESTOQUE
// ==========================================
let catalogoEstampas = {}; 
db.collection("estampas").orderBy("codigo").onSnapshot((querySnapshot) => {
    document.getElementById('listaEstampas').innerHTML = '';
    let datalist = document.getElementById('estampas-list'); datalist.innerHTML = '';
    catalogoEstampas = {}; 
    
    querySnapshot.forEach((doc) => {
        let est = doc.data(); 
        if(est.apagado === true) return; 

        let cat = est.categoria || 'CAMISETA';
        let custo = est.custo || 0;
        let preco = est.precoVenda || 0;
        let e = est.estoqueGrade || { P:0, M:0, G:0, GG:0 };
        
        catalogoEstampas[est.codigo] = { nome: est.nome, estoque: e, categoria: cat, custo: custo, precoVenda: preco };
        datalist.innerHTML += `<option value="${est.codigo}">${est.nome}</option>`;
        
        let totalEstoque = parseInt(e.P)+parseInt(e.M)+parseInt(e.G)+parseInt(e.GG);
        let badgeSoldOut = totalEstoque <= 0 ? `<span class="badge-soldout" style="position:absolute; top: -12px; right: -12px; font-size: 0.8rem; padding: 6px 12px;">SOLD OUT</span>` : '';
        
        // CONSTRUÇÃO DO CARD DE CATÁLOGO
        document.getElementById('listaEstampas').innerHTML += `
        <div class="catalog-card">
            ${badgeSoldOut}
            <div class="catalog-card-header">
                <div>
                    <h3 class="catalog-card-title">${est.nome}</h3>
                    <div class="catalog-card-subtitle">[${est.codigo}] • ${cat}</div>
                </div>
                <div style="text-align: right;">
                    <div class="catalog-price">${formatCurrency(preco)}</div>
                    <div class="catalog-cost">Custo: ${formatCurrency(custo)}</div>
                </div>
            </div>

            <div style="margin-top: 5px;">
                <div style="font-size: 0.75rem; font-weight: 800; color: var(--red); margin-bottom: 5px; text-transform: uppercase;">AJUSTE RÁPIDO DE ESTOQUE:</div>
                <div class="grade-tamanhos">
                    <div class="grade-box">P <input type="number" value="${e.P || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'P', this.value)"></div>
                    <div class="grade-box">M <input type="number" value="${e.M || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'M', this.value)"></div>
                    <div class="grade-box">G <input type="number" value="${e.G || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'G', this.value)"></div>
                    <div class="grade-box">GG<input type="number" value="${e.GG || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'GG', this.value)"></div>
                </div>
            </div>

            <div class="crm-actions" style="margin-top: 15px;">
                <button onclick="prepararEdicaoEstampa('${est.codigo}')" style="flex: 1;">✏️ EDITAR PRODUTO</button>
                <button onclick="excluirEstampa('${doc.id}')" style="color:var(--red); flex: 0.3;">❌</button>
            </div>
        </div>`;
    });
});

function atualizarEstoqueGrade(id, tamanho, valorStr) {
    let valor = parseInt(valorStr) || 0;
    let campo = "estoqueGrade." + tamanho;
    db.collection("estampas").doc(id).update({ [campo]: valor });
}

function autocompletarEstampa(val) {
    let code = val.toUpperCase().trim();
    if(catalogoEstampas[code]) { 
        document.getElementById('nomeEstampa').value = catalogoEstampas[code].nome;
        document.getElementById('valorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda);
    }
}

function abrirModalEstampa() { document.getElementById('modalEstampa').style.display = 'flex'; }
function fecharModalEstampa() {
    document.getElementById('modalEstampa').style.display = 'none';
    document.getElementById('cadCodigoEstampa').value = ''; document.getElementById('cadCodigoEstampa').disabled = false;
    document.getElementById('cadNomeEstampa').value = ''; 
    document.getElementById('estP').value = '0'; document.getElementById('estM').value = '0'; document.getElementById('estG').value = '0'; document.getElementById('estGG').value = '0';
    document.getElementById('cadCusto').value = ''; document.getElementById('cadPreco').value = '';
    document.getElementById('cadCategoriaEstampa').value = 'CAMISETA'; document.getElementById('editEstampaCodigoOriginal').value = '';
    document.getElementById('tituloModalEstampa').innerText = 'CADASTRAR PRODUTO'; document.getElementById('btnSalvarEstampa').innerText = 'SALVAR PRODUTO';
}

function prepararEdicaoEstampa(cod) {
    let p = catalogoEstampas[cod];
    document.getElementById('cadCodigoEstampa').value = cod; document.getElementById('cadCodigoEstampa').disabled = true;
    document.getElementById('cadNomeEstampa').value = p.nome; 
    
    document.getElementById('estP').value = p.estoque.P || 0; document.getElementById('estM').value = p.estoque.M || 0;
    document.getElementById('estG').value = p.estoque.G || 0; document.getElementById('estGG').value = p.estoque.GG || 0;
    
    document.getElementById('cadCusto').value = formatCurrency(p.custo); document.getElementById('cadPreco').value = formatCurrency(p.precoVenda);
    document.getElementById('cadCategoriaEstampa').value = p.categoria || 'CAMISETA'; document.getElementById('editEstampaCodigoOriginal').value = cod;
    
    document.getElementById('tituloModalEstampa').innerText = 'EDITAR PRODUTO: ' + cod;
    document.getElementById('btnSalvarEstampa').innerText = 'ATUALIZAR PRODUTO';
    abrirModalEstampa();
}

function salvarNovaEstampa(e) {
    e.preventDefault();
    let cod = document.getElementById('cadCodigoEstampa').value.toUpperCase().trim();
    let nom = document.getElementById('cadNomeEstampa').value.toUpperCase().trim();
    let cat = document.getElementById('cadCategoriaEstampa').value;
    
    let grade = {
        P: parseInt(document.getElementById('estP').value) || 0, 
        M: parseInt(document.getElementById('estM').value) || 0,
        G: parseInt(document.getElementById('estG').value) || 0, 
        GG: parseInt(document.getElementById('estGG').value) || 0
    };
    
    let custo = unmaskCurrency(document.getElementById('cadCusto').value);
    let preco = unmaskCurrency(document.getElementById('cadPreco').value);
    let docId = document.getElementById('editEstampaCodigoOriginal').value || cod;

    db.collection("estampas").doc(docId).set({ 
        codigo: docId, nome: nom, categoria: cat, estoqueGrade: grade, custo: custo, precoVenda: preco, apagado: false 
    }, { merge: true }).then(() => { fecharModalEstampa(); showToast("Produto Salvo!"); });
}

function excluirEstampa(id) { if(confirm(`Mandar estampa para a lixeira?`)) db.collection("estampas").doc(id).update({ apagado: true }); }

// ==========================================
// CRM: EXCLUSÃO REAL-TIME E NOVO CLIENTE
// ==========================================
let clientesCadastrados = {};
db.collection("clientes").onSnapshot(snap => {
    clientesCadastrados = {};
    snap.forEach(doc => clientesCadastrados[doc.id] = doc.data());
    if(Object.keys(mapaClientes).length > 0) renderizarCRM();
});

let mapaClientes = {}; 
function verificarClienteFiel() {
    let w = document.getElementById('whatsapp').value.trim();
    if(w.length > 10 && (mapaClientes[w] || clientesCadastrados[w])) { 
        document.getElementById('alertaClienteFiel').style.display = 'inline-block'; 
        if(clientesCadastrados[w] && !document.getElementById('nome').value) {
             document.getElementById('nome').value = clientesCadastrados[w].nome || '';
             document.getElementById('cep').value = clientesCadastrados[w].cep || '';
             document.getElementById('endereco').value = clientesCadastrados[w].endereco || '';
             document.getElementById('complementoEnd').value = clientesCadastrados[w].complemento || '';
        }
    } else { document.getElementById('alertaClienteFiel').style.display = 'none'; }
}

function abrirFichaNova() {
    document.getElementById('fichaWhatsapp').value = ''; document.getElementById('fichaWhatsapp').disabled = false;
    document.getElementById('fichaNome').value = ''; document.getElementById('fichaInsta').value = '';
    document.getElementById('fichaDataNasc').value = ''; document.getElementById('fichaCEP').value = '';
    document.getElementById('fichaEndereco').value = ''; document.getElementById('fichaComplemento').value = '';
    document.getElementById('fichaObs').value = ''; document.getElementById('fichaTag').value = 'NORMAL';
    document.getElementById('fichaQtdPedidos').innerText = '0'; document.getElementById('fichaTotalGasto').innerText = 'R$ 0,00';
    document.getElementById('modalFichaCliente').style.display = 'flex';
}

function abrirFichaCliente(whatsapp) {
    let dadosCompra = mapaClientes[whatsapp] || { qtd: 0, totalGasto: 0 };
    let perfil = clientesCadastrados[whatsapp] || {};

    document.getElementById('fichaWhatsapp').value = whatsapp; document.getElementById('fichaWhatsapp').disabled = true;
    document.getElementById('fichaNome').value = perfil.nome || dadosCompra.nome || '';
    document.getElementById('fichaInsta').value = perfil.insta || '';
    document.getElementById('fichaDataNasc').value = perfil.dataNasc || '';
    document.getElementById('fichaCEP').value = perfil.cep || dadosCompra.cep || '';
    document.getElementById('fichaEndereco').value = perfil.endereco || dadosCompra.endereco || '';
    document.getElementById('fichaComplemento').value = perfil.complemento || '';
    document.getElementById('fichaObs').value = perfil.obs || '';
    document.getElementById('fichaTag').value = perfil.tag || 'NORMAL';
    
    document.getElementById('fichaQtdPedidos').innerText = dadosCompra.qtd;
    document.getElementById('fichaTotalGasto').innerText = formatCurrency(dadosCompra.totalGasto);
    
    document.getElementById('modalFichaCliente').style.display = 'flex';
}

function fecharFichaCliente() { document.getElementById('modalFichaCliente').style.display = 'none'; }

function salvarFichaCliente() {
    let w = document.getElementById('fichaWhatsapp').value;
    if(!w || w.length < 10) { showToast("Digite um Whatsapp Válido", true); return; }
    
    db.collection("clientes").doc(w).set({
        whatsapp: w, nome: document.getElementById('fichaNome').value.toUpperCase(),
        insta: document.getElementById('fichaInsta').value, dataNasc: document.getElementById('fichaDataNasc').value,
        cep: document.getElementById('fichaCEP').value, endereco: document.getElementById('fichaEndereco').value,
        complemento: document.getElementById('fichaComplemento').value, tag: document.getElementById('fichaTag').value,
        obs: document.getElementById('fichaObs').value, apagadoCRM: false
    }, {merge: true}).then(() => { showToast("Ficha Salva!"); fecharFichaCliente(); });
}

function excluirFichaCliente(whatsapp) {
    if(confirm(`Ocultar a ficha de ${whatsapp} da tela de CRM?`)) {
        db.collection("clientes").doc(whatsapp).set({ apagadoCRM: true }, { merge: true }).then(() => {
            showToast("Cliente removido do CRM!");
            renderizarCRM(); 
        });
    }
}

// ==========================================
// LANÇAMENTO DE PEDIDO E BAIXA DE ESTOQUE
// ==========================================
let todosPedidos = []; let carrinhoTemporario = []; 

function adicionarAoCarrinho() {
    const cod = document.getElementById('codigoEstampa').value.toUpperCase().trim();
    const nom = document.getElementById('nomeEstampa').value.toUpperCase().trim();
    const tip = document.getElementById('tipoPeca').value;
    const tam = document.getElementById('tamanho').value; // P, M, G, GG
    const cor = document.getElementById('cor').value;
    const val = unmaskCurrency(document.getElementById('valorUnitario').value);
    const qtd = parseInt(document.getElementById('quantidade').value) || 1;

    if(!cod || !nom) { showToast("Preencha código e nome!", true); return; }
    
    if(catalogoEstampas[cod]) {
        let estDisponivel = catalogoEstampas[cod].estoque[tam] || 0;
        if(estDisponivel < qtd) showToast(`Aviso: Estoque baixo para o tamanho ${tam}!`, true); 
    }

    const custoProduto = catalogoEstampas[cod] ? catalogoEstampas[cod].custo : 0;

    carrinhoTemporario.push({ 
        codigoEstampa: cod, nomeEstampa: nom, tipoPeca: tip, tamanho: tam, cor: cor, 
        quantidade: qtd, valorUnitario: val, custoUnitario: custoProduto 
    });
    
    atualizarTelaCarrinho();
    document.getElementById('codigoEstampa').value = ''; document.getElementById('nomeEstampa').value = ''; document.getElementById('codigoEstampa').focus();
}

function removerDoCarrinho(i) { carrinhoTemporario.splice(i, 1); atualizarTelaCarrinho(); }

function atualizarTelaCarrinho() {
    let somaProdutos = 0; document.getElementById('listaCarrinho').innerHTML = '';
    
    carrinhoTemporario.forEach((p, i) => {
        somaProdutos += (p.quantidade * p.valorUnitario);
        document.getElementById('listaCarrinho').innerHTML += `<div class="carrinho-item"><span><strong>${p.quantidade}x</strong> ${p.tipoPeca} (${p.tamanho}) - [${p.codigoEstampa}]</span><div><span style="color:var(--red); font-weight:900;">${formatCurrency(p.valorUnitario)}</span> <button class="btn-remove-item" onclick="removerDoCarrinho(${i})">X</button></div></div>`;
    });
    
    let freteCobrado = unmaskCurrency(document.getElementById('valorFrete').value);
    let desconto = unmaskCurrency(document.getElementById('valorDesconto').value);
    document.getElementById('valorTotal').value = formatCurrency(somaProdutos + freteCobrado - desconto);
    document.getElementById('carrinho-container').style.display = carrinhoTemporario.length === 0 ? 'none' : 'block'; 
}

async function salvarPedidoCompleto() {
    let nome = document.getElementById('nome').value.toUpperCase();
    let whatsapp = document.getElementById('whatsapp').value;
    let origem = document.getElementById('origemVenda').value;
    let cep = document.getElementById('cep').value;
    let end = document.getElementById('endereco').value + ", " + document.getElementById('numeroEnd').value;
    let compl = document.getElementById('complementoEnd').value;
    
    let freteCobrado = unmaskCurrency(document.getElementById('valorFrete').value);
    let freteRealInput = unmaskCurrency(document.getElementById('valorFreteReal').value);
    let embalagem = unmaskCurrency(document.getElementById('custoEmbalagem').value);
    let desconto = unmaskCurrency(document.getElementById('valorDesconto').value);
    let totalCobrado = unmaskCurrency(document.getElementById('valorTotal').value);

    if(!nome || !whatsapp || carrinhoTemporario.length===0) { showToast("Preencha Nome, Whats e 1 Peça!", true); return; }

    let somaCustoPecas = 0; let somaVendaPecas = 0;
    carrinhoTemporario.forEach(item => { 
        somaCustoPecas += (item.custoUnitario * item.quantidade);
        somaVendaPecas += (item.valorUnitario * item.quantidade);
    });
    
    let freteRealCalculo = freteRealInput > 0 ? freteRealInput : freteCobrado;
    let prejuizoFrete = freteRealCalculo > freteCobrado ? (freteRealCalculo - freteCobrado) : 0;
    let lucroSobraFrete = freteCobrado > freteRealCalculo ? (freteCobrado - freteRealCalculo) : 0;
    let lucroCalculado = (somaVendaPecas - somaCustoPecas) - desconto - embalagem - prejuizoFrete + lucroSobraFrete;

    document.getElementById('btnGerarOrdem').innerText = "SALVANDO...";
    let numGerado = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        await db.collection("pedidos").add({
            numeroPedido: numGerado, nome: nome, whatsapp: whatsapp, origemVenda: origem, cep: cep, endereco: end, complemento: compl,
            valorFrete: freteCobrado, valorFreteReal: freteRealInput, custoEmbalagem: embalagem, valorDesconto: desconto, valorTotal: totalCobrado, 
            custoTotalPedido: somaCustoPecas, lucroTotalPedido: lucroCalculado, apagado: false,
            metodoPagamento: document.getElementById('metodoPagamento').value, statusPagamento: document.getElementById('statusPagamento').value,
            itens: carrinhoTemporario, status: 'PEDIDO FEITO', dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        db.collection("clientes").doc(whatsapp).set({ 
            whatsapp: whatsapp, nome: nome, cep: cep, endereco: end, complemento: compl, apagadoCRM: false 
        }, { merge: true });
        
        carrinhoTemporario.forEach(item => {
            if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) {
                let campoTamanho = "estoqueGrade." + item.tamanho;
                db.collection("estampas").doc(item.codigoEstampa).update({ [campoTamanho]: firebase.firestore.FieldValue.increment(-item.quantidade) });
            }
        });

        document.getElementById('nome').value = ''; document.getElementById('whatsapp').value = ''; document.getElementById('cep').value=''; document.getElementById('endereco').value=''; document.getElementById('numeroEnd').value=''; document.getElementById('complementoEnd').value=''; document.getElementById('valorFrete').value=''; document.getElementById('valorFreteReal').value=''; document.getElementById('valorDesconto').value=''; document.getElementById('valorTotal').value=''; document.getElementById('alertaClienteFiel').style.display = 'none';
        carrinhoTemporario = []; atualizarTelaCarrinho(); document.getElementById('btnGerarOrdem').innerText = "GERAR ORDEM DE SERVIÇO"; showToast(`PEDIDO #${numGerado} SALVO!`);
    } catch (e) { showToast("Erro ao salvar", true); }
}

// ==========================================
// KANBAN E DASHBOARD FINANCEIRO
// ==========================================
let chartInstancia = null; 

db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot((querySnapshot) => {
    todosPedidos = []; mapaClientes = {}; let freqEstampas = {}; let meses = new Set();
    let met = { pedMes: 0 }; let mAtual = new Date().getMonth(); let aAtual = new Date().getFullYear();

    let vendasPorMes = {}; 

    querySnapshot.forEach((doc) => {
        let p = doc.data(); 
        
        if(p.apagado === true) return; 

        p.id = doc.id; 
        p.statusAtualizado = (p.status || 'PEDIDO FEITO').toUpperCase();
        if(p.statusAtualizado === 'PRONTA / ESTAMPADA') p.statusAtualizado = 'ESTAMPA PRONTA';
        
        let d = p.dataCriacao ? p.dataCriacao.toDate() : new Date();
        p.dataFormatada = d.toLocaleDateString('pt-BR'); p.dataMesAno = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        
        if(p.statusPagamento === 'PAGO') {
            meses.add(p.dataMesAno);
            if(!vendasPorMes[p.dataMesAno]) vendasPorMes[p.dataMesAno] = 0;
            vendasPorMes[p.dataMesAno] += parseFloat(p.valorTotal || 0);
            
            if(p.itens) { p.itens.forEach(i => { if(i.codigoEstampa) freqEstampas[i.nomeEstampa] = (freqEstampas[i.nomeEstampa]||0) + parseInt(i.quantidade); }); }
        }
        
        if(d.getMonth() === mAtual && d.getFullYear() === aAtual) met.pedMes++;

        if(p.whatsapp) {
            if(!mapaClientes[p.whatsapp]) mapaClientes[p.whatsapp] = { nome: p.nome, totalGasto: 0, qtd: 0, ultimaCompra: d };
            mapaClientes[p.whatsapp].qtd++;
            if(d > mapaClientes[p.whatsapp].ultimaCompra) mapaClientes[p.whatsapp].ultimaCompra = d;
            if(p.statusPagamento === 'PAGO') mapaClientes[p.whatsapp].totalGasto += parseFloat(p.valorTotal||0);
        }

        todosPedidos.push(p);
    });

    document.getElementById('dashPedidosMes').innerText = met.pedMes;
    atualizarSelectFaturamento(meses);
    renderizarCRM();
    renderizarBestSellers(freqEstampas);
    renderizarKanban(); 
    renderizarGrafico(vendasPorMes);
});

function renderizarGrafico(vendas) {
    const canvas = document.getElementById('graficoVendas');
    if(!canvas) return; 
    let labels = Object.keys(vendas).sort((a,b) => { let [mA,aA]=a.split('/'); let [mB,aB]=b.split('/'); return new Date(aA,mA-1)-new Date(aB,mB-1); }).slice(-6);
    let dados = labels.map(mes => vendas[mes]);

    const ctx = canvas.getContext('2d');
    if (chartInstancia) chartInstancia.destroy(); 
    chartInstancia = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Faturamento Bruto (R$)', data: dados, backgroundColor: '#2a9d8f', borderColor: '#111111', borderWidth: 2, tension: 0.1, fill: true }] },
        options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
}

function renderizarBestSellers(freq) {
    let sortable = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0,5); 
    let elDash = document.getElementById('dashBestSellers');
    if(elDash) elDash.innerHTML = sortable.length ? sortable.map((x, i) => `<div>${i+1}. ${x[0]} <span style="color:var(--red);">(${x[1]}x)</span></div>`).join('') : 'Sem vendas';
    let elCat = document.getElementById('dashBestSellersList');
    if(elCat) elCat.innerHTML = sortable.length ? sortable.map(x => `${x[0]} (${x[1]})`).join(' | ') : 'Sem histórico';
}

function renderizarCRM() {
    let combinados = {};
    Object.keys(mapaClientes).forEach(w => combinados[w] = { ...mapaClientes[w] });
    Object.keys(clientesCadastrados).forEach(w => {
        if(!combinados[w]) combinados[w] = { nome: clientesCadastrados[w].nome, qtd: 0, totalGasto: 0, ultimaCompra: null };
        combinados[w].nome = clientesCadastrados[w].nome || combinados[w].nome;
    });

    let mAtualNiver = String(new Date().getMonth() + 1).padStart(2, '0');

    let crmList = Object.entries(combinados)
        .filter(c => {
            let dc = clientesCadastrados[c[0]];
            return !dc || dc.apagadoCRM !== true; 
        })
        .sort((a,b) => b[1].totalGasto - a[1].totalGasto);
    
    document.getElementById('listaClientesCRM').innerHTML = crmList.map((c, index) => {
        let zapLimpo = c[0].replace(/\D/g,'');
        let dataUc = c[1].ultimaCompra ? c[1].ultimaCompra.toLocaleDateString('pt-BR') : 'Sem dados';
        let tktMedio = c[1].qtd > 0 ? (c[1].totalGasto / c[1].qtd) : 0;
        
        let perfilCadastrado = clientesCadastrados[c[0]] || {};
        let tagHtml = '';
        if(perfilCadastrado.tag && perfilCadastrado.tag !== 'NORMAL') tagHtml = `<span class="badge-vip" style="background:#111; color:#fff;">${perfilCadastrado.tag}</span>`;
        
        let medalha = '';
        if(index === 0) medalha = '🥇 '; else if(index === 1) medalha = '🥈 '; else if(index === 2) medalha = '🥉 ';

        let badgeNiver = '';
        if(perfilCadastrado.dataNasc && perfilCadastrado.dataNasc.length === 5) {
            let mesNasc = perfilCadastrado.dataNasc.split('/')[1];
            if(mesNasc === mAtualNiver) badgeNiver = `<span class="tag-niver">🎂 NIVER MÊS</span>`;
        }
        
        let diasSumido = c[1].ultimaCompra ? Math.floor((new Date() - c[1].ultimaCompra) / (1000 * 60 * 60 * 24)) : 0;
        let classeSumido = diasSumido > 90 ? 'sumido' : '';
        let badgeSumido = diasSumido > 90 ? `<span class="badge-soldout">SUMIDO (${diasSumido}d)</span>` : '';
        
        return `
        <div class="crm-card ${classeSumido}">
            <h3 class="crm-card-title">${medalha}${c[1].nome}</h3>
            <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:5px;">${tagHtml} ${badgeNiver} ${badgeSumido}</div>
            <div class="crm-card-subtitle">${c[0]}</div>
            
            <div class="crm-stats">
                <span>Pedidos: <span style="color:var(--red);">${c[1].qtd}</span></span>
                <span>T. Médio: <span>${formatCurrency(tktMedio)}</span></span>
            </div>
            
            <div style="font-size: 0.8rem; margin: 10px 0;">
                <div><strong>Última Compra:</strong> ${dataUc}</div>
                <div><strong style="color:var(--green);">Total Gasto:</strong> ${formatCurrency(c[1].totalGasto)}</div>
            </div>
            
            <div class="crm-actions">
                <button onclick="abrirFichaCliente('${c[0]}')">👤 FICHA</button>
                <a href="https://wa.me/55${zapLimpo}" target="_blank">💬 CHAT</a>
                <button onclick="excluirFichaCliente('${c[0]}')" style="color: var(--red); flex: 0.3;">X</button>
            </div>
        </div>`;
    }).join('');
}

function renderizarKanban() {
    let cols = { 'PEDIDO FEITO':'', 'AGUARDANDO ESTAMPA':'', 'ESTAMPA PRONTA':'', 'PEDIDO ENVIADO':'' };
    
    todosPedidos.forEach(p => {
        if(cols[p.statusAtualizado] === undefined) return; 
        
        let btnPgto = p.statusPagamento === 'PAGO' ? `<button class="btn-pgto pgto-pago" onclick="trocarPgto('${p.id}','PENDENTE')">💰 PAGO</button>` : `<button class="btn-pgto pgto-pendente" onclick="trocarPgto('${p.id}','PAGO')">⏳ PEND</button>`;
        let itensHtml = p.itens.map(i => `<div class="item-tag-compacto"><div class="item-tag-topo"><span>${i.quantidade}x ${i.tipoPeca}</span></div><div style="font-weight:700; color:var(--text-muted); font-size:0.7rem;">Tam: ${i.tamanho} | Cor: ${i.cor}</div><div style="color:var(--red); font-weight:900; font-size:0.75rem;">[${i.codigoEstampa}] ${i.nomeEstampa}</div></div>`).join('');
        
        let cardHtml = `
        <div class="pedido-card" id="${p.id}" draggable="true" ondragstart="drag(event)">
            <div class="pedido-header">
                <div class="header-linha-1">
                    <div class="id-container">
                        <input type="checkbox" class="checkbox-bulk" value="${p.id}" onchange="checkBulk()">
                        <span class="pedido-id">#${p.numeroPedido}</span>
                    </div>
                    <span class="pedido-data">${p.dataFormatada}</span>
                </div>
                ${btnPgto}
            </div>
            <div class="pedido-body">
                <div class="cliente-nome">${p.nome} <br><span style="font-size:0.7rem; color:var(--text-muted); font-weight:500;">${p.whatsapp}</span></div>
                <div class="cliente-financas">${formatCurrency(p.valorTotal)} - ${p.metodoPagamento||'PIX'}</div>
                <div class="toggle-itens-btn" onclick="toggleItens('${p.id}')"><span>📦 PEÇAS (${p.itens.length})</span><span id="seta-${p.id}">▼</span></div>
                <div class="pedido-itens-lista" id="itens-${p.id}">${itensHtml}</div>
            </div>
            <div class="pedido-footer">
                <button onclick="enviarMensagemStatus('${p.id}')" title="Avisar cliente no WhatsApp" style="color:var(--green); flex: 0.6;">💬 AVISAR</button>
                <button onclick="abrirModalEdicao('${p.id}')" title="Editar">✏️</button>
                <button onclick="excluirPedido('${p.id}')" title="Lixeira" style="color:var(--red); flex: 0.3;">❌</button>
            </div>
        </div>`;
        cols[p.statusAtualizado] += cardHtml;
    });

    Object.keys(cols).forEach(k => {
        let el = document.getElementById('col-' + k.replace(/ /g,'-'));
        if(el) el.innerHTML = cols[k];
    });
}

function filtrarKanban() {
    let termo = document.getElementById('inputBusca').value.toUpperCase();
    document.querySelectorAll('.pedido-card').forEach(card => { card.style.display = card.innerText.toUpperCase().includes(termo) ? 'flex' : 'none'; });
}

function drag(ev) { ev.dataTransfer.setData("text", ev.target.id); }
function allowDrop(ev) { ev.preventDefault(); }

function drop(ev, novoStatus) { 
    ev.preventDefault(); 
    let pedidoId = ev.dataTransfer.getData("text");
    db.collection("pedidos").doc(pedidoId).update({ status: novoStatus }).then(() => { showToast("MOVIDO COM SUCESSO!"); });
}

function trocarPgto(id, status) { db.collection("pedidos").doc(id).update({ statusPagamento: status }); }
function excluirPedido(id) { if (confirm("Mandar pedido para a lixeira?")) db.collection("pedidos").doc(id).update({apagado: true}); }

function enviarMensagemStatus(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId);
    if(!p) return;
    
    let zap = p.whatsapp.replace(/\D/g, '');
    let primeiroNome = p.nome.split(' ')[0];
    
    let saudacao = `Fala ${primeiroNome}! Tudo bem? ✌️\n\n`;
    let statusInfo = `O status do seu pedido *#${p.numeroPedido}* da Waller Clothing foi atualizado para: *${p.statusAtualizado}*\n\n`;
    let itensStr = `*📦 Detalhes do Pedido:*\n`;
    
    p.itens.forEach(i => {
        itensStr += `- ${i.quantidade}x ${i.tipoPeca} (${i.nomeEstampa} - Tam: ${i.tamanho}) = ${formatCurrency(i.valorUnitario * i.quantidade)}\n`;
    });
    
    let totaisStr = `\n`;
    if (p.valorDesconto > 0) totaisStr += `Desconto: -${formatCurrency(p.valorDesconto)}\n`;
    if (p.valorFrete > 0) totaisStr += `Frete: ${formatCurrency(p.valorFrete)}\n`;
    
    totaisStr += `*Total Final do Pedido:* ${formatCurrency(p.valorTotal)}`;
    
    let msgFinal = saudacao + statusInfo + itensStr + totaisStr;
    window.open(`https://wa.me/55${zap}?text=${encodeURIComponent(msgFinal)}`, '_blank');
}

let selecionados = [];
function checkBulk() {
    selecionados = Array.from(document.querySelectorAll('.checkbox-bulk:checked')).map(cb => cb.value);
    document.getElementById('bulk-count').innerText = selecionados.length;
    document.getElementById('bulk-action-bar').classList.toggle('show', selecionados.length > 0);
}
function limparBulk() { document.querySelectorAll('.checkbox-bulk').forEach(cb => cb.checked = false); checkBulk(); }
function executarBulkUpdate() {
    let status = document.getElementById('bulk-status-select').value; let batch = db.batch();
    selecionados.forEach(id => { batch.update(db.collection("pedidos").doc(id), { status: status }); });
    batch.commit().then(() => { showToast(`${selecionados.length} ATUALIZADOS!`); limparBulk(); });
}

function atualizarSelectFaturamento(mesesUnicos) {
    const select = document.getElementById('selectFaturamentoMes'); const valAnt = select.value; select.innerHTML = '';
    let arrayMeses = Array.from(mesesUnicos).sort((a,b) => { let [mA,aA]=a.split('/'); let [mB,aB]=b.split('/'); return new Date(aB,mB-1)-new Date(aA,mA-1); });
    if(!arrayMeses.length) select.innerHTML='<option value="">-</option>';
    else { arrayMeses.forEach(m => select.innerHTML+=`<option value="${m}">${m}</option>`); select.value = arrayMeses.includes(valAnt)?valAnt:arrayMeses[0]; }
    calcularFaturamentoMensal();
}

function calcularFaturamentoMensal() {
    let mes = document.getElementById('selectFaturamentoMes').value; 
    let somaFaturamento = 0;
    let somaLucro = 0;

    todosPedidos.forEach(p => { 
        if(p.statusPagamento === 'PAGO' && p.dataMesAno === mes) {
            somaFaturamento += parseFloat(p.valorTotal);
            somaLucro += parseFloat(p.lucroTotalPedido || 0); 
        }
    });

    document.getElementById('dashFaturamento').innerText = formatCurrency(somaFaturamento);
    document.getElementById('dashLucro').innerText = formatCurrency(somaLucro);
}

// ==========================================
// EDIÇÃO RÁPIDA DE PEDIDO
// ==========================================
function abrirModalEdicao(id) {
    const p = todosPedidos.find(x => x.id === id); if(!p) return;
    document.getElementById('editId').value = p.id;
    document.getElementById('tituloEditPedido').innerText = "#" + p.numeroPedido;
    document.getElementById('editNome').value = p.nome || '';
    document.getElementById('editWhatsapp').value = p.whatsapp || '';
    
    document.getElementById('editValorFrete').value = formatCurrency(p.valorFrete || 0);
    document.getElementById('editValorFreteReal').value = formatCurrency(p.valorFreteReal || 0);
    document.getElementById('editValorTotal').value = formatCurrency(p.valorTotal || 0);
    
    if(p.metodoPagamento) document.getElementById('editMetodoPagamento').value = p.metodoPagamento;
    
    let container = document.getElementById('editItensContainer'); container.innerHTML = '';
    if(p.itens) p.itens.forEach((item) => { container.innerHTML += gerarHtmlLinhaEdicao(item); });
    document.getElementById('modalEdicao').style.display = 'flex';
}

function gerarHtmlLinhaEdicao(item) {
    return `
    <div style="border: 2px dashed var(--border-color); padding: 10px; margin-bottom: 10px; background: var(--gray);">
        <div style="font-weight:900;">${item.quantidade}x ${item.tipoPeca} [${item.codigoEstampa}]</div>
        <div style="font-size:0.8rem;">${item.nomeEstampa} - Tam: ${item.tamanho} - Cor: ${item.cor} - Preço: ${formatCurrency(item.valorUnitario)}</div>
    </div>`;
}

function recalcularSomaEdicao() {
    const id = document.getElementById('editId').value;
    const pedido = todosPedidos.find(x => x.id === id);
    if(!pedido) return;

    let somaVendaPecas = 0;
    if(pedido.itens) pedido.itens.forEach(item => { somaVendaPecas += (item.valorUnitario * item.quantidade); });
    
    let freteCobrado = unmaskCurrency(document.getElementById('editValorFrete').value);
    let desconto = pedido.valorDesconto || 0;
    
    let novoTotal = somaVendaPecas + freteCobrado - desconto;
    document.getElementById('editValorTotal').value = formatCurrency(novoTotal);
}

function fecharModalEdicao() { document.getElementById('modalEdicao').style.display = 'none'; }

function salvarAlteracoesEdicao() {
    const id = document.getElementById('editId').value;
    const pedido = todosPedidos.find(x => x.id === id);
    if(!pedido) return;

    let freteCobradoNovo = unmaskCurrency(document.getElementById('editValorFrete').value);
    let freteRealNovo = unmaskCurrency(document.getElementById('editValorFreteReal').value);

    let somaCustoPecas = pedido.custoTotalPedido || 0;
    let somaVendaPecas = 0;
    if(pedido.itens) pedido.itens.forEach(item => { somaVendaPecas += (item.valorUnitario * item.quantidade); });
    
    let desconto = pedido.valorDesconto || 0;
    let embalagem = pedido.custoEmbalagem || 0;

    let freteRealCalculo = freteRealNovo > 0 ? freteRealNovo : freteCobradoNovo;
    let prejuizoFrete = freteRealCalculo > freteCobradoNovo ? (freteRealCalculo - freteCobradoNovo) : 0;
    let lucroSobraFrete = freteCobradoNovo > freteRealCalculo ? (freteCobradoNovo - freteRealCalculo) : 0;
    
    let novoLucro = (somaVendaPecas - somaCustoPecas) - desconto - embalagem - prejuizoFrete + lucroSobraFrete;
    let novoTotal = somaVendaPecas + freteCobradoNovo - desconto;

    db.collection("pedidos").doc(id).update({
        nome: document.getElementById('editNome').value.toUpperCase(), 
        whatsapp: document.getElementById('editWhatsapp').value,
        metodoPagamento: document.getElementById('editMetodoPagamento').value,
        valorFrete: freteCobradoNovo,
        valorFreteReal: freteRealNovo,
        valorTotal: novoTotal,
        lucroTotalPedido: novoLucro
    }).then(() => { fecharModalEdicao(); showToast("Pedido Editado e Lucro Atualizado!"); });
}

// ==========================================
// PDFS E RELATÓRIO DE LUCRO LÍQUIDO MENSAL
// ==========================================
function abrirModalPDF() { document.getElementById('modalPDF').style.display = 'flex'; }
function fecharModalPDF() { document.getElementById('modalPDF').style.display = 'none'; }

function desenharCabecalhoPDF(doc, titulo) {
    doc.setFillColor(217, 4, 41); doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("WALLER CLOTHING", 14, 12);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(titulo, 14, 18);
    doc.text(`Gerado: ${new Date().toLocaleDateString('pt-BR')}`, 160, 18);
}

function gerarPDFProducao(opcao) {
    let statusSel = opcao === 'TODOS' ? ['PEDIDO FEITO', 'AGUARDANDO ESTAMPA'] : [opcao];
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    desenharCabecalhoPDF(doc, `ORDEM DE PRODUÇÃO: ${opcao}`);
    let currentY = 35; let achou = false;

    statusSel.forEach(status => {
        const pend = todosPedidos.filter(p => p.statusAtualizado === status);
        if (pend.length > 0) {
            achou = true; doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(`STATUS: ${status}`, 14, currentY); currentY += 5; 
            let total=0; const count={};
            pend.forEach(p => { p.itens.forEach(i => { let q=parseInt(i.quantidade)||1; total+=q; const k=`${i.codigoEstampa||'-'} | ${i.nomeEstampa||'-'} | ${i.tipoPeca} | ${i.cor} | ${i.tamanho}`; count[k]=(count[k]||0)+q; }); });
            const rows = Object.keys(count).map(k => [...k.split(' | '), count[k]]).sort((a,b)=>a[0].localeCompare(b[0]));
            doc.autoTable({ startY: currentY, head: [['Cód', 'Estampa', 'Peça', 'Cor', 'Tam', 'Qtd']], body: rows, foot: [[ { content: 'TOTAL:', colSpan: 5, styles: { halign: 'right'} }, { content: total.toString(), styles: { halign: 'center', fillColor:[217,4,41], textColor:[255,255,255] } } ]], theme: 'grid', headStyles: { fillColor: [0,0,0], textColor: [255,255,255] }, styles: { fontSize: 9 } });
            currentY = doc.lastAutoTable.finalY + 15; 
        }
    });
    if(!achou) { showToast("Vazio!", true); return; }
    doc.save(`waller_OS_${opcao.replace(/ /g,'_')}.pdf`); fecharModalPDF();
}

function gerarEtiquetasEnvio() {
    const prontos = todosPedidos.filter(p => p.statusAtualizado === 'ESTAMPA PRONTA' || p.statusAtualizado === 'PEDIDO ENVIADO');
    if(!prontos.length) { showToast("Nenhum pedido pronto!", true); return; }
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    let y = 20;
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("ETIQUETAS DE ENVIO - WALLER CLOTHING", 14, y); y+=15;
    
    prontos.forEach((p, idx) => {
        if(y > 250) { doc.addPage(); y = 20; }
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(14, y, 180, 45);
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(`DESTINATÁRIO: ${p.nome}`, 20, y+10);
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); 
        doc.text(`Endereço: ${p.endereco || 'Não informado'} ${p.complemento ? ' - ' + p.complemento : ''}`, 20, y+20);
        doc.text(`CEP: ${p.cep || 'Não informado'}`, 20, y+28);
        doc.text(`Telefone: ${p.whatsapp}`, 20, y+36);
        doc.setFont("helvetica", "bold"); doc.text(`Pedido #${p.numeroPedido}`, 150, y+36);
        y += 55;
    });
    doc.save(`waller_etiquetas.pdf`); fecharModalPDF();
}

function gerarPDFLucroLiquido() {
    let mes = document.getElementById('selectFaturamentoMes').value; 
    if(mes === 'ALL') { showToast("Selecione o mês na tela de Kanban primeiro!", true); return; }
    
    let pagos = todosPedidos.filter(p => p.statusPagamento === 'PAGO' && p.dataMesAno === mes);
    if(!pagos.length) { showToast("Sem vendas neste mês!", true); return; }

    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    desenharCabecalhoPDF(doc, `RELATÓRIO MENSAL FINANCEIRO E DE LUCRO: ${mes}`);

    let qtdVendas = pagos.length;
    let somaFaturamento = 0; let somaCustoPecas = 0; let somaEmbalagem = 0; let somaDescontos = 0;
    let somaFreteCobrado = 0; let somaFreteReal = 0; let somaLucroLiquido = 0; let qtdPecasVendidas = 0;

    pagos.forEach(p => {
        somaFaturamento += parseFloat(p.valorTotal || 0);
        somaCustoPecas += parseFloat(p.custoTotalPedido || 0);
        somaEmbalagem += parseFloat(p.custoEmbalagem || 0);
        somaDescontos += parseFloat(p.valorDesconto || 0);
        somaFreteCobrado += parseFloat(p.valorFrete || 0);
        somaFreteReal += parseFloat(p.valorFreteReal || 0);
        somaLucroLiquido += parseFloat(p.lucroTotalPedido || 0);
        if(p.itens) p.itens.forEach(i => qtdPecasVendidas += parseInt(i.quantidade||1));
    });

    let balancoFrete = somaFreteCobrado - somaFreteReal;

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(193, 18, 31);
    doc.text("1. RESUMO FINANCEIRO GERAL", 14, 35);
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
    doc.text(`Total de Pedidos Pagos: ${qtdVendas} pedidos`, 14, 45);
    doc.text(`Total de Peças Vendidas: ${qtdPecasVendidas} peças`, 110, 45);

    doc.text(`(+) Faturamento Bruto: ${formatCurrency(somaFaturamento)}`, 14, 55);
    doc.text(`(-) Custo de Produção (Peças): ${formatCurrency(somaCustoPecas)}`, 14, 62);
    doc.text(`(-) Custo de Embalagens: ${formatCurrency(somaEmbalagem)}`, 14, 69);
    doc.text(`(-) Descontos Concedidos: ${formatCurrency(somaDescontos)}`, 14, 76);
    
    doc.text(`Frete Recebido (Cliente): ${formatCurrency(somaFreteCobrado)}`, 110, 55);
    doc.text(`Frete Pago (Correios/Transp): ${formatCurrency(somaFreteReal)}`, 110, 62);
    doc.setFont("helvetica", "bold"); doc.text(`Balanço Logístico: ${formatCurrency(balancoFrete)}`, 110, 69); doc.setFont("helvetica", "normal");

    doc.setFillColor(6, 214, 160); doc.rect(14, 82, 180, 10, 'F');
    doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(`LUCRO LÍQUIDO FINAL DO MÊS: ${formatCurrency(somaLucroLiquido)}`, 18, 89);

    doc.setTextColor(193, 18, 31); doc.text("2. DETALHAMENTO DE LUCRO POR PEDIDO", 14, 105);

    let rows = pagos.map(p => [
        `#${p.numeroPedido}`, p.nome.split(' ')[0],
        formatCurrency(p.valorTotal), formatCurrency(p.custoTotalPedido), 
        formatCurrency(p.valorDesconto), formatCurrency(p.lucroTotalPedido)
    ]);

    doc.autoTable({ 
        startY: 110, 
        head: [['Pedido', 'Cliente', 'Faturamento', 'Custo Peças', 'Desconto', 'Lucro Gerado']], 
        body: rows, 
        theme: 'grid', headStyles: { fillColor: [17,17,17] }, styles: { fontSize: 8 } 
    });

    doc.save(`waller_lucro_${mes.replace('/','-')}.pdf`); fecharModalPDF();
}
