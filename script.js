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
const db = firebase.firestore();

const STATUS_LIST = ['PEDIDO FEITO', 'AGUARDANDO PAGAMENTO', 'EM SEPARAÇÃO', 'ENVIO EFETUADO', 'PEDIDO ENTREGUE'];

let estampasCache = [];
let carrinhoTemporario = [];
let carrinhoEdicao = [];
let pedidosCache = [];
let clientesCache = [];
let filtroAtual = 'TODOS';
let pedidoEmEdicaoId = null;
let graficoFat = null;

// ================= FUNÇÕES DE APOIO E MÁSCARAS =================
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
    if (typeof dateValue === 'string' && dateValue.includes('-')) { return new Date(dateValue + 'T12:00:00').toLocaleDateString('pt-BR'); }
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('pt-BR');
}

function showToast(msg, type = 'success') {
    const container = el('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getItensResumo(itens = []) {
    if (!itens.length) return 'Sem itens';
    return itens.map((item) => `${item.quantidade || 1}x ${item.nomeEstampa || item.codigoEstampa}`).join(' • ');
}

function primeiroNome(nome = '') { return (nome.trim().split(' ')[0] || 'cliente'); }

function maskPhone(v) {
    v = v.replace(/\D/g, '');
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    return v.slice(0, 15);
}

function maskCPFCNPJ(v) {
    v = v.replace(/\D/g, '');
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return v;
    } else {
        v = v.replace(/^(\d{2})(\d)/, '$1.$2'); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); v = v.replace(/\.(\d{3})(\d)/, '.$1/$2'); v = v.replace(/(\d{4})(\d)/, '$1-$2'); return v.slice(0, 18);
    }
}

function maskCEP(v) {
    v = v.replace(/\D/g, ''); v = v.replace(/(\d{5})(\d)/, '$1-$2'); return v.slice(0, 9);
}

function setupAutoFields(idWhats, idInsta, idCpf, idCep, idCidade, idEstado, idEndereco, idComp) {
    const whats = el(idWhats); const insta = el(idInsta); const cpf = el(idCpf); const cep = el(idCep);
    const cidade = el(idCidade); const estado = el(idEstado); const endereco = el(idEndereco);

    if(whats) whats.addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); if (e.target.value.length === 15 && insta) insta.focus(); });
    if(cpf) cpf.addEventListener('input', (e) => { let raw = e.target.value.replace(/\D/g, ''); e.target.value = maskCPFCNPJ(e.target.value); if (raw.length === 11 && cep) cep.focus(); });
    if(cep) cep.addEventListener('input', (e) => {
        e.target.value = maskCEP(e.target.value);
        if (e.target.value.length === 9) {
            fetch(`https://viacep.com.br/ws/${e.target.value.replace('-','')}/json/`).then(r => r.json()).then(data => {
                if(!data.erro) {
                    if(cidade) cidade.value = upper(data.localidade);
                    if(estado) estado.value = upper(data.uf);
                    if(endereco) { endereco.value = upper(data.logradouro + (data.bairro ? ' - ' + data.bairro : '')); endereco.focus(); }
                } else { if(endereco) endereco.focus(); }
            }).catch(() => { if(endereco) endereco.focus(); });
        }
    });
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
}

function alternarTema() {
    const dark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('temaWaller', dark ? 'dark' : 'light');
    el('btnTema').textContent = dark ? 'Tema claro' : 'Tema escuro';
    atualizarGraficoDashboard(); // Atualiza cor do gráfico se existir
}

function carregarTema() {
    if (localStorage.getItem('temaWaller') === 'dark') {
        document.body.classList.add('dark-mode'); el('btnTema').textContent = 'Tema claro';
    }
}

// ================= LANÇAR DROP / PEDIDO =================
function autoPreencherCliente() {
    const numWhats = onlyDigits(el('whatsapp').value);
    if (!numWhats) return;
    const clienteExistente = clientesCache.find(c => onlyDigits(c.whatsapp) === numWhats);
    if (clienteExistente) {
        if (!el('nome').value) el('nome').value = clienteExistente.nome || '';
        el('instagram').value = clienteExistente.instagram || '';
        el('cpf').value = clienteExistente.documento || '';
        el('cep').value = clienteExistente.cep || '';
        el('cidade').value = clienteExistente.cidade || '';
        el('estado').value = clienteExistente.estado || '';
        el('endereco').value = clienteExistente.endereco || '';
        el('complemento').value = clienteExistente.complemento || '';
        el('referencia').value = clienteExistente.referencia || '';
        
        el('whatsapp').style.borderColor = '#166534';
        showToast('Cliente já existente! Dados auto-preenchidos.');
        setTimeout(() => el('whatsapp').style.borderColor = '', 1500);
    }
}

function limparLancarDrop() {
    if(!confirm("Deseja limpar todo o formulário?")) return;
    document.querySelectorAll('#aba-cadastro input').forEach(input => input.value = '');
    el('metodoPagamento').value = 'PIX';
    el('statusPagamento').value = 'PAGO';
    el('tipoPeca').value = 'OVERSIZED';
    el('tamanho').value = 'P';
    el('cor').value = 'PRETA';
    el('quantidade').value = 1;
    el('mensagemAutoPreenchimento').textContent = '';
    carrinhoTemporario = [];
    atualizarTelaCarrinho();
}

