// ==========================================
// MAIN - INTERAÇÕES GERAIS DE TELA E NAVEGAÇÃO
// ==========================================

// Controla a troca de abas principais do sistema
function mudarAba(abaId) {
    // Esconde todas as abas
    document.getElementById('aba-cadastro').style.display = 'none';
    document.getElementById('aba-producao').style.display = 'none';
    document.getElementById('aba-estampas').style.display = 'none';
    document.getElementById('aba-clientes').style.display = 'none';
    
    // Reseta o estilo visual dos botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
    
    // Mostra a aba clicada
    document.getElementById('aba-' + abaId).style.display = 'block';
    
    // Marca o botão como ativo e re-renderiza o painel caso necessário
    if(abaId === 'cadastro') document.getElementById('tabCadastroBtn').classList.add('tab-active');
    if(abaId === 'producao') {
        document.getElementById('tabProducaoBtn').classList.add('tab-active');
        if(typeof renderizarKanban === 'function') renderizarKanban();
    }
    if(abaId === 'estampas') {
        document.getElementById('tabEstampasBtn').classList.add('tab-active');
        if(typeof renderizarCatalogo === 'function') renderizarCatalogo();
    }
    if(abaId === 'clientes') {
        document.getElementById('tabClientesBtn').classList.add('tab-active');
        if(typeof renderizarCRM === 'function') renderizarCRM();
    }
}

// Controla a expansão dos itens dentro dos cards do Kanban
function toggleItens(id) {
    let div = document.getElementById('itens-' + id);
    let seta = document.getElementById('seta-' + id);
    if (div && seta) {
        if (div.style.display === 'none' || div.style.display === '') {
            div.style.display = 'block';
            seta.innerText = '▲';
        } else {
            div.style.display = 'none';
            seta.innerText = '▼';
        }
    }
}

// Controla a exibição dos gráficos na aba de Gestão
function toggleGrafico() {
    let container = document.getElementById('container-grafico');
    let seta = document.getElementById('seta-grafico');
    if(container && seta) {
        if(container.style.display === 'none' || container.style.display === '') {
            container.style.display = 'flex';
            seta.innerText = '▲';
        } else {
            container.style.display = 'none';
            seta.innerText = '▼';
        }
    }
}

// Modo Foco (Esconde abas e foca apenas na tela atual de trabalho)
function toggleModoFoco() {
    let navbar = document.getElementById('mainNavbar');
    let tabMenu = document.getElementById('mainTabMenu');
    let btnFoco = document.getElementById('btnFoco');
    
    if(navbar && tabMenu && btnFoco) {
        if(tabMenu.style.display === 'none') {
            tabMenu.style.display = 'flex';
            navbar.style.padding = '15px 20px';
            btnFoco.style.background = '';
            btnFoco.style.color = '';
        } else {
            tabMenu.style.display = 'none';
            navbar.style.padding = '5px 20px';
            btnFoco.style.background = 'var(--red)';
            btnFoco.style.color = 'var(--white)';
        }
    }
}

// Busca Global Básica (Atalho Ctrl+K)
function abrirBuscaGlobal() {
    let termo = prompt("🔍 BUSCA GLOBAL: Digite um Nome, WhatsApp, Código do Produto ou #Pedido:");
    if(!termo) return;
    termo = termo.toUpperCase().trim();
    
    // Tenta achar no CRM
    let achouCliente = Object.keys(clientesCadastrados).find(w => w.includes(termo) || (clientesCadastrados[w].nome || '').toUpperCase().includes(termo));
    if(achouCliente) {
        mudarAba('clientes');
        setTimeout(() => abrirFichaCliente(achouCliente), 500);
        return;
    }
    
    // Tenta achar no Kanban/Pedidos
    let achouPedido = todosPedidos.find(p => (p.numeroPedido || '').includes(termo.replace('#','')) || (p.nome||'').toUpperCase().includes(termo) || (p.whatsapp || '').includes(termo));
    if(achouPedido) {
        mudarAba('producao');
        let inputBusca = document.getElementById('inputBusca');
        if(inputBusca) {
            inputBusca.value = termo;
            if(typeof filtrarKanban === 'function') filtrarKanban();
        }
        return;
    }
    
    // Tenta achar no Catálogo
    let achouEstampa = catalogoEstampas[termo];
    if(achouEstampa) {
        mudarAba('estampas');
        setTimeout(() => prepararEdicaoEstampa(termo), 500);
        return;
    }
    
    showToast("Nenhum resultado direto encontrado para: " + termo, true);
}

// Atalhos de Teclado (Alt+N, Alt+K, Alt+E, Alt+C, Ctrl+K)
document.addEventListener('keydown', function(e) {
    if (e.altKey) {
        if (e.key.toLowerCase() === 'n') { e.preventDefault(); mudarAba('cadastro'); }
        if (e.key.toLowerCase() === 'k') { e.preventDefault(); mudarAba('producao'); }
        if (e.key.toLowerCase() === 'e') { e.preventDefault(); mudarAba('estampas'); }
        if (e.key.toLowerCase() === 'c') { e.preventDefault(); mudarAba('clientes'); }
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        abrirBuscaGlobal();
    }
});