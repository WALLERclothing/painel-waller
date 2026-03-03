// ==========================================
// FUNÇÃO BLINDADA E VARIÁVEIS GLOBAIS
// ==========================================
let historicoNotificacoes = [];
let filtroAniversarioAtivo = false;
let despesasGlobais = []; 
let itensEdicaoTemporario = []; 
const isVitrine = window.location.search.includes('vitrine=true');

function safeNum(val) {
    if(val === undefined || val === null || val === '') return 0;
    if(typeof val === 'number') return val;
    if(typeof val === 'string') {
        if(val.includes('R$') || val.includes(',')) return unmaskCurrency(val);
        return parseFloat(val) || 0;
    }
    return 0;
}

function unmaskCurrency(value) {
    if (!value) return 0; if (typeof value === 'number') return value;
    return parseFloat(value.toString().replace(/[^\d,\-]/g, '').replace(',', '.')) || 0;
}

function formatCurrency(num) { return "R$ " + (parseFloat(num) || 0).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); }

function getSafeDate(val) {
    if (!val) return new Date();
    if (val && typeof val.toDate === 'function') return val.toDate(); 
    if (val && val.seconds) return new Date(val.seconds * 1000);
    let d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
}

// ==========================================
// 📦 INTELIGÊNCIA DE CUBAGEM (CÁLCULO DE CAIXA DINÂMICA)
// ==========================================
function calcularCaixaEPeso(itens) {
    if (!itens || itens.length === 0) return { weight: 0.3, length: 20, width: 15, height: 5 };
    
    let pesoTotal = 0;
    let pontuacaoVolume = 0;

    itens.forEach(item => {
        let qtd = parseInt(item.quantidade || 1);
        let tipo = (item.tipoPeca || '').toUpperCase();

        if (tipo === 'MOLETOM') {
            pesoTotal += (0.6 * qtd);
            pontuacaoVolume += (6 * qtd);
        } else if (tipo === 'OVERSIZED') {
            pesoTotal += (0.35 * qtd);
            pontuacaoVolume += (3 * qtd);
        } else if (tipo === 'REGATA') {
            pesoTotal += (0.15 * qtd);
            pontuacaoVolume += (1 * qtd);
        } else { 
            pesoTotal += (0.25 * qtd);
            pontuacaoVolume += (2 * qtd);
        }
    });

    let l = 20, w = 15, h = 5; 
    
    if (pontuacaoVolume > 20) {
        l = 40; w = 30; h = 20; 
    } else if (pontuacaoVolume > 10) {
        l = 30; w = 25; h = 15; 
    } else if (pontuacaoVolume > 4) {
        l = 25; w = 20; h = 10; 
    }

    pesoTotal = pesoTotal < 0.3 ? 0.3 : parseFloat(pesoTotal.toFixed(2));
    return { weight: pesoTotal, length: l, width: w, height: h };
}

// ==========================================
// MOTOR DE ÁUDIO E NOTIFICAÇÕES INTELIGENTES
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarSomSucesso() {
    try {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        osc.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1); 
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e){}
}

function tocarSomDrop() {
    try {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } catch(e){}
}

function showToast(msg, isError = false) {
    let toast = document.createElement('div');
    toast.className = 'brutal-toast';
    toast.style.borderColor = isError ? 'var(--red)' : 'var(--green)';
    toast.style.color = isError ? 'var(--red)' : 'var(--green)';
    toast.innerText = msg;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3500);

    let time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    let id = Date.now(); 
    historicoNotificacoes.unshift({id: id, msg: msg, time: time, isError: isError, lida: false});
    if(historicoNotificacoes.length > 20) historicoNotificacoes.pop(); 
    atualizarPainelNotificacoes();
}

function atualizarPainelNotificacoes() {
    let painel = document.getElementById('painelNotificacoes'); let badge = document.getElementById('contadorNotificacoes');
    let naoLidas = historicoNotificacoes.filter(n => !n.lida).length;
    if (naoLidas > 0) { badge.style.display = 'inline-block'; badge.innerText = naoLidas; } else { badge.style.display = 'none'; }
    if (historicoNotificacoes.length > 0) {
        painel.innerHTML = historicoNotificacoes.map(n => {
            let bg = n.lida ? 'transparent' : 'var(--gray)'; let opacidade = n.lida ? '0.5' : '1'; let sombra = n.lida ? 'none' : '3px 3px 0px var(--border-color)';
            let bolinhaNova = n.lida ? '' : '<span style="width:8px; height:8px; background:var(--red); border-radius:50%; display:inline-block;"></span>';
            return `<div onclick="marcarNotificacaoLida(${n.id})" style="cursor:pointer; font-size:0.85rem; border-left:4px solid ${n.isError ? 'var(--red)' : 'var(--green)'}; padding:10px; background:${bg}; color:var(--black); border: 1px solid var(--border-color); box-shadow: ${sombra}; border-radius: 4px; opacity: ${opacidade}; transition: 0.2s; margin-bottom: 5px;"><div style="display:flex; justify-content:space-between; margin-bottom: 5px;"><strong>${n.time}</strong> ${bolinhaNova}</div>${n.msg}</div>`;
        }).join('');
    } else { painel.innerHTML = '<div style="padding:10px; text-align:center; font-size:0.8rem; color:var(--text-muted);">Nenhuma notificação.</div>'; }
}

function marcarNotificacaoLida(id) { let notif = historicoNotificacoes.find(n => n.id === id); if(notif && !notif.lida) { notif.lida = true; atualizarPainelNotificacoes(); } }
function toggleNotificacoes() { let p = document.getElementById('painelNotificacoes'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }

// ==========================================
// ATALHOS DE TECLADO E STARTUP
// ==========================================
window.onload = () => { if(isVitrine) { document.body.classList.add('modo-vitrine'); mudarAba('estampas'); document.title = "Catálogo - Waller Clothing"; } };

document.addEventListener('keydown', (e) => {
    if(isVitrine) return;
    if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); mudarAba('cadastro'); }
    if (e.altKey && e.key.toLowerCase() === 'c') { e.preventDefault(); mudarAba('clientes'); }
    if (e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); mudarAba('producao'); }
    if (e.altKey && e.key.toLowerCase() === 'e') { e.preventDefault(); mudarAba('estampas'); }
    if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirBuscaGlobal(); }
});

function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light'); }
function toggleTheme() { const isDark = document.documentElement.getAttribute('data-theme') === 'dark'; localStorage.setItem('waller_theme', isDark ? 'light' : 'dark'); applyTheme(isDark ? 'light' : 'dark'); }
applyTheme(localStorage.getItem('waller_theme') || 'light');

function toggleModoFoco() {
    document.body.classList.toggle('modo-foco-ativo'); let btn = document.getElementById('btnFoco');
    if(document.body.classList.contains('modo-foco-ativo')) { btn.innerText = '❌ SAIR DO FOCO'; mudarAba('cadastro'); showToast("Modo Foco Ativado!"); } else { btn.innerText = '🎯 FOCO'; }
}

function abrirBuscaGlobal() { document.getElementById('modalBuscaGlobal').style.display = 'flex'; document.getElementById('inputBuscaGlobal').focus(); document.getElementById('resultadoBuscaGlobal').innerHTML = ''; }
function fecharBuscaGlobal(e) { if(e && e.target.id !== 'modalBuscaGlobal') return; document.getElementById('modalBuscaGlobal').style.display = 'none'; document.getElementById('inputBuscaGlobal').value = ''; }
function executarBuscaGlobal() {
    let termo = document.getElementById('inputBuscaGlobal').value.toUpperCase().trim(); let res = document.getElementById('resultadoBuscaGlobal');
    if(termo.length < 2) { res.innerHTML = ''; return; } let html = '';
    todosPedidos.filter(p => (p.nome&&p.nome.includes(termo)) || (p.whatsapp&&p.whatsapp.includes(termo)) || (p.numeroPedido&&p.numeroPedido.includes(termo))).slice(0,5).forEach(p => { html += `<div class="brutal-toast" style="cursor:pointer; margin-bottom:5px; border-color:var(--black); color:var(--black);" onclick="mudarAba('producao'); abrirModalEdicao('${p.id}'); fecharBuscaGlobal();">📦 PEDIDO #${p.numeroPedido} - ${p.nome}</div>`; });
    Object.keys(clientesCadastrados).forEach(w => { let c = clientesCadastrados[w]; if(!c.apagadoCRM && ((c.nome&&c.nome.includes(termo)) || w.includes(termo))) { html += `<div class="brutal-toast" style="cursor:pointer; margin-bottom:5px; border-color:var(--green); color:var(--green);" onclick="mudarAba('clientes'); abrirFichaCliente('${w}'); fecharBuscaGlobal();">👤 CLIENTE - ${c.nome}</div>`; } });
    Object.values(catalogoEstampas).filter(c => c.nome.includes(termo) || c.codigo.includes(termo)).slice(0,5).forEach(c => { html += `<div class="brutal-toast" style="cursor:pointer; margin-bottom:5px; border-color:#ffb703; color:#000;" onclick="mudarAba('estampas'); fecharBuscaGlobal();">👕 PRODUTO - [${c.codigo}] ${c.nome}</div>`; });
    res.innerHTML = html || '<div style="padding:10px; font-weight:900; color:var(--red);">NENHUM RESULTADO ENCONTRADO.</div>';
}

function preencherVendaBalcao() {
    document.getElementById('whatsapp').value = '(00) 00000-0000'; document.getElementById('nome').value = 'CLIENTE AVULSO / BALCÃO';
    document.getElementById('origemVenda').value = 'OUTRO'; document.getElementById('metodoPagamento').value = 'PIX';
    document.getElementById('statusPagamento').value = 'PAGO'; document.getElementById('valorFrete').value = 'R$ 0,00';
    document.getElementById('valorFreteReal').value = 'R$ 0,00'; document.getElementById('custoEmbalagem').value = 'R$ 0,00';
    document.getElementById('valorDesconto').value = ''; 
    document.getElementById('email').value = ''; 
    atualizarTelaCarrinho(); document.getElementById('codigoEstampa').focus(); 
    showToast("Dados de Venda Balcão Preenchidos!");
}

// ==========================================
// UTILITÁRIOS E MÁSCARAS
// ==========================================
function mudarTipoDesconto() { document.getElementById('valorDesconto').value = ''; atualizarTelaCarrinho(); document.getElementById('valorDesconto').focus(); }

function aplicarMascaraCpf(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length <= 3) e.target.value = v;
    else if (v.length <= 6) e.target.value = v.slice(0,3) + '.' + v.slice(3);
    else if (v.length <= 9) e.target.value = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
    else e.target.value = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9,11);
}

document.addEventListener('input', function(e) {
    if(e.target.classList.contains('moeda') && !e.target.readOnly) {
        if (e.target.id === 'valorDesconto') {
            let tipoDescEl = document.getElementById('tipoDesconto');
            let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$';
            if (tipoDesc === '%') {
                let value = e.target.value.replace(/\D/g, "");
                if (value === "") { e.target.value = ""; } else { let num = parseInt(value); if (num > 100) num = 100; e.target.value = num; }
                atualizarTelaCarrinho(); return; 
            }
        }
        let value = e.target.value.replace(/\D/g, ""); 
        if (value === "") { e.target.value = ""; return; }
        e.target.value = "R$ " + (parseInt(value) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        if (['valorFrete', 'valorFreteReal', 'custoEmbalagem', 'valorDesconto'].includes(e.target.id)) atualizarTelaCarrinho();
        if (['editValorFrete', 'editValorFreteReal', 'editValorDesconto'].includes(e.target.id)) recalcularSomaEdicao();
    }
});

function aplicarMascaraEPular(e) {
    let v = e.target.value.replace(/\D/g, ''); 
    if(v.length <= 2) e.target.value = v; else if(v.length <= 6) e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`; 
    else if(v.length <= 10) e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`; else e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`;
}

function aplicarMascaraCepEPular(e) {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 5) e.target.value = v.slice(0, 5) + '-' + v.slice(5, 8); else e.target.value = v;
    if (v.length === 8) { 
        buscarCEP(v); 
        if(e.target.id === 'cep') document.getElementById('numeroEnd').focus(); 
        if(e.target.id === 'fichaCEP') document.getElementById('fichaNumero').focus(); 
        if(e.target.id === 'editCEP') document.getElementById('editEndereco').focus();
    }
}

function aplicarMascaraDataEPular(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 2 && v.length <= 4) e.target.value = v.slice(0,2) + '/' + v.slice(2);
    else if (v.length > 4) e.target.value = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4,8); else e.target.value = v;
    if (v.length === 8) { if(document.getElementById('fichaCEP')) document.getElementById('fichaCEP').focus(); }
}

async function buscarCEP(cep) {
    let cleanCep = cep.replace(/\D/g, '');
    if(cleanCep.length === 8) {
        try {
            let res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`); let data = await res.json();
            if(!data.erro) {
                let endString = `${data.logradouro}, Bairro: ${data.bairro} - ${data.localidade}/${data.uf}`;
                if(document.getElementById('endereco')) document.getElementById('endereco').value = endString;
                if(document.getElementById('fichaEndereco')) document.getElementById('fichaEndereco').value = endString;
                if(document.getElementById('editEndereco')) document.getElementById('editEndereco').value = endString;
                showToast("CEP Encontrado!", false);
            } else { showToast("CEP Inválido", true); }
        } catch(e) { showToast("Erro ao buscar CEP", true); }
    }
}