function preencherEstampaPorCodigo() {
    const codigo = upper(el('codigoEstampa').value);
    el('codigoEstampa').value = codigo;
    const feedback = el('mensagemAutoPreenchimento');

    if (!codigo) { feedback.textContent = ''; feedback.className = 'helper-text'; return; }

    const encontrada = estampasCache.find((item) => item.codigo === codigo);
    if (!encontrada) { feedback.textContent = 'Produto não encontrado.'; feedback.className = 'helper-text warn'; return; }

    el('nomeEstampa').value = encontrada.nome;
    el('valorUnitario').value = formatCurrency(encontrada.valor || 0);
    if (encontrada.tipoPadrao && Array.from(el('tipoPeca').options).some((opt) => opt.value === encontrada.tipoPadrao)) { el('tipoPeca').value = encontrada.tipoPadrao; }
    
    // Verifica stock daquele tamanho específico se selecionado
    const tamSelecionado = el('tamanho').value;
    const stockTam = encontrada.estoque[tamSelecionado] || 0;
    feedback.textContent = `Encontrado: ${encontrada.nome} (Stock no tamanho ${tamSelecionado}: ${stockTam})`;
    feedback.className = `helper-text ${stockTam > 0 ? 'ok' : 'warn'}`;
}

function adicionarAoCarrinho() {
    const cod = upper(el('codigoEstampa').value);
    const nom = upper(el('nomeEstampa').value);
    const tam = el('tamanho').value;
    const qtd = parseInt(el('quantidade').value, 10) || 1;
    if (!cod || !nom) return showToast('Preencha código e nome!', 'warning');

    // Validação de Stock Visual (não bloqueia, mas avisa)
    const estampa = estampasCache.find(e => e.codigo === cod);
    if (estampa && (estampa.estoque[tam] || 0) < qtd) {
        showToast(`Atenção: Stock de ${tam} insuficiente no sistema.`, 'warning');
    }

    carrinhoTemporario.push({
        codigoEstampa: cod,
        nomeEstampa: nom,
        tipoPeca: el('tipoPeca').value,
        tamanho: tam,
        cor: el('cor').value,
        quantidade: qtd,
        valorUnitario: unmaskCurrency(el('valorUnitario').value)
    });

    atualizarTelaCarrinho();
    el('codigoEstampa').value = ''; el('nomeEstampa').value = ''; el('valorUnitario').value = ''; el('quantidade').value = 1; el('mensagemAutoPreenchimento').textContent = '';
}

function atualizarTelaCarrinho() {
    let soma = 0;
    el('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p, index) => {
        soma += p.quantidade * p.valorUnitario;
        el('listaCarrinho').innerHTML += `
        <div class="item-carrinho">
            <div><strong>${p.quantidade}x ${p.tipoPeca} (${p.tamanho})</strong> • ${p.nomeEstampa} <br><small>Cor: ${p.cor} | Unitário: ${formatCurrency(p.valorUnitario)}</small></div>
            <div><strong>${formatCurrency(p.quantidade * p.valorUnitario)}</strong><button type="button" class="btn-excluir-item" onclick="removerDoCarrinho(${index})">X</button></div>
        </div>`;
    });
    
    const frete = unmaskCurrency(el('valorFrete').value);
    soma += frete;
    el('valorTotal').value = formatCurrency(soma);
}

function removerDoCarrinho(index) { carrinhoTemporario.splice(index, 1); atualizarTelaCarrinho(); }

