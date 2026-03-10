// ==========================================
// DASHBOARD, GRÁFICOS E DESPESAS
// ==========================================

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
                somaFaturamento += safeNum(p.valorTotal); 
                somaLucroBruto += safeNum(p.lucroTotalPedido); 
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
        
        let painelBestSellers = document.getElementById('dashBestSellers');
        if(painelBestSellers) painelBestSellers.innerHTML = sortable.length ? sortable.map((x, i) => `<div>${i+1}. ${x[0]} <span style="color:var(--red);">(${x[1]}x)</span></div>`).join('') : 'Sem vendas';
        
        let bestSellersList = document.getElementById('dashBestSellersList');
        if(bestSellersList) bestSellersList.innerHTML = sortable.length ? sortable.map(x => `${x[0]} (${x[1]})`).join(' | ') : 'Sem histórico';
        
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

function abrirModalDespesas() { let mes = document.getElementById('selectFaturamentoMes').value; if(mes === 'ALL' || !mes) { showToast("Selecione um mês no Dashboard primeiro!", true); return; } document.getElementById('lblMesDespesa').innerText = mes; document.getElementById('modalDespesas').style.display = 'flex'; renderizarListaDespesas(mes); }
function fecharModalDespesas() { document.getElementById('modalDespesas').style.display = 'none'; }
function renderizarListaDespesas(mes) { let html = ''; let despesasMes = despesasGlobais.filter(d => d.mesAno === mes); despesasMes.forEach(d => { html += `<div style="display:flex; justify-content:space-between; padding:8px; background:var(--white); border:1px solid var(--border-color);"><span>${d.descricao}</span><div><strong style="color:var(--red); margin-right:10px;">${formatCurrency(d.valor)}</strong> <button onclick="deletarDespesa('${d.id}')" style="background:transparent; border:none; color:var(--red);">❌</button></div></div>`; }); document.getElementById('listaDespesasMes').innerHTML = html || '<div style="font-size:0.8rem; color:var(--text-muted);">Nenhuma despesa registrada neste mês.</div>'; }
function salvarNovaDespesa(e) { e.preventDefault(); let mes = document.getElementById('lblMesDespesa').innerText; let desc = document.getElementById('descDespesa').value.toUpperCase(); let valor = safeNum(document.getElementById('valorDespesa').value); db.collection("despesas").add({ mesAno: mes, descricao: desc, valor: valor, dataCriacao: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { document.getElementById('descDespesa').value = ''; document.getElementById('valorDespesa').value = ''; showToast("Despesa salva!"); renderizarListaDespesas(mes); }); }
function deletarDespesa(id) { if(confirm("Apagar despesa?")) db.collection("despesas").doc(id).delete().then(() => renderizarListaDespesas(document.getElementById('lblMesDespesa').innerText)); }