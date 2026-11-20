// V2.5: seeded evolutionary search versus equal-budget ordered search.
(()=>{
'use strict';
const api=window.workshopLab,sim=window.templateLab,$e=id=>document.getElementById(id),rnd=x=>Math.round(x*1e6)/1e6;
let pending=null;
function evaluate(o,world,dr,dh){
 const radius=rnd(o.radius+.15*dr),rise=o.kind==='ring'?0:rnd(o.rise+.05*dh),required=o.count-(o.kind==='ring'?0:1);
 const pieces=Array.from({length:o.count},(_,i)=>{const a=i*2*Math.PI/o.count;return {room:o.room,x:rnd(o.x+radius*Math.cos(a)),y:rnd(o.y+o.g*i*rise),z:rnd(o.z+radius*Math.sin(a)),w:o.w,h:o.h,d:o.d};});
 let checked;try{checked=api.validate(JSON.stringify({...world,platforms:world.platforms.concat(pieces)}));}catch(e){return {dr,dh,radius,rise,valid:false,passed:0,required,complete:false};}
 const geom=checked.platforms.filter(p=>p.room===o.room),start=geom.length-pieces.length,edges=[];
 for(let i=0;i<required;i++){const j=(i+1)%o.count,w=sim.witness(geom,start+i,start+j,o.exp,o.g);if(w)edges.push({from:i,to:j,...w});}
 const scale=2**o.exp,maxRise=6.1**2*scale/35,maxRun=3.6*scale*2*6.1/17.5;
 const loads=Array.from({length:required},(_,i)=>{const a=pieces[i],b=pieces[(i+1)%o.count];return Math.max(Math.hypot(b.x-a.x,b.z-a.z)/maxRun,Math.max(0,(b.y-a.y)*o.g)/maxRise);});
 const difficulty=rnd(loads.reduce((s,v)=>s+v,0)/loads.length),area=rnd((Math.max(...pieces.map(p=>p.x+p.w/2))-Math.min(...pieces.map(p=>p.x-p.w/2)))*(Math.max(...pieces.map(p=>p.z+p.d/2))-Math.min(...pieces.map(p=>p.z-p.d/2)))),compact=rnd(area/(world.rooms[o.room].w*world.rooms[o.room].h));
 return {dr,dh,radius,rise,valid:true,passed:edges.length,required,complete:edges.length===required,difficulty,area,compact,error:rnd(Math.abs(difficulty-o.target)),score:rnd(Math.abs(difficulty-o.target)+.20*compact),edges,pieces};
}
function search(options,method='evolution',seed=1,budget=16){
 const o={...options};if(!['spiral','ring'].includes(o.kind)||!/^[F-L]$/.test(o.room)||!rooms[o.room]||!Number.isInteger(o.count)||o.count<3||o.count>16||![-1,0,1].includes(o.exp)||![-1,1].includes(o.g)||![o.x,o.y,o.z,o.radius,o.rise,o.w,o.d,o.h,o.target].every(Number.isFinite)||o.target<0||o.target>1||o.radius<.4||o.radius>8||o.rise<0||o.rise>.6||!['ordered','evolution','exhaustive'].includes(method)||!Number.isInteger(seed)||!Number.isInteger(budget)||budget<1||budget>49)throw Error('搜索参数非法');
 if(o.kind==='ring')o.rise=0;const raw=api.serialize(),world=JSON.parse(raw);if(world.platforms.length+o.count>48)throw Error('超出平台总上限');
 const domain=[];for(let dr=-3;dr<=3;dr++)for(let dh=-3;dh<=3;dh++){if(o.kind==='ring'&&dh!==0)continue;const r=rnd(o.radius+.15*dr),h=rnd(o.rise+.05*dh);if(r>=.4&&r<=8&&h>=0&&h<=.6)domain.push({dr,dh});}
 const cost=c=>c.dr*c.dr+c.dh*c.dh;domain.sort((a,b)=>cost(a)-cost(b)||Math.abs(a.dh)-Math.abs(b.dh)||a.dr-b.dr||a.dh-b.dh);
 const seen=new Map(),key=c=>c.dr+','+c.dh,cap=method==='exhaustive'?domain.length:Math.min(budget,domain.length);
 const rank=(a,b)=>Number(b.complete)-Number(a.complete)||b.passed-a.passed||Number(b.valid)-Number(a.valid)||(a.score??100)-(b.score??100)||cost(a)-cost(b)||a.dr-b.dr||a.dh-b.dh;
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};const pick=a=>a[Math.floor(random()*a.length)];
 function add(c){if(c&&!seen.has(key(c)))seen.set(key(c),evaluate(o,world,c.dr,c.dh));}
 add(domain[0]);while(seen.size<cap){const rest=domain.filter(c=>!seen.has(key(c)));let child;
 if(method!=='evolution')child=rest[0];else if(seen.size<4||random()<.22)child=pick(rest);else{const elite=[...seen.values()].sort(rank).slice(0,Math.min(4,seen.size)),a=pick(elite),b=pick(elite),dr=(random()<.5?a.dr:b.dr)+Math.floor(random()*3)-1,dh=o.kind==='ring'?0:(random()<.5?a.dh:b.dh)+Math.floor(random()*3)-1;child=rest.find(c=>c.dr===dr&&c.dh===dh)||pick(rest);}
 add(child);}
 const all=[...seen.values()],feasible=all.filter(c=>c.complete).sort(rank),front=feasible.filter(a=>!feasible.some(b=>b.error<=a.error&&b.compact<=a.compact&&(b.error<a.error||b.compact<a.compact)));
 return {method,seed,tested:all.length,domain:domain.length,feasible:feasible.length,baseline:all[0],best:feasible[0]||null,front,raw};
}
function prepare(o,seed,budget){pending=null;const ev=search(o,'evolution',seed,budget),ordered=search(o,'ordered',seed,budget);if(ev.best)pending={raw:ev.raw,pieces:ev.best.pieces};return {evolution:ev,ordered};}
function apply(){if(!pending)throw Error('请先运行搜索');const p=pending;pending=null;if(api.serialize()!==p.raw)throw Error('世界已改变，请重新搜索');return api.replacePlatforms(JSON.parse(p.raw).platforms.concat(p.pieces));}
const el=document.createElement('div');el.id='evolutionPanel';el.innerHTML='<h4>难度定向 · 进化搜索</h4><p>难度代理量：水平跨度和升高占理论跳跃能力的比例，逐段取较大值再平均。目标误差与占用房间面积共同优化，非真人评分。</p><div class="field"><label>目标负荷<input id="evTarget" type="number" min="0" max="1" step=".05" value=".55"></label><label>候选预算<input id="evBudget" type="number" min="1" max="49" value="16"></label><label>随机种子<input id="evSeed" type="number" step="1" value="17"></label></div><div class="actions"><button id="evSearch">对照搜索</button><button id="evApply" disabled>应用进化方案</button></div><p id="evReport" role="status" style="white-space:pre-line;overflow-wrap:anywhere"></p><small>搜索仅检查相邻平台跳跃；不保证完整关卡、审美或全局最优。分数越低越好。</small>';$e('templateEditor').append(el);
const n=id=>$e(id).value.trim()===''?NaN:Number($e(id).value),read=()=>({room:$e('bpRoom').value,kind:$e('teKind').value,count:n('teCount'),x:n('bpX'),y:n('bpY'),z:n('bpZ'),w:n('bpW'),d:n('bpD'),h:n('bpH'),radius:n('teRadius'),rise:n('teRise'),exp:n('teExp'),g:n('teGrav'),target:n('evTarget')});
function invalidate(){pending=null;$e('evApply').disabled=true;$e('evReport').textContent='参数已改变，请重新搜索。';}
for(const id of ['bpRoom','bpX','bpY','bpZ','bpW','bpD','bpH','teKind','teCount','teRadius','teRise','teExp','teGrav','evTarget','evBudget','evSeed'])for(const event of ['input','change'])$e(id).addEventListener(event,invalidate);
const fmt=r=>r.method+'：'+r.feasible+'/'+r.tested+' 可行'+(r.best?'；负荷 '+r.best.difficulty.toFixed(3)+' / 占地 '+r.best.area.toFixed(2)+'；分数 '+r.best.score.toFixed(4):'；无方案');
$e('evSearch').onclick=()=>{try{const r=prepare(read(),n('evSeed'),n('evBudget'));$e('evApply').disabled=!r.evolution.best;$e('evReport').textContent=[fmt(r.evolution),fmt(r.ordered),'进化非支配方案：'+r.evolution.front.length,'两种方法使用相同候选域和预算。'].join('\n');}catch(e){$e('evApply').disabled=true;$e('evReport').textContent='未执行：'+e.message;}};
$e('evApply').onclick=()=>{try{$e('evReport').textContent=apply()?'已应用 · 可一次撤销':'没有变化';}catch(e){$e('evReport').textContent='未执行：'+e.message;}finally{$e('evApply').disabled=true;}};
window.evolutionLab={search,prepare,apply};document.addEventListener('DOMContentLoaded',()=>{document.title='SPACE PARADOX V2.5 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 2.5 · 进化建筑';});
})();
