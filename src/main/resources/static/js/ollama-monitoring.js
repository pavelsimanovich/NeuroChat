(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const element = id => document.getElementById(id);
    const status = element('ollamaStatus');
    if (!status) return;
    const keys = ['memory', 'vram'];
    const history = [];
    let busy = false;
    let timer = null;
    let stopped = false;
    const interval = () => Math.max(3000, Number(element('metricsIntervalSelect').value) || 5000);
    const range = () => (Number(element('timeRangeSelect').value) || 15) * 60000;
    const validBytes = value => Number.isFinite(value) && value >= 0;
    const gib = value => validBytes(value) ? `${(value / 1073741824).toFixed(2)} GiB` : '—';
    const sum = (models, field) => models.every(model => validBytes(model[field]))
      ? models.reduce((total, model) => total + model[field], 0) : null;
    const chart = new Chart(element('ollamaMemoryChart'), {
      type: 'line',
      data: { datasets: [
        { label: 'Память моделей, GiB', data: [], borderColor: '#fd7e14', pointRadius: 0, tension: 0, spanGaps: false },
        { label: 'Из неё VRAM, GiB', data: [], borderColor: '#6f42c1', pointRadius: 0, tension: 0, spanGaps: false }
      ] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: { type: 'linear', ticks: { maxTicksLimit: 7, maxRotation: 0, callback: value => new Date(value).toLocaleTimeString() } },
          y: { beginAtZero: true, title: { display: true, text: 'GiB' } }
        },
        plugins: { tooltip: { callbacks: {
          title: items => items.length ? new Date(items[0].parsed.x).toLocaleTimeString() : '',
          label: item => `${item.dataset.label}: ${item.parsed.y == null ? '—' : item.parsed.y.toFixed(2)}`
        } } }
      }
    });

    function refreshChart() {
      const now = Date.now();
      const samples = history.filter(sample => sample.x >= now - range());
      keys.forEach((key, index) => {
        chart.data.datasets[index].data = samples.map(sample => ({ x: sample.x, y: sample[key] }));
      });
      chart.options.scales.x.min = now - range();
      chart.options.scales.x.max = now;
      chart.update('none');
    }

    function theme() {
      const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
      const color = dark ? '#adb5bd' : '#495057';
      const grid = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      for (const axis of Object.values(chart.options.scales)) {
        axis.ticks = { ...axis.ticks, color };
        axis.grid = { ...axis.grid, color: grid };
        if (axis.title) axis.title.color = color;
      }
      chart.options.plugins.legend = { labels: { color } };
      chart.update('none');
    }

    function message(text) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.className = 'text-muted text-center py-3';
      cell.textContent = text;
      row.append(cell);
      element('ollamaProcesses').replaceChildren(row);
    }

    function render(models) {
      element('ollamaCount').textContent = models.length;
      element('ollamaMemory').textContent = gib(sum(models, 'size'));
      element('ollamaVram').textContent = gib(sum(models, 'size_vram'));
      if (!models.length) {
        message('Нет загруженных моделей');
        return;
      }
      const rows = models.map(model => {
        const row = document.createElement('tr');
        const expiry = new Date(model.expires_at);
        const values = [
          model.name || model.model || '—',
          [model.details?.parameter_size, model.details?.quantization_level].filter(Boolean).join(' / ') || '—',
          gib(model.size), gib(model.size_vram),
          Number.isFinite(model.context_length) ? model.context_length.toLocaleString() : '—',
          Number.isFinite(expiry.getTime()) ? expiry.toLocaleString() : '—'
        ];
        for (const value of values) {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        }
        return row;
      });
      element('ollamaProcesses').replaceChildren(...rows);
    }

    async function sample() {
      if (busy || stopped || document.hidden) return;
      busy = true;
      const point = { x: Date.now(), memory: null, vram: null };
      try {
        const response = await fetch('/api/admin/monitoring/ollama', {
          cache: 'no-store', signal: AbortSignal.timeout(8000)
        });
        if (!response.ok || response.redirected) throw new Error('Ollama unavailable');
        const data = await response.json();
        if (data.available !== true || !Array.isArray(data.models)
            || data.models.some(model => !model || typeof model !== 'object')) {
          throw new Error('Invalid Ollama response');
        }
        point.x = Date.now();
        const memory = sum(data.models, 'size');
        const vram = sum(data.models, 'size_vram');
        point.memory = memory == null ? null : memory / 1073741824;
        point.vram = vram == null ? null : vram / 1073741824;
        render(data.models);
        status.textContent = `Доступна · ${new Date(point.x).toLocaleTimeString()}`;
        status.className = 'small text-success';
      } catch (error) {
        for (const id of ['ollamaCount', 'ollamaMemory', 'ollamaVram']) element(id).textContent = '—';
        message('Не удалось получить данные Ollama');
        status.textContent = 'Ollama недоступна';
        status.className = 'small text-warning';
      } finally {
        const previous = history.at(-1);
        if (previous && point.x - previous.x > interval() * 2.5) {
          history.push({ x: previous.x + 1, memory: null, vram: null });
        }
        history.push(point);
        while (history.length && history[0].x < Date.now() - 21600000) history.shift();
        refreshChart();
        busy = false;
        clearTimeout(timer);
        if (!stopped && !document.hidden) timer = setTimeout(sample, interval());
      }
    }

    element('timeRangeSelect').addEventListener('change', refreshChart);
    element('metricsIntervalSelect').addEventListener('change', () => {
      clearTimeout(timer);
      sample();
    });
    document.addEventListener('visibilitychange', () => {
      clearTimeout(timer);
      if (!document.hidden) sample();
    });
    window.addEventListener('pagehide', () => {
      stopped = true;
      clearTimeout(timer);
    });
    window.addEventListener('pageshow', () => {
      if (stopped) {
        stopped = false;
        sample();
      }
    });
    new MutationObserver(theme).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-bs-theme']
    });
    theme();
    sample();
  });
})();
