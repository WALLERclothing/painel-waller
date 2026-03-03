const el = (id) => document.getElementById(id);

const firebaseConfig = {
    apiKey: "AIzaSyDnch84Sl5VyIi0YmOAde4jTftsssLEsNA",
    authDomain: "banco-de-dados-waller.firebaseapp.com",
    projectId: "banco-de-dados-waller",
    storageBucket: "banco-de-dados-waller.firebasestorage.app",
    messagingSenderId: "595978694752",
    appId: "1:595978694752:web:69aa74348560268a5a1305"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }

// ================= OFFLINE PERSISTENCE =================
firebase.firestore().enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') console.log('Múltiplas abas abertas.');
      else if (err.code == 'unimplemented') console.log('Browser não suporta offline.');
  });
const db = firebase.firestore();

const STATUS_LIST = ['PEDIDO FEITO', 'AGUARDANDO PAGAMENTO', 'EM SEPARAÇÃO', 'ENVIO EFETUADO', 'PEDIDO ENTREGUE'];

let estampasCache = []; let carrinhoTemporario = []; let carrinhoEdicao = [];
let pedidosCache = []; let clientesCache = []; let clientesPurosCache = []; let filtroAtual = 'TODOS';
let pedidoEmEdicaoId = null; let pedidosSelecionados = [];

// ================= FUNÇÕES DE BLINDAGEM E UX =================
function upper(v) { return String(v || '').trim().toUpperCase(); }
function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }
function formatCurrency(num) { const value = parseFloat(num) || 0; return `R$ ${value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`; }
function unmaskCurrency(value) { if (!value) return 0; return parseFloat(String(value).replace(/[^\d,]/g, '').replace(',', '.')) || 0; }

// Proteção contra dados quebrados no banco
function escapeStr(v) { return String(v || '').replace(/[\r\n]+/g, ' ').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function safeItens(itens) { 
    if (!Array.isArray(itens)) return []; 
    return itens.filter(i => i && typeof i === 'object'); 
}

function parseFirestoreDate(fbDate) {
    if (!fbDate) return null;
    if (fbDate.toDate && typeof fbDate.toDate === 'function') return fbDate.toDate();
    if (fbDate.seconds) return new Date(fbDate.seconds * 1000);
    const d = new Date(fbDate); return isNaN(d.getTime()) ? null : d;
}

function formatDate(dateValue) { 
    const d = parseFirestoreDate(dateValue);
    if (!d) return '-'; return d.toLocaleDateString('pt-BR'); 
}

function getItensResumo(itens) { 
    const arr = safeItens(itens);
    if (arr.length === 0) return 'Sem itens'; 
    return arr.map((item) => `${item.quantidade || 1}x ${escapeStr(item.nomeEstampa || item.codigoEstampa)}`).join(' • '); 
}

function primeiroNome(nome = '') { return (String(nome).trim().split(' ')[0] || 'cliente'); }

function showToast(msg, type = 'success') {
    const container = el('toast-container'); 
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; toast.innerText = msg;
    container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}

function copiarTexto(texto) { navigator.clipboard.writeText(texto).then(() => showToast('Copiado: ' + texto, 'info')); }

// MÁSCARAS
function maskPhone(v) { v = String(v).replace(/\D/g, ''); v = v.replace(/^(\d{2})(\d)/g, '($1) $2'); v = v.replace(/(\d)(\d{4})$/, '$1-$2'); return v.slice(0, 15); }
function maskCPFCNPJ(v) { v = String(v).replace(/\D/g, ''); if (v.length <= 11) { v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return v; } else { v = v.replace(/^(\d{2})(\d)/, '$1.$2'); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); v = v.replace(/\.(\d{3})(\d)/, '.$1/$2'); v = v.replace(/(\d{4})(\d)/, '$1-$2'); return v.slice(0, 18); } }
function maskCEP(v) { v = String(v).replace(/\D/g, ''); v = v.replace(/(\d{5})(\d)/, '$1-$2'); return v.slice(0, 9); }

function setupAutoFields(idWhats, idInsta, idCpf, idCep, idCidade, idEstado, idEndereco) {
    const whats = el(idWhats); const insta = el(idInsta); const cpf = el(idCpf); const cep = el(idCep);
    const cidade = el(idCidade); const estado = el(idEstado); const endereco = el(idEndereco);
    if(whats) whats.addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); if (e.target.value.length === 15 && insta) insta.focus(); });
    if(cpf) cpf.addEventListener('input', (e) => { let raw = String(e.target.value).replace(/\D/g, ''); e.target.value = maskCPFCNPJ(e.target.value); if (raw.length === 11 && cep) cep.focus(); });
    if(cep) cep.addEventListener('input', (e) => {
        e.target.value = maskCEP(e.target.value);
        if (e.target.value.length === 9) {
            fetch(`https://viacep.com.br/ws/${e.target.value.replace('-','')}/json/`).then(r => r.json()).then(data => {
                if(!data.erro) { if(cidade) cidade.value = upper(data.localidade); if(estado) estado.value = upper(data.uf); if(endereco) { endereco.value = upper(data.logradouro + (data.bairro ? ' - ' + data.bairro : '')); endereco.focus(); } } else { if(endereco) endereco.focus(); }
            }).catch(() => { if(endereco) endereco.focus(); });
        }
    });
}

// ATALHOS GLOBAIS
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); mudarAba('cadastro'); el('nome').focus(); }
    if (e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); mudarAba('producao'); el('inputBusca').focus(); }
});

// SOM MECÂNICO
function playMechSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

