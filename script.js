async function salvarPedidoCompleto() {
    let nome = document.getElementById('nome').value.toUpperCase();
    let whatsapp = document.getElementById('whatsapp').value;
    let origem = document.getElementById('origemVenda').value;
    let cep = document.getElementById('cep').value;
    let end = document.getElementById('endereco').value + ", " + document.getElementById('numeroEnd').value;
    let compl = document.getElementById('complementoEnd').value;
    
    let freteCobrado = unmaskCurrency(document.getElementById('valorFrete').value);
    let freteRealInput = unmaskCurrency(document.getElementById('valorFreteReal').value);
    let embalagem = unmaskCurrency(document.getElementById('custoEmbalagem').value);
    let desconto = unmaskCurrency(document.getElementById('valorDesconto').value);
    let totalCobrado = unmaskCurrency(document.getElementById('valorTotal').value);

    if(!nome || !whatsapp || carrinhoTemporario.length===0) { showToast("Preencha Nome, Whats e 1 Peça!", true); return; }

    let somaCustoPecas = 0; let somaVendaPecas = 0;
    carrinhoTemporario.forEach(item => { 
        somaCustoPecas += (item.custoUnitario * item.quantidade);
        somaVendaPecas += (item.valorUnitario * item.quantidade);
    });
    
    // CORREÇÃO: Evita que o Frete Cobrado vire lucro se o Frete Real estiver em branco
    let freteRealCalculo = freteRealInput > 0 ? freteRealInput : freteCobrado;
    
    let prejuizoFrete = freteRealCalculo > freteCobrado ? (freteRealCalculo - freteCobrado) : 0;
    let lucroSobraFrete = freteCobrado > freteRealCalculo ? (freteCobrado - freteRealCalculo) : 0;
    
    let lucroCalculado = (somaVendaPecas - somaCustoPecas) - desconto - embalagem - prejuizoFrete + lucroSobraFrete;

    document.getElementById('btnGerarOrdem').innerText = "SALVANDO...";
    let numGerado = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        await db.collection("pedidos").add({
            numeroPedido: numGerado, nome: nome, whatsapp: whatsapp, origemVenda: origem, cep: cep, endereco: end, complemento: compl,
            valorFrete: freteCobrado, valorFreteReal: freteRealInput, custoEmbalagem: embalagem, valorDesconto: desconto, valorTotal: totalCobrado, 
            custoTotalPedido: somaCustoPecas, lucroTotalPedido: lucroCalculado, apagado: false,
            metodoPagamento: document.getElementById('metodoPagamento').value, statusPagamento: document.getElementById('statusPagamento').value,
            itens: carrinhoTemporario, status: 'PEDIDO FEITO', dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        db.collection("clientes").doc(whatsapp).set({ 
            whatsapp: whatsapp, nome: nome, cep: cep, endereco: end, complemento: compl, apagadoCRM: false 
        }, { merge: true });
        
        carrinhoTemporario.forEach(item => {
            if(item.codigoEstampa && catalogoEstampas[item.codigoEstampa]) {
                let campoTamanho = "estoqueGrade." + item.tamanho;
                db.collection("estampas").doc(item.codigoEstampa).update({ [campoTamanho]: firebase.firestore.FieldValue.increment(-item.quantidade) });
            }
        });

        document.getElementById('nome').value = ''; document.getElementById('whatsapp').value = ''; document.getElementById('cep').value=''; document.getElementById('endereco').value=''; document.getElementById('numeroEnd').value=''; document.getElementById('complementoEnd').value=''; document.getElementById('valorFrete').value=''; document.getElementById('valorFreteReal').value=''; document.getElementById('valorDesconto').value=''; document.getElementById('valorTotal').value=''; document.getElementById('alertaClienteFiel').style.display = 'none';
        carrinhoTemporario = []; atualizarTelaCarrinho(); document.getElementById('btnGerarOrdem').innerText = "GERAR ORDEM DE SERVIÇO"; showToast(`PEDIDO #${numGerado} SALVO!`);
    } catch (e) { showToast("Erro ao salvar", true); }
}
