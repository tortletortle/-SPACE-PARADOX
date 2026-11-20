// SPACE PARADOX V1.0 — spatial art pass. All meshes are decorative.
(() => {
  'use strict';
  const stone = color3([48,57,76]), metal = color3([78,88,107]), gold = color3([255,191,96]);
  const originalBuild = buildRoomMeshes, originalLegacy = renderCapsulesLegacy;
  const bright = c => color3(c.map(v=>Math.min(255,v*1.25)));
  function wire(out,x,y,z,h,t,c){
    for(const a of [-h,h])for(const b of [-h,h]){
      box(out,x+a,y+b,z,t,t,2*h,c);box(out,x+a,y,z+b,t,2*h,t,c);box(out,x,y+a,z+b,2*h,t,t,c);
    }
  }
  function miniature(out,c){
    const [x,z]=c.p,y=c.y,h=shellHalf(c),col=c.id==='K1'?[190,142,255]:[83,232,255],light=bright(col);
    wire(out,x,y,z,h,h*.065,light);
    for(const a of [-1,1])for(const b of [-1,1])for(const d of [-1,1])box(out,x+a*h,y+b*h,z+d*h,h*.23,h*.23,h*.23,metal);
    box(out,x,y-h*.74,z,h*1.55,h*.15,h*1.5,stone);
    for(let i=0;i<5;i++)box(out,x-h*.59+i*h*.25,y-h*.6+i*h*.19,z+h*.22,h*.26,h*.13,h*.42,metal);
    for(const a of [-.55,.55])box(out,x+a*h,y-h*.08,z-h*.34,h*.13,h*1.1,h*.15,light);
    box(out,x,y+h*.53,z-h*.34,h*1.25,h*.11,h*.16,gold);
    wire(out,x+h*.24,y+h*.15,z-h*.08,h*.27,h*.025,gold);
  }
  capsuleMesh = function(out){
    for(const c of capsules)if(c.room===player.room)miniature(out,c);
    if(player.room==='G'){const r=rooms.G,y=player.grav===1?1.45:ROOM_HEIGHT-1.45;box(out,r.w/2,y,r.h/2,.58,.58,.58,color3(pocketUnlocked?[110,246,184]:[234,177,93]));}
  };
  buildRoomMeshes = function(){
    const m=originalBuild(),out=m.opaque,r=rooms[player.room],H=ROOM_HEIGHT,phase=performance.now()/1000;
    // Peripheral stone ribs, ceiling coffers, and thin amber inlays do not obstruct door apertures.
    for(const side of ['N','S','W','E']){
      const horizontal=side==='N'||side==='S',len=horizontal?r.w:r.h,coord=side==='N'||side==='W'?.065:(horizontal?r.h:r.w)-.065;
      const place=(a,y,w,h,d,col)=>horizontal?box(out,a,y,coord,w,h,d,col):box(out,coord,y,a,d,h,w,col);
      for(let a=.4;a<len-.2;a+=1.05){
        if(doors[player.room+side]&&Math.abs(a-len/2)<1.26)continue;
        place(a,H/2,.075,H,.10,stone);place(a,H*.78,.025,H*.26,.12,gold);
      }
      const id=player.room+side;
      if(!doors[id]||!links[id])continue;
      const pc=portalColor(id),light=bright(pc),half=halfDoorWidth(id),lo=player.grav===1?.08:H-2.58,hi=player.grav===1?2.58:H-.08,mid=(lo+hi)/2;
      for(const a of [-1,1]){place(len/2+a*(half+.18),mid,.20,hi-lo,.18,stone);place(len/2+a*(half+.1),mid,.045,hi-lo,.20,light);}
      place(len/2,hi+.04,half*2+.5,.10,.26,gold);
      // Animated iris motes confined to the actual doorway (not a fake recursive camera).
      for(let i=0;i<32;i++){const q=i*2.399963+phase*.58,rad=.18+.73*((i%9)/8),a=len/2+Math.cos(q)*half*.86*rad,y=mid+Math.sin(q)*(hi-lo)*.43*rad;place(a,y,.025+(i%3)*.012,.032,.022,light);}
    }
    for(let x=.45;x<r.w-.2;x+=1.8){box(out,x,H-.065,r.h/2,.09,.10,r.h,stone);box(out,x,H-.13,r.h/2,.025,.025,r.h*.7,gold);}
    for(let z=.4;z<r.h-.2;z+=1.6)box(out,r.w/2,.018,z,r.w*.94,.018,.035,metal);
    if(player.room==='B'||(level?.campaign===1&&player.room==='C')){
      const cx=r.w/2,cz=r.h/2,sign=player.grav===1?1:-1;
      for(let i=0;i<10;i++){const a=i*.72,rad=Math.min(r.w,r.h)*.23,x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad,y=sign===1?.18+i*.22:H-.18-i*.22;box(out,x,y+sign*.083,z-.27,.74,.023,.025,gold);}
    }
    for(const c of capsules)if(c.room===player.room){
      const [x,z]=c.p,y=c.y,h=shellHalf(c)*.98,t=.008,col=[.28,.62,1,.08];
      box(m.transparent,x,y,z-h,2*h,2*h,t,col);box(m.transparent,x,y,z+h,2*h,2*h,t,col);
      box(m.transparent,x-h,y,z,t,2*h,2*h,col);box(m.transparent,x+h,y,z,t,2*h,2*h,col);
    }
    return m;
  };
  // Compatibility mode keeps real positioning/occlusion and draws an inner architectural silhouette.
  renderCapsulesLegacy = function(){
    originalLegacy();
    const dir=[Math.cos(player.a),Math.sin(player.a)],right=[-dir[1]*player.hand,dir[0]*player.hand],eye=player.grav===1?player.y+bodyHalfHeight()*.92:ROOM_HEIGHT-player.y+bodyHalfHeight()*.92;
    for(const c of capsules){if(c.room!==player.room)continue;const delta=[c.p[0]-player.p[0],c.p[1]-player.p[1]],z=dot(delta,dir),sx=W/2+dot(delta,right)*projection/z;
      if(z<=.1||sx<0||sx>=W||z>depth[clamp(Math.floor(sx),0,W-1)]+.25)continue;
      const size=Math.min(W*.6,projection*shellHalf(c)*2/z),sy=H/2+(eye-(player.grav===1?c.y:ROOM_HEIGHT-c.y))*projection/z;if(size<12)continue;
      ctx.save();ctx.translate(sx,sy);ctx.scale(size,size);ctx.lineWidth=.018;ctx.fillStyle='#101a36';ctx.fillRect(-.43,-.43,.86,.86);ctx.strokeStyle='#75ddff';ctx.strokeRect(-.42,-.42,.84,.84);ctx.fillStyle='#526880';
      for(let i=0;i<5;i++)ctx.fillRect(-.34+i*.13,.3-i*.115,.24,.09);
      ctx.strokeStyle='#ffcf86';ctx.strokeRect(-.25,-.33,.28,.33);ctx.strokeStyle='#c8a2ff';ctx.strokeRect(.08,-.19,.16,.16);ctx.restore();
    }
  };
  const style=document.createElement('style');style.textContent=':root{--bg:#080b15;--panel:#101626;--edge:#333c55;--cyan:#82e5ff;--gold:#ffcc89}body{background:radial-gradient(ellipse at 60% 0%,#242443 0%,#080b15 65%)}.campaign{background:linear-gradient(125deg,#151c36,#171629 65%);border-color:#4d4562}.view{box-shadow:inset 0 0 28px #000}.view:after{box-shadow:inset 0 0 65px 3px #04071380}.eyebrow{letter-spacing:2px}.overlay .chip{background:#091125db;border-color:#52658a}.capsule{background:#171e37;border-color:#7065a4}.chapters button.active{background:#263d59;border-color:#89defe;color:#e2f7ff}.reticle{border-color:#fce0b8}.controls{background:#101727}';document.head.appendChild(style);
  document.title='SPACE PARADOX V1.0 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 1.0 · 宇宙建筑';
})();