function mudarAba(aba) {
    if(el('aba-cadastro')) el('aba-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
    if(el('aba-producao')) el('aba-producao').style.display = aba === 'producao' ? 'block' : 'none';
    if(el('aba-estampas')) el('aba-estampas').style.display = aba === 'estampas' ? 'block' : 'none';
    if(el('aba-clientes')) el('aba-clientes').style.display = aba === 'clientes' ? 'block' : 'none';
    
    if(el('tabCadastroBtn')) el('tabCadastroBtn').classList.toggle('tab-active', aba === 'cadastro');
    if(el('tabProducaoBtn')) el('tabProducaoBtn').classList.toggle('tab-active', aba === 'producao');
    if(el('tabEstampasBtn')) el('tabEstampasBtn').classList.toggle('tab-active', aba === 'estampas');
    if(el('tabClientesBtn')) el('tabClientesBtn').classList.toggle('tab-active', aba === 'clientes');
}

function alternarTema() { const dark = document.body.classList.toggle('dark-mode'); localStorage.setItem('temaWaller', dark ? 'dark' : 'light'); if(el('btnTema')) el('btnTema').innerHTML = dark ? '🌙 Tema claro' : '🌙 Tema escuro'; }
function carregarTema() { if (localStorage.getItem('temaWaller') === 'dark') { document.body.classList.add('dark-mode'); if(el('btnTema')) el('btnTema').innerHTML = '🌙 Tema claro'; } }

// ================= AUTO-SAVE RASCUNHO =================
function salvarRascunho() {
    try {
        const data = {
            nome: el('nome')?el('nome').value:'', whatsapp: el('whatsapp')?el('whatsapp').value:'', instagram: el('instagram')?el('instagram').value:'', cpf: el('cpf')?el('cpf').value:'', cep: el('cep')?el('cep').value:'', cidade: el('cidade')?el('cidade').value:'', estado: el('estado')?el('estado').value:'',
            endereco: el('endereco')?el('endereco').value:'', complemento: el('complemento')?el('complemento').value:'', referencia: el('referencia')?el('referencia').value:'', frete: el('valorFrete')?el('valorFrete').value:'', desconto: el('valorDesconto')?el('valorDesconto').value:'', pag: el('metodoPagamento')?el('metodoPagamento').value:'', status: el('statusPagamento')?el('statusPagamento').value:'', carrinho: carrinhoTemporario
        };
        localStorage.setItem('wallerRascunho', JSON.stringify(data));
    } catch(e){}
}
function carregarRascunho() {
    try {
        const saved = localStorage.getItem('wallerRascunho');
        if (saved) {
            const data = JSON.parse(saved);
            if(el('nome')) el('nome').value = data.nome || ''; if(el('whatsapp')) el('whatsapp').value = data.whatsapp || ''; if(el('instagram')) el('instagram').value = data.instagram || ''; if(el('cpf')) el('cpf').value = data.cpf || ''; if(el('cep')) el('cep').value = data.cep || ''; if(el('cidade')) el('cidade').value = data.cidade || ''; if(el('estado')) el('estado').value = data.estado || '';
            if(el('endereco')) el('endereco').value = data.endereco || ''; if(el('complemento')) el('complemento').value = data.complemento || ''; if(el('referencia')) el('referencia').value = data.referencia || ''; if(el('valorFrete')) el('valorFrete').value = data.frete || ''; if(el('valorDesconto')) el('valorDesconto').value = data.desconto || ''; if(data.pag && el('metodoPagamento')) el('metodoPagamento').value = data.pag; if(data.status && el('statusPagamento')) el('statusPagamento').value = data.status;
            carrinhoTemporario = safeItens(data.carrinho); atualizarTelaCarrinho();
        }
    } catch(e){}
}
if(el('aba-cadastro')) el('aba-cadastro').addEventListener('input', salvarRascunho);

// ================= LANÇAR DROP / PEDIDO =================
function autoPreencherCliente() {
    const numWhats = onlyDigits(el('whatsapp')?el('whatsapp').value:''); if (!numWhats) return;
    const clienteExistente = clientesCache.find(c => onlyDigits(c.whatsapp) === numWhats);
    if (clienteExistente) {
        if(clienteExistente.blacklist) {
            document.body.style.boxShadow = "inset 0 0 50px #dc2626"; showToast("⚠️ ATENÇÃO: CLIENTE NA BLACKLIST!", "error");
            setTimeout(() => document.body.style.boxShadow = "", 3000);
        } else {
            if(el('whatsapp')) el('whatsapp').style.borderColor = '#16a34a';
            if(clienteExistente.totalPedidos > 0) showToast(`Bem-vindo de volta! ${clienteExistente.totalPedidos + 1}ª compra.`, 'info');
            setTimeout(() => { if(el('whatsapp')) el('whatsapp').style.borderColor = '#333'; }, 1500);
        }
        if (el('nome') && !el('nome').value) el('nome').value = clienteExistente.nome || '';
        if(el('instagram')) el('instagram').value = clienteExistente.instagram || ''; if(el('cpf')) el('cpf').value = clienteExistente.documento || ''; if(el('cep')) el('cep').value = clienteExistente.cep || ''; if(el('cidade')) el('cidade').value = clienteExistente.cidade || ''; if(el('estado')) el('estado').value = clienteExistente.estado || '';
        if(el('endereco')) el('endereco').value = clienteExistente.endereco || ''; if(el('complemento')) el('complemento').value = clienteExistente.complemento || ''; if(el('referencia')) el('referencia').value = clienteExistente.referencia || '';
        salvarRascunho();
    }
}

function limparLancarDrop(manual = false) {
    if(manual && !confirm("Limpar todo o formulário?")) return;
    document.querySelectorAll('#aba-cadastro input').forEach(input => input.value = '');
    if(el('metodoPagamento')) el('metodoPagamento').value = 'PIX'; if(el('statusPagamento')) el('statusPagamento').value = 'PAGO'; if(el('tipoPeca')) el('tipoPeca').value = 'OVERSIZED';
    if(el('tamanho')) el('tamanho').value = 'P'; if(el('cor')) el('cor').value = 'PRETA'; if(el('quantidade')) el('quantidade').value = 1; if(el('mensagemAutoPreenchimento')) el('mensagemAutoPreenchimento').textContent = '';
    if(el('custoOculto')) el('custoOculto').value = '';
    carrinhoTemporario = []; atualizarTelaCarrinho(); localStorage.removeItem('wallerRascunho');
}

function preencherEstampaPorCodigo() {
    if(!el('codigoEstampa')) return;
    const codigo = upper(el('codigoEstampa').value); el('codigoEstampa').value = codigo;
    const feedback = el('mensagemAutoPreenchimento');
    if (!codigo) { if(feedback){ feedback.textContent = ''; feedback.className = 'helper-text'; } return; }

    const encontrada = estampasCache.find((item) => item.codigo === codigo);
    if (!encontrada) { if(feedback){ feedback.textContent = 'Produto não encontrado.'; feedback.className = 'helper-text warn'; } return; }

    if(el('nomeEstampa')) el('nomeEstampa').value = encontrada.nome; 
    if(el('valorUnitario')) el('valorUnitario').value = formatCurrency(encontrada.valor || 0);
    if(el('custoOculto')) el('custoOculto').value = encontrada.custo || 0;
    if (encontrada.tipoPadrao && el('tipoPeca')) { el('tipoPeca').value = encontrada.tipoPadrao; }
    
    const tamSelecionado = el('tamanho') ? el('tamanho').value : 'UN'; 
    const stockTam = encontrada.estoque[tamSelecionado] || 0;
    if(feedback) {
        feedback.textContent = `Encontrado: ${encontrada.nome} (Stock ${tamSelecionado}: ${stockTam})`;
        feedback.className = `helper-text ${stockTam > 0 ? 'ok' : 'warn'}`;
    }
}

function adicionarAoCarrinho() {
    const cod = upper(el('codigoEstampa')?el('codigoEstampa').value:''); const nom = upper(el('nomeEstampa')?el('nomeEstampa').value:'');
    const tam = el('tamanho')?el('tamanho').value:'UN'; const qtd = parseInt(el('quantidade')?el('quantidade').value:1, 10) || 1;
    if (!cod || !nom) return showToast('Preencha código e nome!', 'warning');

    const estampa = estampasCache.find(e => e.codigo === cod);
    const stockAtual = estampa ? (estampa.estoque[tam] || 0) : 0;
    
    if (qtd > stockAtual) {
        if(el('quantidade')) { el('quantidade').classList.add('error-blink'); setTimeout(() => el('quantidade').classList.remove('error-blink'), 1500); }
        showToast(`Aviso: Venda forçada. O stock de ${tam} era apenas ${stockAtual}.`, 'warning');
    }

    carrinhoTemporario.push({ 
        codigoEstampa: cod, nomeEstampa: nom, tipoPeca: el('tipoPeca')?el('tipoPeca').value:'', tamanho: tam, cor: el('cor')?el('cor').value:'', 
        quantidade: qtd, valorUnitario: unmaskCurrency(el('valorUnitario')?el('valorUnitario').value:0), custoUnitario: Number(el('custoOculto')?el('custoOculto').value:0) || 0
    });
    atualizarTelaCarrinho(); salvarRascunho();
    if(el('codigoEstampa')) el('codigoEstampa').value = ''; if(el('nomeEstampa')) el('nomeEstampa').value = ''; if(el('valorUnitario')) el('valorUnitario').value = ''; if(el('quantidade')) el('quantidade').value = 1; if(el('custoOculto')) el('custoOculto').value = ''; if(el('mensagemAutoPreenchimento')) el('mensagemAutoPreenchimento').textContent = '';
}

function atualizarTelaCarrinho() {
    try {
        let somaItens = 0; if(!el('listaCarrinho')) return;
        el('listaCarrinho').innerHTML = '';
        carrinhoTemporario.forEach((p, index) => {
            if(!p) return;
            somaItens += p.quantidade * p.valorUnitario;
            el('listaCarrinho').innerHTML += `<div class="item-carrinho"><div><strong>${p.quantidade}x ${escapeStr(p.tipoPeca)} (${escapeStr(p.tamanho)})</strong> • ${escapeStr(p.nomeEstampa)} <br><small>Cor: ${escapeStr(p.cor)} | Unitário: ${formatCurrency(p.valorUnitario)}</small></div><div><strong>${formatCurrency(p.quantidade * p.valorUnitario)}</strong><button type="button" class="btn-excluir-item" onclick="removerDoCarrinho(${index})"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg></button></div></div>`;
        });
        
        const frete = unmaskCurrency(el('valorFrete')?el('valorFrete').value:0);
        const desconto = unmaskCurrency(el('valorDesconto')?el('valorDesconto').value:0);
        let totalReal = somaItens + frete - desconto;
        if (totalReal < 0) totalReal = 0;

        if(el('valorTotal')) el('valorTotal').value = formatCurrency(totalReal);
    } catch(e) { console.error(e); }
}

function removerDoCarrinho(index) { carrinhoTemporario.splice(index, 1); atualizarTelaCarrinho(); salvarRascunho(); }

async function salvarPedidoCompleto() {
    try {
        const nomeEl = el('nome'); if(!nomeEl) return;
        const nome = upper(nomeEl.value);
        if (!nome || carrinhoTemporario.length === 0) return showToast('Preencha o nome e adicione itens!', 'warning');

        const statusEl = el('statusPagamento');
        const statusBase = (statusEl && statusEl.value === 'PENDENTE') ? 'AGUARDANDO PAGAMENTO' : 'PEDIDO FEITO';
        
        let totalCusto = 0;
        carrinhoTemporario.forEach(i => { if(i) totalCusto += (i.custoUnitario || 0) * i.quantidade });
        const frete = unmaskCurrency(el('valorFrete') ? el('valorFrete').value : 0);
        const desconto = unmaskCurrency(el('valorDesconto') ? el('valorDesconto').value : 0);
        const total = unmaskCurrency(el('valorTotal') ? el('valorTotal').value : 0);
        const lucroLiquido = total - frete - totalCusto;

        const dadosPedido = {
            nome, whatsapp: upper(el('whatsapp') ? el('whatsapp').value : ''), instagram: upper(el('instagram') ? el('instagram').value : ''), 
            documento: upper(el('cpf') ? el('cpf').value : ''), cep: upper(el('cep') ? el('cep').value : ''), cidade: upper(el('cidade') ? el('cidade').value : ''),
            estado: upper(el('estado') ? el('estado').value : ''), endereco: upper(el('endereco') ? el('endereco').value : ''), complemento: upper(el('complemento') ? el('complemento').value : ''), 
            referencia: upper(el('referencia') ? el('referencia').value : ''),
            valorTotal: total, valorFrete: frete, valorDesconto: desconto, lucroTotal: lucroLiquido, metodoPagamento: el('metodoPagamento') ? el('metodoPagamento').value : 'PIX',
            statusPagamento: el('statusPagamento') ? el('statusPagamento').value : 'PAGO', itens: carrinhoTemporario, rastreio: '', status: statusBase, numeroPedido: Math.floor(1000 + Math.random() * 9000).toString(),
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('pedidos').add(dadosPedido);
        carrinhoTemporario.forEach(item => {
            if(!item) return;
            const campoEstoque = `estoque.${item.tamanho}`;
            db.collection('estampas').doc(item.codigoEstampa).update({ [campoEstoque]: firebase.firestore.FieldValue.increment(-item.quantidade) }).catch(e => console.log('Erro ao baixar stock.'));
        });
        
        const idCliente = onlyDigits(dadosPedido.whatsapp) || `${Date.now()}`;
        db.collection('clientes').doc(idCliente).set({
            nome: dadosPedido.nome, whatsapp: dadosPedido.whatsapp, instagram: dadosPedido.instagram, documento: dadosPedido.documento, cep: dadosPedido.cep, cidade: dadosPedido.cidade, estado: dadosPedido.estado,
            endereco: dadosPedido.endereco, complemento: dadosPedido.complemento, referencia: dadosPedido.referencia
        }, { merge: true });

        showToast('🚀 Pedido gerado e stock atualizado!'); limparLancarDrop(false); mudarAba('producao');
    } catch(e) { console.error(e); showToast("Erro ao salvar pedido.", "error"); }
}

// ================= EDIÇÃO DE PEDIDO BLINDADA =================
function abrirFichaPedido(idPedido) {
    try {
        const pedido = pedidosCache.find((p) => p.id === idPedido); if (!pedido) return;
        if(el('fichaPedidoTitulo')) el('fichaPedidoTitulo').textContent = `Detalhes do Pedido #${pedido.numeroPedido || '----'}`;
        if(el('fichaPedidoConteudo')) el('fichaPedidoConteudo').innerHTML = `
            <div class="cliente-ficha-grid" style="margin-bottom: 1rem;">
                <p><strong>Cliente:</strong> ${escapeStr(pedido.nome) || '-'}</p>
                <p><strong>WhatsApp:</strong> ${escapeStr(pedido.whatsapp) || '-'}</p>
                <p><strong>Status:</strong> ${escapeStr(pedido.status) || '-'}</p>
                <p><strong>Pagamento:</strong> ${escapeStr(pedido.metodoPagamento) || '-'} (${escapeStr(pedido.statusPagamento) || '-'})</p>
                <p><strong>Endereço:</strong> ${escapeStr(pedido.endereco) || '-'} ${pedido.complemento ? `- ${escapeStr(pedido.complemento)}` : ''}, ${escapeStr(pedido.cidade) || '-'}/${escapeStr(pedido.estado) || '-'}</p>
                <p><strong>Desconto:</strong> ${formatCurrency(pedido.valorDesconto || 0)}</p>
                <p><strong>Frete:</strong> ${formatCurrency(pedido.valorFrete || 0)}</p>
                <p><strong>Total Final:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
            </div>
            <h3 class="form-section-title">Peças no pedido</h3>
            <div style="margin-bottom: 1.5rem;">
                ${safeItens(pedido.itens).map(i => {
                    if(!i) return '';
                    return `<div class="item-carrinho"><div><strong>${i.quantidade}x ${escapeStr(i.tipoPeca)} (${escapeStr(i.tamanho)})</strong> • ${escapeStr(i.nomeEstampa || i.codigoEstampa)}<br><small>Cor: ${escapeStr(i.cor)} | ${formatCurrency(i.valorUnitario)}</small></div></div>`;
                }).join('')}
            </div>
            <button class="btn-primary" onclick="abrirModalEditarPedido('${pedido.id}')">✏️ EDITAR ESTE PEDIDO</button>
        `;
        if(el('modalFichaPedido')) el('modalFichaPedido').style.display = 'flex';
    } catch(e) { console.error(e); showToast("Erro ao abrir pedido.", "error"); }
}
function fecharFichaPedido() { if(el('modalFichaPedido')) el('modalFichaPedido').style.display = 'none'; }

function abrirModalEditarPedido(idPedido) {
    try {
        const pedido = pedidosCache.find(p => p.id === idPedido); if (!pedido) return;
        pedidoEmEdicaoId = pedido.id;
        
        const setV = (id, val) => { const x = el(id); if(x) x.value = val; };
        
        setV('editPedNome', pedido.nome || ''); setV('editPedWhatsapp', pedido.whatsapp || ''); setV('editPedInstagram', pedido.instagram || '');
        setV('editPedCpf', pedido.documento || ''); setV('editPedCep', pedido.cep || ''); setV('editPedCidade', pedido.cidade || '');
        setV('editPedEstado', pedido.estado || ''); setV('editPedEndereco', pedido.endereco || ''); setV('editPedComplemento', pedido.complemento || '');
        setV('editPedReferencia', pedido.referencia || ''); setV('editPedRastreio', pedido.rastreio || '');
        setV('editPedFrete', formatCurrency(pedido.valorFrete || 0)); 
        setV('editPedDesconto', formatCurrency(pedido.valorDesconto || 0));
        setV('editPedMetodo', pedido.metodoPagamento || 'PIX'); setV('editPedStatusPagamento', pedido.statusPagamento || 'PAGO');

        carrinhoEdicao = JSON.parse(JSON.stringify(safeItens(pedido.itens)));
        atualizarTelaCarrinhoEdicao(); fecharFichaPedido(); 
        
        const mod = el('modalEditarPedidoCompleto'); if(mod) mod.style.display = 'flex';
    } catch(e) { console.error(e); showToast("Erro ao carregar edição.", "error"); }
}
function fecharModalEditarPedido() { const mod = el('modalEditarPedidoCompleto'); if(mod) mod.style.display = 'none'; pedidoEmEdicaoId = null; carrinhoEdicao = []; }

function preencherEstampaPorCodigoEdicao() {
    const codEl = el('editPedCodigoEstampa'); if(!codEl) return;
    const codigo = upper(codEl.value); codEl.value = codigo; const feedback = el('mensagemAutoPreenchimentoEdicao');
    if (!codigo) { if(feedback) {feedback.textContent = ''; feedback.className = 'helper-text';} return; }
    const encontrada = estampasCache.find((item) => item.codigo === codigo);
    if (!encontrada) { if(feedback) {feedback.textContent = 'Produto não encontrado.'; feedback.className = 'helper-text warn';} return; }
    if(el('editPedNomeEstampa')) el('editPedNomeEstampa').value = encontrada.nome; 
    if(el('editPedValorUnitario')) el('editPedValorUnitario').value = formatCurrency(encontrada.valor || 0); 
    if(el('editPedCustoOculto')) el('editPedCustoOculto').value = encontrada.custo || 0;
    if (encontrada.tipoPadrao && el('editPedTipoPeca')) { el('editPedTipoPeca').value = encontrada.tipoPadrao; }
    if(feedback) { feedback.textContent = `Encontrado: ${encontrada.nome}`; feedback.className = 'helper-text ok'; }
}

function adicionarAoCarrinhoEdicaoInput() {
    const cod = upper(el('editPedCodigoEstampa')?el('editPedCodigoEstampa').value:''); const nom = upper(el('editPedNomeEstampa')?el('editPedNomeEstampa').value:'');
    if (!cod || !nom) return showToast('Preencha código e nome do produto!', 'warning');
    carrinhoEdicao.push({ codigoEstampa: cod, nomeEstampa: nom, tipoPeca: el('editPedTipoPeca')?el('editPedTipoPeca').value:'', tamanho: el('editPedTamanho')?el('editPedTamanho').value:'', cor: el('editPedCor')?el('editPedCor').value:'', quantidade: parseInt(el('editPedQuantidade')?el('editPedQuantidade').value:'1', 10) || 1, valorUnitario: unmaskCurrency(el('editPedValorUnitario')?el('editPedValorUnitario').value:0), custoUnitario: Number(el('editPedCustoOculto')?el('editPedCustoOculto').value:0) || 0 });
    atualizarTelaCarrinhoEdicao(); 
    if(el('editPedCodigoEstampa')) el('editPedCodigoEstampa').value = ''; if(el('editPedNomeEstampa')) el('editPedNomeEstampa').value = ''; if(el('editPedValorUnitario')) el('editPedValorUnitario').value = ''; if(el('editPedQuantidade')) el('editPedQuantidade').value = 1; if(el('editPedCustoOculto')) el('editPedCustoOculto').value = ''; if(el('mensagemAutoPreenchimentoEdicao')) el('mensagemAutoPreenchimentoEdicao').textContent = '';
}

function atualizarTelaCarrinhoEdicao() {
    try {
        let somaItens = 0; const container = el('listaCarrinhoEdicao');
        if(!container) return;
        container.innerHTML = '';
        if(carrinhoEdicao.length === 0) container.innerHTML = '<p style="color:#d90429; font-size:0.8rem; margin:0;">Pedido ficará sem itens se salvo assim.</p>';
        carrinhoEdicao.forEach((p, index) => {
            if(!p) return;
            somaItens += p.quantidade * p.valorUnitario;
            container.innerHTML += `<div class="item-carrinho"><div><strong>${p.quantidade}x ${escapeStr(p.tipoPeca)} (${escapeStr(p.tamanho)})</strong> • ${escapeStr(p.nomeEstampa)}</div><div><strong>${formatCurrency(p.quantidade * p.valorUnitario)}</strong><button type="button" class="btn-excluir-item" onclick="removerDoCarrinhoEdicao(${index})">X</button></div></div>`;
        });
        
        const freteEl = el('editPedFrete'); const descEl = el('editPedDesconto');
        const frete = freteEl ? unmaskCurrency(freteEl.value) : 0;
        const desconto = descEl ? unmaskCurrency(descEl.value) : 0;
        let totalReal = somaItens + frete - desconto;
        if(totalReal < 0) totalReal = 0;

        const valTotalEl = el('editPedValorTotal'); if(valTotalEl) valTotalEl.value = formatCurrency(totalReal); 
        const dispTotalEl = el('displayEditTotal'); if(dispTotalEl) dispTotalEl.textContent = formatCurrency(totalReal);
    } catch(e) { console.error(e); }
}

function removerDoCarrinhoEdicao(index) { carrinhoEdicao.splice(index, 1); atualizarTelaCarrinhoEdicao(); }

async function salvarEdicaoPedidoDefinitiva() {
    try {
        if (!pedidoEmEdicaoId) return;
        let totalCusto = 0; carrinhoEdicao.forEach(i => { if(i) totalCusto += (i.custoUnitario || 0) * i.quantidade });
        
        const valTotalEl = el('editPedValorTotal'); const freteEl = el('editPedFrete'); const descEl = el('editPedDesconto');
        const totalCalc = valTotalEl ? unmaskCurrency(valTotalEl.value) : 0;
        const freteCalc = freteEl ? unmaskCurrency(freteEl.value) : 0;
        const descontoCalc = descEl ? unmaskCurrency(descEl.value) : 0;
        const lucroLiquido = totalCalc - freteCalc - totalCusto;

        const dadosEditados = {
            nome: upper(el('editPedNome')?el('editPedNome').value:''), whatsapp: upper(el('editPedWhatsapp')?el('editPedWhatsapp').value:''), instagram: upper(el('editPedInstagram')?el('editPedInstagram').value:''),
            documento: upper(el('editPedCpf')?el('editPedCpf').value:''), cep: upper(el('editPedCep')?el('editPedCep').value:''), cidade: upper(el('editPedCidade')?el('editPedCidade').value:''),
            estado: upper(el('editPedEstado')?el('editPedEstado').value:''), endereco: upper(el('editPedEndereco')?el('editPedEndereco').value:''), complemento: upper(el('editPedComplemento')?el('editPedComplemento').value:''),
            referencia: upper(el('editPedReferencia')?el('editPedReferencia').value:''), rastreio: upper(el('editPedRastreio')?el('editPedRastreio').value:''),
            metodoPagamento: el('editPedMetodo')?el('editPedMetodo').value:'PIX', statusPagamento: el('editPedStatusPagamento')?el('editPedStatusPagamento').value:'PAGO',
            itens: carrinhoEdicao, valorFrete: freteCalc, valorDesconto: descontoCalc, valorTotal: totalCalc, lucroTotal: lucroLiquido
        };
        await db.collection('pedidos').doc(pedidoEmEdicaoId).update(dadosEditados);
        showToast('✅ Pedido atualizado com sucesso!'); fecharModalEditarPedido();
    } catch(e) { console.error(e); showToast("Erro ao salvar", "error"); }
}

// ================= WHATSAPP E FERRAMENTAS =================
function mensagemWhatsInformal(pedido) {
    const nome = primeiroNome(pedido.nome); let itensTexto = '';
    safeItens(pedido.itens).forEach(i => {
        if(!i) return;
        itensTexto += `▪ ${i.quantidade || 1}x ${escapeStr(i.tipoPeca || 'PECA')} | ${escapeStr(i.nomeEstampa || i.codigoEstampa)}\n  Tamanho: ${escapeStr(i.tamanho || '-')} | Cor: ${escapeStr(i.cor || '-')}\n  Valor: ${formatCurrency(i.valorUnitario || 0)}\n\n`; 
    });
    let txt = `Fala, ${nome}!\n\nPassando pra atualizar que seu pedido *#${pedido.numeroPedido || ''}* esta: *${pedido.status || 'PROCESSANDO'}*.\n\n*RESUMO DO SEU DROP:*\n${itensTexto}`;
    if(pedido.valorFrete > 0) txt += `*FRETE:* ${formatCurrency(pedido.valorFrete)}\n`;
    if(pedido.valorDesconto > 0) txt += `*DESCONTO:* -${formatCurrency(pedido.valorDesconto)}\n`;
    txt += `*TOTAL DO PEDIDO:* ${formatCurrency(pedido.valorTotal || 0)}\n\nQualquer duvida, e so dar um salve por aqui!`; return txt;
}
function linkWhatsPedido(pedido) { const num = onlyDigits(pedido.whatsapp); if (!num) return '#'; return `https://wa.me/55${num}?text=${encodeURIComponent(mensagemWhatsInformal(pedido))}`; }

function enviarCobranca(pedidoId) {
    const p = pedidosCache.find(x => x.id === pedidoId); if(!p || !onlyDigits(p.whatsapp)) return showToast('WhatsApp não encontrado', 'warning');
    const texto = `Fala, ${primeiroNome(p.nome)}! 💀\n\nPassando pra lembrar que seu pedido *#${p.numeroPedido}* tá separadinho aqui, só aguardando o pagamento para fazermos o envio!\n\nValor: *${formatCurrency(p.valorTotal)}*\n\nAssim que fizer, manda o comprovante aqui pra gente liberar a caixa! 🔥`;
    window.open(`https://wa.me/55${onlyDigits(p.whatsapp)}?text=${encodeURIComponent(texto)}`, '_blank');
}
function enviarRastreio(pedidoId) {
    const p = pedidosCache.find(x => x.id === pedidoId); if(!p || !onlyDigits(p.whatsapp) || !p.rastreio) return showToast('Sem código de rastreio', 'warning');
    const link = `https://www.linkcorreios.com.br/${p.rastreio}`;
    const texto = `Fala, ${primeiroNome(p.nome)}! O teu drop já está a caminho! 🚀\n\n📦 Código: *${p.rastreio}*\n\nAcompanha por aqui: ${link}`;
    window.open(`https://wa.me/55${onlyDigits(p.whatsapp)}?text=${encodeURIComponent(texto)}`, '_blank');
}
function enviarFeedback(pedidoId) {
    const p = pedidosCache.find(x => x.id === pedidoId); if(!p || !onlyDigits(p.whatsapp)) return showToast('WhatsApp não encontrado', 'warning');
    const texto = `Fala, ${primeiroNome(p.nome)}! Tudo certo? 💀\n\nJá se passaram uns dias desde que recebeu o seu drop da Waller. O que achou do caimento e da qualidade das peças?\n\nSe curtiu, tira uma foto brava e marca a gente no Insta! 🔥`;
    window.open(`https://wa.me/55${onlyDigits(p.whatsapp)}?text=${encodeURIComponent(texto)}`, '_blank');
}

// ================= KANBAN, BULK & DRAG =================
function statusClass(status) {
    if (status === 'AGUARDANDO PAGAMENTO') return 'badge-pendente'; if (status === 'EM SEPARAÇÃO') return 'badge-estampa';
    if (status === 'ENVIO EFETUADO') return 'badge-enviado'; if (status === 'PEDIDO ENTREGUE') return 'badge-entregue'; return 'badge-default';
}
function statusOptionsSelecionado(atual) { return STATUS_LIST.map((status) => `<option value="${status}" ${status === atual ? 'selected' : ''}>${status}</option>`).join(''); }
function abrirSanfonaStatus(id, statusAtual) { return `<details class="status-sanfona"><summary>Mudar Estado</summary><select id="status-select-${id}">${statusOptionsSelecionado(statusAtual)}</select><button class="btn-add" style="width:100%; margin-top:5px; background:#fff; color:#000;" onclick="salvarStatusPedido('${id}','status-select-${id}')">Salvar</button></details>`; }
async function salvarStatusPedido(id, selectId) { const sel = el(selectId); if(!sel) return; const status = upper(sel.value); await db.collection('pedidos').doc(id).update({ status }); showToast('Status atualizado!'); }

async function confirmarPagamentoPedido(id) {
    if(!confirm('Confirmar pagamento deste pedido? Ele será movido para EM SEPARAÇÃO.')) return;
    await db.collection('pedidos').doc(id).update({ statusPagamento: 'PAGO', status: 'EM SEPARAÇÃO' });
    showToast('Pagamento confirmado!'); playMechSound();
}

async function avancarPedido(id, statusAtual) {
    const idx = STATUS_LIST.indexOf(statusAtual);
    if(idx < STATUS_LIST.length - 1) {
        const novoStatus = STATUS_LIST[idx + 1];
        await db.collection('pedidos').doc(id).update({ status: novoStatus }); showToast(`Avançado para ${novoStatus}`); playMechSound();
    }
}

function toggleSelecao(id) {
    const idx = pedidosSelecionados.indexOf(id);
    if(idx > -1) pedidosSelecionados.splice(idx, 1); else pedidosSelecionados.push(id);
    const bar = el('bulkBar');
    if(!bar) return;
    if(pedidosSelecionados.length > 0) { bar.style.display = 'flex'; const bc = el('bulkCount'); if(bc) bc.textContent = pedidosSelecionados.length; } else { bar.style.display = 'none'; }
}

async function avancarSelecionados() {
    if(pedidosSelecionados.length === 0) return;
    const targetEl = el('bulkStatusTarget'); if(!targetEl) return;
    const target = targetEl.value;
    for(let id of pedidosSelecionados) { await db.collection('pedidos').doc(id).update({ status: target }); }
    showToast(`${pedidosSelecionados.length} pedidos movidos!`); playMechSound(); pedidosSelecionados = []; 
    const bar = el('bulkBar'); if(bar) bar.style.display = 'none'; 
    aplicarFiltros();
}

function excluirPedido(id) { if (confirm('Tem certeza que deseja excluir este pedido?')) db.collection('pedidos').doc(id).delete(); }

function drag(ev, id) { ev.dataTransfer.setData("text", id); }
function allowDrop(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); }
function dragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); }
async function drop(ev, novoStatus) {
    ev.preventDefault(); ev.currentTarget.classList.remove('drag-over'); const id = ev.dataTransfer.getData("text");
    if(id && novoStatus) { await db.collection('pedidos').doc(id).update({ status: novoStatus }); showToast(`Movido para ${novoStatus}`); playMechSound(); }
}

