// core.js
// Estado global, navegacao entre paginas, upload de XML e utilitarios

const S={mod1:{files:[],data:[]},mod2:{files:[],data:[]},mod3:{rows:[],routes:[]}};
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));document.getElementById('page-'+id).classList.add('active');const nav=document.querySelector(`[data-page="${id}"]`);if(nav)nav.classList.add('active');}
function onDrag(e,id){e.preventDefault();document.getElementById(id).classList.add('dragover');}
function offDrag(id){document.getElementById(id).classList.remove('dragover');}
function onDrop(e,zid,iid,mod){e.preventDefault();offDrag(zid);addFiles(Array.from(e.dataTransfer.files).filter(f=>f.name.endsWith('.xml')),mod);}
function onFilePick(inp,mod){addFiles(Array.from(inp.files).filter(f=>f.name.endsWith('.xml')),mod);inp.value='';}
function addFiles(files,mod){const ex=S[mod].files.map(f=>f.name);files.forEach(f=>{if(!ex.includes(f.name))S[mod].files.push(f);});renderFiles(mod);}
function removeFile(mod,i){S[mod].files.splice(i,1);renderFiles(mod);}
function renderFiles(mod){const n=mod==='mod1'?'1':'2';const el=document.getElementById('files'+n);const btn=document.getElementById('btn'+n);btn.disabled=!S[mod].files.length;el.innerHTML=S[mod].files.map((f,i)=>`<div class="file-item"><span class="file-name"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${f.name}</span><button class="file-remove" onclick="removeFile('${mod}',${i})">✕</button></div>`).join('');}
function readTxt(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsText(file,'UTF-8');});}
function xget(node,tag){const el=node.querySelector(tag);return el?el.textContent.trim():'';}
function fmtDate(s){if(!s)return'';const d=s.substring(0,10);const[y,m,day]=d.split('-');return`${day}/${m}/${y}`;}
function fmtBRL(v){const n=parseFloat(v);if(isNaN(n))return'—';return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function today(){const d=new Date();return`${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
