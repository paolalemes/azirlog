// rotas-render.js
// Renderizacao das rotas, tabela, impressao e exportacao para Excel

const CAR_COLORS=['#C0392B','#1565C0','#6A1B9A','#00695C','#E65100','#558B2F','#4527A0'];
function renderRoutes(routes,failed=[]){
  const tV=routes.flatMap(r=>r.stops).reduce((s,p)=>s+(p.veg||0),0),tP=routes.flatMap(r=>r.stops).reduce((s,p)=>s+(p.porc||0),0),tF=routes.flatMap(r=>r.stops).reduce((s,p)=>s+(p.pf||0),0),tC=routes.flatMap(r=>r.stops).reduce((s,p)=>s+(p.carne||0),0),tN=routes.flatMap(r=>r.stops).length;
  document.getElementById('route-summary-boxes').innerHTML=`<div class="summary-box"><div class="s-label">Entregas roteirizadas</div><div class="s-value">${tN}</div></div><div class="summary-box"><div class="s-label">Carros</div><div class="s-value">${routes.length}</div></div><div class="summary-box"><div class="s-label">Total VEGETAIS</div><div class="s-value s-green">${tV}</div></div><div class="summary-box"><div class="s-label">Total PORCO</div><div class="s-value">${tP}</div></div><div class="summary-box"><div class="s-label">Total PORCO E FRANGO</div><div class="s-value s-orange">${tF}</div></div><div class="summary-box"><div class="s-label">Total CARNE</div><div class="s-value s-red">${tC}</div></div>${failed.length?`<div class="summary-box" style="border-color:#FFD54F;background:#FFF8E1"><div class="s-label">Não geocodificados</div><div class="s-value" style="color:var(--orange)">${failed.length}</div></div>`:''}`;
  // Legenda com distância
  document.getElementById('route-legend').innerHTML=routes.map((rt,ri)=>{
    const col=CAR_COLORS[ri%CAR_COLORS.length];
    const km=rt.distKm?` · 📍 ${rt.distKm} km`:'';
    return`<div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600"><span style="width:14px;height:14px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0"></span>Carro ${rt.car} — ${rt.stops.length} entrega${rt.stops.length!==1?'s':''}${km}</div>`;
  }).join('');
  const mapEl=document.getElementById('map');mapEl.style.height='420px';
  const map=new google.maps.Map(mapEl,{zoom:11,center:{lat:-23.55,lng:-46.63},mapTypeControl:false,streetViewControl:false,styles:[{featureType:'poi',stylers:[{visibility:'off'}]}]});
  routes.forEach((rt,ri)=>{const col=CAR_COLORS[ri%CAR_COLORS.length];rt.stops.forEach((s,si)=>{new google.maps.Marker({position:{lat:s.lat,lng:s.lng},map,title:`[Carro ${rt.car}] ${s.dest}`,label:{text:String(si+1),color:'white',fontWeight:'bold',fontSize:'11px'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:14,fillColor:col,fillOpacity:1,strokeColor:'white',strokeWeight:2}});});if(rt.stops.length>1)new google.maps.Polyline({path:rt.stops.map(s=>({lat:s.lat,lng:s.lng})),geodesic:true,strokeColor:col,strokeOpacity:.6,strokeWeight:3,map});});
  const sel=document.getElementById('car-filter');sel.innerHTML='<option value="all">Todos os carros</option>'+routes.map(rt=>`<option value="${rt.car}">Carro ${rt.car}</option>`).join('');
  S.mod3._allRows=routes.flatMap((rt,ri)=>rt.stops.map((s,si)=>({...s,carNum:rt.car,carColor:CAR_COLORS[ri%CAR_COLORS.length],order:si+1})));
  renderRouteTable(S.mod3._allRows);document.getElementById('route-res').style.display='block';document.getElementById('route-res').scrollIntoView({behavior:'smooth'});
}
function renderRouteTable(rows){
  document.getElementById('route-tbody').innerHTML=rows.map(s=>{const col=s.carColor;const vChip=s.veg>0?`<span class="qty-chip qty-green">${s.veg}</span>`:`<span class="qty-zero">—</span>`;const pChip=s.porc>0?`<span class="qty-chip qty-blue">${s.porc}</span>`:`<span class="qty-zero">—</span>`;const fChip=s.pf>0?`<span class="qty-chip qty-orange">${s.pf}</span>`:`<span class="qty-zero">—</span>`;const cChip=s.carne>0?`<span class="qty-chip qty-red">${s.carne}</span>`:`<span class="qty-zero">—</span>`;return`<tr data-car="${s.carNum}"><td><span class="car-badge" style="background:${col}">Carro ${s.carNum}</span></td><td style="font-weight:700;font-size:15px;text-align:center">${s.order}</td><td style="font-weight:600">${s.nota}</td><td style="font-weight:600">${s.dest}</td><td style="font-size:12px;color:var(--muted)">${s.end}${s.cidade?'<br><span style="color:var(--green);font-weight:600">'+s.cidade+'</span>':''}</td><td style="font-weight:600">${s.cidade||''}</td><td style="text-align:center">${vChip}</td><td style="text-align:center">${pChip}</td><td style="text-align:center">${fChip}</td><td style="text-align:center">${cChip}</td></tr>`;}).join('');
}
function filterCarTable(){const v=document.getElementById('car-filter').value;renderRouteTable(v==='all'?S.mod3._allRows:S.mod3._allRows.filter(r=>String(r.carNum)===v));}

