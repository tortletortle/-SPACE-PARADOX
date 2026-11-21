// V2.8: deterministic multi-seed robustness bench and relative-complexity seed recommendation.
(() => {
  'use strict';
  const puzzle = window.puzzleLab, topology = window.topologyLab, motion = window.templateLab;
  const $r = id => document.getElementById(id);
  if (!puzzle || !topology || !motion || !$r('topoReport')) return;

  const anchor = $r('topoReport').closest('.actions');
  if (!anchor) return;
  const panel = document.createElement('section');
  panel.id = 'robustnessPanel';
  panel.className = 'workshop v28';
  panel.innerHTML = [
    '<h3>种子筛选与稳健性验证 / ROBUSTNESS LAB</h3>',
    '<p>对固定难度进行可复现的多种子批量验证。检查拓扑可解性、最短动作一致性、平台跳跃见证与结构多样性；再从通过样本中推荐目标复杂度种子。</p>',
    '<div class="field"><label>种子起点<input id="v28Base" type="number" min="0" max="4294967295" step="1" value="20261121"></label><label>样本数量<select id="v28Count"><option value="16">16 组</option><option value="32" selected>32 组</option><option value="64">64 组</option></select></label><label>生成难度<select id="v28Tier"><option value="0">入门</option><option value="1" selected>进阶</option><option value="2">挑战</option></select></label><label>目标复杂度<select id="v28Target"><option value="easy">较易 · P20</option><option value="normal" selected>中等 · P50</option><option value="hard">较难 · P80</option></select></label></div>',
    '<div class="actions"><button class="primary" id="v28Run">运行批量验证</button><button id="v28Stop" disabled>停止</button><button id="v28Apply" disabled>应用推荐种子</button><button id="v28Export" disabled>导出 JSON</button></div>',
    '<div class="v28-progress"><span id="v28Progress"></span></div>',
    '<div class="v28-metrics" id="v28Metrics"><div><small>生成通过率</small><b id="v28Pass">—</b></div><div><small>图搜索可解率</small><b id="v28Solve">—</b></div><div><small>跳跃见证复核率</small><b id="v28Jump">—</b></div><div><small>拓扑结构数</small><b id="v28Diversity">—</b></div></div>',
    '<div class="v28-chart-wrap"><div class="v28-chart-title">当前批次复杂度分布 <small>批次内相对分位，不是玩家难度标定</small></div><div class="v28-chart" id="v28Chart"></div></div>',
    '<div class="v28-status" id="v28Status" role="status" aria-live="polite">等待运行。种子序列由起点和固定步长确定，可重复复核。</div>',
    '<pre class="v28-report" id="v28Report"></pre>'
  ].join('');
  anchor.after(panel);
  const css = document.createElement('style');
  css.textContent = [
    '#robustnessPanel{margin-top:12px;padding:12px;border:1px solid #35465f;border-radius:10px;background:linear-gradient(145deg,#111b2c,#101424 72%);box-shadow:inset 0 1px #ffffff08}',
    '#robustnessPanel h3{color:#9ce9f2;letter-spacing:.7px}',
    '#robustnessPanel .field{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '#robustnessPanel input,#robustnessPanel select{min-width:0;width:100%;background:#0b1424;border:1px solid #354966;color:#e7edf8;border-radius:6px;padding:8px}',
    '#robustnessPanel .actions{margin:8px 0}',
    '#robustnessPanel .actions button{flex:1 1 105px}',
    '#robustnessPanel .v28-progress{height:7px;background:#25334b;border-radius:9px;overflow:hidden;margin:10px 0}',
    '#robustnessPanel .v28-progress span{display:block;width:0;height:100%;background:linear-gradient(90deg,#65d9e9,#b4a2ff,#f2c77d);transition:width .12s}',
    '#robustnessPanel .v28-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:10px 0}',
    '#robustnessPanel .v28-metrics>div{min-width:0;padding:8px 5px;border:1px solid #33445e;border-radius:7px;background:#0b1422;text-align:center}',
    '#robustnessPanel .v28-metrics small{display:block;font-size:10px;color:#94a8bf;min-height:29px}',
    '#robustnessPanel .v28-metrics b{display:block;font:600 18px/1.2 ui-monospace,monospace;color:#eaf6ff;overflow-wrap:anywhere}',
    '#robustnessPanel .v28-chart-wrap{padding:9px;border:1px solid #2d3e57;border-radius:8px;background:#0a1220}',
    '#robustnessPanel .v28-chart-title{font-size:12px;color:#e2eafa;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}',
    '#robustnessPanel .v28-chart-title small{font-size:10px;color:#8ea4bb}',
    '#robustnessPanel .v28-chart{height:78px;display:flex;align-items:end;gap:7px;padding:7px 2px 0}',
    '#robustnessPanel .v28-bar{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:end;height:100%;gap:4px}',
    '#robustnessPanel .v28-bar i{display:block;width:100%;max-width:48px;min-height:2px;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#81e8ee,#7168bd)}',
    '#robustnessPanel .v28-bar small{font-size:9px;color:#9cb0c6}',
    '#robustnessPanel .v28-status{font-size:12px;color:#c5d7e7;margin:8px 0;overflow-wrap:anywhere}',
    '#robustnessPanel .v28-report{white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto;margin:7px 0 0;padding:8px;background:#080f1b;border:1px solid #26384f;border-radius:6px;color:#aebfd2;font:11px/1.6 ui-monospace,monospace}',
    '@media(max-width:480px){#robustnessPanel .v28-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#robustnessPanel .field{grid-template-columns:1fr 1fr}}'
  ].join('');
  document.head.append(css);

  let cancelled = false, running = false, latest = null, recommended = null;
  const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));
  const percentile = (values, q) => {
    if (!values.length) return NaN;
    const a = values.slice().sort((x, y) => x - y), p = (a.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
    return a[lo] + (a[hi] - a[lo]) * (p - lo);
  };
  function wilson(k, n) {
    if (!n) return null;
    const z=1.96,p=k/n,den=1+z*z/n,center=(p+z*z/(2*n))/den,margin=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
    return [Math.max(0,center-margin),Math.min(1,center+margin)];
  }
  function rank(values, value) {
    if (values.length < 2 || Math.max(...values) === Math.min(...values)) return .5;
    const sorted = values.slice().sort((a, b) => a - b);
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < value) lo = m + 1; else hi = m; }
    let end = lo; while (end < sorted.length && sorted[end] === value) end++;
    return ((lo + end - 1) / 2) / (sorted.length - 1);
  }
  function inspect(seed, tier) {
    const started = performance.now();
    try {
      const level = puzzle.generate(seed, tier), p = level.puzzle;
      if (!p || !Array.isArray(p.platforms) || !Array.isArray(p.edges) || !p.phase || !p.floor) throw Error('生成结果缺少必需字段');
      const solution = topology.solve(p);
      const endpointList = p.edges.flatMap(e => [e[0], e[1]]);
      const endpointsUnique = new Set(endpointList).size === endpointList.length;
      const knownRooms = new Set(Object.keys(level.rooms || {}));
      const doorsValid = endpointList.every(id => typeof id === 'string' && /^[A-Z][NESW]$/.test(id) && knownRooms.has(id[0]) && level.doors.includes(id));
      const routeValid = Array.isArray(p.route) && p.route[0] === 'A' && p.route.at(-1) === 'E' && new Set(p.route).size === p.route.length && p.route.every(id => knownRooms.has(id));
      const phaseValid = Number.isInteger(p.phase.exp) && p.phase.exp >= MIN_EXP && p.phase.exp <= MAX_EXP && [-1,1].includes(p.phase.hand) && [-1,1].includes(p.phase.grav);
      const transformsValid = p.edges.every(e => e.length === 5 && [-1, 0, 1].includes(e[2]) && [-1, 1].includes(e[3]) && [-1, 1].includes(e[4]));
      const geometryValid = p.platforms.length === [3,4,5][tier] && p.platforms.every(t => t.room === p.beacon && [t.x,t.y,t.z,t.w,t.d,t.h].every(Number.isFinite) && t.w > 0 && t.d > 0 && t.h > 0) && [p.floor.x,p.floor.z].every(Number.isFinite);
      const floor = {room:p.beacon,x:p.floor.x,z:p.floor.z,y:p.phase.grav===1?-.06:ROOM_HEIGHT+.06,w:.12,d:.12,h:.12};
      const geometry = [floor, ...p.platforms];
      const jumpChecks = p.platforms.map((_, i) => motion.witness(geometry, i, i + 1, p.phase.exp, p.phase.grav));
      const storedWitnessesValid = Array.isArray(p.witnesses) && p.witnesses.length === p.platforms.length && p.witnesses.every(w => w && Number.isFinite(w.time) && w.time > 0);
      const jumpCertified = jumpChecks.length === p.platforms.length && jumpChecks.every(w => w && Number.isFinite(w.time) && w.time > 0) && storedWitnessesValid;
      const actionCountMatches = solution.actions !== null && solution.actions === p.minimumActions;
      const solved = solution.actions !== null && solution.count > 0;
      const signature = topology.signature(p);
      const jumpTimes = jumpChecks.filter(Boolean).map(w => w.time);
      const row = {
        seed, tier, generated:true, solved, jumpCertified, endpointsUnique, doorsValid, routeValid, phaseValid, transformsValid, geometryValid, actionCountMatches,
        actions:solution.actions, shortestCount:solution.count, visited:solution.visited,
        platforms:p.platforms.length, maxJumpTime:jumpTimes.length?Math.max(...jumpTimes):null,
        jumpTimeTotal:jumpTimes.reduce((a,b)=>a+b,0), searchAttempts:p.attempts, signature,
        elapsed:performance.now()-started, error:null
      };
      row.passed = row.solved && row.jumpCertified && row.endpointsUnique && row.doorsValid && row.routeValid && row.phaseValid && row.transformsValid && row.geometryValid && row.actionCountMatches;
      return row;
    } catch (error) {
      return {seed,tier,generated:false,solved:false,jumpCertified:false,passed:false,elapsed:performance.now()-started,error:String(error?.message||error)};
    }
  }
  function scoreRows(rows) {
    const valid = rows.filter(r => r.passed);
    if (!valid.length) return {valid, recommendation:null, buckets:[0,0,0,0,0]};
    const actions=valid.map(r=>r.actions), jumps=valid.map(r=>r.maxJumpTime), routes=valid.map(r=>Math.log2(Math.max(1,r.shortestCount)));
    for (const r of valid) {
      // A relative proxy: longer abstract solutions and jumps raise complexity;
      // more equally-short solutions reduce it. This is not player-study calibration.
      r.complexity = .55*rank(actions,r.actions)+.25*rank(jumps,r.maxJumpTime)+.20*(1-rank(routes,Math.log2(Math.max(1,r.shortestCount))));
    }
    const buckets=[0,0,0,0,0];
    for (const r of valid) buckets[Math.min(4,Math.floor(r.complexity*5))]++;
    const target={easy:.2,normal:.5,hard:.8}[$r('v28Target').value]??.5;
    const recommendation=valid.slice().sort((a,b)=>Math.abs(a.complexity-target)-Math.abs(b.complexity-target)||a.elapsed-b.elapsed||a.seed-b.seed)[0];
    return {valid,recommendation,buckets};
  }
  function render(rows, meta={}) {
    const generated=rows.filter(r=>r.generated),passed=rows.filter(r=>r.passed),solved=rows.filter(r=>r.solved),jump=rows.filter(r=>r.jumpCertified);
    const pct=(n,d)=>d?(100*n/d).toFixed(1)+'%':'—';
    $r('v28Pass').textContent=pct(passed.length,rows.length);
    $r('v28Solve').textContent=pct(solved.length,generated.length);
    $r('v28Jump').textContent=pct(jump.length,generated.length);
    $r('v28Diversity').textContent=String(new Set(passed.map(r=>r.signature)).size);
    const summary=scoreRows(rows);recommended=summary.recommendation;
    $r('v28Apply').disabled=!recommended;
    $r('v28Export').disabled=!rows.length;
    $r('v28Chart').innerHTML=summary.buckets.map((n,i)=>'<div class="v28-bar" title="'+n+' 组"><i style="height:'+Math.max(2,n/Math.max(1,passed.length)*62)+'px"></i><small>P'+(i*20)+'–'+((i+1)*20)+'</small></div>').join('');
    const times=generated.map(r=>r.elapsed);
    const signatures=new Set(passed.map(r=>r.signature)).size;
    const passCI=wilson(passed.length,rows.length),solveCI=wilson(solved.length,generated.length);
    const failureCounts={};
    const addFailure=k=>failureCounts[k]=(failureCounts[k]||0)+1;
    for(const r of rows.filter(x=>!x.passed)){
      if(!r.generated){addFailure('生成异常');continue;}
      if(!r.solved)addFailure('相位图不可解');
      if(!r.jumpCertified)addFailure('局部跳跃见证失败');
      if(!r.endpointsUnique)addFailure('门端点重复');
      if(!r.doorsValid)addFailure('门编号或房间引用错误');
      if(!r.routeValid)addFailure('路线房间引用错误');
      if(!r.phaseValid)addFailure('目标相位非法');
      if(!r.transformsValid)addFailure('空间变换参数非法');
      if(!r.geometryValid)addFailure('平台几何非法');
      if(!r.actionCountMatches)addFailure('最短动作数不一致');
    }
    const lines=[
      '批次：'+rows.length+' / '+(meta.requested??rows.length)+' · 难度：'+['入门','进阶','挑战'][meta.tier??0]+' · 起点种子：'+(meta.base??'—'),
      '生成成功：'+generated.length+'/'+rows.length+' · 完整门禁通过：'+passed.length+'/'+rows.length+' · Wilson 95% CI '+(passCI?Math.round(passCI[0]*1000)/10+'–'+Math.round(passCI[1]*1000)/10+'%':'—'),
      '抽象可解：'+solved.length+'/'+generated.length+' · Wilson 95% CI '+(solveCI?Math.round(solveCI[0]*1000)/10+'–'+Math.round(solveCI[1]*1000)/10+'%':'—')+' · 跳跃见证复核：'+jump.length+'/'+generated.length,
      '失败分类：'+(Object.keys(failureCounts).length?Object.entries(failureCounts).map(([k,v])=>k+' '+v).join(' / '):'本批次未观察到失败；不能据此证明所有种子都可靠。'),
      '拓扑骨架：'+signatures+' 种 · 生成耗时 P50/P95：'+(times.length?percentile(times,.5).toFixed(2)+' / '+percentile(times,.95).toFixed(2)+' ms':'—'),
      recommended?'推荐种子：'+recommended.seed+' · 相对复杂度 '+(recommended.complexity*100).toFixed(1)+' 分位 · 最短抽象动作 '+recommended.actions+' · 最短解数 '+recommended.shortestCount:'没有通过全部检查的候选种子。',
      '复杂度仅是本批次内的相对代理指标，不代表真人感知难度；跳跃见证只覆盖局部相邻平台，不证明任意操作都能通关。'
    ];
    const failures=rows.filter(r=>!r.passed).slice(0,8);
    if(failures.length)lines.push('失败样本：',...failures.map(r=>r.seed+' · '+(r.error||['图搜索='+r.solved,'跳跃='+r.jumpCertified,'门端点唯一='+r.endpointsUnique,'门编号='+r.doorsValid,'路线房间='+r.routeValid,'目标相位='+r.phaseValid,'变换='+r.transformsValid,'几何='+r.geometryValid,'动作数一致='+r.actionCountMatches].filter(x=>!x.endsWith('true')).join(' / '))));
    $r('v28Report').textContent=lines.join('\n');
    $r('v28Status').textContent=meta.cancelled?'已停止；以上为已完成样本。':meta.done?'验证完成：'+passed.length+'/'+rows.length+' 组通过全部门禁。':'已完成 '+rows.length+' 组。';
    $r('v28Progress').style.width=String(meta.progress??100)+'%';
    latest={version:'2.8',generatedAt:new Date().toISOString(),meta,summary:{requested:meta.requested??rows.length,completed:rows.length,passed:passed.length,generated:generated.length,solvable:solved.length,jumpCertified:jump.length,topologyDiversity:signatures,passWilson95:passCI,solveWilson95:solveCI,failureCounts},recommendation:recommended,records:rows};
  }
  async function runBatch() {
    if(running)return;
    const baseText=$r('v28Base').value.trim(),base=Number(baseText),count=Number($r('v28Count').value),tier=Number($r('v28Tier').value);
    if(!baseText||!Number.isInteger(base)||base<0||base>4294967295){$r('v28Status').textContent='种子起点必须是 0–4294967295 的整数。';return;}
    if(![16,32,64].includes(count)||![0,1,2].includes(tier)){ $r('v28Status').textContent='样本数或难度参数无效。';return; }
    running=true;cancelled=false;$r('v28Run').disabled=true;$r('v28Stop').disabled=false;$r('v28Apply').disabled=true;$r('v28Export').disabled=true;$r('v28Report').textContent='';$r('v28Status').textContent='正在生成并复核种子…';
    const rows=[];
    try {
      for(let i=0;i<count;i++){
        if(cancelled)break;
        const seed=(base+Math.imul(i,7919))>>>0;
        rows.push(inspect(seed,tier));
        render(rows,{requested:count,tier,base,progress:100*rows.length/count});
        await yieldFrame();
      }
      const stopped=cancelled;render(rows,{requested:count,tier,base,progress:100*rows.length/count,done:!stopped,cancelled:stopped});
    } catch(error) {
      $r('v28Status').textContent='验证中断：'+String(error?.message||error);
    } finally {
      running=false;$r('v28Run').disabled=false;$r('v28Stop').disabled=true;
    }
  }
  $r('v28Run').onclick=runBatch;
  $r('v28Target').addEventListener('change',()=>{if(latest?.records?.length)render(latest.records,latest.meta);});
  $r('v28Stop').onclick=()=>{cancelled=true;$r('v28Status').textContent='正在停止…';};
  $r('v28Apply').onclick=()=>{if(!recommended)return;$r('seed').value=String(recommended.seed);$r('v28Base').value=String(recommended.seed);$r('puzzleTier').value=String(recommended.tier);puzzle.launch(recommended.seed,recommended.tier);$r('v28Status').textContent='已应用推荐种子 '+recommended.seed+'。'};
  $r('v28Export').onclick=()=>{if(!latest)return;const blob=new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='space-paradox-v28-seed-report-'+Date.now()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const seedInput=$r('seed');if(seedInput&&Number.isInteger(Number(seedInput.value))){$r('v28Base').value=String(Number(seedInput.value));seedInput.addEventListener('change',()=>{$r('v28Base').value=seedInput.value;});}
  window.robustnessLab={inspect,scoreRows,runBatch,wilson,get latest(){return latest},get running(){return running},stop(){cancelled=true;}};
  document.title='SPACE PARADOX V2.8 / 空间悖论';const eyebrow=document.querySelector('header .eyebrow');if(eyebrow)eyebrow.textContent='SPACE PARADOX / 2.8 · 种子稳健性';
})();