function renderPedidosGrid(lista) {
    try {
        const container = el('gridPedidosContainer'); 
        if(!container) return;
        container.innerHTML = '';
        const grupos = STATUS_LIST.map((status) => ({ status, itens: lista.filter((p) => upper(p.status || 'PEDIDO FEITO') === status) }));

        const iWh = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;
        const iOl = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>`;
        const iLx = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;
        const iAv = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/></svg>`;
        const iFb = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M5 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;
        const iBx = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 0a.5.5 0 0 1 .447.224l4 8a.5.5 0 0 1-.447.67L8 1.118 4.003 8.894a.5.5 0 1 1-.894-.448l4-8A.5.5 0 0 1 8 0zM1 11a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm1.5.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-11z"/></svg>`;
        const iCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/></svg>`;

        let colHtmlTotal = '';
        grupos.forEach((grupo) => {
            const isUltimo = grupo.status === 'PEDIDO ENTREGUE';
            let colHtml = `<section class="kanban-col" ondrop="drop(event, '${grupo.status}')" ondragover="allowDrop(event)" ondragleave="dragLeave(event)">
                <header><h3>${grupo.status}</h3><span>${grupo.itens.length}</span></header>
                <div class="kanban-cards">`;
            
            grupo.itens.forEach((pedido) => {
                const checked = pedidosSelecionados.includes(pedido.id) ? 'checked' : '';
                colHtml += `
                <article class="pedido-card-v2" draggable="true" ondragstart="drag(event, '${pedido.id}')">
                    <div class="pedido-header">
                        <span><input type="checkbox" class="chk-bulk" ${checked} onchange="toggleSelecao('${pedido.id}')"> <strong>#${pedido.numeroPedido}</strong></span>
                        <span class="pedido-badge ${statusClass(grupo.status)}">${grupo.status}</span>
                    </div>
                    <p><strong><span class="copy-text" title="Copiar Nome" onclick="copiarTexto('${escapeStr(pedido.nome)}')">${escapeStr(pedido.nome) || 'SEM NOME'}</span></strong></p>
                    <p><strong>Itens:</strong> ${getItensResumo(pedido.itens)}</p>
                    <p><strong>Pagamento:</strong> ${escapeStr(pedido.metodoPagamento) || 'N/A'} (${escapeStr(pedido.statusPagamento) || 'N/A'})</p>
                    <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
                    
                    ${grupo.status === 'AGUARDANDO PAGAMENTO' ? `<button class="btn-cobrar" onclick="enviarCobranca('${pedido.id}')">💸 Cobrar Pix</button>` : ''}
                    <div class="pedido-actions">
                        ${grupo.status === 'AGUARDANDO PAGAMENTO' ? `<button class="btn-action-icon" style="color:#16a34a; border-color:#16a34a;" title="Confirmar Pagamento" onclick="confirmarPagamentoPedido('${pedido.id}')">${iCheck}</button>` : ''}
                        <a class="btn-action-icon btn-whats-icon" target="_blank" title="WhatsApp" href="${linkWhatsPedido(pedido)}">${iWh}</a>
                        ${pedido.rastreio ? `<button class="btn-action-icon" title="Rastreio Correios" onclick="enviarRastreio('${pedido.id}')">${iBx}</button>` : ''}
                        <button class="btn-action-icon" title="Ver Detalhes" onclick="abrirFichaPedido('${pedido.id}')">${iOl}</button>
                        ${isUltimo ? `<button class="btn-action-icon" style="color:#0ea5e9; border-color:#0ea5e9;" title="Pedir Feedback" onclick="enviarFeedback('${pedido.id}')">${iFb}</button>` : `<button class="btn-action-icon" title="Avançar Fase" onclick="avancarPedido('${pedido.id}', '${grupo.status}')">${iAv}</button>`}
                        <button class="btn-action-icon btn-delete-icon" title="Excluir" onclick="excluirPedido('${pedido.id}')">${iLx}</button>
                    </div>
                </article>`; 
            });
            colHtml += `</div></section>`;
            colHtmlTotal += colHtml;
        });
        container.innerHTML = colHtmlTotal;
    } catch(e) { console.error("Erro render Kanban:", e); }
}

function aplicarFiltros() {
    try {
        const inputBusca = el('inputBusca');
        const busca = upper(inputBusca ? inputBusca.value : '');
        const filtrado = pedidosCache.filter((pedido) => {
            const texto = `${upper(pedido.nome)} ${upper(pedido.whatsapp)} ${upper(getItensResumo(pedido.itens))}`;
            const matchBusca = texto.includes(busca);
            if (filtroAtual === 'TODOS') return matchBusca;
            if (filtroAtual === 'AGUARDANDO PAGAMENTO') return upper(pedido.status) === 'AGUARDANDO PAGAMENTO' && matchBusca;
            if (filtroAtual === 'EM PRODUÇÃO') return ['PEDIDO FEITO', 'EM SEPARAÇÃO'].includes(upper(pedido.status)) && matchBusca;
            if (filtroAtual === 'EM ENVIO') return ['ENVIO EFETUADO'].includes(upper(pedido.status)) && matchBusca;
            return matchBusca;
        });
        renderPedidosGrid(filtrado);
    } catch(e) { console.error(e); }
}

function setFiltroBtn(filtro) {
    filtroAtual = filtro; document.querySelectorAll('.btn-filtro').forEach((btn) => btn.classList.remove('ativo'));
    const idMap = { TODOS: 'filtro-todos', 'AGUARDANDO PAGAMENTO': 'filtro-pagamento', 'EM PRODUÇÃO': 'filtro-producao', 'EM ENVIO': 'filtro-envio' };
    if (idMap[filtro]) {
        const btn = el(idMap[filtro]);
        if(btn) btn.classList.add('ativo');
    }
    aplicarFiltros();
}

function atualizarDashboard(lista) {
    try {
        const mesDashEl = el('mesDash');
        if(!mesDashEl) return;
        const mesFiltro = mesDashEl.value;
        let pedidosMes = [];
        
        if(!mesFiltro) {
            const hoje = new Date();
            pedidosMes = lista.filter((pedido) => {
                const d = parseFirestoreDate(pedido.dataCriacao);
                if (!d) return false;
                return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
            });
        } else {
            const [anoStr, mesStr] = mesFiltro.split('-'); 
            const anoFiltro = parseInt(anoStr); 
            const mesNumFiltro = parseInt(mesStr) - 1;
            pedidosMes = lista.filter((pedido) => {
                const d = parseFirestoreDate(pedido.dataCriacao); 
                if (!d) return false;
                return d.getMonth() === mesNumFiltro && d.getFullYear() === anoFiltro;
            });
        }
        
        const elDashPed = el('dashPedidosMes'); if(elDashPed) elDashPed.textContent = pedidosMes.length;
        const elDashAgu = el('dashAguardandoPagamento'); if(elDashAgu) elDashAgu.textContent = pedidosMes.filter((p) => upper(p.status) === 'AGUARDANDO PAGAMENTO').length;
        const elDashFat = el('dashFaturamento'); if(elDashFat) elDashFat.textContent = formatCurrency(pedidosMes.filter((p) => upper(p.statusPagamento) === 'PAGO').reduce((acc, p) => acc + (p.valorTotal || 0), 0));
        const elDashLuc = el('dashLucro'); if(elDashLuc) elDashLuc.textContent = formatCurrency(pedidosMes.filter((p) => upper(p.statusPagamento) === 'PAGO').reduce((acc, p) => acc + (p.lucroTotal || 0), 0));
    } catch(e) { console.error(e); }
}

// ================= CLIENTES E VIPs =================
function extrairClientesDosPedidos() {
    try {
        const mapa = new Map();
        clientesPurosCache.forEach((c) => { 
            const chave = onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`; 
            if(chave) mapa.set(chave, { ...c, totalPedidos: 0, totalGasto: 0, historicoPedidos: [] }); 
        });

        pedidosCache.forEach((pedido) => {
            const chave = onlyDigits(pedido.whatsapp) || `${upper(pedido.nome)}-${upper(pedido.documento)}`;
            if (!chave) return;
            const base = mapa.get(chave) || { nome: upper(pedido.nome), whatsapp: upper(pedido.whatsapp), instagram: upper(pedido.instagram), documento: upper(pedido.documento), cep: upper(pedido.cep), cidade: upper(pedido.cidade), estado: upper(pedido.estado), endereco: upper(pedido.endereco), complemento: upper(pedido.complemento), referencia: upper(pedido.referencia), aniversario: '', notasPrivadas: '', blacklist: false, totalPedidos: 0, totalGasto: 0, historicoPedidos: [], aniversarioWaller: false };
            base.totalPedidos += 1; base.totalGasto += Number(pedido.valorTotal) || 0; 
            if(!base.historicoPedidos) base.historicoPedidos = [];
            base.historicoPedidos.push(pedido);
            if (!base.cep) base.cep = upper(pedido.cep); if (!base.endereco) base.endereco = upper(pedido.endereco); if (!base.cidade) base.cidade = upper(pedido.cidade);
            mapa.set(chave, base);
        });

        Array.from(mapa.values()).forEach(base => {
            base.aniversarioWaller = false;
            if (base.historicoPedidos && base.historicoPedidos.length > 0) {
                try {
                    base.historicoPedidos.sort((a, b) => {
                        const da = parseFirestoreDate(a.dataCriacao) || new Date(0);
                        const db = parseFirestoreDate(b.dataCriacao) || new Date(0);
                        return da.getTime() - db.getTime();
                    });
                    const dataPrim = parseFirestoreDate(base.historicoPedidos[0].dataCriacao);
                    if (dataPrim) {
                        const hoje = new Date();
                        const diffYears = hoje.getFullYear() - dataPrim.getFullYear();
                        const diffMonths = hoje.getMonth() - dataPrim.getMonth();
                        const diffDays = Math.abs(hoje.getDate() - dataPrim.getDate());
                        if (diffYears > 0 && diffMonths === 0 && diffDays <= 7) { base.aniversarioWaller = true; }
                    }
                } catch(e){}
            }
        });

        clientesCache = Array.from(mapa.values()).sort((a, b) => {
            const aNiv = aniversarioProximo(a.aniversario) ? 0 : 1; const bNiv = aniversarioProximo(b.aniversario) ? 0 : 1;
            if(aNiv !== bNiv) return aNiv - bNiv; 
            return String(a.nome || '').localeCompare(String(b.nome || ''));
        });
    } catch(e) { 
        console.error("Erro extrairClientes:", e); 
        clientesCache = [...clientesPurosCache];
    }
}

