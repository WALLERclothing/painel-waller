// ==========================================
// CATÁLOGO, ESTOQUE E GERADOR DE QR CODE AVANÇADO
// ==========================================
function copiarLinkVitrine() { let link = window.location.origin + window.location.pathname + '?vitrine=true'; navigator.clipboard.writeText(link).then(() => { showToast("Link da Vitrine copiado para enviar!"); }); }

function atualizarEstoqueGrade(id, tamanho, valorStr) { db.collection("estampas").doc(id).update({ ["estoqueGrade." + tamanho]: parseInt(valorStr) || 0 }); }

function abrirBalancoMassa() { 
    let tbody = document.getElementById('bodyTabelaBalanco'); 
    if(!tbody) return;
    tbody.innerHTML = ''; 
    Object.keys(catalogoEstampas).sort().forEach(cod => { 
        let p = catalogoEstampas[cod]; 
        if (p.apagado === true) return;
        let estq = p.estoqueGrade || p.estoque || {P:0, M:0, G:0, GG:0};
        tbody.innerHTML += `<tr data-id="${p.id}"><td><strong>${cod}</strong></td><td>${p.nome}</td><td><input type="number" class="balanco-input" data-tam="P" value="${estq.P || 0}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="M" value="${estq.M || 0}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="G" value="${estq.G || 0}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="GG" value="${estq.GG || 0}" style="padding:5px; text-align:center;"></td></tr>`; 
    }); 
    let modal = document.getElementById('modalBalanco');
    if(modal) modal.style.display = 'flex'; 
}

function fecharBalancoMassa() { 
    let modal = document.getElementById('modalBalanco');
    if(modal) modal.style.display = 'none'; 
}

async function salvarBalancoMassa() { 
    let btn = document.getElementById('btnSalvarBalanco'); 
    if(btn) { btn.innerText = "SALVANDO..."; btn.disabled = true; }
    let batch = db.batch(); let rows = document.querySelectorAll('#bodyTabelaBalanco tr'); 
    rows.forEach(tr => { 
        let docId = tr.getAttribute('data-id'); let inputs = tr.querySelectorAll('.balanco-input'); let novaGrade = {}; 
        inputs.forEach(inp => novaGrade[inp.getAttribute('data-tam')] = parseInt(inp.value) || 0); 
        batch.update(db.collection("estampas").doc(docId), { estoqueGrade: novaGrade }); 
    }); 
    await batch.commit(); 
    if(btn) { btn.innerText = "SALVAR NOVO ESTOQUE"; btn.disabled = false; }
    fecharBalancoMassa(); showToast("Estoque 100% atualizado."); 
}

function autocompletarEstampa(val) { 
    let code = val.toUpperCase().trim(); 
    if(catalogoEstampas[code]) { 
        let elNome = document.getElementById('nomeEstampa');
        let elValor = document.getElementById('valorUnitario');
        if(elNome) elNome.value = catalogoEstampas[code].nome; 
        if(elValor) elValor.value = formatCurrency(catalogoEstampas[code].precoVenda); 
    } 
}

function abrirModalEstampa() { 
    let modal = document.getElementById('modalEstampa');
    if(modal) modal.style.display = 'flex'; 
}

function fecharModalEstampa() { 
    let modal = document.getElementById('modalEstampa');
    if(modal) modal.style.display = 'none'; 
    
    ['cadCodigoEstampa', 'cadNomeEstampa', 'cadCusto', 'cadPreco', 'cadCategoriaEstampa', 'editEstampaCodigoOriginal'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.value = '';
    });
    let codEl = document.getElementById('cadCodigoEstampa');
    if(codEl) codEl.disabled = false;
    
    ['estP', 'estM', 'estG', 'estGG'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.value = '0';
    });
    
    let titleEl = document.getElementById('tituloModalEstampa');
    if(titleEl) titleEl.innerText = 'CADASTRAR PRODUTO'; 
    let btnEl = document.getElementById('btnSalvarEstampa');
    if(btnEl) btnEl.innerText = 'SALVAR PRODUTO'; 
}

