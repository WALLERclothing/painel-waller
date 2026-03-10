// ==========================================
// DASHBOARD E INDICADORES FINANCEIROS
// ==========================================

function atualizarDashboard() {
    let mAtual = new Date().getMonth(); 
    let aAtual = new Date().getFullYear();
    let strMesAno = `${String(mAtual + 1).padStart(2, '0')}/${aAtual}`;
    
    let totalFaturamentoMes = 0;
    let lucroLiquidoMes = 0;
    let qtdPedidosMes = 0;

    todosPedidos.forEach(p => {
        if(p.dataMesAno === strMesAno) {
            qtdPedidosMes++;
            if(p.statusPagamento === 'PAGO') {
                totalFaturamentoMes += safeNum(p.valorTotal);
                lucroLiquidoMes += safeNum(p.lucroTotalPedido);
            }
        }
    });

    // Subtrai despesas fixas do mês para encontrar o Lucro Real
    let totalDespesas = 0;
    despesasGlobais.forEach(d => {
        if(d.mesAno === strMesAno) { totalDespesas += safeNum(d.valor); }
    });
    
    transacoesManuais.forEach(t => {
        let [anoT, mesT] = t.dataIso.split('-');
        if(`${mesT}/${anoT}` === strMesAno && t.tipo === 'SAIDA') {
            totalDespesas += safeNum(t.valor);
        }
    });

    let lucroReal = lucroLiquidoMes - totalDespesas;

    let elPedidos = document.getElementById('dashPedidosMes');
    let elFaturamento = document.getElementById('dashFaturamento');
    let elDespesas = document.getElementById('dashDespesas');
    let elLucro = document.getElementById('dashLucro');

    if(elPedidos) elPedidos.innerText = qtdPedidosMes;
    if(elFaturamento) elFaturamento.innerText = formatCurrency(totalFaturamentoMes);
    if(elDespesas) elDespesas.innerText = formatCurrency(totalDespesas);
    if(elLucro) {
        elLucro.innerText = formatCurrency(lucroReal);
        elLucro.style.color = lucroReal >= 0 ? 'var(--green)' : 'var(--red)';
    }
}

function atualizarSelectFaturamento(mesesSet) {
    let select = document.getElementById('selectFaturamentoMes');
    if(!select) return;
    
    let optionsHTML = '<option value="ALL">Histórico Total</option>';
    let mesesArray = Array.from(mesesSet).sort().reverse();
    
    mesesArray.forEach(m => { optionsHTML += `<option value="${m}">${m}</option>`; });
    if(select.innerHTML !== optionsHTML) select.innerHTML = optionsHTML;
}

function renderizarGrafico(vendasPorMes) {
    let ctxVendas = document.getElementById('graficoVendas');
    if(!ctxVendas) return;

    let labels = Object.keys(vendasPorMes).sort();
    let dados = labels.map(l => vendasPorMes[l]);

    if (chartInstancia) chartInstancia.destroy();

    chartInstancia = new Chart(ctxVendas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento Bruto (R$)',
                data: dados,
                backgroundColor: '#111111',
                borderColor: '#111111',
                borderWidth: 2
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
}