// ==========================================
// MÓDULO DE FLUXO DE CAIXA INTEGRADO
// ==========================================
function abrirModalFluxoCaixa() {
    let hoje = new Date(); let mes = String(hoje.getMonth() + 1).padStart(2, '0');
    document.getElementById('fcFiltroMes').value = `${hoje.getFullYear()}-${mes}`;
    document.getElementById('fcData').value = hoje.toISOString().split('T')[0];
    document.getElementById('modalFluxoCaixa').style.display = 'flex';
    renderizarFluxoCaixa();
}

function fecharModalFluxoCaixa() { document.getElementById('modalFluxoCaixa').style.display = 'none'; }

function renderizarFluxoCaixa() {
    let filtro = document.getElementById('fcFiltroMes').value; if(!filtro) return;
    let [anoFiltro, mesFiltro] = filtro.split('-'); let mesAnoFiltro = `${mesFiltro}/${anoFiltro}`; 
    let extrato = []; let totalEntradas = 0; let totalSaidas = 0;

    // Vendas
    todosPedidos.forEach(p => {
        if(p.statusPagamento === 'PAGO') {
            let d = p.dataCriacaoSafe || new Date(); let mesAnoPed = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            if(mesAnoPed === mesAnoFiltro) { let valor = safeNum(p.valorTotal); extrato.push({ dataObj: d, dataFmt: d.toLocaleDateString('pt-BR'), desc: `Venda #${p.numeroPedido} (${p.nome.split(' ')[0]})`, origem: 'SISTEMA (VENDA)', tipo: 'ENTRADA', valor: valor }); totalEntradas += valor; }
        }
    });

    // Despesas (DRE)
    despesasGlobais.forEach(d => {
        if(d.mesAno === mesAnoFiltro) { let valor = safeNum(d.valor); extrato.push({ dataObj: new Date(anoFiltro, parseInt(mesFiltro)-1, 1), dataFmt: `Ref: ${mesAnoFiltro}`, desc: d.descricao, origem: 'SISTEMA (CUSTO FIXO)', tipo: 'SAIDA', valor: valor }); totalSaidas += valor; }
    });

    // Manuais
    transacoesManuais.forEach(t => {
        let [anoT, mesT, diaT] = t.dataIso.split('-');
        if(anoT === anoFiltro && mesT === mesFiltro) { let valor = safeNum(t.valor); extrato.push({ dataObj: new Date(anoT, parseInt(mesT)-1, diaT), dataFmt: `${diaT}/${mesT}/${anoT}`, desc: t.descricao, origem: 'MANUAL', tipo: t.tipo, valor: valor, id: t.id }); if(t.tipo === 'ENTRADA') totalEntradas += valor; else totalSaidas += valor; }
    });

    extrato.sort((a, b) => b.dataObj - a.dataObj);

    let tbody = document.getElementById('bodyFluxoCaixa');
    if(extrato.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; font-weight:bold;">Nenhuma movimentação neste mês.</td></tr>';
    } else {
        tbody.innerHTML = extrato.map(item => {
            let cor = item.tipo === 'ENTRADA' ? 'var(--green)' : 'var(--red)'; let sinal = item.tipo === 'ENTRADA' ? '+' : '-';
            let btnExcluir = item.origem === 'MANUAL' ? `<button onclick="deletarTransacaoManual('${item.id}')" style="background:transparent; border:none; color:var(--red); font-weight:900; cursor:pointer;" title="Apagar">X</button>` : '';
            return `<tr style="border-bottom: 1px solid var(--border-color); background: var(--white);"><td style="padding: 10px; font-weight: 800;">${item.dataFmt}</td><td style="font-weight: 900;">${item.desc}</td><td style="font-size: 0.7rem; color: var(--text-muted); font-weight: 800;">${item.origem}</td><td style="text-align: right; color: ${cor}; font-weight: 900; padding-right: 10px; font-size: 1.1rem;">${sinal} ${formatCurrency(item.valor)}</td><td style="text-align: center;">${btnExcluir}</td></tr>`;
        }).join('');
    }

    document.getElementById('fcEntradas').innerText = formatCurrency(totalEntradas); document.getElementById('fcSaidas').innerText = formatCurrency(totalSaidas); document.getElementById('fcSaldo').innerText = formatCurrency(totalEntradas - totalSaidas);
}

function salvarTransacaoManual(e) {
    e.preventDefault(); let tipo = document.getElementById('fcTipo').value; let desc = document.getElementById('fcDesc').value.toUpperCase().trim(); let valor = safeNum(document.getElementById('fcValor').value); let dataIso = document.getElementById('fcData').value; 
    db.collection("transacoes_manuais").add({ tipo: tipo, descricao: desc, valor: valor, dataIso: dataIso, dataCriacao: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { document.getElementById('fcDesc').value = ''; document.getElementById('fcValor').value = ''; showToast("Lançamento adicionado no Caixa!"); });
}

function deletarTransacaoManual(id) { if(confirm("Deseja apagar este lançamento manual permanentemente?")) { db.collection("transacoes_manuais").doc(id).delete().then(() => showToast("Lançamento removido!")); } }