function getSeloVip(total) {
    if(total >= 2000) return '<span class="niver-tag" style="background:#fef08a; color:#92400e;">👑 VIP Ouro</span>';
    if(total >= 1000) return '<span class="niver-tag" style="background:#e2e8f0; color:#334155;">💎 VIP Prata</span>';
    if(total >= 500) return '<span class="niver-tag" style="background:#fed7aa; color:#9a3412;">🌟 VIP Bronze</span>';
    return '';
}

function abrirVisualizacaoCliente(cliente) {
    try {
        const idRef = onlyDigits(cliente.whatsapp) || `${upper(cliente.nome)}-${upper(cliente.documento)}`;
        const titulo = el('fichaClienteTitulo'); if(titulo) titulo.textContent = `Ficha Completa: ${escapeStr(cliente.nome) || 'Cliente'}`;
        const conteudo = el('fichaClienteConteudo');
        if(conteudo) {
            conteudo.innerHTML = `
                <div class="cliente-ficha-grid">
                    <p><strong>Nome:</strong> <span class="copy-text" onclick="copiarTexto('${escapeStr(cliente.nome)}')">${escapeStr(cliente.nome) || '-'}</span> ${getSeloVip(cliente.totalGasto)}</p>
                    <p><strong>WhatsApp:</strong> <span class="copy-text" onclick="copiarTexto('${escapeStr(cliente.whatsapp)}')">${escapeStr(cliente.whatsapp) || '-'}</span></p>
                    <p><strong>Instagram:</strong> ${escapeStr(cliente.instagram) || '-'}</p>
                    <p><strong>CPF/CNPJ:</strong> <span class="copy-text" onclick="copiarTexto('${escapeStr(cliente.documento)}')">${escapeStr(cliente.documento) || '-'}</span></p>
                    <p><strong>CEP:</strong> ${escapeStr(cliente.cep) || '-'}</p>
                    <p><strong>Aniversário:</strong> ${cliente.aniversario ? formatDate(cliente.aniversario) : '-'}</p>
                    <p><strong>Cidade/UF:</strong> ${escapeStr(cliente.cidade) || '-'} / ${escapeStr(cliente.estado) || ''}</p>
                    <p><strong>Endereço:</strong> <span class="copy-text" onclick="copiarTexto('${escapeStr(cliente.endereco)}, ${escapeStr(cliente.complemento)}')">${escapeStr(cliente.endereco) || '-'} ${cliente.complemento ? ` - ${escapeStr(cliente.complemento)}` : ''}</span></p>
                    <p><strong>Total de pedidos:</strong> ${cliente.totalPedidos || 0}</p>
                    <p><strong>Total gasto:</strong> ${formatCurrency(cliente.totalGasto || 0)}</p>
                </div>
                ${cliente.notasPrivadas ? `<div style="margin-top:10px; padding:10px; background:#1a1a1a; border-left:4px solid #f59e0b; border-radius:4px;"><small style="color:#f59e0b; font-weight:bold;">Notas Internas:</small><p style="margin:0; font-size:0.85rem; color:#ccc;">${escapeStr(cliente.notasPrivadas)}</p></div>` : ''}
                ${cliente.blacklist ? `<div style="margin-top:10px; padding:10px; background:#450a0a; border-left:4px solid #dc2626; border-radius:4px; color:#fff; font-weight:bold;">⚠️ CLIENTE NA BLACKLIST</div>` : ''}
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button class="btn-primary" onclick="editarCliente('${idRef}'); fecharFichaCliente();">EDITAR DADOS</button>
                </div>
                <h3 class="form-section-title" style="margin-top:1.5rem;">Histórico de pedidos</h3>
                <div>${(cliente.historicoPedidos || []).map((p) => `<div class="item-carrinho"><div>#${p.numeroPedido} • ${formatDate(p.dataCriacao)} • ${escapeStr(p.status)}</div><div>${formatCurrency(p.valorTotal || 0)}</div></div>`).join('') || 'Sem histórico'}</div>`;
        }
        const modal = el('modalFichaCliente'); if(modal) modal.style.display = 'flex';
    } catch(e) { console.error("Erro render Ficha:", e); }
}