async function salvarPedidoCompleto() {
    const nome = upper(el('nome').value);
    if (!nome || carrinhoTemporario.length === 0) return showToast('Preencha o nome do cliente e adicione itens no pedido!', 'warning');

    const statusBase = el('statusPagamento').value === 'PENDENTE' ? 'AGUARDANDO PAGAMENTO' : 'PEDIDO FEITO';

    const dadosPedido = {
        nome,
        whatsapp: upper(el('whatsapp').value),
        instagram: upper(el('instagram').value),
        documento: upper(el('cpf').value),
        cep: upper(el('cep').value),
        cidade: upper(el('cidade').value),
        estado: upper(el('estado').value),
        endereco: upper(el('endereco').value),
        complemento: upper(el('complemento').value),
        referencia: upper(el('referencia').value),
        valorTotal: unmaskCurrency(el('valorTotal').value),
        valorFrete: unmaskCurrency(el('valorFrete').value),
        metodoPagamento: el('metodoPagamento').value,
        statusPagamento: el('statusPagamento').value,
        itens: carrinhoTemporario,
        rastreio: '',
        status: statusBase,
        numeroPedido: Math.floor(1000 + Math.random() * 9000).toString(),
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Salvar Pedido
    await db.collection('pedidos').add(dadosPedido);
    
    // Baixar Stock Automático
    carrinhoTemporario.forEach(item => {
        const campoEstoque = `estoque.${item.tamanho}`;
        db.collection('estampas').doc(item.codigoEstampa).update({
            [campoEstoque]: firebase.firestore.FieldValue.increment(-item.quantidade)
        }).catch(e => console.log('Estoque não baixado (produto talvez apagado).'));
    });
    
    // Atualiza base do cliente
    const idCliente = onlyDigits(dadosPedido.whatsapp) || `${Date.now()}`;
    db.collection('clientes').doc(idCliente).set({
        nome: dadosPedido.nome, whatsapp: dadosPedido.whatsapp, instagram: dadosPedido.instagram,
        documento: dadosPedido.documento, cep: dadosPedido.cep, cidade: dadosPedido.cidade,
        estado: dadosPedido.estado, endereco: dadosPedido.endereco, complemento: dadosPedido.complemento, referencia: dadosPedido.referencia
    }, { merge: true });

    showToast('🚀 Pedido gerado e stock atualizado!');
    document.querySelectorAll('#aba-cadastro input').forEach(input => input.value = '');
    carrinhoTemporario = []; atualizarTelaCarrinho();
    mudarAba('producao');
}

// ================= EDIÇÃO DE PEDIDO (COM ITENS) =================
function abrirModalEditarPedido(idPedido) {
    const pedido = pedidosCache.find(p => p.id === idPedido);
    if (!pedido) return;
    
    pedidoEmEdicaoId = pedido.id;
    
    el('editPedNome').value = pedido.nome || '';
    el('editPedWhatsapp').value = pedido.whatsapp || '';
    el('editPedInstagram').value = pedido.instagram || '';
    el('editPedCpf').value = pedido.documento || '';
    el('editPedCep').value = pedido.cep || '';
    el('editPedCidade').value = pedido.cidade || '';
    el('editPedEstado').value = pedido.estado || '';
    el('editPedEndereco').value = pedido.endereco || '';
    el('editPedComplemento').value = pedido.complemento || '';
    el('editPedReferencia').value = pedido.referencia || '';
    el('editPedRastreio').value = pedido.rastreio || '';
    el('editPedFrete').value = formatCurrency(pedido.valorFrete || 0);
    el('editPedMetodo').value = pedido.metodoPagamento || 'PIX';
    el('editPedStatusPagamento').value = pedido.statusPagamento || 'PAGO';

    carrinhoEdicao = JSON.parse(JSON.stringify(pedido.itens || [])); // Clone profundo
    atualizarTelaCarrinhoEdicao();

    fecharFichaPedido();
    el('modalEditarPedidoCompleto').style.display = 'flex';
}

function fecharModalEditarPedido() { el('modalEditarPedidoCompleto').style.display = 'none'; pedidoEmEdicaoId = null; carrinhoEdicao = []; }

function preencherEstampaPorCodigoEdicao() {
    const codigo = upper(el('editPedCodigoEstampa').value);
    el('editPedCodigoEstampa').value = codigo;
    const feedback = el('mensagemAutoPreenchimentoEdicao');

    if (!codigo) { feedback.textContent = ''; feedback.className = 'helper-text'; return; }
    const encontrada = estampasCache.find((item) => item.codigo === codigo);
    if (!encontrada) { feedback.textContent = 'Produto não encontrado.'; feedback.className = 'helper-text warn'; return; }

    el('editPedNomeEstampa').value = encontrada.nome;
    el('editPedValorUnitario').value = formatCurrency(encontrada.valor || 0);
    if (encontrada.tipoPadrao && Array.from(el('editPedTipoPeca').options).some((opt) => opt.value === encontrada.tipoPadrao)) { el('editPedTipoPeca').value = encontrada.tipoPadrao; }
    feedback.textContent = `Encontrado: ${encontrada.nome}`; feedback.className = 'helper-text ok';
}

function adicionarAoCarrinhoEdicaoInput() {
    const cod = upper(el('editPedCodigoEstampa').value);
    const nom = upper(el('editPedNomeEstampa').value);
    if (!cod || !nom) return showToast('Preencha código e nome do produto!', 'warning');

    carrinhoEdicao.push({
        codigoEstampa: cod, nomeEstampa: nom, tipoPeca: el('editPedTipoPeca').value,
        tamanho: el('editPedTamanho').value, cor: el('editPedCor').value,
        quantidade: parseInt(el('editPedQuantidade').value, 10) || 1,
        valorUnitario: unmaskCurrency(el('editPedValorUnitario').value)
    });

    atualizarTelaCarrinhoEdicao();
    el('editPedCodigoEstampa').value = ''; el('editPedNomeEstampa').value = ''; el('editPedValorUnitario').value = ''; el('editPedQuantidade').value = 1; el('mensagemAutoPreenchimentoEdicao').textContent = '';
}

function atualizarTelaCarrinhoEdicao() {
    let soma = 0;
    el('listaCarrinhoEdicao').innerHTML = '';
    
    if(carrinhoEdicao.length === 0) el('listaCarrinhoEdicao').innerHTML = '<p style="color:#d90429; font-size:0.8rem; margin:0;">Pedido ficará sem itens se salvo assim.</p>';

    carrinhoEdicao.forEach((p, index) => {
        soma += p.quantidade * p.valorUnitario;
        el('listaCarrinhoEdicao').innerHTML += `
        <div class="item-carrinho">
            <div><strong>${p.quantidade}x ${p.tipoPeca} (${p.tamanho})</strong> • ${p.nomeEstampa}</div>
            <div><strong>${formatCurrency(p.quantidade * p.valorUnitario)}</strong><button type="button" class="btn-excluir-item" onclick="removerDoCarrinhoEdicao(${index})">X</button></div>
        </div>`;
    });
    const frete = unmaskCurrency(el('editPedFrete').value);
    soma += frete;
    el('editPedValorTotal').value = formatCurrency(soma);
    el('displayEditTotal').textContent = formatCurrency(soma);
}

function removerDoCarrinhoEdicao(index) { carrinhoEdicao.splice(index, 1); atualizarTelaCarrinhoEdicao(); }

async function salvarEdicaoPedidoDefinitiva() {
    if (!pedidoEmEdicaoId) return;
    
    const dadosEditados = {
        nome: upper(el('editPedNome').value), whatsapp: upper(el('editPedWhatsapp').value),
        instagram: upper(el('editPedInstagram').value), documento: upper(el('editPedCpf').value),
        cep: upper(el('editPedCep').value), cidade: upper(el('editPedCidade').value),
        estado: upper(el('editPedEstado').value), endereco: upper(el('editPedEndereco').value),
        complemento: upper(el('editPedComplemento').value), referencia: upper(el('editPedReferencia').value),
        rastreio: upper(el('editPedRastreio').value),
        metodoPagamento: el('editPedMetodo').value, statusPagamento: el('editPedStatusPagamento').value,
        itens: carrinhoEdicao, valorFrete: unmaskCurrency(el('editPedFrete').value),
        valorTotal: unmaskCurrency(el('editPedValorTotal').value)
    };

    // OMITIMOS O CÁLCULO DE DIFERENÇA DE ESTOQUE NA EDIÇÃO POR COMPLEXIDADE
    // Se excluiu item na edição, ele não devolve automaticamente. O foco é na rapidez do painel.

    await db.collection('pedidos').doc(pedidoEmEdicaoId).update(dadosEditados);
    showToast('✅ Pedido atualizado com sucesso!');
    fecharModalEditarPedido();
}

// ================= WHATSAPP E FERRAMENTAS =================
function mensagemWhatsInformal(pedido) {
    const nome = primeiroNome(pedido.nome);
    let itensTexto = '';
    (pedido.itens || []).forEach(i => {
        itensTexto += `▪ ${i.quantidade || 1}x ${i.tipoPeca || 'PECA'} | ${i.nomeEstampa || i.codigoEstampa}\n  Tamanho: ${i.tamanho || '-'} | Cor: ${i.cor || '-'}\n  Valor: ${formatCurrency(i.valorUnitario || 0)}\n\n`;
    });
    let txt = `Fala, ${nome}!\n\nPassando pra atualizar que seu pedido *#${pedido.numeroPedido || ''}* esta: *${pedido.status || 'PROCESSANDO'}*.\n\n*RESUMO DO SEU DROP:*\n${itensTexto}`;
    if(pedido.valorFrete > 0) txt += `*FRETE:* ${formatCurrency(pedido.valorFrete)}\n`;
    txt += `*TOTAL DO PEDIDO:* ${formatCurrency(pedido.valorTotal || 0)}\n\nQualquer duvida, e so dar um salve por aqui!`;
    return txt;
}

function linkWhatsPedido(pedido) {
    const numero = onlyDigits(pedido.whatsapp);
    if (!numero) return '#';
    return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagemWhatsInformal(pedido))}`;
}

function enviarCobranca(pedidoId) {
    const p = pedidosCache.find(x => x.id === pedidoId);
    if(!p || !onlyDigits(p.whatsapp)) return showToast('WhatsApp não encontrado', 'warning');
    const texto = `Fala, ${primeiroNome(p.nome)}! 💀\n\nPassando pra lembrar que seu pedido *#${p.numeroPedido}* tá separadinho aqui, só aguardando o pagamento do Pix pra gente fazer o envio!\n\nValor: *${formatCurrency(p.valorTotal)}*\n\nAssim que fizer, manda o comprovante aqui pra gente liberar a caixa! 🔥`;
    window.open(`https://wa.me/55${onlyDigits(p.whatsapp)}?text=${encodeURIComponent(texto)}`, '_blank');
}

