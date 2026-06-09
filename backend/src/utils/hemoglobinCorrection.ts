/**
 * Hemoglobin correction by altitude and anemia classification.
 *
 * Based on MINSA (Peru) guidelines for hemoglobin adjustment
 * according to altitude above sea level (metros sobre el nivel del mar).
 *
 * Reference table (partial):
 *   1000 msnm  → -0.2
 *   1500 msnm  → -0.5
 *   2000 msnm  → -0.8
 *   2500 msnm  → -1.3
 *   3000 msnm  → -1.8
 *   3500 msnm  → -2.7
 *   4000 msnm  → -3.5
 *   4500 msnm  → -4.5
 */

interface AltitudeCorrection {
  minAltitude: number;
  maxAltitude: number;
  factor: number;
}

const ALTITUDE_CORRECTION_TABLE: AltitudeCorrection[] = [
  { minAltitude: 0, maxAltitude: 999, factor: 0 },
  { minAltitude: 1000, maxAltitude: 1499, factor: -0.2 },
  { minAltitude: 1500, maxAltitude: 1999, factor: -0.5 },
  { minAltitude: 2000, maxAltitude: 2499, factor: -0.8 },
  { minAltitude: 2500, maxAltitude: 2999, factor: -1.3 },
  { minAltitude: 3000, maxAltitude: 3499, factor: -1.8 },
  { minAltitude: 3500, maxAltitude: 3999, factor: -2.7 },
  { minAltitude: 4000, maxAltitude: 4499, factor: -3.5 },
  { minAltitude: 4500, maxAltitude: 5000, factor: -4.5 },
];

/**
 * Get the altitude correction factor for the given altitude.
 *
 * @param altitudeMsnm - Altitude in meters above sea level (default: 2926 for Talavera)
 * @returns Correction factor (negative number to subtract)
 */
export function getAltitudeCorrectionFactor(altitudeMsnm: number = 2926): number {
  const entry = ALTITUDE_CORRECTION_TABLE.find(
    (row) => altitudeMsnm >= row.minAltitude && altitudeMsnm <= row.maxAltitude,
  );
  return entry?.factor ?? 0;
}

/**
 * Correct hemoglobin value by altitude.
 *
 * Corrected Hb = Observed Hb + correction factor (factor is negative)
 *
 * @param observedHb - Observed hemoglobin in g/dL
 * @param altitudeMsnm - Altitude in meters above sea level (default: 2926 for Talavera)
 * @returns Corrected hemoglobin in g/dL
 */
export function correctByAltitude(observedHb: number, altitudeMsnm: number = 2926): number {
  const factor = getAltitudeCorrectionFactor(altitudeMsnm);
  const corrected = observedHb + factor; // factor is negative
  return Math.round(corrected * 10) / 10; // Round to 1 decimal
}

export type AnemiaClassification = 'normal' | 'leve' | 'moderada' | 'severa';

/**
 * Classify anemia severity based on corrected hemoglobin in pregnant women.
 *
 * MINSA criteria for pregnant women:
 *   Normal:   Hb ≥ 11.0 g/dL
 *   Leve:     10.0 – 10.9 g/dL
 *   Moderada: 7.0 – 9.9 g/dL
 *   Severa:   < 7.0 g/dL
 *
 * @param correctedHb - Corrected hemoglobin in g/dL
 * @returns Anemia classification
 */
export function classifyAnemia(correctedHb: number): AnemiaClassification {
  if (correctedHb >= 11.0) return 'normal';
  if (correctedHb >= 10.0) return 'leve';
  if (correctedHb >= 7.0) return 'moderada';
  return 'severa';
}

/**
 * Full hemoglobin analysis: correct by altitude and classify.
 */
export function analyzeHemoglobin(
  observedHb: number,
  altitudeMsnm: number = 2926,
): {
  observedHb: number;
  correctedHb: number;
  correctionFactor: number;
  classification: AnemiaClassification;
} {
  const factor = getAltitudeCorrectionFactor(altitudeMsnm);
  const correctedHb = correctByAltitude(observedHb, altitudeMsnm);
  const classification = classifyAnemia(correctedHb);

  return {
    observedHb,
    correctedHb,
    correctionFactor: factor,
    classification,
  };
}
