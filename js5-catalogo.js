// ==========================================
// CATÁLOGO, ESTOQUE E GERADOR DE QR CODE AVANÇADO (COM FILA DE IMPRESSÃO)
// ==========================================

// Variável global para armazenar as etiquetas que vão ser impressas juntas
let filaDeImpressaoQR = [];

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

// ==========================================
// PREPARAR EDIÇÃO DE ESTAMPA E SALVAR (COM LÓGICA DE PREFIXO)
// ==========================================
function prepararEdicaoEstampa(cod) { 
    let p = catalogoEstampas[cod]; 
    if(!p) return;
    let estq = p.estoqueGrade || p.estoque || {P:0, M:0, G:0, GG:0};

    let setVal = (id, val) => { let el = document.getElementById(id); if(el) el.value = val; };
    
    // Extrai apenas o número (tira as 2 primeiras letras se baterem com a categoria atual)
    let catLimpa = (p.categoria || '').toUpperCase().trim();
    let prefixo = catLimpa.length >= 2 ? catLimpa.substring(0, 2) : '';
    let numApenas = cod;
    
    if (prefixo && cod.startsWith(prefixo)) {
        numApenas = cod.substring(2);
    }

    setVal('cadCodigoEstampa', numApenas);
    
    // Desbloqueia o campo para poderes editar o número
    let codEl = document.getElementById('cadCodigoEstampa'); 
    if(codEl) codEl.disabled = false;
    
    setVal('cadNomeEstampa', p.nome); 
    setVal('estP', estq.P || 0); 
    setVal('estM', estq.M || 0); 
    setVal('estG', estq.G || 0); 
    setVal('estGG', estq.GG || 0); 
    setVal('cadCusto', formatCurrency(p.custo)); 
    setVal('cadPreco', formatCurrency(p.precoVenda)); 
    setVal('cadCategoriaEstampa', p.categoria || ''); 
    
    // Guarda o código antigo completo (ex: OV001) para podermos migrar se a categoria/número mudar
    setVal('editEstampaCodigoOriginal', cod); 

    let titleEl = document.getElementById('tituloModalEstampa');
    if(titleEl) titleEl.innerText = 'EDITAR PRODUTO: ' + cod; 
    let btnEl = document.getElementById('btnSalvarEstampa');
    if(btnEl) btnEl.innerText = 'ATUALIZAR PRODUTO'; 
    abrirModalEstampa(); 
}

async function salvarNovaEstampa(e) { 
    e.preventDefault(); 
    
    // Pega a categoria e gera o prefixo (2 primeiras letras)
    let cat = document.getElementById('cadCategoriaEstampa').value.toUpperCase().trim(); 
    if (cat.length < 2) {
        showToast("A categoria precisa ter pelo menos 2 letras!", true);
        return;
    }
    let prefixo = cat.substring(0, 2);

    // Pega o número digitado
    let numDigitado = document.getElementById('cadCodigoEstampa').value.toUpperCase().trim(); 
    
    // Prevenção ninja: se tu digitares a categoria por engano (ex: OV001), o sistema limpa e não duplica
    if (numDigitado.startsWith(prefixo)) {
        numDigitado = numDigitado.substring(2);
    }

    // O casamento perfeito: 2 Letras da Categoria + O teu número
    let codFinal = prefixo + numDigitado;

    let nom = document.getElementById('cadNomeEstampa').value.toUpperCase().trim(); 
    let grade = { 
        P: parseInt(document.getElementById('estP').value)||0, 
        M: parseInt(document.getElementById('estM').value)||0, 
        G: parseInt(document.getElementById('estG').value)||0, 
        GG: parseInt(document.getElementById('estGG').value)||0 
    }; 
    let custo = safeNum(document.getElementById('cadCusto').value); 
    let preco = safeNum(document.getElementById('cadPreco').value); 
    
    // Pegamos o código antigo que estava guardado
    let oldCode = document.getElementById('editEstampaCodigoOriginal').value; 
    
    let btnSalvar = document.getElementById('btnSalvarEstampa');
    if(btnSalvar) { btnSalvar.innerText = "A GRAVAR..."; btnSalvar.disabled = true; }

    try {
        if (oldCode && oldCode !== codFinal) {
            // O CÓDIGO FINAL FOI ALTERADO! Vamos apagar o velho e criar o novo na DB
            let batch = db.batch();
            
            let newRef = db.collection("estampas").doc(codFinal);
            batch.set(newRef, { codigo: codFinal, nome: nom, categoria: cat, estoqueGrade: grade, custo: custo, precoVenda: preco, apagado: false });
            
            let oldRef = db.collection("estampas").doc(oldCode);
            batch.delete(oldRef);
            
            await batch.commit();
            showToast(`SKU atualizado de [${oldCode}] para [${codFinal}]! 💀`);
        } else {
            // Produto novo ou atualização normal sem alterar o código
            let docId = oldCode || codFinal; 
            await db.collection("estampas").doc(docId).set({ 
                codigo: docId, nome: nom, categoria: cat, estoqueGrade: grade, custo: custo, precoVenda: preco, apagado: false 
            }, { merge: true });
            showToast("Produto Guardado!"); 
        }
        
        fecharModalEstampa(); 
    } catch (err) {
        console.error("Erro ao guardar estampa:", err);
        showToast("Erro ao guardar produto!", true);
    } finally {
        if(btnSalvar) { btnSalvar.innerText = "SALVAR PRODUTO"; btnSalvar.disabled = false; }
    }
}

