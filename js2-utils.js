// ==========================================
// UTILITÁRIOS E MÁSCARAS
// ==========================================
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

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function tocarSomSucesso() { try { if(audioCtx.state === 'suspended') audioCtx.resume(); const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); osc.start(); osc.stop(audioCtx.currentTime + 0.3); } catch(e){} }
function tocarSomDrop() { try { if(audioCtx.state === 'suspended') audioCtx.resume(); const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15); gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); osc.start(); osc.stop(audioCtx.currentTime + 0.15); } catch(e){} }

function showToast(msg, isError = false) {
    let toast = document.createElement('div'); toast.className = 'brutal-toast'; toast.style.borderColor = isError ? 'var(--red)' : 'var(--green)'; toast.style.color = isError ? 'var(--red)' : 'var(--green)'; toast.innerText = msg; document.getElementById('toastContainer').appendChild(toast); setTimeout(() => toast.remove(), 3500);
    let time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); let id = Date.now(); 
    historicoNotificacoes.unshift({id: id, msg: msg, time: time, isError: isError, lida: false}); if(historicoNotificacoes.length > 20) historicoNotificacoes.pop(); 
    atualizarPainelNotificacoes();
}

function atualizarPainelNotificacoes() {
    let painel = document.getElementById('painelNotificacoes'); let badge = document.getElementById('contadorNotificacoes'); let naoLidas = historicoNotificacoes.filter(n => !n.lida).length;
    
    if (naoLidas > 0) { badge.style.display = 'inline-block'; badge.innerText = naoLidas; } else { badge.style.display = 'none'; }
    
    if (historicoNotificacoes.length > 0) {
        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">
                        <strong style="font-size: 0.9rem;">NOTIFICAÇÕES</strong>
                        <button onclick="limparTodasNotificacoes()" style="background:var(--red); color:var(--white); border:none; padding:4px 8px; font-size:0.7rem; cursor:pointer; font-weight:900;">LIMPAR TUDO</button>
                    </div>`;
                    
        html += historicoNotificacoes.map((n, index) => { 
            let bg = n.lida ? 'transparent' : 'var(--gray)'; let opacidade = n.lida ? '0.6' : '1'; let sombra = n.lida ? 'none' : '3px 3px 0px var(--border-color)'; let bolinhaNova = n.lida ? '' : '<span style="width:8px; height:8px; background:var(--red); border-radius:50%; display:inline-block;"></span>'; 
            return `
            <div style="position:relative; font-size:0.85rem; border-left:4px solid ${n.isError ? 'var(--red)' : 'var(--green)'}; padding:10px; padding-right: 25px; background:${bg}; color:var(--black); border: 1px solid var(--border-color); box-shadow: ${sombra}; border-radius: 0; opacity: ${opacidade}; transition: 0.2s; margin-bottom: 5px;">
                <div onclick="marcarNotificacaoLida(${n.id})" style="cursor:pointer;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 5px;"><strong>${n.time}</strong> ${bolinhaNova}</div>
                    ${n.msg}
                </div>
                <button onclick="removerNotificacao(${index})" style="position:absolute; top:5px; right:2px; background:transparent; border:none; color:var(--red); font-weight:900; font-size:1rem; cursor:pointer;" title="Excluir Mensagem">X</button>
            </div>`; 
        }).join('');
        
        painel.innerHTML = html;
    } else { 
        painel.innerHTML = '<div style="padding:10px; text-align:center; font-size:0.8rem; color:var(--text-muted);">Nenhuma notificação.</div>'; 
    }
}

function marcarNotificacaoLida(id) { let notif = historicoNotificacoes.find(n => n.id === id); if(notif && !notif.lida) { notif.lida = true; atualizarPainelNotificacoes(); } }
function removerNotificacao(index) { historicoNotificacoes.splice(index, 1); atualizarPainelNotificacoes(); }
function limparTodasNotificacoes() { historicoNotificacoes = []; atualizarPainelNotificacoes(); }
function toggleNotificacoes() { let p = document.getElementById('painelNotificacoes'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }

function aplicarMascaraCpf(e) { let v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) e.target.value = v; else if (v.length <= 6) e.target.value = v.slice(0,3) + '.' + v.slice(3); else if (v.length <= 9) e.target.value = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6); else e.target.value = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9,11); }
function aplicarMascaraEPular(e) { let v = e.target.value.replace(/\D/g, ''); if(v.length <= 2) e.target.value = v; else if(v.length <= 6) e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`; else if(v.length <= 10) e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`; else e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`; }
function aplicarMascaraCepEPular(e) { let v = e.target.value.replace(/\D/g, ''); if (v.length > 5) e.target.value = v.slice(0, 5) + '-' + v.slice(5, 8); else e.target.value = v; if (v.length === 8) { buscarCEP(v); if(e.target.id === 'cep') document.getElementById('numeroEnd').focus(); if(e.target.id === 'fichaCEP') document.getElementById('fichaNumero').focus(); if(e.target.id === 'editCEP') document.getElementById('editEndereco').focus(); } }
function aplicarMascaraDataEPular(e) { let v = e.target.value.replace(/\D/g, ''); if (v.length > 2 && v.length <= 4) e.target.value = v.slice(0,2) + '/' + v.slice(2); else if (v.length > 4) e.target.value = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4,8); else e.target.value = v; if (v.length === 8) { if(document.getElementById('fichaCEP')) document.getElementById('fichaCEP').focus(); } }

