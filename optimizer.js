// V2.4: deterministic, bounded playability-constrained architecture search.
(()=>{
'use strict';
const api=window.workshopLab,sim=window.templateLab,$o=id=>document.getElementById(id);
const finite=x=>typeof x==='number'&&Number.isFinite(x),round=x=>Math.round(x*1e6)/1e6;
let pending=null;
function check(o){
 if(!o||!['spiral','ring'].includes(o.kind)||!/^[F-L]$/.test(o.room)||!rooms[o.room]||!Number.isInteger(o.count)||o.count<3||o.count>16||![-1,0,1].includes(o.exp)||![-1,1].includes(o.g)||![o.x,o.y,o.z,o.radius,o.rise,o.w,o.d,o.h].every(finite)||o.radius<.4||o.radius>8||o.rise<0||o.rise>.6||o.w<.3||o.w>5||o.d<.3||o.d>5||o.h<.12||o.h>.5)throw Error('模板或角色参数非法');
 if(o.kind==='ring')o.rise=0;
 return o;
}
function plan(o,radius,rise){return Array.from({length:o.count},(_,i)=>{const a=i*2*Math.PI/o.count;return {room:o.room,x:round(o.x+Math.cos(a)*radius),z:round(o.z+Math.sin(a)*radius),y:round(o.y+o.g*i*rise),w:o.w,d:o.d,h:o.h};});}
function candidates(o){const all=[];for(let dr=-3;dr<=3;dr++)for(let dh=-3;dh<=3;dh++){if(o.kind==='ring'&&dh!==0)continue;const radius=round(o.radius+dr*.15),rise=round(o.rise+dh*.05);if(radius<.4||radius>8||rise<0||rise>.6)continue;all.push({radius,rise,cost:dr*dr+dh*dh,dr,dh});}return all.sort((a,b)=>a.cost-b.cost||Math.abs(a.dh)-Math.abs(b.dh)||a.dr-b.dr||a.dh-b.dh);}
function assess(o,world,radius,rise,full=false){const pieces=plan(o,radius,rise),next=[...world.platforms,...pieces];let parsed;try{parsed=api.validate(JSON.stringify({...world,platforms:next}));}catch(e){return {valid:false,passed:0,edges:[],reason:e.message};}
 const geom=parsed.platforms.filter(p=>p.room===o.room),start=geom.length-pieces.length,required=o.count-(o.kind==='ring'?0:1),edges=[];let passed=0;
 for(let i=0;i<required;i++){const a=start+i,b=start+(i+1)%o.count,path=sim.witness(geom,a,b,o.exp,o.g);if(path){passed++;edges.push({from:i,to:(i+1)%o.count,...path});}else if(!full)break;}
 return {valid:true,passed,required,edges,pieces,complete:passed===required};
}
function search(options){pending=null;const o=check({...options}),raw=api.serialize(),world=JSON.parse(raw),required=o.count-(o.kind==='ring'?0:1);if(world.platforms.length+o.count>48)throw Error('超出 48 平台总上限');
 const baseline=assess(o,world,o.radius,o.rise,true);let tested=1,valid=+baseline.valid,best=baseline.complete?{radius:o.radius,rise:o.rise,...baseline}:null;
 if(!best)for(const c of candidates(o)){if(c.radius===o.radius&&c.rise===o.rise)continue;const a=assess(o,world,c.radius,c.rise);tested++;valid+=+a.valid;if(a.complete){best={radius:c.radius,rise:c.rise,...a};break;}}
 const result={found:!!best,required,baseline:{valid:baseline.valid,passed:baseline.passed,reason:baseline.reason||null},tested,valid,solution:best?{radius:best.radius,rise:best.rise,passed:best.passed,edges:best.edges,pieces:best.pieces}:null};
 if(best)pending={raw,next:world.platforms.concat(best.pieces)};return structuredClone(result);
}
function apply(){if(!pending)throw Error('请先搜索可行方案');const p=pending;pending=null;if(api.serialize()!==p.raw)throw Error('世界已改变，请重新搜索');return api.replacePlatforms(p.next);}
const el=document.createElement('div');el.id='optimizerPanel';el.innerHTML='<h4>可玩性约束生成</h4><p>沿用模板参数与角色相位，在半径 ±0.45、每级升高 ±0.15 的离散邻域寻找逐级可跳方案。环形要求闭环，倒置螺旋沿重力反方向升高。</p><div class="actions"><button id="optSearch">搜索可行建筑</button><button id="optApply" disabled>应用方案</button></div><p id="optReport" role="status" style="white-space:pre-line;overflow-wrap:anywhere"></p><small>固定 10ms 步长、平台中心跳跃；不保证入口可达或完整通关。</small>';$o('templateEditor').append(el);
const n=id=>$o(id).value.trim()===''?NaN:Number($o(id).value),read=()=>({room:$o('bpRoom').value,kind:$o('teKind').value,count:n('teCount'),x:n('bpX'),y:n('bpY'),z:n('bpZ'),w:n('bpW'),d:n('bpD'),h:n('bpH'),radius:n('teRadius'),rise:n('teRise'),exp:n('teExp'),g:n('teGrav')});
function invalidate(){pending=null;$o('optApply').disabled=true;$o('optReport').textContent='参数已改变，请重新搜索。';}
for(const id of ['bpRoom','teKind','teCount','bpX','bpY','bpZ','bpW','bpD','bpH','teRadius','teRise','teExp','teGrav']){$o(id).addEventListener('input',invalidate);$o(id).addEventListener('change',invalidate);}
$o('optSearch').onclick=()=>{try{const r=search(read());$o('optApply').disabled=!r.found;$o('optReport').textContent=['原方案：'+r.baseline.passed+'/'+r.required+' 条跳跃'+(r.baseline.valid?'':'（布局非法）'),'测试 '+r.tested+' 个候选，'+r.valid+' 个布局合法',r.found?'找到完整局部路线：'+r.solution.passed+'/'+r.required+'；半径 '+r.solution.radius+'，升高 '+r.solution.rise:'有限搜索未找到完整路线，未更改世界。'].join('\n');}catch(e){$o('optApply').disabled=true;$o('optReport').textContent='未执行：'+e.message;}};
$o('optApply').onclick=()=>{try{$o('optReport').textContent=apply()?'方案已应用 · 可一次撤销':'没有变化';}catch(e){$o('optReport').textContent='未执行：'+e.message;}finally{$o('optApply').disabled=true;}};
window.optimizerLab={search,apply};document.addEventListener('DOMContentLoaded',()=>{document.title='SPACE PARADOX V2.4 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 2.4 · 智能建筑';});
})();