function enviarRastreio(pedidoId) {
    const p = pedidosCache.find(x => x.id === pedidoId);
    if(!p || !onlyDigits(p.whatsapp) || !p.rastreio) return showToast('Sem código de rastreio ou WhatsApp', 'warning');
    const link = `https://www.linkcorreios.com.br/${p.rastreio}`;
    const texto = `Fala, ${primeiroNome(p.nome)}! O teu drop já está a caminho! 🚀\n\n📦 Código: *${p.rastreio}*\n\nAcompanha por aqui: ${link}`;
    window.open(`https://wa.me/55${onlyDigits(p.whatsapp)}?text=${encodeURIComponent(texto)}`, '_blank');
}

function enviarMensagemAniversario(whatsapp, nome) {
    const num = onlyDigits(whatsapp);
    if (!num) return showToast('Cliente sem WhatsApp cadastrado.', 'warning');
    const texto = `Fala, ${primeiroNome(nome)}! 🎉\n\nPassando aqui em nome da Waller pra te desejar um feliz aniversário! Muita paz, saúde, sucesso e drops incríveis na sua vida. Aproveita muito o seu dia! 💀🔥`;
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(texto)}`, '_blank');
}

// ETIQUETA DE ENVIO (PDF 10x15)
function gerarEtiquetaEnvio(pedidoId) {
    const p = pedidosCache.find(x => x.id === pedidoId);
    if(!p) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });

    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("WALLER CLOTHING", 50, 15, {align: "center"});
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("DESTINATÁRIO:", 10, 30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(p.nome || 'Cliente', 10, 37);
    
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`${p.endereco || ''} ${p.complemento ? ' - ' + p.complemento : ''}`, 10, 45, {maxWidth: 80});
    doc.text(`${p.cidade || ''} / ${p.estado || ''}`, 10, 55);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(`CEP: ${p.cep || '00000-000'}`, 10, 65);
    
    doc.setLineDash([2, 2], 0); doc.line(10, 75, 90, 75);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(`Pedido #${p.numeroPedido} - ${getItensResumo(p.itens)}`, 10, 85, {maxWidth: 80});
    
    doc.save(`etiqueta-${p.numeroPedido}.pdf`);
    showToast('Etiqueta gerada com sucesso!');
}

// ================= KANBAN PRODUÇÃO (DRAG & DROP) =================
function statusClass(status) {
    if (status === 'AGUARDANDO PAGAMENTO') return 'badge-pendente';
    if (status === 'EM SEPARAÇÃO') return 'badge-estampa';
    if (status === 'ENVIO EFETUADO') return 'badge-enviado';
    if (status === 'PEDIDO ENTREGUE') return 'badge-entregue';
    return 'badge-default';
}
function statusOptionsSelecionado(atual) { return STATUS_LIST.map((status) => `<option value="${status}" ${status === atual ? 'selected' : ''}>${status}</option>`).join(''); }

