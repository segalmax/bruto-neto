// Tax/insurance rules (2026). Pure math only.
export const BRACKETS = [
  { up: 7010, rate: 0.10 },
  { up: 10060, rate: 0.14 },
  { up: 16150, rate: 0.20 },
  { up: 21400, rate: 0.31 },
  { up: 49017, rate: 0.35 },
  { up: 60130, rate: 0.47 },
  { up: Infinity, rate: 0.50 },
];
export const CREDIT_POINT_VALUE = 242;
export const BL_THRESHOLD = 7703;
export const BL_CEILING = 51910;
export const BL_LOW_EMP_RATE = 0.0104;
export const BL_HIGH_EMP_RATE = 0.07;
export const BL_LOW_EMPL_RATE = 0.0355;
export const BL_HIGH_EMPL_RATE = 0.076;
export const HEALTH_LOW_RATE = 0.0323;
export const HEALTH_HIGH_RATE = 0.0517;
export const STUDY_FUND_SALARY_CEILING = 15712;
export const PENSION_DISABILITY_CEILING = 34423;
export const SEVERANCE_CEILING = 45618.25;

export function getMarginalBracket(taxableGross) {
  for (const { up, rate } of BRACKETS) {
    if (taxableGross <= up) return Math.round(rate * 100) + '%';
  }
  return '50%';
}

export function calcTax(taxableGross, creditPoints) {
  let tax = 0, prev = 0;
  for (const { up, rate } of BRACKETS) {
    if (taxableGross <= prev) break;
    tax += (Math.min(taxableGross, up) - prev) * rate;
    prev = up;
  }
  const credit = creditPoints * CREDIT_POINT_VALUE;
  return Math.max(0, tax - credit);
}

export function calcBituachLeumi(insurableGross) {
  const insurable = Math.min(insurableGross, BL_CEILING);
  const low = Math.min(insurable, BL_THRESHOLD);
  const high = Math.max(0, insurable - BL_THRESHOLD);
  const employee = low * BL_LOW_EMP_RATE + high * BL_HIGH_EMP_RATE;
  const employer = low * BL_LOW_EMPL_RATE + high * BL_HIGH_EMPL_RATE;
  return { employee, employer };
}

export function calcHealth(insurableGross) {
  const insurable = Math.min(insurableGross, BL_CEILING);
  const low = Math.min(insurable, BL_THRESHOLD);
  const high = Math.max(0, insurable - BL_THRESHOLD);
  return low * HEALTH_LOW_RATE + high * HEALTH_HIGH_RATE;
}

export function calcPension(gross, empPct, emplPct) {
  const employee = gross * (empPct / 100);
  const employer = gross * (emplPct / 100);
  const taxableBenefit = Math.max(0, gross - PENSION_DISABILITY_CEILING) * (emplPct / 100);
  return { employee, employer, taxableBenefit };
}

export function calcDisabilityTaxableBenefit(gross, disabilityPct) {
  return Math.max(0, gross - PENSION_DISABILITY_CEILING) * (disabilityPct / 100);
}

export function calcSeveranceTaxableBenefit(gross, sevrPct) {
  return Math.max(0, gross - SEVERANCE_CEILING) * (sevrPct / 100);
}

export function calcStudyFund(gross, empPct, emplPct) {
  const employee = gross * (empPct / 100);
  const employer = gross * (emplPct / 100);
  const taxableBenefit = Math.max(0, gross - STUDY_FUND_SALARY_CEILING) * (emplPct / 100);
  return { employee, employer, taxableBenefit };
}

export function calcNeto(bruto, s) {
  const pension = calcPension(bruto, s.pensionEmp, s.pensionEmpl);
  const study = calcStudyFund(bruto, s.studyEmp, s.studyEmpl);
  const sevrTaxable = calcSeveranceTaxableBenefit(bruto, s.sevrEmpl);
  const sevrEmployer = bruto * (s.sevrEmpl / 100);
  const disabilityTaxable = calcDisabilityTaxableBenefit(bruto, s.disability);
  const disabilityEmployer = bruto * (s.disability / 100);
  const taxableGross = bruto + pension.taxableBenefit + disabilityTaxable + study.taxableBenefit + sevrTaxable;
  const bl = calcBituachLeumi(taxableGross);
  const health = calcHealth(taxableGross);
  const incomeTax = calcTax(taxableGross, s.creditPoints);
  const blBruto = calcBituachLeumi(bruto);
  const healthBruto = calcHealth(bruto);
  const incomeTaxBruto = calcTax(bruto, s.creditPoints);
  const extraTax = (incomeTax - incomeTaxBruto) + (bl.employee - blBruto.employee) + (health - healthBruto);
  const totalDeductions = incomeTax + bl.employee + health + pension.employee + study.employee;
  const neto = bruto - totalDeductions;
  const totalCost = bruto + pension.employer + study.employer + sevrEmployer + disabilityEmployer + bl.employer;
  return {
    neto, incomeTax, bl: bl.employee, health, taxableGross, extraTax,
    pension: pension.employee, study: study.employee,
    pensionEmpl: pension.employer, studyEmpl: study.employer,
    totalCost,
  };
}

function buildTestSettings() {
  return {
    creditPoints: 2.25, pensionEmp: 6, pensionEmpl: 6.5, sevrEmpl: 8.33,
    studyEmp: 2.5, studyEmpl: 7.5, disability: 1, rangeMin: 0, rangeMax: 100000, bruto: 0,
  };
}

export function runMathTests() {
  const s = buildTestSettings();
  const cases = [
    { bruto: 20000, expected: { neto: 13340.70, incomeTax: 3094.70, bl: 963.41, health: 901.19 } },
    { bruto: 47000, expected: { neto: 23731.95, incomeTax: 13747.30, bl: 3069.25, health: 2456.50 } },
    { bruto: 700000, expected: { neto: 218663.09, incomeTax: 416128.00, bl: 3174.60, health: 2534.31 } },
  ];
  const tol = 0.2;
  cases.forEach(test => {
    const settings = { ...s, bruto: test.bruto };
    const r = calcNeto(test.bruto, settings);
    if (Math.abs(r.neto - test.expected.neto) > tol) throw new Error(`neto @${test.bruto} expected ${test.expected.neto}, got ${r.neto}`);
    if (Math.abs(r.incomeTax - test.expected.incomeTax) > tol) throw new Error(`incomeTax @${test.bruto} expected ${test.expected.incomeTax}, got ${r.incomeTax}`);
    if (Math.abs(r.bl - test.expected.bl) > tol) throw new Error(`bl @${test.bruto} expected ${test.expected.bl}, got ${r.bl}`);
    if (Math.abs(r.health - test.expected.health) > tol) throw new Error(`health @${test.bruto} expected ${test.expected.health}, got ${r.health}`);
  });
  console.log('✅ math tests passed for 20k, 47k, 700k');
}