async function buscarCEP(cep) { let cleanCep = cep.replace(/\D/g, ''); if(cleanCep.length === 8) { try { let res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`); let data = await res.json(); if(!data.erro) { let endString = `${data.logradouro}, Bairro: ${data.bairro} - ${data.localidade}/${data.uf}`; if(document.getElementById('endereco')) document.getElementById('endereco').value = endString; if(document.getElementById('fichaEndereco')) document.getElementById('fichaEndereco').value = endString; if(document.getElementById('editEndereco')) document.getElementById('editEndereco').value = endString; } else { showToast("CEP Inválido", true); } } catch(e) { showToast("Erro ao buscar CEP", true); } } }

document.addEventListener('input', function(e) {
    if(e.target.classList.contains('moeda') && !e.target.readOnly) {
        if (e.target.id === 'valorDesconto') { let tipoDescEl = document.getElementById('tipoDesconto'); let tipoDesc = tipoDescEl ? tipoDescEl.value : 'R$'; if (tipoDesc === '%') { let value = e.target.value.replace(/\D/g, ""); if (value === "") { e.target.value = ""; } else { let num = parseInt(value); if (num > 100) num = 100; e.target.value = num; } if(typeof atualizarTelaCarrinho === 'function') atualizarTelaCarrinho(); return; } }
        let value = e.target.value.replace(/\D/g, ""); if (value === "") { e.target.value = ""; return; }
        e.target.value = "R$ " + (parseInt(value) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        if (['valorFrete', 'valorFreteReal', 'custoEmbalagem', 'valorDesconto'].includes(e.target.id)) { if(typeof atualizarTelaCarrinho === 'function') atualizarTelaCarrinho(); }
        if (['editValorFrete', 'editValorFreteReal', 'editValorDesconto'].includes(e.target.id)) { if(typeof recalcularSomaEdicao === 'function') recalcularSomaEdicao(); }
    }
});

// NOVO: Validador Matemático de CPF (Impede CPF falso tipo 123.456.789-00)
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if(cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let add = 0, rev;
    for(let i=0; i<9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    rev = 11 - (add % 11); if(rev === 10 || rev === 11) rev = 0; if(rev !== parseInt(cpf.charAt(9))) return false;
    add = 0; for(let i=0; i<10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11); if(rev === 10 || rev === 11) rev = 0; if(rev !== parseInt(cpf.charAt(10))) return false;
    return true;
}

// NOVO: Dark Mode Persistente no localStorage
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('wallerTheme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
});

function toggleTheme() {
    let current = document.documentElement.getAttribute('data-theme');
    let next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('wallerTheme', next);
}