// ==========================================
// 🚀 MOTOR DE SINCRONIZAÇÃO E AUTOCOMPLETAR
// ==========================================
function atualizarListasDeSugestao() {
    let htmlNomes = '';
    let htmlWhats = '';
    Object.values(clientesCadastrados).forEach(c => {
        if(c.nome) htmlNomes += `<option value="${c.nome}">`;
        if(c.whatsapp) htmlWhats += `<option value="${c.whatsapp}">`;
    });
    let ln = document.getElementById('listaNomes'); if(ln) ln.innerHTML = htmlNomes;
    let lw = document.getElementById('listaWhats'); if(lw) lw.innerHTML = htmlWhats;
}

function autocompletarCliente(termo, tipo) {
    if (!termo || termo.length < 3) return;
    let cEncontrado = null;
    
    if (tipo === 'nome') {
        let n = termo.toUpperCase().trim();
        cEncontrado = Object.values(clientesCadastrados).find(x => (x.nome || '').toUpperCase() === n);
    } else if (tipo === 'whatsapp') {
        let w = termo.trim();
        cEncontrado = clientesCadastrados[w];
    }

    if (cEncontrado) {
        if(tipo === 'nome' && document.getElementById('whatsapp').value !== cEncontrado.whatsapp) {
            document.getElementById('whatsapp').value = cEncontrado.whatsapp || '';
        }
        if(tipo === 'whatsapp' && document.getElementById('nome').value !== cEncontrado.nome) {
            document.getElementById('nome').value = cEncontrado.nome || '';
        }
        
        document.getElementById('cpf').value = cEncontrado.cpf || '';
        document.getElementById('email').value = cEncontrado.email || '';
        document.getElementById('cep').value = cEncontrado.cep || '';
        document.getElementById('endereco').value = cEncontrado.endereco || '';
        document.getElementById('numeroEnd').value = cEncontrado.numero || '';
        document.getElementById('complementoEnd').value = cEncontrado.complemento || '';
        
        document.getElementById('alertaClienteFiel').style.display = 'inline-block';
    } else {
        document.getElementById('alertaClienteFiel').style.display = 'none';
    }
}

function verificarClienteFiel() { autocompletarCliente(document.getElementById('whatsapp').value, 'whatsapp'); }

async function sincronizarClienteEmMassa(whatsapp, dadosObj) {
    if(!whatsapp || whatsapp.length < 10) return;
    
    try {
        await db.collection("clientes").doc(whatsapp).set(dadosObj, {merge: true});
    } catch(e) { console.error(e); }

    try {
        let snap = await db.collection("pedidos").where("whatsapp", "==", whatsapp).get();
        if(!snap.empty) {
            let batch = db.batch();
            snap.forEach(doc => {
                batch.update(doc.ref, {
                    nome: dadosObj.nome,
                    cpf: dadosObj.cpf,
                    email: dadosObj.email,
                    cep: dadosObj.cep,
                    endereco: dadosObj.endereco,
                    numeroEnd: dadosObj.numero, 
                    complemento: dadosObj.complemento
                });
            });
            await batch.commit();
        }
    } catch(e) { console.error(e); }
}

// ==========================================
// 🚀 INTEGRAÇÃO MELHOR ENVIO VIA TÚNEL VERCEL
// ==========================================
const ME_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYjE1MjVlZTlhNGI2ZTM0ODNmOGEzY2UyMGRmYTg1YzE0YjRmYjU0MDY0OWIwYjNkYTJhY2YzZDY2MDQ5YzcwOTM5NDE2YmE5NjIzYjE1ODgiLCJpYXQiOjE3NzI1NjAzODkuNTk0MDk2LCJuYmYiOjE3NzI1NjAzODkuNTk0MDk4LCJleHAiOjE4MDQwOTYzODkuNTgwODE4LCJzdWIiOiJhMTM2YTBlYi05ZjRkLTQxMTAtYTU2YS1hMjUyOWIzMmNkMzkiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmctdHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.RtNnI6gQsUbSmE58avCarbQtkpV6WCO7mSVrJXmr4ux57Aa8ex4afyxADl7Xcs8vBOkpMQoxCuhfcYYuGY09vPt4Y2gnHaFsom3Fym2s5b--yvCFiSciIJlSS7n1Jl_8Hs8hb7YRseC0BcjphqWg6-V5fG8GqIUtwZrnPWnZ4yiTM06Kiuk3nnJcJi6lCDQuYgTGW-QlDZ9xviXX3FtQZBykmTkbk3wbFyQ3kgX9n2nmgsmEkYe42UMXDrYNGYkkYfPOfPi-KP8Zx-sePv2DILv00_-u-XAtA0AAUafL-kh9rAuCu8tEMlEAEHazJIZE7Y_PCQF0zmlOOsX8OneMhX8WWFsiMVcloqIpl2XDIHmVi5CJN6CV2f2bTl8S9IfAtqXNRj8eUzSy777DXFn3KxZuZcjXy1AlnxCxRQ60qVYoy3C5BiOkrlAyCAB8Pjo_w6zJV9UiruNnsxdqzSakU5nx84-EaXfcGJP-8pMZdILK8LlZEoNrFNS0JMe3BXeyOjMHaeRCOfWHlWnzTF5e2yRhGd24XRjTMQnGAHSrEeDKpSlLMdzA3rsv90ebGY9VHsue4ZaiGmdMRAMJCJAdXZ69r3IYuBKTVENrrEBpU-8qSG_JUQd6qZ9XWnZtV2zXpuScAD9rTbDQWDQJvOHfZdHGiWHj9Mde4-h8q0qgtg8";
const ME_CPF_ORIGEM = "43737606838"; 

async function cotarFrete() {
    let cepDestino = document.getElementById('cep').value.replace(/\D/g, '');
    if(cepDestino.length !== 8) { showToast("Digite um CEP válido primeiro!", true); return; }
    
    document.getElementById('lblCepCotacao').innerText = document.getElementById('cep').value;
    let lista = document.getElementById('listaOpcoesFrete');
    lista.innerHTML = '<div style="text-align:center; padding:20px; font-weight:900;">Buscando fretes reais no MelhorEnvio... ⏳</div>';
    document.getElementById('modalFrete').style.display = 'flex';
    
    let cubagem = calcularCaixaEPeso(carrinhoTemporario);

    const payload = {
        "from": { "postal_code": "02475001" },
        "to": { "postal_code": cepDestino },
        "volumes": [
            { "weight": cubagem.weight, "width": cubagem.width, "height": cubagem.height, "length": cubagem.length }
        ],
        "options": { "insurance_value": 0, "receipt": false, "own_hand": false }
    };

    try {
        // ROTA LIMPA USANDO O TÚNEL DA VERCEL DIRETAMENTE
        let res = await fetch('/api/me/shipment/calculate', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` },
            body: JSON.stringify(payload)
        });

        let data = await res.json();

        if (res.ok && Array.isArray(data)) {
            let html = '';
            let fretesValidos = data.filter(s => !s.error && s.price);
            fretesValidos.sort((a,b) => parseFloat(a.price) - parseFloat(b.price));

            fretesValidos.forEach(serv => {
                let valorCalculado = parseFloat(serv.price);
                let icon = '🚚';
                if(serv.company.name.toUpperCase().includes('CORREIOS')) icon = serv.name.toUpperCase().includes('SEDEX') ? '⚡' : '📦';

                html += `
                <div class="frete-card" onclick="selecionarFrete(${valorCalculado})">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:900;">${icon} ${serv.company.name} - ${serv.name}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Chega em até ${serv.delivery_time} dias úteis (Caixa: ${cubagem.length}x${cubagem.width}x${cubagem.height})</span>
                    </div>
                    <span style="color:var(--green); font-weight:900; font-size: 1.2rem;">${formatCurrency(valorCalculado)}</span>
                </div>`;
            });
            lista.innerHTML = html !== '' ? html : '<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">Nenhum frete atende essa região.</div>';
        } else {
            let errMsg = data.error || data.message || 'CEP de destino inválido ou sem cobertura.';
            lista.innerHTML = `<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">O MelhorEnvio rejeitou a consulta.<br><span style="font-size:0.8rem; color:#666;">${errMsg}</span></div>`;
        }
    } catch(e) {
        lista.innerHTML = '<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">⚠️ Falha de Conexão. Verifique se o arquivo vercel.json está no GitHub.</div>';
    }
}