function prepararEdicaoEstampa(cod) { 
    let p = catalogoEstampas[cod]; 
    if(!p) return;
    let estq = p.estoqueGrade || p.estoque || {P:0, M:0, G:0, GG:0};

    let setVal = (id, val) => { let el = document.getElementById(id); if(el) el.value = val; };
    setVal('cadCodigoEstampa', cod);
    let codEl = document.getElementById('cadCodigoEstampa'); if(codEl) codEl.disabled = true;
    setVal('cadNomeEstampa', p.nome); 
    setVal('estP', estq.P || 0); 
    setVal('estM', estq.M || 0); 
    setVal('estG', estq.G || 0); 
    setVal('estGG', estq.GG || 0); 
    setVal('cadCusto', formatCurrency(p.custo)); 
    setVal('cadPreco', formatCurrency(p.precoVenda)); 
    setVal('cadCategoriaEstampa', p.categoria || ''); 
    setVal('editEstampaCodigoOriginal', cod); 

    let titleEl = document.getElementById('tituloModalEstampa');
    if(titleEl) titleEl.innerText = 'EDITAR PRODUTO: ' + cod; 
    let btnEl = document.getElementById('btnSalvarEstampa');
    if(btnEl) btnEl.innerText = 'ATUALIZAR PRODUTO'; 
    abrirModalEstampa(); 
}

function salvarNovaEstampa(e) { 
    e.preventDefault(); 
    let cod = document.getElementById('cadCodigoEstampa').value.toUpperCase().trim(); 
    let nom = document.getElementById('cadNomeEstampa').value.toUpperCase().trim(); 
    let cat = document.getElementById('cadCategoriaEstampa').value.toUpperCase().trim(); 
    let grade = { 
        P: parseInt(document.getElementById('estP').value)||0, 
        M: parseInt(document.getElementById('estM').value)||0, 
        G: parseInt(document.getElementById('estG').value)||0, 
        GG: parseInt(document.getElementById('estGG').value)||0 
    }; 
    let custo = safeNum(document.getElementById('cadCusto').value); 
    let preco = safeNum(document.getElementById('cadPreco').value); 
    let docId = document.getElementById('editEstampaCodigoOriginal').value || cod; 
    
    db.collection("estampas").doc(docId).set({ 
        codigo: docId, nome: nom, categoria: cat, estoqueGrade: grade, custo: custo, precoVenda: preco, apagado: false 
    }, { merge: true }).then(() => { 
        fecharModalEstampa(); showToast("Produto Salvo!"); 
    }); 
}

function excluirEstampa(id) { 
    if(confirm(`Mandar estampa para a lixeira?`)) db.collection("estampas").doc(id).update({ apagado: true }); 
}

// NOVO: Funções do Modal de QR Code Elaborado
function abrirModalQRCode(codigo) {
    let p = catalogoEstampas[codigo];
    if(!p) return;
    
    document.getElementById('qrCodigoProduto').value = codigo;
    document.getElementById('tituloModalQR').innerText = `🖨️ QR CODES: [${p.codigo}]`;
    document.getElementById('nomeProdutoQR').innerText = p.nome;

    document.getElementById('qrQtdP').value = 0;
    document.getElementById('qrQtdM').value = 0;
    document.getElementById('qrQtdG').value = 0;
    document.getElementById('qrQtdGG').value = 0;

    let modal = document.getElementById('modalQRCode');
    if(modal) modal.style.display = 'flex';
}

function fecharModalQRCode() {
    let modal = document.getElementById('modalQRCode');
    if(modal) modal.style.display = 'none';
}

