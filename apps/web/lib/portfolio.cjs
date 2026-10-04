function repaymentRecord(onTime, late, defaults) {
  const observed = onTime + defaults;
  return { onTimeRate: observed === 0n ? null : Number(onTime * 10000n / observed) / 100, unresolvedDefaults: defaults > late ? defaults - late : 0n, observed };
}
function fundingSummary(rows, now) {
  return rows.filter(r => r.status === 1 && r.fundingDeadline > now).reduce((s,r) => ({count:s.count+1,advance:s.advance+r.advanceAmount,potential:s.potential+r.faceValue-r.advanceAmount}),{count:0,advance:0n,potential:0n});
}
function filterInvoices(rows, search, status) {
  const q=search.trim().toLowerCase().replace(/^#/, '');
  return rows.filter(r => (status === 'all' || r.status === Number(status)) && (!q || (/^\d+$/.test(q) ? r.id === BigInt(q) : r.buyer.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q))));
}
module.exports = {repaymentRecord,fundingSummary,filterInvoices};
