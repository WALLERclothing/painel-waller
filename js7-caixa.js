// ==========================================
// MÓDULO DE FLUXO DE CAIXA INTEGRADO
// ==========================================
function abrirModalFluxoCaixa() {
    let hoje = new Date(); let mes = String(hoje.getMonth() + 1).padStart(2, '0');
    let campoMes = document.getElementById('fcFiltroMes');
    let campoData = document.getElementById('fcData');
    
    if(campoMes) campoMes.value = `${hoje.getFullYear()}-${mes}`;
    if(campoData) campoData.value = hoje.toISOString().split('T')[0];
    
    atualizarCategoriasCaixa();
    
    let modal = document.getElementById('modalFluxoCaixa');
    if(modal) {
        modal.style.display = 'flex';
        renderizarFluxoCaixa();
    }
}

function fecharModalFluxoCaixa() { 
    let modal = document.getElementById('modalFluxoCaixa');
    if(modal) modal.style.display = 'none'; 
}

// Categorização dinâmica para DRE
function atualizarCategoriasCaixa() {
    let tipoEl = document.getElementById('fcTipo');
    let selCat = document.getElementById('fcCategoria');
    if(!tipoEl || !selCat) return;
    
    let tipo = tipoEl.value;
    
    if(tipo === 'ENTRADA') {
        selCat.innerHTML = '<option value="VENDAS">VENDAS</option><option value="APORTE">APORTE</option><option value="OUTROS">OUTRAS ENTRADAS</option>';
    } else {
        selCat.innerHTML = '<option value="IMPOSTOS">IMPOSTOS / TAXAS</option><option value="MARKETING">MARKETING / ADS</option><option value="FORNECEDOR">PRODUÇÃO / FORNECEDOR</option><option value="LOGISTICA">LOGÍSTICA / FRETE</option><option value="SISTEMAS">SISTEMAS / FERRAMENTAS</option><option value="PRO-LABORE">PRÓ-LABORE</option><option value="OUTROS">OUTRAS DESPESAS</option>';
    }
}

function renderizarFluxoCaixa() {
    let filtroEl = document.getElementById('fcFiltroMes');
    if(!filtroEl) return;
    
    let filtro = filtroEl.value; 
    if(!filtro) return;
    
    let [anoFiltro, mesFiltro] = filtro.split('-'); let mesAnoFiltro = `${mesFiltro}/${anoFiltro}`; 
    let extrato = []; let totalEntradas = 0; let totalSaidas = 0;

    // Vendas Automáticas
    todosPedidos.forEach(p => {
        if(p.statusPagamento === 'PAGO') {
            let d = p.dataCriacaoSafe || new Date(); let mesAnoPed = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            if(mesAnoPed === mesAnoFiltro) { 
                let valor = safeNum(p.valorTotal); 
                let contaDestino = p.metodoPagamento === 'DINHEIRO' ? 'CAIXA FÍSICO' : (p.metodoPagamento === 'PIX' ? 'CONTA PJ' : 'MERCADO PAGO');
                extrato.push({ dataObj: d, dataFmt: d.toLocaleDateString('pt-BR'), desc: `Venda #${p.numeroPedido} (${p.nome.split(' ')[0]})`, conta: contaDestino, cat: 'VENDAS', origem: 'SISTEMA', tipo: 'ENTRADA', valor: valor }); 
                totalEntradas += valor; 
            }
        }
    });

    // Despesas Fixas (DRE Mensal Automático)
    despesasGlobais.forEach(d => {
        if(d.mesAno === mesAnoFiltro) { 
            let valor = safeNum(d.valor); 
            extrato.push({ dataObj: new Date(anoFiltro, parseInt(mesFiltro)-1, 1), dataFmt: `Ref: ${mesAnoFiltro}`, desc: d.descricao, conta: 'CONTA PJ', cat: 'CUSTO FIXO', origem: 'SISTEMA', tipo: 'SAIDA', valor: valor }); 
            totalSaidas += valor; 
        }
    });

    // Lançamentos Manuais
    transacoesManuais.forEach(t => {
        let [anoT, mesT, diaT] = t.dataIso.split('-');
        if(anoT === anoFiltro && mesT === mesFiltro) { 
            let valor = safeNum(t.valor); 
            extrato.push({ dataObj: new Date(anoT, parseInt(mesT)-1, diaT), dataFmt: `${diaT}/${mesT}/${anoT}`, desc: t.descricao, conta: t.conta || 'N/D', cat: t.categoria || 'N/D', origem: 'MANUAL', tipo: t.tipo, valor: valor, id: t.id }); 
            if(t.tipo === 'ENTRADA') totalEntradas += valor; else totalSaidas += valor; 
        }
    });

    extrato.sort((a, b) => b.dataObj - a.dataObj);

    let tbody = document.getElementById('bodyFluxoCaixa');
    if(tbody) {
        if(extrato.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; font-weight:bold; color:var(--text-muted);">Nenhuma movimentação registada neste mês.</td></tr>';
        } else {
            tbody.innerHTML = extrato.map(item => {
                let cor = item.tipo === 'ENTRADA' ? 'var(--green)' : 'var(--red)'; 
                let sinal = item.tipo === 'ENTRADA' ? '+' : '-';
                
                // Botão de excluir só aparece nos manuais, nos automáticos mostra uma tag "AUTO"
                let btnExcluir = item.origem === 'MANUAL' ? 
                    `<button onclick="deletarTransacaoManual('${item.id}')" style="background:var(--red); color:var(--white); border:none; padding:6px 12px; font-weight:900; cursor:pointer; font-size:0.75rem;" title="Apagar Lançamento">X</button>` : 
                    `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:900; background:var(--gray); padding: 4px 8px; border: 1px solid var(--border-color);">AUTO</span>`;
                
                return `
                <tr style="border-bottom: 1px solid var(--gray); background: var(--white);">
                    <td style="padding: 15px 10px; font-weight: 800; font-size:0.85rem; color:var(--text-muted);">${item.dataFmt}</td>
                    <td style="padding: 15px 10px;">
                        <div style="font-weight: 900; font-size:1rem; color:var(--black); text-transform:uppercase;">${item.desc}</div>
                        <div style="font-size:0.65rem; color:var(--white); background:var(--black); display:inline-block; padding:3px 6px; margin-top:4px; font-weight:bold;">${item.cat}</div>
                    </td>
                    <td style="padding: 15px 10px; font-size: 0.8rem; font-weight: 800;">${item.conta}</td>
                    <td style="padding: 15px 10px; text-align: right; color: ${cor}; font-weight: 900; font-size: 1.1rem;">${sinal} ${formatCurrency(item.valor)}</td>
                    <td style="padding: 15px 10px; text-align: center;">${btnExcluir}</td>
                </tr>`;
            }).join('');
        }
    }

    let elEntradas = document.getElementById('fcEntradas');
    let elSaidas = document.getElementById('fcSaidas');
    let elSaldo = document.getElementById('fcSaldo');

    if(elEntradas) elEntradas.innerText = formatCurrency(totalEntradas); 
    if(elSaidas) elSaidas.innerText = formatCurrency(totalSaidas); 
    if(elSaldo) elSaldo.innerText = formatCurrency(totalEntradas - totalSaidas);
}

