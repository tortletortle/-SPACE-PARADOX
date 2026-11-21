const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control':'no-store' });
    res.end(data);
  });
});

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport:{ width:1280, height:900 }, acceptDownloads:true });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:'+port+'/index.html', { waitUntil:'load', timeout:60000 });
    await page.waitForFunction(() => window.puzzleLab && window.topologyLab && window.templateLab && window.robustnessLab, { timeout:30000 });

    const report = await page.evaluate(() => {
      function legacySignature(p) {
        const ids=[...new Set(p.edges.flatMap(e=>[e[0][0],e[1][0]]))],fixed=['A','D','E',p.beacon],rest=ids.filter(id=>!fixed.includes(id));
        if(rest.length>5)throw Error('too many rooms');
        const edges=new Set(p.edges.map(e=>[e[0][0],e[1][0]].sort().join('')));let best=null;
        function perm(a,b){if(!b.length){const x=fixed.concat(a);let s='';for(let i=0;i<x.length;i++)for(let j=i+1;j<x.length;j++)s+=edges.has([x[i],x[j]].sort().join(''))?'1':'0';if(best===null||s<best)best=s;return;}b.forEach((id,i)=>perm(a.concat(id),b.filter((_,j)=>i!==j)));}
        perm([],rest);return ids.length+':'+best;
      }
      const failures=[],rows=[],signaturesByTier={},legacySignaturesByTier={};
      const signatureInvariants={rename:0,reverse:0,doorSideSensitivity:0,transformSensitivity:0,phaseSensitivity:0,routeSensitivity:0};
      const modes=['any','unique','multiple'],mutation=[];
      for(let tier=0;tier<3;tier++){
        const sigs=new Set(),legacySigs=new Set();
        for(let i=0;i<32;i++){
          const seed=(20261121+tier*1000003+i*7919)>>>0;
          try{
            const level=window.puzzleLab.generate(seed,tier),again=window.puzzleLab.generate(seed,tier),p=level.puzzle;
            const solved=window.topologyLab.solve(p),endpoints=p.edges.flatMap(e=>[e[0],e[1]]),rooms=new Set(Object.keys(level.rooms));
            const floor={room:p.beacon,x:p.floor.x,z:p.floor.z,y:p.phase.grav===1?-.06:ROOM_HEIGHT+.06,w:.12,d:.12,h:.12},geom=[floor,...p.platforms];
            const jumpChecks=p.platforms.map((_,j)=>window.templateLab.witness(geom,j,j+1,p.phase.exp,p.phase.grav));
            const signature=window.topologyLab.signature(p),legacy=legacySignature(p);
            const checks={
              deterministic:JSON.stringify(p)===JSON.stringify(again.puzzle),
              solvable:solved.actions!==null&&solved.count>0,
              actionCount:solved.actions===p.minimumActions,
              endpointsUnique:new Set(endpoints).size===endpoints.length,
              doorsValid:endpoints.every(id=>/^[A-Z][NESW]$/.test(id)&&rooms.has(id[0])&&level.doors.includes(id)),
              routeValid:Array.isArray(p.route)&&p.route[0]==='A'&&p.route.at(-1)==='E'&&new Set(p.route).size===p.route.length&&p.route.every(id=>rooms.has(id)),
              phaseValid:Number.isInteger(p.phase.exp)&&p.phase.exp>=MIN_EXP&&p.phase.exp<=MAX_EXP&&[-1,1].includes(p.phase.hand)&&[-1,1].includes(p.phase.grav),
              transformsValid:p.edges.every(e=>e.length===5&&[-1,0,1].includes(e[2])&&[-1,1].includes(e[3])&&[-1,1].includes(e[4])),
              geometryValid:p.platforms.length===[3,4,5][tier]&&p.platforms.every(t=>t.room===p.beacon&&[t.x,t.y,t.z,t.w,t.d,t.h].every(Number.isFinite)&&t.w>0&&t.d>0&&t.h>0),
              storedWitnesses:Array.isArray(p.witnesses)&&p.witnesses.length===p.platforms.length&&p.witnesses.every(w=>w&&Number.isFinite(w.time)&&w.time>0),
              jumpRecheck:jumpChecks.length===p.platforms.length&&jumpChecks.every(w=>w&&Number.isFinite(w.time)&&w.time>0)
            };
            // Canonicalization must ignore arbitrary labels for non-role rooms.
            const fixed=new Set(['A','D','E',p.beacon]),rest=[...new Set(p.edges.flatMap(e=>[e[0][0],e[1][0]]))].filter(id=>!fixed.has(id));
            if(rest.length>=2){
              const rename={[rest[0]]:rest[1],[rest[1]]:rest[0]},q=structuredClone(p);
              const swap=id=>rename[id[0]]?rename[id[0]]+id.slice(1):id;
              q.edges=q.edges.map(e=>[swap(e[0]),swap(e[1]),e[2],e[3],e[4]]);
              q.route=q.route.map(id=>rename[id]||id);
              checks.renameInvariant=window.topologyLab.signature(q)===signature;
            }else checks.renameInvariant=true;
            // The two directions of one physical portal encode reciprocal scale exponents.
            const reversed=structuredClone(p);const edge=reversed.edges[0];reversed.edges[0]=[edge[1],edge[0],-edge[2],edge[3],edge[4]];
            checks.reverseInvariant=window.topologyLab.signature(reversed)===signature;
            const sideChanged=structuredClone(p),side=sideChanged.edges[0][0];sideChanged.edges[0][0]=side[0]+({N:'E',E:'S',S:'W',W:'N'}[side[1]]);
            checks.doorSideSensitive=window.topologyLab.signature(sideChanged)!==signature;
            const transformChanged=structuredClone(p);transformChanged.edges[0][3]*=-1;
            checks.transformSensitive=window.topologyLab.signature(transformChanged)!==signature;
            const phaseChanged=structuredClone(p);phaseChanged.phase.grav*=-1;
            checks.phaseSensitive=window.topologyLab.signature(phaseChanged)!==signature;
            const routeChanged=structuredClone(p);[routeChanged.route[1],routeChanged.route[2]]=[routeChanged.route[2],routeChanged.route[1]];
            checks.routeSensitive=window.topologyLab.signature(routeChanged)!==signature;
            for(const [key,metric] of [['rename','renameInvariant'],['reverse','reverseInvariant'],['doorSideSensitivity','doorSideSensitive'],['transformSensitivity','transformSensitive'],['phaseSensitivity','phaseSensitive'],['routeSensitivity','routeSensitive']]){
              if(checks[metric])signatureInvariants[key]++;
            }
            const passed=Object.values(checks).every(Boolean);
            rows.push({tier,seed,passed,actions:solved.actions,shortestCount:solved.count,signature,legacySignature:legacy,checks});
            sigs.add(signature);legacySigs.add(legacy);
            if(!passed)failures.push({tier,seed,checks});
          }catch(error){rows.push({tier,seed,passed:false,error:String(error.message||error)});failures.push({tier,seed,error:String(error.message||error)});}
        }
        signaturesByTier[tier]=sigs.size;legacySignaturesByTier[tier]=legacySigs.size;
        for(let i=0;i<6;i++){
          const seed=(20261121+tier*1000003+i*7919)>>>0;
          for(const mode of modes){
            try{
              const result=window.topologyLab.enrich(seed,tier,mode),item={tier,seed,mode,found:!!result.found,tested:result.tested||0};
              if(result.found){
                const meta=result.level.puzzle.topology;
                item.signature=meta.signature;item.added=meta.added;item.actions=result.analysis.actions;item.shortestCount=result.analysis.count;
                item.modeValid=mode==='any'||(mode==='unique'?result.analysis.count===1:result.analysis.count>=2);
                item.differsFromBase=meta.signature!==window.topologyLab.signature(window.puzzleLab.generate(seed,tier).puzzle);
                if(!item.modeValid||!item.differsFromBase)failures.push({tier,seed,mode,error:'mutation mode/signature invariant failed',item});
              }
              mutation.push(item);
            }catch(error){mutation.push({tier,seed,mode,found:false,error:String(error.message||error)});}
          }
        }
      }
      const successful=mutation.filter(x=>x.found);
      return {
        total:rows.length,passed:rows.filter(x=>x.passed).length,failures,signaturesByTier,legacySignaturesByTier,signatureInvariants,
        mutation:{attempted:mutation.length,found:successful.length,distinctSignatures:new Set(successful.map(x=>x.signature)).size,
          byMode:Object.fromEntries(modes.map(mode=>[mode,mutation.filter(x=>x.mode===mode&&x.found).length])),
          samples:successful.slice(0,12)},
        panel:!!document.getElementById('robustnessPanel'),rows
      };
    });
    await page.setViewportSize({width:390,height:844});
    const panelLayout=await page.locator('#robustnessPanel').evaluate(el=>({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,viewport:innerWidth}));
    if(report.passed!==report.total)throw new Error('One or more deterministic puzzle seeds failed invariants.');
    if(!report.panel)throw new Error('V2.8 robustness panel did not mount.');
    if(panelLayout.scrollWidth>panelLayout.clientWidth+2)throw new Error('Robustness panel overflows its own mobile container.');
    if(pageErrors.length)throw new Error('Browser runtime errors: '+pageErrors.join(' | '));

    // Exercise the actual in-page benchmark, recommendation, and downloadable JSON report.
    await page.locator('#v28Count').selectOption('16');
    await page.locator('#v28Tier').selectOption('1');
    await page.locator('#v28Base').fill('20261121');
    await page.locator('#v28Run').click();
    await page.waitForFunction(()=>!window.robustnessLab.running,{timeout:60000});
    const uiState=await page.evaluate(()=>({records:window.robustnessLab.latest?.records?.length,passed:window.robustnessLab.latest?.summary?.passed,recommendation:window.robustnessLab.latest?.recommendation?.seed,status:document.getElementById('v28Status').textContent}));
    if(uiState.records!==16)throw new Error('In-page benchmark did not complete all 16 samples.');
    if(uiState.passed!==16)throw new Error('In-page benchmark did not pass all 16 samples.');
    if(!Number.isInteger(uiState.recommendation))throw new Error('In-page benchmark did not produce a recommended seed.');
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#v28Export').click()]);
    const downloadPath=await download.path();
    const exported=JSON.parse(fs.readFileSync(downloadPath,'utf8'));
    if(exported.version!=='2.8'||exported.records.length!==16)throw new Error('Exported JSON report is invalid.');
    await page.locator('#v28Apply').click();
    const applied=await page.locator('#seed').inputValue();
    if(applied!==String(uiState.recommendation))throw new Error('Recommended seed was not applied to the puzzle generator.');
    const final={total:report.total,passed:report.passed,failures:report.failures.length,
      legacySignaturesByTier:report.legacySignaturesByTier,semanticSignaturesByTier:report.signaturesByTier,
      signatureInvariants:report.signatureInvariants,mutation:report.mutation,panelLayout,uiState,
      export:{filename:download.suggestedFilename(),version:exported.version,records:exported.records.length},pageErrors};
    console.log('V2.9_TOPOLOGY_REPORT '+JSON.stringify(final,null,2));
  }catch(error){console.error(error.stack||error);process.exitCode=1;}
  finally{if(browser)await browser.close();server.close();}
})();