function printRoute(){
  const carSel=document.getElementById('car-filter').value;
  const routes=carSel==='all'?S.mod3.routes:S.mod3.routes.filter(r=>String(r.car)===carSel);
  if(!routes.length){alert('Nenhuma rota para imprimir.');return;}
  const CP=['#C0392B','#1565C0','#6A1B9A','#00695C','#E65100','#558B2F','#4527A0'];
  const riMap={};S.mod3.routes.forEach((r,i)=>{riMap[r.car]=i;});
  const routeHtml=routes.map(rt=>{
    const col=CP[riMap[rt.car]%CP.length];
    const tV=rt.stops.reduce((s,r)=>s+(r.veg||0),0),tP=rt.stops.reduce((s,r)=>s+(r.porc||0),0),tF=rt.stops.reduce((s,r)=>s+(r.pf||0),0),tC=rt.stops.reduce((s,r)=>s+(r.carne||0),0);
    const kmStr=rt.distKm?` · 📍 ${rt.distKm} km`:'';
    const rowsHtml=rt.stops.map((s,si)=>`<tr><td style="text-align:center;font-weight:700">${si+1}</td><td style="font-weight:600">${s.nota}</td><td style="font-weight:600">${s.dest}</td><td style="font-size:11px;color:#555">${s.end}${s.cidade?', '+s.cidade:''}</td><td style="text-align:center;font-weight:700;color:${s.veg>0?'#1B5E20':'#ccc'}">${s.veg||'—'}</td><td style="text-align:center;font-weight:700;color:${s.porc>0?'#1565C0':'#ccc'}">${s.porc||'—'}</td><td style="text-align:center;font-weight:700;color:${s.pf>0?'#E65100':'#ccc'}">${s.pf||'—'}</td><td style="text-align:center;font-weight:700;color:${s.carne>0?'#B71C1C':'#ccc'}">${s.carne||'—'}</td></tr>`).join('');
    return`<div class="car-section"><div class="car-title" style="background:${col}">🚗 Carro ${rt.car} · ${rt.stops.length} entrega${rt.stops.length!==1?'s':''}${kmStr} · Vegetais: ${tV} · Porco: ${tP} · P. e Frango: ${tF} · Carne: ${tC}</div><table><thead><tr><th style="width:45px">Ordem</th><th style="width:85px">Nota</th><th style="width:190px">Destinatário</th><th>Endereço</th><th style="width:65px;text-align:center">VEG</th><th style="width:55px;text-align:center">PORC</th><th style="width:75px;text-align:center">P.FRANGO</th><th style="width:60px;text-align:center">CARNE</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr><td colspan="4" style="font-weight:700;text-align:right;padding-right:12px">TOTAL SEPARAÇÃO:</td><td style="text-align:center;font-weight:800;color:#1B5E20">${tV}</td><td style="text-align:center;font-weight:800;color:#1565C0">${tP}</td><td style="text-align:center;font-weight:800;color:#E65100">${tF}</td><td style="text-align:center;font-weight:800;color:#B71C1C">${tC}</td></tr></tfoot></table></div>`;
  }).join('');
  const label=carSel==='all'?'Todos os Carros':`Carro ${carSel}`;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Roteirização — ${label}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#111}
.toolbar{position:fixed;top:10px;right:14px;display:flex;gap:8px;z-index:999;background:rgba(255,255,255,.96);padding:7px 10px;border-radius:7px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.content{padding:16px 20px}
.print-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid #03591B;margin-bottom:14px}
.logo-azir{font-size:20px;font-weight:900;color:#03591B}
.logo-log{color:#DA7800}
.print-meta{font-size:11px;color:#555;text-align:right;line-height:1.6}
.car-section{margin-bottom:18px}
.car-title{color:#fff;padding:8px 12px;font-size:12px;font-weight:700;border-radius:5px 5px 0 0}
table{width:100%;border-collapse:collapse;border:1px solid #ddd;border-top:none}
th{background:#f0f0f0;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.3px;border-bottom:2px solid #ddd;text-align:left}
td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:middle}
tfoot td{background:#f9f9f9;border-top:2px solid #ddd;font-size:11px}
tr:last-child td{border-bottom:none}
@media print{
  .toolbar{display:none!important}
  body{padding:0}
  .content{padding:10px 12px}
  @page{margin:0.8cm;size:A4 landscape}
}
</style>
</head><body>
<div class="toolbar">
  <button onclick="window.print()" style="padding:8px 16px;background:#03591B;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">🖨️ Imprimir / PDF</button>
  <button onclick="window.close()" style="padding:8px 16px;background:#eee;border:none;border-radius:6px;font-size:12px;cursor:pointer">Fechar</button>
</div>
<div class="content">
<div class="print-header">
  <div class="logo-azir">Azir<span class="logo-log">Log</span></div>
  <div style="font-size:13px;font-weight:700">Roteirização — ${label}</div>
  <div class="print-meta">Data: ${new Date().toLocaleDateString('pt-BR')}<br>AzirLog LTDA · contato@azirlog.com.br</div>
</div>
${routeHtml}
</div>
</body></html>`);
  win.document.close();
}

function expRouteXls(){
  const wb=XLSX.utils.book_new();
  S.mod3.routes.forEach(rt=>{
    const tV=rt.stops.reduce((s,r)=>s+(r.veg||0),0),tP=rt.stops.reduce((s,r)=>s+(r.porc||0),0),tF=rt.stops.reduce((s,r)=>s+(r.pf||0),0),tC=rt.stops.reduce((s,r)=>s+(r.carne||0),0);
    const kmLabel=rt.distKm?`Distância total: ${rt.distKm} km`:'';
    const ws=XLSX.utils.aoa_to_sheet([[`CARRO ${rt.car} — Roteirização`],[kmLabel],[],['Ordem','Nota','Destinatário','Endereço','Cidade','Vegetais','Porco','Porco e Frango','Carne'],...rt.stops.map((s,i)=>[i+1,s.nota,s.dest,s.end,s.cidade,s.veg||0,s.porc||0,s.pf||0,s.carne||0]),[],['','','','','TOTAL',tV,tP,tF,tC]]);
    ws['!cols']=[{wch:7},{wch:12},{wch:36},{wch:36},{wch:22},{wch:10},{wch:10},{wch:14},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws,`Carro ${rt.car}`);
  });
  XLSX.writeFile(wb,`Roteirizacao_${today()}.xlsx`);
}