function abrirSanfonaStatus(id, statusAtual) {
    const selectId = `status-select-${id}`;
    return `<details class="status-sanfona"><summary>Mudar Estado</summary><select id="${selectId}">${statusOptionsSelecionado(statusAtual)}</select><button class="btn-add" onclick="salvarStatusPedido('${id}','${selectId}')">Salvar</button></details>`;
}
async function salvarStatusPedido(id, selectId) {
    const status = upper(el(selectId).value); await db.collection('pedidos').doc(id).update({ status }); showToast('Status atualizado!');
}
function excluirPedido(id) { if (confirm('Excluir este pedido permanentemente?')) db.collection('pedidos').doc(id).delete(); }

// FUNÇÕES DRAG AND DROP
function drag(ev, id) { ev.dataTransfer.setData("text", id); }
function allowDrop(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); }
function dragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); }
async function drop(ev, novoStatus) {
    ev.preventDefault(); ev.currentTarget.classList.remove('drag-over');
    const id = ev.dataTransfer.getData("text");
    if(id && novoStatus) {
        await db.collection('pedidos').doc(id).update({ status: novoStatus });
        showToast(`Movido para ${novoStatus}`);
    }
}

function renderPedidosGrid(lista) {
    const container = el('gridPedidosContainer');
    container.innerHTML = '';
    const grupos = STATUS_LIST.map((status) => ({ status, itens: lista.filter((p) => upper(p.status || 'PEDIDO FEITO') === status) }));

    const iWh = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;
    const iOl = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>`;
    const iLx = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;

    grupos.forEach((grupo) => {
        container.innerHTML += `<section class="kanban-col" ondrop="drop(event, '${grupo.status}')" ondragover="allowDrop(event)" ondragleave="dragLeave(event)">
            <header><h3>${grupo.status}</h3><span>${grupo.itens.length}</span></header>
            <div class="kanban-cards">${grupo.itens.map((pedido) => `
            <article class="pedido-card-v2" draggable="true" ondragstart="drag(event, '${pedido.id}')">
                <div class="pedido-header"><strong>#${pedido.numeroPedido || '----'}</strong><span class="pedido-badge ${statusClass(grupo.status)}">${grupo.status}</span></div>
                <p><strong>${pedido.nome || 'SEM NOME'}</strong></p>
                <p><strong>Itens:</strong> ${getItensResumo(pedido.itens)}</p>
                <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal || 0)}</p>
                ${grupo.status === 'AGUARDANDO PAGAMENTO' ? `<button class="btn-cobrar" onclick="enviarCobranca('${pedido.id}')">💸 Cobrar Pix</button>` : ''}
                ${abrirSanfonaStatus(pedido.id, upper(pedido.status || 'PEDIDO FEITO'))}
                <div class="pedido-actions">
                    <a class="btn-whats" target="_blank" title="WhatsApp" href="${linkWhatsPedido(pedido)}">${iWh}</a>
                    ${pedido.rastreio ? `<button class="btn-rastreio" title="Enviar Rastreio" onclick="enviarRastreio('${pedido.id}')">📦</button>` : ''}
                    <button class="btn-etiqueta" title="Etiqueta 10x15" onclick="gerarEtiquetaEnvio('${pedido.id}')">🏷️</button>
                    <button class="catalog-edit" title="Ver/Editar" onclick="abrirFichaPedido('${pedido.id}')">${iOl}</button>
                    <button class="catalog-delete" title="Excluir" onclick="excluirPedido('${pedido.id}')">${iLx}</button>
                </div>
            </article>`).join('')}</div></section>`;
    });
}

function aplicarFiltros() {
    const busca = upper(el('inputBusca').value);
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
}
function setFiltroBtn(filtro) {
    filtroAtual = filtro; document.querySelectorAll('.btn-filtro').forEach((btn) => btn.classList.remove('ativo'));
    const idMap = { TODOS: 'filtro-todos', 'AGUARDANDO PAGAMENTO': 'filtro-pagamento', 'EM PRODUÇÃO': 'filtro-producao', 'EM ENVIO': 'filtro-envio' };
    if (idMap[filtro]) el(idMap[filtro]).classList.add('ativo');
    aplicarFiltros();
}

function atualizarDashboard(lista) {
    const hoje = new Date();
    const pedidosMes = lista.filter((pedido) => {
        if (!pedido.dataCriacao) return false;
        const d = pedido.dataCriacao.toDate ? pedido.dataCriacao.toDate() : new Date(pedido.dataCriacao);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    });
    el('dashPedidosMes').textContent = pedidosMes.length;
    el('dashAguardandoPagamento').textContent = lista.filter((p) => upper(p.status) === 'AGUARDANDO PAGAMENTO').length;
    el('dashEnviar').textContent = lista.filter((p) => upper(p.status) === 'ENVIO EFETUADO').length;
    el('dashFaturamento').textContent = formatCurrency(lista.filter((p) => upper(p.statusPagamento) === 'PAGO').reduce((acc, p) => acc + (p.valorTotal || 0), 0));
    
    atualizarGraficoDashboard(lista);
}

// DASHBOARD GRAFICO CHART.JS
function atualizarGraficoDashboard(listaPedidos = pedidosCache) {
    const ctx = document.getElementById('graficoFaturamento');
    if (!ctx) return;

    // Agrupa faturamento dos ultimos 7 dias
    const dias = []; const valores = [];
    for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dias.push(d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
        const fatDia = listaPedidos.filter(p => {
            if(upper(p.statusPagamento) !== 'PAGO' || !p.dataCriacao) return false;
            const dataPed = p.dataCriacao.toDate ? p.dataCriacao.toDate() : new Date(p.dataCriacao);
            return dataPed.getDate() === d.getDate() && dataPed.getMonth() === d.getMonth();
        }).reduce((acc, p) => acc + (p.valorTotal || 0), 0);
        valores.push(fatDia);
    }

    const corGrafico = document.body.classList.contains('dark-mode') ? '#e5e7eb' : '#111827';
    const corBarra = '#d90429';

    if (graficoFat) graficoFat.destroy();
    graficoFat = new Chart(ctx, {
        type: 'bar',
        data: { labels: dias, datasets: [{ label: 'Faturamento (R$)', data: valores, backgroundColor: corBarra, borderRadius: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: corGrafico }, grid: { color: document.body.classList.contains('dark-mode') ? '#334155' : '#e5e7eb' } },
                x: { ticks: { color: corGrafico }, grid: { display: false } }
            }
        }
    });
}

// ================= CLIENTES E VIPs =================
function aniversarioProximo(dataIso) {
    if (!dataIso) return false;
    const hoje = new Date();
    const data = new Date(`${dataIso}T12:00:00`); 
    let niverEsteAno = new Date(hoje.getFullYear(), data.getMonth(), data.getDate());
    let diff = Math.ceil((niverEsteAno - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
    if (diff < 0) { niverEsteAno = new Date(hoje.getFullYear() + 1, data.getMonth(), data.getDate()); diff = Math.ceil((niverEsteAno - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000); }
    return diff >= 0 && diff <= 15;
}

function extrairClientesDosPedidos() {
    const mapa = new Map();
    clientesCache.forEach((c) => {
        const chave = onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`;
        mapa.set(chave, { ...c, totalPedidos: 0, totalGasto: 0, historicoPedidos: [] });
    });

    pedidosCache.forEach((pedido) => {
        const chave = onlyDigits(pedido.whatsapp) || `${upper(pedido.nome)}-${upper(pedido.documento)}`;
        if (!chave) return;
        const base = mapa.get(chave) || {
            nome: upper(pedido.nome), whatsapp: upper(pedido.whatsapp), instagram: upper(pedido.instagram), documento: upper(pedido.documento), cep: upper(pedido.cep), cidade: upper(pedido.cidade), estado: upper(pedido.estado), endereco: upper(pedido.endereco), complemento: upper(pedido.complemento), referencia: upper(pedido.referencia), aniversario: '', totalPedidos: 0, totalGasto: 0, historicoPedidos: []
        };
        base.totalPedidos += 1; base.totalGasto += Number(pedido.valorTotal) || 0; base.historicoPedidos.push(pedido);
        if (!base.cep) base.cep = upper(pedido.cep); if (!base.endereco) base.endereco = upper(pedido.endereco); if (!base.complemento) base.complemento = upper(pedido.complemento); if (!base.cidade) base.cidade = upper(pedido.cidade); if (!base.estado) base.estado = upper(pedido.estado);
        mapa.set(chave, base);
    });

    clientesCache = Array.from(mapa.values()).sort((a, b) => {
        const aNiv = aniversarioProximo(a.aniversario) ? 0 : 1;
        const bNiv = aniversarioProximo(b.aniversario) ? 0 : 1;
        if(aNiv !== bNiv) return aNiv - bNiv;
        return (a.nome || '').localeCompare(b.nome || '');
    });
}

