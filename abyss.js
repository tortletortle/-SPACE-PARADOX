// V1.9: gravity-side void and bounded checkpoint recovery. No arbitrary teleport between rooms.
(() => {
  'use strict';
  let falls=0;
  function recover(){
    if(!voidRoom())return false;
    const half=bodyHalfHeight();player.p=[5,9.78];player.y=player.grav===1?half:ROOM_HEIGHT-half;
    player.vy=0;player.grounded=true;player.a=-Math.PI/2;player.pitch=.16;jumpQueued=false;falls++;
    notify('星渊回收 · 已返回入口踏板，信标保留。');update();return true;
  }
  // Safe strip is rendered from its actual world coordinates, before raycast walls are drawn.
  function drawLanding(dir,right){
    const r=rooms[player.room],eye=(player.grav===1?player.y+bodyHalfHeight()*.92:ROOM_HEIGHT-player.y+bodyHalfHeight()*.92)*2.8/ROOM_HEIGHT;
    const poly=[[0,9.45],[r.w,9.45],[r.w,r.h],[0,r.h]].map(p=>{const d=[p[0]-player.p[0],p[1]-player.p[1]];return [dot(d,right),eye,dot(d,dir)];});
    const clipped=[];let a=poly.at(-1);for(const b of poly){if((a[2]>=.10)!==(b[2]>=.10)){const t=(.10-a[2])/(b[2]-a[2]);clipped.push(a.map((v,i)=>v+(b[i]-v)*t));}if(b[2]>=.10)clipped.push(b);a=b;}
    if(clipped.length<3)return;ctx.save();ctx.beginPath();clipped.forEach((p,i)=>{const x=W/2+p[0]*projection/p[2],y=H/2+p[1]*projection/p[2];if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle='#344967';ctx.fill();ctx.strokeStyle='#f4cc87';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  // A recovery counter is separate from crossings/edits. The checkpoint only resets local motion.
  const oldReset=reset;reset=function(next){falls=0;return oldReset(next);};
  const oldUpdate=update;update=function(){oldUpdate();if(level?.campaign!==9)return;$('challenge').textContent='星渊 · '+islandLab.beacons.length+'/2 信标 · 回收 '+falls+' 次';$('analysisNote').textContent='岛间无地面；落入虚空会返回本岛链入口，已激活信标保留。';};
  window.voidLab={recover,drawLanding,get falls(){return falls}};Object.assign(window.lab,{reset,update});
})();