function gerarEImprimirQR() {
    let codigo = document.getElementById('qrCodigoProduto').value;
    let p = catalogoEstampas[codigo];
    if(!p) return;

    let qtdP = parseInt(document.getElementById('qrQtdP').value) || 0;
    let qtdM = parseInt(document.getElementById('qrQtdM').value) || 0;
    let qtdG = parseInt(document.getElementById('qrQtdG').value) || 0;
    let qtdGG = parseInt(document.getElementById('qrQtdGG').value) || 0;

    let total = qtdP + qtdM + qtdG + qtdGG;
    if(total <= 0) {
        showToast("Insere a quantidade de pelo menos um tamanho!", true);
        return;
    }

    let btn = document.getElementById('btnImprimirQR');
    btn.innerText = "A GERAR... ⏳";
    btn.disabled = true;

    let html = `<html><head><title>Tags QR - ${p.codigo}</title><style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; }
        .tag { border: 2px dashed #000; padding: 15px 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .qr { width: 90px; height: 90px; margin: 10px 0; }
        .nome { font-size: 11px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-transform: uppercase; }
        .preco { font-size: 15px; font-weight: 900; color: #000; margin-top: 5px; }
        .tamanho { font-size: 16px; font-weight: 900; background: #000; color: #fff; padding: 2px 8px; margin-top: 5px; border-radius: 4px; }
    </style></head><body><div class="grid">`;

    let gerarTag = (tamanho, qtd) => {
        for(let i = 0; i < qtd; i++) {
            let qrData = `${p.codigo}-${tamanho}`;
            let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&margin=0`;
            html += `<div class="tag">
                <span style="font-weight:900; font-size:13px; text-transform:uppercase;">WALLER CLOTHING</span>
                <span class="nome">${p.nome}</span>
                <img class="qr" src="${qrUrl}">
                <span class="tamanho">TAM: ${tamanho}</span>
                <span class="preco">${formatCurrency(p.precoVenda)}</span>
            </div>`;
        }
    };

    if(qtdP > 0) gerarTag('P', qtdP);
    if(qtdM > 0) gerarTag('M', qtdM);
    if(qtdG > 0) gerarTag('G', qtdG);
    if(qtdGG > 0) gerarTag('GG', qtdGG);

    html += `</div></body></html>`;

    let iframe = document.getElementById('printFrame');
    if(!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'printFrame';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    
    let doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        btn.innerText = "🖨️ GERAR E IMPRIMIR";
        btn.disabled = false;
        fecharModalQRCode();
        showToast("Impressão enviada para o computador!");
    }, 1500);
}

function renderizarCatalogo() {
    let container = document.getElementById('listaEstampas');
    if (!container) return;

    let html = '';
    Object.keys(catalogoEstampas).sort().forEach(cod => {
        let p = catalogoEstampas[cod];
        
        if (p.apagado === true) return;
        
        let estq = p.estoqueGrade || p.estoque || {P:0, M:0, G:0, GG:0};
        let totalEstoque = (estq.P || 0) + (estq.M || 0) + (estq.G || 0) + (estq.GG || 0);
        let corEstoque = totalEstoque > 0 ? 'var(--green)' : 'var(--red)';
        
        html += `
        <div class="catalog-card" style="border: var(--border-thick); padding: 15px; background: var(--white); box-shadow: 4px 4px 0px var(--border-color); display: flex; flex-direction: column; height: 100%;">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; min-height: 55px; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 1.1rem; line-height: 1.2; padding-right: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">[${p.codigo}] ${p.nome}</h3>
                <span style="background: var(--black); color: var(--white); padding: 3px 6px; font-weight: 900; font-size: 0.6rem; white-space: nowrap;">${p.categoria || 'GERAL'}</span>
            </div>
            
            <div style="font-weight: 900; color: var(--text-muted); display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span>Custo: ${formatCurrency(p.custo)}</span>
                <span style="color: var(--black);">Venda: ${formatCurrency(p.precoVenda)}</span>
            </div>
            
            <div style="margin-top: auto; padding-top: 15px;">
                <div style="background: var(--gray); padding: 10px; border: 2px dashed var(--border-color);">
                    <div style="font-weight: 900; color: ${corEstoque}; margin-bottom: 8px; font-size: 0.85rem;">ESTOQUE: ${totalEstoque} PEÇAS</div>
                    <div class="grade-tamanhos">
                        <div class="grade-box">P <input type="number" value="${estq.P || 0}" onchange="atualizarEstoqueGrade('${p.id}', 'P', this.value)"></div>
                        <div class="grade-box">M <input type="number" value="${estq.M || 0}" onchange="atualizarEstoqueGrade('${p.id}', 'M', this.value)"></div>
                        <div class="grade-box">G <input type="number" value="${estq.G || 0}" onchange="atualizarEstoqueGrade('${p.id}', 'G', this.value)"></div>
                        <div class="grade-box">GG <input type="number" value="${estq.GG || 0}" onchange="atualizarEstoqueGrade('${p.id}', 'GG', this.value)"></div>
                    </div>
                </div>
                
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn-primary" style="flex: 0.5; padding: 10px; font-size: 0.8rem; margin:0; background:var(--black); color:var(--white);" onclick="abrirModalQRCode('${p.codigo}')" title="Gerar QR Code p/ Impressão">🖨️ QR</button>
                    <button class="btn-primary" style="flex: 1; padding: 10px; font-size: 0.8rem; margin:0;" onclick="prepararEdicaoEstampa('${p.codigo}')">✏️ EDITAR</button>
                    <button class="btn-primary" style="flex: 0.5; padding: 10px; font-size: 0.8rem; background: var(--red); color: var(--white); border-color: var(--red); margin:0;" onclick="excluirEstampa('${p.id}')">❌</button>
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}