(() => {
  const rubric = window.BA_LANGTAO_RUBRIC || [];
  const $ = id => document.getElementById(id);
  const qAt = () => { const a=[...document.querySelectorAll('#questionList .question-item')]; return Math.max(0,a.findIndex(x=>x.classList.contains('active'))); };
  const sAt = () => { const a=[...document.querySelectorAll('#tabs .tab')]; return Math.max(0,a.findIndex(x=>x.classList.contains('active'))); };
  const current = () => { const q=rubric[qAt()]||rubric[0]; return {q,s:(q?.subquestions||[])[sAt()]||(q?.subquestions||[])[0]}; };
  const esc = s => String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const toast = msg => { const t=$('toast'); if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);} };
  const buildPrompt = () => {
    const {s}=current(); const answer=$('answerBox')?.value||'';
    if(!s) return '';
    const points=s.points.map(p=>`- ${p.id}（${p.score}分）${p.label}：${p.fullCredit}；关键词：${(p.keywords||[]).join('、')}`).join('\n');
    return `你是刑法主观题阅卷老师。严格以“考生作答版”为硬评分依据，“完整论述版”只用于反馈。先核对规则、事实涵摄、结论、罪数/形态；关键词只用于召回，出现关键词不自动得分。每个采分点独立评分，同一点不得重复计分。只输出JSON，不输出Markdown。\n\n【小问】${s.id} ${s.title}\n【满分】${s.score}\n【考生作答版】\n${s.examAnswer}\n【完整论述版】\n${s.fullAnswer}\n【采分点】\n${points}\n【考生答案】\n${answer}\n\nJSON格式：\n${JSON.stringify({score:0,maxScore:s.score,pointResults:s.points.map(p=>({pointId:p.id,score:0,maxScore:p.score,status:'命中/部分命中/未命中',evidence:'引用考生原句',reason:'理由'})),goodPoints:[],missingPoints:[],substantiveErrors:[],expressionLoss:[],rewrittenExamAnswer:''},null,2)}`;
  };
  const normalize = raw => { const {s}=current(); if(!s) throw Error('当前小问没有对应评分标准'); const by=new Map(),dups=[];(raw.pointResults||[]).forEach(x=>{if(by.has(x.pointId))dups.push(x.pointId);else by.set(x.pointId,x)}); const known=new Set(s.points.map(p=>p.id)); const pointResults=s.points.map(p=>{const x=by.get(p.id)||{};let n=Number(x.score);if(!Number.isFinite(n))n=0;n=Math.max(0,Math.min(p.score,Math.round(n*100)/100));return {pointId:p.id,score:n,maxScore:p.score,status:x.status||'未命中',evidence:x.evidence||'',reason:x.reason||''}});return {...raw,maxScore:s.score,score:Math.round(pointResults.reduce((a,x)=>a+x.score,0)*100)/100,pointResults,validation:{duplicatePointIds:dups,unknownPointIds:[...by.keys()].filter(x=>!known.has(x))}};};
  const show = raw => { const r=normalize(raw), box=$('graderResult'); box.innerHTML=`<strong>本问得分：${r.score} / ${r.maxScore}</strong><br><small>重复采分点：${r.validation.duplicatePointIds.length?'有':'无'}；未知采分点：${r.validation.unknownPointIds.length?'有':'无'}</small><div class="grader-points">${r.pointResults.map(x=>`<span>${esc(x.pointId)} ${x.score}/${x.maxScore} ${esc(x.status)}</span>`).join('')}</div>`; box.classList.add('visible'); $('graderJson').value=JSON.stringify(r,null,2); };
  let reviewMode=false;
  const localGrade = () => {
    const {s}=current(); const answer=$('answerBox')?.value||''; if(!s) return;
    if(reviewMode){ reviewMode=false; $('answerReview').classList.remove('visible'); $('answerBox').style.display=''; $('localGrade').textContent='本题内预批改'; return; }
    const matches=[]; const results=[];
    for(const p of s.points){
      const words=[...(p.keywords||[])].filter(Boolean).sort((a,b)=>b.length-a.length);
      const hitWords=words.filter(w=>answer.includes(w));
      const ratio=words.length?hitWords.length/words.length:0;
      const score=Math.round(p.score*ratio*2)/2;
      results.push({pointId:p.id,score,maxScore:p.score,status:ratio>=.75?'命中':ratio?'部分命中':'未命中',evidence:hitWords.join('、'),reason:'本地关键词覆盖预估'});
      hitWords.forEach(w=>{let at=answer.indexOf(w);while(at>=0){matches.push([at,at+w.length]);at=answer.indexOf(w,at+w.length);}});
    }
    matches.sort((a,b)=>a[0]-b[0]||b[1]-a[1]); const kept=[]; for(const m of matches){if(!kept.some(x=>m[0]<x[1]&&m[1]>x[0]))kept.push(m);} let html='',pos=0; for(const [a,b] of kept){html+=esc(answer.slice(pos,a))+`<mark class="scoring-hit">${esc(answer.slice(a,b))}</mark>`;pos=b;} html+=esc(answer.slice(pos));
    const score=Math.round(results.reduce((a,x)=>a+x.score,0)*100)/100; $('answerReview').innerHTML=`<p class="answer-review-note">蓝色文字为本地评分规则命中的关键词；该分数是预批改参考，语义冲突仍应使用 AI 批改。</p>${html||'<span class="answer-review-note">当前答案为空</span>'}`; $('answerBox').style.display='none'; $('answerReview').classList.add('visible'); $('localGrade').textContent='返回编辑'; reviewMode=true; show({score,maxScore:s.score,pointResults:results,goodPoints:[],missingPoints:results.filter(x=>!x.score).map(x=>x.pointId)});
  };
  $('answerCompareBtn')?.addEventListener('click',()=>{const {s}=current();if(!s)return;$('answerCompareTitle').textContent=`答案对照 · ${s.id} ${s.title}`;$('examAnswerView').textContent=s.examAnswer||'暂无考生作答版';$('fullAnswerView').textContent=s.fullAnswer||'暂无完整论述版';$('answerCompareModal').classList.add('open');});
  $('closeAnswerCompare')?.addEventListener('click',()=> $('answerCompareModal').classList.remove('open'));
  $('answerCompareModal')?.addEventListener('click',e=>{if(e.target.id==='answerCompareModal')e.currentTarget.classList.remove('open')});
  $('generatePrompt')?.addEventListener('click',()=>{ $('graderPrompt').value=buildPrompt(); $('graderModal').classList.add('open'); $('graderPrompt').focus(); });
  $('importGrading')?.addEventListener('click',()=>{ $('graderModal').classList.add('open'); $('graderPrompt').value=''; $('graderJson').focus(); });
  $('localGrade')?.addEventListener('click',localGrade);
  document.addEventListener('click',e=>{if(e.target.closest('#tabs .tab')&&reviewMode){reviewMode=false;$('answerReview').classList.remove('visible');$('answerBox').style.display='';$('localGrade').textContent='本题内预批改';}});
  $('closeGrader')?.addEventListener('click',()=> $('graderModal').classList.remove('open'));
  $('copyPrompt')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('graderPrompt').value);toast('批改提示词已复制')}catch{toast('复制失败，请手动复制')}});
  $('applyGrading')?.addEventListener('click',()=>{try{show(JSON.parse($('graderJson').value));$('graderModal').classList.remove('open');toast('批改 JSON 已校验')}catch(e){toast('JSON格式或采分点不正确：'+e.message)}});
  $('graderModal')?.addEventListener('click',e=>{if(e.target.id==='graderModal')e.currentTarget.classList.remove('open')});
})();
