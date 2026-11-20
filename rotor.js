// V1.5: a four-detent topology rotor; the two paths commute in phase space.
(() => {
  'use strict';
  const CH=6, H=ROOM_HEIGHT;
  const fixed=[['BN','BW',-1,1,1],['BE','EW',0,-1,-1],['CN','CS',0,-1,-1],['CE','EN',-1,1,1],['ES','DN',0,1,1]];
  const choices=[null,['AN','BS',0,1,1],null,['AN','CW',0,1,1]];
  const labels=['00 · 星门关闭','01 · 琥珀缩放廊','02 · 星门关闭','03 · 蓝晶镜廊'];
  const chapter={title:'旋转星门',brief:'在中央星环按 F 旋转空间连接。两条路线都能改变你的尺度、镜像和重力；找到其中一种办法，将核心带回归还大厅。',clue:'星环转一格接通 B，转三格接通 C。在 B 从北门进循环可缩小；在 C 从北门进循环可镜像倒置。各自的东门补全剩余的相位。',rules:{exp:-1,hand:-1,grav:-1},theme:'violet',names:{A:'星环枢纽',B:'琥珀缩放廊',C:'蓝晶镜廊',D:'归还大厅',E:'双相核心'},edges:fixed};
  let detent=0;
  const active=()=>level?.campaign===CH;
  chapters.push(chapter);
  try{const p=JSON.parse(localStorage.getItem('space-paradox-v05-progress')||'[]');if(Array.isArray(p)&&p.includes(CH))completed.add(CH);}catch(e){}
  const oldLevel=campaignLevel;
  campaignLevel=function(i){if(i!==CH)return oldLevel(i);const r=structuredClone(baseRooms),colors={A:[63,80,113],B:[154,120,75],C:[77,117,170],D:[79,111,133],E:[118,81,154]};for(const id of Object.keys(r)){r[id].name=chapter.names[id];r[id].color=colors[id];}for(const id of ['A','B','C'])r[id].w=r[id].h=8;r.E.w=r.E.h=7;return {seed:null,inversion:true,campaign:i,rooms:r,doors:[...new Set([...fixed,...choices.filter(Boolean)].flatMap(e=>e.slice(0,2)))],edges:fixed,hint:['AN','BS'],ruleOverride:chapter.rules};};
  // The four detents are discrete, never an in-flight partial connection.
  function rotate(){if(!active()||won||player.room!=='A'||Math.hypot(player.p[0]-4,player.p[1]-4)>1.45||!player.grounded)return false;
    const next=(detent+1)%4,dest=choices[next];if(dest&&(!doors[dest[0]]||!doors[dest[1]]))return false;
    disconnect('AN');if(dest)connect(...dest);detent=next;edits++;notify('星环旋转 90° · '+labels[detent]);update();return true;}
  // Search the actual detent-dependent bidirectional graph. Rotating is an action, not a teleport.
  function solve(from,already=false,d=detent){const root={room:from.room,exp:from.exp,hand:from.hand,grav:from.grav,phase:d,core:!!already};const key=s=>[s.room,s.exp,s.hand,s.grav,s.phase,+s.core].join('/');const visited=new Set([key(root)]),q=[[root]];
    for(let i=0;i<q.length;i++){const path=q[i],s=path.at(-1);if(s.room==='D'&&s.core)return path;const next=[];if(s.room==='A')next.push({...s,phase:(s.phase+1)%4,via:'rotate'});
      if(s.room==='E'&&!s.core&&s.exp<=-1&&s.hand===-1&&s.grav===-1)next.push({...s,core:true,via:'collect'});
      for(const e of [...fixed,...(choices[s.phase]?[choices[s.phase]]:[])]){const [a,b,x,h,g]=e;for(const [src,dst,k] of [[a,b,x],[b,a,-x]]){if(src[0]!==s.room||s.exp+k<MIN_EXP||s.exp+k>MAX_EXP||bodyRadius*2**s.exp>.86*Math.min(1,2**(-k))+1e-9)continue;next.push({...s,room:dst[0],exp:s.exp+k,hand:s.hand*h,grav:s.grav*g,via:src});}}
      for(const n of next){const k=key(n);if(!visited.has(k)){visited.add(k);q.push([...path,n]);}}}
    return null;}
  const oldReset=reset;reset=function(next){detent=0;return oldReset(next);};
  const oldUpdate=update;update=function(){oldUpdate();if(!active())return;const path=solve(player,collected);$('challenge').textContent='星环 · '+labels[detent];$('mission').textContent=won?'已完成':path?'可解（含旋转）':'不可达';$('reachable').textContent=path?'是':'否';$('minActions').textContent=won?'0':path?String(path.length):'不可达';$('analysisNote').textContent='搜索包含星环档位、穿门、缩放、镜像、重力、收集及归还，不计步行。';if(clueVisible)$('route').textContent=path?path.map(s=>s.via==='rotate'?'旋转':s.via==='collect'?'取核心':s.room+' '+stateLabel(s)).join(' → '):'不可达';
    if(!won&&!collected)$('goalHint').textContent=player.room==='A'?'靠近中央星环按 F，北门会随星环改变连接。':player.room==='B'?'琥珀循环改变尺度；东门通向核心。':player.room==='C'?'蓝晶循环反转镜像与重力；东门通向核心。':'核心需要 ≤ 0.5×、镜像、倒置。';};
  const oldInteract=interact;interact=function(){if(active()&&!won&&player.room==='A'){if(!rotate())notify('靠近星环中央、站稳后按 F 旋转。');return;}return oldInteract();};$('interact').onclick=interact;
  const button=document.createElement('button');button.dataset.chapter=String(CH);button.textContent='07 旋转星门';button.onclick=()=>reset(campaignLevel(CH));$('chapters').insertBefore(button,$('sandbox'));
  // One shared ring layout, projected in WebGL or compatibility mode. No blocking visual-only walls.
  function ringFaces(r,y,width,n=32){const result=[],p=(a,rad)=>[4+Math.cos(a)*rad,y,4+Math.sin(a)*rad];for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;result.push([p(a,r-width/2),p(b,r-width/2),p(b,r+width/2),p(a,r+width/2)]);}return result;}
  function geometry(){const faces=[],color=[83,104,137],lit=detent===1?[255,197,104]:detent===3?[123,193,255]:[158,156,195];for(const y of [.025,H-.12])for(const f of ringFaces(1.35,y,.16))faces.push({f,c:color});for(const f of ringFaces(1.03,.032,.038))faces.push({f,c:lit});const a=-Math.PI/2+detent*Math.PI/2,p=(d,w)=>[4+Math.cos(a)*d-Math.sin(a)*w,.044,4+Math.sin(a)*d+Math.cos(a)*w];faces.push({f:[p(.15,-.07),p(1.10,-.07),p(1.10,.07),p(.15,.07)],c:lit});faces.push({f:[p(1.12,-.16),p(1.42,0),p(1.12,.16),p(1.12,-.16)],c:lit});return faces;}
  const oldBuild=buildRoomMeshes;buildRoomMeshes=function(){const m=oldBuild();if(active()&&player.room==='A'){for(const {f,c} of geometry())quad(m.opaque,...f,color3(c),normalOf(f[0],f[1],f[2]));}return m;};
  const oldLegacy=renderLegacy;renderLegacy=function(){oldLegacy();if(!active()||player.room!=='A')return;const f=[Math.cos(player.a),Math.sin(player.a)],right=[-f[1]*player.hand,f[0]*player.hand],g=player.grav,eye=clamp(1.4*2**player.exp,.12,2.68);function project(p){const dx=p[0]-player.p[0],dz=p[2]-player.p[1],d=dx*f[0]+dz*f[1];if(d<.12)return null;return [W/2+(dx*right[0]+dz*right[1])*projection/d,H/2+(eye-(g===1?p[1]:H-p[1])*2.8/H)*projection/d,d];}
    const faces=[];for(const {f,c} of geometry()){const v=f.map(project);if(v.some(p=>!p))continue;const d=v.reduce((s,p)=>s+p[2],0)/4,x=v.reduce((s,p)=>s+p[0],0)/4;if(x<0||x>=W||d>depth[clamp(Math.floor(x),0,W-1)]+.1)continue;faces.push({v,c,d});}ctx.save();for(const {v,c} of faces.sort((a,b)=>b.d-a.d)){ctx.beginPath();v.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle='rgb('+c.join(',')+')';ctx.fill();}const p=project([4,1.25,4]);if(p&&p[0]>=0&&p[0]<W&&p[2]<depth[clamp(Math.floor(p[0]),0,W-1)]+.1){ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillStyle='#f3cd89';ctx.fillText(labels[detent],p[0],p[1]);ctx.font='12px system-ui';ctx.fillText('F · 旋转星环',p[0],p[1]+20);}ctx.restore();};
  Object.assign(window.lab,{campaignLevel,reset,update,interact});window.rotorLab={rotate,solve,geometry,get detent(){return detent}};
  reset(campaignLevel(CH));document.addEventListener('DOMContentLoaded',()=>{document.title='SPACE PARADOX V1.5 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 1.5 · 旋转星门';});
})();
