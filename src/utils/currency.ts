/**
 * Formats a monetary amount into standard Nigerian Naira currency format (₦X,XXX.XX)
 * with 2 decimal places adhering to standard financial precepts.
 */
export function formatMoney(amount: number): string {
  const num = Number(amount || 0);
  return `₦${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
