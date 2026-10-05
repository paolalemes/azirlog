// roteirizacao.js
// Modulo 3 - importacao da planilha, geocodificacao e disparo do calculo

function parseSheetUrl(url){const id=(url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)||[])[1];return{id};}
async function loadSheet(){
  const url=document.getElementById('sheet-url').value.trim();const st=document.getElementById('sheet-st');
  if(!url){st.innerHTML='<span style="color:#c00">⚠️ Cole o link da planilha</span>';return;}
  if(url.includes('/spreadsheets/d/e/')){st.innerHTML='<span style="color:#c00">⚠️ Use o link de <strong>Compartilhar</strong></span>';return;}
  const{id}=parseSheetUrl(url);if(!id){st.innerHTML='<span style="color:#c00">⚠️ Link inválido.</span>';return;}
  st.innerHTML='<span class="loading"><span class="spinner"></span> Carregando planilha...</span>';
  try{
    const attempts=[`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=ROTEIRIZACAO`,`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('ROTEIRIZAÇÃO')}`,`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`];
    let text='',ok=false;
    for(const csvUrl of attempts){const res=await fetch(csvUrl);if(!res.ok)continue;const t=await res.text();if(!t.trim().startsWith('<!') && t.trim()!==''){text=t;ok=true;break;}}
    if(!ok)throw new Error('Não foi possível acessar a planilha. Confirme que está compartilhada publicamente.');
    const parsed=Papa.parse(text,{skipEmptyLines:false});const allRows=parsed.data;
    let hIdx=-1;for(let i=0;i<Math.min(allRows.length,10);i++){const s=allRows[i].join('|').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(s.includes('NOTA')&&(s.includes('DESTINATA')||s.includes('ENDERE'))){hIdx=i;break;}}
    if(hIdx<0)hIdx=1;
    const headers=(allRows[hIdx]||[]).map(h=>h.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
    const rows=allRows.slice(hIdx+1).filter(r=>r&&r.some(c=>c&&c.trim()));
    const fi=k=>headers.findIndex(h=>h.includes(k));
    const iD=fi('DATA')>=0?fi('DATA'):0,iN=fi('NOTA')>=0?fi('NOTA'):1;
    const iDs=headers.findIndex(h=>h.includes('DESTINATA'))>=0?headers.findIndex(h=>h.includes('DESTINATA')):3;
    const iE=fi('ENDERE')>=0?fi('ENDERE'):4,iC=fi('CIDADE')>=0?fi('CIDADE'):5;
    const iV=headers.findIndex(h=>h.includes('VEGETA'))>=0?headers.findIndex(h=>h.includes('VEGETA')):6;
    const iP=headers.findIndex(h=>(h.includes('PORCO')||h.includes('SUINO'))&&!h.includes('FRANGO'))>=0?headers.findIndex(h=>(h.includes('PORCO')||h.includes('SUINO'))&&!h.includes('FRANGO')):7;
    const iPF=headers.findIndex(h=>h.includes('FRANGO'))>=0?headers.findIndex(h=>h.includes('FRANGO')):8;
    // Carne e opcional: sem coluna CARNE no cabecalho, fica 0 (sem posicao fixa para nao ler a coluna de status)
    const iCa=headers.findIndex(h=>h.includes('CARNE'));
    const iEt=headers.findIndex(h=>h.includes('ENTREGA')&&!h.includes('DATA'))>=0?headers.findIndex(h=>h.includes('ENTREGA')&&!h.includes('DATA')):9;
    const data=rows.map(r=>({data:(r[iD]||'').trim(),nota:(r[iN]||'').trim(),dest:(r[iDs]||'').trim(),end:(r[iE]||'').trim(),cidade:(r[iC]||'').trim(),veg:parseInt(r[iV])||0,porc:parseInt(r[iP])||0,pf:parseInt(r[iPF])||0,carne:iCa>=0?(parseInt(r[iCa])||0):0,status:(r[iEt]||'').trim(),lat:null,lng:null})).filter(r=>r.nota&&r.dest);
    if(!data.length){const dbg=`Cabeçalho linha ${hIdx+1}: [${headers.slice(0,8).join('|')}]. NOTA=${iN} DEST=${iDs} END=${iE} CIDADE=${iC} VEG=${iV} PORC=${iP} PF=${iPF} CARNE=${iCa}. Linhas: ${rows.length}.`;throw new Error(`Nenhuma nota encontrada. Debug: ${dbg}`);}
    S.mod3.rows=data;S.mod3.sheetId=id;
    const pend=data.filter(r=>{const s=r.status.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.includes('NAO')||!r.status;}).length;
    document.getElementById('sheet-sum').innerHTML=`<div class="summary-box"><div class="s-label">Total Notas</div><div class="s-value">${data.length}</div></div><div class="summary-box"><div class="s-label">Não Entregues</div><div class="s-value s-orange">${pend}</div></div><div class="summary-box"><div class="s-label">Cidades</div><div class="s-value">${[...new Set(data.map(r=>r.cidade).filter(Boolean))].length}</div></div>`;
    document.getElementById('route-cfg').style.display='block';
    st.innerHTML=`<span style="color:var(--green)">✓ ${data.length} nota(s) carregada(s) com sucesso</span>`;
    const cidades=[...new Set(data.map(r=>r.cidade).filter(Boolean))].sort();
    document.getElementById('city-filter').innerHTML=cidades.map(c=>`<span class="city-chip" data-city="${c}" onclick="toggleCity(this)">${c}</span>`).join('');
  }catch(e){st.innerHTML=`<span style="color:#c00;font-size:12px">✕ ${e.message}</span>`;}
}

async function calcRoutes(){
  const key=getApiKey();if(!key){alert('Configure a Google Maps API Key em Configurações primeiro.');showPage('settings');return;}
  const nCars=parseInt(document.getElementById('n-cars').value)||1,filt=document.getElementById('filt-status').value,mode=document.getElementById('balance-mode').value;
  const st=document.getElementById('st3'),btn=document.getElementById('btn-route');btn.disabled=true;
  const selCities=[...document.querySelectorAll('.city-chip.selected')].map(c=>c.dataset.city);
  let rows=[...S.mod3.rows];
  if(filt==='pending')rows=rows.filter(r=>{const s=r.status.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.includes('NAO')||!r.status;});
  if(selCities.length)rows=rows.filter(r=>selCities.includes(r.cidade));
  if(!rows.length){st.innerHTML='<span style="color:#c00">Nenhuma entrega encontrada.</span>';btn.disabled=false;return;}
  st.innerHTML='<span class="loading"><span class="spinner"></span> Carregando Google Maps...</span>';
  await loadGMaps(key);
  const geocoder=new google.maps.Geocoder();
  const originAddr=document.getElementById('origin').value.trim();
  // Geocodifica o depósito de saída para usar como ponto fixo na otimização
  let depot=null;
  if(originAddr){st.innerHTML='<span class="loading"><span class="spinner"></span> Geocodificando depósito...</span>';try{const r=await new Promise((res,rej)=>geocoder.geocode({address:originAddr},(results,status)=>{if(status==='OK'&&results[0])res(results[0].geometry.location);else rej(status);}));depot={lat:r.lat(),lng:r.lng()};}catch(e){console.warn('Depósito não geocodificado, otimizando sem ponto de partida');}}
  let done=0;const failed=[];
  for(const row of rows){
    const addr=`${row.end}, ${row.cidade}, São Paulo, Brasil`;
    try{const r=await new Promise((res,rej)=>geocoder.geocode({address:addr},(results,status)=>{if(status==='OK'&&results[0])res(results[0].geometry.location);else rej(status);}));row.lat=r.lat();row.lng=r.lng();}
    catch(e){failed.push(row.nota);row.lat=null;row.lng=null;}
    done++;st.innerHTML=`<span class="loading"><span class="spinner"></span> Geocodificando ${done}/${rows.length}...</span>`;await sleep(80);
  }
  const valid=rows.filter(r=>r.lat),invalid=rows.filter(r=>!r.lat);
  st.innerHTML='<span class="loading"><span class="spinner"></span> Agrupando entregas (K-means++)...</span>';
  await sleep(10);
  const clusters=clusterRoutes(valid,nCars,mode);
  st.innerHTML='<span class="loading"><span class="spinner"></span> Otimizando rotas (2-opt + or-opt)...</span>';
  await sleep(10);
  const optClusters=interRouteOpt(clusters,depot);
  const routes=optClusters.filter(c=>c.length).map((cl,i)=>({car:i+1,stops:buildRoute(cl,depot),distKm:null}));
  S.mod3.routes=routes;S.mod3.failed=invalid;
  await calcDistances(routes,originAddr,depot,st);
  renderRoutes(routes,invalid);
  let msg=`<span style="color:var(--green)">✓ ${routes.length} rota(s) otimizada(s) — ${valid.length} entrega(s)</span>`;
  if(failed.length)msg+=` &nbsp;<span style="color:var(--orange)">⚠️ ${failed.length} não geocodificado(s): Nota(s) ${failed.join(', ')}</span>`;
  st.innerHTML=msg;btn.disabled=false;
}
