/* Green Guardians - Community Environmental Transparency Dashboard */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isDark = () => document.documentElement.classList.contains('dark');
  const icons = () => window.lucide && lucide.createIcons();

  /* ---------- Theme ---------- */
  const saved = localStorage.getItem('gg-theme');
  if (saved === 'light') document.documentElement.classList.remove('dark');
  $('#theme-toggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('gg-theme', isDark() ? 'dark' : 'light');
    restyleCharts();
  });

  /* ---------- Mobile menu ---------- */
  const menu = $('#mobile-menu');
  $('#menu-toggle').addEventListener('click', () => menu.classList.toggle('hidden'));
  $$('#mobile-menu a').forEach(a => a.addEventListener('click', () => menu.classList.add('hidden')));

  /* ---------- Data ---------- */
  const MONTHS = ['Jun (Baseline)', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const STATIONS = [
    { id: 1, name: 'North Village Well', dist: '500m', status: 'safe', label: 'Safe / Optimal',
      ph: 7.2, tds: 240, pm: 38, do: 6.8,
      trend: { pm25: [72, 64, 55, 48, 42, 38], tds: [410, 372, 330, 291, 262, 240] },
      g: { name: 'Arjun Menon', id: 'GG-14', village: 'Pachakkara', color: 'from-emerald-400 to-teal-600', check: '12 Nov 2026, 11:20 AM', lab: 'EnviroLab Kochi (NABL TC-7741)' } },
    { id: 2, name: 'East Stream Outflow', dist: '1.2km', status: 'watch', label: 'Action Taken (Watch)',
      ph: 7.1, tds: 228, pm: 44, do: 5.9,
      trend: { pm25: [81, 73, 66, 58, 51, 44], tds: [488, 446, 398, 352, 612, 228] },
      g: { name: 'Anoop Varghese', id: 'GG-07', village: 'Puzhayoram', color: 'from-amber-400 to-orange-600', check: '16 Oct 2026, 03:05 PM', lab: 'EnviroLab Kochi (NABL TC-7741)' } },
    { id: 3, name: 'South Residential School', dist: '800m', status: 'safe', label: 'Safe / Optimal',
      ph: 7.4, tds: 198, pm: 31, do: 7.2,
      trend: { pm25: [63, 56, 49, 41, 35, 31], tds: [342, 311, 274, 240, 215, 198] },
      g: { name: 'Lekha Pillai', id: 'GG-22', village: 'Kavumthazham', color: 'from-sky-400 to-indigo-600', check: '10 Nov 2026, 09:45 AM', lab: 'AquaTest Labs Thrissur (NABL TC-6120)' } },
    { id: 4, name: 'West Plant Boundary', dist: '50m', status: 'safe', label: 'Safe / Optimal',
      ph: 7.0, tds: 286, pm: 52, do: 6.4,
      trend: { pm25: [98, 88, 77, 67, 58, 52], tds: [468, 431, 384, 342, 305, 286] },
      g: { name: 'Sreejith Nair', id: 'GG-31', village: 'Thengumpadam', color: 'from-fuchsia-400 to-purple-600', check: '14 Nov 2026, 02:30 PM', lab: 'AquaTest Labs Thrissur (NABL TC-6120)' } },
  ];
  const EXTRA = [
    ['Reshma Joseph', 'GG-03', 'from-rose-400 to-pink-600', 'Water Sampling'],
    ['Faisal Rahman', 'GG-05', 'from-lime-400 to-green-600', 'Air Monitoring'],
    ['Anjali Krishnan', 'GG-09', 'from-cyan-400 to-blue-600', 'Data & Reports'],
    ['Neethu Thomas', 'GG-11', 'from-violet-400 to-purple-600', 'Community Outreach'],
    ['Biju Mathew', 'GG-16', 'from-orange-400 to-red-600', 'Sensor Maintenance'],
    ['Rahul Kurian', 'GG-18', 'from-teal-400 to-emerald-600', 'Mini-Lab Analyst'],
    ['Hari Shankar', 'GG-20', 'from-yellow-400 to-amber-600', 'Green Belt Lead'],
    ['Athira Mohan', 'GG-25', 'from-pink-400 to-fuchsia-600', 'Grievance Desk'],
  ].map(([name, id, color, role]) => ({ name, id, color, role }));
  const GUARDIANS = [
    ...STATIONS.map(s => ({ ...s.g, station: s.id, role: `Station ${s.id} Lead` })),
    ...EXTRA,
  ];
  const initials = n => { const p = n.replace('.', '').split(' '); return p.length > 1 ? p.map(x => x[0]).join('') : n.slice(0, 2); };
  let current = 0, trendMetric = 'pm25';

  /* ---------- Station tabs ---------- */
  const tabs = $('#station-tabs');
  tabs.innerHTML = STATIONS.map((s, i) => `
    <button class="st-tab ${s.status}" role="tab" id="station-tab-${s.id}" data-i="${i}">
      <p class="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Station ${s.id} · ${s.dist}</p>
      <p class="font-display font-bold text-slate-900 dark:text-white mt-0.5">${s.name}</p>
      <span class="status ${s.status} mt-2"><i data-lucide="${s.status === 'safe' ? 'shield-check' : 'eye'}" class="w-3 h-3"></i>${s.label}</span>
    </button>`).join('');
  tabs.addEventListener('click', e => { const b = e.target.closest('.st-tab'); if (b) selectStation(+b.dataset.i); });

  /* ---------- Metric cards ---------- */
  const metricDefs = [
    { key: 'ph', title: 'Water pH', icon: 'test-tube', unit: '', limit: 'Safe Limit 6.5 - 8.5', min: 0, max: 14, band: [6.5, 8.5], ok: v => v >= 6.5 && v <= 8.5, dec: 1 },
    { key: 'tds', title: 'Water TDS', icon: 'droplets', unit: 'ppm', limit: 'Limit < 500 ppm', min: 0, max: 700, cap: 500, ok: v => v < 500, dec: 0 },
    { key: 'pm', title: 'Air PM2.5', icon: 'wind', unit: 'µg/m³', limit: 'Limit < 60 µg/m³', min: 0, max: 100, cap: 60, ok: v => v < 60, dec: 0 },
    { key: 'do', title: 'Dissolved Oxygen', icon: 'waves', unit: 'mg/L', limit: 'Healthy > 5 mg/L', min: 0, max: 10, floor: 5, ok: v => v > 5, dec: 1 },
  ];
  const grid = $('#metric-grid');
  grid.innerHTML = metricDefs.map(m => `
    <div class="glass-card metric" id="metric-${m.key}">
      <div class="flex items-center justify-between">
        <span class="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><i data-lucide="${m.icon}" class="w-4 h-4 text-emerald-500"></i>${m.title}</span>
        <span class="m-badge status safe">OK</span>
      </div>
      <div class="mt-3 flex items-baseline gap-1"><span class="val">-</span><span class="text-sm text-slate-500">${m.unit}</span></div>
      <div class="bar mt-4">${m.band ? `<span class="band" style="left:${m.band[0] / m.max * 100}%;width:${(m.band[1] - m.band[0]) / m.max * 100}%"></span>` : ''}<i style="width:0"></i>${m.band ? '<span class="marker" style="left:0"></span>' : ''}</div>
      <p class="text-[11px] sm:text-xs text-slate-500 mt-2 flex justify-between gap-2"><span>${m.limit}</span><span class="pct font-mono"></span></p>
    </div>`).join('');

  function animateNum(el, to, dec) {
    const from = parseFloat(el.dataset.v || 0), t0 = performance.now(), d = 700;
    el.dataset.v = to;
    const step = t => { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = (from + (to - from) * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  function renderMetrics(s, flashKey) {
    metricDefs.forEach(m => {
      const card = $('#metric-' + m.key), v = s[m.key], ok = m.ok(v);
      animateNum($('.val', card), v, m.dec);
      const pct = Math.min(100, (v - m.min) / (m.max - m.min) * 100);
      const fill = $('.bar > i', card);
      if (m.band) { fill.style.width = '0'; $('.marker', card).style.left = `calc(${pct}% - 1.5px)`; }
      else {
        fill.style.width = pct + '%';
        const ratio = m.cap ? v / m.cap : 1;
        fill.style.background = m.floor ? 'linear-gradient(90deg,#14b8a6,#10b981)' : ratio < .7 ? 'linear-gradient(90deg,#10b981,#14b8a6)' : ratio < 1 ? 'linear-gradient(90deg,#10b981,#f59e0b)' : '#f43f5e';
      }
      $('.pct', card).textContent = m.cap ? `${Math.round(v / m.cap * 100)}% of limit` : m.floor ? `${(v / m.floor * 100 - 100).toFixed(0)}% above min` : 'Neutral';
      const b = $('.m-badge', card);
      b.className = 'm-badge status ' + (ok ? 'safe' : 'watch');
      b.textContent = ok ? 'Within limit' : 'Exceeds';
      if (flashKey === m.key) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
    });
  }

  function renderGuardian(s) {
    const g = s.g;
    $('#guardian-card').innerHTML = `
      <p class="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><i data-lucide="user-check" class="w-4 h-4"></i>Guardian Verification</p>
      <div class="flex items-center gap-4 mt-4">
        <div class="relative">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${g.color} grid place-items-center text-white font-display font-extrabold text-xl shadow-lg">${initials(g.name)}</div>
          <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 grid place-items-center ring-2 ring-white dark:ring-slate-900"><i data-lucide="check" class="w-3.5 h-3.5 text-white"></i></span>
        </div>
        <div><p class="font-display font-bold text-lg text-slate-900 dark:text-white">${g.name}</p>
        <p class="text-sm font-mono text-slate-500">ID #${g.id} · ${g.village}</p></div>
      </div>
      <div class="mt-5 space-y-3 text-sm">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><i data-lucide="award" class="w-5 h-5 text-emerald-500 shrink-0"></i><div><p class="font-semibold text-slate-900 dark:text-white">ITI Certified</p><p class="text-xs text-slate-500">Lab Technician (NCVT) · 2026</p></div></div>
        <div class="flex items-center gap-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20"><i data-lucide="flask-conical" class="w-5 h-5 text-sky-500 shrink-0"></i><div><p class="font-semibold text-slate-900 dark:text-white">Last External Lab Cross-Check</p><p class="text-xs text-slate-500">${g.check}<br>${g.lab}</p></div></div>
      </div>
      <p class="mt-auto pt-4 text-xs text-slate-500 flex items-center gap-1.5"><span class="pulse-dot"></span>Sensor online · reading every 15 min</p>`;
  }

  /* ---------- Charts ---------- */
  const gridColor = () => isDark() ? 'rgba(255,255,255,.06)' : 'rgba(15,23,42,.06)';
  const tickColor = () => isDark() ? '#94a3b8' : '#64748b';
  let trendChart, budgetChart;

  function trendData(s) {
    const isPm = trendMetric === 'pm25';
    const limit = isPm ? 60 : 500;
    const ctx = $('#trendChart').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, 'rgba(16,185,129,.35)'); grad.addColorStop(1, 'rgba(16,185,129,0)');
    const vals = s.trend[trendMetric];
    return {
      labels: MONTHS,
      datasets: [
        { label: isPm ? 'PM2.5 (µg/m³)' : 'TDS (ppm)', data: vals, borderColor: '#10b981', backgroundColor: grad, fill: true, tension: .4, borderWidth: 3,
          pointRadius: vals.map(v => v > limit ? 7 : 4), pointBackgroundColor: vals.map(v => v > limit ? '#f43f5e' : '#10b981'), pointBorderColor: isDark() ? '#0f172a' : '#fff', pointBorderWidth: 2, pointHoverRadius: 8 },
        { label: 'Legal limit', data: MONTHS.map(() => limit), borderColor: '#f43f5e', borderDash: [6, 6], borderWidth: 2, pointRadius: 0, fill: false },
      ],
    };
  }
  function initTrend() {
    trendChart = new Chart($('#trendChart'), {
      type: 'line', data: trendData(STATIONS[current]),
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: tickColor(), usePointStyle: true, boxWidth: 8, font: { family: 'Inter', weight: 600 } } },
          tooltip: { backgroundColor: 'rgba(2,6,23,.92)', padding: 12, cornerRadius: 10, titleFont: { family: 'Plus Jakarta Sans', weight: 700 }, bodyFont: { family: 'Inter' } },
        },
        scales: { x: { grid: { color: gridColor() }, ticks: { color: tickColor() } }, y: { grid: { color: gridColor() }, ticks: { color: tickColor() }, beginAtZero: true } },
      },
    });
  }
  function updateTrend() {
    const s = STATIONS[current];
    trendChart.data = trendData(s);
    trendChart.update();
    const v = s.trend[trendMetric], drop = Math.round((1 - v[5] / v[0]) * 100);
    $('#trend-sub').innerHTML = `Station ${s.id} · Baseline (Jun) → Month 6 (Nov) · <b class="text-emerald-600 dark:text-emerald-400">↓ ${drop}% reduction</b>${s.id === 2 && trendMetric === 'tds' ? ' · <b class="text-rose-500">Oct spike shown - we publish bad numbers too</b>' : ''}`;
  }
  $('#trend-metric').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#trend-metric button').forEach(x => x.classList.toggle('active', x === b));
    trendMetric = b.dataset.m; updateTrend();
  });

  function selectStation(i, flashKey) {
    current = i;
    $$('.st-tab').forEach((t, j) => { t.classList.toggle('active', j === i); t.setAttribute('aria-selected', j === i); });
    renderMetrics(STATIONS[i], flashKey);
    renderGuardian(STATIONS[i]);
    if (trendChart) updateTrend();
    icons();
  }

  /* ---------- Budget ---------- */
  const BUDGET = [
    { name: 'Sensors, Mini Testing Lab & Training', amt: 30, color: '#10b981', icon: 'cpu', covers: 'IoT pH/TDS/DO probes, PM2.5 monitors at 4 stations, a village mini-lab and Guardian field training.', sch: 'Item (iv) - Environmental sustainability & ecological balance; quality of soil, air and water.' },
    { name: 'Youth Stipends & ITI Certification (40 Youth)', amt: 30, color: '#14b8a6', icon: 'graduation-cap', covers: '₹6,000/month stipends and NCVT ITI Lab Technician certification for 40 local youth.', sch: 'Item (ii) - Promoting education incl. employment-enhancing vocational skills.' },
    { name: 'Green Belt & Public Data Dashboard', amt: 15, color: '#22d3ee', icon: 'trees', covers: '3,000 native saplings along the plant boundary + this open dashboard and SMS alert system.', sch: 'Item (iv) - Environmental sustainability, agroforestry & conservation.' },
    { name: 'Village Committee & Open-Day Events', amt: 10, color: '#6366f1', icon: 'users', covers: 'Quarterly open reviews, plant open-days and grievance-desk operations in 6 villages.', sch: 'Item (x) - Rural development projects.' },
    { name: 'Independent Third-Party Audit', amt: 5, color: '#f59e0b', icon: 'file-search', covers: 'Quarterly NABL-accredited lab cross-checks and an annual independent CSR impact audit.', sch: 'Supports CSR Rules 2021 - impact assessment (Rule 8(3)).' },
    { name: 'Contingency Reserve', amt: 10, color: '#94a3b8', icon: 'shield', covers: 'Rapid response to incidents (e.g., emergency filtration repair) and sensor replacement.', sch: 'Unspent amount transferred to Unspent CSR Account per Sec. 135(6).' },
  ];
  const bList = $('#budget-list');
  bList.innerHTML = BUDGET.map((b, i) => `
    <li class="b-item" style="--c:${b.color}" data-i="${i}" id="budget-item-${i}" tabindex="0">
      <span class="w-10 h-10 rounded-xl grid place-items-center shrink-0" style="background:${b.color}22;color:${b.color}"><i data-lucide="${b.icon}" class="w-5 h-5"></i></span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">${b.name}</p>
        <div class="bar mt-2 !h-1.5"><i style="width:${b.amt / 30 * 100}%;background:${b.color}"></i></div>
      </div>
      <div class="text-right shrink-0"><p class="font-display font-extrabold text-slate-900 dark:text-white">₹${b.amt} L</p><p class="text-xs text-slate-500">${b.amt}%</p></div>
    </li>`).join('');

  function selectBudget(i) {
    $$('.b-item').forEach((el, j) => el.classList.toggle('active', j === i));
    const d = $('#budget-detail');
    if (i == null) {
      $('#donut-label').textContent = 'Total CSR'; $('#donut-value').textContent = '₹1.00 Cr';
      d.innerHTML = `<p class="text-slate-500">Select a slice or line item. 2% of avg. net profit (Sec. 135) - <b class="text-slate-900 dark:text-white">100% allocated, 0% admin overhead beyond 5% cap.</b></p>`;
      budgetChart.setActiveElements([]); budgetChart.update(); return;
    }
    const b = BUDGET[i];
    $('#donut-label').textContent = b.amt + '% of total'; $('#donut-value').textContent = `₹${b.amt} Lakh`;
    d.innerHTML = `<p class="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${b.color}"></span>${b.name}</p>
      <p class="text-slate-600 dark:text-slate-300 mt-1.5">${b.covers}</p>
      <p class="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex gap-1.5"><i data-lucide="scale" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>Schedule VII: ${b.sch}</p>`;
    budgetChart.setActiveElements([{ datasetIndex: 0, index: i }]); budgetChart.update();
    icons();
  }
  bList.addEventListener('click', e => { const li = e.target.closest('.b-item'); if (li) selectBudget(+li.dataset.i); });
  bList.addEventListener('mouseover', e => { const li = e.target.closest('.b-item'); if (li && matchMedia('(hover:hover)').matches) selectBudget(+li.dataset.i); });
  bList.addEventListener('keydown', e => { if (e.key === 'Enter') { const li = e.target.closest('.b-item'); if (li) selectBudget(+li.dataset.i); } });

  function initBudget() {
    budgetChart = new Chart($('#budgetChart'), {
      type: 'doughnut',
      data: { labels: BUDGET.map(b => b.name), datasets: [{ data: BUDGET.map(b => b.amt), backgroundColor: BUDGET.map(b => b.color), borderColor: isDark() ? '#0f172a' : '#fff', borderWidth: 3, hoverOffset: 14, borderRadius: 6 }] },
      options: {
        cutout: '70%', responsive: true, maintainAspectRatio: true, layout: { padding: 12 },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ₹${c.raw} Lakh (${c.raw}%)` } } },
        onClick: (e, els) => els.length && selectBudget(els[0].index),
        onHover: (e, els) => { if (els.length) selectBudget(els[0].index); },
      },
    });
    selectBudget(null);
  }

  function restyleCharts() {
    [trendChart].forEach(c => { if (!c) return; c.options.scales.x.grid.color = c.options.scales.y.grid.color = gridColor(); c.options.scales.x.ticks.color = c.options.scales.y.ticks.color = tickColor(); c.options.plugins.legend.labels.color = tickColor(); });
    if (trendChart) updateTrend();
    if (budgetChart) { budgetChart.data.datasets[0].borderColor = isDark() ? '#0f172a' : '#fff'; budgetChart.update(); }
  }

  /* ---------- Ethics flip cards ---------- */
  const ETHICS = [
    { t: 'Stakeholder Theory', who: 'R. Edward Freeman', icon: 'network', c: 'from-emerald-500 to-teal-600', q: 'Firms owe duties to everyone affected - not just shareholders.',
      a: ['Villagers co-govern via the Village Committee', 'Local youth gain skills & income', 'Regulators get independent data', 'Shareholders gain social licence to operate'] },
    { t: 'Kantian Ethics', who: 'Right to Know', icon: 'eye', c: 'from-sky-500 to-indigo-600', q: 'Treat people as ends, never merely as means.',
      a: ['Community has a categorical right to know what they breathe & drink', 'Bad numbers published - no deception', 'Universalisable rule: every plant should disclose', 'Consent through open reviews'] },
    { t: 'Utilitarianism', who: 'Bentham & Mill', icon: 'heart-pulse', c: 'from-amber-500 to-orange-600', q: 'Maximise total well-being for the greatest number.',
      a: ['~12,000 residents protected by early alerts', 'PM2.5 down ~45% across stations', '40 livelihoods created', '₹1 Cr cost vs. avoided health & litigation costs'] },
    { t: 'Triple Bottom Line', who: 'John Elkington', icon: 'layers', c: 'from-fuchsia-500 to-purple-600', q: 'People · Planet · Profit - measured together.',
      a: ['People: youth jobs, 86% grievances resolved', 'Planet: cleaner water, 3,000-tree green belt', 'Profit: trust, ESG ratings, lower regulatory risk', 'Audited quarterly, published monthly'] },
  ];
  $('#ethics-grid').innerHTML = ETHICS.map((e, i) => `
    <div class="flip reveal" id="ethics-card-${i}" tabindex="0" role="button" aria-label="Flip ${e.t} card">
      <div class="flip-inner">
        <div class="flip-face glass-card">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br ${e.c} grid place-items-center shadow-lg"><i data-lucide="${e.icon}" class="w-6 h-6 text-white"></i></span>
          <p class="text-xs uppercase tracking-widest text-slate-500 mt-5">${e.who}</p>
          <h3 class="font-display font-extrabold text-xl text-slate-900 dark:text-white mt-1">${e.t}</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">“${e.q}”</p>
          <p class="mt-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i data-lucide="rotate-3d" class="w-4 h-4"></i>Tap to see how we comply</p>
        </div>
        <div class="flip-face flip-back bg-gradient-to-br ${e.c} text-white shadow-xl">
          <p class="flex items-center gap-2 font-display font-bold"><i data-lucide="check-circle-2" class="w-5 h-5"></i>${e.t}</p>
          <ul class="mt-4 space-y-2.5 text-sm">${e.a.map(x => `<li class="flex gap-2"><span class="opacity-70">▸</span>${x}</li>`).join('')}</ul>
          <p class="mt-auto text-xs opacity-80">Tap to flip back</p>
        </div>
      </div>
    </div>`).join('');
  $$('.flip').forEach(f => {
    f.addEventListener('click', () => f.classList.toggle('flipped'));
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('flipped'); } });
  });

  /* ---------- Youth grid ---------- */
  $('#youth-grid').innerHTML = GUARDIANS.map(g => `
    <div class="text-center p-4 rounded-2xl bg-slate-500/5 border border-slate-500/10 hover:border-emerald-500/40 transition">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${g.color} grid place-items-center text-white font-display font-extrabold text-lg">${initials(g.name)}</div>
      <p class="mt-2 font-semibold text-slate-900 dark:text-white text-sm">${g.name}</p>
      <p class="text-xs font-mono text-slate-500">#${g.id}</p>
      <p class="text-[11px] text-slate-500 mt-0.5">${g.role}</p>
      <span class="status safe mt-2"><i data-lucide="award" class="w-3 h-3"></i>ITI</span>
    </div>`).join('') + `
    <div class="col-span-2 sm:col-span-4 mt-2 grid grid-cols-3 gap-3 text-center">
      <div class="p-3 rounded-xl bg-emerald-500/10"><p class="font-display font-extrabold text-2xl text-slate-900 dark:text-white">50%</p><p class="text-xs text-slate-500">Women Guardians</p></div>
      <div class="p-3 rounded-xl bg-emerald-500/10"><p class="font-display font-extrabold text-2xl text-slate-900 dark:text-white">6</p><p class="text-xs text-slate-500">Villages covered</p></div>
      <div class="p-3 rounded-xl bg-emerald-500/10"><p class="font-display font-extrabold text-2xl text-slate-900 dark:text-white">17,280</p><p class="text-xs text-slate-500">Readings logged</p></div>
    </div>`;

  /* ---------- Action log filter ---------- */
  $('#log-filter').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#log-filter button').forEach(x => x.classList.toggle('active', x === b));
    const f = b.dataset.f;
    $$('.log-card').forEach(c => c.classList.toggle('hide', f !== 'all' && c.dataset.type !== f));
  });

  /* ---------- Countdown ---------- */
  const meeting = new Date('2026-12-05T10:00:00+05:30').getTime();
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    let d = Math.max(0, meeting - Date.now()) / 1000;
    $('#cd-d').textContent = pad(Math.floor(d / 86400)); d %= 86400;
    $('#cd-h').textContent = pad(Math.floor(d / 3600)); d %= 3600;
    $('#cd-m').textContent = pad(Math.floor(d / 60));
    $('#cd-s').textContent = pad(Math.floor(d % 60));
  }
  tick(); setInterval(tick, 1000);

  /* ---------- Tickets (real-time via /api/tickets on Vercel, local fallback) ---------- */
  const TYPE_ICON = { Water: 'droplets', Air: 'wind', Waste: 'trash-2' };
  const H = 3600e3, NOW = Date.now();
  const SEED = [
    { id: 'GG-2026-088', name: 'Lakshmi P.', village: 'Puzhayoram (East)', type: 'Water', desc: 'Slight odour from hand-pump near temple', guardian: 'Anoop Varghese', gid: 'GG-07', status: 'In progress', ts: NOW - 3 * H },
    { id: 'GG-2026-087', name: 'Thomas K.', village: 'Pachakkara (North)', type: 'Air', desc: 'Dust from trucks on school road during mornings', guardian: 'Arjun Menon', gid: 'GG-14', status: 'Resolved', ts: NOW - 26 * H },
    { id: 'GG-2026-086', name: 'Fathima S.', village: 'Kuttikkadavu', type: 'Waste', desc: 'Packaging scrap dumped near canal bund', guardian: 'Sreejith Nair', gid: 'GG-31', status: 'Resolved', ts: NOW - 5 * 24 * H },
  ];
  const VILLAGE_GUARDIAN = { 'Pachakkara (North)': 0, 'Puzhayoram (East)': 1, 'Kavumthazham (South)': 2, 'Thengumpadam (West)': 3, 'Manjadikunnu': 1, 'Kuttikkadavu': 3 };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const statusCls = s => s === 'Resolved' ? 'safe' : s === 'In progress' ? 'info' : 'watch';
  const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'Just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' hr ago'; return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); };
  let LIVE = false, known = new Set(), localTickets = [...SEED], currentTicketsList = [...SEED];
  let isModerator = sessionStorage.getItem('gg-admin') === 'true';
  let submissionsFrozen = false;
  const getAdminPin = () => sessionStorage.getItem('gg-pin') || '2026';

  function setFrozenState(frozen) {
    submissionsFrozen = !!frozen;
    const notice = $('#drawer-frozen-notice');
    const form = $('#report-form');
    const freezeBtn = $('#toggle-freeze-btn');
    const freezeLabel = $('#freeze-btn-label');
    if (notice) notice.classList.toggle('hidden', !submissionsFrozen);
    if (form) {
      if (submissionsFrozen) form.classList.add('hidden');
      else if ($('#report-success').classList.contains('hidden')) form.classList.remove('hidden');
    }
    if (freezeLabel) freezeLabel.textContent = submissionsFrozen ? 'Resume Reports' : 'Pause Reports';
    if (freezeBtn) {
      freezeBtn.classList.toggle('text-rose-500', submissionsFrozen);
      freezeBtn.classList.toggle('text-amber-500', !submissionsFrozen);
      freezeBtn.title = submissionsFrozen ? 'Resume new issue submissions' : 'Pause new issue submissions';
      const ic = freezeBtn.querySelector('svg, i');
      if (ic) {
        ic.outerHTML = `<i data-lucide="${submissionsFrozen ? 'play-circle' : 'pause-circle'}" class="w-3.5 h-3.5"></i>`;
        icons();
      }
    }
    if (currentTicketsList) updateGlobalMetrics(currentTicketsList);
  }

  function ticketHTML(t, isNew) {
    const isRes = t.status === 'Resolved', isProg = t.status === 'In progress';
    const ic = isRes ? 'check-circle-2' : isProg ? 'clock' : 'alert-circle';
    const statusControl = isModerator
      ? `<button class="status ${statusCls(t.status)} ticket-status-btn cursor-pointer transition hover:opacity-80 active:scale-95" title="Click to cycle status: Assigned → In progress → Resolved" data-id="${esc(t.id)}" data-status="${esc(t.status)}">
          <i data-lucide="${ic}" class="w-3 h-3"></i>
          <span>${esc(t.status)}</span>
        </button>`
      : `<span class="status ${statusCls(t.status)}">
          <i data-lucide="${ic}" class="w-3 h-3"></i>
          <span>${esc(t.status)}</span>
        </span>`;

    const delControl = isModerator
      ? `<button class="ticket-del-btn text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition" title="Delete this ticket" data-id="${esc(t.id)}">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>`
      : '';

    return `<li class="ticket ${isNew ? 'new' : ''}" data-id="${esc(t.id)}">
      <div class="flex items-center justify-between gap-2">
        <span class="font-mono text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><i data-lucide="${TYPE_ICON[t.type] || 'circle'}" class="w-3.5 h-3.5 text-emerald-500"></i>#${esc(t.id)}</span>
        <div class="flex items-center gap-1.5">
          ${statusControl}
          ${delControl}
        </div>
      </div>
      <p class="text-sm text-slate-700 dark:text-slate-300 mt-1.5 line-clamp-2">${esc(t.desc)}</p>
      <p class="text-[11px] text-slate-500 mt-1.5"><b class="text-slate-700 dark:text-slate-300">${esc(t.name)}</b> · ${esc(t.village)} · ${ago(t.ts)} · → ${esc(t.guardian)} (#${esc(String(t.gid).split('-')[1])})</p>
    </li>`;
  }
  function updateGlobalMetrics(list) {
    if (!list || !list.length) return;
    const total = list.length;
    const resolved = list.filter(t => t.status === 'Resolved').length;
    const assigned = list.filter(t => t.status === 'Assigned').length;
    const inProgress = list.filter(t => t.status === 'In progress').length;
    const pct = Math.round((resolved / total) * 100);

    const heroPct = $('#hero-resolved-pct');
    if (heroPct) {
      heroPct.textContent = pct;
      heroPct.dataset.target = pct;
    }

    const sumEl = $('#ticket-summary-pills');
    if (sumEl) {
      sumEl.innerHTML = `
        <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Total: ${total}</span>
        <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">Assigned: ${assigned}</span>
        <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400">In Progress: ${inProgress}</span>
        <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Resolved: ${resolved} (${pct}%)</span>
        ${submissionsFrozen ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-1"><i data-lucide="pause-circle" class="w-3 h-3"></i>Reports Paused</span>' : ''}
      `;
    }
  }

  function renderFeed(list, fresh = new Set()) {
    currentTicketsList = list;
    $('#ticket-feed').innerHTML = list.map(t => ticketHTML(t, fresh.has(t.id))).join('');
    $('#feed-mode').innerHTML = LIVE ? '<span class="pulse-dot"></span>Live · synced across devices' : 'Demo mode · this device only';
    updateGlobalMetrics(list);
    icons();
  }

  function updateModeratorUI() {
    const btn = $('#admin-lock-btn');
    const resetBtn = $('#reset-tickets-btn');
    const freezeBtn = $('#toggle-freeze-btn');
    const hint = $('#moderator-hint');
    if (btn) {
      btn.innerHTML = `<i data-lucide="${isModerator ? 'unlock' : 'lock'}" class="w-3.5 h-3.5"></i>`;
      btn.classList.toggle('text-emerald-500', isModerator);
      btn.classList.toggle('border-emerald-500', isModerator);
      btn.classList.toggle('text-slate-400', !isModerator);
      btn.title = isModerator ? 'Guardian Mode Active (Click to lock)' : 'Guardian Login (Moderator Mode)';
    }
    if (resetBtn) resetBtn.classList.toggle('hidden', !isModerator);
    if (freezeBtn) freezeBtn.classList.toggle('hidden', !isModerator);
    if (hint) hint.classList.toggle('hidden', !isModerator);
    icons();
    renderFeed(currentTicketsList);
  }

  $('#toggle-freeze-btn')?.addEventListener('click', async () => {
    if (!isModerator) return;
    const nextFrozen = !submissionsFrozen;
    setFrozenState(nextFrozen);
    toast(nextFrozen ? 'pause-circle' : 'play-circle', nextFrozen ? 'New Submissions Paused' : 'Submissions Resumed', nextFrozen ? 'Mass spam blocked during presentation' : 'Public reporting enabled');
    if (LIVE) {
      try {
        await fetch('/api/tickets', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': getAdminPin()
          },
          body: JSON.stringify({ action: 'freeze', frozen: nextFrozen, pin: getAdminPin() })
        });
      } catch (err) {
        console.error('Failed to sync freeze state:', err);
      }
    }
  });

  $('#admin-lock-btn')?.addEventListener('click', () => {
    if (isModerator) {
      isModerator = false;
      sessionStorage.removeItem('gg-admin');
      sessionStorage.removeItem('gg-pin');
      toast('lock', 'Guardian Mode Locked', 'Moderator controls disabled');
      updateModeratorUI();
    } else {
      const pin = prompt('Enter Guardian Moderator PIN to unlock controls:');
      if (!pin) return;
      if (pin === '2026') {
        isModerator = true;
        sessionStorage.setItem('gg-admin', 'true');
        sessionStorage.setItem('gg-pin', pin);
        toast('shield-check', 'Guardian Mode Active', 'Ticket editing & deletion unlocked');
        updateModeratorUI();
      } else {
        alert('Incorrect PIN. Moderator controls remained locked.');
      }
    }
  });

  // Handle status cycling and ticket deletion (only active when isModerator is true)
  $('#ticket-feed').addEventListener('click', async e => {
    if (!isModerator) return;

    // 1. Status cycling
    const statusBtn = e.target.closest('.ticket-status-btn');
    if (statusBtn) {
      e.stopPropagation();
      const id = statusBtn.dataset.id;
      const cur = statusBtn.dataset.status;
      const next = cur === 'Assigned' ? 'In progress' : cur === 'In progress' ? 'Resolved' : 'Assigned';

      const item = currentTicketsList.find(t => t.id === id) || localTickets.find(t => t.id === id) || SEED.find(t => t.id === id);
      if (item) item.status = next;
      renderFeed(currentTicketsList);
      toast('refresh-cw', `Ticket #${id} status updated`, `New status: ${next}`);

      if (LIVE) {
        try {
          await fetch('/api/tickets', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-pin': getAdminPin()
            },
            body: JSON.stringify({ id, status: next, pin: getAdminPin() })
          });
        } catch (err) {
          console.error('Failed to sync status update:', err);
        }
      }
      return;
    }

    // 2. Ticket deletion
    const delBtn = e.target.closest('.ticket-del-btn');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.dataset.id;
      if (!confirm(`Delete ticket #${id}?`)) return;

      const li = delBtn.closest('li.ticket');
      if (li) {
        li.style.transition = 'opacity .25s, transform .25s';
        li.style.opacity = '0';
        li.style.transform = 'translateX(20px)';
        setTimeout(() => li.remove(), 250);
      }

      localTickets = localTickets.filter(t => t.id !== id);
      known.delete(id);

      toast('trash-2', `Ticket #${id} deleted`, 'Removed from live feed');

      if (LIVE) {
        try {
          await fetch(`/api/tickets?id=${encodeURIComponent(id)}&pin=${encodeURIComponent(getAdminPin())}`, {
            method: 'DELETE',
            headers: { 'x-admin-pin': getAdminPin() }
          });
        } catch (err) {
          console.error('Failed to sync deletion:', err);
        }
      }
      return;
    }
  });

  // Reset button in feed header (only visible when isModerator is true)
  $('#reset-tickets-btn')?.addEventListener('click', async () => {
    if (!isModerator) return;
    if (!confirm('Clear all submitted test tickets and reset back to baseline?')) return;
    localTickets = [...SEED];
    known.clear();
    SEED.forEach(s => known.add(s.id));
    renderFeed(localTickets);
    toast('rotate-ccw', 'Feed reset', 'Test tickets cleared');
    if (LIVE) {
      try {
        await fetch(`/api/tickets?reset=true&pin=${encodeURIComponent(getAdminPin())}`, {
          method: 'DELETE',
          headers: { 'x-admin-pin': getAdminPin() }
        });
      } catch (err) {
        console.error('Failed to sync reset:', err);
      }
    }
  });

  async function loadTickets(first) {
    try {
      const r = await fetch('/api/tickets', { cache: 'no-store' });
      if (!r.ok) throw 0;
      const d = await r.json();
      LIVE = !!d.live;
      if (typeof d.frozen === 'boolean' && d.frozen !== submissionsFrozen) {
        setFrozenState(d.frozen);
      }
      const list = d.tickets && d.tickets.length ? d.tickets : SEED;
      const fresh = new Set(first ? [] : list.filter(t => !known.has(t.id)).map(t => t.id));
      list.forEach(t => known.add(t.id));
      localTickets = list;
      renderFeed(list, fresh);
      fresh.forEach(id => { const t = list.find(x => x.id === id); if (t && t.id !== lastMine) toast('bell-ring', `New community ticket <b>#${esc(t.id)}</b>`, `${esc(t.type)} · ${esc(t.village)} · by ${esc(t.name)}`); });
    } catch { LIVE = false; if (first) renderFeed(localTickets); }
  }
  let lastMine = null;
  loadTickets(true);
  setInterval(() => { if (LIVE && !document.hidden) loadTickets(false); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && LIVE) loadTickets(false); });

  /* ---------- Drawer ---------- */
  let openedAt = 0;
  const openDrawer = () => { openedAt = Date.now(); document.body.classList.add('drawer-open'); $('#drawer').setAttribute('aria-hidden', 'false'); };
  const closeDrawer = () => {
    document.body.classList.remove('drawer-open'); $('#drawer').setAttribute('aria-hidden', 'true');
    setTimeout(() => { $('#report-form').classList.remove('hidden'); $('#report-success').classList.add('hidden'); }, 300);
  };
  $$('.open-report').forEach(b => b.addEventListener('click', openDrawer));
  $('#close-drawer').addEventListener('click', closeDrawer);
  $('#drawer-overlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => e.key === 'Escape' && closeDrawer());
  $('#f-desc').addEventListener('input', e => { $('#desc-count').textContent = `${e.target.value.length}/300`; });

  // Client-side checks mirror the server (server is the real gatekeeper)
  const BAD = ['fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'porn', 'sex', 'idiot', 'stupid', 'loser', 'myre', 'myran', 'poori', 'thendi', 'kunna', 'pottan', 'naaye'];
  function clientValidate(name, desc) {
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,39}$/u.test(name)) return 'Enter a valid name (letters only, 2-40 characters).';
    if (desc.length < 15) return 'Description must be at least 15 characters.';
    if (desc.split(/\s+/).filter(w => w.length > 1).length < 3) return 'Please describe the issue in a few words.';
    if (/(https?:\/\/|www\.|\.com|\.in\b|@)/i.test(desc + name)) return 'Links, emails or handles are not allowed.';
    if (/(.)\1{4,}/u.test(desc + name)) return 'Please avoid repeated characters.';
    const l = (desc + ' ' + name).toLowerCase();
    if (BAD.some(w => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(l))) return 'Please keep the report respectful.';
    if (Date.now() - openedAt < 4000) return 'Please take a moment to fill the form properly.';
    const last = +localStorage.getItem('gg-last') || 0;
    if (Date.now() - last < 60000) return `Please wait ${Math.ceil((60000 - (Date.now() - last)) / 1000)}s before submitting another report.`;
    return null;
  }
  const showErr = m => { const el = $('#form-error'); el.textContent = m || ''; el.classList.toggle('hidden', !m); };

  $('#report-form').addEventListener('submit', async e => {
    e.preventDefault(); showErr('');
    if (submissionsFrozen) {
      return showErr('New issue reporting is currently paused by the Guardian Desk.');
    }
    const name = $('#f-name').value.trim().replace(/\s+/g, ' ');
    const village = $('#f-village').value, type = $('input[name=type]:checked').value, desc = $('#f-desc').value.trim().replace(/\s+/g, ' ');
    if ($('#f-website').value) return showErr('Spam detected.');
    if (!village) return showErr('Please select your village.');
    const err = clientValidate(name, desc); if (err) return showErr(err);

    const btn = $('#submit-report');
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>Routing to nearest Guardian…'; icons();
    let t;
    try {
      if (LIVE) {
        const r = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, village, type, desc, website: '', elapsed: Date.now() - openedAt }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not submit.');
        t = d.ticket; known.add(t.id); lastMine = t.id;
      } else {
        await new Promise(r => setTimeout(r, 800));
        const g = GUARDIANS[VILLAGE_GUARDIAN[village] ?? 0];
        const n = 88 + localTickets.length - SEED.length + 1;
        t = { id: `GG-2026-${String(n).padStart(3, '0')}`, name, village, type, desc, guardian: g.name, gid: g.id, status: 'Assigned', ts: Date.now() };
      }
    } catch (ex) {
      btn.disabled = false; btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i>Submit Report'; icons();
      return showErr(ex.message);
    }
    localStorage.setItem('gg-last', Date.now());
    const g = GUARDIANS.find(x => x.name === t.guardian) || GUARDIANS[0];
    $('#report-form').classList.add('hidden'); $('#report-success').classList.remove('hidden');
    $('#s-ticket').textContent = '#' + t.id;
    $('#s-guardian').innerHTML = `<div class="w-12 h-12 rounded-xl bg-gradient-to-br ${g.color} grid place-items-center text-white font-bold shrink-0">${initials(g.name)}</div>
      <div class="text-sm"><p class="text-slate-500 text-xs">Assigned Guardian</p><p class="font-semibold text-slate-900 dark:text-white">${g.name} · #${g.id}</p><p class="text-xs text-emerald-600 dark:text-emerald-400">ETA site visit: within 24 hrs</p></div>`;
    if (LIVE) { await loadTickets(true); $('#ticket-feed li')?.classList.add('new'); }
    else { localTickets.unshift(t); renderFeed(localTickets, new Set([t.id])); }
    btn.disabled = false; btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i>Submit Report';
    $('#report-form').reset(); $('#desc-count').textContent = '0/300';
    toast('ticket', `Ticket <b>#${esc(t.id)}</b> logged publicly`, `${esc(type)} issue · ${esc(village)} → ${esc(g.name)}`);
  });
  $('#s-close').addEventListener('click', () => { closeDrawer(); setTimeout(() => { $$('#log-filter button')[0].click(); $('#tickets-card').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250); });

  /* ---------- Toasts ---------- */
  function toast(icon, title, sub) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="w-8 h-8 rounded-lg bg-emerald-500/20 grid place-items-center shrink-0"><i data-lucide="${icon}" class="w-4 h-4 text-emerald-400"></i></span><div><p class="font-semibold text-white">${title}</p><p class="text-xs text-slate-400 mt-0.5">${sub}</p></div>`;
    $('#toast-stack').prepend(el); icons();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4200);
  }

  /* ---------- Simulate ping ---------- */
  let pingCount = 0;
  $('#ping-btn').addEventListener('click', function () {
    this.classList.remove('spin'); void this.offsetWidth; this.classList.add('spin');
    const s = STATIONS[1];
    const ph = pingCount === 0 ? 7.1 : +(7.0 + Math.random() * 0.3).toFixed(1);
    pingCount++;
    s.ph = ph;
    const now = new Date(), time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    toast('radio-tower', `New reading received from Station 2: pH ${ph} - Verified &amp; Logged`, `Guardian #07 (Anoop Varghese) · ${time}`);
    $('#live-status').innerHTML = `<span class="pulse-dot"></span>System Active • Last Updated: Today, ${time} by Guardian #07 (Anoop Varghese)`;
    if (current === 1) renderMetrics(s, 'ph');
  });

  /* ---------- Counters ---------- */
  function runCounters() {
    $$('.counter').forEach(el => {
      const to = +el.dataset.target, dec = +(el.dataset.decimals || 0), t0 = performance.now(), d = 1600;
      const step = t => { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 4); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Reveal + active nav ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
  const navIO = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) $$('.nav-link').forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['monitor', 'actions', 'youth', 'budget', 'team'].forEach(id => navIO.observe(document.getElementById(id)));

  /* ---------- Init ---------- */
  icons();
  if (window.Chart) { Chart.defaults.font.family = 'Inter'; initTrend(); initBudget(); }
  selectStation(0);
  runCounters();
  updateModeratorUI();
})();