function visualizarClientePorId(idRef) { const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef); if (cliente) abrirVisualizacaoCliente(cliente); }
function fecharFichaCliente() { const m = el('modalFichaCliente'); if(m) m.style.display = 'none'; }
function abrirCadastroCliente() { const m = el('modalCliente'); if(m) m.style.display = 'flex'; }
function fecharCadastroCliente() { const m = el('modalCliente'); if(m) m.style.display = 'none'; }

async function salvarCliente(e) {
    e.preventDefault();
    const id = onlyDigits(el('clienteWhatsapp').value) || `${Date.now()}`;
    await db.collection('clientes').doc(id).set({
        nome: upper(el('clienteNome').value), whatsapp: upper(el('clienteWhatsapp').value), instagram: upper(el('clienteInstagram').value),
        documento: upper(el('clienteDocumento').value), cep: upper(el('clienteCep').value), cidade: upper(el('clienteCidade').value),
        estado: upper(el('clienteEstado').value), endereco: upper(el('clienteEndereco').value), complemento: upper(el('clienteComplemento').value),
        referencia: upper(el('clienteReferencia').value), aniversario: el('clienteAniversario').value || '', notasPrivadas: el('clienteNotas').value || '',
        blacklist: el('clienteBlacklist').checked || false
    }, { merge: true });
    e.target.reset(); showToast('Ficha de cliente guardada!'); fecharCadastroCliente();
}

