// ==========================================
// 🚀 INTEGRAÇÃO MELHOR ENVIO E CUBAGEM
// ==========================================

const ME_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYmZlZDE1ZmZjYzhmNTFmMWVkOTc2YzgwNjBjZDI5MzNhODk2MzU3MGRjYTYyZWViMzZmNmY2NjAzMThmZDkwMTcxN2YxOWYxMWU0YzQ2ZWIiLCJpYXQiOjE3NzI1ODg3NzguOTY3MzEsIm5iZiI6MTc3MjU4ODc3OC45NjczMTIsImV4cCI6MTgwNDEyNDc3OC45NTU1Nywic3ViIjoiYTEzNmEwZWItOWY0ZC00MTEwLWE1NmEtYTI1MjliMzJjZDM5Iiwic2NvcGVzIjpbImNhcnQtcmVhZCIsImNhcnQtd3JpdGUiLCJjb21wYW5pZXMtcmVhZCIsImNvbXBhbmllcy13cml0ZSIsImNvdXBvbnMtcmVhZCIsImNvdXBvbnMtd3JpdGUiLCJub3RpZmljYXRpb25zLXJlYWQiLCJvcmRlcnMtcmVhZCIsInByb2R1Y3RzLXJlYWQiLCJwcm9kdWN0cy1kZXN0cm95IiwicHJvZHVjdHMtd3JpdGUiLCJwdXJjaGFzZXMtcmVhZCIsInNoaXBwaW5nLWNhbGN1bGF0ZSIsInNoaXBwaW5nLWNhbmNlbCIsInNoaXBwaW5nLWNoZWNrb3V0Iiwic2hpcHBpbmctY29tcGFuaWVzIiwic2hpcHBpbmctZ2VuZXJhdGUiLCJzaGlwcGluZy1wcmV2aWV3Iiwic2hpcHBpbmctcHJpbnQiLCJzaGlwcGluZy1zaGFyZSIsInNoaXBwaW5nLXRyYWNraW5nIiwiZWNvbW1lcmNlLXNoaXBwaW5nIiwidHJhbnNhY3Rpb25zLXJlYWQiLCJ1c2Vycy1yZWFkIiwidXNlcnMtd3JpdGUiLCJ3ZWJob29rcy1yZWFkIiwid2ViaG9va3Mtd3JpdGUiLCJ3ZWJob29rcy1kZWxldGUiLCJ0ZGVhbGVyLXdlYmhvb2siXX0.D-XgoRQJYhIvW2ROm2nmZ6PsMuKc0GoP8LAVXVxXVeKClR-oKmeoD05V05Jt6vHTuYbliPk9loLu_lJmxf6DsXqb2jRy2fxl5IUUypc1A_7XjKQclugvXSiFsBEPWnhQyys1vJ5rF1KUe43kVh_1EQf9XyGivOUAcuv_IU2-KqtGrQgDD-kzGgb563eSP13WziQad28IIW7ySgpmMiLXf5ucxTU5TlhCStImFe93aVUxc3YkJ96kIWNUlRiKTj950j0CgEhJSV5_P9gmORUhIAvnofQ_kl8l3piwTHcETKS9He7WqtCwR0yQOsQ_zV2r8pDeiDefzrh-2RgjbG13gyqgbk2GZM1wRDWo_jnPRBRKLvli_FJYWfZO8bLGlX3_gUcoZUvZs2vwUqQapfs9GFLRbbaehL-MMJmssx4vUdXKjdZMoMB-jQZdKeBO9aHn83V75dSgm-saZAAd98Z49YgzjG3dBiI-vYhQS97oeztKaPXwFNSW0qrp_BWNGHRVQsVLoycvJCYQK0iQ2tBJfxHGvU-R1Peg6IEr65UKggS9oe4GSV_Twidb0x7ikxsnidcfs0iik3M5UGQw3mpqyMIP9ZCxaV4sPyId7kgcg2C6-KUlwdnd5_zFFtDIKp5NVpU9IhGN_OK5xCf5OoPtVrWnKRYNHpymEwvrEWRy4Cg"; 
const ME_CPF_ORIGEM = "43737606838"; 

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const ME_CALC_URL = isLocalhost ? 'https://corsproxy.io/?' + encodeURIComponent('https://melhorenvio.com.br/api/v2/me/shipment/calculate') : '/api/me/shipment/calculate';
const ME_CART_URL = isLocalhost ? 'https://corsproxy.io/?' + encodeURIComponent('https://melhorenvio.com.br/api/v2/me/cart') : '/api/me/cart';

