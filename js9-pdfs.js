// ==========================================
// RELATÓRIOS E PDFS (jsPDF)
// ==========================================
function abrirModalPDF() { document.getElementById('modalPDF').style.display = 'flex'; }
function fecharModalPDF() { document.getElementById('modalPDF').style.display = 'none'; }

function desenharCabecalhoPDF(doc, titulo) {
    doc.setFillColor(217, 4, 41); doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("WALLER CLOTHING", 14, 12);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(titulo, 14, 18); doc.text(`Gerado: ${new Date().toLocaleDateString('pt-BR')}`, 160, 18);
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
            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(193, 18, 31); doc.text(`STATUS: ${status}`, 14, currentY); currentY += 8; 
            
            pend.forEach(p => { 
                if(currentY > 265) { doc.addPage(); currentY = 20; }
                doc.setFillColor(235, 235, 235); doc.setDrawColor(200, 200, 200); doc.rect(14, currentY, 182, 8, 'FD'); 
                
                doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
                let tituloPedido = `PEDIDO #${p.numeroPedido||'0'}  |  CLIENTE: ${p.nome||'Sem nome'}  |  ZAP: ${p.whatsapp||''}`;
                doc.text(tituloPedido, 16, currentY + 5.5); currentY += 8; 

                let rows = [];
                (p.itens||[]).forEach(i => { rows.push([ i.codigoEstampa||'-', i.nomeEstampa||'-', i.tipoPeca||'-', `${i.cor||'-'} / Tam: ${i.tamanho||'-'}`, (i.quantidade||1).toString() ]); }); 
                
                doc.autoTable({ startY: currentY, head: [['Cod', 'Estampa', 'Peca', 'Cor / Tam', 'Qtd']], body: rows, theme: 'grid', headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] }, styles: { fontSize: 9, cellPadding: 3 }, margin: { left: 14, right: 14 } });
                currentY = doc.lastAutoTable.finalY + 8; 
            });
            currentY += 5; 
        }
    });
    if(!achou) { showToast("Nenhum pedido nesse status!", true); return; } 
    doc.save(`waller_Detalhado_${opcao.replace(/[\/ ]/g,'_')}.pdf`); fecharModalPDF();
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
            doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(`STATUS: ${status}`, 14, currentY); currentY += 5; 
            
            let total=0; const count={};
            pend.forEach(p => { (p.itens||[]).forEach(i => { let q=parseInt(i.quantidade)||1; total+=q; const k=`${i.codigoEstampa||'-'} | ${i.nomeEstampa||'-'} | ${i.tipoPeca} | ${i.cor} | ${i.tamanho}`; count[k]=(count[k]||0)+q; }); });
            
            const rows = Object.keys(count).map(k => [...k.split(' | '), count[k]]).sort((a,b)=>a[0].localeCompare(b[0]));
            doc.autoTable({ startY: currentY, head: [['Cod', 'Estampa', 'Peca', 'Cor', 'Tam', 'Qtd']], body: rows, foot: [[ { content: 'TOTAL DE PECAS NA FILA:', colSpan: 5, styles: { halign: 'right'} }, { content: total.toString(), styles: { halign: 'center', fillColor:[217,4,41], textColor:[255,255,255] } } ]], theme: 'grid', headStyles: { fillColor: [17,17,17], textColor: [255,255,255] }, styles: { fontSize: 9 } });
            currentY = doc.lastAutoTable.finalY + 15; 
        }
    });
    if(!achou) { showToast("Nenhum pedido nesse status!", true); return; } 
    doc.save(`waller_Agrupado_${opcao.replace(/[\/ ]/g,'_')}.pdf`); fecharModalPDF();
}

