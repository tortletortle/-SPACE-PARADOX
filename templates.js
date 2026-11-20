// V2.3: parametric circular templates and bounded local jump witnesses.
(()=>{
'use strict';
const api=window.workshopLab,$t=id=>document.getElementById(id),err=m=>{throw Error(m)};
function generate(room,kind,count,x,y,z,radius,rise,w=.7,d=.7,h=.18,angle=0){
 if(!['spiral','ring'].includes(kind)||!Number.isInteger(count)||count<3||count>16||![x,y,z,radius,rise,w,d,h,angle].every(Number.isFinite)||radius<.4||radius>8||rise<0||rise>.6)err('模板参数非法');
 const ps=Array.from({length:count},(_,i)=>{const a=angle+i*2*Math.PI/count;return {room,x:x+Math.cos(a)*radius,y:y+(kind==='spiral'?i*rise:0),z:z+Math.sin(a)*radius,w,d,h};});
 return api.replacePlatforms(api.platforms.concat(ps));
}
// Work in gravity-aligned height; mirror the actual character collider and semi-implicit step.
// Witnesses are center-to-center, local only, without doors, crates, or sideways detours.
function witness(ps,a,b,exp=0,g=1){
 const scale=2**exp,half=bodyHalfHeight(exp),rad=bodyRadius3D(exp),dt=.01,speed=3.6*scale;
 const geom=ps.map(p=>({...p,y:g===1?p.y:ROOM_HEIGHT-p.y}));
 const src=geom[a],dst=geom[b];if(!src||!dst||a===b)return null;
 const start=src.y+src.h/2+half,target=dst.y+dst.h/2+half;
 const dx=dst.x-src.x,dz=dst.z-src.z,dist=Math.hypot(dx,dz),v=dist?[dx/dist,dz/dist]:[0,0];
 if(start+half>ROOM_HEIGHT+.001||target+half>ROOM_HEIGHT+.001||target-start>6.1**2/35*scale+.075||dist>speed*1.0+.01)return null;
 function clear(x,z,y){return !geom.some(p=>Math.abs(x-p.x)<p.w/2+rad-.00001&&Math.abs(z-p.z)<p.d/2+rad-.00001&&y+half>p.y-p.h/2+.012&&y-half<p.y+p.h/2-.012);}
 if(!clear(src.x,src.z,start)||!clear(dst.x,dst.z,target))return null;
 for(const delay of [0,5,10,15,20,25]){
  let x=src.x,z=src.z,y=start,vy=6.1*scale,done=0;
  for(let i=0;i<100;i++){
   if(i>=delay&&done<dist){let amount=Math.min(speed*dt,dist-done);for(const p of geom){if(!(y+half>p.y-p.h/2+.012&&y-half<p.y+p.h/2-.012))continue;const hit=rayAabbDistance([x,z],v,p.x-p.w/2-rad,p.x+p.w/2+rad,p.z-p.d/2-rad,p.z+p.d/2+rad);if(hit<=amount)amount=Math.max(0,hit-.02);}done+=amount;x=src.x+v[0]*done;z=src.z+v[1]*done;}
   vy-=17.5*scale*dt;const next=y+vy*dt;let support=null;
   const inside=p=>Math.abs(x-p.x)<=p.w/2+rad&&Math.abs(z-p.z)<=p.d/2+rad;
   if(vy<=0){if(y-half>=-.06&&next-half<=.06)support=0;for(const p of geom){const top=p.y+p.h/2;if(inside(p)&&y-half>=top-.06&&next-half<=top+.06&&(support===null||top>support))support=top;}
    if(support!==null){if(dist-done<=.012&&Math.abs(support-(target-half))<.00001)return {delay:delay*dt,time:(i+1)*dt};break;}y=next;
   }else{if(next+half>=ROOM_HEIGHT-.001){y=ROOM_HEIGHT-half;vy=0;}else{for(const p of geom){const bottom=p.y-p.h/2;if(inside(p)&&y+half<=bottom+.06&&next+half>=bottom-.06&&(support===null||bottom<support))support=bottom;}
    if(support!==null){y=support-half;vy=0;}else y=next;}}
  }
 }
 return null;
}
function analyze(room,start,exp=0,g=1){
 if(!/^[F-L]$/.test(room)||!rooms[room]||![-1,0,1].includes(exp)||![-1,1].includes(g))err('分析参数非法');
 const ids=api.platforms.map((p,i)=>({...p,id:i})).filter(p=>p.room===room);const root=ids.findIndex(p=>p.id===start);if(root<0)err('请选择起始平台');
 const first=ids[root],half=bodyHalfHeight(exp),rad=bodyRadius3D(exp),align=p=>g===1?p.y:ROOM_HEIGHT-p.y,base=align(first)+first.h/2;
 if(base+2*half>ROOM_HEIGHT+.001||ids.some(p=>Math.abs(p.x-first.x)<p.w/2+rad-.00001&&Math.abs(p.z-first.z)<p.d/2+rad-.00001&&base+2*half>align(p)-p.h/2+.012&&base<align(p)+p.h/2-.012))err('起点无法容纳所选尺度的角色');
 const reached=new Set([root]),queue=[root],edges=[];for(let k=0;k<queue.length;k++){let a=queue[k];for(let b=0;b<ids.length;b++){if(reached.has(b))continue;const path=witness(ids,a,b,exp,g);if(path){reached.add(b);queue.push(b);edges.push({from:ids[a].id,to:ids[b].id,...path});}}}
 return {total:ids.length,reached:[...reached].map(i=>ids[i].id),unreached:ids.filter((p,i)=>!reached.has(i)).map(p=>p.id),edges};
}
const el=document.createElement('section');el.id='templateEditor';el.style.cssText='margin:12px 0;padding:10px;border:1px solid var(--edge);border-radius:8px;background:#0a111f';el.innerHTML='<h4>建筑模板 · 跳跃检查</h4><p>以 X/Y/Z 为圆心与起始高度；平台宽、深、厚沿用上方输入。环形与螺旋由独立轴对齐平台构成。</p><div class="field"><label>模板<select id="teKind"><option value="spiral">螺旋阶梯</option><option value="ring">环形步道</option></select></label><label>数量<input id="teCount" type="number" min="3" max="16" value="8"></label><label>半径<input id="teRadius" type="number" step=".1" value="1.6"></label><label>每级升高<input id="teRise" type="number" step=".05" value=".15"></label></div><button id="teGenerate">生成模板</button><p>选择蓝图列表中的起点平台，检查同房间中心到中心的局部跳跃。</p><div class="field"><label>角色尺度<select id="teExp"><option value="0">1×</option><option value="-1">0.5×</option><option value="1">2×</option></select></label><label>重力<select id="teGrav"><option value="1">正向</option><option value="-1">倒置</option></select></label></div><button id="teAnalyze">分析跳跃路径</button><p id="teStatus" role="status"></p><p id="teReport" style="white-space:pre-line;overflow-wrap:anywhere" role="status"></p><small>未找到路线不代表不可达；不检查入口、传送门、箱子或完整关卡。</small>';
$t('groupEditor').after(el);const n=id=>$t(id).value.trim()===''?NaN:Number($t(id).value);
function run(fn){try{$t('teStatus').textContent=fn();}catch(e){$t('teStatus').textContent='未执行：'+e.message;}}
$t('teGenerate').onclick=()=>run(()=>{const ok=generate($t('bpRoom').value,$t('teKind').value,n('teCount'),n('bpX'),n('bpY'),n('bpZ'),n('teRadius'),n('teRise'),n('bpW'),n('bpD'),n('bpH'));return ok?'模板已生成 · 可一次撤销':'没有变化';});
$t('teAnalyze').onclick=()=>run(()=>{$t('teReport').textContent='';const r=analyze($t('bpRoom').value,n('bpPiece'),n('teExp'),n('teGrav'));$t('teReport').textContent='找到局部路线：'+r.reached.length+'/'+r.total+'\n平台：'+r.reached.map(i=>i+1).join('、')+'\n未找到：'+(r.unreached.map(i=>i+1).join('、')||'无')+'\n跳跃路线：'+(r.edges.map(e=>(e.from+1)+'→'+(e.to+1)).join('、')||'无');return '分析完成；不是整关验证';});
const oldUpdate=update;let fingerprint='';update=function(){oldUpdate();const k=JSON.stringify([level?.campaign,api.platforms,$t('bpRoom').value,$t('bpPiece').value]);if(k!==fingerprint){fingerprint=k;$t('teReport').textContent='';}};for(const id of ['bpRoom','bpPiece','teExp','teGrav'])$t(id).addEventListener('change',()=>{$t('teReport').textContent='';});window.lab.update=update;
window.templateLab={generate,analyze,witness};document.addEventListener('DOMContentLoaded',()=>{document.title='SPACE PARADOX V2.3 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 2.3 · 轨道建筑';});
})();
