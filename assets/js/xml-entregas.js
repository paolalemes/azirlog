// xml-entregas.js
// Modulo 1 - extracao de produtos por destinatario a partir de NF-e

async function runMod1(){
  const st=document.getElementById('st1');st.innerHTML='<span class="loading"><span class="spinner"></span> Processando...</span>';
  const rows=[];
  for(const file of S.mod1.files){
    try{
      const txt=await readTxt(file);const doc=new DOMParser().parseFromString(txt,'text/xml');
      const nNF=xget(doc,'nNF'),dhEmi=xget(doc,'dhEmi')||xget(doc,'dEmi'),destNome=xget(doc,'dest xNome');
      const xLgr=xget(doc,'enderDest xLgr'),nro=xget(doc,'enderDest nro'),xBai=xget(doc,'enderDest xBairro'),xMun=xget(doc,'enderDest xMun');
      const end=[xLgr,nro?`nº ${nro}`:'',xBai].filter(Boolean).join(', ');
      let veg=0,porc=0,pf=0,carne=0;
      // Ordem importa: FRANGO antes de PORCO (sabor misto) e PORCO/SUINO antes de CARNE (caso venha "CARNE SUINA")
      doc.querySelectorAll('det').forEach(det=>{const xp=xget(det,'xProd').toUpperCase();const q=parseFloat(xget(det,'qCom'))||0;if(xp.includes('FRANGO'))pf+=q;else if(xp.includes('PORCO')||xp.includes('SU'))porc+=q;else if(xp.includes('CARNE')||xp.includes('BOVIN'))carne+=q;else veg+=q;});
      rows.push({data:fmtDate(dhEmi),nota:nNF,dest:destNome,end,cidade:xMun,vNF:parseFloat(xget(doc,'vNF'))||0,veg,porc,pf,carne,total:veg+porc+pf+carne});
    }catch(e){console.error(file.name,e);}
  }
  rows.sort((a,b)=>a.nota.localeCompare(b.nota));S.mod1.data=rows;renderMod1(rows);st.textContent=`✓ ${rows.length} nota(s) processada(s)`;
}
function renderMod1(rows){
  const tVeg=rows.reduce((s,r)=>s+r.veg,0),tPorc=rows.reduce((s,r)=>s+r.porc,0),tPF=rows.reduce((s,r)=>s+r.pf,0),tCarne=rows.reduce((s,r)=>s+r.carne,0),tTot=rows.reduce((s,r)=>s+r.total,0);
  const cids=[...new Set(rows.map(r=>r.cidade))].length;
  document.getElementById('sum1').innerHTML=`<div class="summary-box"><div class="s-label">Notas</div><div class="s-value">${rows.length}</div></div><div class="summary-box"><div class="s-label">Cidades</div><div class="s-value">${cids}</div></div><div class="summary-box"><div class="s-label">Vegetais</div><div class="s-value s-green">${tVeg}</div></div><div class="summary-box"><div class="s-label">Porco</div><div class="s-value">${tPorc}</div></div><div class="summary-box"><div class="s-label">Porco e Frango</div><div class="s-value s-orange">${tPF}</div></div><div class="summary-box"><div class="s-label">Carne</div><div class="s-value s-red">${tCarne}</div></div><div class="summary-box"><div class="s-label">Total Caixas</div><div class="s-value">${tTot}</div></div>`;
  document.getElementById('tb1').innerHTML=rows.map(r=>`<tr><td>${r.data}</td><td><strong>${r.nota}</strong></td><td class="td-r">${fmtBRL(r.vNF)}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.dest}">${r.dest}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:12px" title="${r.end}">${r.end||'—'}</td><td>${r.cidade}</td><td class="${r.veg>0?'td-r':'td-zero'}">${r.veg||'—'}</td><td class="${r.porc>0?'td-r':'td-zero'}">${r.porc||'—'}</td><td class="${r.pf>0?'td-r':'td-zero'}">${r.pf||'—'}</td><td class="${r.carne>0?'td-r':'td-zero'}">${r.carne||'—'}</td></tr>`).join('')+`<tr class="total-row"><td colspan="6">Total Geral</td><td class="td-r">${tVeg}</td><td class="td-r">${tPorc}</td><td class="td-r">${tPF}</td><td class="td-r">${tCarne}</td></tr>`;
  document.getElementById('res1').style.display='block';
}
function expXls1(){const d=S.mod1.data;const ws=XLSX.utils.aoa_to_sheet([['Data','Nº Nota','Vlr Nota','Destinatário','Endereço','Cidade','Vegetais','Porco','Porco e Frango','Carne'],...d.map(r=>[r.data,r.nota,r.vNF,r.dest,r.end,r.cidade,r.veg,r.porc,r.pf,r.carne]),[],['','','','','','TOTAL',d.reduce((s,r)=>s+r.veg,0),d.reduce((s,r)=>s+r.porc,0),d.reduce((s,r)=>s+r.pf,0),d.reduce((s,r)=>s+r.carne,0)]]);ws['!cols']=[{wch:12},{wch:12},{wch:14},{wch:38},{wch:35},{wch:22},{wch:10},{wch:10},{wch:14},{wch:10}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Entregas');XLSX.writeFile(wb,`Entregas_${today()}.xlsx`);}
function copyTable1(){const d=S.mod1.data;if(!d.length)return;const tsv=d.map(r=>[r.data,r.nota,r.vNF,r.dest,r.end,r.cidade,r.veg||0,r.porc||0,r.pf||0,r.carne||0].join('\t')).join('\n');navigator.clipboard.writeText(tsv).then(()=>{const ok=document.getElementById('copy-ok1');ok.style.display='block';setTimeout(()=>ok.style.display='none',3500);}).catch(()=>{const ta=document.createElement('textarea');ta.value=tsv;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);const ok=document.getElementById('copy-ok1');ok.style.display='block';setTimeout(()=>ok.style.display='none',3500);});}
