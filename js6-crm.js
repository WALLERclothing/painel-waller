// ==========================================
// CRM E CARTEIRA DE CLIENTES
// ==========================================
function atualizarListasDeSugestao() {
    let htmlNomes = ''; let htmlWhats = '';
    Object.values(clientesCadastrados).forEach(c => { if(c.nome) htmlNomes += `<option value="${c.nome}">`; if(c.whatsapp) htmlWhats += `<option value="${c.whatsapp}">`; });
    let ln = document.getElementById('listaNomes'); if(ln) ln.innerHTML = htmlNomes;
    let lw = document.getElementById('listaWhats'); if(lw) lw.innerHTML = htmlWhats;
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
            let zapLimpo = c[0].replace(/\D/g,''); let dataUc = c[1].ultimaCompra ? c[1].ultimaCompra.toLocaleDateString('pt-BR') : 'Sem dados'; let tktMedio = c[1].qtd > 0 ? (c[1].totalGasto / c[1].qtd) : 0;
            let perfilCadastrado = clientesCadastrados[c[0]] || {}; let tagHtml = perfilCadastrado.tag && perfilCadastrado.tag !== 'NORMAL' ? `<span class="badge-vip" style="background:#111; color:#fff;">${perfilCadastrado.tag}</span>` : '';
            let medalha = !filtroAniversarioAtivo ? (index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '') : ''; let badgeNiver = perfilCadastrado.dataNasc && perfilCadastrado.dataNasc.length === 10 && perfilCadastrado.dataNasc.split('/')[1] === mAtualNiver ? `<span class="tag-niver">🎂 NIVER MÊS</span>` : ''; let diasSumido = c[1].ultimaCompra ? Math.floor((new Date() - c[1].ultimaCompra) / (1000 * 60 * 60 * 24)) : 0; let classeSumido = diasSumido > 90 ? 'sumido' : ''; let badgeSumido = diasSumido > 90 ? `<span class="badge-soldout">SUMIDO (${diasSumido}d)</span>` : '';
            
            return `<div class="crm-card ${classeSumido}" style="height: 100%; display: flex; flex-direction: column;"><div><h3 class="crm-card-title">${medalha}${c[1].nome}</h3><div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:5px; min-height: 22px;">${tagHtml} ${badgeNiver} ${badgeSumido}</div><div class="crm-card-subtitle">${c[0]}</div></div><div style="margin-top: auto;"><div class="crm-stats"><span>Pedidos: <span style="color:var(--red);">${c[1].qtd}</span></span><span>T. Médio: <span>${formatCurrency(tktMedio)}</span></span></div><div style="font-size: 0.8rem; margin: 10px 0;"><div><strong>Última Compra:</strong> ${dataUc}</div><div><strong style="color:var(--green);">Total Gasto:</strong> ${formatCurrency(c[1].totalGasto)}</div></div><div class="crm-actions"><button onclick="abrirFichaCliente('${c[0]}')">👤 FICHA</button><a href="https://wa.me/55${zapLimpo}" target="_blank">💬 CHAT</a><button onclick="excluirFichaCliente('${c[0]}')" style="color: var(--red); flex: 0.3;">X</button></div></div></div>`;
        }).join('');
    } catch(e){}
}

function abrirFichaNova() { 
    document.getElementById('fichaWhatsapp').value = ''; document.getElementById('fichaWhatsapp').disabled = false; document.getElementById('fichaNome').value = ''; document.getElementById('fichaCPF').value = ''; if(document.getElementById('fichaEmail')) document.getElementById('fichaEmail').value = ''; document.getElementById('fichaInsta').value = ''; document.getElementById('fichaDataNasc').value = ''; document.getElementById('fichaCEP').value = ''; document.getElementById('fichaEndereco').value = ''; document.getElementById('fichaNumero').value = ''; document.getElementById('fichaComplemento').value = ''; document.getElementById('fichaObs').value = ''; document.getElementById('fichaTag').value = ''; document.getElementById('fichaQtdPedidos').innerText = '0'; document.getElementById('fichaTotalGasto').innerText = 'R$ 0,00'; document.getElementById('fichaHistoricoPedidos').innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">Novo cliente.</div>'; document.getElementById('modalFichaCliente').style.display = 'flex'; 
}