function getSeloVip(total) {
    if(total >= 2000) return '<span class="niver-tag" style="background:#fef08a; color:#92400e;">👑 VIP Ouro</span>';
    if(total >= 1000) return '<span class="niver-tag" style="background:#e2e8f0; color:#334155;">💎 VIP Prata</span>';
    if(total >= 500) return '<span class="niver-tag" style="background:#fed7aa; color:#9a3412;">🌟 VIP Bronze</span>';
    return '';
}

function abrirVisualizacaoCliente(cliente) {
    const idRef = onlyDigits(cliente.whatsapp) || `${upper(cliente.nome)}-${upper(cliente.documento)}`;
    el('fichaClienteTitulo').textContent = `Ficha Completa: ${cliente.nome || 'Cliente'}`;
    el('fichaClienteConteudo').innerHTML = `
        <div class="cliente-ficha-grid">
            <p><strong>Nome Completo:</strong> ${cliente.nome || '-'} ${getSeloVip(cliente.totalGasto)}</p>
            <p><strong>WhatsApp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>Instagram:</strong> ${cliente.instagram || '-'}</p>
            <p><strong>CPF/CNPJ:</strong> ${cliente.documento || '-'}</p>
            <p><strong>CEP:</strong> ${cliente.cep || '-'}</p>
            <p><strong>Aniversário:</strong> ${cliente.aniversario ? formatDate(cliente.aniversario) : '-'}</p>
            <p><strong>Cidade/UF:</strong> ${cliente.cidade || '-'} / ${cliente.estado || ''}</p>
            <p><strong>Endereço:</strong> ${cliente.endereco || '-'} ${cliente.complemento ? ` - ${cliente.complemento}` : ''}</p>
            <p><strong>Total de pedidos:</strong> ${cliente.totalPedidos || 0}</p>
            <p><strong>Total gasto:</strong> ${formatCurrency(cliente.totalGasto || 0)}</p>
        </div>
        <div style="display:flex; gap:0.5rem; margin-top:1rem;">
            <button class="btn-primary" onclick="editarCliente('${idRef}'); fecharFichaCliente();">EDITAR DADOS DO CLIENTE</button>
            ${cliente.aniversario && aniversarioProximo(cliente.aniversario) ? `<button class="btn-whats" style="padding:0 1rem; border-radius:10px;" onclick="enviarMensagemAniversario('${cliente.whatsapp}', '${cliente.nome}')">🎉 Enviar Parabéns</button>` : ''}
        </div>
        <h3 class="form-section-title" style="margin-top:1.5rem;">Histórico de pedidos</h3>
        <div>${(cliente.historicoPedidos || []).map((p) => `<div class="item-carrinho"><div>#${p.numeroPedido} • ${formatDate(p.dataCriacao)} • ${p.status}</div><div>${formatCurrency(p.valorTotal || 0)}</div></div>`).join('') || 'Sem histórico'}</div>`;
    el('modalFichaCliente').style.display = 'flex';
}