async function chamarApiCarrinhoME(payload) {
    // ROTA LIMPA USANDO O TÚNEL DA VERCEL
    let res = await fetch('/api/me/cart', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` },
        body: JSON.stringify(payload)
    });
    let texto = await res.text();
    try {
        return { ok: res.ok, data: JSON.parse(texto) };
    } catch(e) {
        return { ok: false, data: { error: "A resposta do MelhorEnvio falhou." } };
    }
}

async function enviarParaMelhorEnvio(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;

    let cpfCliente = (p.cpf || '').replace(/\D/g,'');
    if(cpfCliente.length !== 11) {
        alert("⚠️ ERRO: O CPF do cliente precisa ter exatamente 11 números e ser VÁLIDO na Receita Federal.\nClique no Lápis ✏️ para editar o pedido e arrumar o CPF.");
        return;
    }

    let cepDestino = (p.cep || '').replace(/\D/g, '');
    if(cepDestino.length !== 8) {
        alert("⚠️ ERRO: CEP do cliente inválido.");
        return;
    }

    showToast("Analisando volume da caixa e rotas... ⏳", false);

    let nomeCliente = p.nome ? p.nome.trim() : "Cliente";
    if(nomeCliente.split(' ').length < 2) nomeCliente += " Waller";

    let phoneLimpo = p.whatsapp ? p.whatsapp.replace(/\D/g, '') : '';
    if(phoneLimpo.length < 10 || phoneLimpo.length > 11) phoneLimpo = "11999999999"; 

    let emailCliente = p.email && p.email.includes('@') ? p.email.trim().toLowerCase() : "cliente@email.com";

    let cidade = 'São Paulo'; let uf = 'SP'; let bairro = 'Centro'; 
    let logradouro = p.endereco ? p.endereco.split(',')[0] : 'Rua Principal';
    
    try {
        let reqCep = await fetch(`https://viacep.com.br/ws/${cepDestino}/json/`);
        let resCep = await reqCep.json();
        if(!resCep.erro) {
            cidade = resCep.localidade; uf = resCep.uf;
            bairro = resCep.bairro || bairro; logradouro = resCep.logradouro || logradouro;
        }
    } catch(e) {}

    let matchNumero = p.endereco ? p.endereco.match(/,\s*(\d+)/) : null;
    let numeroEnd = p.numeroEnd || p.complemento || "SN"; 
    if(numeroEnd === "SN" && matchNumero) numeroEnd = matchNumero[1];
    if(!numeroEnd || numeroEnd.trim() === '') numeroEnd = "SN";

    let complementoEnvio = p.complemento ? p.complemento.trim() : "";

    let cubagem = calcularCaixaEPeso(p.itens || []);
    
    let valorTotalPecas = 0;
    (p.itens || []).forEach(i => { 
        valorTotalPecas += (safeNum(i.valorUnitario) * parseInt(i.quantidade || 1));
    });

    let selectedServiceId = 1; // Padrão PAC
    try {
        let calcPayload = {
            "from": { "postal_code": "02475001" },
            "to": { "postal_code": cepDestino },
            "volumes": [ { "weight": cubagem.weight, "width": cubagem.width, "height": cubagem.height, "length": cubagem.length } ],
            "options": { "insurance_value": 0, "receipt": false, "own_hand": false }
        };
        let calcRes = await fetch('/api/me/shipment/calculate', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` },
            body: JSON.stringify(calcPayload)
        });
        let calcData = await calcRes.json();
        if (Array.isArray(calcData)) {
            let validServices = calcData.filter(s => !s.error && s.price && s.company.name.toUpperCase().includes('CORREIOS'));
            if(validServices.length > 0) {
                validServices.sort((a,b) => parseFloat(a.price) - parseFloat(b.price));
                selectedServiceId = validServices[0].id; 
            }
        }
    } catch(e) { console.warn("Erro ao buscar rota ideal"); }

    let payload = {
        "service": selectedServiceId, 
        "from": {
            "name": "Waller Clothing",
            "phone": "11999999999",
            "email": "contato@wallerclothing.com.br",
            "document": ME_CPF_ORIGEM, 
            "postal_code": "02475001",
            "address": "Rua Conselheiro Moreira de Barros", 
            "number": "100",
            "district": "Santana", 
            "city": "São Paulo",
            "state_abbr": "SP",
            "country_id": "BR"
        },
        "to": {
            "name": nomeCliente,
            "phone": phoneLimpo,
            "email": emailCliente, 
            "document": cpfCliente,
            "address": logradouro,
            "number": numeroEnd,
            "complement": complementoEnvio, 
            "district": bairro,
            "city": cidade,
            "state_abbr": uf,
            "country_id": "BR",
            "postal_code": cepDestino,
            "note": "Pedido #" + (p.numeroPedido || '')
        },
        "products": [
            {
                "name": "Vestuário Waller",
                "quantity": 1, 
                "unitary_value": valorTotalPecas > 0 ? valorTotalPecas : 50.00
            }
        ],
        "volumes": [
            {
                "height": cubagem.height,
                "width": cubagem.width,
                "length": cubagem.length,
                "weight": cubagem.weight
            }
        ],
        "options": {
            "insurance_value": valorTotalPecas > 0 ? valorTotalPecas : 50.00,
            "receipt": false,
            "own_hand": false,
            "reverse_attach": false,
            "non_commercial": true
        }
    };

    try {
        let response = await chamarApiCarrinhoME(payload);
        let respString = JSON.stringify(response.data);
        
        if (!response.ok && (respString.includes("Transportadora não atende") || respString.includes("Transportadora nao atende"))) {
            showToast("PAC Indisponível para essa região. Tentando forçar via SEDEX... 🔄", false);
            payload.service = 2; // Muda para SEDEX
            response = await chamarApiCarrinhoME(payload);
            respString = JSON.stringify(response.data);
        }

        if (response.ok && response.data.id) {
            showToast("Caixa Dinâmica ("+cubagem.length+"x"+cubagem.width+"x"+cubagem.height+") gerada! 🎉", false);
            window.open("https://app.melhorenvio.com/carrinho", "_blank");
        } else {
            let detalhes = "Erro desconhecido.";
            
            if(response.data.message === "Unauthenticated.") {
                detalhes = "O seu Token expirou ou é inválido. Gere um novo no painel do MelhorEnvio.";
            } else if(response.data.errors) {
                detalhes = Object.entries(response.data.errors).map(([k, v]) => `- ${k.toUpperCase()}: ${v.join(', ')}`).join('\n');
            } else if (response.data.error) {
                detalhes = response.data.error; 
            } else if (response.data.message) {
                detalhes = response.data.message;
            } else {
                detalhes = respString;
            }

            alert(`❌ O MelhorEnvio rejeitou a etiqueta.\n\nMOTIVO:\n${detalhes}\n\nATENÇÃO: O CPF do cliente não pode ser inventado.`);
        }
    } catch (e) {
        alert("⚠️ Falha ao se conectar com o servidor do MelhorEnvio. O arquivo vercel.json está configurado corretamente?");
    }
}

function selecionarFrete(valor) { document.getElementById('valorFreteReal').value = formatCurrency(valor); document.getElementById('valorFrete').value = formatCurrency(valor); atualizarTelaCarrinho(); document.getElementById('modalFrete').style.display = 'none'; showToast("Frete Aplicado!"); }
function fecharModalFrete(e) { if(e && e.target.id !== 'modalFrete') return; document.getElementById('modalFrete').style.display = 'none'; }
function mudarAba(aba) { ['cadastro', 'producao', 'estampas', 'clientes'].forEach(a => document.getElementById('aba-' + a).style.display = a === aba ? 'block' : 'none'); ['Cadastro', 'Producao', 'Estampas', 'Clientes'].forEach(a => document.getElementById('tab' + a + 'Btn').classList.toggle('tab-active', a.toLowerCase() === aba)); }
function toggleItens(id) { let lista = document.getElementById('itens-' + id); let seta = document.getElementById('seta-' + id); if(lista.style.display === 'none') { lista.style.display = 'flex'; seta.innerHTML = '▲'; } else { lista.style.display = 'none'; seta.innerHTML = '▼'; } }
function toggleGrafico() { let cont = document.getElementById('container-grafico'); let seta = document.getElementById('seta-grafico'); if(cont.style.display === 'none') { cont.style.display = 'flex'; seta.innerText = '▲'; } else { cont.style.display = 'none'; seta.innerText = '▼'; } }

// ==========================================
// FIREBASE INIT E DESPESAS (DRE)
// ==========================================
const firebaseConfig = { apiKey: "AIzaSyDnch84Sl5VyIi0YmOAde4jTftsssLEsNA", authDomain: "banco-de-dados-waller.firebaseapp.com", projectId: "banco-de-dados-waller", storageBucket: "banco-de-dados-waller.firebasestorage.app", messagingSenderId: "595978694752", appId: "1:595978694752:web:69aa74348560268a5a1305" };
firebase.initializeApp(firebaseConfig); const db = firebase.firestore();

if(!isVitrine) { db.collection("despesas").onSnapshot(snap => { despesasGlobais = []; snap.forEach(doc => { let d = doc.data(); d.id = doc.id; despesasGlobais.push(d); }); calcularFaturamentoMensal(); }); }

function abrirModalDespesas() { let mes = document.getElementById('selectFaturamentoMes').value; if(mes === 'ALL' || !mes) { showToast("Selecione um mês no Dashboard primeiro!", true); return; } document.getElementById('lblMesDespesa').innerText = mes; document.getElementById('modalDespesas').style.display = 'flex'; renderizarListaDespesas(mes); }
function fecharModalDespesas() { document.getElementById('modalDespesas').style.display = 'none'; }
function renderizarListaDespesas(mes) { let html = ''; let despesasMes = despesasGlobais.filter(d => d.mesAno === mes); despesasMes.forEach(d => { html += `<div style="display:flex; justify-content:space-between; padding:8px; background:var(--white); border:1px solid var(--border-color);"><span>${d.descricao}</span><div><strong style="color:var(--red); margin-right:10px;">${formatCurrency(d.valor)}</strong> <button onclick="deletarDespesa('${d.id}')" style="background:transparent; border:none; color:var(--red);">❌</button></div></div>`; }); document.getElementById('listaDespesasMes').innerHTML = html || '<div style="font-size:0.8rem; color:var(--text-muted);">Nenhuma despesa registrada neste mês.</div>'; }
function salvarNovaDespesa(e) { e.preventDefault(); let mes = document.getElementById('lblMesDespesa').innerText; let desc = document.getElementById('descDespesa').value.toUpperCase(); let valor = safeNum(document.getElementById('valorDespesa').value); db.collection("despesas").add({ mesAno: mes, descricao: desc, valor: valor, dataCriacao: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { document.getElementById('descDespesa').value = ''; document.getElementById('valorDespesa').value = ''; showToast("Despesa salva!"); renderizarListaDespesas(mes); }); }
function deletarDespesa(id) { if(confirm("Apagar despesa?")) db.collection("despesas").doc(id).delete().then(() => renderizarListaDespesas(document.getElementById('lblMesDespesa').innerText)); }

// ==========================================
// CATÁLOGO E ESTOQUE (COM VITRINE)
// ==========================================
let catalogoEstampas = {}; 
db.collection("estampas").orderBy("codigo").onSnapshot((querySnapshot) => {
    document.getElementById('listaEstampas').innerHTML = ''; if(document.getElementById('estampas-list')) document.getElementById('estampas-list').innerHTML = '';
    catalogoEstampas = {}; let setCategorias = new Set(); 

    querySnapshot.forEach((doc) => {
        let est = doc.data(); if(est.apagado === true) return; 
        let cat = est.categoria || 'CAMISETA'; setCategorias.add(cat);
        let custo = est.custo || 0; let preco = est.precoVenda || 0; let e = est.estoqueGrade || { P:0, M:0, G:0, GG:0 };
        catalogoEstampas[est.codigo] = { id: doc.id, nome: est.nome, estoque: e, categoria: cat, custo: custo, precoVenda: preco };
        
        if(!isVitrine && document.getElementById('estampas-list')) document.getElementById('estampas-list').innerHTML += `<option value="${est.codigo}">${est.nome}</option>`;
        
        let totalEstoque = parseInt(e.P)+parseInt(e.M)+parseInt(e.G)+parseInt(e.GG); let badgeSoldOut = '';
        if (totalEstoque <= 0) badgeSoldOut = `<span class="badge-soldout" style="position:absolute; top:-12px; right:-12px; font-size:0.75rem; padding:6px 12px; background:var(--red);">🔴 ESGOTADO</span>`;
        else if (!isVitrine && totalEstoque <= 5) badgeSoldOut = `<span class="badge-soldout" style="position:absolute; top:-12px; right:-12px; font-size:0.75rem; padding:6px 12px; background:#ffb703; color:#000; border-color:#000;">🟡 ESTOQUE BAIXO (${totalEstoque})</span>`;
        
        if (isVitrine) {
            let tamsDisp = []; if(e.P > 0) tamsDisp.push('P'); if(e.M > 0) tamsDisp.push('M'); if(e.G > 0) tamsDisp.push('G'); if(e.GG > 0) tamsDisp.push('GG'); let tamsStr = tamsDisp.length > 0 ? tamsDisp.join(', ') : 'Indisponível no momento';
            document.getElementById('listaEstampas').innerHTML += `<div class="catalog-card">${badgeSoldOut}<div class="catalog-card-header"><div><h3 class="catalog-card-title" style="font-size:1.4rem;">${est.nome}</h3><div class="catalog-card-subtitle">${cat}</div></div><div style="text-align: right;"><div class="catalog-price" style="font-size:1.4rem;">${formatCurrency(preco)}</div></div></div><div style="margin-top: 15px; border-top:1px dashed var(--border-color); padding-top:10px;"><div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">TAMANHOS DISPONÍVEIS:</div><div style="font-weight:900; color:var(--black); font-size:1.1rem;">${tamsStr}</div></div></div>`;
        } else {
            document.getElementById('listaEstampas').innerHTML += `<div class="catalog-card">${badgeSoldOut}<div class="catalog-card-header"><div><h3 class="catalog-card-title">${est.nome}</h3><div class="catalog-card-subtitle">[${est.codigo}] • ${cat}</div></div><div style="text-align: right;"><div class="catalog-price">${formatCurrency(preco)}</div><div class="catalog-cost">Custo: ${formatCurrency(custo)}</div></div></div><div style="margin-top: 5px;"><div style="font-size: 0.75rem; font-weight: 800; color: var(--red); margin-bottom: 5px; text-transform: uppercase;">AJUSTE RÁPIDO:</div><div class="grade-tamanhos"><div class="grade-box">P <input type="number" value="${e.P || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'P', this.value)"></div><div class="grade-box">M <input type="number" value="${e.M || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'M', this.value)"></div><div class="grade-box">G <input type="number" value="${e.G || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'G', this.value)"></div><div class="grade-box">GG<input type="number" value="${e.GG || 0}" onchange="atualizarEstoqueGrade('${doc.id}', 'GG', this.value)"></div></div></div><div class="crm-actions" style="margin-top: 15px;"><button onclick="prepararEdicaoEstampa('${est.codigo}')" style="flex: 1;">✏️ EDITAR PRODUTO</button><button onclick="excluirEstampa('${doc.id}')" style="color:var(--red); flex: 0.3;">❌</button></div></div>`;
        }
    });
    if(!isVitrine && document.getElementById('listaCategoriasBD')) { document.getElementById('listaCategoriasBD').innerHTML = Array.from(setCategorias).map(c => `<option value="${c}">`).join(''); }
});

