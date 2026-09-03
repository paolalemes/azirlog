// xml-remessa.js
// Modulo 2 - controle de saldo por nota (remessa/retorno)

async function runMod2(){
  const st=document.getElementById('st2');st.innerHTML='<span class="loading"><span class="spinner"></span> Processando...</span>';
  const rows=[];
  for(const file of S.mod2.files){
    try{const txt=await readTxt(file);const doc=new DOMParser().parseFromString(txt,'text/xml');const nNF=xget(doc,'nNF'),dhEmi=xget(doc,'dhEmi')||xget(doc,'dEmi'),emit=xget(doc,'emit xNome')||xget(doc,'emit xFant'),dest=xget(doc,'dest xNome');doc.querySelectorAll('det').forEach(det=>{rows.push({data:fmtDate(dhEmi),nota:nNF,emit,dest,prod:xget(det,'xProd'),qtde:parseFloat(xget(det,'qCom'))||0,un:xget(det,'uCom'),vUnit:parseFloat(xget(det,'vUnCom'))||0,vTot:parseFloat(xget(det,'vProd'))||0});});}catch(e){console.error(file.name,e);}
  }
  S.mod2.data=rows;renderMod2(rows);st.textContent=`✓ ${rows.length} item(ns) processado(s)`;
}
function renderMod2(rows){
  const notas=[...new Set(rows.map(r=>r.nota))].length,tVlr=rows.reduce((s,r)=>s+r.vTot,0);
  document.getElementById('sum2').innerHTML=`<div class="summary-box"><div class="s-label">Notas</div><div class="s-value">${notas}</div></div><div class="summary-box"><div class="s-label">Itens</div><div class="s-value">${rows.length}</div></div><div class="summary-box"><div class="s-label">Valor Total</div><div class="s-value s-green" style="font-size:17px">${fmtBRL(tVlr)}</div></div>`;
  let lastN=null;document.getElementById('tb2').innerHTML=rows.map(r=>{let hdr='';if(r.nota!==lastN){hdr=`<tr class="city-row"><td colspan="9">Nota ${r.nota} · ${r.data} · ${r.emit} → ${r.dest}</td></tr>`;lastN=r.nota;}return hdr+`<tr><td>${r.data}</td><td><strong>${r.nota}</strong></td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.emit}">${r.emit}</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.dest}">${r.dest}</td><td>${r.prod}</td><td class="td-r">${r.qtde}</td><td>${r.un}</td><td class="td-r">${fmtBRL(r.vUnit)}</td><td class="td-r">${fmtBRL(r.vTot)}</td></tr>`;}).join('');
  document.getElementById('res2').style.display='block';
}
function copyTable2(){const d=S.mod2.data;if(!d.length)return;const tsv=d.map(r=>[r.data,r.nota,r.emit,r.dest,r.prod,r.qtde,r.un,r.vUnit,r.vTot].join('\t')).join('\n');navigator.clipboard.writeText(tsv).then(()=>{const ok=document.getElementById('copy-ok2');ok.style.display='block';setTimeout(()=>ok.style.display='none',3500);}).catch(()=>{const ta=document.createElement('textarea');ta.value=tsv;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);const ok=document.getElementById('copy-ok2');ok.style.display='block';setTimeout(()=>ok.style.display='none',3500);});}
function expXls2(){const d=S.mod2.data;const ws=XLSX.utils.aoa_to_sheet([['Data','Nº Nota','Emitente','Destinatário','Produto','Qtde','Un.','Vlr Unit.','Vlr Total'],...d.map(r=>[r.data,r.nota,r.emit,r.dest,r.prod,r.qtde,r.un,r.vUnit,r.vTot])]);ws['!cols']=[{wch:12},{wch:12},{wch:35},{wch:35},{wch:40},{wch:10},{wch:7},{wch:13},{wch:13}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Remessa Retorno');XLSX.writeFile(wb,`Remessa_Retorno_${today()}.xlsx`);}