function calcularCaixaEPeso(itens) {
    if (!itens || itens.length === 0) return { weight: 0.3, length: 20, width: 15, height: 5 };
    let pesoTotal = 0; let pontuacaoVolume = 0;
    itens.forEach(item => {
        let qtd = parseInt(item.quantidade || 1); let tipo = (item.tipoPeca || '').toUpperCase();
        if (tipo === 'MOLETOM') { pesoTotal += (0.6 * qtd); pontuacaoVolume += (6 * qtd); } 
        else if (tipo === 'OVERSIZED') { pesoTotal += (0.35 * qtd); pontuacaoVolume += (3 * qtd); } 
        else if (tipo === 'REGATA') { pesoTotal += (0.15 * qtd); pontuacaoVolume += (1 * qtd); } 
        else { pesoTotal += (0.25 * qtd); pontuacaoVolume += (2 * qtd); }
    });
    let l = 20, w = 15, h = 5; 
    if (pontuacaoVolume > 20) { l = 40; w = 30; h = 20; } 
    else if (pontuacaoVolume > 10) { l = 30; w = 25; h = 15; } 
    else if (pontuacaoVolume > 4) { l = 25; w = 20; h = 10; }
    pesoTotal = pesoTotal < 0.3 ? 0.3 : parseFloat(pesoTotal.toFixed(2));
    return { weight: pesoTotal, length: l, width: w, height: h };
}

async function cotarFrete() {
    let cepDestino = document.getElementById('cep').value.replace(/\D/g, '');
    if(cepDestino.length !== 8) { showToast("Digite um CEP válido primeiro!", true); return; }
    
    document.getElementById('lblCepCotacao').innerText = document.getElementById('cep').value;
    let lista = document.getElementById('listaOpcoesFrete');
    lista.innerHTML = '<div style="text-align:center; padding:20px; font-weight:900;">Buscando fretes reais no MelhorEnvio... ⏳</div>';
    document.getElementById('modalFrete').style.display = 'flex';
    
    let cubagem = calcularCaixaEPeso(carrinhoTemporario);

    const payload = { "from": { "postal_code": "02475001" }, "to": { "postal_code": cepDestino }, "volumes": [ { "weight": cubagem.weight, "width": cubagem.width, "height": cubagem.height, "length": cubagem.length } ], "options": { "insurance_value": 0, "receipt": false, "own_hand": false } };

    try {
        let res = await fetch(ME_CALC_URL, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` }, body: JSON.stringify(payload) });
        let texto = await res.text();
        
        if (texto.includes('<html') || texto.includes('<!DOCTYPE')) {
            lista.innerHTML = '<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">⚠️ A Vercel bloqueou a conexão.<br>Você criou o arquivo vercel.json na pasta do GitHub?</div>'; return;
        }

        let data = JSON.parse(texto);
        if (res.ok && Array.isArray(data)) {
            let html = ''; let fretesValidos = data.filter(s => !s.error && s.price);
            fretesValidos.sort((a,b) => parseFloat(a.price) - parseFloat(b.price));

            fretesValidos.forEach(serv => {
                let valorCalculado = parseFloat(serv.price); let icon = '🚚';
                if(serv.company.name.toUpperCase().includes('CORREIOS')) icon = serv.name.toUpperCase().includes('SEDEX') ? '⚡' : '📦';
                html += `<div class="frete-card" onclick="selecionarFrete(${valorCalculado})"><div style="display:flex; flex-direction:column;"><span style="font-weight:900;">${icon} ${serv.company.name} - ${serv.name}</span><span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Chega em até ${serv.delivery_time} dias úteis (Caixa: ${cubagem.length}x${cubagem.width}x${cubagem.height})</span></div><span style="color:var(--green); font-weight:900; font-size: 1.2rem;">${formatCurrency(valorCalculado)}</span></div>`;
            });
            lista.innerHTML = html !== '' ? html : '<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">Nenhum frete atende essa região.</div>';
        } else {
            let errMsg = data.error || data.message || 'CEP de destino inválido ou sem cobertura.';
            lista.innerHTML = `<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">O MelhorEnvio rejeitou a consulta.<br><span style="font-size:0.8rem; color:#666;">${errMsg}</span></div>`;
        }
    } catch(e) { lista.innerHTML = '<div style="text-align:center; color:var(--red); padding:20px; font-weight:900;">⚠️ Falha grave de conexão com o servidor.</div>'; }
}