function copiarLinkVitrine() { let link = window.location.origin + window.location.pathname + '?vitrine=true'; navigator.clipboard.writeText(link).then(() => { showToast("Link da Vitrine copiado para enviar!"); }); }
function atualizarEstoqueGrade(id, tamanho, valorStr) { db.collection("estampas").doc(id).update({ ["estoqueGrade." + tamanho]: parseInt(valorStr) || 0 }); }
function abrirBalancoMassa() { let tbody = document.getElementById('bodyTabelaBalanco'); tbody.innerHTML = ''; Object.keys(catalogoEstampas).sort().forEach(cod => { let p = catalogoEstampas[cod]; tbody.innerHTML += `<tr data-id="${p.id}"><td><strong>${cod}</strong></td><td>${p.nome}</td><td><input type="number" class="balanco-input" data-tam="P" value="${p.estoque.P}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="M" value="${p.estoque.M}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="G" value="${p.estoque.G}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="GG" value="${p.estoque.GG}" style="padding:5px; text-align:center;"></td></tr>`; }); document.getElementById('modalBalanco').style.display = 'flex'; }
function fecharBalancoMassa() { document.getElementById('modalBalanco').style.display = 'none'; }
async function salvarBalancoMassa() { let btn = document.getElementById('btnSalvarBalanco'); btn.innerText = "SALVANDO..."; btn.disabled = true; let batch = db.batch(); let rows = document.querySelectorAll('#bodyTabelaBalanco tr'); rows.forEach(tr => { let docId = tr.getAttribute('data-id'); let inputs = tr.querySelectorAll('.balanco-input'); let novaGrade = {}; inputs.forEach(inp => novaGrade[inp.getAttribute('data-tam')] = parseInt(inp.value) || 0); batch.update(db.collection("estampas").doc(docId), { estoqueGrade: novaGrade }); }); await batch.commit(); btn.innerText = "SALVAR NOVO ESTOQUE"; btn.disabled = false; fecharBalancoMassa(); showToast("Estoque 100% atualizado."); }
function autocompletarEstampa(val) { let code = val.toUpperCase().trim(); if(catalogoEstampas[code]) { document.getElementById('nomeEstampa').value = catalogoEstampas[code].nome; document.getElementById('valorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda); } }
function abrirModalEstampa() { document.getElementById('modalEstampa').style.display = 'flex'; }
function fecharModalEstampa() { document.getElementById('modalEstampa').style.display = 'none'; document.getElementById('cadCodigoEstampa').value = ''; document.getElementById('cadCodigoEstampa').disabled = false; document.getElementById('cadNomeEstampa').value = ''; document.getElementById('estP').value = '0'; document.getElementById('estM').value = '0'; document.getElementById('estG').value = '0'; document.getElementById('estGG').value = '0'; document.getElementById('cadCusto').value = ''; document.getElementById('cadPreco').value = ''; document.getElementById('cadCategoriaEstampa').value = ''; document.getElementById('editEstampaCodigoOriginal').value = ''; document.getElementById('tituloModalEstampa').innerText = 'CADASTRAR PRODUTO'; document.getElementById('btnSalvarEstampa').innerText = 'SALVAR PRODUTO'; }
function prepararEdicaoEstampa(cod) { let p = catalogoEstampas[cod]; document.getElementById('cadCodigoEstampa').value = cod; document.getElementById('cadCodigoEstampa').disabled = true; document.getElementById('cadNomeEstampa').value = p.nome; document.getElementById('estP').value = p.estoque.P || 0; document.getElementById('estM').value = p.estoque.M || 0; document.getElementById('estG').value = p.estoque.G || 0; document.getElementById('estGG').value = p.estoque.GG || 0; document.getElementById('cadCusto').value = formatCurrency(p.custo); document.getElementById('cadPreco').value = formatCurrency(p.precoVenda); document.getElementById('cadCategoriaEstampa').value = p.categoria || ''; document.getElementById('editEstampaCodigoOriginal').value = cod; document.getElementById('tituloModalEstampa').innerText = 'EDITAR PRODUTO: ' + cod; document.getElementById('btnSalvarEstampa').innerText = 'ATUALIZAR PRODUTO'; abrirModalEstampa(); }
function salvarNovaEstampa(e) { e.preventDefault(); let cod = document.getElementById('cadCodigoEstampa').value.toUpperCase().trim(); let nom = document.getElementById('cadNomeEstampa').value.toUpperCase().trim(); let cat = document.getElementById('cadCategoriaEstampa').value.toUpperCase().trim(); let grade = { P: parseInt(document.getElementById('estP').value)||0, M: parseInt(document.getElementById('estM').value)||0, G: parseInt(document.getElementById('estG').value)||0, GG: parseInt(document.getElementById('estGG').value)||0 }; let custo = safeNum(document.getElementById('cadCusto').value); let preco = safeNum(document.getElementById('cadPreco').value); let docId = document.getElementById('editEstampaCodigoOriginal').value || cod; db.collection("estampas").doc(docId).set({ codigo: docId, nome: nom, categoria: cat, estoqueGrade: grade, custo: custo, precoVenda: preco, apagado: false }, { merge: true }).then(() => { fecharModalEstampa(); showToast("Produto Salvo!"); }); }
function excluirEstampa(id) { if(confirm(`Mandar estampa para a lixeira?`)) db.collection("estampas").doc(id).update({ apagado: true }); }

// ==========================================
// CRM E SINCRONIZAÇÃO EM LOTE
// ==========================================
let clientesCadastrados = {};
if(!isVitrine) { 
    db.collection("clientes").where("apagadoCRM", "==", false).onSnapshot(snap => { 
        clientesCadastrados = {}; 
        snap.forEach(doc => clientesCadastrados[doc.id] = doc.data()); 
        renderizarCRM(); 
        atualizarListasDeSugestao(); 
    }); 
}
let mapaClientes = {}; 

function abrirFichaNova() { 
    document.getElementById('fichaWhatsapp').value = ''; 
    document.getElementById('fichaWhatsapp').disabled = false; 
    document.getElementById('fichaNome').value = ''; 
    document.getElementById('fichaCPF').value = ''; 
    if(document.getElementById('fichaEmail')) document.getElementById('fichaEmail').value = ''; 
    document.getElementById('fichaInsta').value = ''; 
    document.getElementById('fichaDataNasc').value = ''; 
    document.getElementById('fichaCEP').value = ''; 
    document.getElementById('fichaEndereco').value = ''; 
    document.getElementById('fichaNumero').value = ''; 
    document.getElementById('fichaComplemento').value = ''; 
    document.getElementById('fichaObs').value = ''; 
    document.getElementById('fichaTag').value = ''; 
    document.getElementById('fichaQtdPedidos').innerText = '0'; 
    document.getElementById('fichaTotalGasto').innerText = 'R$ 0,00'; 
    document.getElementById('fichaHistoricoPedidos').innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">Novo cliente.</div>'; 
    document.getElementById('modalFichaCliente').style.display = 'flex'; 
}

function abrirFichaCliente(whatsapp) { 
    let dadosCompra = mapaClientes[whatsapp] || { qtd: 0, totalGasto: 0 }; 
    let perfil = clientesCadastrados[whatsapp] || {}; 
    document.getElementById('fichaWhatsapp').value = whatsapp; 
    document.getElementById('fichaWhatsapp').disabled = true; 
    document.getElementById('fichaNome').value = perfil.nome || dadosCompra.nome || ''; 
    document.getElementById('fichaCPF').value = perfil.cpf || ''; 
    if(document.getElementById('fichaEmail')) document.getElementById('fichaEmail').value = perfil.email || dadosCompra.email || ''; 
    document.getElementById('fichaInsta').value = perfil.insta || ''; 
    document.getElementById('fichaDataNasc').value = perfil.dataNasc || ''; 
    document.getElementById('fichaCEP').value = perfil.cep || dadosCompra.cep || ''; 
    document.getElementById('fichaEndereco').value = perfil.endereco || dadosCompra.endereco || ''; 
    document.getElementById('fichaNumero').value = perfil.numero || ''; 
    document.getElementById('fichaComplemento').value = perfil.complemento || ''; 
    document.getElementById('fichaObs').value = perfil.obs || ''; 
    document.getElementById('fichaTag').value = perfil.tag || ''; 
    document.getElementById('fichaQtdPedidos').innerText = dadosCompra.qtd; 
    document.getElementById('fichaTotalGasto').innerText = formatCurrency(dadosCompra.totalGasto); 
    
    let historicoHTML = ''; 
    let pedidosDoCliente = todosPedidos.filter(p => p.whatsapp === whatsapp); 
    if(pedidosDoCliente.length === 0) historicoHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">Nenhuma compra finalizada.</div>'; 
    else { pedidosDoCliente.forEach(p => { historicoHTML += `<div style="background:var(--gray); border:1px dashed var(--border-color); padding:10px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;"><div><strong>#${p.numeroPedido}</strong> - ${p.dataFormatada}<br><span style="color:var(--text-muted); font-weight:800;">${p.statusAtualizado}</span></div><div style="text-align:right;"><span style="color:var(--green); font-weight:900;">${formatCurrency(p.valorTotal)}</span><br><a href="#" onclick="abrirModalEdicao('${p.id}'); fecharFichaCliente();" style="color:var(--red); font-weight:800;">Detalhes</a></div></div>`; }); } 
    document.getElementById('fichaHistoricoPedidos').innerHTML = historicoHTML; 
    document.getElementById('modalFichaCliente').style.display = 'flex'; 
}

function fecharFichaCliente() { document.getElementById('modalFichaCliente').style.display = 'none'; }

async function salvarFichaCliente() { 
    let w = document.getElementById('fichaWhatsapp').value; 
    if(!w || w.length < 10) { showToast("Digite um Whatsapp Válido", true); return; } 
    
    let dadosObj = {
        whatsapp: w, 
        nome: document.getElementById('fichaNome').value.toUpperCase(),
        cpf: document.getElementById('fichaCPF').value,
        email: document.getElementById('fichaEmail') ? document.getElementById('fichaEmail').value.toLowerCase().trim() : '',
        cep: document.getElementById('fichaCEP').value,
        endereco: document.getElementById('fichaEndereco').value,
        numero: document.getElementById('fichaNumero').value,
        complemento: document.getElementById('fichaComplemento').value,
        insta: document.getElementById('fichaInsta').value, 
        dataNasc: document.getElementById('fichaDataNasc').value, 
        tag: document.getElementById('fichaTag').value.toUpperCase(), 
        obs: document.getElementById('fichaObs').value, 
        apagadoCRM: false 
    };

    showToast("Sincronizando ficha e pedidos... ⏳", false);
    await sincronizarClienteEmMassa(w, dadosObj);
    showToast("Ficha e Pedidos Sincronizados com Sucesso! 🎉"); 
    fecharFichaCliente(); 
}

function excluirFichaCliente(whatsapp) { if(confirm(`Ocultar a ficha de ${whatsapp}?`)) db.collection("clientes").doc(whatsapp).set({ apagadoCRM: true }, { merge: true }).then(() => { showToast("Cliente removido!"); }); }
function toggleFiltroAniversariantes() { filtroAniversarioAtivo = !filtroAniversarioAtivo; let btn = document.getElementById('btnFiltroNiver'); if (filtroAniversarioAtivo) { btn.style.background = 'var(--black)'; btn.style.color = '#ffd700'; btn.innerText = '🔙 TODOS'; showToast("Só aniversariantes!"); } else { btn.style.background = '#ffd700'; btn.style.color = '#000'; btn.innerText = '🎂 MÊS ATUAL'; } renderizarCRM(); }

// ==========================================
// LANÇAMENTO DE PEDIDO E BAIXA DE ESTOQUE
// ==========================================
let todosPedidos = []; let carrinhoTemporario = []; 

function adicionarAoCarrinho() {
    const cod = document.getElementById('codigoEstampa').value.toUpperCase().trim(); const nom = document.getElementById('nomeEstampa').value.toUpperCase().trim();
    const tip = document.getElementById('tipoPeca').value; const tam = document.getElementById('tamanho').value; const cor = document.getElementById('cor').value;
    const val = safeNum(document.getElementById('valorUnitario').value); const qtd = parseInt(document.getElementById('quantidade').value) || 1;

    if(!cod || !nom) { showToast("Preencha código e nome!", true); return; }
    if(catalogoEstampas[cod] && (catalogoEstampas[cod].estoque[tam] || 0) < qtd) showToast(`Aviso: Estoque baixo para tamanho ${tam}!`, true); 

    const custoProduto = catalogoEstampas[cod] ? safeNum(catalogoEstampas[cod].custo) : 0;
    carrinhoTemporario.push({ codigoEstampa: cod, nomeEstampa: nom, tipoPeca: tip, tamanho: tam, cor: cor, quantidade: qtd, valorUnitario: val, custoUnitario: custoProduto });
    atualizarTelaCarrinho(); document.getElementById('codigoEstampa').value = ''; document.getElementById('nomeEstampa').value = ''; document.getElementById('codigoEstampa').focus();
}

function removerDoCarrinho(i) { carrinhoTemporario.splice(i, 1); atualizarTelaCarrinho(); }

function atualizarTelaCarrinho() {
    let somaProdutos = 0; document.getElementById('listaCarrinho').innerHTML = '';
    carrinhoTemporario.forEach((p, i) => { 
        somaProdutos += (p.quantidade * safeNum(p.valorUnitario)); 
        document.getElementById('listaCarrinho').innerHTML += `<div class="carrinho-item"><span><strong>${p.quantidade}x</strong> ${p.tipoPeca} (${p.tamanho}) - [${p.codigoEstampa}]</span><div><span style="color:var(--red); font-weight:900;">${formatCurrency(p.valorUnitario)}</span> <button class="btn-remove-item" onclick="removerDoCarrinho(${i})">X</button></div></div>`; 
    });
    
    let freteCobrado = safeNum(document.getElementById('valorFrete').value);
    let tipoDescEl = document.getElementById('tipoDesconto');
    let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$'; 
    let descontoInput = safeNum(document.getElementById('valorDesconto').value);
    let descontoReal = tipoDesc === '%' ? somaProdutos * (descontoInput / 100) : descontoInput;
    
    let total = Math.max(0, somaProdutos + freteCobrado - descontoReal);
    document.getElementById('valorTotal').value = formatCurrency(total);
    document.getElementById('carrinho-container').style.display = carrinhoTemporario.length === 0 ? 'none' : 'block'; 
}

function limparFormularioPedido(ignorarConfirm = false) {
    if(!ignorarConfirm && !confirm("Tem certeza que deseja apagar tudo?")) return;
    document.getElementById('whatsapp').value = ''; document.getElementById('nome').value = ''; document.getElementById('cpf').value = ''; document.getElementById('origemVenda').value = 'INSTAGRAM'; document.getElementById('cep').value = ''; document.getElementById('endereco').value = ''; document.getElementById('numeroEnd').value = ''; document.getElementById('complementoEnd').value = ''; document.getElementById('valorFrete').value = ''; document.getElementById('valorFreteReal').value = ''; document.getElementById('custoEmbalagem').value = 'R$ 4,50'; 
    if(document.getElementById('tipoDesconto')) document.getElementById('tipoDesconto').value = 'R$'; 
    document.getElementById('valorDesconto').value = ''; document.getElementById('valorTotal').value = ''; document.getElementById('codigoEstampa').value = ''; document.getElementById('nomeEstampa').value = ''; document.getElementById('valorUnitario').value = ''; document.getElementById('quantidade').value = '1'; document.getElementById('alertaClienteFiel').style.display = 'none'; carrinhoTemporario = []; atualizarTelaCarrinho(); document.getElementById('whatsapp').focus(); 
}

async function salvarPedidoCompleto() {
    let w = document.getElementById('whatsapp').value;
    let nome = document.getElementById('nome').value.toUpperCase(); 
    if(!nome || !w || carrinhoTemporario.length===0) { showToast("Preencha Nome, Whats e 1 Peça!", true); return; }

    let freteCobrado = safeNum(document.getElementById('valorFrete').value); 
    let freteRealInput = safeNum(document.getElementById('valorFreteReal').value);
    let embalagem = safeNum(document.getElementById('custoEmbalagem').value);
    
    let somaVendaPecas = 0; carrinhoTemporario.forEach(item => { somaVendaPecas += (safeNum(item.valorUnitario) * parseInt(item.quantidade)); });
    
    let tipoDescEl = document.getElementById('tipoDesconto');
    let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$'; 
    let descontoInput = safeNum(document.getElementById('valorDesconto').value);
    let descontoRealDB = tipoDesc === '%' ? somaVendaPecas * (descontoInput / 100) : descontoInput;
    let totalCobrado = safeNum(document.getElementById('valorTotal').value);

    let somaCustoPecas = 0; carrinhoTemporario.forEach(item => { somaCustoPecas += (safeNum(item.custoUnitario) * parseInt(item.quantidade)); });
    let freteRealCalculo = freteRealInput > 0 ? freteRealInput : freteCobrado;
    let custoTotal = somaCustoPecas + embalagem + freteRealCalculo; let lucroCalculado = totalCobrado - custoTotal;

    let btnSalvar = document.getElementById('btnGerarOrdem'); btnSalvar.innerText = "SALVANDO..."; btnSalvar.disabled = true; 
    let numGerado = Math.floor(1000 + Math.random() * 9000).toString();

    let dadosObj = {
        whatsapp: w,
        nome: nome,
        cpf: document.getElementById('cpf').value,
        email: document.getElementById('email').value.toLowerCase().trim(),
        cep: document.getElementById('cep').value,
        endereco: document.getElementById('endereco').value,
        numero: document.getElementById('numeroEnd').value,
        complemento: document.getElementById('complementoEnd').value,
        apagadoCRM: false
    };

    let enderecoMontado = dadosObj.endereco + (dadosObj.numero ? ", " + dadosObj.numero : "");

    try {
        await db.collection("pedidos").add({
            numeroPedido: numGerado, nome: dadosObj.nome, whatsapp: w, cpf: dadosObj.cpf, email: dadosObj.email, origemVenda: document.getElementById('origemVenda').value, cep: dadosObj.cep, 
            endereco: enderecoMontado, numeroEnd: dadosObj.numero, complemento: dadosObj.complemento, 
            valorFrete: freteCobrado, valorFreteReal: freteRealInput, custoEmbalagem: embalagem, valorDesconto: descontoRealDB, valorTotal: totalCobrado, 
            custoTotalPedido: somaCustoPecas, lucroTotalPedido: lucroCalculado, apagado: false,
            metodoPagamento: document.getElementById('metodoPagamento').value, statusPagamento: document.getElementById('statusPagamento').value,
            itens: carrinhoTemporario, status: 'PEDIDO FEITO', rastreio: '', dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        await sincronizarClienteEmMassa(w, dadosObj);
        
        carrinhoTemporario.forEach(item => {
            if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) {
                db.collection("estampas").doc(item.codigoEstampa).update({ ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(-item.quantidade) });
            }
        });

        limparFormularioPedido(true); 
        tocarSomSucesso();
        showToast(`PEDIDO #${numGerado} SALVO!`);
    } catch (e) { showToast("Erro ao salvar", true); } finally { btnSalvar.innerText = "GERAR ORDEM DE SERVIÇO"; btnSalvar.disabled = false; }
}

// ==========================================
// KANBAN E DASHBOARD FINANCEIRO 
// ==========================================
if(!isVitrine) {
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
                
                let d = getSafeDate(p.dataCriacao);
                p.dataCriacaoSafe = d;
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

        try {
            todosPedidos.sort((a, b) => {
                let tA = a.dataCriacaoSafe ? a.dataCriacaoSafe.getTime() : 0;
                let tB = b.dataCriacaoSafe ? b.dataCriacaoSafe.getTime() : 0;
                return tB - tA;
            });
        } catch(e){}

        try { document.getElementById('dashPedidosMes').innerText = met.pedMes; } catch(e){}
        try { atualizarSelectFaturamento(meses); } catch(e){}
        try { renderizarCRM(); } catch(e){}
        try { renderizarKanban(); } catch(e){}
        try { renderizarGrafico(vendasPorMes); } catch(e){}
        
    }, (error) => { console.error("Erro Firebase:", error); });
}

function atualizarSelectFaturamento(mesesUnicos) {
    try {
        const select = document.getElementById('selectFaturamentoMes'); const valAnt = select.value; select.innerHTML = '';
        let arrayMeses = Array.from(mesesUnicos).sort((a,b) => { 
            let [mA,aA] = (a||'').split('/'); let [mB,aB] = (b||'').split('/'); 
            return new Date(aB,mB-1)-new Date(aA,mA-1); 
        });
        if(!arrayMeses.length) select.innerHTML='<option value="">-</option>';
        else { arrayMeses.forEach(m => select.innerHTML+=`<option value="${m}">${m}</option>`); select.value = arrayMeses.includes(valAnt)?valAnt:arrayMeses[0]; }
        calcularFaturamentoMensal();
    } catch(e){}
}

function calcularFaturamentoMensal() {
    try {
        let mes = document.getElementById('selectFaturamentoMes').value; 
        let somaFaturamento = 0; let somaLucroBruto = 0; let vendasCat = {}; let freqEstampas = {};

        todosPedidos.forEach(p => { 
            if(p.statusPagamento === 'PAGO' && p.dataMesAno === mes) {
                somaFaturamento += safeNum(p.valorTotal); somaLucroBruto += safeNum(p.lucroTotalPedido); 
                if(p.itens && Array.isArray(p.itens)) { 
                    p.itens.forEach(i => { 
                        let c = i.tipoPeca || 'OUTROS'; vendasCat[c] = (vendasCat[c] || 0) + parseInt(i.quantidade||1);
                        if(i.codigoEstampa) freqEstampas[i.nomeEstampa] = (freqEstampas[i.nomeEstampa]||0) + parseInt(i.quantidade||1);
                    }); 
                }
            }
        });

        let despesasDesteMes = despesasGlobais.filter(d => d.mesAno === mes).reduce((acc, d) => acc + safeNum(d.valor), 0);
        let lucroRealDRE = somaLucroBruto - despesasDesteMes;

        document.getElementById('dashFaturamento').innerText = formatCurrency(somaFaturamento);
        document.getElementById('dashDespesas').innerText = formatCurrency(despesasDesteMes);
        document.getElementById('dashLucro').innerText = formatCurrency(lucroRealDRE);
        
        let sortable = Object.entries(freqEstampas).sort((a,b) => b[1] - a[1]).slice(0,5); 
        document.getElementById('dashBestSellers').innerHTML = sortable.length ? sortable.map((x, i) => `<div>${i+1}. ${x[0]} <span style="color:var(--red);">(${x[1]}x)</span></div>`).join('') : 'Sem vendas';
        document.getElementById('dashBestSellersList').innerHTML = sortable.length ? sortable.map(x => `${x[0]} (${x[1]})`).join(' | ') : 'Sem histórico';
        renderizarGraficoPizza(vendasCat);
    } catch(e){}
}

function renderizarGrafico(vendas) {
    try {
        const canvas = document.getElementById('graficoVendas'); if(!canvas) return; 
        let labels = Object.keys(vendas).sort((a,b) => { let [mA,aA]=(a||'').split('/'); let [mB,aB]=(b||'').split('/'); return new Date(aA,mA-1)-new Date(aB,mB-1); }).slice(-6);
        let dados = labels.map(mes => vendas[mes]);

        if (chartInstancia) chartInstancia.destroy(); 
        chartInstancia = new Chart(canvas.getContext('2d'), { type: 'line', data: { labels: labels, datasets: [{ label: 'Faturamento Bruto', data: dados, backgroundColor: '#2a9d8f', borderColor: '#111111', borderWidth: 2, tension: 0.1, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false }, title: {display:true, text:'FATURAMENTO HISTÓRICO'} } } });
    } catch(e){}
}

function renderizarGraficoPizza(vendasCat) {
    try {
        const canvas = document.getElementById('graficoCategorias'); if(!canvas) return; 
        let labels = Object.keys(vendasCat); let dados = Object.values(vendasCat);
        if (chartCategoriasInstancia) chartCategoriasInstancia.destroy(); 
        chartCategoriasInstancia = new Chart(canvas.getContext('2d'), { type: 'doughnut', data: { labels: labels, datasets: [{ data: dados, backgroundColor: ['#111111', '#c1121f', '#2a9d8f', '#ffb703', '#666666'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels:{boxWidth:10, font:{size:10}} }, title: {display:true, text:'PEÇAS VENDIDAS NO MÊS'} } } });
    } catch(e){}
}

function renderizarCRM() {
    try {
        let combinados = {}; let tagsSet = new Set(); 
        Object.keys(mapaClientes).forEach(w => combinados[w] = { ...mapaClientes[w] });
        Object.keys(clientesCadastrados).forEach(w => {
            let cd = clientesCadastrados[w];
            if(!combinados[w]) combinados[w] = { nome: cd.nome, qtd: 0, totalGasto: 0, ultimaCompra: null };
            combinados[w].nome = cd.nome || combinados[w].nome; if(cd.tag && cd.tag !== 'NORMAL') tagsSet.add(cd.tag);
        });

        if(document.getElementById('listaTagsCRM')) document.getElementById('listaTagsCRM').innerHTML = Array.from(tagsSet).map(t => `<option value="${t}">`).join('');
        
        let mAtualNiver = String(new Date().getMonth() + 1).padStart(2, '0');
        let crmList = Object.entries(combinados).filter(c => {
            let dc = clientesCadastrados[c[0]];
            if(dc && dc.apagadoCRM === true) return false;
            if(filtroAniversarioAtivo) { return dc && dc.dataNasc && dc.dataNasc.length === 10 && dc.dataNasc.split('/')[1] === mAtualNiver; }
            return true;
        }).sort((a,b) => b[1].totalGasto - a[1].totalGasto);
        
        document.getElementById('listaClientesCRM').innerHTML = crmList.map((c, index) => {
            let zapLimpo = c[0].replace(/\D/g,''); let dataUc = c[1].ultimaCompra ? c[1].ultimaCompra.toLocaleDateString('pt-BR') : 'Sem dados';
            let tktMedio = c[1].qtd > 0 ? (c[1].totalGasto / c[1].qtd) : 0;
            let perfilCadastrado = clientesCadastrados[c[0]] || {};
            let tagHtml = perfilCadastrado.tag && perfilCadastrado.tag !== 'NORMAL' ? `<span class="badge-vip" style="background:#111; color:#fff;">${perfilCadastrado.tag}</span>` : '';
            let medalha = !filtroAniversarioAtivo ? (index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '') : '';
            let badgeNiver = perfilCadastrado.dataNasc && perfilCadastrado.dataNasc.length === 10 && perfilCadastrado.dataNasc.split('/')[1] === mAtualNiver ? `<span class="tag-niver">🎂 NIVER MÊS</span>` : '';
            let diasSumido = c[1].ultimaCompra ? Math.floor((new Date() - c[1].ultimaCompra) / (1000 * 60 * 60 * 24)) : 0;
            let classeSumido = diasSumido > 90 ? 'sumido' : ''; let badgeSumido = diasSumido > 90 ? `<span class="badge-soldout">SUMIDO (${diasSumido}d)</span>` : '';
            
            return `
            <div class="crm-card ${classeSumido}" style="height: 100%; display: flex; flex-direction: column;">
                <div>
                    <h3 class="crm-card-title">${medalha}${c[1].nome}</h3>
                    <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:5px; min-height: 22px;">
                        ${tagHtml} ${badgeNiver} ${badgeSumido}
                    </div>
                    <div class="crm-card-subtitle">${c[0]}</div>
                </div>
                
                <div style="margin-top: auto;">
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
                </div>
            </div>`;
        }).join('');
    } catch(e){}
}

function renderizarKanban() {
    try {
        let htmlFeito = ''; let htmlFila = ''; let htmlPronta = ''; let htmlEnviado = '';
        
        todosPedidos.forEach(p => {
            try {
                let statusRender = p.statusAtualizado || 'PEDIDO FEITO';
                let btnPgto = p.statusPagamento === 'PAGO' ? `<button class="btn-pgto pgto-pago" onclick="trocarPgto('${p.id}','PENDENTE')">💰 PAGO</button>` : `<button class="btn-pgto pgto-pendente" onclick="trocarPgto('${p.id}','PAGO')">⏳ PEND</button>`;
                
                let itensHtml = ''; let itensCount = 0;
                if (p.itens && Array.isArray(p.itens)) {
                    itensCount = p.itens.length;
                    itensHtml = p.itens.map(i => {
                        if(!i) return '';
                        return `<div class="item-tag-compacto" style="background:#fff; border:1px solid #111; border-left:3px solid #c1121f; padding:6px; margin-bottom:4px;"><div class="item-tag-topo"><span>${i.quantidade || 1}x ${i.tipoPeca || 'PEÇA'}</span></div><div style="font-weight:700; color:#666; font-size:0.7rem;">Tam: ${i.tamanho || '-'} | Cor: ${i.cor || '-'}</div><div style="color:#c1121f; font-weight:900; font-size:0.75rem;">[${i.codigoEstampa || '-'}] ${i.nomeEstampa || '-'}</div></div>`;
                    }).join('');
                }
                
                let d = p.dataCriacaoSafe || new Date(); 
                let diasAtraso = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
                let classeAlerta = ''; let badgeAlerta = '';
                
                if (statusRender !== 'PEDIDO ENVIADO') {
                    if (diasAtraso >= 5) { classeAlerta = 'atraso-critico'; badgeAlerta = `<span style="background: var(--red); color: var(--white); font-size: 0.65rem; padding: 2px 6px; font-weight: 900; display: inline-block; margin-left: 5px;">🚨 ${diasAtraso} D</span>`; } 
                    else if (diasAtraso >= 3) { classeAlerta = 'atraso-medio'; badgeAlerta = `<span style="background: #ffb703; color: #000; font-size: 0.65rem; padding: 2px 6px; font-weight: 900; display: inline-block; margin-left: 5px;">⚠️ ${diasAtraso} D</span>`; }
                }
                
                let iconeRastreio = p.rastreio ? '🚚 ' : '';
                let numPedido = p.numeroPedido || '0000';
                let dataFmt = p.dataFormatada || '--/--/----';
                let nomeCliente = p.nome || 'Cliente';
                let zapCliente = p.whatsapp || '';
                let totalVal = formatCurrency(p.valorTotal);
                let metPgt = p.metodoPagamento || 'PIX';

                let cardString = `
                <div class="pedido-card ${classeAlerta}" id="${p.id}" draggable="true" ondragstart="drag(event)" style="display:flex;">
                    <div class="pedido-header">
                        <div class="header-linha-1">
                            <div class="id-container">
                                <input type="checkbox" class="checkbox-bulk" value="${p.id}" onchange="checkBulk()">
                                <span class="pedido-id">${iconeRastreio}#${numPedido}</span>
                                ${badgeAlerta}
                            </div>
                            <span class="pedido-data">${dataFmt}</span>
                        </div>
                        ${btnPgto}
                    </div>
                    <div class="pedido-body">
                        <div class="cliente-nome">${nomeCliente} <br><span style="font-size:0.7rem; color:var(--text-muted); font-weight:500;">${zapCliente}</span></div>
                        <div class="cliente-financas">${totalVal} - ${metPgt}</div>
                        <div class="toggle-itens-btn" onclick="toggleItens('${p.id}')"><span>📦 PEÇAS (${itensCount})</span><span id="seta-${p.id}">▼</span></div>
                        <div class="pedido-itens-lista" id="itens-${p.id}">${itensHtml}</div>
                    </div>
                    <div class="pedido-footer">
                        <button onclick="enviarParaMelhorEnvio('${p.id}')" title="Gerar Etiqueta MelhorEnvio" style="color:var(--black); background:var(--white); border-right:var(--border-thick); flex: 1;"><span style="color:#ffb703; font-size:1rem;">🛒</span> ME</button>
                        <button onclick="enviarMensagemStatus('${p.id}')" title="Avisar cliente" style="color:var(--green); flex: 1;">💬</button>
                        <button onclick="abrirModalEdicao('${p.id}')" title="Editar" style="flex: 1;">✏️</button>
                        <button onclick="excluirPedido('${p.id}')" title="Lixeira" style="color:var(--red); flex: 0.5;">❌</button>
                    </div>
                </div>`;

                if (statusRender === 'AGUARDANDO ESTAMPA') { htmlFila += cardString; }
                else if (statusRender === 'ESTAMPA PRONTA') { htmlPronta += cardString; }
                else if (statusRender === 'PEDIDO ENVIADO') { htmlEnviado += cardString; }
                else { htmlFeito += cardString; } 

            } catch (err) {}
        });
        
        let col1 = document.getElementById('col-PEDIDO-FEITO'); if(col1) col1.innerHTML = htmlFeito;
        let col2 = document.getElementById('col-AGUARDANDO-ESTAMPA'); if(col2) col2.innerHTML = htmlFila;
        let col3 = document.getElementById('col-ESTAMPA-PRONTA'); if(col3) col3.innerHTML = htmlPronta;
        let col4 = document.getElementById('col-PEDIDO-ENVIADO'); if(col4) col4.innerHTML = htmlEnviado;

        filtrarKanban();
    } catch(globalErr) {}
}

function filtrarKanban() {
    try {
        let input = document.getElementById('inputBusca');
        let termo = input ? input.value.toUpperCase().trim() : '';
        document.querySelectorAll('.pedido-card').forEach(card => { 
            card.style.display = card.innerText.toUpperCase().includes(termo) ? 'flex' : 'none'; 
        });
    } catch(e){}
}

function drag(ev) { ev.dataTransfer.setData("text", ev.target.id); }
function allowDrop(ev) { ev.preventDefault(); }
function drop(ev, novoStatus) { 
    ev.preventDefault(); let pedidoId = ev.dataTransfer.getData("text"); 
    db.collection("pedidos").doc(pedidoId).update({ status: novoStatus }).then(() => { 
        tocarSomDrop();
        showToast("MOVIDO COM SUCESSO!"); 
    }); 
}

function trocarPgto(id, status) { db.collection("pedidos").doc(id).update({ statusPagamento: status }); }
function excluirPedido(id) { if (confirm("Mandar pedido para a lixeira?")) db.collection("pedidos").doc(id).update({apagado: true}); }

function enviarMensagemStatus(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;
    
    let zap = p.whatsapp.replace(/\D/g, ''); 
    let primeiroNome = p.nome.split(' ')[0];
    
    let texto = `Olá ${primeiroNome}! Tudo bem?\n\n`; 
    texto += `O status do seu pedido #${p.numeroPedido} da Waller Clothing foi atualizado para: ${p.statusAtualizado}\n\n`;
    
    texto += `RESUMO DO PEDIDO:\n`; 
    let subtotal = 0;
    
    (p.itens||[]).forEach(i => { 
        let qtd = parseInt(i.quantidade || 1);
        let valorUn = safeNum(i.valorUnitario);
        let totalItem = qtd * valorUn;
        subtotal += totalItem;
        texto += `[+] ${qtd}x ${i.tipoPeca||''} (${i.nomeEstampa||''} Tam: ${i.tamanho||''}) = ${formatCurrency(totalItem)}\n`; 
    });
    
    texto += `\nVALORES FINANCEIROS:\n`;
    texto += `Subtotal: ${formatCurrency(subtotal)}\n`;
    
    let frete = safeNum(p.valorFrete);
    if (frete > 0) texto += `Frete: ${formatCurrency(frete)}\n`;
    
    let desconto = safeNum(p.valorDesconto);
    if (desconto > 0) texto += `Desconto: ${formatCurrency(desconto)} (abatido)\n`;
    
    texto += `TOTAL FINAL: ${formatCurrency(safeNum(p.valorTotal))}\n`;
    
    if(p.rastreio && p.statusAtualizado === 'PEDIDO ENVIADO') { 
        texto += `\nSEU PEDIDO ESTÁ A CAMINHO!\n`;
        texto += `Código de Rastreio: ${p.rastreio}\n`;
        texto += `Acompanhe no link: https://rastreamento.correios.com.br/app/index.php\n`; 
    }
    
    let linkFinal = `https://wa.me/55${zap}?text=${encodeURIComponent(texto)}`; 
    window.open(linkFinal, '_blank');
}

// ==========================================
// 🚀 INTEGRAÇÃO MELHOR ENVIO VIA TÚNEL VERCEL
// ==========================================
async function chamarApiCarrinhoME(payload) {
    let res = await fetch('/api/me/cart', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` },
        body: JSON.stringify(payload)
    });
    let texto = await res.text();
    try {
        return { ok: res.ok, data: JSON.parse(texto) };
    } catch(e) {
        return { ok: false, data: { error: "A resposta do MelhorEnvio falhou." } };
    }
}

async function enviarParaMelhorEnvio(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;

    let cpfCliente = (p.cpf || '').replace(/\D/g,'');
    if(cpfCliente.length !== 11) {
        alert("⚠️ ERRO: O CPF do cliente precisa ter exatamente 11 números e ser VÁLIDO na Receita Federal.\nClique no Lápis ✏️ para editar o pedido e arrumar o CPF.");
        return;
    }

    let cepDestino = (p.cep || '').replace(/\D/g, '');
    if(cepDestino.length !== 8) {
        alert("⚠️ ERRO: CEP do cliente inválido.");
        return;
    }

    showToast("Analisando volume da caixa e rotas... ⏳", false);

    let nomeCliente = p.nome ? p.nome.trim() : "Cliente";
    if(nomeCliente.split(' ').length < 2) nomeCliente += " Waller";

    let phoneLimpo = p.whatsapp ? p.whatsapp.replace(/\D/g, '') : '';
    if(phoneLimpo.length < 10 || phoneLimpo.length > 11) phoneLimpo = "11999999999"; 

    let emailCliente = p.email && p.email.includes('@') ? p.email.trim().toLowerCase() : "cliente@email.com";

    let cidade = 'São Paulo'; let uf = 'SP'; let bairro = 'Centro'; 
    let logradouro = p.endereco ? p.endereco.split(',')[0] : 'Rua Principal';
    
    try {
        let reqCep = await fetch(`https://viacep.com.br/ws/${cepDestino}/json/`);
        let resCep = await reqCep.json();
        if(!resCep.erro) {
            cidade = resCep.localidade; uf = resCep.uf;
            bairro = resCep.bairro || bairro; logradouro = resCep.logradouro || logradouro;
        }
    } catch(e) {}

    let matchNumero = p.endereco ? p.endereco.match(/,\s*(\d+)/) : null;
    let numeroEnd = p.numeroEnd || p.complemento || "SN"; 
    if(numeroEnd === "SN" && matchNumero) numeroEnd = matchNumero[1];
    if(!numeroEnd || numeroEnd.trim() === '') numeroEnd = "SN";

    let complementoEnvio = p.complemento ? p.complemento.trim() : "";

    let cubagem = calcularCaixaEPeso(p.itens || []);
    
    let valorTotalPecas = 0;
    (p.itens || []).forEach(i => { 
        valorTotalPecas += (safeNum(i.valorUnitario) * parseInt(i.quantidade || 1));
    });

    let selectedServiceId = 1; 
    try {
        let calcPayload = {
            "from": { "postal_code": "02475001" },
            "to": { "postal_code": cepDestino },
            "volumes": [ { "weight": cubagem.weight, "width": cubagem.width, "height": cubagem.height, "length": cubagem.length } ],
            "options": { "insurance_value": 0, "receipt": false, "own_hand": false }
        };
        let calcRes = await fetch('/api/me/shipment/calculate', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` },
            body: JSON.stringify(calcPayload)
        });
        let calcData = await calcRes.json();
        if (Array.isArray(calcData)) {
            let validServices = calcData.filter(s => !s.error && s.price && s.company.name.toUpperCase().includes('CORREIOS'));
            if(validServices.length > 0) {
                validServices.sort((a,b) => parseFloat(a.price) - parseFloat(b.price));
                selectedServiceId = validServices[0].id; 
            }
        }
    } catch(e) { console.warn("Erro ao buscar rota ideal"); }

    let payload = {
        "service": selectedServiceId, 
        "from": {
            "name": "Waller Clothing",
            "phone": "11999999999",
            "email": "contato@wallerclothing.com.br",
            "document": ME_CPF_ORIGEM, 
            "postal_code": "02475001",
            "address": "Rua Conselheiro Moreira de Barros", 
            "number": "100",
            "district": "Santana", 
            "city": "São Paulo",
            "state_abbr": "SP",
            "country_id": "BR"
        },
        "to": {
            "name": nomeCliente,
            "phone": phoneLimpo,
            "email": emailCliente, 
            "document": cpfCliente,
            "address": logradouro,
            "number": numeroEnd,
            "complement": complementoEnvio, 
            "district": bairro,
            "city": cidade,
            "state_abbr": uf,
            "country_id": "BR",
            "postal_code": cepDestino,
            "note": "Pedido #" + (p.numeroPedido || '')
        },
        "products": [
            {
                "name": "Vestuário Waller",
                "quantity": 1, 
                "unitary_value": valorTotalPecas > 0 ? valorTotalPecas : 50.00
            }
        ],
        "volumes": [
            {
                "height": cubagem.height,
                "width": cubagem.width,
                "length": cubagem.length,
                "weight": cubagem.weight
            }
        ],
        "options": {
            "insurance_value": valorTotalPecas > 0 ? valorTotalPecas : 50.00,
            "receipt": false,
            "own_hand": false,
            "reverse_attach": false,
            "non_commercial": true
        }
    };

    try {
        let response = await chamarApiCarrinhoME(payload);
        let respString = JSON.stringify(response.data);
        
        if (!response.ok && (respString.includes("Transportadora não atende") || respString.includes("Transportadora nao atende"))) {
            showToast("PAC Indisponível para essa região. Tentando forçar via SEDEX... 🔄", false);
            payload.service = 2; // Muda para SEDEX
            response = await chamarApiCarrinhoME(payload);
            respString = JSON.stringify(response.data);
        }

        if (response.ok && response.data.id) {
            showToast("Caixa Dinâmica ("+cubagem.length+"x"+cubagem.width+"x"+cubagem.height+") gerada! 🎉", false);
            window.open("https://app.melhorenvio.com/carrinho", "_blank");
        } else {
            console.error("MelhorEnvio Error Details:", response.data);
            let detalhes = "Erro desconhecido.";
            
            if(response.data.message === "Unauthenticated.") {
                detalhes = "O seu Token expirou ou é inválido. Gere um novo no painel do MelhorEnvio.";
            } else if(response.data.errors) {
                detalhes = Object.entries(response.data.errors).map(([k, v]) => `- ${k.toUpperCase()}: ${v.join(', ')}`).join('\n');
            } else if (response.data.error) {
                detalhes = response.data.error; 
            } else if (response.data.message) {
                detalhes = response.data.message;
            } else {
                detalhes = respString;
            }

            alert(`❌ O MelhorEnvio rejeitou a etiqueta.\n\nMOTIVO:\n${detalhes}\n\nATENÇÃO: O CPF do cliente não pode ser inventado.`);
        }
    } catch (e) {
        alert("⚠️ Falha ao se conectar com o servidor do MelhorEnvio. O arquivo vercel.json está configurado corretamente?");
    }
}

function abrirModalEdicao(id) {
    const p = todosPedidos.find(x => x.id === id); if(!p) return;
    document.getElementById('editId').value = p.id; 
    document.getElementById('tituloEditPedido').innerText = "#" + (p.numeroPedido||'');
    document.getElementById('editNome').value = p.nome || ''; 
    document.getElementById('editWhatsapp').value = p.whatsapp || ''; 
    document.getElementById('editCPF').value = p.cpf || ''; 
    document.getElementById('editEmail').value = p.email || ''; 
    document.getElementById('editCEP').value = p.cep || ''; 
    document.getElementById('editEndereco').value = p.endereco || ''; 
    document.getElementById('editNumero').value = p.numeroEnd || ''; 
    document.getElementById('editComplemento').value = p.complemento || ''; 
    document.getElementById('editRastreio').value = p.rastreio || ''; 
    document.getElementById('editValorFrete').value = formatCurrency(safeNum(p.valorFrete)); 
    document.getElementById('editValorFreteReal').value = formatCurrency(safeNum(p.valorFreteReal)); 
    document.getElementById('editValorDesconto').value = formatCurrency(safeNum(p.valorDesconto));
    
    if(p.metodoPagamento) document.getElementById('editMetodoPagamento').value = p.metodoPagamento;
    
    itensEdicaoTemporario = JSON.parse(JSON.stringify(p.itens || []));
    renderizarItensEdicao();
    recalcularSomaEdicao();
    document.getElementById('modalEdicao').style.display = 'flex';
}

function autocompletarEstampaEdicao(val) {
    let code = val.toUpperCase().trim();
    if(catalogoEstampas[code]) {
        document.getElementById('editNomeEstampa').value = catalogoEstampas[code].nome;
        document.getElementById('editValorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda);
    }
}

function renderizarItensEdicao() {
    let container = document.getElementById('editItensContainer');
    container.innerHTML = '';
    itensEdicaoTemporario.forEach((item, index) => {
        container.innerHTML += `
        <div style="border: 2px dashed var(--border-color); padding: 10px; margin-bottom: 10px; background: var(--gray); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight:900;">${item.quantidade||1}x ${item.tipoPeca||''} [${item.codigoEstampa||''}]</div>
                <div style="font-size:0.8rem;">${item.nomeEstampa||''} - Tam: ${item.tamanho||''} - Cor: ${item.cor||''} - Preço: ${formatCurrency(item.valorUnitario)}</div>
            </div>
            <button type="button" class="btn-remove-item" onclick="removerDoCarrinhoEdicao(${index})" style="padding: 10px; font-size: 1rem;">X</button>
        </div>`;
    });
}

function adicionarAoCarrinhoEdicao() {
    const cod = document.getElementById('editCodigoEstampa').value.toUpperCase().trim();
    const nom = document.getElementById('editNomeEstampa').value.toUpperCase().trim();
    const tip = document.getElementById('editTipoPeca').value;
    const tam = document.getElementById('editTamanho').value;
    const cor = document.getElementById('editCor').value;
    const val = safeNum(document.getElementById('editValorUnitario').value);
    const qtd = parseInt(document.getElementById('editQuantidade').value) || 1;

    if(!cod || !nom) { showToast("Preencha código e nome!", true); return; }

    const custoProduto = catalogoEstampas[cod] ? safeNum(catalogoEstampas[cod].custo) : 0;
    itensEdicaoTemporario.push({ codigoEstampa: cod, nomeEstampa: nom, tipoPeca: tip, tamanho: tam, cor: cor, quantidade: qtd, valorUnitario: val, custoUnitario: custoProduto });

    document.getElementById('editCodigoEstampa').value = '';
    document.getElementById('editNomeEstampa').value = '';
    document.getElementById('editCodigoEstampa').focus();

    renderizarItensEdicao();
    recalcularSomaEdicao();
}

function removerDoCarrinhoEdicao(i) {
    itensEdicaoTemporario.splice(i, 1);
    renderizarItensEdicao();
    recalcularSomaEdicao();
}

function recalcularSomaEdicao() {
    let somaVendaPecas = 0; 
    itensEdicaoTemporario.forEach(item => { somaVendaPecas += (safeNum(item.valorUnitario) * parseInt(item.quantidade||1)); });
    
    let freteCobrado = safeNum(document.getElementById('editValorFrete').value); 
    let desconto = safeNum(document.getElementById('editValorDesconto').value);
    
    document.getElementById('editValorTotal').value = formatCurrency(Math.max(0, somaVendaPecas + freteCobrado - desconto));
}

function fecharModalEdicao() { document.getElementById('modalEdicao').style.display = 'none'; }

async function salvarAlteracoesEdicao() {
    const id = document.getElementById('editId').value; const pedido = todosPedidos.find(x => x.id === id); if(!pedido) return;
    
    let freteCobradoNovo = safeNum(document.getElementById('editValorFrete').value); 
    let freteRealNovo = safeNum(document.getElementById('editValorFreteReal').value); 
    let descontoNovo = safeNum(document.getElementById('editValorDesconto').value); 
    let rastreio = document.getElementById('editRastreio').value.toUpperCase().trim(); 
    
    let w = document.getElementById('editWhatsapp').value; 
    let dadosObj = {
        whatsapp: w,
        nome: document.getElementById('editNome').value.toUpperCase(),
        cpf: document.getElementById('editCPF').value,
        email: document.getElementById('editEmail').value.toLowerCase().trim(),
        cep: document.getElementById('editCEP').value,
        endereco: document.getElementById('editEndereco').value.toUpperCase(),
        numero: document.getElementById('editNumero').value,
        complemento: document.getElementById('editComplemento').value.toUpperCase()
    };
    
    let somaCustoPecas = 0; let somaVendaPecas = 0; 
    itensEdicaoTemporario.forEach(item => { 
        somaVendaPecas += (safeNum(item.valorUnitario) * parseInt(item.quantidade||1)); 
        somaCustoPecas += (safeNum(item.custoUnitario) * parseInt(item.quantidade||1)); 
    });
    
    let custoTotal = somaCustoPecas + safeNum(pedido.custoEmbalagem) + (freteRealNovo > 0 ? freteRealNovo : freteCobradoNovo);
    let novoTotal = Math.max(0, somaVendaPecas + freteCobradoNovo - descontoNovo); 
    let novoLucro = novoTotal - custoTotal;

    let oldItens = pedido.itens || [];
    let batch = db.batch();

    oldItens.forEach(item => {
        if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) {
            batch.update(db.collection("estampas").doc(item.codigoEstampa), { ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(parseInt(item.quantidade||1)) });
        }
    });

    itensEdicaoTemporario.forEach(item => {
        if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) {
            batch.update(db.collection("estampas").doc(item.codigoEstampa), { ["estoqueGrade." + item.tamanho]: firebase.firestore.FieldValue.increment(-parseInt(item.quantidade||1)) });
        }
    });

    batch.update(db.collection("pedidos").doc(id), { 
        nome: dadosObj.nome, 
        whatsapp: dadosObj.whatsapp, 
        cpf: dadosObj.cpf,
        email: dadosObj.email,
        cep: dadosObj.cep,
        endereco: dadosObj.endereco,
        numeroEnd: dadosObj.numero,
        complemento: dadosObj.complemento,
        metodoPagamento: document.getElementById('editMetodoPagamento').value, 
        rastreio: rastreio, 
        valorFrete: freteCobradoNovo, 
        valorFreteReal: freteRealNovo, 
        valorDesconto: descontoNovo,
        valorTotal: novoTotal, 
        custoTotalPedido: somaCustoPecas,
        lucroTotalPedido: novoLucro,
        itens: itensEdicaoTemporario
    });

    await batch.commit();
    await sincronizarClienteEmMassa(w, dadosObj);
    
    fecharModalEdicao(); 
    showToast("Pedido Atualizado e Sincronizado!");
}

// ==========================================
// PDFS (DRE E DECLARAÇÃO DE CONTEÚDO)
// ==========================================
function abrirModalPDF() { document.getElementById('modalPDF').style.display = 'flex'; }
function fecharModalPDF() { document.getElementById('modalPDF').style.display = 'none'; }

function desenharCabecalhoPDF(doc, titulo) {
    doc.setFillColor(217, 4, 41); doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("WALLER CLOTHING", 14, 12);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(titulo, 14, 18);
    doc.text(`Gerado: ${new Date().toLocaleDateString('pt-BR')}`, 160, 18);
}

function gerarPDFDetalhado(opcao) {
    let statusSel = [];
    if (opcao === 'TODOS') statusSel = ['PEDIDO FEITO', 'AGUARDANDO ESTAMPA'];
    else if (opcao === 'GERAL') statusSel = ['PEDIDO FEITO', 'AGUARDANDO ESTAMPA', 'ESTAMPA PRONTA', 'PEDIDO ENVIADO'];
    else statusSel = [opcao];

    const { jsPDF } = window.jspdf; const doc = new jsPDF(); 
    desenharCabecalhoPDF(doc, `CONFERENCIA DE PEDIDOS: ${opcao}`);
    let currentY = 35; let achou = false;

    statusSel.forEach(status => {
        const pend = todosPedidos.filter(p => p.statusAtualizado === status);
        if (pend.length > 0) {
            achou = true; 
            if(currentY > 260) { doc.addPage(); currentY = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(193, 18, 31); 
            doc.text(`STATUS: ${status}`, 14, currentY); currentY += 8; 
            
            pend.forEach(p => { 
                if(currentY > 265) { doc.addPage(); currentY = 20; }
                doc.setFillColor(235, 235, 235); 
                doc.setDrawColor(200, 200, 200);
                doc.rect(14, currentY, 182, 8, 'FD'); 
                
                doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
                let tituloPedido = `PEDIDO #${p.numeroPedido||'0'}  |  CLIENTE: ${p.nome||'Sem nome'}  |  ZAP: ${p.whatsapp||''}`;
                doc.text(tituloPedido, 16, currentY + 5.5);
                currentY += 8; 

                let rows = [];
                (p.itens||[]).forEach(i => { 
                    rows.push([ i.codigoEstampa||'-', i.nomeEstampa||'-', i.tipoPeca||'-', `${i.cor||'-'} / Tam: ${i.tamanho||'-'}`, (i.quantidade||1).toString() ]);
                }); 
                
                doc.autoTable({ 
                    startY: currentY, head: [['Cod', 'Estampa', 'Peca', 'Cor / Tam', 'Qtd']], body: rows, 
                    theme: 'grid', headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] }, 
                    styles: { fontSize: 9, cellPadding: 3 }, margin: { left: 14, right: 14 }
                });
                currentY = doc.lastAutoTable.finalY + 8; 
            });
            currentY += 5; 
        }
    });
    if(!achou) { showToast("Nenhum pedido nesse status!", true); return; } 
    doc.save(`waller_Detalhado_${opcao.replace(/ /g,'_')}.pdf`); fecharModalPDF();
}