function editarCliente(idRef) {
    const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef);
    if (!cliente) return;
    abrirCadastroCliente();
    const setV = (id, val) => { const x = el(id); if(x) x.value = val; };
    setV('clienteNome', cliente.nome || ''); setV('clienteWhatsapp', cliente.whatsapp || ''); setV('clienteInstagram', cliente.instagram || '');
    setV('clienteDocumento', cliente.documento || ''); setV('clienteCep', cliente.cep || ''); setV('clienteCidade', cliente.cidade || '');
    setV('clienteEstado', cliente.estado || ''); setV('clienteEndereco', cliente.endereco || ''); setV('clienteComplemento', cliente.complemento || '');
    setV('clienteReferencia', cliente.referencia || ''); setV('clienteAniversario', cliente.aniversario || ''); setV('clienteNotas', cliente.notasPrivadas || '');
    const bl = el('clienteBlacklist'); if(bl) bl.checked = cliente.blacklist || false;
}

function excluirCliente(idRef) { if (confirm('Excluir ficha deste cliente? O histórico de pedidos continuará a existir.')) { db.collection('clientes').doc(idRef).delete(); showToast('Cliente excluído.', 'warning'); } }

function renderClientes(lista = clientesCache) {
    try {
        const container = el('listaClientes'); 
        if(!container) return;
        container.innerHTML = '';
        if (!lista || !lista.length) { container.innerHTML = '<div class="catalog-empty">Nenhum cliente na base.</div>'; return; }
        lista.forEach((cliente) => {
            const idRef = onlyDigits(cliente.whatsapp) || `${upper(cliente.nome)}-${upper(cliente.documento)}`;
            const destaque = aniversarioProximo(cliente.aniversario);
            container.innerHTML += `<article class="cliente-card ${destaque ? 'cliente-alerta' : ''}" style="${cliente.blacklist ? 'border-color:#dc2626;' : ''}">
                <h3>${escapeStr(cliente.nome) || 'SEM NOME'}</h3>
                ${getSeloVip(cliente.totalGasto)} 
                ${destaque ? '<span class="niver-tag pulse" style="margin-left:5px;">🎂 Aniversário</span>' : ''}
                ${cliente.aniversarioWaller ? '<span class="niver-tag pulse" style="margin-left:5px; background:#16a34a; color:#fff;">🎈 1 Ano de Marca</span>' : ''}
                ${cliente.blacklist ? '<span class="niver-tag" style="background:#450a0a; color:#ef4444; margin-left:5px;">⚠️ Blacklist</span>' : ''}
                <p><strong>Whatsapp:</strong> <span class="copy-text" onclick="copiarTexto('${escapeStr(cliente.whatsapp)}')">${escapeStr(cliente.whatsapp) || '-'}</span></p>
                <div class="cliente-stats"><span>${cliente.totalPedidos || 0} pedido(s)</span><span>${formatCurrency(cliente.totalGasto || 0)}</span></div>
                <div class="pedido-actions"><button class="catalog-edit" onclick="visualizarClientePorId('${idRef}')">Ficha Completa</button></div>
            </article>`;
        });
    } catch(e) { console.error("Erro render Clientes:", e); }
}

function filtrarClientes() { 
    try {
        const input = el('filtroClientes');
        const busca = upper(input ? input.value : ''); 
        const filtrado = clientesCache.filter(c => upper(`${c.nome} ${c.whatsapp} ${c.documento} ${c.cidade}`).includes(busca));
        renderClientes(filtrado);
    } catch(e) { console.error(e); }
}

