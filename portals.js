// V1.3: frustum culling and local-space triangle rejection.
(() => {
  'use strict';
  const H3=ROOM_HEIGHT, MAX_DEPTH=2, MAX_VIEWS=6;
  const originalBuild=buildRoomMeshes;
  const baseBuild=()=>{const m=originalBuild();return window.puzzleLab?.decorate?window.puzzleLab.decorate(m):m;};
  const sub=(a,b)=>a.map((x,i)=>x-b[i]), sum=(a,b)=>a.map((x,i)=>x+b[i]), mul=(a,k)=>a.map(x=>x*k);
  const dp=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const identity={point:p=>p.slice(),normal:p=>p.slice()};
  // Map target geometry into the source coordinate chart: inverse of movement mapping.
  function inverse(id,grav,parent=identity){
    const a=doors[id],b=doors[links[id]],t=transforms[id],s=2**t.exp,g=grav*t.grav, ay=grav===1?0:H3,by=g===1?0:H3;
    function vector(v,k){const h=[v[0],v[2]],normal=-(h[0]*b.n[0]+h[1]*b.n[1])*k,tangent=-(h[0]*b.t[0]+h[1]*b.t[1])*t.hand*k;
      return [a.n[0]*normal+a.t[0]*tangent,v[1]*t.grav*k,a.n[1]*normal+a.t[1]*tangent];}
    return {point:p=>parent.point(sum([a.p[0],ay,a.p[1]],vector(sub(p,[b.p[0],by,b.p[1]]),1/s))),normal:n=>parent.normal(vector(n,1))};
  }
  function opening(id,grav,chart){const d=doors[id],h=half(id),lo=grav===1?0:H3-2.58,hi=grav===1?2.58:H3;
    const v=(u,y)=>chart.point([d.p[0]+d.t[0]*u,y,d.p[1]+d.t[1]*u]);return [v(-h,lo),v(h,lo),v(h,hi),v(-h,hi)];}
  function aperturePlanes(corners,eye,outward){const center=mul(corners.reduce(sum),.25),planes=[];
    for(let i=0;i<4;i++){let n=cross(sub(corners[i],eye),sub(corners[(i+1)%4],eye)),l=Math.hypot(...n);if(l<1e-9)return null;n=mul(n,1/l);if(dp(n,sub(center,eye))<0)n=mul(n,-1);planes.push({n,off:-dp(n,eye)});}
    planes.push({n:outward,off:-dp(outward,center)-.002});return planes;}
  function clip(poly,planes){for(const {n,off} of planes){if(!poly.length)break;const dst=[];let a=poly.at(-1),da=dp(n,a.slice(0,3))+off;for(const b of poly){const db=dp(n,b.slice(0,3))+off;if((da>=0)!==(db>=0)){const t=da/(da-db);dst.push(a.map((x,i)=>x+(b[i]-x)*t));}if(db>=0)dst.push(b);a=b;da=db;}poly=dst;}return poly;}
  // Pull clipping planes into the local chart. Reject triangles before allocating world vertices.
  function transformMesh(data,chart,planes,out){
    const o=chart.point([0,0,0]),ex=sub(chart.point([1,0,0]),o),ey=sub(chart.point([0,1,0]),o),ez=sub(chart.point([0,0,1]),o);
    const localPlanes=planes.map(({n,off})=>[dp(n,ex),dp(n,ey),dp(n,ez),dp(n,o)+off]);
    function vertex(j){return [...chart.point(data.slice(j,j+3)),...data.slice(j+3,j+7),...chart.normal(data.slice(j+7,j+10))];}
    const eps=1e-9;
    triangle:for(let i=0;i<data.length;i+=30){let intersect=false;for(const [a,b,c,d] of localPlanes){const p=a*data[i]+b*data[i+1]+c*data[i+2]+d,q=a*data[i+10]+b*data[i+11]+c*data[i+12]+d,r=a*data[i+20]+b*data[i+21]+c*data[i+22]+d;if(p < -eps&&q < -eps&&r < -eps){stats.rejected++;continue triangle;}if(Math.min(p,q,r)<eps)intersect=true;}
      const v=[vertex(i),vertex(i+10),vertex(i+20)],p=intersect?clip(v,planes):v;for(let k=1;k+1<p.length;k++)out.push(...p[0],...p[k],...p[k+1]);
    }
  }
  function frustumPlanes(aspect,eye){const g=player.grav||1,pitch=clamp(player.pitch??.16,-.78,.78),cp=Math.cos(pitch),center=[eye[0]+Math.cos(player.a)*cp,eye[1]-g*Math.sin(pitch),eye[2]+Math.sin(player.a)*cp],m=matMultiply(matPerspective(1.12,aspect,.04,90),matLookAt(eye,center,[0,g,0]));
    const row=i=>[m[i],m[i+4],m[i+8],m[i+12]],w=row(3),planes=[];for(let i=0;i<3;i++)for(const sign of [-1,1]){const p=sum(w,mul(row(i),sign)),l=Math.hypot(...p.slice(0,3));planes.push({n:p.slice(0,3).map(x=>x/l),off:p[3]/l});}return planes;
  }
  // Correct render aperture width; gameplay already uses half(id).
  halfDoorWidth=id=>doors[id]?half(id):.86;
  function architecture(mesh){const r=rooms[player.room],out=mesh.opaque,g=player.grav;
    const hi=g===1?H3-.19:.19,stone=color3([75,85,112]),gold=color3([238,183,91]);
    // Shallow ceiling ribs and decorative inverted arcade, kept outside the walking volume.
    for(const x of [.30,r.w-.30]){box(out,x,hi,r.h/2,.22,.18,r.h-.32,stone);box(out,x,hi-g*.12,r.h/2,.035,.022,r.h-.45,gold);}
    for(let z=.6;z<r.h-.4;z+=1.55){box(out,r.w/2,hi,z,r.w-.55,.10,.13,stone);box(out,r.w/2,hi-g*.075,z,r.w-.8,.022,.035,gold);}
    if(player.room==='E'||player.room==='F'||player.room==='G'){for(const x of [.5,r.w-.5])for(const z of [.5,r.h-.5]){box(out,x,hi-g*.18,z,.40,.22,.40,stone);box(out,x,hi-g*.34,z,.25,.12,.25,gold);}}
    // Unlinked doors are solid sealed gates rather than seeing into the void.
    for(const id of doorList){const d=doors[id];if(d.room!==player.room||links[id])continue;const h=half(id),lo=g===1?.08:H3-2.58,up=g===1?2.58:H3-.08;
      box(out,d.p[0]-d.n[0]*.028,(lo+up)/2,d.p[1]-d.n[1]*.028,d.n[0]?.052:2*h,up-lo,d.n[0]?2*h:.052,color3([38,49,70]));}
    return mesh;
  }
  function local(room,grav){const original=player;if(room===original.room&&grav===original.grav)return architecture(baseBuild());try{player={...original,room,grav};return architecture(baseBuild());}finally{player=original;}}
  let stats={views:0,triangles:0,depth:0,rejected:0,culledDoors:0,cacheHits:0};
  function collect(options={}){const root=player,eye=[root.p[0],clamp(root.y+root.grav*bodyHalfHeight()*.92,.04,H3-.04),root.p[1]],out=[],cache=new Map();stats={views:0,triangles:0,depth:0,rejected:0,culledDoors:0,cacheHits:0};
    if(options.rootMesh)cache.set(root.room+':'+root.grav,options.rootMesh.opaque);
    function walk(room,grav,chart,parentPlanes,remaining,incoming){for(const id of doorList){if(stats.views>=MAX_VIEWS)return;const d=doors[id],to=links[id];if(d.room!==room||id===incoming||!to)continue;
      const corners=opening(id,grav,chart),center=mul(corners.reduce(sum),.25),n=chart.normal([d.n[0],0,d.n[1]]);
      if(dp(n,sub(center,eye))<=.015)continue;
      if(parentPlanes.length&&!clip(corners,parentPlanes).length){stats.culledDoors++;continue;}
      const p=aperturePlanes(corners,eye,n);if(!p)continue;
      const planes=parentPlanes.concat(p),nextChart=inverse(id,grav,chart),ng=grav*transforms[id].grav,nr=doors[to].room,key=nr+':'+ng;
      if(!cache.has(key))cache.set(key,local(nr,ng).opaque);else stats.cacheHits++;
      transformMesh(cache.get(key),nextChart,planes,out);stats.views++;stats.depth=Math.max(stats.depth,MAX_DEPTH-remaining+1);
      if(remaining>1)walk(nr,ng,nextChart,planes,remaining-1,to);
      else { // Horizon cap at the recursion boundary, not an extra traversable room.
        for(const end of doorList){if(end===to||doors[end].room!==nr||!links[end])continue;const er=opening(end,ng,nextChart),c=[.12,.17,.29,1],nn=nextChart.normal([doors[end].n[0],0,doors[end].n[1]]),v=[];quad(v,...er,c,nn);transformMesh(v,identity,planes,out);}
      }
    }}
    walk(root.room,root.grav,identity,options.frustum?frustumPlanes(options.aspect||canvas.width/Math.max(1,canvas.height),eye):[],MAX_DEPTH,null);stats.triangles=out.length/30;return out;
  }
  buildRoomMeshes=function(){const m=architecture(baseBuild());if(webglReady){const remote=collect({frustum:true,rootMesh:m});for(let i=0;i<remote.length;i++)m.opaque.push(remote[i]);}return m;};
  window.portalLab={inverse,opening,aperturePlanes,clip,collect,frustumPlanes,get stats(){return {...stats}}};
  document.title='SPACE PARADOX V1.3 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 1.3 · 光域';
})();