function gerarPDFAgrupado(opcao) {
    let statusSel = [];
    if (opcao === 'TODOS') statusSel = ['PEDIDO FEITO', 'AGUARDANDO ESTAMPA'];
    else if (opcao === 'GERAL') statusSel = ['PEDIDO FEITO', 'AGUARDANDO ESTAMPA', 'ESTAMPA PRONTA', 'PEDIDO ENVIADO'];
    else statusSel = [opcao];

    const { jsPDF } = window.jspdf; const doc = new jsPDF(); 
    desenharCabecalhoPDF(doc, `PRODUCAO AGRUPADA: ${opcao}`);
    let currentY = 35; let achou = false;

    statusSel.forEach(status => {
        const pend = todosPedidos.filter(p => p.statusAtualizado === status);
        if (pend.length > 0) {
            achou = true; 
            if(currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 0, 0); 
            doc.text(`STATUS: ${status}`, 14, currentY); currentY += 5; 
            
            let total=0; const count={};
            pend.forEach(p => { 
                (p.itens||[]).forEach(i => { 
                    let q=parseInt(i.quantidade)||1; total+=q; 
                    const k=`${i.codigoEstampa||'-'} | ${i.nomeEstampa||'-'} | ${i.tipoPeca} | ${i.cor} | ${i.tamanho}`; 
                    count[k]=(count[k]||0)+q; 
                }); 
            });
            
            const rows = Object.keys(count).map(k => [...k.split(' | '), count[k]]).sort((a,b)=>a[0].localeCompare(b[0]));
            
            doc.autoTable({ 
                startY: currentY, head: [['Cod', 'Estampa', 'Peca', 'Cor', 'Tam', 'Qtd']], body: rows, 
                foot: [[ { content: 'TOTAL DE PECAS NA FILA:', colSpan: 5, styles: { halign: 'right'} }, { content: total.toString(), styles: { halign: 'center', fillColor:[217,4,41], textColor:[255,255,255] } } ]], 
                theme: 'grid', headStyles: { fillColor: [17,17,17], textColor: [255,255,255] }, styles: { fontSize: 9 } 
            });
            currentY = doc.lastAutoTable.finalY + 15; 
        }
    });
    if(!achou) { showToast("Nenhum pedido nesse status!", true); return; } 
    doc.save(`waller_Agrupado_${opcao.replace(/ /g,'_')}.pdf`); fecharModalPDF();
}