// ================= CATÁLOGO, ESTOQUE E BEST SELLERS =================
function calcularBestSellers() {
    try {
        if (!pedidosCache.length || !estampasCache.length) return;
        let contagem = {};
        pedidosCache.forEach(p => {
            safeItens(p.itens).forEach(i => {
                if(!i) return;
                const cod = i.codigoEstampa || 'SEM_COD';
                if(!contagem[cod]) contagem[cod] = 0;
                contagem[cod] += Number(i.quantidade) || 1;
            });
        });

        let arrayRanking = Object.entries(contagem).map(([codigo, qtd]) => {
            const prod = estampasCache.find(e => e.codigo === codigo);
            return { codigo, qtd, nome: prod ? prod.nome : 'Produto Desconhecido' };
        });

        arrayRanking.sort((a, b) => b.qtd - a.qtd);
        const top5 = arrayRanking.slice(0, 5);

        const container = el('bestSellersContainer');
        if(!container) return;
        if(top5.length === 0) { container.innerHTML = '<p class="catalog-empty">Sem vendas suficientes ainda.</p>'; return; }

        container.innerHTML = top5.map((item, idx) => `
            <div class="bestseller-card">
                <div class="bs-medal">#${idx+1}</div>
                <div style="line-height:1.2;">
                    <strong>${escapeStr(item.nome)}</strong><br>
                    <small style="color:var(--muted);">${item.codigo} • ${item.qtd} vendidos</small>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error("Erro BestSellers:", e); }
}

function abrirModalNovaEstampa() { const m = el('modalNovaEstampa'); if(m) m.style.display = 'flex'; }
function fecharModalNovaEstampa() { const m = el('modalNovaEstampa'); if(m) m.style.display = 'none'; }

async function salvarNovaEstampa(e) {
    e.preventDefault();
    const cod = upper(el('cadCodigoEstampa').value);
    const estoqueObjeto = { P: parseInt(el('cadEstP').value)||0, M: parseInt(el('cadEstM').value)||0, G: parseInt(el('cadEstG').value)||0, GG: parseInt(el('cadEstGG').value)||0, XG: parseInt(el('cadEstXG').value)||0, UN: parseInt(el('cadEstUN').value)||0 };
    await db.collection('estampas').doc(cod).set({ codigo: cod, nome: upper(el('cadNomeEstampa').value), valor: unmaskCurrency(el('cadValorEstampa').value), custo: unmaskCurrency(el('cadCustoEstampa').value), tipoPadrao: upper(el('cadTipoPadrao').value), estoque: estoqueObjeto });
    e.target.reset(); showToast('Produto adicionado!'); fecharModalNovaEstampa();
}

function filtrarCatalogo() {
    const input = el('filtroEstampas');
    const filtro = upper(input ? input.value : '');
    renderCatalogo(estampasCache.filter((est) => est.codigo.includes(filtro) || est.nome.includes(filtro)));
}

function abrirModalCatalogo(codigo) {
    const item = estampasCache.find((est) => est.codigo === codigo); if (!item) return;
    const setV = (id, val) => { const x = el(id); if(x) x.value = val; };
    setV('editCatalogoCodigo', item.codigo); setV('editCatalogoNome', item.nome); 
    setV('editCatalogoValor', formatCurrency(item.valor || 0)); setV('editCatalogoCusto', formatCurrency(item.custo || 0));
    setV('editCatalogoTipo', item.tipoPadrao || '');
    setV('editEstP', item.estoque.P || 0); setV('editEstM', item.estoque.M || 0); setV('editEstG', item.estoque.G || 0); 
    setV('editEstGG', item.estoque.GG || 0); setV('editEstXG', item.estoque.XG || 0); setV('editEstUN', item.estoque.UN || 0);
    const m = el('modalCatalogo'); if(m) m.style.display = 'flex';
}
function fecharModalCatalogo() { const m = el('modalCatalogo'); if(m) m.style.display = 'none'; }

async function salvarEdicaoCatalogo(e) {
    e.preventDefault();
    const codigo = upper(el('editCatalogoCodigo').value);
    const estoqueObjeto = { P: parseInt(el('editEstP').value)||0, M: parseInt(el('editEstM').value)||0, G: parseInt(el('editEstG').value)||0, GG: parseInt(el('editEstGG').value)||0, XG: parseInt(el('editEstXG').value)||0, UN: parseInt(el('editEstUN').value)||0 };
    await db.collection('estampas').doc(codigo).set({ codigo, nome: upper(el('editCatalogoNome').value), valor: unmaskCurrency(el('editCatalogoValor').value), custo: unmaskCurrency(el('editCatalogoCusto').value), tipoPadrao: upper(el('editCatalogoTipo').value), estoque: estoqueObjeto });
    showToast('Produto atualizado!'); fecharModalCatalogo();
}

async function atualizarStockInline(codigo, tamanho, valorNovo) {
    const val = parseInt(valorNovo); if(isNaN(val) || val < 0) return;
    await db.collection('estampas').doc(codigo).update({ [`estoque.${tamanho}`]: val });
    showToast(`Stock atualizado para ${val}!`);
}

function renderCatalogo(lista = estampasCache) {
    try {
        const container = el('catalogoEstampas'); 
        if(!container) return;
        container.innerHTML = '';
        if (!lista.length) { container.innerHTML = '<div class="catalog-empty">Nenhum produto.</div>'; return; }

        lista.forEach((est) => {
            let pills = ''; let totalStk = 0;
            Object.entries(est.estoque || {}).forEach(([tam, qtd]) => { 
                totalStk += Number(qtd);
                pills += `<div class="stock-pill"><small>${tam}:</small> <input type="number" class="inline-stock-input" value="${qtd}" onchange="atualizarStockInline('${est.codigo}', '${tam}', this.value)"></div>`; 
            });
            const isEsgotado = totalStk <= 0;

            container.innerHTML += `<article class="catalog-item ${isEsgotado ? 'item-esgotado' : ''}">
                <div class="catalog-item-top"><p class="catalog-code"><span class="copy-text" onclick="copiarTexto('${est.codigo}')">${est.codigo}</span></p></div>
                <h3>${escapeStr(est.nome)}</h3>
                <p class="catalog-price">${formatCurrency(est.valor || 0)}</p>
                <p class="catalog-stock" style="color:var(--muted); font-size:0.75rem;">Custo: ${formatCurrency(est.custo || 0)} | Tipo: ${est.tipoPadrao || 'Não definido'}</p>
                <div class="stock-grid">${pills}</div>
                <div class="catalog-actions" style="margin-top:10px;">
                    <button class="catalog-edit" onclick="abrirModalCatalogo('${est.codigo}')">Editar</button>
                    <button class="catalog-delete" onclick="db.collection('estampas').doc('${est.codigo}').delete()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                </div>
            </article>`;
        });
    } catch(e) { console.error("Erro render Catalogo:", e); }
}

// ================= RELATÓRIOS E PDF EM MASSA =================
function abrirModalRelatorios() { const m = el('modalRelatorios'); if(m) m.style.display = 'flex'; }
function fecharModalRelatorios() { const m = el('modalRelatorios'); if(m) m.style.display = 'none'; }

function gerarPDFProducao() {
    if (!pedidosCache.length) return showToast('Sem pedidos.', 'warning');
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.text('Fila de Produção - Waller', 14, 14);
    doc.autoTable({ startY: 20, head: [['Pedido', 'Cliente', 'Status', 'Total']], body: pedidosCache.map((p) => [`#${p.numeroPedido}`, p.nome, p.status, formatCurrency(p.valorTotal)]) });
    doc.save(`Fila-Producao.pdf`); fecharModalRelatorios(); showToast('PDF Gerado!');
}
function gerarPDFCatalogo() {
    if (!estampasCache.length) return showToast('Catálogo vazio.', 'warning');
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.text('Catálogo e Estoque - Waller', 14, 14);
    doc.autoTable({ startY: 20, head: [['Cód', 'Produto', 'Preço', 'Stock (P/M/G/GG/XG/UN)']], body: estampasCache.map((e) => [e.codigo, e.nome, formatCurrency(e.valor), `${e.estoque.P}/${e.estoque.M}/${e.estoque.G}/${e.estoque.GG}/${e.estoque.XG}/${e.estoque.UN}`]) });
    doc.save(`Catalogo-Estoque.pdf`); fecharModalRelatorios(); showToast('PDF Gerado!');
}
function gerarPDFClientes() {
    if (!clientesCache.length) return showToast('Sem clientes.', 'warning');
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.text('Lista de Clientes - Waller', 14, 14);
    doc.autoTable({ startY: 20, head: [['Nome', 'WhatsApp', 'Cidade', 'Total Gasto']], body: clientesCache.map((c) => [c.nome, c.whatsapp, c.cidade, formatCurrency(c.totalGasto)]) });
    doc.save(`Lista-Clientes.pdf`); fecharModalRelatorios(); showToast('PDF Gerado!');
}
function gerarPDFFaturamentoMensal() {
    const mesDashEl = el('mesDash');
    if(!mesDashEl) return;
    const mesFiltro = mesDashEl.value;
    if(!mesFiltro) return showToast("Selecione o mês no Dashboard!", "warning");
    const [anoStr, mesStr] = mesFiltro.split('-'); const anoFiltro = parseInt(anoStr); const mesNumFiltro = parseInt(mesStr) - 1;

    const pedidosMes = pedidosCache.filter((pedido) => {
        const d = parseFirestoreDate(pedido.dataCriacao); if (!d) return false;
        return d.getMonth() === mesNumFiltro && d.getFullYear() === anoFiltro && upper(pedido.statusPagamento) === 'PAGO';
    });
    if (pedidosMes.length === 0) return showToast("Sem pedidos pagos neste mês.", "warning");

    const faturamento = pedidosMes.reduce((acc, p) => acc + (p.valorTotal || 0), 0);
    const lucro = pedidosMes.reduce((acc, p) => acc + (p.lucroTotal || 0), 0);

    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.text(`Relatório Financeiro - ${mesStr}/${anoStr}`, 14, 14);
    doc.setFontSize(10);
    doc.text(`Faturamento Bruto: ${formatCurrency(faturamento)}`, 14, 22);
    doc.text(`Lucro Líquido Real: ${formatCurrency(lucro)}`, 14, 28);
    doc.text(`Total de Pedidos Pagos: ${pedidosMes.length}`, 14, 34);

    doc.autoTable({ startY: 40, head: [['Pedido', 'Data', 'Total', 'Lucro']], body: pedidosMes.map((p) => [`#${p.numeroPedido}`, formatDate(p.dataCriacao), formatCurrency(p.valorTotal), formatCurrency(p.lucroTotal)]) });
    doc.save(`Financeiro-${mesStr}-${anoStr}.pdf`); fecharModalRelatorios(); showToast('PDF Gerado!');
}

function gerarEtiquetasEmMassa() {
    if(pedidosSelecionados.length === 0) return showToast("Selecione pedidos primeiro", "warning");
    const { jsPDF } = window.jspdf;
    // Formato A4 padrão
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let labelCount = 0;

    pedidosSelecionados.forEach((id) => {
        const p = pedidosCache.find(x => x.id === id); if(!p) return;
        
        if (labelCount > 0 && labelCount % 4 === 0) {
            doc.addPage();
        }

        // Divide a folha A4 em 4 quadrantes
        const posOnPage = labelCount % 4; 
        const col = posOnPage % 2; 
        const row = Math.floor(posOnPage / 2); 

        const offsetX = col * 105;
        const offsetY = row * 148.5;

        // Borda de corte opcional
        doc.setDrawColor(200);
        doc.setLineDash([], 0);
        doc.rect(offsetX, offsetY, 105, 148.5);

        doc.setFont("helvetica", "bold"); doc.setFontSize(14); 
        doc.text("WALLER CLOTHING", offsetX + 52.5, offsetY + 15, {align: "center"});
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); 
        doc.text("DESTINATÁRIO:", offsetX + 10, offsetY + 30);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); 
        doc.text(escapeStr(p.nome) || 'Cliente', offsetX + 10, offsetY + 37);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); 
        doc.text(`${escapeStr(p.endereco) || ''} ${p.complemento ? '- '+escapeStr(p.complemento) : ''}`, offsetX + 10, offsetY + 45, {maxWidth: 85});
        doc.text(`${escapeStr(p.cidade) || ''} / ${escapeStr(p.estado) || ''}`, offsetX + 10, offsetY + 55); 
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); 
        doc.text(`CEP: ${escapeStr(p.cep) || '00000-000'}`, offsetX + 10, offsetY + 65);
        doc.setLineDash([2, 2], 0); doc.line(offsetX + 10, offsetY + 75, offsetX + 95, offsetY + 75); 
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); 
        doc.text(`Pedido #${p.numeroPedido} - ${getItensResumo(p.itens)}`, offsetX + 10, offsetY + 85, {maxWidth: 85});
        
        labelCount++;
    });

    doc.save(`Etiquetas-A4-Waller-${new Date().getTime()}.pdf`);
    showToast(`${pedidosSelecionados.length} Etiquetas geradas em A4!`);
    pedidosSelecionados = []; const b = el('bulkBar'); if(b) b.style.display = 'none'; aplicarFiltros(); fecharModalRelatorios();
}