function abrirFichaCliente(whatsapp) { 
    let dadosCompra = mapaClientes[whatsapp] || { qtd: 0, totalGasto: 0 }; let perfil = clientesCadastrados[whatsapp] || {}; 
    document.getElementById('fichaWhatsapp').value = whatsapp; document.getElementById('fichaWhatsapp').disabled = true; document.getElementById('fichaNome').value = perfil.nome || dadosCompra.nome || ''; document.getElementById('fichaCPF').value = perfil.cpf || ''; if(document.getElementById('fichaEmail')) document.getElementById('fichaEmail').value = perfil.email || dadosCompra.email || ''; document.getElementById('fichaInsta').value = perfil.insta || ''; document.getElementById('fichaDataNasc').value = perfil.dataNasc || ''; document.getElementById('fichaCEP').value = perfil.cep || dadosCompra.cep || ''; document.getElementById('fichaEndereco').value = perfil.endereco || dadosCompra.endereco || ''; document.getElementById('fichaNumero').value = perfil.numero || ''; document.getElementById('fichaComplemento').value = perfil.complemento || ''; document.getElementById('fichaObs').value = perfil.obs || ''; document.getElementById('fichaTag').value = perfil.tag || ''; document.getElementById('fichaQtdPedidos').innerText = dadosCompra.qtd; document.getElementById('fichaTotalGasto').innerText = formatCurrency(dadosCompra.totalGasto); 
    
    let historicoHTML = ''; let pedidosDoCliente = todosPedidos.filter(p => p.whatsapp === whatsapp); 
    if(pedidosDoCliente.length === 0) historicoHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">Nenhuma compra finalizada.</div>'; 
    else { pedidosDoCliente.forEach(p => { historicoHTML += `<div style="background:var(--gray); border:1px dashed var(--border-color); padding:10px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;"><div><strong>#${p.numeroPedido}</strong> - ${p.dataFormatada}<br><span style="color:var(--text-muted); font-weight:800;">${p.statusAtualizado}</span></div><div style="text-align:right;"><span style="color:var(--green); font-weight:900;">${formatCurrency(p.valorTotal)}</span><br><a href="#" onclick="abrirModalEdicao('${p.id}'); fecharFichaCliente();" style="color:var(--red); font-weight:800;">Detalhes</a></div></div>`; }); } 
    document.getElementById('fichaHistoricoPedidos').innerHTML = historicoHTML; document.getElementById('modalFichaCliente').style.display = 'flex'; 
}

function fecharFichaCliente() { document.getElementById('modalFichaCliente').style.display = 'none'; }

async function salvarFichaCliente() { 
    let w = document.getElementById('fichaWhatsapp').value; if(!w || w.length < 10) { showToast("Digite um Whatsapp Válido", true); return; } 
    let dadosObj = { whatsapp: w, nome: document.getElementById('fichaNome').value.toUpperCase(), cpf: document.getElementById('fichaCPF').value, email: document.getElementById('fichaEmail') ? document.getElementById('fichaEmail').value.toLowerCase().trim() : '', cep: document.getElementById('fichaCEP').value, endereco: document.getElementById('fichaEndereco').value, numero: document.getElementById('fichaNumero').value, complemento: document.getElementById('fichaComplemento').value, insta: document.getElementById('fichaInsta').value, dataNasc: document.getElementById('fichaDataNasc').value, tag: document.getElementById('fichaTag').value.toUpperCase(), obs: document.getElementById('fichaObs').value, apagadoCRM: false };
    showToast("Sincronizando ficha e pedidos... ⏳", false);
    if(typeof sincronizarClienteEmMassa === 'function') await sincronizarClienteEmMassa(w, dadosObj);
    showToast("Ficha e Pedidos Sincronizados com Sucesso! 🎉"); fecharFichaCliente(); 
}

function excluirFichaCliente(whatsapp) { if(confirm(`Ocultar a ficha de ${whatsapp}?`)) db.collection("clientes").doc(whatsapp).set({ apagadoCRM: true }, { merge: true }).then(() => { showToast("Cliente removido!"); }); }

function toggleFiltroAniversariantes() { filtroAniversarioAtivo = !filtroAniversarioAtivo; let btn = document.getElementById('btnFiltroNiver'); if (filtroAniversarioAtivo) { btn.style.background = 'var(--black)'; btn.style.color = '#ffd700'; btn.innerText = '🔙 TODOS'; showToast("Só aniversariantes!"); } else { btn.style.background = '#ffd700'; btn.style.color = '#000'; btn.innerText = '🎂 MÊS ATUAL'; } renderizarCRM(); }