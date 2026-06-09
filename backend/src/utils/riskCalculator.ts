/**
 * Automatic risk level calculation for gestantes.
 *
 * Risk levels (semáforo):
 *   verde    — Low risk: normal indicators
 *   amarillo — Medium risk: one or more warning factors
 *   rojo     — High risk: critical factors present
 *
 * Factors evaluated:
 *   - Age (< 18 or > 35 = risk)
 *   - BMI (< 18.5 or > 30 = risk)
 *   - Hemoglobin (anemia severity)
 *   - Blood pressure (pre-eclampsia indicators)
 *   - Obstetric history (previous cesareans, abortions, stillbirths)
 *   - Multiple gestations
 *   - Rh sensitization
 */

export type RiskLevel = 'verde' | 'amarillo' | 'rojo';

export interface RiskFactors {
  age?: number;
  imc?: number;
  correctedHemoglobin?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  cesareasPrevias?: number;
  abortosPrevios?: number;
  nacidosMuertos?: number;
  gestaciones?: number;
  rhSensitizado?: boolean;
  antecedentesPersonales?: string[];
}

interface RiskAssessment {
  level: RiskLevel;
  factors: string[];
  score: number;
}

const HIGH_RISK_ANTECEDENTS = [
  'diabetes',
  'hipertension',
  'preeclampsia',
  'eclampsia',
  'epilepsia',
  'cardiopatia',
  'nefropatia',
  'hepatitis',
  'vih',
  'tuberculosis',
  'cancer',
];

/**
 * Calculate overall obstetric risk level based on clinical factors.
 */
export function calculateRiskLevel(factors: RiskFactors): RiskAssessment {
  const riskFactors: string[] = [];
  let score = 0;

  // ---- Age ----
  if (factors.age !== undefined) {
    if (factors.age < 15) {
      riskFactors.push('Edad menor a 15 años');
      score += 3;
    } else if (factors.age < 18) {
      riskFactors.push('Adolescente (menor de 18 años)');
      score += 2;
    } else if (factors.age > 40) {
      riskFactors.push('Edad mayor a 40 años');
      score += 3;
    } else if (factors.age > 35) {
      riskFactors.push('Edad mayor a 35 años');
      score += 2;
    }
  }

  // ---- BMI ----
  if (factors.imc !== undefined) {
    if (factors.imc < 18.5) {
      riskFactors.push('Bajo peso (IMC < 18.5)');
      score += 2;
    } else if (factors.imc >= 35) {
      riskFactors.push('Obesidad grado II+ (IMC ≥ 35)');
      score += 3;
    } else if (factors.imc >= 30) {
      riskFactors.push('Obesidad (IMC ≥ 30)');
      score += 2;
    }
  }

  // ---- Hemoglobin ----
  if (factors.correctedHemoglobin !== undefined) {
    if (factors.correctedHemoglobin < 7.0) {
      riskFactors.push('Anemia severa (Hb < 7.0)');
      score += 4;
    } else if (factors.correctedHemoglobin < 10.0) {
      riskFactors.push('Anemia moderada (Hb < 10.0)');
      score += 2;
    } else if (factors.correctedHemoglobin < 11.0) {
      riskFactors.push('Anemia leve (Hb < 11.0)');
      score += 1;
    }
  }

  // ---- Blood pressure ----
  if (factors.presionSistolica !== undefined && factors.presionDiastolica !== undefined) {
    if (factors.presionSistolica >= 160 || factors.presionDiastolica >= 110) {
      riskFactors.push('Hipertensión severa');
      score += 4;
    } else if (factors.presionSistolica >= 140 || factors.presionDiastolica >= 90) {
      riskFactors.push('Hipertensión');
      score += 3;
    }
  }

  // ---- Obstetric history ----
  if (factors.cesareasPrevias !== undefined && factors.cesareasPrevias >= 2) {
    riskFactors.push(`${factors.cesareasPrevias} cesáreas previas`);
    score += 3;
  } else if (factors.cesareasPrevias !== undefined && factors.cesareasPrevias >= 1) {
    riskFactors.push('Cesárea previa');
    score += 1;
  }

  if (factors.abortosPrevios !== undefined && factors.abortosPrevios >= 3) {
    riskFactors.push('Aborto habitual (≥ 3)');
    score += 3;
  } else if (factors.abortosPrevios !== undefined && factors.abortosPrevios >= 1) {
    riskFactors.push('Antecedente de aborto');
    score += 1;
  }

  if (factors.nacidosMuertos !== undefined && factors.nacidosMuertos >= 1) {
    riskFactors.push('Antecedente de óbito fetal');
    score += 3;
  }

  // ---- Gran multigesta ----
  if (factors.gestaciones !== undefined && factors.gestaciones > 5) {
    riskFactors.push('Gran multigesta (> 5 gestaciones)');
    score += 2;
  }

  // ---- Rh sensitization ----
  if (factors.rhSensitizado === true) {
    riskFactors.push('Rh sensitizado');
    score += 3;
  }

  // ---- Personal antecedents ----
  if (factors.antecedentesPersonales) {
    for (const ant of factors.antecedentesPersonales) {
      const normalized = ant.toLowerCase().trim();
      if (HIGH_RISK_ANTECEDENTS.some((risk) => normalized.includes(risk))) {
        riskFactors.push(`Antecedente: ${ant}`);
        score += 3;
      }
    }
  }

  // ---- Determine level ----
  let level: RiskLevel;
  if (score >= 4) {
    level = 'rojo';
  } else if (score >= 2) {
    level = 'amarillo';
  } else {
    level = 'verde';
  }

  return { level, factors: riskFactors, score };
}
