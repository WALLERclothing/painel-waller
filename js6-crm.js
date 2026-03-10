// ==========================================
// CRM E CARTEIRA DE CLIENTES (SPRINT 3)
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
        
        let totalClientesValidos = crmList.length;
        let limiteCurvaA = Math.ceil(totalClientesValidos * 0.20); 

        document.getElementById('listaClientesCRM').innerHTML = crmList.map((c, index) => {
            let zapLimpo = c[0].replace(/\D/g,''); let dataUc = c[1].ultimaCompra ? c[1].ultimaCompra.toLocaleDateString('pt-BR') : 'Sem dados'; let tktMedio = c[1].qtd > 0 ? (c[1].totalGasto / c[1].qtd) : 0;
            let perfilCadastrado = clientesCadastrados[c[0]] || {}; 
            let tagHtml = perfilCadastrado.tag && perfilCadastrado.tag !== 'NORMAL' ? `<span class="badge-vip" style="background:#111; color:#fff;">${perfilCadastrado.tag}</span>` : '';
            
            let badgeCurvaA = (index < limiteCurvaA && c[1].totalGasto > 0 && !filtroAniversarioAtivo) ? `<span style="background:var(--black); color:#ffd700; font-size:0.65rem; padding:2px 6px; font-weight:900;">🌟 VIP ABC</span>` : '';
            
            let badgeNiver = perfilCadastrado.dataNasc && perfilCadastrado.dataNasc.length === 10 && perfilCadastrado.dataNasc.split('/')[1] === mAtualNiver ? `<span class="tag-niver">🎂 NIVER MÊS</span>` : ''; 
            let diasSumido = c[1].ultimaCompra ? Math.floor((new Date() - c[1].ultimaCompra) / (1000 * 60 * 60 * 24)) : 0; 
            let classeSumido = diasSumido > 90 ? 'sumido' : ''; 
            let badgeSumido = diasSumido > 90 ? `<span class="badge-soldout">SUMIDO (${diasSumido}d)</span>` : '';
            
            let primeiroNome = c[1].nome ? c[1].nome.split(' ')[0] : 'Cliente';
            let msgNiver = `Fala ${primeiroNome}, tudo beleza? Aqui é da Waller Clothing! 💀\n\nVimos que este mês é o teu aniversário e não podíamos deixar passar em branco. Liberamos um cupão de desconto exclusivo para garantires um drop novo: *NIVERWALLER*\n\nAproveita o teu dia, estamos juntos! 👊`;
            let btnWhats = filtroAniversarioAtivo ? 
                `<button onclick="window.open('https://wa.me/55${zapLimpo}?text=${encodeURIComponent(msgNiver)}')">🎁 MANDAR CUPÃO</button>` : 
                `<a href="https://wa.me/55${zapLimpo}" target="_blank">💬 CHAT</a>`;

            return `<div class="crm-card ${classeSumido}" style="height: 100%; display: flex; flex-direction: column;"><div><h3 class="crm-card-title">${c[1].nome}</h3><div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:5px; min-height: 22px;">${badgeCurvaA} ${tagHtml} ${badgeNiver} ${badgeSumido}</div><div class="crm-card-subtitle">${c[0]}</div></div><div style="margin-top: auto;"><div class="crm-stats"><span>Pedidos: <span style="color:var(--red);">${c[1].qtd}</span></span><span>T. Médio: <span>${formatCurrency(tktMedio)}</span></span></div><div style="font-size: 0.8rem; margin: 10px 0;"><div><strong>Última Compra:</strong> ${dataUc}</div><div><strong style="color:var(--green);">Total Gasto:</strong> ${formatCurrency(c[1].totalGasto)}</div></div><div class="crm-actions"><button onclick="abrirFichaCliente('${c[0]}')">👤 FICHA</button>${btnWhats}<button onclick="excluirFichaCliente('${c[0]}')" style="color: var(--red); flex: 0.3;">X</button></div></div></div>`;
        }).join('');
    } catch(e){}
}

function exportarLeadsCSV() {
    let csvContent = "data:text/csv;charset=utf-8,NOME,WHATSAPP,EMAIL,TOTAL_GASTO,PEDIDOS,ULTIMA_COMPRA\n";
    
    Object.keys(mapaClientes).forEach(w => {
        let dc = mapaClientes[w];
        let perfil = clientesCadastrados[w] || {};
        if(perfil.apagadoCRM) return;
        
        let nome = (dc.nome || perfil.nome || '').replace(/,/g, '');
        let email = (perfil.email || '').replace(/,/g, '');
        let ultima = dc.ultimaCompra ? dc.ultimaCompra.toLocaleDateString('pt-BR') : '';
        let gasto = dc.totalGasto || 0;
        
        csvContent += `${nome},${w},${email},${gasto},${dc.qtd},${ultima}\n`;
    });

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `waller_leads_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Planilha de Leads Baixada!");
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
    let w = document.getElementById('fichaWhatsapp').value; if(!w || w.length < 10) { showToast("Digita um WhatsApp Válido", true); return; } 
    let dadosObj = { whatsapp: w, nome: document.getElementById('fichaNome').value.toUpperCase(), cpf: document.getElementById('fichaCPF').value, email: document.getElementById('fichaEmail') ? document.getElementById('fichaEmail').value.toLowerCase().trim() : '', cep: document.getElementById('fichaCEP').value, endereco: document.getElementById('fichaEndereco').value, numero: document.getElementById('fichaNumero').value, complemento: document.getElementById('fichaComplemento').value, insta: document.getElementById('fichaInsta').value, dataNasc: document.getElementById('fichaDataNasc').value, tag: document.getElementById('fichaTag').value.toUpperCase(), obs: document.getElementById('fichaObs').value, apagadoCRM: false };
    if(typeof sincronizarClienteEmMassa === 'function') await sincronizarClienteEmMassa(w, dadosObj);
    showToast("Ficha e Pedidos Sincronizados com Sucesso! 🎉"); fecharFichaCliente(); 
}

function excluirFichaCliente(whatsapp) { if(confirm(`Ocultar a ficha de ${whatsapp}?`)) db.collection("clientes").doc(whatsapp).set({ apagadoCRM: true }, { merge: true }).then(() => { showToast("Cliente removido!"); }); }

function toggleFiltroAniversariantes() { 
    filtroAniversarioAtivo = !filtroAniversarioAtivo; 
    let btn = document.getElementById('btnFiltroNiver'); 
    if (filtroAniversarioAtivo) { 
        btn.style.background = 'var(--black)'; btn.style.color = '#ffd700'; btn.innerText = '🔙 TODOS'; 
    } else { 
        btn.style.background = '#ffd700'; btn.style.color = '#000'; btn.innerText = '🎂 MÊS ATUAL'; 
    } 
    renderizarCRM(); 
}