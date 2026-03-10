// ==========================================
// CATÁLOGO E ESTOQUE
// ==========================================
function copiarLinkVitrine() { let link = window.location.origin + window.location.pathname + '?vitrine=true'; navigator.clipboard.writeText(link).then(() => { showToast("Link da Vitrine copiado para enviar!"); }); }

function atualizarEstoqueGrade(id, tamanho, valorStr) { db.collection("estampas").doc(id).update({ ["estoqueGrade." + tamanho]: parseInt(valorStr) || 0 }); }

function abrirBalancoMassa() { 
    let tbody = document.getElementById('bodyTabelaBalanco'); tbody.innerHTML = ''; 
    Object.keys(catalogoEstampas).sort().forEach(cod => { let p = catalogoEstampas[cod]; tbody.innerHTML += `<tr data-id="${p.id}"><td><strong>${cod}</strong></td><td>${p.nome}</td><td><input type="number" class="balanco-input" data-tam="P" value="${p.estoque.P}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="M" value="${p.estoque.M}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="G" value="${p.estoque.G}" style="padding:5px; text-align:center;"></td><td><input type="number" class="balanco-input" data-tam="GG" value="${p.estoque.GG}" style="padding:5px; text-align:center;"></td></tr>`; }); 
    document.getElementById('modalBalanco').style.display = 'flex'; 
}

function fecharBalancoMassa() { document.getElementById('modalBalanco').style.display = 'none'; }

async function salvarBalancoMassa() { 
    let btn = document.getElementById('btnSalvarBalanco'); btn.innerText = "SALVANDO..."; btn.disabled = true; let batch = db.batch(); let rows = document.querySelectorAll('#bodyTabelaBalanco tr'); 
    rows.forEach(tr => { let docId = tr.getAttribute('data-id'); let inputs = tr.querySelectorAll('.balanco-input'); let novaGrade = {}; inputs.forEach(inp => novaGrade[inp.getAttribute('data-tam')] = parseInt(inp.value) || 0); batch.update(db.collection("estampas").doc(docId), { estoqueGrade: novaGrade }); }); 
    await batch.commit(); btn.innerText = "SALVAR NOVO ESTOQUE"; btn.disabled = false; fecharBalancoMassa(); showToast("Estoque 100% atualizado."); 
}

function autocompletarEstampa(val) { let code = val.toUpperCase().trim(); if(catalogoEstampas[code]) { document.getElementById('nomeEstampa').value = catalogoEstampas[code].nome; document.getElementById('valorUnitario').value = formatCurrency(catalogoEstampas[code].precoVenda); } }

function abrirModalEstampa() { document.getElementById('modalEstampa').style.display = 'flex'; }

function fecharModalEstampa() { document.getElementById('modalEstampa').style.display = 'none'; document.getElementById('cadCodigoEstampa').value = ''; document.getElementById('cadCodigoEstampa').disabled = false; document.getElementById('cadNomeEstampa').value = ''; document.getElementById('estP').value = '0'; document.getElementById('estM').value = '0'; document.getElementById('estG').value = '0'; document.getElementById('estGG').value = '0'; document.getElementById('cadCusto').value = ''; document.getElementById('cadPreco').value = ''; document.getElementById('cadCategoriaEstampa').value = ''; document.getElementById('editEstampaCodigoOriginal').value = ''; document.getElementById('tituloModalEstampa').innerText = 'CADASTRAR PRODUTO'; document.getElementById('btnSalvarEstampa').innerText = 'SALVAR PRODUTO'; }

function prepararEdicaoEstampa(cod) { 
    let p = catalogoEstampas[cod]; document.getElementById('cadCodigoEstampa').value = cod; document.getElementById('cadCodigoEstampa').disabled = true; document.getElementById('cadNomeEstampa').value = p.nome; document.getElementById('estP').value = p.estoque.P || 0; document.getElementById('estM').value = p.estoque.M || 0; document.getElementById('estG').value = p.estoque.G || 0; document.getElementById('estGG').value = p.estoque.GG || 0; document.getElementById('cadCusto').value = formatCurrency(p.custo); document.getElementById('cadPreco').value = formatCurrency(p.precoVenda); document.getElementById('cadCategoriaEstampa').value = p.categoria || ''; document.getElementById('editEstampaCodigoOriginal').value = cod; document.getElementById('tituloModalEstampa').innerText = 'EDITAR PRODUTO: ' + cod; document.getElementById('btnSalvarEstampa').innerText = 'ATUALIZAR PRODUTO'; abrirModalEstampa(); 
}

function salvarNovaEstampa(e) { 
    e.preventDefault(); let cod = document.getElementById('cadCodigoEstampa').value.toUpperCase().trim(); let nom = document.getElementById('cadNomeEstampa').value.toUpperCase().trim(); let cat = document.getElementById('cadCategoriaEstampa').value.toUpperCase().trim(); let grade = { P: parseInt(document.getElementById('estP').value)||0, M: parseInt(document.getElementById('estM').value)||0, G: parseInt(document.getElementById('estG').value)||0, GG: parseInt(document.getElementById('estGG').value)||0 }; let custo = safeNum(document.getElementById('cadCusto').value); let preco = safeNum(document.getElementById('cadPreco').value); let docId = document.getElementById('editEstampaCodigoOriginal').value || cod; 
    db.collection("estampas").doc(docId).set({ codigo: docId, nome: nom, categoria: cat, estoqueGrade: grade, custo: custo, precoVenda: preco, apagado: false }, { merge: true }).then(() => { fecharModalEstampa(); showToast("Produto Salvo!"); }); 
}

function excluirEstampa(id) { if(confirm(`Mandar estampa para a lixeira?`)) db.collection("estampas").doc(id).update({ apagado: true }); }