function excluirEstampa(id) { 
    if(confirm(`Mandar estampa para a lixeira?`)) db.collection("estampas").doc(id).update({ apagado: true }); 
}

// ==========================================
// MÓDULO DE FILA DE IMPRESSÃO (MASS QR CODE)
// ==========================================

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

    atualizarBotoesModalQR();
}

function fecharModalQRCode() {
    let modal = document.getElementById('modalQRCode');
    if(modal) modal.style.display = 'none';
}

function atualizarBotoesModalQR() {
    let btnAntigo = document.getElementById('btnImprimirQR');
    let container = document.getElementById('containerBotoesQR');
    
    if (btnAntigo && !container) {
        let pai = btnAntigo.parentElement;
        container = document.createElement('div');
        container.id = 'containerBotoesQR';
        container.style.display = 'flex';
        container.style.gap = '10px';
        pai.replaceChild(container, btnAntigo);
    }
    
    if (container) {
        let qtdFila = filaDeImpressaoQR.length;
        container.innerHTML = `
            <button class="btn-primary" onclick="adicionarAFilaQR()" style="flex:1; padding:15px; background:var(--white); color:var(--black); border:2px solid var(--black);">➕ ADD À FILA</button>
            <button class="btn-primary" onclick="imprimirFilaQR()" style="flex:1; padding:15px; ${qtdFila > 0 ? 'background:var(--green); color:var(--black);' : 'background:var(--gray); color:var(--text-muted);'}" ${qtdFila === 0 ? 'disabled' : ''}>🖨️ IMPRIMIR FILA (${qtdFila})</button>
        `;
    }

    atualizarBotaoGlobalFila();
}

function atualizarBotaoGlobalFila() {
    let containerAcoes = document.getElementById('acoesAdminCatalogo');
    if (!containerAcoes) return;

    let btnFilaGlob = document.getElementById('btnFilaGlobQR');
    if (!btnFilaGlob) {
        btnFilaGlob = document.createElement('button');
        btnFilaGlob.id = 'btnFilaGlobQR';
        btnFilaGlob.className = 'btn-primary';
        btnFilaGlob.style.width = 'auto';
        btnFilaGlob.style.margin = '0';
        btnFilaGlob.style.padding = '0.8rem 1.5rem';
        btnFilaGlob.onclick = imprimirFilaQR;
        containerAcoes.insertBefore(btnFilaGlob, containerAcoes.firstChild);
    }

    if(filaDeImpressaoQR.length > 0) {
        btnFilaGlob.style.display = 'inline-block';
        btnFilaGlob.style.background = 'var(--green)';
        btnFilaGlob.style.color = 'var(--black)';
        btnFilaGlob.innerText = `🖨️ IMPRIMIR FILA (${filaDeImpressaoQR.length} TAGS)`;
    } else {
        btnFilaGlob.style.display = 'none';
    }
}