function gerarEtiquetasEnvio() {
    const prontos = todosPedidos.filter(p => p.statusAtualizado === 'ESTAMPA PRONTA' || p.statusAtualizado === 'PEDIDO ENVIADO');
    if(!prontos.length) { showToast("Nenhum pedido pronto!", true); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 15;
    prontos.forEach((p, idx) => {
        if(y > 200) { doc.addPage(); y = 15; }
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(14, y, 180, 85);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("REMETENTE:", 18, y+8); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("WALLER CLOTHING", 18, y+14); doc.setLineWidth(0.2); doc.line(14, y+18, 194, y+18);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("DESTINATARIO:", 18, y+26); doc.setFontSize(14); doc.text(p.nome||'SEM NOME', 18, y+34); doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text(`${p.endereco || 'Endereco nao informado'} ${p.complemento ? ' - ' + p.complemento : ''}`, 18, y+43); doc.setFont("helvetica", "bold"); doc.text(`CEP: ${p.cep || '00000-000'}`, 18, y+50); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Celular: ${p.whatsapp||''}`, 18, y+57); doc.line(14, y+63, 194, y+63); 
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(`PEDIDO #${p.numeroPedido||'0'}`, 18, y+71); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("Declaracao de Conteudo e Codigo de Rastreio devem ser anexados.", 18, y+78);
        y += 95; 
    }); doc.save(`waller_etiquetas.pdf`); fecharModalPDF();
}

function gerarDeclaracaoConteudo() {
    const prontos = todosPedidos.filter(p => p.statusAtualizado === 'ESTAMPA PRONTA' || p.statusAtualizado === 'PEDIDO ENVIADO');
    if(!prontos.length) { showToast("Nenhum pedido pronto!", true); return; }
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    
    prontos.forEach((p, idx) => {
        if(idx > 0) doc.addPage();
        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("DECLARACAO DE CONTEUDO", 105, 20, null, null, "center");
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("Conforme o art. 13 da Lei Postal no 6.538/78", 105, 25, null, null, "center");
        
        doc.setLineWidth(0.3); doc.rect(14, 35, 88, 45); doc.rect(108, 35, 88, 45);
        doc.setFont("helvetica", "bold"); doc.text("REMETENTE", 16, 40); doc.text("DESTINATARIO", 110, 40);
        doc.setFont("helvetica", "normal");
        doc.text("Nome: WALLER CLOTHING", 16, 48); doc.text("Endereco: Rua Conselheiro Moreira de Barros 100", 16, 56); doc.text("CEP: 02475-001", 16, 64);
        
        doc.text(`Nome: ${p.nome||''}`, 110, 48); 
        let endStr = doc.splitTextToSize(`Endereco: ${p.endereco || ''} ${p.complemento || ''}`, 84);
        doc.text(endStr, 110, 56); doc.text(`CEP: ${p.cep || ''}`, 110, 72);

        doc.setFont("helvetica", "bold"); doc.text("IDENTIFICACAO DOS BENS", 105, 90, null, null, "center");
        let rows = []; let pesoTotal = 0;
        (p.itens||[]).forEach(i => { rows.push([i.quantidade||1, `${i.tipoPeca} (${i.nomeEstampa})`, formatCurrency(i.valorUnitario)]); pesoTotal += parseInt(i.quantidade||1) * 0.25; });
        doc.autoTable({ startY: 95, head: [['Qtd', 'Conteudo', 'Valor (R$)']], body: rows, theme: 'grid', headStyles: { fillColor: [200,200,200], textColor: [0,0,0] } });
        
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10); doc.text(`Peso Total (Kg): ${pesoTotal.toFixed(2)}`, 14, finalY);
        doc.setFontSize(8); doc.text("Declaro que o conteudo nao constitui objeto de correspondencia e nao e proibido.", 14, finalY + 15);
        doc.line(14, finalY + 35, 100, finalY + 35); doc.text("Assinatura do Remetente", 14, finalY + 40); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 130, finalY + 35);
    });
    doc.save(`waller_declaracao_conteudo.pdf`); fecharModalPDF();
}

