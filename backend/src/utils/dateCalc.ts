/**
 * Obstetric date calculations for prenatal care.
 */

/**
 * Calculate the Estimated Due Date (FPP) using Naegele's rule:
 * FPP = FUM + 7 days - 3 months + 1 year
 *
 * @param fum - Last menstrual period date (Fecha de Ultima Menstruacion)
 * @returns Estimated due date (Fecha Probable de Parto)
 */
export function calculateFPP(fum: Date): Date {
  const fpp = new Date(fum);
  fpp.setDate(fpp.getDate() + 7);
  fpp.setMonth(fpp.getMonth() - 3);
  fpp.setFullYear(fpp.getFullYear() + 1);
  return fpp;
}

/**
 * Calculate gestational age in weeks and days from FUM.
 *
 * @param fum - Last menstrual period date
 * @param referenceDate - Date to calculate age at (defaults to today)
 * @returns Object with weeks, days, and totalDays
 */
export function calculateEG(
  fum: Date,
  referenceDate: Date = new Date(),
): { weeks: number; days: number; totalDays: number } {
  const diffMs = referenceDate.getTime() - fum.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays < 0) {
    return { weeks: 0, days: 0, totalDays: 0 };
  }

  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    totalDays,
  };
}

/**
 * Determine trimester from gestational age in weeks.
 *
 * @param egWeeks - Gestational age in weeks
 * @returns Trimester number (1, 2, or 3)
 */
export function getTrimester(egWeeks: number): 1 | 2 | 3 {
  if (egWeeks <= 13) return 1;
  if (egWeeks <= 27) return 2;
  return 3;
}

/**
 * Calculate weeks remaining until the estimated due date (40 weeks).
 *
 * @param egWeeks - Current gestational age in weeks
 * @returns Weeks remaining (minimum 0)
 */
export function getWeeksRemaining(egWeeks: number): number {
  return Math.max(0, 40 - egWeeks);
}

/**
 * Format gestational age as a human-readable string.
 *
 * @param weeks - Number of complete weeks
 * @param days - Additional days beyond complete weeks
 * @returns Formatted string, e.g. "32 sem 4 días"
 */
export function formatEG(weeks: number, days: number): string {
  if (days === 0) return `${weeks} sem`;
  return `${weeks} sem ${days} día${days !== 1 ? 's' : ''}`;
}
