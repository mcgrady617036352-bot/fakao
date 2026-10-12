const assert = require('assert');
const g = require('../ba_langtao_10_grader');
assert.deepStrictEqual(g.validateRubric(), {ok:true, errors:[]});
assert.strictEqual(g.QUESTIONS.length, 10);
for (const q of g.QUESTIONS) {
  assert.strictEqual(q.totalScore, 40);
  assert.strictEqual(q.subquestions.reduce((a,s)=>a+s.score,0),40);
  for (const s of q.subquestions) assert.strictEqual(s.points.reduce((a,p)=>a+p.score,0),s.score);
}
const s=g.getSubquestion(7,'7-2');
const zero=g.normalizeReport({pointResults:[]},7,'7-2');
assert.strictEqual(zero.score,0);
const full=g.normalizeReport({pointResults:s.points.map(p=>({pointId:p.id,score:p.score,status:'命中',evidence:'原句',reason:'符合'}))},7,'7-2');
assert.strictEqual(full.score,8);
const dup=g.normalizeReport({pointResults:[{pointId:'7-2-a',score:9},{pointId:'7-2-a',score:1},{pointId:'x',score:3}]},7,'7-2');
assert.deepStrictEqual(dup.validation.duplicatePointIds,['7-2-a']);
assert.deepStrictEqual(dup.validation.unknownPointIds,['x']);
console.log('grader tests passed');