function adicionarAFilaQR() {
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

    let pushTags = (tamanho, qtd) => {
        for(let i=0; i<qtd; i++) {
            filaDeImpressaoQR.push({ codigo: p.codigo, nome: p.nome, tamanho: tamanho, precoVenda: p.precoVenda });
        }
    };

    if(qtdP > 0) pushTags('P', qtdP);
    if(qtdM > 0) pushTags('M', qtdM);
    if(qtdG > 0) pushTags('G', qtdG);
    if(qtdGG > 0) pushTags('GG', qtdGG);

    showToast(`${total} etiquetas do [${p.codigo}] adicionadas à fila!`);
    atualizarBotoesModalQR();
    
    document.getElementById('qrQtdP').value = 0;
    document.getElementById('qrQtdM').value = 0;
    document.getElementById('qrQtdG').value = 0;
    document.getElementById('qrQtdGG').value = 0;
}

function imprimirFilaQR() {
    if (filaDeImpressaoQR.length === 0) {
        showToast("A fila de impressão está vazia!", true);
        return;
    }

    let container = document.getElementById('containerBotoesQR');
    if(container) container.innerHTML = `<button class="btn-primary" disabled style="width:100%; padding:15px; background:var(--black);">A GERAR ${filaDeImpressaoQR.length} ETIQUETAS... ⏳</button>`;
    
    let btnFilaGlob = document.getElementById('btnFilaGlobQR');
    if(btnFilaGlob) btnFilaGlob.innerText = "⏳ GERANDO...";

    let html = `<html><head><title>Fila de Impressão Waller</title><style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; }
        .tag { border: 2px dashed #000; padding: 15px 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-inside: avoid; break-inside: avoid; }
        .qr { width: 90px; height: 90px; margin: 10px 0; object-fit: contain; }
        .nome { font-size: 11px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-transform: uppercase; }
        .preco { font-size: 15px; font-weight: 900; color: #000; margin-top: 5px; }
        .tamanho { font-size: 16px; font-weight: 900; background: #000; color: #fff; padding: 2px 8px; margin-top: 5px; border-radius: 4px; }
    </style></head><body><div class="grid">`;

    filaDeImpressaoQR.forEach(tag => {
        let qrData = encodeURIComponent(`${tag.codigo}-${tag.tamanho}`);
        let qrUrl = `https://quickchart.io/qr?text=${qrData}&size=150&margin=0`;
        html += `<div class="tag">
            <span style="font-weight:900; font-size:13px; text-transform:uppercase;">WALLER CLOTHING</span>
            <span class="nome">${tag.nome}</span>
            <img class="qr" src="${qrUrl}" crossorigin="anonymous">
            <span class="tamanho">TAM: ${tag.tamanho}</span>
            <span class="preco">${formatCurrency(tag.precoVenda)}</span>
        </div>`;
    });

    html += `</div>
    <script>
        window.onload = function() {
            Promise.all(Array.from(document.images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => { img.onload = img.onerror = resolve; });
            })).then(() => {
                setTimeout(() => window.print(), 300);
            });
        };
    </script>
    </body></html>`;

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
        filaDeImpressaoQR = [];
        atualizarBotaoGlobalFila();
        fecharModalQRCode();
        showToast("Preparando impressão! Aguarde o navegador abrir a tela...");
    }, 1500);
}

