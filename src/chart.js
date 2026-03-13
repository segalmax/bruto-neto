// Chart data, buildChart, fold markers. Depends on calc.js. Chart.js loaded via script in HTML.
import { calcNeto, getMarginalBracket, BL_THRESHOLD, BL_CEILING } from './calc.js';

const Chart = window.Chart;

export const COLORS = {
  neto:        '#3b82f6',
  pension:     '#8b5cf6',
  pensionEmpl: '#6d28d9',
  study:       '#10b981',
  studyEmpl:   '#0d9488',
  health:      '#f59e0b',
  bl:          '#f97316',
  incomeTax:   '#ec4899',
  extraTax:    '#ec4899',
};
export const LABELS = {
  neto:      'נטו',
  pension:   'פנסיה (עובד)',
  pensionEmpl: 'פנסיה (מעסיק)',
  study:     'קרן השתלמות (עובד)',
  studyEmpl: 'קרן השתלמות (מעסיק)',
  health:    'ביטוח בריאות',
  bl:        'ביטוח לאומי',
  incomeTax: 'מס הכנסה',
};

let chartInstance = null;
export function getChartInstance() { return chartInstance; }

export function formatCurrency(value) {
  return `₪${Math.round(value).toLocaleString()}`;
}

export function getHoverState(bruto, settings) {
  const result = calcNeto(bruto, settings);
  const mine      = result.neto + result.pension + result.study + result.pensionEmpl + result.studyEmpl;
  const mineNoCost = result.neto + result.pension + result.study;
  const marginalDelta = Math.max(1, Math.round(bruto * 0.001));
  const next      = calcNeto(bruto + marginalDelta, settings);
  const nextMine  = next.neto + next.pension + next.study + next.pensionEmpl + next.studyEmpl;
  const nextMineNoCost = next.neto + next.pension + next.study;
  return {
    bruto, result, mine, mineNoCost,
    minePct:     bruto > 0 ? (mine / bruto) * 100 : 0,
    marginalNeto: ((next.neto - result.neto) / marginalDelta) * 100,
    marginalMine: ((nextMine - mine) / marginalDelta) * 100,
    marginalMineNoCost: ((nextMineNoCost - mineNoCost) / marginalDelta) * 100,
  };
}

export function buildChartData(settings) {
  const minB = settings.rangeMin;
  const maxB = settings.rangeMax;
  const step = Math.max(500, Math.round((maxB - minB) / 200));
  const labels = [];
  const series = { neto: [], pension: [], study: [], health: [], bl: [], incomeTax: [], mine: [] };

  for (let b = minB; b <= maxB; b += step) {
    labels.push(b);
    const r = calcNeto(b, settings);
    for (const k of Object.keys(series)) series[k].push(Math.round(r[k]));
    series.mine[series.mine.length - 1] = Math.round(r.neto + r.pension + r.study);
  }
  return { labels, series };
}

function getFoldMarkers(minB, maxB, settings) {
  const taxMarkers = [
    { bruto: 7010, lines: ['נקודת קיפול', 'מס הכנסה: מעבר מ-10% ל-14%'] },
    { bruto: 10060, lines: ['נקודת קיפול', 'מס הכנסה: מעבר מ-14% ל-20%'] },
    { bruto: 16150, lines: ['נקודת קיפול', 'מס הכנסה: מעבר מ-20% ל-31%'] },
    { bruto: 21400, lines: ['נקודת קיפול', 'מס הכנסה: מעבר מ-31% ל-35%'] },
    { bruto: 49017, lines: ['נקודת קיפול', 'מס הכנסה: מעבר מ-35% ל-47%'] },
    { bruto: 60130, lines: ['נקודת קיפול', 'מס הכנסה: מעבר מ-47% ל-50%'] },
  ];
  const markers = [];
  taxMarkers.filter(m => m.bruto >= minB && m.bruto <= maxB).forEach(m => {
    const r = calcNeto(m.bruto, settings);
    const yBl = r.neto + r.pension + r.study + r.health + r.bl;
    markers.push({ bruto: m.bruto, y: yBl, radius: 4, lines: m.lines });
  });
  [BL_THRESHOLD].filter(b => b >= minB && b <= maxB).forEach(b => {
    const r = calcNeto(b, settings);
    const yStudy = r.neto + r.pension + r.study;
    const yHealth = yStudy + r.health;
    const yBl = yHealth + r.bl;
    const lines = ['נקודת קיפול', 'ביטוח לאומי/בריאות: מעבר לשיעור מלא'];
    markers.push({ bruto: b, y: yHealth, radius: 3, lines });
    markers.push({ bruto: b, y: yBl, radius: 3, lines });
  });
  [BL_CEILING].filter(b => b >= minB && b <= maxB).forEach(b => {
    const r = calcNeto(b, settings);
    const yStudy = r.neto + r.pension + r.study;
    const yHealth = yStudy + r.health;
    const yBl = yHealth + r.bl;
    const lines = ['נקודת קיפול', 'ביטוח לאומי/בריאות: מכאן יש תקרה והקו נשטח'];
    markers.push({ bruto: b, y: yHealth, radius: 3, lines });
    markers.push({ bruto: b, y: yBl, radius: 3, lines });
  });
  return markers;
}

