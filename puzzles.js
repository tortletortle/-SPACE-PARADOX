// V2.6: seeded playable paradox challenges, with phase-aware mission search.
// Local jump witnesses certify a restricted control policy, not arbitrary human play.
(()=>{
'use strict';
const CH=10,H3=ROOM_HEIGHT,round=x=>Math.round(x*1e6)/1e6;
const ruleset={exp:-1,hand:-1,grav:-1};
const config=[{rooms:3,count:3,rise:.12},{rooms:4,count:4,rise:.14},{rooms:5,count:5,rise:.16}];
const labels=['入门','进阶','挑战'];
let chosenSeed=2026,chosenTier=1,sealed=false;
const active=()=>level?.campaign===CH&&!!level.puzzle;
const chapter={title:'悖论织机',brief:'种子决定房间排列、相位门和信标阶梯。捷径未必能满足核心条件；先点亮信标，然后取得核心并归还。',clue:'观察拓扑图，进入印记房间，先从地面沿平台跳至最高台，站稳后按 F。调整自己的尺度、镜像和重力后去 E，最后在 D 归还。',rules:ruleset,theme:'violet'};
chapters.push(chapter);try{const p=JSON.parse(localStorage.getItem('space-paradox-v05-progress')||'[]');if(Array.isArray(p)&&p.includes(CH))completed.add(CH);}catch(e){}
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function shuffle(arr,rand){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function phase(s,e,rev=false){return {exp:s.exp+(rev?-e[2]:e[2]),hand:s.hand*e[3],grav:s.grav*e[4]};}
function same(s,p){return s.exp===p.exp&&s.hand===p.hand&&s.grav===p.grav;}
function graphSolve(p,from={room:'A',exp:0,hand:1,grav:1},hasSeal=false,hasCore=false){
 const start={room:from.room,exp:from.exp,hand:from.hand,grav:from.grav,seal:!!hasSeal,core:!!hasCore},key=s=>[s.room,s.exp,s.hand,s.grav,+s.seal,+s.core].join('/');
 const q=[{s:start,parent:-1,via:null}],seen=new Set([key(start)]);
 for(let i=0;i<q.length;i++){const {s}=q[i];if(s.room==='D'&&s.core){const path=[];for(let j=i;j>=0;j=q[j].parent)path.push({...q[j].s,via:q[j].via});return {path:path.reverse(),visited:seen.size};}
  const next=[];if(!s.seal&&s.room===p.beacon&&same(s,p.phase))next.push([{...s,seal:true},'seal']);
  if(s.room==='E'&&s.seal&&!s.core&&s.exp<=-1&&s.hand===-1&&s.grav===-1)next.push([{...s,core:true},'collect']);
  for(const e of p.edges){for(const rev of [false,true]){const a=e[rev?1:0],b=e[rev?0:1];if(a[0]!==s.room)continue;const t=phase(s,e,rev),k=rev?-e[2]:e[2];if(t.exp<MIN_EXP||t.exp>MAX_EXP||bodyRadius*2**s.exp>.86*Math.min(1,2**(-k))+1e-9||bodyHalfHeight(s.exp)*2>2.58||bodyHalfHeight(t.exp)*2>2.58)continue;next.push([{...s,...t,room:b[0]},a]);}}
  for(const [v,via] of next){const k=key(v);if(seen.has(k))continue;seen.add(k);q.push({s:v,parent:i,via});}
 }
 return {path:null,visited:seen.size};
}
function architecture(room,p,tier,rand){
 const n=config[tier].count,scale=2**p.exp,g=p.grav,side=rand()<.5?-1:1,baseX=4+side*1.9;
 // Alternate tiny lateral offsets, keeping the central door corridor unobstructed.
 const zig=rand()<.5?0:.10*scale;let attempts=0;
 for(const riseFactor of [1,.85,.70])for(const runFactor of [1,.9,.8]){
   attempts++;const run=(.94+tier*.08)*scale*runFactor,rise=config[tier].rise*scale*riseFactor,w=.64*scale+.12,d=.60*scale+.10,h=.12;
   const ps=Array.from({length:n},(_,i)=>({room,x:round(baseX+side*(i%2)*zig),z:round(6.5-i*run),y:round(g===1?.20*scale+i*rise:H3-.20*scale-i*rise),w,d,h,kind:'woven-stair',index:i}));
   if(ps.some(a=>a.y-a.h/2<.02||a.y+a.h/2>H3-.02||a.z-a.d/2<.3||a.z+a.d/2>7.7||a.x-a.w/2<.3||a.x+a.w/2>7.7))continue;
   if(ps.some((a,i)=>ps.slice(i+1).some(b=>Math.abs(a.x-b.x)<(a.w+b.w)/2-.00001&&Math.abs(a.y-b.y)<(a.h+b.h)/2-.00001&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.00001)))continue;
   const floor={room,x:ps[0].x,z:round(ps[0].z+run),y:g===1?-.06:H3+.06,w:.12,d:.12,h:.12};
   const geom=[floor,...ps],witnesses=[];for(let i=0;i<n;i++){const w=window.templateLab.witness(geom,i,i+1,p.exp,g);if(!w)break;witnesses.push({from:i-1,to:i,...w});}
   if(witnesses.length===n)return {platforms:ps,floor:{x:floor.x,z:floor.z},witnesses,attempts,run,rise};
 }
 return null;
}
function generate(seed,tier=1){
 if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isInteger(tier)||tier<0||tier>=config.length)throw Error('种子或难度参数非法');
 const rand=rng(seed^((tier+1)*0x9e3779b9)),m=config[tier].rooms,order=shuffle(['F','G','H','I','J'].slice(0,m),rand),route=['A',...order,'E'];
 const effects=shuffle([[-1,1,1],[0,-1,1],[0,1,-1],...Array.from({length:route.length-4},()=>[0,1,1])],rand),edges=[];
 let s={exp:0,hand:1,grav:1};const phases={A:{...s}};
 for(let i=0;i<route.length-1;i++){const e=[route[i]+'N',route[i+1]+'S',...effects[i]];edges.push(e);s=phase(s,e);phases[route[i+1]]={...s};}
 edges.push(['EN','DS',0,1,1],['AE','EW',0,1,1]); // tempting wrong-phase shortcut
 const beacon=order[Math.floor(rand()*order.length)],p=phases[beacon],building=architecture(beacon,p,tier,rand);
 if(!building)throw Error('有限建筑搜索无解；请更换种子');
 const rs={},names={A:'织机序厅',E:'相位核心',D:'回收星港',F:'雾光廊',G:'折影厅',H:'星环廊',I:'镜海厅',J:'暮星廊'},colors=[[64,94,132],[109,78,137],[78,119,127],[124,98,73],[68,86,128]];
 for(const id of ['A',...order,'E','D'])rs[id]=shape(id,id===beacon?'信标 · '+names[id]:names[id],8,8,colors[Math.floor(rand()*colors.length)]);
 const puzzle={seed,tier,route,edges,beacon,phase:p,...building},result=graphSolve(puzzle);if(!result.path)throw Error('相位图无解');
 puzzle.minimumActions=result.path.length; // edges + activation + collection + final return interaction
 return {seed,inversion:true,campaign:CH,rooms:rs,doors:edges.flatMap(e=>e.slice(0,2)),edges,ruleOverride:{...ruleset},hint:['AN',order[0]+'S'],puzzle};
}
const originalCampaign=campaignLevel;campaignLevel=function(i){return i===CH?generate(chosenSeed,chosenTier):originalCampaign(i);};
const oldReset=reset;reset=function(next=level||classicLevel){sealed=false;const out=oldReset(next);if(active()){chosenSeed=level.puzzle.seed;chosenTier=level.puzzle.tier;$('seed').value=String(chosenSeed);$('puzzleTier').value=String(chosenTier);}return out;};
const oldPlatforms=stairPlatforms;stairPlatforms=function(room=player.room){return active()&&room===level.puzzle.beacon?level.puzzle.platforms:oldPlatforms(room);};
function ready(){if(!active())return false;const p=level.puzzle,t=p.platforms.at(-1),foot=player.y-player.grav*bodyHalfHeight();return player.room===p.beacon&&same(player,p.phase)&&player.grounded&&Math.hypot(player.p[0]-t.x,player.p[1]-t.z)<.24*2**player.exp+.04&&Math.abs(foot-(t.y+player.grav*t.h/2))<.065;}
const oldInteract=interact;interact=function(){if(active()&&!won){const p=level.puzzle;if(player.room===p.beacon){if(sealed){notify('信标已经点亮。');return;}if(!ready()){notify('以正确相位站稳最高平台，再按 F。');return;}sealed=true;edits++;notify('星印已点亮 · 核心相位锁可验证。');update();return;}if(player.room==='E'&&!collected&&!sealed){notify('请先点亮信标。');update();return;}}return oldInteract();};$('interact').onclick=interact;
const oldUpdate=update;update=function(){oldUpdate();if(!active())return;const p=level.puzzle,sol=graphSolve(p,player,sealed,collected);$('challenge').textContent='织机 '+p.seed+' · '+labels[p.tier]+' · '+p.platforms.length+' 级';$('score').textContent=(Number(sealed)+Number(collected)+Number(won))+'/3';$('mission').textContent=won?'已完成':sol.path?'相位图有解':'未找到相位路线';$('reachable').textContent=won?'已完成':sol.path?'相位可达':'未找到';$('minActions').textContent=won?'0':sol.path?String(sol.path.length)+'（不含跳跃）':'—';$('analysisNote').textContent='相位图含信标、收集、归还；建筑入口到顶台有局部跳跃见证，不证明任意操作可通关。';$('chapterBrief').textContent='种子 '+p.seed+' · '+labels[p.tier]+'｜'+Object.keys(rooms).length+' 房间 / '+p.platforms.length+' 次局部跳跃。';if(clueVisible)$('route').textContent=sol.path?sol.path.map(s=>s.via==='seal'?'信标':s.via==='collect'?'取核心':s.room+' '+stateLabel(s)).join(' → '):'未找到';if(!collected)$('goalHint').textContent=sealed?'信标已点亮；以微缩、镜像、倒置相位进入 E。':'寻找 '+p.beacon+' 信标房，所需相位 '+stateLabel(p.phase)+'；从地面跳至最高台按 F。';};
// Add options to the existing seeded generator, not a new main screen.
const opts=document.createElement('div');opts.className='actions';opts.innerHTML='<label>织机难度 <select id="puzzleTier"><option value="0">入门</option><option value="1" selected>进阶</option><option value="2">挑战</option></select></label><button id="puzzleGenerate">生成织机谜题</button>'; $('generate').closest('.seedrow').after(opts);
function launch(seed,tier){const next=generate(seed,tier);chosenSeed=seed;chosenTier=tier;reset(next);return next;}
$('puzzleGenerate').onclick=()=>{try{if(!$('seed').value)throw Error('请输入种子');launch(Number($('seed').value),Number($('puzzleTier').value));}catch(e){notify('未生成：'+e.message);}};
const btn=document.createElement('button');btn.dataset.chapter=String(CH);btn.textContent='11 悖论织机';btn.onclick=()=>{try{reset(campaignLevel(CH));}catch(e){notify(e.message);}};$('chapters').insertBefore(btn,$('sandbox'));
// The marker is generated from the same top-platform data as the collision surfaces.
const oldRender=renderFrame;renderFrame=function(){oldRender();if(!active()||player.room!==level.puzzle.beacon||webglReady||!ctx)return;const t=level.puzzle.platforms.at(-1),g=player.grav,dx=t.x-player.p[0],dz=t.z-player.p[1],dir=[Math.cos(player.a),Math.sin(player.a)],right=[-dir[1]*player.hand,dir[0]*player.hand],d=dot([dx,dz],dir);if(d<.10)return;const x=W/2+dot([dx,dz],right)*projection/d;if(x<0||x>=W||d>depth[clamp(Math.floor(x),0,W-1)]+.15)return;const eye=clamp(1.4*2**player.exp,.12,2.68),y=H/2+(eye-(g===1?t.y+t.h/2:H3-t.y+t.h/2)*2.8/H3)*projection/d;ctx.save();ctx.fillStyle=sealed?'#71ffc6':'#ffcc84';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(sealed?'星印已点亮':'星印 · F',x,clamp(y-18,24,H-18));ctx.restore();};
// Portal collection calls this decorator for both local and recursively visible rooms.
function decorate(m){if(!active()||player.room!==level.puzzle.beacon)return m;const p=level.puzzle;for(const t of p.platforms){box(m.opaque,t.x,t.y,t.z,t.w,t.h,t.d,color3([92,119,154]));box(m.opaque,t.x,t.y+p.phase.grav*(t.h/2+.008),t.z,t.w*.90,.014,.025,color3([245,194,105]));}const t=p.platforms.at(-1),g=p.phase.grav;box(m.opaque,t.x,t.y+g*(t.h/2+.09),t.z,.12,.14,.12,color3(sealed?[112,255,191]:[255,203,105]));return m;}
Object.assign(window.lab,{campaignLevel,reset,update,interact,stairPlatforms});window.puzzleLab={generate,launch,graphSolve,ready,decorate,get sealed(){return sealed;}};
update();document.addEventListener('DOMContentLoaded',()=>{document.title='SPACE PARADOX V2.6 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 2.6 · 悖论织机';});
})();