function renderizarCatalogo() {
    let container = document.getElementById('listaEstampas');
    if (!container) return;

    atualizarBotaoGlobalFila();

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

// ==========================================
// DESCARREGAR ETIQUETA VISUAL EM PNG (QR CODE PURO + TEXTOS LATERAIS)
// ==========================================
async function baixarQRPng(codigo, tamanho) {
    if (!codigo) {
        showToast("Nenhum produto selecionado!", true);
        return;
    }

    let p = catalogoEstampas[codigo];
    if (!p) return;

    let nomeLimpo = p.nome || "Produto";
    let catLimpa = p.categoria || "Geral";

    // AQUI ESTÁ O SEGREDO: O QR Code interno volta a ser apenas o CÓDIGO-TAMANHO.
    // Assim o leitor USB ou a câmara do sistema não se engasgam com símbolos e espaços!
    let textoQR = `${codigo}-${tamanho}`;
    let qrData = encodeURIComponent(textoQR);
    let qrUrl = `https://quickchart.io/qr?text=${qrData}&size=400&margin=1`;

    try {
        showToast(`A desenhar etiqueta visual [${codigo}-${tamanho}]... ⏳`);
        
        // Cria a tela em branco
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.width = 1000;
        canvas.height = 400;
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Puxa a imagem do QR Code
        let img = new Image();
        img.crossOrigin = "Anonymous";
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = qrUrl;
        });
        
        // Desenha o QR Code na esquerda
        ctx.drawImage(img, 20, 20, 360, 360);
        
        // Textos na Direita (Isto é para o humano ler, não a máquina)
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "middle";
        
        ctx.font = "bold 30px 'Montserrat', Arial, sans-serif";
        ctx.fillText(`CÓDIGO: ${codigo}  |  CAT: ${catLimpa}`, 410, 100, 560);
        
        ctx.font = "900 45px 'Montserrat', Arial, sans-serif";
        ctx.fillText(`${nomeLimpo.toUpperCase()}`, 410, 200, 560);
        
        ctx.font = "900 70px 'Montserrat', Arial, sans-serif";
        ctx.fillText(`TAM: ${tamanho}`, 410, 310, 560);
        
        // Exporta o PNG
        canvas.toBlob((blob) => {
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Etiqueta_${codigo}_${tamanho}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            showToast(`Etiqueta PNG concluída e descarregada! 💀✅`);
        }, "image/png");
        
    } catch (error) {
        showToast("Erro ao gerar a etiqueta PNG!", true);
        console.error(error);
    }
}

// ==========================================
// GERAR RELATÓRIO DE ESTOQUE EM PDF
// ==========================================
function gerarRelatorioEstoquePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4'); 

    // Título Brutalista
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("RAIO-X DE ESTOQUE | WALLER CLOTHING", 40, 40);

    // Subtítulo / Data
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 40, 60);

    let tableData = [];
    let totalPecasGeral = 0;

    // Filtra produtos ativos e ordena pelo SKU
    let produtos = Object.values(catalogoEstampas).filter(p => !p.apagado);
    produtos.sort((a, b) => {
        let codA = (a.codigo || '').toString().toUpperCase();
        let codB = (b.codigo || '').toString().toUpperCase();
        return codA.localeCompare(codB);
    });

    // Monta as linhas da tabela
    produtos.forEach(p => {
        let estq = p.estoqueGrade || p.estoque || {P:0, M:0, G:0, GG:0};
        let pQtd = parseInt(estq.P || 0);
        let mQtd = parseInt(estq.M || 0);
        let gQtd = parseInt(estq.G || 0);
        let ggQtd = parseInt(estq.GG || 0);
        
        let totalProduto = pQtd + mQtd + gQtd + ggQtd;
        totalPecasGeral += totalProduto;

        tableData.push([
            p.codigo || '-',
            (p.categoria || 'GERAL').toUpperCase(),
            (p.nome || '').toUpperCase(),
            pQtd.toString(),
            mQtd.toString(),
            gQtd.toString(),
            ggQtd.toString(),
            totalProduto.toString()
        ]);
    });

    // Desenha a Tabela
    doc.autoTable({
        startY: 80,
        head: [['SKU', 'CATEGORIA', 'PRODUTO', 'P', 'M', 'G', 'GG', 'TOTAL']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [17, 17, 17], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' }, 
            1: { cellWidth: 80 }, 
            2: { cellWidth: 'auto' }, 
            3: { halign: 'center', cellWidth: 30 }, 
            4: { halign: 'center', cellWidth: 30 }, 
            5: { halign: 'center', cellWidth: 30 }, 
            6: { halign: 'center', cellWidth: 30 }, 
            7: { halign: 'center', fontStyle: 'bold', cellWidth: 40, textColor: [193, 18, 31] } 
        }
    });

    // Rodapé com Resumo
    let finalY = doc.lastAutoTable.finalY || 80;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`TOTAL DE PECAS NO ESTOQUE: ${totalPecasGeral} UNIDADES`, 40, finalY + 30);

    // Download
    let nomeArquivo = `Waller_Estoque_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nomeArquivo);
    showToast("Relatório de Estoque baixado com sucesso! 💀📄");
}