export function buildChart(settings, { renderHoverDetails, update }) {
  const { labels, series } = buildChartData(settings);

  const mineLine = {
    label: 'גבול — מתחת: שלי | מעל: מדינה',
    data: series.mine,
    yAxisID: 'yEq',
    borderColor: '#ffffff',
    borderWidth: 3,
    fill: false,
    pointRadius: 0,
    tension: 0.3,
    order: -1,
    borderDash: [],
  };
  const equalityLine = {
    label: 'קו שוויון (ברוטו = נטו)',
    data: labels,
    yAxisID: 'yEq',
    borderColor: '#1a1a2e',
    borderWidth: 1.5,
    borderDash: [6, 4],
    fill: false,
    pointRadius: 0,
    tension: 0,
    order: -1,
  };
  const datasets = [mineLine, equalityLine, ...['neto', 'pension', 'study', 'health', 'bl', 'incomeTax'].map(k => ({
    label: LABELS[k],
    data: series[k],
    backgroundColor: COLORS[k] + 'cc',
    borderColor: COLORS[k],
    borderWidth: 1.5,
    fill: true,
    pointRadius: 0,
    tension: 0.3,
  }))];

  const markerPlugin = {
    id: 'markerLine',
    afterEvent(chart, args) {
      const minB = settings.rangeMin, maxB = settings.rangeMax;
      const event = args.event;
      if (!event) return;
      const ca = chart.chartArea;
      const yScale = chart.scales.y;
      const toX = b => ca.left + ((b - minB) / (maxB - minB)) * (ca.right - ca.left);
      const toY = v => yScale.getPixelForValue(v);
      const foldMarkers = getFoldMarkers(minB, maxB, settings).map(marker => ({ ...marker, px: toX(marker.bruto), py: toY(marker.y) }));
      let nextHover = null;
      let bestDistance = Infinity;
      foldMarkers.forEach(marker => {
        const distance = Math.hypot(event.x - marker.px, event.y - marker.py);
        if (distance <= 10 && distance < bestDistance) {
          bestDistance = distance;
          nextHover = { x: event.x, y: event.y, lines: marker.lines };
        }
      });
      const changed = JSON.stringify(chart.$foldHover?.lines) !== JSON.stringify(nextHover?.lines);
      chart.$foldHover = nextHover;
      chart.$mouseX = event.x;
      const brutoX = ca.left + ((settings.bruto - minB) / (maxB - minB)) * (ca.right - ca.left);
      const nearSlider = Math.abs(event.x - brutoX) <= 10 && event.y >= ca.top && event.y <= ca.bottom;
      chart.canvas.style.cursor = nextHover ? 'help' : nearSlider ? 'ew-resize' : 'crosshair';
      if (!nextHover) {
        const fallbackBruto = Math.min(Math.max(settings.bruto, minB), maxB);
        renderHoverDetails(fallbackBruto, settings);
      }
      if (changed) args.changed = true;
    },
    afterDraw(chart) {
      const bruto  = settings.bruto;
      const minB   = settings.rangeMin, maxB = settings.rangeMax;
      const ctx    = chart.ctx;
      const ca     = chart.chartArea;
      ctx.save();

      if (chart.$mouseX && chart.$mouseX >= ca.left && chart.$mouseX <= ca.right && !chart.$foldHover) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chart.$mouseX, ca.top);
        ctx.lineTo(chart.$mouseX, ca.bottom);
        ctx.stroke();
      }

      if (bruto >= minB && bruto <= maxB) {
        const frac = (bruto - minB) / (maxB - minB);
        const x = ca.left + frac * (ca.right - ca.left);
        const midY = (ca.top + ca.bottom) / 2;
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x, ca.top);
        ctx.lineTo(x, ca.bottom);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const label = `₪${bruto.toLocaleString()}`;
        ctx.font = 'bold 12px sans-serif';
        const tw = ctx.measureText(label).width;
        const ph = 20, pw = tw + 16, pr = 6;
        const px = Math.min(Math.max(x - pw / 2, ca.left), ca.right - pw);
        const py = ca.top - ph - 4;
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, pr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(label, px + 8, py + 14);

        ctx.beginPath();
        ctx.arc(x, midY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1.5;
        [-3, 0, 3].forEach(dx => {
          ctx.beginPath();
          ctx.moveTo(x + dx, midY - 4);
          ctx.lineTo(x + dx, midY + 4);
          ctx.stroke();
        });
      }

      const yScale = chart.scales.y;
      const toX = b => ca.left + ((b - minB) / (maxB - minB)) * (ca.right - ca.left);
      const toY = v => yScale.getPixelForValue(v);
      getFoldMarkers(minB, maxB, settings).forEach(marker => {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(toX(marker.bruto), toY(marker.y), marker.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      if (chart.$foldHover) {
        const padding = 8;
        const lineHeight = 16;
        ctx.font = '12px sans-serif';
        const maxLineWidth = Math.max(
          ...chart.$foldHover.lines.map(line => ctx.measureText(line).width)
        );
        const boxWidth = maxLineWidth + padding * 2;
        const boxX = Math.min(chart.$foldHover.x + 12, ca.right - boxWidth - 8);
        const boxY = Math.max(ca.top + 8, chart.$foldHover.y - 10);
        const boxHeight = chart.$foldHover.lines.length * lineHeight + padding * 2;
        ctx.fillStyle = 'rgba(26, 26, 46, 0.94)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        chart.$foldHover.lines.forEach((line, index) => {
          ctx.fillText(line, boxX + boxWidth - padding, boxY + padding + 12 + index * lineHeight);
        });
      }
      ctx.restore();
    }
  };

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { bottom: 10 } },
      interaction: { mode: 'index', intersect: false },
      onClick: (_event, activeElements) => {
        if (!activeElements.length) return;
        document.getElementById('bruto').value = Math.round(labels[activeElements[0].index]);
        if (update) update();
      },
      onHover: (_event, activeElements) => {
        if (chartInstance?.$foldHover) return;
        const fallbackBruto = Math.min(Math.max(settings.bruto, labels[0]), labels[labels.length - 1]);
        const hoveredBruto = activeElements.length ? Number(labels[activeElements[0].index]) : fallbackBruto;
        renderHoverDetails(hoveredBruto, settings);
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          ticks: { maxTicksLimit: 10, callback: function(v) { return `₪${Number(this.getLabelForValue(v)).toLocaleString()}`; } },
          title: { display: true, text: 'שכר ברוטו (₪)', font: { size: 12 } }
        },
        y: {
          stacked: true,
          min: 0, max: settings.rangeMax,
          ticks: { stepSize: Math.round(settings.rangeMax / 10), callback: v => `₪${v.toLocaleString()}` },
          title: { display: true, text: '₪ לחודש', font: { size: 12 } }
        },
        yEq: { display: false, min: 0, max: settings.rangeMax }
      }
    },
    plugins: [markerPlugin],
  });
  renderHoverDetails(Math.min(Math.max(settings.bruto, labels[0]), labels[labels.length - 1]), settings);
}