function gerarStickersEmMassa() {
    if(pedidosSelecionados.length === 0) return showToast("Selecione pedidos primeiro", "warning");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let x = 15; let y = 20;
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("STICKERS DE INSTAGRAM - WALLER", 105, 10, {align: "center"});
    doc.setFontSize(10);

    pedidosSelecionados.forEach((id) => {
        const p = pedidosCache.find(x => x.id === id); if(!p) return;
        const nome = primeiroNome(p.nome).toUpperCase();
        let insta = p.instagram ? escapeStr(p.instagram).trim() : '';
        if(insta && !insta.startsWith('@')) insta = '@' + insta;

        doc.setFont("helvetica", "bold"); doc.text(nome, x, y);
        if(insta) { doc.setFont("helvetica", "normal"); doc.text(insta, x, y + 5); }
        
        x += 60;
        if (x > 180) { x = 15; y += 20; }
        if (y > 280) { doc.addPage(); x = 15; y = 20; }
    });
    doc.save(`Stickers-Waller-${new Date().getTime()}.pdf`);
    showToast(`${pedidosSelecionados.length} Stickers gerados!`);
    pedidosSelecionados = []; const b = el('bulkBar'); if(b) b.style.display = 'none'; aplicarFiltros(); fecharModalRelatorios();
}

// ================= BLINDAGEM DOS LISTENERS DO FIREBASE =================
function iniciarListeners() {
    // Seta data atual no Dashboard
    const now = new Date();
    const mesDashEl = el('mesDash');
    if(mesDashEl) {
        mesDashEl.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}`;
        mesDashEl.addEventListener('change', () => atualizarDashboard(pedidosCache));
    }

    db.collection('pedidos').orderBy('dataCriacao', 'desc').onSnapshot((snap) => {
        try {
            let ped = []; snap.forEach((doc) => ped.push({ id: doc.id, ...doc.data() })); pedidosCache = ped;
        } catch(e) { console.error("Erro leitura Pedidos:", e); }
        
        try { atualizarDashboard(pedidosCache); } catch(e) {}
        try { aplicarFiltros(); } catch(e) {}
        try { extrairClientesDosPedidos(); renderClientes(); } catch(e) {}
        try { calcularBestSellers(); } catch(e) {}
        
        const c = el('carregando'); if(c) c.style.display = 'none';
    });

    db.collection('clientes').onSnapshot((snap) => {
        try {
            let lidos = []; snap.forEach((doc) => lidos.push({id: doc.id, ...doc.data()})); 
            clientesPurosCache = lidos; 
            // AGORA OS CLIENTES RENDERIZAM MESMO SEM PEDIDOS NA BASE!
            extrairClientesDosPedidos(); 
            renderClientes();
        } catch(e) { console.error("Erro leitura Clientes:", e); }
    });

    db.collection('estampas').orderBy('codigo').onSnapshot((snap) => {
        try {
            let est = [];
            snap.forEach((doc) => {
                const data = doc.data();
                let estq = {P:0, M:0, G:0, GG:0, XG:0, UN:0};
                if(typeof data.estoque === 'number' || typeof data.estoque === 'string'){ estq.UN = Number(data.estoque) || 0; } 
                else if (typeof data.estoque === 'object' && data.estoque !== null) { estq = { ...estq, ...data.estoque }; }
                est.push({ codigo: upper(data.codigo), nome: upper(data.nome), valor: Number(data.valor) || 0, custo: Number(data.custo) || 0, tipoPadrao: upper(data.tipoPadrao), estoque: estq });
            });
            estampasCache = est; 
        } catch(e) { console.error("Erro leitura Catálogo:", e); }

        try { renderCatalogo(); } catch(e) {}
        try { calcularBestSellers(); } catch(e) {}
        const c = el('carregandoEstampas'); if(c) c.style.display = 'none';
    });
}

// ================= INICIALIZAÇÃO =================
if(el('codigoEstampa')) el('codigoEstampa').addEventListener('input', preencherEstampaPorCodigo);
if(el('cadValorEstampa')) el('cadValorEstampa').addEventListener('blur', () => { const val = unmaskCurrency(el('cadValorEstampa').value); if(val>0) el('cadValorEstampa').value = formatCurrency(val); });
if(el('cadCustoEstampa')) el('cadCustoEstampa').addEventListener('blur', () => { const val = unmaskCurrency(el('cadCustoEstampa').value); if(val>0) el('cadCustoEstampa').value = formatCurrency(val); });
if(el('editCatalogoValor')) el('editCatalogoValor').addEventListener('blur', () => { const val = unmaskCurrency(el('editCatalogoValor').value); if(val>0) el('editCatalogoValor').value = formatCurrency(val); });
if(el('editCatalogoCusto')) el('editCatalogoCusto').addEventListener('blur', () => { const val = unmaskCurrency(el('editCatalogoCusto').value); if(val>0) el('editCatalogoCusto').value = formatCurrency(val); });
if(el('editPedValorTotal')) el('editPedValorTotal').addEventListener('blur', () => { const val = unmaskCurrency(el('editPedValorTotal').value); if(val>0) el('editPedValorTotal').value = formatCurrency(val); });
if(el('editPedFrete')) el('editPedFrete').addEventListener('blur', () => { const val = unmaskCurrency(el('editPedFrete').value); if(val>=0) el('editPedFrete').value = formatCurrency(val); });
if(el('editPedDesconto')) el('editPedDesconto').addEventListener('blur', () => { const val = unmaskCurrency(el('editPedDesconto').value); if(val>=0) el('editPedDesconto').value = formatCurrency(val); });
if(el('valorFrete')) el('valorFrete').addEventListener('blur', () => { const val = unmaskCurrency(el('valorFrete').value); if(val>=0) el('valorFrete').value = formatCurrency(val); });
if(el('valorDesconto')) el('valorDesconto').addEventListener('blur', () => { const val = unmaskCurrency(el('valorDesconto').value); if(val>=0) el('valorDesconto').value = formatCurrency(val); });

setupAutoFields('whatsapp', 'instagram', 'cpf', 'cep', 'cidade', 'estado', 'endereco');
setupAutoFields('clienteWhatsapp', 'clienteInstagram', 'clienteDocumento', 'clienteCep', 'clienteCidade', 'clienteEstado', 'clienteEndereco');
setupAutoFields('editPedWhatsapp', 'editPedInstagram', 'editPedCpf', 'editPedCep', 'editPedCidade', 'editPedEstado', 'editPedEndereco');

carregarTema();
carregarRascunho();
iniciarListeners();
