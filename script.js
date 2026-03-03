// ==========================================
// THEME & TOASTS
// ==========================================
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
// UTILITÁRIOS, FRETE E MÁSCARAS INTELIGENTES
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

    if (e.target.value.length === 15) { document.getElementById('nome').focus(); }
}

function aplicarMascaraCepEPular(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
    e.target.value = v;

    if (v.length === 9) {
        buscarCEP(v); // Dispara a busca
        document.getElementById('numeroEnd').focus(); // Pula para o número
    }
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
                let valorCalculado = tabelaFrete[data.uf] || 35.00;
                
                document.getElementById('valorFrete').value = formatCurrency(valorCalculado);
                atualizarTelaCarrinho(); 
                showToast("CEP Encontrado e Frete Calculado!", false);
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
    let isHidden = lista.style.display === 'none';
    lista.style.display = isHidden ? 'flex' : 'none';
    seta.innerHTML = isHidden ? '▲' : '▼';
}

// ==========================================
// FIREBASE INIT
// ==========================================
const firebaseConfig = { apiKey: "AIzaSyDnch84Sl5VyIi0YmOAde4jTftsssLEsNA", authDomain: "banco-de-dados-waller.firebaseapp.com", projectId: "banco-de-dados-waller", storageBucket: "banco-de-dados-waller.firebasestorage.app", messagingSenderId: "595978694752", appId: "1:595978694752:web:69aa74348560268a5a1305" };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// CATÁLOGO: CUSTO E PREÇO DE VENDA
// ==========================================
let catalogoEstampas = {}; 
db.collection("estampas").orderBy("codigo").onSnapshot((querySnapshot) => {
    document.getElementById('listaEstampas').innerHTML = '';
    let datalist = document.getElementById('estampas-list'); datalist.innerHTML = '';
    catalogoEstampas = {}; 
    
    querySnapshot.forEach((doc) => {
        let est = doc.data(); 
        let estoque = est.estoque || 0; 
        let cat = est.categoria || 'CAMISETA';
        let custo = est.custo || 0;
        let preco = est.precoVenda || 0;
        
        catalogoEstampas[est.codigo] = { nome: est.nome, estoque: estoque, categoria: cat, custo: custo, precoVenda: preco };
        
        datalist.innerHTML += `<option value="${est.codigo}">${est.nome}</option>`;
        
        let badgeSoldOut = estoque <= 0 ? `<span class="badge-soldout">SOLD OUT</span>` : '';
        let resumoFinanceiro = `Custo: ${formatCurrency(custo)} | Venda: ${formatCurrency(preco)}`;
        
        document.getElementById('listaEstampas').innerHTML += `
        <tr>
            <td><strong>${est.codigo}</strong></td>
            <td><div style="font-weight:900;">${est.nome}</div><div style="font-size:0.75rem; color:var(--text-muted);">${cat} • ${resumoFinanceiro}</div></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn-icone" style="width:25px; height:25px; font-size:1.2rem; line-height:0;" onclick="ajustarEstoqueRapido('${doc.id}', -1)">-</button>
                    <span style="font-weight:900; font-size:1.1rem; width:30px; text-align:center; color:${estoque <= 0 ? 'var(--red)' : 'var(--black)'}">${estoque}</span>
                    <button class="btn-icone" style="width:25px; height:25px; font-size:1.2rem; line-height:0;" onclick="ajustarEstoqueRapido('${doc.id}', 1)">+</button>
                    ${badgeSoldOut}
                </div>
            </td>
            <td style="display:flex; gap:5px;">
                <button class="btn-icone" onclick="prepararEdicaoEstampa('${est.codigo}', '${est.nome.replace(/'/g,"\\'")}', ${estoque}, '${cat}', ${custo}, ${preco})">✏️</button>
                <button class="btn-icone" onclick="excluirEstampa('${doc.id}')" style="color:var(--red);">X</button>
            </td>
        </tr>`;
    });
});

function ajustarEstoqueRapido(id, delta) {
    db.collection("estampas").doc(id).update({ estoque: firebase.firestore.FieldValue.increment(delta) });
}

