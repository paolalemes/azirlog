// otimizacao.js
// Algoritmos de roteirizacao: k-means++, 2-opt, or-opt e inter-rotas

// ─── Hybrid: ≤25 paradas → Directions optimizeWaypoints | >25 → Distance Matrix + 2-opt ───
async function calcDistances(routes,originAddr,depot,st){
  const svc=new google.maps.DirectionsService();
  const matSvc=new google.maps.DistanceMatrixService();
  for(let ri=0;ri<routes.length;ri++){
    const rt=routes[ri];if(!rt.stops.length)continue;
    if(st)st.innerHTML=`<span class="loading"><span class="spinner"></span> Otimizando rota ${ri+1}/${routes.length} com distâncias reais...</span>`;
    if(rt.stops.length<=25&&originAddr){
      // ≤ 25 paradas: Google TSP via Directions API (optimizeWaypoints)
      try{
        const wpts=rt.stops.map(s=>({location:new google.maps.LatLng(s.lat,s.lng),stopover:true}));
        const result=await new Promise((res,rej)=>svc.route({origin:originAddr,destination:originAddr,waypoints:wpts,optimizeWaypoints:true,travelMode:google.maps.TravelMode.DRIVING},(r,status)=>status==='OK'?res(r):rej(status)));
        rt.stops=result.routes[0].waypoint_order.map(i=>rt.stops[i]);
        const legs=result.routes[0].legs;
        rt.distKm=(legs.slice(0,legs.length-1).reduce((s,l)=>s+l.distance.value,0)/1000).toFixed(1);
      }catch(e){rt.distKm=pathDist(rt.stops,null).toFixed(1)+'*';}
    }else{
      // > 25 paradas: Distance Matrix → 2-opt real → Directions em blocos
      await optimizeLargeRoute(rt,originAddr,depot,matSvc,svc);
    }
    await sleep(300);
  }
}

async function optimizeLargeRoute(rt,originAddr,depot,matSvc,svc){
  const n=rt.stops.length,distMap=new Map(),bSz=25;
  // Monta matriz de distâncias reais por lotes 25×25
  for(let i=0;i<n;i+=bSz){
    const origs=rt.stops.slice(i,i+bSz).map(s=>new google.maps.LatLng(s.lat,s.lng));
    for(let j=0;j<n;j+=bSz){
      const dests=rt.stops.slice(j,j+bSz).map(s=>new google.maps.LatLng(s.lat,s.lng));
      try{
        const resp=await new Promise((res,rej)=>matSvc.getDistanceMatrix({origins:origs,destinations:dests,travelMode:google.maps.TravelMode.DRIVING},(r,s)=>s==='OK'?res(r):rej(s)));
        resp.rows.forEach((row,ri)=>row.elements.forEach((el,ci)=>{if(el.status==='OK'){const a=rt.stops[i+ri],b=rt.stops[j+ci];distMap.set(`${a.lat},${a.lng}|${b.lat},${b.lng}`,el.distance.value);}}));
      }catch(e){/* lote com fallback haversine */}
      await sleep(150);
    }
  }
  // 2-opt com distâncias reais (fallback haversine*1250 se não cobertas)
  const getDist=(a,b)=>distMap.get(`${a.lat},${a.lng}|${b.lat},${b.lng}`)??haverDist(a,b)*1250;
  rt.stops=twoOptReal(rt.stops,getDist);
  // Calcula distância total via Directions em blocos de 25 pontos
  let total=0;const all=depot?[depot,...rt.stops]:rt.stops;
  for(let i=0;i<all.length-1;i+=24){
    const chunk=all.slice(i,i+25);
    try{
      const result=await new Promise((res,rej)=>svc.route({origin:new google.maps.LatLng(chunk[0].lat,chunk[0].lng),destination:new google.maps.LatLng(chunk[chunk.length-1].lat,chunk[chunk.length-1].lng),waypoints:chunk.slice(1,-1).map(s=>({location:new google.maps.LatLng(s.lat,s.lng),stopover:true})),travelMode:google.maps.TravelMode.DRIVING},(r,s)=>s==='OK'?res(r):rej(s)));
      total+=result.routes[0].legs.reduce((s,l)=>s+l.distance.value,0);
    }catch(e){for(let j=1;j<chunk.length;j++)total+=haverDist(chunk[j-1],chunk[j])*1000;}
    await sleep(200);
  }
  rt.distKm=(total/1000).toFixed(1);
}

