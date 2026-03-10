// ==========================================
// RELATÓRIOS E EXPORTAÇÃO PDF
// ==========================================

function abrirModalPDF() {
    let hoje = new Date();
    let mesFmt = String(hoje.getMonth() + 1).padStart(2, '0');
    let anoFmt = hoje.getFullYear();
    let campoMes = document.getElementById('pdfMes');
    if(campoMes) campoMes.value = `${anoFmt}-${mesFmt}`;
    
    let modal = document.getElementById('modalPDF');
    if(modal) modal.style.display = 'flex';
}

function fecharModalPDF() { 
    let modal = document.getElementById('modalPDF');
    if(modal) modal.style.display = 'none'; 
}

function gerarRelatorioPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let tipo = document.getElementById('pdfTipo').value;
    let mesFiltro = document.getElementById('pdfMes').value; // Formato YYYY-MM
    let statusFiltro = document.getElementById('pdfStatus').value;
    
    if(!mesFiltro) { showToast("Escolhe um mês válido!", true); return; }
    let [ano, mes] = mesFiltro.split('-');
    let mesAnoBusca = `${mes}/${ano}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`RELATÓRIO WALLER CLOTHING - ${tipo}`, 14, 20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Referência: ${mesAnoBusca} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    if (tipo === 'VENDAS') {
        let pedidosFiltrados = todosPedidos.filter(p => p.dataMesAno === mesAnoBusca);
        if(statusFiltro !== 'TODOS') pedidosFiltrados = pedidosFiltrados.filter(p => p.statusAtualizado === statusFiltro);
        
        let totalRecebido = 0;
        let rows = pedidosFiltrados.map(p => {
            if(p.statusPagamento === 'PAGO') totalRecebido += safeNum(p.valorTotal);
            let pNome = p.nome ? p.nome.split(' ')[0] : 'Cliente';
            let statusExib = p.statusAtualizado.substring(0, 15);
            return [p.dataFormatada, `#${p.numeroPedido}`, pNome, formatCurrency(p.valorTotal), p.metodoPagamento, statusExib];
        });

        doc.autoTable({
            startY: 35, head: [['Data', 'Pedido', 'Cliente', 'Total', 'Pagam.', 'Status']], body: rows,
            theme: 'grid', headStyles: { fillColor: [17, 17, 17] }, styles: { fontSize: 9 }
        });

        let finalY = doc.lastAutoTable.finalY || 40;
        doc.setFont("helvetica", "bold");
        doc.text(`Total em Vendas Pagas: ${formatCurrency(totalRecebido)}`, 14, finalY + 10);
    } 
    else if (tipo === 'PRODUCAO') {
        let pedidosFiltrados = todosPedidos.filter(p => p.dataMesAno === mesAnoBusca && p.statusAtualizado === 'AGUARDANDO ESTAMPA');
        let pecas = [];
        pedidosFiltrados.forEach(p => {
            if(p.itens) {
                p.itens.forEach(i => { pecas.push([`#${p.numeroPedido}`, i.codigoEstampa, i.nomeEstampa, i.tipoPeca, i.tamanho, i.quantidade]); });
            }
        });

        doc.autoTable({
            startY: 35, head: [['Pedido', 'Cód', 'Estampa', 'Peça', 'Tam', 'Qtd']], body: pecas,
            theme: 'grid', headStyles: { fillColor: [193, 18, 31] }, styles: { fontSize: 9 }
        });
    }

    doc.save(`Waller_Relatorio_${tipo}_${mes}_${ano}.pdf`);
    showToast("PDF Gerado com Sucesso! 📄");
    fecharModalPDF();
}