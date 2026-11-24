import type { MonthSummary } from './monthly';

/** Dibuixa el resum mensual en una imatge (1080×1350) per desar-la o compartir-la */
export async function monthImage(s: MonthSummary, title: string, exName: (id: string) => string): Promise<Blob> {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const font = (size: number, weight = 600) => `${weight} ${size}px -apple-system, system-ui, 'Segoe UI', Roboto, sans-serif`;
  g.fillStyle = '#0b0d10'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#4ade80'; g.font = font(40, 700); g.fillText('FORMA', 80, 120);
  g.fillStyle = '#e8eaed'; g.font = font(76, 800); g.fillText(title, 80, 210);

  const fmt = (n: number, d = 1) => n.toLocaleString('ca-ES', { maximumFractionDigits: d });
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
  const tiles: [string, string, string][] = [
    ['Pes (mitjana)', s.avgKg != null ? `${fmt(s.avgKg)} kg` : '—', s.kgChange != null ? `${sign(s.kgChange)}${fmt(Math.abs(s.kgChange))} kg vs mes anterior` : ''],
    ['Cintura', s.waistLast != null ? `${fmt(s.waistLast)} cm` : '—', s.waistChange != null ? `${sign(s.waistChange)}${fmt(Math.abs(s.waistChange))} cm al mes` : ''],
    ['Sessions', `${s.totalSessions}`, `${s.strength} força · ${s.swims} natació${s.hotel ? ` · ${s.hotel} hotel` : ''}`],
    ['Rècords', `${s.prs.length}`, s.cardioMin ? `${s.cardioMin} min de cardio` : ''],
  ];
  tiles.forEach(([label, value, sub], i) => {
    const x = 80 + (i % 2) * 470, y = 290 + Math.floor(i / 2) * 330;
    g.fillStyle = '#14171c'; roundRect(g, x, y, 450, 300, 36); g.fill();
    g.fillStyle = '#9aa1ad'; g.font = font(34, 500); g.fillText(label, x + 40, y + 70);
    g.fillStyle = i < 2 && (i === 0 ? (s.kgChange ?? 0) < 0 : (s.waistChange ?? 0) < 0) ? '#4ade80' : '#e8eaed';
    g.font = font(84, 800); g.fillText(value, x + 40, y + 175);
    g.fillStyle = '#9aa1ad'; g.font = font(28, 500); wrap(g, sub, x + 40, y + 235, 380, 36);
  });

  let y = 990;
  g.fillStyle = '#e8eaed'; g.font = font(36, 700);
  const lines = [
    s.swimMin ? `🏊 ${s.swimMin} min nedant` : '',
    s.extraMin ? `⛳ ${s.extraMin} min d'activitats extra` : '',
    s.stepsAvg ? `👟 ${fmt(s.stepsAvg, 0)} passos de mitjana` : '',
    s.prs[0] ? `🏆 ${exName(s.prs[0].exerciseId)}: ${s.prs[0].value}` : '',
  ].filter(Boolean).slice(0, 4);
  for (const l of lines) { g.fillText(l, 80, y); y += 62; }
  g.fillStyle = '#5d6573'; g.font = font(26, 500); g.fillText('Fet amb constància, setmana a setmana.', 80, H - 70);

  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = '';
  for (const word of text.split(' ')) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = word; y += lh; } else line = t;
  }
  if (line) g.fillText(line, x, y);
}
