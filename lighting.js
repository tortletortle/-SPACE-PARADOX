// V1.1: procedural stone, local portal lights, and geometry in compatibility mode.
(() => {
  'use strict';
  const vertex = `attribute vec3 aPosition;attribute vec4 aColor;attribute vec3 aNormal;
  uniform mat4 uViewProjection,uView;varying vec4 vColor;varying vec3 vNormal,vWorld;varying float vDistance;
  void main(){vec4 p=vec4(aPosition,1.0);gl_Position=uViewProjection*p;vColor=aColor;vNormal=aNormal;vWorld=aPosition;vDistance=length((uView*p).xyz);}`;
  const fragment = `precision mediump float;varying vec4 vColor;varying vec3 vNormal,vWorld;varying float vDistance;
  uniform vec3 uEye;uniform vec4 uLamp[4];uniform vec3 uTint[4];
  void main(){vec3 n=normalize(vNormal),p=vWorld;vec3 a=abs(n);vec2 uv=a.y>.7?p.xz:(a.x>.7?p.zy:p.xy);
  vec2 cell=fract(uv*1.35);float seam=smoothstep(.012,.045,min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y)));
  float grain=.91+.09*sin(uv.x*47.+sin(uv.y*19.))*sin(uv.y*37.);
  float peak=max(vColor.r,max(vColor.g,vColor.b));float sat=peak-min(vColor.r,min(vColor.g,vColor.b));
  float emissive=smoothstep(.64,.94,peak)*smoothstep(.16,.38,sat);float stone=mix(grain*mix(.50,1.,seam),1.,emissive);
  vec3 base=vColor.rgb*stone;vec3 viewDir=normalize(uEye-p+vec3(.0001));
  vec3 lit=base*(.52+.34*max(dot(n,normalize(vec3(-.35,.82,.44))),0.));lit+=base*vec3(.13,.17,.29);
  for(int i=0;i<4;i++){vec3 d=uLamp[i].xyz-p;float r2=dot(d,d);vec3 l=d*inversesqrt(max(r2,.01));float att=uLamp[i].w/(1.+r2*1.65);float diffuse=max(dot(n,l),0.);vec3 h=normalize(l+viewDir+vec3(.0001));float spec=pow(max(dot(n,h),0.),24.);lit+=uTint[i]*att*(base*(.20+.80*diffuse)+.22*spec);}
  lit=mix(lit,vColor.rgb*1.18,emissive*.9);float fog=1.-exp(-.036*vDistance);lit=mix(lit,vec3(.035,.048,.105),fog*.65);
  gl_FragColor=vec4(clamp(lit,0.,1.),vColor.a);}`;
  function portalLights(){const r=rooms[player.room],y=player.grav===1?1.33:ROOM_HEIGHT-1.33,positions=[[r.w/2,y,.12],[r.w/2,y,r.h-.12],[.12,y,r.h/2],[r.w-.12,y,r.h/2]];let pos=[],tint=[];['N','S','W','E'].forEach((s,i)=>{const id=player.room+s,on=!!(doors[id]&&links[id]);pos.push(...positions[i],on?2.7:0);tint.push(...(on?portalColor(id).map(v=>v/255):[0,0,0]));});return {pos,tint};}
  if(webglReady){let vs,fs,program;try{vs=compileShader(gl.VERTEX_SHADER,vertex);fs=compileShader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const a={p:gl.getAttribLocation(program,'aPosition'),c:gl.getAttribLocation(program,'aColor'),n:gl.getAttribLocation(program,'aNormal')};const u={vp:gl.getUniformLocation(program,'uViewProjection'),view:gl.getUniformLocation(program,'uView'),eye:gl.getUniformLocation(program,'uEye'),lamp:gl.getUniformLocation(program,'uLamp[0]'),tint:gl.getUniformLocation(program,'uTint[0]')};
    if(Object.values(a).some(x=>x<0)||Object.values(u).some(x=>x===null))throw Error('Lighting shader interface incomplete');
    const previous=glProgram;glProgram=program;attribs=a;uniforms=u;gl.useProgram(program);gl.deleteProgram(previous);const originalDraw=drawMesh;drawMesh=function(data,transparent){const l=portalLights();gl.uniform4fv(uniforms.lamp,l.pos);gl.uniform3fv(uniforms.tint,l.tint);gl.uniform3f(uniforms.eye,player.p[0],clamp(player.y+player.grav*bodyHalfHeight()*.92,.04,ROOM_HEIGHT-.04),player.p[1]);return originalDraw(data,transparent);};
  }catch(e){if(program&&program!==glProgram)gl.deleteProgram(program);console.warn('V1.1 lighting fallback: '+e.message);}finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}}
  // The raycaster has no vertical geometry; project the actual collision platforms, not a background image.
  const originalLegacy=renderLegacy;
  function stairFaces(){const f=[Math.cos(player.a),Math.sin(player.a)],right=[-f[1]*player.hand,f[0]*player.hand],g=player.grav,eye=clamp(1.4*2**player.exp,.12,2.68),faces=[];
    function project(x,y,z){const dx=x-player.p[0],dz=z-player.p[1],d=dx*f[0]+dz*f[1];if(d<.10)return null;const ly=(g===1?y:ROOM_HEIGHT-y)*2.8/ROOM_HEIGHT;return [W/2+(dx*right[0]+dz*right[1])*projection/d,H/2+(eye-ly)*projection/d,d];}
    for(const s of stairPlatforms()){const v=[];for(const y of [-1,1])for(const z of [-1,1])for(const x of [-1,1])v.push(project(s.x+x*s.w/2,s.y+y*s.h/2,s.z+z*s.d/2));const defs=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];defs.forEach((indices,i)=>{const pts=indices.map(j=>v[j]);if(pts.some(x=>!x))return;const d=pts.reduce((n,x)=>n+x[2],0)/4;const col=i===0||i===1?'#7787a4':i<4?'#47546f':'#303d58';faces.push({pts,d,col});});}return faces.sort((a,b)=>b.d-a.d);}
  renderLegacy=function(){originalLegacy();ctx.save();for(const face of stairFaces()){ctx.beginPath();face.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=face.col;ctx.fill();ctx.strokeStyle='#e5b875';ctx.lineWidth=1;ctx.stroke();}const light=ctx.createRadialGradient(W*.5,H*.42,H*.12,W*.5,H*.42,W*.7);light.addColorStop(0,'#fff5e90a');light.addColorStop(.58,'#23345412');light.addColorStop(1,'#04071588');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);ctx.restore();};
  document.title='SPACE PARADOX V1.1 / 空间悖论';document.querySelector('header .eyebrow').textContent='SPACE PARADOX / 1.1 · 光与物质';
})();