async function gerarPDFLucroLiquido() {
    let dtIniStr = document.getElementById('pdfDataInicio').value; let dtFimStr = document.getElementById('pdfDataFim').value;
    if(!dtIniStr || !dtFimStr) { showToast("Selecione a Data Inicial e Final!", true); return; }

    let start = new Date(dtIniStr + 'T00:00:00'); let end = new Date(dtFimStr + 'T23:59:59');
    let snapshotPedidos = await db.collection("pedidos").where("dataCriacao", ">=", start).where("dataCriacao", "<=", end).get();
    let snapshotDespesas = await db.collection("despesas").where("dataCriacao", ">=", start).where("dataCriacao", "<=", end).get();

    let pagos = []; snapshotPedidos.forEach(doc => { let p = doc.data(); if(p.statusPagamento === 'PAGO' && p.apagado !== true) pagos.push(p); });
    if(!pagos.length) { showToast("Sem vendas pagas nesse período!", true); return; }

    let despesasPeriodo = 0; snapshotDespesas.forEach(doc => despesasPeriodo += safeNum(doc.data().valor));

    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    desenharCabecalhoPDF(doc, `DRE FINANCEIRO: ${start.toLocaleDateString('pt-BR')} ate ${end.toLocaleDateString('pt-BR')}`);

    let somaFaturamento = 0; let somaCustoPecas = 0; let somaEmbalagem = 0; let somaDescontos = 0;
    let somaFreteCobrado = 0; let somaFreteReal = 0; let somaLucroBruto = 0; let qtdPecasVendidas = 0;

    pagos.forEach(p => {
        somaFaturamento += safeNum(p.valorTotal); somaCustoPecas += safeNum(p.custoTotalPedido); somaEmbalagem += safeNum(p.custoEmbalagem); somaDescontos += safeNum(p.valorDesconto);
        somaFreteCobrado += safeNum(p.valorFrete); somaLucroBruto += safeNum(p.lucroTotalPedido);
        somaFreteReal += (safeNum(p.valorFreteReal) > 0 ? safeNum(p.valorFreteReal) : safeNum(p.valorFrete));
        (p.itens||[]).forEach(i => qtdPecasVendidas += (parseInt(i.quantidade) || 1));
    });

    let balancoFrete = somaFreteCobrado - somaFreteReal; let lucroLiquidoReal = somaLucroBruto - despesasPeriodo;

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(193, 18, 31); doc.text("1. RESUMO DE VENDAS E OPERACAO", 14, 35);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
    doc.text(`Total de Pedidos Pagos: ${pagos.length} pedidos`, 14, 45); doc.text(`Total de Pecas Vendidas: ${qtdPecasVendidas} pecas`, 110, 45);
    doc.text(`(+) Faturamento Bruto: ${formatCurrency(somaFaturamento)}`, 14, 55); doc.text(`(-) Custo de Producao (Pecas): ${formatCurrency(somaCustoPecas)}`, 14, 62);
    doc.text(`(-) Custo de Embalagens: ${formatCurrency(somaEmbalagem)}`, 14, 69); doc.text(`(-) Descontos Concedidos: ${formatCurrency(somaDescontos)}`, 14, 76);
    doc.text(`Frete Recebido: ${formatCurrency(somaFreteCobrado)}`, 110, 55); doc.text(`Frete Pago: ${formatCurrency(somaFreteReal)}`, 110, 62);
    doc.setFont("helvetica", "bold"); doc.text(`Balanco Logistico: ${formatCurrency(balancoFrete)}`, 110, 69); doc.setFont("helvetica", "normal");

    doc.setFillColor(255, 183, 3); doc.rect(14, 82, 180, 8, 'F'); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(`LUCRO BRUTO: ${formatCurrency(somaLucroBruto)}`, 18, 88);

    doc.setFontSize(12); doc.setTextColor(193, 18, 31); doc.text("2. CUSTOS FIXOS E RESULTADO (DRE)", 14, 105);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
    doc.text(`(-) Total de Despesas Administrativas/Fixas lancadas no periodo: ${formatCurrency(despesasPeriodo)}`, 14, 115);

    doc.setFillColor(6, 214, 160); doc.rect(14, 125, 180, 10, 'F'); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(`LUCRO LIQUIDO FINAL: ${formatCurrency(lucroLiquidoReal)}`, 18, 132);

    doc.setTextColor(193, 18, 31); doc.text("3. DETALHAMENTO DE PEDIDOS", 14, 150);
    let rows = pagos.map(p => [ `#${p.numeroPedido||'0'}`, (p.nome||'').split(' ')[0], formatCurrency(safeNum(p.valorTotal)), formatCurrency(safeNum(p.custoTotalPedido)), formatCurrency(safeNum(p.lucroTotalPedido)) ]);
    doc.autoTable({ startY: 155, head: [['Pedido', 'Cliente', 'Faturamento', 'Custo Pecas', 'Lucro Bruto']], body: rows, theme: 'grid', headStyles: { fillColor: [17,17,17] }, styles: { fontSize: 8 } });

    doc.save(`waller_DRE_${dtIniStr}_a_${dtFimStr}.pdf`); fecharModalPDF();
}