function gerarEtiquetasEnvio() {
    const prontos = todosPedidos.filter(p => p.statusAtualizado === 'ESTAMPA PRONTA' || p.statusAtualizado === 'PEDIDO ENVIADO');
    if(!prontos.length) { showToast("Nenhum pedido pronto!", true); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 15;
    prontos.forEach((p, idx) => {
        if(y > 200) { doc.addPage(); y = 15; }
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(14, y, 180, 85); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("REMETENTE:", 18, y+8); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("WALLER CLOTHING", 18, y+14); doc.setLineWidth(0.2); doc.line(14, y+18, 194, y+18);
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
        doc.setFont("helvetica", "bold"); doc.text("REMETENTE", 16, 40); doc.text("DESTINATARIO", 110, 40); doc.setFont("helvetica", "normal");
        doc.text("Nome: WALLER CLOTHING", 16, 48); doc.text("Endereco: Rua Conselheiro Moreira de Barros 100", 16, 56); doc.text("CEP: 02475-001", 16, 64);
        
        doc.text(`Nome: ${p.nome||''}`, 110, 48); let endStr = doc.splitTextToSize(`Endereco: ${p.endereco || ''} ${p.complemento || ''}`, 84); doc.text(endStr, 110, 56); doc.text(`CEP: ${p.cep || ''}`, 110, 72);

        doc.setFont("helvetica", "bold"); doc.text("IDENTIFICACAO DOS BENS", 105, 90, null, null, "center");
        let rows = []; let pesoTotal = 0; (p.itens||[]).forEach(i => { rows.push([i.quantidade||1, `${i.tipoPeca} (${i.nomeEstampa})`, formatCurrency(i.valorUnitario)]); pesoTotal += parseInt(i.quantidade||1) * 0.25; });
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
        somaFaturamento += safeNum(p.valorTotal); somaCustoPecas += safeNum(p.custoTotalPedido); somaEmbalagem += safeNum(p.custoEmbalagem); somaDescontos += safeNum(p.valorDesconto); somaFreteCobrado += safeNum(p.valorFrete); somaLucroBruto += safeNum(p.lucroTotalPedido);
        somaFreteReal += (safeNum(p.valorFreteReal) > 0 ? safeNum(p.valorFreteReal) : safeNum(p.valorFrete));
        (p.itens||[]).forEach(i => qtdPecasVendidas += (parseInt(i.quantidade) || 1));
    });

    let balancoFrete = somaFreteCobrado - somaFreteReal; let lucroLiquidoReal = somaLucroBruto - despesasPeriodo;

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(193, 18, 31); doc.text("1. RESUMO DE VENDAS E OPERACAO", 14, 35);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
    doc.text(`Total de Pedidos Pagos: ${pagos.length} pedidos`, 14, 45); doc.text(`Total de Pecas Vendidas: ${qtdPecasVendidas} pecas`, 110, 45);
    doc.text(`(+) Faturamento Bruto: ${formatCurrency(somaFaturamento)}`, 14, 55); doc.text(`(-) Custo de Producao (Pecas): ${formatCurrency(somaCustoPecas)}`, 14, 62); doc.text(`(-) Custo de Embalagens: ${formatCurrency(somaEmbalagem)}`, 14, 69); doc.text(`(-) Descontos Concedidos: ${formatCurrency(somaDescontos)}`, 14, 76);
    doc.text(`Frete Recebido: ${formatCurrency(somaFreteCobrado)}`, 110, 55); doc.text(`Frete Pago: ${formatCurrency(somaFreteReal)}`, 110, 62);
    doc.setFont("helvetica", "bold"); doc.text(`Balanco Logistico: ${formatCurrency(balancoFrete)}`, 110, 69); doc.setFont("helvetica", "normal");

    doc.setFillColor(255, 183, 3); doc.rect(14, 82, 180, 8, 'F'); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0); doc.text(`LUCRO BRUTO: ${formatCurrency(somaLucroBruto)}`, 18, 88);

    doc.setFontSize(12); doc.setTextColor(193, 18, 31); doc.text("2. CUSTOS FIXOS E RESULTADO (DRE)", 14, 105); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0); doc.text(`(-) Total de Despesas Administrativas/Fixas lancadas no periodo: ${formatCurrency(despesasPeriodo)}`, 14, 115);

    doc.setFillColor(6, 214, 160); doc.rect(14, 125, 180, 10, 'F'); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0); doc.text(`LUCRO LIQUIDO FINAL: ${formatCurrency(lucroLiquidoReal)}`, 18, 132);

    doc.setTextColor(193, 18, 31); doc.text("3. DETALHAMENTO DE PEDIDOS", 14, 150);
    let rows = pagos.map(p => [ `#${p.numeroPedido||'0'}`, (p.nome||'').split(' ')[0], formatCurrency(safeNum(p.valorTotal)), formatCurrency(safeNum(p.custoTotalPedido)), formatCurrency(safeNum(p.lucroTotalPedido)) ]);
    doc.autoTable({ startY: 155, head: [['Pedido', 'Cliente', 'Faturamento', 'Custo Pecas', 'Lucro Bruto']], body: rows, theme: 'grid', headStyles: { fillColor: [17,17,17] }, styles: { fontSize: 8 } });

    doc.save(`waller_DRE_${dtIniStr}_a_${dtFimStr}.pdf`); fecharModalPDF();
}