function visualizarClientePorId(idRef) { const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef); if (cliente) abrirVisualizacaoCliente(cliente); }

function fecharFichaCliente() { el('modalFichaCliente').style.display = 'none'; }
function abrirCadastroCliente() { el('modalCliente').style.display = 'flex'; }
function fecharCadastroCliente() { el('modalCliente').style.display = 'none'; }

async function salvarCliente(e) {
    e.preventDefault();
    const id = onlyDigits(el('clienteWhatsapp').value) || `${Date.now()}`;
    await db.collection('clientes').doc(id).set({
        nome: upper(el('clienteNome').value), whatsapp: upper(el('clienteWhatsapp').value), instagram: upper(el('clienteInstagram').value),
        documento: upper(el('clienteDocumento').value), cep: upper(el('clienteCep').value), cidade: upper(el('clienteCidade').value),
        estado: upper(el('clienteEstado').value), endereco: upper(el('clienteEndereco').value), complemento: upper(el('clienteComplemento').value),
        referencia: upper(el('clienteReferencia').value), aniversario: el('clienteAniversario').value || ''
    }, { merge: true });
    e.target.reset(); showToast('Ficha de cliente guardada!'); fecharCadastroCliente();
}

function editarCliente(idRef) {
    const cliente = clientesCache.find((c) => (onlyDigits(c.whatsapp) || `${upper(c.nome)}-${upper(c.documento)}`) === idRef);
    if (!cliente) return;
    abrirCadastroCliente();
    el('clienteNome').value = cliente.nome || ''; el('clienteWhatsapp').value = cliente.whatsapp || ''; el('clienteInstagram').value = cliente.instagram || '';
    el('clienteDocumento').value = cliente.documento || ''; el('clienteCep').value = cliente.cep || ''; el('clienteCidade').value = cliente.cidade || '';
    el('clienteEstado').value = cliente.estado || ''; el('clienteEndereco').value = cliente.endereco || ''; el('clienteComplemento').value = cliente.complemento || '';
    el('clienteReferencia').value = cliente.referencia || ''; el('clienteAniversario').value = cliente.aniversario || '';
}

function excluirCliente(idRef) { if (confirm('Excluir ficha deste cliente? O histórico de pedidos continuará a existir.')) { db.collection('clientes').doc(idRef).delete(); showToast('Cliente excluído.', 'warning'); } }

function renderClientes() {
    const container = el('listaClientes'); container.innerHTML = '';
    if (!clientesCache.length) { container.innerHTML = '<div class="catalog-empty">Nenhum cliente na base.</div>'; return; }
    clientesCache.forEach((cliente) => {
        const idRef = onlyDigits(cliente.whatsapp) || `${upper(cliente.nome)}-${upper(cliente.documento)}`;
        const destaque = aniversarioProximo(cliente.aniversario);
        container.innerHTML += `<article class="cliente-card ${destaque ? 'cliente-alerta' : ''}">
            <h3>${cliente.nome || 'SEM NOME'}</h3>
            ${getSeloVip(cliente.totalGasto)} ${destaque ? '<span class="niver-tag pulse" style="margin-left:5px;">🎂 Aniversário Próximo</span>' : ''}
            <p><strong>Whatsapp:</strong> ${cliente.whatsapp || '-'}</p>
            <p><strong>Cidade:</strong> ${cliente.cidade || '-'} / ${cliente.estado || ''}</p>
            <div class="cliente-stats"><span>${cliente.totalPedidos || 0} pedido(s)</span><span>${formatCurrency(cliente.totalGasto || 0)}</span></div>
            <div class="pedido-actions">
                <button class="catalog-edit" onclick="visualizarClientePorId('${idRef}')">Ficha Completa</button>
                <button class="catalog-delete" onclick="excluirCliente('${idRef}')">🗑️</button>
            </div>
        </article>`;
    });
}

function filtrarClientes() {
    const busca = upper(el('filtroClientes').value);
    const filtrado = clientesCache.filter((c) => upper(`${c.nome} ${c.whatsapp} ${c.documento} ${c.cidade}`).includes(busca));
    // Re-render simples
}

