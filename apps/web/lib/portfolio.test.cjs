const { test } = require('node:test');
const assert = require('node:assert/strict');
const { repaymentRecord, fundingSummary, filterInvoices } = require('./portfolio.cjs');
test('empty repayment history has no invented score', () => {
  assert.equal(repaymentRecord(0n,0n,0n).onTimeRate,null);
});
test('cured defaults are not counted twice', () => {
  assert.deepEqual(repaymentRecord(1n,1n,1n),{onTimeRate:50,unresolvedDefaults:0n,observed:2n});
});
test('market excludes closed deadlines and funded invoices', () => {
  const rows = [{id:0n,status:1,fundingDeadline:101n,advanceAmount:98n,faceValue:100n},{id:1n,status:1,fundingDeadline:100n,advanceAmount:9n,faceValue:10n},{id:2n,status:2,fundingDeadline:200n,advanceAmount:9n,faceValue:10n}];
  assert.deepEqual(fundingSummary(rows,100n),{count:1,advance:98n,potential:2n});
});
test('search and status filters both apply without losing invoice zero', () => {
  const rows=[{id:0n,buyer:'0xAbC',supplier:'0xDEF',status:1},{id:1n,buyer:'0xabc',supplier:'0xaaa',status:3}];
  assert.equal(filterInvoices(rows,'#0','all').length,1);
  assert.equal(filterInvoices(rows,'0xABC','1').length,1);
  assert.equal(filterInvoices(rows,'0xABC','2').length,0);
});
