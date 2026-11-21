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
    const page = await browser.newPage({ viewport:{ width:1280, height:900 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:'+port+'/index.html', { waitUntil:'load', timeout:60000 });
    await page.waitForFunction(() => window.puzzleLab && window.topologyLab && window.templateLab && window.robustnessLab, { timeout:30000 });

    const report = await page.evaluate(() => {
      const failures = [], rows = [], signaturesByTier = {};
      const modes = ['any','unique','multiple'];
      const mutation = [];
      for (let tier=0; tier<3; tier++) {
        const sigs = new Set();
        for (let i=0; i<32; i++) {
          const seed = (20261121 + tier*1000003 + i*7919) >>> 0;
          try {
            const level = window.puzzleLab.generate(seed, tier);
            const again = window.puzzleLab.generate(seed, tier);
            const p = level.puzzle;
            const solved = window.topologyLab.solve(p);
            const endpoints = p.edges.flatMap(e => [e[0],e[1]]);
            const rooms = new Set(Object.keys(level.rooms));
            const floor = {room:p.beacon,x:p.floor.x,z:p.floor.z,y:p.phase.grav===1?-.06:ROOM_HEIGHT+.06,w:.12,d:.12,h:.12};
            const geom = [floor,...p.platforms];
            const jumpChecks = p.platforms.map((_,j)=>window.templateLab.witness(geom,j,j+1,p.phase.exp,p.phase.grav));
            const checks = {
              deterministic: JSON.stringify(p)===JSON.stringify(again.puzzle),
              solvable: solved.actions!==null && solved.count>0,
              actionCount: solved.actions===p.minimumActions,
              endpointsUnique: new Set(endpoints).size===endpoints.length,
              doorsValid: endpoints.every(id=>/^[A-Z][NESW]$/.test(id)&&rooms.has(id[0])&&level.doors.includes(id)),
              routeValid: Array.isArray(p.route)&&p.route[0]==='A'&&p.route.at(-1)==='E'&&new Set(p.route).size===p.route.length&&p.route.every(id=>rooms.has(id)),
              phaseValid: Number.isInteger(p.phase.exp)&&p.phase.exp>=MIN_EXP&&p.phase.exp<=MAX_EXP&&[-1,1].includes(p.phase.hand)&&[-1,1].includes(p.phase.grav),
              transformsValid: p.edges.every(e=>e.length===5&&[-1,0,1].includes(e[2])&&[-1,1].includes(e[3])&&[-1,1].includes(e[4])),
              geometryValid: p.platforms.length===[3,4,5][tier]&&p.platforms.every(t=>t.room===p.beacon&&[t.x,t.y,t.z,t.w,t.d,t.h].every(Number.isFinite)&&t.w>0&&t.d>0&&t.h>0),
              storedWitnesses: Array.isArray(p.witnesses)&&p.witnesses.length===p.platforms.length&&p.witnesses.every(w=>w&&Number.isFinite(w.time)&&w.time>0),
              jumpRecheck: jumpChecks.length===p.platforms.length&&jumpChecks.every(w=>w&&Number.isFinite(w.time)&&w.time>0)
            };
            const passed = Object.values(checks).every(Boolean);
            rows.push({tier,seed,passed,actions:solved.actions,shortestCount:solved.count,signature:window.topologyLab.signature(p),checks});
            sigs.add(window.topologyLab.signature(p));
            if (!passed) failures.push({tier,seed,checks});
          } catch (error) {
            rows.push({tier,seed,passed:false,error:String(error.message||error)});
            failures.push({tier,seed,error:String(error.message||error)});
          }
        }
        signaturesByTier[tier] = sigs.size;
        for (let i=0; i<6; i++) {
          const seed=(20261121+tier*1000003+i*7919)>>>0;
          for (const mode of modes) {
            try {
              const result=window.topologyLab.enrich(seed,tier,mode);
              const item={tier,seed,mode,found:!!result.found,tested:result.tested||0};
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
      const successfulMutations=mutation.filter(x=>x.found);
      const distinctMutationSignatures=new Set(successfulMutations.map(x=>x.signature)).size;
      const panel=!!document.getElementById('robustnessPanel');
      return {
        total:rows.length,passed:rows.filter(x=>x.passed).length,failures,signaturesByTier,
        mutation:{attempted:mutation.length,found:successfulMutations.length,distinctSignatures:distinctMutationSignatures,
          byMode:Object.fromEntries(modes.map(mode=>[mode,mutation.filter(x=>x.mode===mode&&x.found).length])),
          samples:mutation.filter(x=>x.found).slice(0,12)},
        panel,rows
      };
    });
    await page.setViewportSize({width:390,height:844});
    const panelLayout = await page.locator('#robustnessPanel').evaluate(el => ({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,viewport:innerWidth}));
    const result = { ...report, panelLayout, pageErrors };
    console.log(JSON.stringify(result,null,2));
    if (report.passed !== report.total) throw new Error('One or more deterministic puzzle seeds failed invariants.');
    if (!report.panel) throw new Error('V2.8 robustness panel did not mount.');
    if (panelLayout.scrollWidth > panelLayout.clientWidth + 2) throw new Error('Robustness panel overflows its own mobile container.');
    if (pageErrors.length) throw new Error('Browser runtime errors: '+pageErrors.join(' | '));
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode=1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