function gerarPDF() {
    if (!pedidosCache.length) return showToast('Sem pedidos para PDF.', 'warning');
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.text('Fila de Produção - Waller Clothing', 14, 14);
    doc.autoTable({ startY: 20, head: [['Pedido', 'Cliente', 'Status', 'Total']], body: pedidosCache.map((p) => [`#${p.numeroPedido || '-'}`, p.nome || '-', p.status || '-', formatCurrency(p.valorTotal || 0)]) });
    doc.save(`fila-producao-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ================= CATÁLOGO DE PRODUTOS =================
function abrirModalNovaEstampa() { el('modalNovaEstampa').style.display = 'flex'; }
function fecharModalNovaEstampa() { el('modalNovaEstampa').style.display = 'none'; }

async function salvarNovaEstampa(e) {
    e.preventDefault();
    const cod = upper(el('cadCodigoEstampa').value);
    const estoqueObjeto = {
        P: parseInt(el('cadEstP').value)||0, M: parseInt(el('cadEstM').value)||0, G: parseInt(el('cadEstG').value)||0,
        GG: parseInt(el('cadEstGG').value)||0, XG: parseInt(el('cadEstXG').value)||0, UN: parseInt(el('cadEstUN').value)||0
    };
    await db.collection('estampas').doc(cod).set({
        codigo: cod, nome: upper(el('cadNomeEstampa').value), valor: unmaskCurrency(el('cadValorEstampa').value),
        tipoPadrao: upper(el('cadTipoPadrao').value), estoque: estoqueObjeto
    });
    e.target.reset(); showToast('Produto adicionado ao catálogo!'); fecharModalNovaEstampa();
}

function filtrarCatalogo() {
    const filtro = upper(el('filtroEstampas').value);
    renderCatalogo(estampasCache.filter((est) => est.codigo.includes(filtro) || est.nome.includes(filtro)));
}

function abrirModalCatalogo(codigo) {
    const item = estampasCache.find((est) => est.codigo === codigo);
    if (!item) return;
    el('editCatalogoCodigo').value = item.codigo; el('editCatalogoNome').value = item.nome;
    el('editCatalogoValor').value = formatCurrency(item.valor || 0); el('editCatalogoTipo').value = item.tipoPadrao || '';
    el('editEstP').value = item.estoque.P || 0; el('editEstM').value = item.estoque.M || 0; el('editEstG').value = item.estoque.G || 0;
    el('editEstGG').value = item.estoque.GG || 0; el('editEstXG').value = item.estoque.XG || 0; el('editEstUN').value = item.estoque.UN || 0;
    el('modalCatalogo').style.display = 'flex';
}
function fecharModalCatalogo() { el('modalCatalogo').style.display = 'none'; }

async function salvarEdicaoCatalogo(e) {
    e.preventDefault();
    const codigo = upper(el('editCatalogoCodigo').value);
    const estoqueObjeto = {
        P: parseInt(el('editEstP').value)||0, M: parseInt(el('editEstM').value)||0, G: parseInt(el('editEstG').value)||0,
        GG: parseInt(el('editEstGG').value)||0, XG: parseInt(el('editEstXG').value)||0, UN: parseInt(el('editEstUN').value)||0
    };
    await db.collection('estampas').doc(codigo).set({
        codigo, nome: upper(el('editCatalogoNome').value), valor: unmaskCurrency(el('editCatalogoValor').value),
        tipoPadrao: upper(el('editCatalogoTipo').value), estoque: estoqueObjeto
    });
    showToast('Produto atualizado!'); fecharModalCatalogo();
}

function renderCatalogo(lista = estampasCache) {
    const container = el('catalogoEstampas'); container.innerHTML = '';
    if (!lista.length) { container.innerHTML = '<div class="catalog-empty">Nenhum produto no catálogo.</div>'; return; }

    lista.forEach((est) => {
        let pills = '';
        Object.entries(est.estoque).forEach(([tam, qtd]) => { if(qtd > 0) pills += `<span class="stock-pill">${tam}: ${qtd}</span>`; });
        if(pills === '') pills = '<span class="stock-pill stock-esgotado">ESGOTADO</span>';

        container.innerHTML += `<article class="catalog-item">
            <div class="catalog-item-top"><p class="catalog-code">${est.codigo}</p></div>
            <h3>${est.nome}</h3>
            <p class="catalog-price">${formatCurrency(est.valor || 0)}</p>
            <p class="catalog-stock" style="color:var(--muted); font-size:0.75rem;">Tipo: ${est.tipoPadrao || 'Não definido'}</p>
            <div class="stock-grid">${pills}</div>
            <div class="catalog-actions">
                <button class="catalog-edit" onclick="abrirModalCatalogo('${est.codigo}')">Editar</button>
                <button class="catalog-delete" onclick="db.collection('estampas').doc('${est.codigo}').delete()">🗑️</button>
            </div>
        </article>`;
    });
}

// ================= LISTENERS DO FIREBASE =================
function iniciarListeners() {
    db.collection('clientes').onSnapshot((snap) => {
        let lidos = []; snap.forEach((doc) => lidos.push(doc.data())); clientesCache = lidos; 
        if(pedidosCache.length > 0) { extrairClientesDosPedidos(); renderClientes(); }
        el('carregandoClientes').style.display = 'none';
    });

    db.collection('pedidos').orderBy('dataCriacao', 'desc').onSnapshot((snap) => {
        let ped = []; snap.forEach((doc) => ped.push({ id: doc.id, ...doc.data() })); pedidosCache = ped;
        atualizarDashboard(pedidosCache); aplicarFiltros(); extrairClientesDosPedidos(); renderClientes();
        el('carregando').style.display = 'none';
    });

    db.collection('estampas').orderBy('codigo').onSnapshot((snap) => {
        let est = [];
        snap.forEach((doc) => {
            const data = doc.data();
            const estq = data.estoque || {P:0, M:0, G:0, GG:0, XG:0, UN: Number(data.estoque)||0};
            est.push({ codigo: upper(data.codigo), nome: upper(data.nome), valor: Number(data.valor) || 0, tipoPadrao: upper(data.tipoPadrao), estoque: estq });
        });
        estampasCache = est; renderCatalogo(); el('carregandoEstampas').style.display = 'none';
    });
}

// LIGA AS MÁSCARAS AOS FORMULÁRIOS
setupAutoFields('whatsapp', 'instagram', 'cpf', 'cep', 'cidade', 'estado', 'endereco', 'complemento');
setupAutoFields('clienteWhatsapp', 'clienteInstagram', 'clienteDocumento', 'clienteCep', 'clienteCidade', 'clienteEstado', 'clienteEndereco', 'clienteComplemento');
setupAutoFields('editPedWhatsapp', 'editPedInstagram', 'editPedCpf', 'editPedCep', 'editPedCidade', 'editPedEstado', 'editPedEndereco', 'editPedComplemento');

carregarTema();
iniciarListeners();