function twoOptReal(stops,getDist){
  if(stops.length<=2)return stops;
  let route=[...stops];let improved=true,iters=0;
  while(improved&&iters++<300){improved=false;for(let i=0;i<route.length-1;i++){for(let j=i+2;j<route.length;j++){const db=getDist(route[i],route[i+1])+(j<route.length-1?getDist(route[j],route[j+1]):0);const da=getDist(route[i],route[j])+(j<route.length-1?getDist(route[i+1],route[j+1]):0);if(da<db-1){let lo=i+1,hi=j;while(lo<hi){[route[lo],route[hi]]=[route[hi],route[lo]];lo++;hi--;}improved=true;}}}}
  return route;
}

// ─── Helpers de distância ─────────────────────────────────────────────────────
function haverDist(a,b){const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;const h=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function pathDist(stops,depot){let d=0;const all=depot?[depot,...stops]:stops;for(let i=1;i<all.length;i++)d+=haverDist(all[i-1],all[i]);return d;}

// ─── K-means++ com múltiplos restarts ────────────────────────────────────────
function kmeansppInit(pts,k){const c=[pts[Math.floor(Math.random()*pts.length)]];while(c.length<k){const d=pts.map(p=>Math.min(...c.map(x=>haverDist(p,x)**2)));const t=d.reduce((s,x)=>s+x,0);let r=Math.random()*t,i=0;for(;i<pts.length-1;i++){r-=d[i];if(r<=0)break;}c.push(pts[i]);}return c;}
function clusterKmeans(pts,k){let best=null,bestI=Infinity;for(let a=0;a<8;a++){let centers=kmeansppInit(pts,k),cl=[];for(let iter=0;iter<60;iter++){cl=Array.from({length:k},()=>[]);pts.forEach(p=>{let m=Infinity,idx=0;centers.forEach((c,i)=>{const d=haverDist(p,c);if(d<m){m=d;idx=i;}});cl[idx].push(p);});const nc=cl.map((c,i)=>c.length?{lat:c.reduce((s,r)=>s+r.lat,0)/c.length,lng:c.reduce((s,r)=>s+r.lng,0)/c.length}:centers[i]);if(!nc.some((c,i)=>haverDist(c,centers[i])>0.005))break;centers=nc;}const inertia=cl.reduce((s,c,i)=>s+c.reduce((ss,p)=>ss+haverDist(p,centers[i])**2,0),0);if(inertia<bestI){bestI=inertia;best=cl;}}return best||[pts];}
function clusterRoutes(pts,k,mode){
  if(k===1)return[pts];if(pts.length<=k)return pts.map(p=>[p]);
  const clusters=clusterKmeans(pts,k);
  if(mode==='geo')return clusters;
  const centers=clusters.map(cl=>cl.length?{lat:cl.reduce((s,r)=>s+r.lat,0)/cl.length,lng:cl.reduce((s,r)=>s+r.lng,0)/cl.length}:{lat:0,lng:0});
  const weightFn=mode==='items'?(p=>(p.veg||0)+(p.porc||0)+(p.pf||0)+(p.carne||0)||1):(p=>1);
  return rebalance(clusters,pts,centers,weightFn);
}
function rebalance(clusters,pts,centers,weightFn){
  const k=clusters.length,target=pts.reduce((s,p)=>s+weightFn(p),0)/k;
  for(let pass=0;pass<20;pass++){let moved=false;for(let i=0;i<k;i++){const wi=clusters[i].reduce((s,p)=>s+weightFn(p),0);if(wi<=target*1.1)continue;clusters[i].forEach((p,pi)=>{if(moved)return;let bestJ=-1,bestD=Infinity;for(let j=0;j<k;j++){if(j===i)continue;const wj=clusters[j].reduce((s,p2)=>s+weightFn(p2),0);if(wj>=target*0.9)continue;const d=(p.lat-centers[j].lat)**2+(p.lng-centers[j].lng)**2;if(d<bestD){bestD=d;bestJ=j;}}if(bestJ>=0){clusters[bestJ].push(...clusters[i].splice(pi,1));moved=true;}});}if(!moved)break;}
  return clusters;
}

// ─── 2-opt: elimina cruzamentos entre segmentos ───────────────────────────────
function twoOpt(stops,depot){
  if(stops.length<=2)return stops;
  const path=depot?[depot,...stops]:[...stops];const s0=depot?1:0;
  let improved=true,iters=0;
  while(improved&&iters++<500){improved=false;for(let i=s0;i<path.length-2;i++){for(let j=i+2;j<path.length;j++){const db=haverDist(path[i],path[i+1])+(j<path.length-1?haverDist(path[j],path[j+1]):0);const da=haverDist(path[i],path[j])+(j<path.length-1?haverDist(path[i+1],path[j+1]):0);if(da<db-1e-8){let lo=i+1,hi=j;while(lo<hi){[path[lo],path[hi]]=[path[hi],path[lo]];lo++;hi--;}improved=true;}}}}
  return depot?path.slice(1):path;
}

// ─── Or-opt: realoca paradas individuais para posições melhores ───────────────
function orOpt(stops,depot){
  if(stops.length<=2)return stops;
  const path=depot?[depot,...stops]:[...stops];const s0=depot?1:0;
  let improved=true,iters=0;
  while(improved&&iters++<300){improved=false;outer:for(let i=s0;i<path.length;i++){const node=path[i],prev=i>0?path[i-1]:null,next=i<path.length-1?path[i+1]:null;const rem=(prev?haverDist(prev,node):0)+(next?haverDist(node,next):0)-(prev&&next?haverDist(prev,next):0);for(let j=s0-1;j<path.length;j++){if(j===i||j===i-1)continue;const bef=j>=0?path[j]:null,aft=j<path.length-1?path[j+1]:null;if(aft===node)continue;const ins=(bef&&bef!==node?haverDist(bef,node):0)+(aft&&aft!==node?haverDist(node,aft):0)-(bef&&aft&&bef!==node&&aft!==node?haverDist(bef,aft):0);if(ins-rem<-1e-8){path.splice(i,1);path.splice(j<i?j+1:j,0,node);improved=true;break outer;}}}}
  return depot?path.slice(1):path;
}

// ─── buildRoute: NN multi-start → 2-opt → or-opt ─────────────────────────────
function buildRoute(stops,depot){
  if(!stops.length)return[];if(stops.length===1)return stops;
  const maxS=Math.min(stops.length,12),step=Math.ceil(stops.length/maxS);
  let best=null,bestD=Infinity;
  const starts=depot?[-1]:Array.from({length:maxS},(_,i)=>i*step);
  for(const si of starts){const unv=[...stops],route=[];let cur=si===-1?depot:unv.splice(si,1)[0];if(si!==-1)route.push(cur);while(unv.length){let m=Infinity,idx=0;unv.forEach((s,i)=>{const d=haverDist(cur,s);if(d<m){m=d;idx=i;}});cur=unv.splice(idx,1)[0];route.push(cur);}const d=pathDist(route,depot);if(d<bestD){bestD=d;best=route;}}
  best=twoOpt(best,depot);
  best=orOpt(best,depot);
  return best;
}

// ─── Inter-route: move paradas entre clusters se geometricamente faz sentido ──
function interRouteOpt(clusters,depot){
  if(clusters.length<=1)return clusters;
  const avg=cl=>cl.length?{lat:cl.reduce((s,p)=>s+p.lat,0)/cl.length,lng:cl.reduce((s,p)=>s+p.lng,0)/cl.length}:null;
  let improved=true,iters=0;
  while(improved&&iters++<50){improved=false;for(let i=0;i<clusters.length&&!improved;i++){if(clusters[i].length<=1)continue;for(let pi=0;pi<clusters[i].length&&!improved;pi++){const p=clusters[i][pi];const centI=avg(clusters[i].filter((_,k)=>k!==pi));if(!centI)continue;const dToI=haverDist(p,centI);for(let j=0;j<clusters.length&&!improved;j++){if(j===i)continue;const centJ=avg(clusters[j]);if(!centJ)continue;if(haverDist(p,centJ)<dToI*0.85){clusters[i].splice(pi,1);clusters[j].push(p);improved=true;}}}}}
  return clusters;
}
