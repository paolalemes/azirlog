// settings.js
// Chave da API do Google Maps, carregamento do SDK e preferencias

function saveSettings(){const k=document.getElementById('api-key').value.trim();if(k)localStorage.setItem('azir_gmaps_key',k);const msg=document.getElementById('cfg-msg');msg.textContent='✓ Configurações salvas!';setTimeout(()=>msg.textContent='',2500);}
function getApiKey(){return document.getElementById('api-key').value.trim()||localStorage.getItem('azir_gmaps_key')||'';}
function loadGMaps(key){return new Promise((resolve,reject)=>{if(window.google?.maps){resolve();return;}window.__gmapsCB=resolve;const s=document.createElement('script');s.src=`https://maps.googleapis.com/maps/api/js?key=${key}&callback=__gmapsCB`;s.onerror=()=>reject(new Error('Falha ao carregar Google Maps.'));document.head.appendChild(s);});}
function toggleCity(el){el.classList.toggle('selected');}
window.addEventListener('load',()=>{const saved=localStorage.getItem('azir_gmaps_key');if(saved)document.getElementById('api-key').value=saved;});
