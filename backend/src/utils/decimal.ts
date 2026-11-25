import Decimal from 'decimal.js';

/**
 * Add two monetary decimal strings safely.
 * Always use this instead of native + operator.
 */
export function addMoney(a: string | Decimal, b: string | Decimal): Decimal {
  return new Decimal(a.toString()).plus(b.toString());
}

/**
 * Subtract b from a. Returns a Decimal.
 */
export function subtractMoney(a: string | Decimal, b: string | Decimal): Decimal {
  return new Decimal(a.toString()).minus(b.toString());
}

/**
 * Returns true if a <= b
 */
export function lte(a: string | Decimal, b: string | number | Decimal): boolean {
  return new Decimal(a.toString()).lte(b.toString());
}

/**
 * Returns true if a > b
 */
export function gt(a: string | Decimal, b: string | number | Decimal): boolean {
  return new Decimal(a.toString()).gt(b.toString());
}

/**
 * Returns true if a <= 0
 */
export function isNonPositive(a: string | Decimal): boolean {
  return new Decimal(a.toString()).lte(0);
}

/**
 * Format a Decimal for display (e.g. "₹5,000.00")
 */
export function formatMoney(amount: string | Decimal): string {
  return `₹${new Decimal(amount.toString()).toFixed(2)}`;
}
