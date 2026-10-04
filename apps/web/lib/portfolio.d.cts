import type { Receivable } from './chain';
export function repaymentRecord(onTime: bigint, late: bigint, defaults: bigint): {onTimeRate:number|null;unresolvedDefaults:bigint;observed:bigint};
export function fundingSummary(rows: Receivable[], now: bigint): {count:number;advance:bigint;potential:bigint};
export function filterInvoices(rows: Receivable[], search: string, status: string): Receivable[];
