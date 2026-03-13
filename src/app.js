// DOM wiring, renderHoverDetails, update. Entry point for the app.
import { getMarginalBracket, runMathTests } from './calc.js';
import { buildChart, buildChartData, getHoverState, formatCurrency, COLORS, LABELS, getChartInstance } from './chart.js';

function parseInputs() {
  const v = id => parseFloat(document.getElementById(id).value) || 0;
  const minB = Math.max(0, v('rangeMin') || 5000);
  const maxB = Math.max(minB + 10000, v('rangeMax') || 70000);
  return {
    bruto: v('bruto'), rangeMin: minB, rangeMax: maxB, creditPoints: v('creditPoints'),
    pensionEmp: v('pensionEmp'), pensionEmpl: v('pensionEmpl'), sevrEmpl: v('severance'),
    studyEmp: v('studyEmp'), studyEmpl: v('studyEmpl'), disability: v('disability'),
  };
}

function wireBreakdownHover(panel) {
  const setActive = (key, on) => {
    panel.querySelectorAll(`[data-segment-key="${key}"]`).forEach(el => el.classList.toggle('active', on));
  };
  const clearAll = () => {
    panel.querySelectorAll('.breakdown-segment.active, .hover-row.active').forEach(el => el.classList.remove('active'));
  };
  panel.addEventListener('mouseover', e => {
    const key = e.target.closest('[data-segment-key]')?.dataset?.segmentKey;
    if (key) { clearAll(); setActive(key, true); }
  });
  panel.addEventListener('mouseout', e => {
    if (!panel.contains(e.relatedTarget)) clearAll();
  });
}

export function renderHoverDetails(bruto, settings) {
  const panel = document.getElementById('hoverDetails');
  const state = getHoverState(bruto, settings);
  const pct = v => `${((v / bruto) * 100).toFixed(1)}%`;
  const r = state.result;
  const stateTotal = r.incomeTax + r.bl + r.health;
  const mineFromBruto = r.neto + r.pension + r.study + r.pensionEmpl + r.studyEmpl;
  const effectiveTaxRate = ((r.incomeTax + r.bl + r.health) / bruto) * 100;
  const savingsRate = ((r.pension + r.study + r.pensionEmpl + r.studyEmpl) / bruto) * 100;
  const costMultiplier = r.totalCost / bruto;

  const hrow = (segmentKey, label, value, note = '', negative = false) =>
    `<div class="hover-row${negative ? ' negative' : ''}" data-segment-key="${segmentKey}">
       <span class="hover-row-label"><span class="swatch" style="background:${COLORS[segmentKey] || COLORS[segmentKey.replace('Empl','')]}"></span>${label}</span>
       <span class="hover-row-value"><span class="pct">${pct(Math.abs(value))}</span>${negative ? '-' : ''}${formatCurrency(Math.abs(value))}${note ? ` <span style="font-size:0.72rem;color:#6b7280">${note}</span>` : ''}</span>
     </div>`;
  const group = (name, total, rows) =>
    `<div class="hover-group">
       <div class="hover-group-header">
         <span class="hover-group-name">${name}</span>
         <span class="hover-group-total">${formatCurrency(total)}<span>${pct(Math.abs(total))}</span></span>
       </div>
       ${rows}
     </div>`;

  panel.innerHTML = `
    <div class="hover-header">
      <div class="hover-metric">
        <div class="hover-metric-label">מס אפקטיבי</div>
        <div class="hover-metric-value">${effectiveTaxRate.toFixed(1)}%</div>
        <div class="hover-metric-sub">מכל השכר ברוטו</div>
      </div>
      <div class="hover-metric">
        <div class="hover-metric-label">מס שולי</div>
        <div class="hover-metric-value">${state.marginalNeto.toFixed(1)}%</div>
        <div class="hover-metric-sub">על השקל הבא</div>
      </div>
      <div class="hover-metric">
        <div class="hover-metric-label">שיעור חיסכון</div>
        <div class="hover-metric-value">${savingsRate.toFixed(1)}%</div>
        <div class="hover-metric-sub">פנסיה וקה"ש</div>
      </div>
      <div class="hover-metric highlight" style="background: #2d2d44; border-radius: 8px; padding: 4px;">
        <div class="hover-metric-label" style="color: #9ca3af;">עלות מעביד</div>
        <div class="hover-metric-value">x${costMultiplier.toFixed(2)}</div>
        <div class="hover-metric-sub" style="color: #6b7280;">על כל ₪1 ברוטו</div>
      </div>
    </div>
    <div class="breakdown-container">
      <div class="breakdown-bar-wrapper">
        <div class="breakdown-bar-outer">
          ${(() => {
            const total = bruto + r.pensionEmpl + r.studyEmpl;
            const mine = r.neto + r.pension + r.study + r.pensionEmpl + r.studyEmpl;
            const pctSeg = v => `${(v / total) * 100}%`;
            const segments = ['studyEmpl','study','pensionEmpl','pension','neto','health','bl','incomeTax'].map(k => {
              const val = r[k];
              if (!val || val < 1) return '';
              const color = COLORS[k] || COLORS[k.replace('Empl','')];
              const isEmpl = k.endsWith('Empl');
              return `<div class="breakdown-segment${isEmpl ? ' employer' : ''}" data-segment-key="${k}" style="width:${pctSeg(val)}; background:${color}"></div>`;
            }).join('');
            return `<div class="mine-bracket" style="right:0; width:${pctSeg(mine)}"><div class="mine-bracket-label">סה"כ שלי</div></div>${segments}`;
          })()}
        </div>
      </div>
    </div>
    <div class="hover-groups">
      ${group('שלי', mineFromBruto,
        hrow('neto','נטו (מזומן)',r.neto) +
        hrow('pension','פנסיה עובד',r.pension) +
        hrow('pensionEmpl','פנסיה מעסיק',r.pensionEmpl) +
        hrow('study','קרן השתלמות עובד',r.study) +
        hrow('studyEmpl','קרן השתלמות מעסיק',r.studyEmpl)
      )}
      ${group('מסים', stateTotal + Math.max(0, r.extraTax),
        hrow('incomeTax', LABELS.incomeTax, r.incomeTax, `מדרגה ${getMarginalBracket(r.taxableGross)}`) +
        hrow('bl', LABELS.bl, r.bl) +
        hrow('health', LABELS.health, r.health) +
        (r.extraTax > 0 ? hrow('extraTax', 'מס על הטבות מעסיק', r.extraTax) : '')
      )}
    </div>
  `;
  wireBreakdownHover(panel);
}

let dragWired = false;
function update() {
  const settings = parseInputs();
  buildChart(settings, { renderHoverDetails, update });
  if (!dragWired) {
    applyChartDrag(getChartInstance().canvas);
    dragWired = true;
  }
}

function applyChartDrag(canvas) {
  let dragging = false;
  const pick = e => {
    const chartInstance = getChartInstance();
    const pts = chartInstance.getElementsAtEventForMode(e, 'index', { intersect: false }, true);
    if (!pts.length) return;
    const s = parseInputs();
    const b = Math.round(Number(buildChartData(s).labels[pts[0].index]));
    document.getElementById('bruto').value = b;
    update();
  };
  canvas.addEventListener('mousedown', e => { dragging = true; pick(e); });
  canvas.addEventListener('mousemove', e => { if (dragging) pick(e); });
  document.addEventListener('mouseup', () => { dragging = false; });
}

document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', update));
window.runMathTests = runMathTests;
update();