function selecionarFrete(valor) { document.getElementById('valorFreteReal').value = formatCurrency(valor); document.getElementById('valorFrete').value = formatCurrency(valor); if(typeof atualizarTelaCarrinho === 'function') atualizarTelaCarrinho(); document.getElementById('modalFrete').style.display = 'none'; }
function fecharModalFrete(e) { if(e && e.target.id !== 'modalFrete') return; document.getElementById('modalFrete').style.display = 'none'; }

async function chamarApiCarrinhoME(payload) {
    let res = await fetch(ME_CART_URL, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` }, body: JSON.stringify(payload) });
    let texto = await res.text();
    if (texto.includes('<html') || texto.includes('<!DOCTYPE')) { return { ok: false, isVercelError: true, data: { error: "O arquivo vercel.json está faltando no GitHub." } }; }
    try { return { ok: res.ok, data: JSON.parse(texto) }; } catch(e) { return { ok: false, data: { error: "A resposta do MelhorEnvio falhou." } }; }
}

async function enviarParaMelhorEnvio(pedidoId) {
    let p = todosPedidos.find(x => x.id === pedidoId); if(!p) return;
    let cpfCliente = (p.cpf || '').replace(/\D/g,'');
    if(cpfCliente.length !== 11) { alert("⚠️ ERRO: O CPF do cliente precisa ter exatamente 11 números e ser VÁLIDO na Receita Federal.\nClique no Lápis ✏️ para editar o pedido e arrumar o CPF."); return; }
    let cepDestino = (p.cep || '').replace(/\D/g, '');
    if(cepDestino.length !== 8) { alert("⚠️ ERRO: CEP do cliente inválido."); return; }

    let nomeCliente = p.nome ? p.nome.trim() : "Cliente"; if(nomeCliente.split(' ').length < 2) nomeCliente += " Waller";
    let phoneLimpo = p.whatsapp ? p.whatsapp.replace(/\D/g, '') : ''; if(phoneLimpo.length < 10 || phoneLimpo.length > 11) phoneLimpo = "11999999999"; 
    let emailCliente = p.email && p.email.includes('@') ? p.email.trim().toLowerCase() : "cliente@email.com";
    let cidade = 'São Paulo'; let uf = 'SP'; let bairro = 'Centro'; let logradouro = p.endereco ? p.endereco.split(',')[0] : 'Rua Principal';
    
    try { let reqCep = await fetch(`https://viacep.com.br/ws/${cepDestino}/json/`); let resCep = await reqCep.json(); if(!resCep.erro) { cidade = resCep.localidade; uf = resCep.uf; bairro = resCep.bairro || bairro; logradouro = resCep.logradouro || logradouro; } } catch(e) {}

    let matchNumero = p.endereco ? p.endereco.match(/,\s*(\d+)/) : null;
    let numeroEnd = p.numeroEnd || p.complemento || "SN"; 
    if(numeroEnd === "SN" && matchNumero) numeroEnd = matchNumero[1];
    if(!numeroEnd || numeroEnd.trim() === '') numeroEnd = "SN";
    let complementoEnvio = p.complemento ? p.complemento.trim() : "";

    let cubagem = calcularCaixaEPeso(p.itens || []);
    
    let valorTotalPecas = 0; 
    let produtosME = [];

    (p.itens || []).forEach(i => { 
        let qtd = parseInt(i.quantidade || 1);
        let valorUn = safeNum(i.valorUnitario);
        valorTotalPecas += (valorUn * qtd); 
        
        produtosME.push({
            "name": `${i.tipoPeca || 'Peça'} - ${i.nomeEstampa || 'Sem Nome'} (Tam: ${i.tamanho || '-'})`,
            "quantity": qtd,
            "unitary_value": valorUn > 0 ? valorUn : 50.00
        });
    });

    if (produtosME.length === 0) {
        produtosME.push({ "name": "Vestuário Waller", "quantity": 1, "unitary_value": 50.00 });
    }

    let selectedServiceId = 1; // Padrão PAC
    try {
        let calcPayload = { "from": { "postal_code": "02475001" }, "to": { "postal_code": cepDestino }, "volumes": [ { "weight": cubagem.weight, "width": cubagem.width, "height": cubagem.height, "length": cubagem.length } ], "options": { "insurance_value": 0, "receipt": false, "own_hand": false } };
        let calcRes = await fetch(ME_CALC_URL, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${ME_TOKEN}` }, body: JSON.stringify(calcPayload) });
        let calcData = await calcRes.json();
        if (Array.isArray(calcData)) { let validServices = calcData.filter(s => !s.error && s.price && s.company.name.toUpperCase().includes('CORREIOS')); if(validServices.length > 0) { validServices.sort((a,b) => parseFloat(a.price) - parseFloat(b.price)); selectedServiceId = validServices[0].id; } }
    } catch(e) {}

    let payload = {
        "service": selectedServiceId, 
        "from": { "name": "Waller Clothing", "phone": "11999999999", "email": "contato@wallerclothing.com.br", "document": ME_CPF_ORIGEM, "postal_code": "02475001", "address": "Rua Conselheiro Moreira de Barros", "number": "100", "district": "Santana", "city": "São Paulo", "state_abbr": "SP", "country_id": "BR" },
        "to": { "name": nomeCliente, "phone": phoneLimpo, "email": emailCliente, "document": cpfCliente, "address": logradouro, "number": numeroEnd, "complement": complementoEnvio, "district": bairro, "city": cidade, "state_abbr": uf, "country_id": "BR", "postal_code": cepDestino, "note": "Pedido #" + (p.numeroPedido || '') },
        "products": produtosME, 
        "volumes": [ { "height": cubagem.height, "width": cubagem.width, "length": cubagem.length, "weight": cubagem.weight } ],
        "options": { "insurance_value": valorTotalPecas > 0 ? valorTotalPecas : 50.00, "receipt": false, "own_hand": false, "reverse_attach": false, "non_commercial": true }
    };

    try {
        let response = await chamarApiCarrinhoME(payload); 
        let respString = JSON.stringify(response.data, null, 2);
        
        if (!response.ok && (respString.includes("Transportadora não atende") || respString.includes("Transportadora nao atende"))) {
            payload.service = 2; response = await chamarApiCarrinhoME(payload); respString = JSON.stringify(response.data, null, 2);
        }

        if (response.ok && response.data.id) {
            showToast("Caixa Dinâmica ("+cubagem.length+"x"+cubagem.width+"x"+cubagem.height+") gerada! 🎉", false);
            window.open("https://melhorenvio.com.br/carrinho", "_blank");
        } else {
            if (response.isVercelError) { alert("⚠️ ERRO DE SERVIDOR VERCEL:\n\nO seu site tentou se comunicar com o MelhorEnvio, mas a configuração 'vercel.json' não foi encontrada."); return; }
            
            let detalhes = "";
            if (response.data.message === "Unauthenticated.") {
                detalhes = "O seu Token expirou ou é inválido. Gere um novo no painel do MelhorEnvio.";
            } else if (response.data.errors) {
                detalhes = Object.entries(response.data.errors)
                    .map(([k, v]) => `👉 ${k.toUpperCase()}: ${Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`)
                    .join('\n');
            } else if (response.data.error) {
                detalhes = typeof response.data.error === 'object' ? JSON.stringify(response.data.error, null, 2) : response.data.error;
            } else if (response.data.message) {
                detalhes = typeof response.data.message === 'object' ? JSON.stringify(response.data.message, null, 2) : response.data.message;
            } else {
                detalhes = respString;
            }

            alert(`❌ O MelhorEnvio rejeitou a etiqueta.\n\nMOTIVO:\n${detalhes}\n\nEdite o pedido clicando no lápis (✏️) e corrija a informação.`);
        }
    } catch (e) { alert("⚠️ Falha crítica ao conectar com a API do MelhorEnvio.\n\n" + e); }
}