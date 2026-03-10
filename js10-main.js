// ==========================================
// INICIALIZAÇÃO E NAVEGAÇÃO GERAL
// ==========================================

window.onload = () => { 
    if(isVitrine) { document.body.classList.add('modo-vitrine'); mudarAba('estampas'); document.title = "Catálogo - Waller Clothing"; } 
};

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
    if(document.body.classList.contains('modo-foco-ativo')) { btn.innerText = '❌ SAIR DO FOCO'; mudarAba('cadastro'); showToast("Modo Foco Ativado!"); } 
    else { btn.innerText = '🎯 FOCO'; }
}

function abrirBuscaGlobal() { document.getElementById('modalBuscaGlobal').style.display = 'flex'; document.getElementById('inputBuscaGlobal').focus(); document.getElementById('resultadoBuscaGlobal').innerHTML = ''; }
function fecharBuscaGlobal(e) { if(e && e.target.id !== 'modalBuscaGlobal') return; document.getElementById('modalBuscaGlobal').style.display = 'none'; document.getElementById('inputBuscaGlobal').value = ''; }

function executarBuscaGlobal() {
    let termo = document.getElementById('inputBuscaGlobal').value.toUpperCase().trim(); let res = document.getElementById('resultadoBuscaGlobal');
    if(termo.length < 2) { res.innerHTML = ''; return; } let html = '';
    
    todosPedidos.filter(p => (p.nome&&p.nome.includes(termo)) || (p.whatsapp&&p.whatsapp.includes(termo)) || (p.numeroPedido&&p.numeroPedido.includes(termo))).slice(0,5).forEach(p => { 
        html += `<div class="brutal-toast" style="cursor:pointer; margin-bottom:5px; border-color:var(--black); color:var(--black);" onclick="mudarAba('producao'); abrirModalEdicao('${p.id}'); fecharBuscaGlobal();">📦 PEDIDO #${p.numeroPedido} - ${p.nome}</div>`; 
    });
    
    Object.keys(clientesCadastrados).forEach(w => { 
        let c = clientesCadastrados[w]; 
        if(!c.apagadoCRM && ((c.nome&&c.nome.includes(termo)) || w.includes(termo))) { 
            html += `<div class="brutal-toast" style="cursor:pointer; margin-bottom:5px; border-color:var(--green); color:var(--green);" onclick="mudarAba('clientes'); abrirFichaCliente('${w}'); fecharBuscaGlobal();">👤 CLIENTE - ${c.nome}</div>`; 
        } 
    });
    
    Object.values(catalogoEstampas).filter(c => c.nome.includes(termo) || c.codigo.includes(termo)).slice(0,5).forEach(c => { 
        html += `<div class="brutal-toast" style="cursor:pointer; margin-bottom:5px; border-color:#ffb703; color:#000;" onclick="mudarAba('estampas'); fecharBuscaGlobal();">👕 PRODUTO - [${c.codigo}] ${c.nome}</div>`; 
    });
    
    res.innerHTML = html || '<div style="padding:10px; font-weight:900; color:var(--red);">NENHUM RESULTADO ENCONTRADO.</div>';
}

function mudarAba(aba) { 
    ['cadastro', 'producao', 'estampas', 'clientes'].forEach(a => document.getElementById('aba-' + a).style.display = a === aba ? 'block' : 'none'); 
    ['Cadastro', 'Producao', 'Estampas', 'Clientes'].forEach(a => document.getElementById('tab' + a + 'Btn').classList.toggle('tab-active', a.toLowerCase() === aba)); 
}

function toggleItens(id) { 
    let lista = document.getElementById('itens-' + id); let seta = document.getElementById('seta-' + id); 
    if(lista.style.display === 'none') { lista.style.display = 'flex'; seta.innerHTML = '▲'; } 
    else { lista.style.display = 'none'; seta.innerHTML = '▼'; } 
}

function toggleGrafico() { 
    let cont = document.getElementById('container-grafico'); let seta = document.getElementById('seta-grafico'); 
    if(cont.style.display === 'none') { cont.style.display = 'flex'; seta.innerText = '▲'; } 
    else { cont.style.display = 'none'; seta.innerText = '▼'; } 
}