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

function mudarTipoDesconto() {
    document.getElementById('valorDesconto').value = '';
    atualizarTelaCarrinho();
    document.getElementById('valorDesconto').focus();
}

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
// 🚀 MOTOR DE SINCRONIZAÇÃO ABSOLUTA E AUTOCOMPLETAR
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
// INTEGRAÇÃO MELHOR ENVIO (COTAÇÃO E POSTAGEM AVANÇADA)
// ==========================================
const ME_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYjE1MjVlZTlhNGI2ZTM0ODNmOGEzY2UyMGRmYTg1YzE0YjRmYjU0MDY0OWIwYjNkYTJhY2YzZDY2MDQ5YzcwOTM5NDE2YmE5NjIzYjE1ODgiLCJpYXQiOjE3NzI1NjAzODkuNTk0MDk2LCJuYmYiOjE3NzI1NjAzODkuNTk0MDk4LCJleHAiOjE4MDQwOTYzODkuNTgwODE4LCJzdWIiOiJhMTM2YTBlYi05ZjRkLTQxMTAtYTU2YS1hMjUyOWIzMmNkMzkiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmctdHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.RtNnI6gQsUbSmE58avCarbQtkpV6WCO7mSVrJXmr4ux57Aa8ex4afyxADl7Xcs8vBOkpMQoxCuhfcYYuGY09vPt4Y2gnHaFsom3Fym2s5b--yvCFiSciIJlSS7n1Jl_8Hs8hb7YRseC0BcjphqWg6-V5fG8GqIUtwZrnPWnZ4yiTM06Kiuk3nnJcJi6lCDQuYgTGW-QlDZ9xviXX3FtQZBykmTkbk3wbFyQ3kgX9n2nmgsmEkYe42UMXDrYNGYkkYfPOfPi-KP8Zx-sePv2DILv00_-u-XAtA0AAUafL-kh9rAuCu8tEMlEAEHazJIZE7Y_PCQF0zmlOOsX8OneMhX8WWFsiMVcloqIpl2XDIHmVi5CJN6CV2f2bTl8S9IfAtqXNRj8eUzSy777DXFn3KxZuZcjXy1AlnxCxRQ60qVYoy3C5BiOkrlAyCAB8Pjo_w6zJV9UiruNnsxdqzSakU5nx84-EaXfcGJP-8pMZdILK8LlZEoNrFNS0JMe3BXeyOjMHaeRCOfWHlWnzTF5e2yRhGd24XRjTMQnGAHSrEeDKpSlLMdzA3rsv90ebGY9VHsue4ZaiGmdMRAMJCJAdXZ69r3IYuBKTVENrrEBpU-8qSG_JUQd6qZ9XWnZtV2zXpuScAD9rTbDQWDQJvOHfZdHGiWHj9Mde4-h8q0qgtg8";
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
        // CORREÇÃO: URL LIMPA PARA O PROXY FUNCIONAR SEM BLOQUEIOS
        let fetchUrl = 'https://corsproxy.io/?https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';
        let res = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` },
            body: JSON.stringify(payload)
        });

        let dataText = await res.text();
        let data;
        try { data = JSON.parse(dataText); } catch(e) { throw new Error("Erro no Proxy"); }

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
            console.error("MelhorEnvio Cotar Erro:", data);
            let errMsg = data.error || data.message || 'CEP de destino inválido ou sem cobertura.';
            lista.innerHTML = `<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">O MelhorEnvio rejeitou a consulta.<br><span style="font-size:0.8rem; color:#666;">${errMsg}</span></div>`;
        }
    } catch(e) {
        console.error("Proxy Erro:", e);
        lista.innerHTML = '<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">⚠️ Falha de Conexão. Verifique sua internet ou tente novamente.</div>';
    }
}

async function chamarApiCarrinhoME(payload) {
    // CORREÇÃO: URL LIMPA PARA O PROXY FUNCIONAR SEM BLOQUEIOS
    let fetchUrl = 'https://corsproxy.io/?https://www.melhorenvio.com.br/api/v2/me/cart';
    let res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` },
        body: JSON.stringify(payload)
    });
    let texto = await res.text();
    try {
        return { ok: res.ok, data: JSON.parse(texto) };
    } catch(e) {
        return { ok: false, data: { error: "A resposta do MelhorEnvio falhou ou foi bloqueada pelo navegador." } };
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
        // Cotação prévia invisível para achar o serviço certo (sem encode para não dar erro)
        let calcRes = await fetch('https://corsproxy.io/?https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
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
        alert("⚠️ Falha de Conexão. Ocorreu um erro ao tentar acessar a API do Melhor Envio.");
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