function salvarTransacaoManual(e) {
    e.preventDefault(); 
    let tipo = document.getElementById('fcTipo').value; 
    let conta = document.getElementById('fcConta').value; 
    let categoria = document.getElementById('fcCategoria').value; 
    let desc = document.getElementById('fcDesc').value.toUpperCase().trim(); 
    let valor = safeNum(document.getElementById('fcValor').value); 
    let dataIso = document.getElementById('fcData').value; 
    
    if(!desc || valor <= 0 || !dataIso) {
        showToast("Preenche a descrição, data e um valor válido!", true);
        return;
    }
    
    db.collection("transacoes_manuais").add({ tipo: tipo, conta: conta, categoria: categoria, descricao: desc, valor: valor, dataIso: dataIso, dataCriacao: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { 
        document.getElementById('fcDesc').value = ''; 
        document.getElementById('fcValor').value = ''; 
        showToast("Lançamento adicionado no Caixa!"); 
    });
}

function deletarTransacaoManual(id) { 
    if(confirm("Desejas apagar este lançamento manual permanentemente?")) { 
        db.collection("transacoes_manuais").doc(id).delete().then(() => showToast("Lançamento removido!")); 
    } 
}

function imprimirExtratoCaixa() {
    let mesStr = document.getElementById('fcFiltroMes').value;
    let totalE = document.getElementById('fcEntradas').innerText;
    let totalS = document.getElementById('fcSaidas').innerText;
    let saldo = document.getElementById('fcSaldo').innerText;
    let tabelaHTML = document.getElementById('bodyFluxoCaixa').innerHTML;
    
    let w = window.open('', '', 'width=800,height=600');
    w.document.write(`
        <html><head><title>Extrato Mensal Waller</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { border-bottom: 2px solid #000; padding-bottom: 10px; text-transform: uppercase; }
            .resumo { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 20px; background: #eee; padding: 15px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #000; color: #fff; }
        </style>
        </head><body>
        <h2>EXTRATO FLUXO DE CAIXA: ${mesStr}</h2>
        <div class="resumo">
            <span style="color: green;">Entradas: ${totalE}</span>
            <span style="color: red;">Saídas: ${totalS}</span>
            <span>Saldo Real: ${saldo}</span>
        </div>
        <table>
            <thead><tr><th>DATA</th><th>DESCRIÇÃO/CATEGORIA</th><th>CONTA (ORIGEM)</th><th>VALOR</th><th>AÇÃO</th></tr></thead>
            <tbody>${tabelaHTML}</tbody>
        </table>
        <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>
    `);
    w.document.close();
}