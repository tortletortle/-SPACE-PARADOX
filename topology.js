// V2.9: semantic topology fingerprints plus seeded chord mutations and shortest-path counting.
(()=>{
'use strict';
const api=window.puzzleLab,cap=1000000;
const key=s=>[s.room,s.exp,s.hand,s.grav,+s.seal,+s.core].join('/');
function solve(p,from={room:'A',exp:0,hand:1,grav:1},seal=false,core=false){
 const start={room:from.room,exp:from.exp,hand:from.hand,grav:from.grav,seal:!!seal,core:!!core},k=key(start),nodes=new Map([[k,{s:start,d:0,n:1,parents:[]}]]),q=[k];let goal=-1,goals=[];
 for(let i=0;i<q.length;i++){const id=q[i],node=nodes.get(id),{s,d,n}=node;if(goal>=0&&d>goal)break;
  if(s.room==='D'&&s.core){goal=d;goals.push(id);continue;}if(goal>=0)continue;
  const next=[];if(!s.seal&&s.room===p.beacon&&['exp','hand','grav'].every(x=>s[x]===p.phase[x]))next.push([{...s,seal:true},'seal']);
  if(s.room==='E'&&s.seal&&!s.core&&s.exp<=-1&&s.hand===-1&&s.grav===-1)next.push([{...s,core:true},'collect']);
  for(const e of p.edges)for(const rev of [false,true]){const a=e[rev?1:0],b=e[rev?0:1],delta=rev?-e[2]:e[2],exp=s.exp+delta;if(a[0]!==s.room||exp<MIN_EXP||exp>MAX_EXP||bodyRadius*2**s.exp>.86*Math.min(1,2**(-delta))+1e-9||2*bodyHalfHeight(s.exp)>2.58||2*bodyHalfHeight(exp)>2.58)continue;next.push([{...s,room:b[0],exp,hand:s.hand*e[3],grav:s.grav*e[4]},a]);}
  for(const [v,via] of next){const id2=key(v);let t=nodes.get(id2);if(!t){t={s:v,d:d+1,n:0,parents:[]};nodes.set(id2,t);q.push(id2);}if(t.d===d+1){t.n=Math.min(cap,t.n+n);if(t.parents.length<2)t.parents.push({id,via});}}
 }
 const count=Math.min(cap,goals.reduce((n,id)=>n+nodes.get(id).n,0)),paths=[];
 function back(id,tail){if(paths.length>=2)return;const t=nodes.get(id);if(!t.parents.length){paths.push([{...t.s,via:null},...tail]);return;}for(const p of t.parents)back(p.id,[{...t.s,via:p.via},...tail]);}
 for(const id of goals)back(id,[]);
 return {actions:goal<0?null:goal+1,count,atLeast:count===cap,visited:nodes.size,paths};
}
// Exact canonical adjacency key for <=8 rooms, fixing A/D/E and the beacon.
// Door orientation and phase are deliberately ignored in this structural measure.
// V2.9: canonical semantic fingerprint. Room relabeling is ignored, but door sides,
// route order, directed scale transform, mirror/gravity transform and beacon phase are retained.
// Reversing an edge also reverses its scale exponent, matching the reciprocal portal mapping.
function signature(p){
 const ids=[...new Set(p.edges.flatMap(e=>[e[0][0],e[1][0]]))].sort();
 const fixed=['A','D','E',p.beacon];
 if(new Set(fixed).size!==4||fixed.some(id=>!ids.includes(id)))throw Error('invalid fixed room roles');
 const rest=ids.filter(id=>!fixed.includes(id));
 if(rest.length>5)throw Error('too many rooms');
 if(!Array.isArray(p.route)||!p.phase||!Number.isInteger(p.phase.exp)||![-1,1].includes(p.phase.hand)||![-1,1].includes(p.phase.grav))throw Error('invalid puzzle semantics');
 let best=null;
 function encode(order){
  const labels=new Map(order.map((id,i)=>[id,String(i).padStart(2,'0')]));
  const edgeKeys=p.edges.map(e=>{
   if(!Array.isArray(e)||e.length!==5||typeof e[0]!=='string'||typeof e[1]!=='string')throw Error('invalid portal edge');
   const [a,b,exp,hand,grav]=e;
   if(!labels.has(a[0])||!labels.has(b[0])||!/[NESW]/.test(a[1])||!/[NESW]/.test(b[1]))throw Error('invalid portal endpoint');
   const forward=labels.get(a[0])+a[1]+'>'+labels.get(b[0])+b[1]+':'+exp+','+hand+','+grav;
   const reverse=labels.get(b[0])+b[1]+'>'+labels.get(a[0])+a[1]+':'+(-exp)+','+hand+','+grav;
   return forward<reverse?forward:reverse;
  }).sort().join(';');
  const route=p.route.map(id=>labels.get(id)??'?').join(',');
  if(route.includes('?'))throw Error('route references unknown room');
  return 'v2|N'+ids.length+'|B'+labels.get(p.beacon)+'|P'+[p.phase.exp,p.phase.hand,p.phase.grav].join(',')+'|R'+route+'|E'+edgeKeys;
 }
 function perm(a,b){
  if(!b.length){const value=encode(fixed.concat(a));if(best===null||value<best)best=value;return;}
  for(let i=0;i<b.length;i++)perm(a.concat(b[i]),b.filter((_,j)=>j!==i));
 }
 perm([],rest);
 return best;
}
function enrich(seed,tier=1,mode='any',avoid=[]){
 if(!['any','unique','multiple'].includes(mode)||!Array.isArray(avoid)||avoid.length>128)throw Error('生成模式非法');const base=api.generate(seed,tier),p=base.puzzle,baseline=solve(p),oldSig=signature(p),blocked=new Set(avoid);let s=(seed^0x7f4a7c15^tier)>>>0;
 const rnd=n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n);};
 const ids=Object.keys(base.rooms).filter(r=>r!=='D'&&r!==p.beacon),seen=new Set(),pool=[];let tested=0;
 for(let attempt=0;attempt<160&&tested<48;attempt++){
  const edges=p.edges.map(e=>e.slice()),used=new Set(edges.flatMap(e=>e.slice(0,2))),pairs=new Set(edges.map(e=>[e[0][0],e[1][0]].sort().join(''))),added=1+rnd(2+(tier===2?1:0));
  for(let j=0;j<added;j++){const choices=[];for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){const x=ids[a],y=ids[b];if(pairs.has([x,y].sort().join('')))continue;for(const u of ['E','W'])for(const v of ['E','W'])if(!used.has(x+u)&&!used.has(y+v))choices.push([x+u,y+v]);}if(!choices.length)break;const [a,b]=choices[rnd(choices.length)];edges.push([a,b,rnd(3)-1,rnd(2)?1:-1,rnd(2)?1:-1]);used.add(a);used.add(b);pairs.add([a[0],b[0]].sort().join(''));}
  if(edges.length===p.edges.length)continue;const fingerprint=JSON.stringify(edges.slice(p.edges.length).sort());if(seen.has(fingerprint))continue;seen.add(fingerprint);tested++;
  const candidate={...p,edges},sig=signature(candidate);if(sig===oldSig||blocked.has(sig))continue;const res=solve(candidate);if(!res.count||res.actions<Math.max(6,baseline.actions-2)||mode==='unique'&&res.count!==1||mode==='multiple'&&res.count<2)continue;pool.push({candidate,sig,res});
 }
 if(!pool.length)return {found:false,tested,baseline:baseline.actions};
 pool.sort((a,b)=>Math.abs(a.res.actions-baseline.actions)-Math.abs(b.res.actions-baseline.actions)||b.candidate.edges.length-a.candidate.edges.length||(mode==='unique'?0:Math.min(b.res.count,8)-Math.min(a.res.count,8)));
 const {candidate:c,sig,res}=pool[0];c.minimumActions=res.actions;c.topology={mode,signature:sig,added:c.edges.length-p.edges.length,tested,shortestCount:res.count,atLeast:res.atLeast};return {found:true,tested,eligible:pool.length,level:{...base,doors:c.edges.flatMap(e=>e.slice(0,2)),edges:c.edges,puzzle:c},analysis:res};
}
function launch(seed,tier,mode,avoid){const r=enrich(seed,tier,mode,avoid);if(r.found)reset(r.level);return r;}
// Extend existing generator controls; classic V2.6 generator remains unchanged.
const el=document.createElement('div');el.className='actions';el.innerHTML='<label>拓扑变体 <select id="topoMode"><option value="any">不限最短解数</option><option value="unique">唯一最短解</option><option value="multiple">多条最短解</option></select></label><button id="topoGenerate">生成支路谜题</button><span id="topoReport" role="status" style="font-size:12px;white-space:pre-line"></span>';$('puzzleGenerate').parentElement.after(el);
$('topoGenerate').onclick=()=>{try{if(!$('seed').value.trim())throw Error('请输入种子');const r=launch(Number($('seed').value),Number($('puzzleTier').value),$('topoMode').value);$('topoReport').textContent=r.found?'候选 '+r.tested+' · 新支路 '+r.level.puzzle.topology.added+' · 最短动作 '+r.analysis.actions+' · 最短解 '+r.analysis.count:'有限搜索未找到符合条件的方案，原关卡不变。';}catch(e){$('topoReport').textContent='未执行：'+e.message;}};
const oldUpdate=update;update=function(){oldUpdate();if(level?.puzzle?.topology){const t=level.puzzle.topology;$('challenge').textContent+=' · '+t.added+' 支路';$('analysisNote').textContent+=' 初始最短抽象动作序列 '+(t.atLeast?'≥':'')+t.shortestCount+' 条（不含步行和跳跃差异）。';}};window.lab.update=update;
window.topologyLab={solve,signature,enrich,launch};document.addEventListener('DOMContentLoaded',()=>{document.title='SPACE PARADOX V2.7 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 2.7 · 拓扑织造';});
})();