function autocompletarEstampa(val) {
    let code = val.toUpperCase().trim();
    if(catalogoEstampas[code]) { 
        document.getElementById('nomeEstampa').value = catalogoEstampas[code].nome;
        document.getElementById('valorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda); // Autopreencher valor de venda
    }
}

function abrirModalEstampa() { document.getElementById('modalEstampa').style.display = 'flex'; }
function fecharModalEstampa() {
    document.getElementById('modalEstampa').style.display = 'none';
    document.getElementById('cadCodigoEstampa').value = ''; document.getElementById('cadCodigoEstampa').disabled = false;
    document.getElementById('cadNomeEstampa').value = ''; document.getElementById('cadEstoque').value = '0';
    document.getElementById('cadCusto').value = ''; document.getElementById('cadPreco').value = '';
    document.getElementById('cadCategoriaEstampa').value = 'CAMISETA'; document.getElementById('editEstampaCodigoOriginal').value = '';
    document.getElementById('tituloModalEstampa').innerText = 'CADASTRAR PRODUTO'; document.getElementById('btnSalvarEstampa').innerText = 'SALVAR PRODUTO';
}

function prepararEdicaoEstampa(c, n, e, cat, custo, preco) {
    document.getElementById('cadCodigoEstampa').value = c; document.getElementById('cadCodigoEstampa').disabled = true;
    document.getElementById('cadNomeEstampa').value = n; document.getElementById('cadEstoque').value = e;
    document.getElementById('cadCusto').value = formatCurrency(custo); document.getElementById('cadPreco').value = formatCurrency(preco);
    document.getElementById('cadCategoriaEstampa').value = cat || 'CAMISETA'; document.getElementById('editEstampaCodigoOriginal').value = c;
    
    document.getElementById('tituloModalEstampa').innerText = 'EDITAR PRODUTO: ' + c;
    document.getElementById('btnSalvarEstampa').innerText = 'ATUALIZAR PRODUTO';
    abrirModalEstampa();
}

function salvarNovaEstampa(e) {
    e.preventDefault();
    let cod = document.getElementById('cadCodigoEstampa').value.toUpperCase().trim();
    let nom = document.getElementById('cadNomeEstampa').value.toUpperCase().trim();
    let cat = document.getElementById('cadCategoriaEstampa').value;
    let est = parseInt(document.getElementById('cadEstoque').value) || 0;
    let custo = unmaskCurrency(document.getElementById('cadCusto').value);
    let preco = unmaskCurrency(document.getElementById('cadPreco').value);
    let docId = document.getElementById('editEstampaCodigoOriginal').value || cod;

    db.collection("estampas").doc(docId).set({ codigo: docId, nome: nom, categoria: cat, estoque: est, custo: custo, precoVenda: preco }, { merge: true })
    .then(() => { fecharModalEstampa(); showToast("Produto Salvo!"); });
}

function excluirEstampa(id) { if(confirm(`Apagar estampa?`)) db.collection("estampas").doc(id).delete(); }

// ==========================================
// CRM: DADOS DE CLIENTES E ALERTA CHURN
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

function abrirFichaCliente(whatsapp) {
    let dadosCompra = mapaClientes[whatsapp] || { qtd: 0, totalGasto: 0 };
    let perfil = clientesCadastrados[whatsapp] || {};

    document.getElementById('fichaWhatsapp').value = whatsapp;
    document.getElementById('fichaNome').value = perfil.nome || dadosCompra.nome || '';
    document.getElementById('fichaInsta').value = perfil.insta || '';
    document.getElementById('fichaDataNasc').value = perfil.dataNasc || '';
    document.getElementById('fichaCEP').value = perfil.cep || dadosCompra.cep || '';
    document.getElementById('fichaEndereco').value = perfil.endereco || dadosCompra.endereco || '';
    document.getElementById('fichaComplemento').value = perfil.complemento || '';
    document.getElementById('fichaObs').value = perfil.obs || '';
    
    document.getElementById('fichaQtdPedidos').innerText = dadosCompra.qtd;
    document.getElementById('fichaTotalGasto').innerText = formatCurrency(dadosCompra.totalGasto);
    
    document.getElementById('modalFichaCliente').style.display = 'flex';
}

function fecharFichaCliente() { document.getElementById('modalFichaCliente').style.display = 'none'; }

function salvarFichaCliente() {
    let w = document.getElementById('fichaWhatsapp').value;
    db.collection("clientes").doc(w).set({
        whatsapp: w, nome: document.getElementById('fichaNome').value.toUpperCase(),
        insta: document.getElementById('fichaInsta').value, dataNasc: document.getElementById('fichaDataNasc').value,
        cep: document.getElementById('fichaCEP').value, endereco: document.getElementById('fichaEndereco').value,
        complemento: document.getElementById('fichaComplemento').value,
        obs: document.getElementById('fichaObs').value
    }, {merge: true}).then(() => { showToast("Ficha Atualizada!"); fecharFichaCliente(); });
}

function excluirFichaCliente(whatsapp) {
    if(confirm(`Tem certeza que deseja APAGAR a ficha de ${whatsapp}?`)) {
        db.collection("clientes").doc(whatsapp).delete().then(() => showToast("Ficha Excluída!", true));
    }
}

// ==========================================
// LANÇAMENTO DE PEDIDO (MATEMÁTICA DO LUCRO)
// ==========================================
let todosPedidos = []; let carrinhoTemporario = []; 

function adicionarAoCarrinho() {
    const cod = document.getElementById('codigoEstampa').value.toUpperCase().trim();
    const nom = document.getElementById('nomeEstampa').value.toUpperCase().trim();
    const tip = document.getElementById('tipoPeca').value;
    const tam = document.getElementById('tamanho').value;
    const cor = document.getElementById('cor').value;
    const val = unmaskCurrency(document.getElementById('valorUnitario').value);
    const qtd = parseInt(document.getElementById('quantidade').value) || 1;

    if(!cod || !nom) { showToast("Preencha código e nome!", true); return; }
    if(catalogoEstampas[cod] && catalogoEstampas[cod].estoque < qtd) { showToast("Estoque baixo!", true); }

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
    
    // Total que o cliente vai te pagar (Soma Produtos + Frete Cobrado - Desconto)
    document.getElementById('valorTotal').value = formatCurrency(somaProdutos + freteCobrado - desconto);
    document.getElementById('carrinho-container').style.display = carrinhoTemporario.length === 0 ? 'none' : 'block'; 
}

async function salvarPedidoCompleto() {
    let nome = document.getElementById('nome').value.toUpperCase();
    let whatsapp = document.getElementById('whatsapp').value;
    let cep = document.getElementById('cep').value;
    let end = document.getElementById('endereco').value + ", " + document.getElementById('numeroEnd').value;
    let compl = document.getElementById('complementoEnd').value;
    
    let freteCobrado = unmaskCurrency(document.getElementById('valorFrete').value);
    let freteReal = unmaskCurrency(document.getElementById('valorFreteReal').value);
    let embalagem = unmaskCurrency(document.getElementById('custoEmbalagem').value);
    let desconto = unmaskCurrency(document.getElementById('valorDesconto').value);
    let totalCobrado = unmaskCurrency(document.getElementById('valorTotal').value);

    if(!nome || !whatsapp || carrinhoTemporario.length===0) { showToast("Preencha Nome, Whats e 1 Peça!", true); return; }

    // MATEMÁTICA DO LUCRO LÍQUIDO REAL
    let somaCustoPecas = 0;
    let somaVendaPecas = 0;
    carrinhoTemporario.forEach(item => { 
        somaCustoPecas += (item.custoUnitario * item.quantidade);
        somaVendaPecas += (item.valorUnitario * item.quantidade);
    });
    
    // Lucro = (Venda - CustoProdução) - Desconto - CustoEmbalagem - (FreteReal - FreteCobradoCliente)
    let prejuizoFrete = freteReal > freteCobrado ? (freteReal - freteCobrado) : 0;
    let lucroSobraFrete = freteCobrado > freteReal ? (freteCobrado - freteReal) : 0;
    
    let lucroCalculado = (somaVendaPecas - somaCustoPecas) - desconto - embalagem - prejuizoFrete + lucroSobraFrete;

    document.getElementById('btnGerarOrdem').innerText = "SALVANDO...";
    let numGerado = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        await db.collection("pedidos").add({
            numeroPedido: numGerado, nome: nome, whatsapp: whatsapp, cep: cep, endereco: end, complemento: compl,
            valorFrete: freteCobrado, valorFreteReal: freteReal, custoEmbalagem: embalagem, valorDesconto: desconto, valorTotal: totalCobrado, 
            custoTotalPedido: somaCustoPecas, lucroTotalPedido: lucroCalculado,
            metodoPagamento: document.getElementById('metodoPagamento').value, statusPagamento: document.getElementById('statusPagamento').value,
            itens: carrinhoTemporario, status: 'PEDIDO FEITO', dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        db.collection("clientes").doc(whatsapp).set({ whatsapp: whatsapp, nome: nome, cep: cep, endereco: end, complemento: compl }, { merge: true });
        
        carrinhoTemporario.forEach(item => {
            if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) {
                db.collection("estampas").doc(item.codigoEstampa).update({ estoque: firebase.firestore.FieldValue.increment(-item.quantidade) });
            }
        });

        // Limpa a tela
        document.getElementById('nome').value = ''; document.getElementById('whatsapp').value = ''; document.getElementById('cep').value=''; document.getElementById('endereco').value=''; document.getElementById('numeroEnd').value=''; document.getElementById('complementoEnd').value=''; document.getElementById('valorFrete').value=''; document.getElementById('valorFreteReal').value=''; document.getElementById('valorDesconto').value=''; document.getElementById('valorTotal').value=''; document.getElementById('alertaClienteFiel').style.display = 'none';
        carrinhoTemporario = []; atualizarTelaCarrinho(); document.getElementById('btnGerarOrdem').innerText = "GERAR ORDEM DE SERVIÇO"; showToast(`PEDIDO #${numGerado} SALVO!`);
    } catch (e) { showToast("Erro ao salvar", true); }
}

// ==========================================
// KANBAN, GRÁFICOS E CURVA ABC
// ==========================================
let chartInstancia = null; // Variável para controlar o gráfico

db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot((querySnapshot) => {
    todosPedidos = []; mapaClientes = {}; let freqEstampas = {}; let meses = new Set();
    let met = { pedMes: 0, faturamento: 0 }; let mAtual = new Date().getMonth(); let aAtual = new Date().getFullYear();

    // Dados para o Gráfico
    let vendasPorMes = {}; 

    querySnapshot.forEach((doc) => {
        let p = doc.data(); p.id = doc.id; 
        p.statusAtualizado = (p.status || 'PEDIDO FEITO').toUpperCase();
        if(p.statusAtualizado === 'PRONTA / ESTAMPADA') p.statusAtualizado = 'ESTAMPA PRONTA';
        
        let d = p.dataCriacao ? p.dataCriacao.toDate() : new Date();
        p.dataFormatada = d.toLocaleDateString('pt-BR'); p.dataMesAno = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        
        if(p.statusPagamento === 'PAGO') {
            meses.add(p.dataMesAno);
            // Soma faturamento no gráfico
            if(!vendasPorMes[p.dataMesAno]) vendasPorMes[p.dataMesAno] = 0;
            vendasPorMes[p.dataMesAno] += parseFloat(p.valorTotal || 0);
            
            // Frequencia da Curva ABC
            if(p.itens) { p.itens.forEach(i => { if(i.codigoEstampa) freqEstampas[i.nomeEstampa] = (freqEstampas[i.nomeEstampa]||0) + parseInt(i.quantidade); }); }
        }
        
        if(d.getMonth() === mAtual && d.getFullYear() === aAtual) met.pedMes++;

        // CRM
        if(p.whatsapp) {
            if(!mapaClientes[p.whatsapp]) mapaClientes[p.whatsapp] = { nome: p.nome, totalGasto: 0, qtd: 0, cep: p.cep, endereco: p.endereco, complemento: p.complemento, ultimaCompra: d };
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
    // Pega os últimos 6 meses e ordena cronologicamente
    let labels = Object.keys(vendas).sort((a,b) => { let [mA,aA]=a.split('/'); let [mB,aB]=b.split('/'); return new Date(aA,mA-1)-new Date(aB,mB-1); }).slice(-6);
    let dados = labels.map(mes => vendas[mes]);

    const ctx = document.getElementById('graficoVendas').getContext('2d');
    if (chartInstancia) chartInstancia.destroy(); // Apaga o gráfico velho

    chartInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Faturamento Bruto (R$)', data: dados, backgroundColor: '#c1121f', borderWidth: 2, borderColor: '#111111' }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
}

function renderizarBestSellers(freq) {
    let sortable = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0,5); // Pega o Top 5
    document.getElementById('dashBestSellers').innerHTML = sortable.length ? sortable.map((x, i) => `<div>${i+1}. ${x[0]} <span style="color:var(--red);">(${x[1]}x)</span></div>`).join('') : 'Sem vendas';
    document.getElementById('dashBestSellersList').innerHTML = sortable.length ? sortable.map(x => `${x[0]} (${x[1]})`).join(' | ') : 'Sem histórico';
}

function renderizarCRM() {
    let combinados = {};
    Object.keys(mapaClientes).forEach(w => combinados[w] = { ...mapaClientes[w] });
    Object.keys(clientesCadastrados).forEach(w => {
        if(!combinados[w]) combinados[w] = { nome: clientesCadastrados[w].nome, qtd: 0, totalGasto: 0, ultimaCompra: null };
        combinados[w].nome = clientesCadastrados[w].nome || combinados[w].nome;
    });

    let crmList = Object.entries(combinados).sort((a,b) => b[1].totalGasto - a[1].totalGasto);
    
    document.getElementById('listaClientesCRM').innerHTML = crmList.map(c => {
        let zapLimpo = c[0].replace(/\D/g,'');
        let dataUc = c[1].ultimaCompra ? c[1].ultimaCompra.toLocaleDateString('pt-BR') : 'Sem dados';
        let tktMedio = c[1].qtd > 0 ? (c[1].totalGasto / c[1].qtd) : 0;
        let vipBadge = c[1].totalGasto >= 500 ? `<span class="badge-vip">VIP</span>` : '';
        
        // Verifica Cliente Sumido (> 90 dias sem comprar)
        let diasSumido = c[1].ultimaCompra ? Math.floor((new Date() - c[1].ultimaCompra) / (1000 * 60 * 60 * 24)) : 0;
        let classeSumido = diasSumido > 90 ? 'sumido' : '';
        let badgeSumido = diasSumido > 90 ? `<span class="badge-soldout">SUMIDO (${diasSumido} dias)</span>` : '';
        
        return `
        <div class="crm-card ${classeSumido}">
            <h3 class="crm-card-title">${c[1].nome} <div>${vipBadge} ${badgeSumido}</div></h3>
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
                        <input type="checkbox" class="checkbox-bulk" value="${p.id}" onchange="checkBulk()" title="Selecionar pedido">
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
                <button onclick="abrirModalEdicao('${p.id}')" title="Editar">✏️ EDITAR</button>
                <button onclick="excluirPedido('${p.id}')" title="Excluir" style="color:var(--red); flex: 0.3;">❌</button>
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
function drop(ev, novoStatus) { ev.preventDefault(); db.collection("pedidos").doc(ev.dataTransfer.getData("text")).update({ status: novoStatus }); showToast("MOVIDO COM SUCESSO!"); }
function trocarPgto(id, status) { db.collection("pedidos").doc(id).update({ statusPagamento: status }); }
function excluirPedido(id) { if (confirm("Deletar pedido inteiro?")) db.collection("pedidos").doc(id).delete(); }

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
    batch.commit().then(() => { showToast(`${selecionados.length} PEDIDOS ATUALIZADOS!`); limparBulk(); });
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
    document.getElementById('editValorTotal').value = formatCurrency(p.valorTotal || 0);
    if(p.metodoPagamento) document.getElementById('editMetodoPagamento').value = p.metodoPagamento;
    
    let container = document.getElementById('editItensContainer'); container.innerHTML = '';
    p.itens.forEach((item) => { container.innerHTML += gerarHtmlLinhaEdicao(item); });
    document.getElementById('modalEdicao').style.display = 'flex';
    recalcularSomaEdicao(); 
}

function gerarHtmlLinhaEdicao(item) {
    const t = item.tipoPeca; const tam = item.tamanho; const c = item.cor;
    return `
    <div class="item-edit-wrapper" style="border: 2px dashed var(--border-color); padding: 15px; margin-bottom: 15px; background: var(--gray); position: relative;">
        <button type="button" class="btn-remove-item" style="position: absolute; top: 10px; right: 10px;" onclick="this.closest('.item-edit-wrapper').remove(); recalcularSomaEdicao();">X REMOVER</button>
        <div class="form-grid" style="margin-bottom: 10px; padding-right: 100px;">
            <input type="text" class="edit-cod" value="${item.codigoEstampa}" placeholder="CÓDIGO" style="flex:0.5;">
            <input type="text" class="edit-nom" value="${item.nomeEstampa}" placeholder="ESTAMPA" style="flex:1.5;">
        </div>
        <div class="form-grid">
            <select class="edit-tip"><option value="OVERSIZED" ${t==='OVERSIZED'?'selected':''}>OVERSIZED</option><option value="MOLETOM" ${t==='MOLETOM'?'selected':''}>MOLETOM</option><option value="REGATA" ${t==='REGATA'?'selected':''}>REGATA</option><option value="CAMISETA TRADICIONAL" ${t==='CAMISETA TRADICIONAL'?'selected':''}>CAM. TRADICIONAL</option></select>
            <select class="edit-tam"><option value="P" ${tam==='P'?'selected':''}>P</option><option value="M" ${tam==='M'?'selected':''}>M</option><option value="G" ${tam==='G'?'selected':''}>G</option><option value="GG" ${tam==='GG'?'selected':''}>GG</option><option value="XG" ${tam==='XG'?'selected':''}>XG</option></select>
            <select class="edit-cor"><option value="PRETA" ${c==='PRETA'?'selected':''}>PRETA</option><option value="BRANCA" ${c==='BRANCA'?'selected':''}>BRANCA</option><option value="MESCLA" ${c==='MESCLA'?'selected':''}>MESCLA</option><option value="OFF-WHITE" ${c==='OFF-WHITE'?'selected':''}>OFF-WHITE</option></select>
            <input type="text" class="edit-valor moeda" value="${formatCurrency(item.valorUnitario)}" placeholder="R$ UN" style="flex: 0.5;">
            <input type="number" class="edit-qtd" value="${item.quantidade}" placeholder="QTD" min="1" style="flex: 0.3;">
        </div>
    </div>`;
}

function recalcularSomaEdicao() {
    let soma = 0; document.querySelectorAll('.item-edit-wrapper').forEach(row => { soma += (unmaskCurrency(row.querySelector('.edit-valor').value) * (parseInt(row.querySelector('.edit-qtd').value) || 1)); });
    document.getElementById('editValorTotal').value = formatCurrency(soma);
}

function fecharModalEdicao() { document.getElementById('modalEdicao').style.display = 'none'; }

function salvarAlteracoesEdicao() {
    const id = document.getElementById('editId').value; let itens = [];
    document.querySelectorAll('.item-edit-wrapper').forEach(row => {
        itens.push({
            codigoEstampa: row.querySelector('.edit-cod').value.toUpperCase().trim(), nomeEstampa: row.querySelector('.edit-nom').value.toUpperCase().trim(),
            tipoPeca: row.querySelector('.edit-tip').value, tamanho: row.querySelector('.edit-tam').value, cor: row.querySelector('.edit-cor').value,
            valorUnitario: unmaskCurrency(row.querySelector('.edit-valor').value), quantidade: parseInt(row.querySelector('.edit-qtd').value) || 1
        });
    });
    if(itens.length === 0) { showToast("Precisa de pelo menos 1 peça.", true); return; }
    db.collection("pedidos").doc(id).update({
        nome: document.getElementById('editNome').value.toUpperCase(), whatsapp: document.getElementById('editWhatsapp').value,
        valorTotal: unmaskCurrency(document.getElementById('editValorTotal').value), metodoPagamento: document.getElementById('editMetodoPagamento').value, itens: itens 
    }).then(() => { fecharModalEdicao(); showToast("Pedido Editado!"); });
}

// ==========================================
// PDFS E ETIQUETAS
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

function gerarPDFFaturamento() {
    let mes = document.getElementById('selectFaturamentoMes').value; if(mes==='ALL') return;
    let pagos = todosPedidos.filter(p => p.statusPagamento === 'PAGO' && p.dataMesAno === mes);
    if(!pagos.length) { showToast("Sem vendas!", true); return; }
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    desenharCabecalhoPDF(doc, `RELATÓRIO FINANCEIRO: ${mes}`);
    
    let soma = 0; let rows = pagos.map(p => { soma+=parseFloat(p.valorTotal); return [`#${p.numeroPedido}`, p.dataFormatada, p.nome, p.metodoPagamento, formatCurrency(p.valorTotal)]; });
    doc.autoTable({ startY: 35, head: [['Pedido', 'Data', 'Cliente', 'Pgto', 'Valor']], body: rows, foot: [[ { content: 'TOTAL:', colSpan: 4, styles: { halign: 'right'} }, { content: formatCurrency(soma), styles: { halign: 'right', fillColor: [6,214,160], textColor:[0,0,0] } } ]], theme: 'grid', headStyles: { fillColor: [0,0,0] } });
    doc.save(`waller_faturamento_${mes.replace('/','-')}.pdf`); fecharModalPDF();
}
