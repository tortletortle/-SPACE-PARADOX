// V1.6 — foldable causeway: the same platform definitions drive collision and both renderers.
(() => {
  'use strict';
  const CH=7,H=ROOM_HEIGHT, center=[5,8.5];
  const steps=[{x:5,z:7.2,top:.30},{x:5,z:6.2,top:.60},{x:5,z:5.2,top:.90},{x:5,z:4.2,top:1.20}];
  const landing={x:5,z:3.2,top:1.50};
  const chapter={title:'折叠天桥',brief:'在南端机关展开天桥。沿悬浮石阶登上星印平台，激活后从北门进入核心密室。',clue:'A 北门进入 B。靠近金色圆环，站稳按 F 展开四阶桥面。逐阶跳到最北端的高台并按 F；从高台走下，再通过 B 北门进入 E。取核心后走 E 南门返回 D。',rules:{exp:-1,hand:-1,grav:-1},theme:'violet',names:{A:'星空前庭',B:'折叠天桥',C:'静默档案',D:'归还大厅',E:'星印核心'},edges:[['AN','BS',0,1,1],['BN','EW',-1,-1,-1],['ES','DN',0,1,1]]};
  let open=false,sealed=false;
  const active=()=>level?.campaign===CH;
  chapters.push(chapter);
  try{const p=JSON.parse(localStorage.getItem('space-paradox-v05-progress')||'[]');if(Array.isArray(p)&&p.includes(CH))completed.add(CH);}catch(e){}
  const oldLevel=campaignLevel;
  campaignLevel=function(i){if(i!==CH)return oldLevel(i);const r=structuredClone(baseRooms);for(const id of Object.keys(r)){r[id].name=chapter.names[id];r[id].color=[66,83,120];}r.B.w=r.B.h=10;r.E.w=r.E.h=7;return {seed:null,inversion:true,campaign:i,rooms:r,doors:chapter.edges.flatMap(e=>e.slice(0,2)),edges:chapter.edges,hint:['AN','BS'],ruleOverride:chapter.rules};};
  const oldPlatforms=stairPlatforms;
  function platforms(room=player.room){if(!active()||room!=='B')return oldPlatforms(room);return [...(open?steps:[]),landing].map((p,i)=>({x:p.x,z:p.z,w:1.8,d:.82,h:.12,y:p.top-.06,kind:'causeway',index:i}));}
  stairPlatforms=platforms;
  function atConsole(){return player.room==='B'&&player.grav===1&&player.grounded&&Math.abs(player.y-bodyHalfHeight())<.07&&Math.hypot(player.p[0]-center[0],player.p[1]-center[1])<.8;}
  function atSeal(){return player.room==='B'&&player.grav===1&&player.grounded&&Math.hypot(player.p[0]-landing.x,player.p[1]-landing.z)<.40&&Math.abs(player.y-bodyHalfHeight()-landing.top)<.075;}
  function toggle(){if(!active()||won||!atConsole())return false;open=!open;edits++;notify(open?'天桥已展开 · 四阶桥面碰撞已启用':'天桥已收起 · 桥面碰撞已移除');update();return true;}
  const oldReset=reset;reset=function(next){open=false;sealed=false;return oldReset(next);};
  const oldInteract=interact;interact=function(){if(active()&&!won){if(player.room==='B'){if(atConsole()){toggle();return;}if(atSeal()){if(!open){notify('请先展开天桥。');return;}sealed=true;notify('高台星印已激活');update();return;}notify('在南端机关或最高台中央站稳后按 F。');return;}if(player.room==='E'&&!collected&&!sealed){notify('核心锁定 · 先激活天桥高台星印');update();return;}}return oldInteract();};$('interact').onclick=interact;
  const oldUpdate=update;update=function(){oldUpdate();if(!active())return;$('challenge').textContent='天桥 · '+(open?'展开':'收起');$('score').textContent=(Number(sealed)+Number(collected)+Number(won))+'/3';$('mission').textContent=won?'已完成':sealed?'星印已激活':'需实体平台验证';$('minActions').textContent=won?'0':'不含跳跃与机关';$('analysisNote').textContent='拓扑分析不包含桥面与跳跃，必须实际登上高台验证。';if(!collected)$('goalHint').textContent=sealed?'穿过 B 北门，在 E 中央取核心。':open?'逐阶跳上北端高台，站稳按 F。':'B 南端金色机关，站稳按 F 展开天桥。';};
  const button=document.createElement('button');button.dataset.chapter=String(CH);button.textContent='08 折叠天桥';button.onclick=()=>reset(campaignLevel(CH));$('chapters').insertBefore(button,$('sandbox'));
  // Art pass reuses the established gold/blue architectural concept. No decorative walkable surfaces.
  const oldBuild=buildRoomMeshes;
  buildRoomMeshes=function(){const m=oldBuild();if(!active()||player.room!=='B')return m;const out=m.opaque,gold=color3([249,190,100]),blue=color3([90,185,246]),lit=sealed?color3([104,250,173]):gold,stone=color3([87,100,129]);
    for(const p of platforms()){box(out,p.x,p.y,p.z,p.w,p.h,p.d,stone);box(out,p.x,p.y+.071,p.z-p.d*.42,p.w*.9,.02,.027,gold);}
    for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12,point=(t,r,y)=>[center[0]+Math.cos(t)*r,y,center[1]+Math.sin(t)*r];const f=[point(a,.58,.025),point(b,.58,.025),point(b,.65,.025),point(a,.65,.025)];quad(out,...f,open?blue:gold,[0,1,0]);}
    for(const x of [1.1,8.9])for(let z=1;z<10;z+=1.5){box(out,x,H-.16,z,.20,.20,.18,stone);box(out,x,H-.29,z,.07,.06,.08,blue);}
    const x=landing.x,z=landing.z,y=landing.top+.18;box(out,x,y,z,.20,.20,.20,lit);return m;};
  const oldLegacy=renderLegacy;renderLegacy=function(){oldLegacy();if(!active()||player.room!=='B')return;const f=[Math.cos(player.a),Math.sin(player.a)],right=[-f[1]*player.hand,f[0]*player.hand],eye=clamp(1.4*2**player.exp,.12,2.68);function project(x,y,z){const dx=x-player.p[0],dz=z-player.p[1],d=dx*f[0]+dz*f[1];if(d<.13)return null;const sx=W/2+(dx*right[0]+dz*right[1])*projection/d;if(sx<0||sx>=W||d>depth[clamp(Math.floor(sx),0,W-1)]+.1)return null;return [sx,H/2+(eye-y*2.8/H)*projection/d,d];}
    ctx.save();ctx.strokeStyle=open?'#65c6ff':'#ffce87';ctx.lineWidth=2;for(let i=0;i<40;i++){const a=i*Math.PI/20,b=(i+1)*Math.PI/20;const p=project(center[0]+Math.cos(a)*.62,.023,center[1]+Math.sin(a)*.62),q=project(center[0]+Math.cos(b)*.62,.023,center[1]+Math.sin(b)*.62);if(p&&q){ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}}for(const [x,y,z,label,c] of [[center[0],.12,center[1],open?'F · 收起':'F · 展开','#ffce87'],[landing.x,landing.top+.20,landing.z,sealed?'星印已激活':'高台星印',sealed?'#68faad':'#ffce87']]){const p=project(x,y,z);if(!p)continue;const a=clamp(projection*.13/p[2],5,25);p[1]=clamp(p[1],48+a,H-35-a);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p[0],p[1]-a);ctx.lineTo(p[0]+a,p[1]);ctx.lineTo(p[0],p[1]+a);ctx.lineTo(p[0]-a,p[1]);ctx.closePath();ctx.stroke();ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(label,p[0],p[1]-a-6);}ctx.restore();};
  Object.assign(window.lab,{campaignLevel,reset,update,interact,stairPlatforms});window.bridgeLab={toggle,atConsole,atSeal,platforms,get open(){return open},get sealed(){return sealed}};
  reset(campaignLevel(CH));document.addEventListener('DOMContentLoaded',()=>{document.title='SPACE PARADOX V1.6 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 1.6 · 折叠天桥';});
})();
