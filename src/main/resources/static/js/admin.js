(function(){
  function fetchJSON(url, opts){
    return fetch(url, Object.assign({headers: {'Content-Type': 'application/json'}}, opts)).then(r=>r.json());
  }

  // Simple rolling buffer
  const MAX_POINTS = 60; // last 60 samples (~3 minutes if 3s interval)
  const state = {
    charts: {
      rps: null,
      cpu: null,
      heap: null,
    },
    series: {
      timestamps: [],
      labels: [],
      rps: [],
      cpu: [],
      heap: []
    },
    prev: {
      httpCount: null,
      ts: null
    },
    poll: {
      id: null,
      ms: 5000
    },
    timeRange: 15, // minutes
    users: {
      statsIntervalId: null
    },
    // Store raw data for the max time range (6 hours)
    rawData: {
      timestamps: [],
      rps: [],
      cpu: [],
      heap: []
    }
  };

  async function loadUserStats(){
    try {
      const data = await fetchJSON('/api/admin/users/stats');
      const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = (v ?? '—'); };
      set('userStatTotal', data.total);
      set('userStatNew24h', data.new24h);
      set('userStatNew7d', data.new7d);
    } catch(e){ /* ignore */ }
  }

  function getMeasurementByStat(measurements, stat){
    if(!Array.isArray(measurements)) return null;
    const m = measurements.find(x => (x.statistic||'').toUpperCase() === stat.toUpperCase());
    return m ? m.value : null;
  }

  async function fetchMetric(name, query){
    const url = query ? `/actuator/metrics/${name}?${query}` : `/actuator/metrics/${name}`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('metric fetch failed');
    return r.json();
  }

  async function sampleMetrics(){
    const now = Date.now();

    // Uptime
    try {
      const up = await fetchMetric('process.uptime');
      const upVal = up.measurements?.[0]?.value ?? 0;

      const hours = Math.floor(upVal / 3600);
      const minutes = Math.floor((upVal % 3600) / 60);
      const seconds = Math.floor(upVal % 60);
      
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const uptimeElement = document.getElementById('uptime');
      if (uptimeElement) {
        uptimeElement.textContent = formattedTime;
      }
    } catch(e) {}

    // Collect all metrics first to ensure synchronization
    let rpsValue = null;
    let cpuValue = null;
    let heapValue = null;

    // HTTP Requests per second (derived from COUNT delta / deltaTime)
    try {
      const http = await fetchMetric('http.server.requests');
      const count = getMeasurementByStat(http.measurements, 'COUNT') ?? null;
      if(count != null){
        if(state.prev.httpCount != null && state.prev.ts != null){
          const dt = (now - state.prev.ts) / 1000.0;
          const dc = Math.max(0, count - state.prev.httpCount);
          rpsValue = dt > 0 ? dc / dt : 0;
          const rpsElement = document.getElementById('httpRps');
          if (rpsElement) {
            rpsElement.textContent = rpsValue.toFixed(2);
          }
        }
        state.prev.httpCount = count;
        state.prev.ts = now;
      }
    } catch(e) {
      // Silent fail
    }

    // CPU: process.cpu.usage -> 0..1
    try {
      const cpu = await fetchMetric('process.cpu.usage');
      const val = cpu.measurements?.[0]?.value ?? 0;
      cpuValue = (val || 0) * 100;
    } catch(e) {
      // Silent fail
    }

    // Heap: jvm.memory.used?tag=area:heap -> bytes
    try {
      const heap = await fetchMetric('jvm.memory.used', 'tag=area:heap');
      const bytes = heap.measurements?.[0]?.value ?? 0;
      heapValue = bytes / (1024*1024);
    } catch(e) {
      // Silent fail
    }

    // Push all points in order to maintain synchronization
    if (rpsValue !== null) pushPoint(rpsValue, 'rps');
    if (cpuValue !== null) pushPoint(cpuValue, 'cpu');
    if (heapValue !== null) pushPoint(heapValue, 'heap');
  }

  function getMaxPoints() {
    // Calculate max points based on time range and polling interval
    const points = Math.ceil((state.timeRange * 60 * 1000) / state.poll.ms);
    return Math.min(points, 1000); // Cap at 1000 points for performance
  }

  function filterDataForTimeRange() {
    const now = Date.now();
    const timeAgo = now - (state.timeRange * 60 * 1000);
    
    // Ensure we have data to process
    if (state.rawData.timestamps.length === 0) {
      state.series = {
        timestamps: [],
        labels: [],
        rps: [],
        cpu: [],
        heap: []
      };
      return;
    }
    
    // Ensure all raw data arrays have the same length
    const dataLength = state.rawData.timestamps.length;
    while (state.rawData.rps.length < dataLength) state.rawData.rps.push(null);
    while (state.rawData.cpu.length < dataLength) state.rawData.cpu.push(null);
    while (state.rawData.heap.length < dataLength) state.rawData.heap.push(null);
    
    // Trim arrays if they're longer than timestamps
    if (state.rawData.rps.length > dataLength) state.rawData.rps.length = dataLength;
    if (state.rawData.cpu.length > dataLength) state.rawData.cpu.length = dataLength;
    if (state.rawData.heap.length > dataLength) state.rawData.heap.length = dataLength;
    
    // Find the index of the first point within the time range
    const firstIndex = state.rawData.timestamps.findIndex(ts => ts >= timeAgo);
    
    // If no points in range, use empty arrays
    if (firstIndex === -1) {
      state.series = {
        timestamps: [],
        labels: [],
        rps: [],
        cpu: [],
        heap: []
      };
      return;
    }
    
    // Slice the data to only include points within the time range
    state.series.timestamps = state.rawData.timestamps.slice(firstIndex);
    state.series.labels = state.rawData.timestamps
      .slice(firstIndex)
      .map(ts => new Date(ts).toLocaleTimeString());
    state.series.rps = state.rawData.rps.slice(firstIndex);
    state.series.cpu = state.rawData.cpu.slice(firstIndex);
    state.series.heap = state.rawData.heap.slice(firstIndex);
    
    // If we have too many points, downsample for better performance
    const maxPoints = getMaxPoints();
    if (state.series.timestamps.length > maxPoints) {
      const step = Math.ceil(state.series.timestamps.length / maxPoints);
      
      const downsample = (arr) => {
        const result = [];
        for (let i = 0; i < arr.length; i += step) {
          result.push(arr[i]);
        }
        return result;
      };
      
      state.series.timestamps = downsample(state.series.timestamps);
      state.series.labels = state.series.timestamps.map(ts => new Date(ts).toLocaleTimeString());
      state.series.rps = downsample(state.series.rps);
      state.series.cpu = downsample(state.series.cpu);
      state.series.heap = downsample(state.series.heap);
    }
  }

  function pushPoint(value, key) {
    const now = Date.now();
    
    // Ensure all raw data arrays have the same length before adding new point
    const currentLength = state.rawData.timestamps.length;
    if (key === 'rps' && state.rawData.rps.length < currentLength) {
      while (state.rawData.rps.length < currentLength) state.rawData.rps.push(null);
    }
    if (key === 'cpu' && state.rawData.cpu.length < currentLength) {
      while (state.rawData.cpu.length < currentLength) state.rawData.cpu.push(null);
    }
    if (key === 'heap' && state.rawData.heap.length < currentLength) {
      while (state.rawData.heap.length < currentLength) state.rawData.heap.push(null);
    }
    
    // Add to raw data (keeps all points for up to 6 hours)
    if (key === 'rps') {
      state.rawData.timestamps.push(now);
      state.rawData.rps.push(value);
    } else if (key === 'cpu') {
      // Only push timestamp if this is the first metric in the cycle
      if (state.rawData.cpu.length === state.rawData.timestamps.length - 1) {
        state.rawData.cpu.push(value);
      } else {
        // Replace null with actual value
        state.rawData.cpu[state.rawData.cpu.length - 1] = value;
      }
    } else if (key === 'heap') {
      // Only push timestamp if this is the first metric in the cycle
      if (state.rawData.heap.length === state.rawData.timestamps.length - 1) {
        state.rawData.heap.push(value);
      } else {
        // Replace null with actual value
        state.rawData.heap[state.rawData.heap.length - 1] = value;
      }
    }
    
    // Clean up old data (older than 6 hours)
    const sixHoursAgo = now - (360 * 60 * 1000);
    const firstValidIndex = state.rawData.timestamps.findIndex(ts => ts >= sixHoursAgo);
    
    if (firstValidIndex > 0) {
      state.rawData.timestamps = state.rawData.timestamps.slice(firstValidIndex);
      state.rawData.rps = state.rawData.rps.slice(firstValidIndex);
      state.rawData.cpu = state.rawData.cpu.slice(firstValidIndex);
      state.rawData.heap = state.rawData.heap.slice(firstValidIndex);
    }
    
    // Filter data for current time range and update charts
    filterDataForTimeRange();
    
    // Update the specific chart
    updateChart(key);
    
    // If this is the last metric in the sampling cycle, update all charts to ensure consistency
    if (key === 'heap') {
      updateChart('rps');
      updateChart('cpu');
    }
  }

  function createChart(ctx, label, color){
    const theme = getChartTheme();
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: state.series.labels,
        datasets: [{
          label,
          data: [],
          borderColor: color,
          backgroundColor: color + '33',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            display: true,
            grid: { display: false },
            ticks: { color: theme.tickColor }
          },
          y: { 
            beginAtZero: true,
            min: 0,
            ticks: {
              precision: 0,
              color: theme.tickColor
            },
            grid: {
              color: theme.gridColor
            }
          }
        },
        plugins: { 
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipColor,
            bodyColor: theme.tooltipColor,
            borderColor: theme.gridColor,
            borderWidth: 1
          }
        },
        animation: {
          duration: 200
        },
        elements: {
          line: {
            tension: 0.3 // Smooth the line a bit
          },
          point: {
            radius: 2,
            hoverRadius: 4
          }
        }
      }
    });

    // Re-apply i18n to chart labels when language changes
    window.addEventListener('i18n:changed', ()=>{
      refreshChartI18nLabels();
      loadUsers();
      loadUserStats();
    });
  }

  // Theme helpers for Chart.js
  function getCssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function getChartTheme(){
    const isDark = (document.documentElement.getAttribute('data-bs-theme') || '').toLowerCase() === 'dark';
    // Fallbacks in case variables are missing
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    const tickColor = isDark ? (getCssVar('--text-secondary') || '#b0b0b0') : (getCssVar('--text-secondary') || '#6c757d');
    const tooltipBg = isDark ? (getCssVar('--bg-tertiary') || '#3a3a3a') : '#ffffff';
    const tooltipColor = isDark ? (getCssVar('--text-primary') || '#ffffff') : '#212529';
    return { gridColor, tickColor, tooltipBg, tooltipColor };
  }

  // Observe theme changes and update existing charts
  const themeObserver = new MutationObserver((mutations)=>{
    const changed = mutations.some(m => m.type === 'attributes' && m.attributeName === 'data-bs-theme');
    if(!changed) return;
    const theme = getChartTheme();
    ['rps','cpu','heap'].forEach(key=>{
      const chart = state.charts[key];
      if(!chart) return;
      // Update scales colors
      if(chart.options.scales?.x){
        chart.options.scales.x.ticks = chart.options.scales.x.ticks || {};
        chart.options.scales.x.ticks.color = theme.tickColor;
      }
      if(chart.options.scales?.y){
        chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
        chart.options.scales.y.ticks.color = theme.tickColor;
        chart.options.scales.y.grid = chart.options.scales.y.grid || {};
        chart.options.scales.y.grid.color = theme.gridColor;
      }
      // Update tooltip theme
      if(chart.options.plugins?.tooltip){
        chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
        chart.options.plugins.tooltip.titleColor = theme.tooltipColor;
        chart.options.plugins.tooltip.bodyColor = theme.tooltipColor;
        chart.options.plugins.tooltip.borderColor = theme.gridColor;
        chart.options.plugins.tooltip.borderWidth = 1;
      }
      chart.update('none');
    });
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

  function updateChart(key) {
    const chart = state.charts[key];
    if(!chart) return;
    
    // Get the current series data
    const seriesData = state.series[key] || [];
    const labels = state.series.labels || [];
    
    // Update chart data
    chart.data.datasets[0].data = [...seriesData];
    chart.data.labels = [...labels];
    
    // Update chart with new data
    chart.update('none');
  }

  function i18nLabel(key, fallback){
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, fallback);
    }
    return fallback || key;
  }

  function initCharts(){
    state.charts.rps = createChart(
      document.getElementById('rpsChart'),
      i18nLabel('admin.monitoring.legend.rps', 'RPS'),
      '#0d6efd'
    );
    state.charts.cpu = createChart(
      document.getElementById('cpuChart'),
      i18nLabel('admin.monitoring.legend.cpu', 'CPU %'),
      '#20c997'
    );
    state.charts.heap = createChart(
      document.getElementById('heapChart'),
      i18nLabel('admin.monitoring.legend.heap', 'Heap MB'),
      '#6f42c1'
    );
  }

  function refreshChartI18nLabels(){
    if(state.charts.rps){
      state.charts.rps.data.datasets[0].label = i18nLabel('admin.monitoring.legend.rps', 'RPS');
      state.charts.rps.update('none');
    }
    if(state.charts.cpu){
      state.charts.cpu.data.datasets[0].label = i18nLabel('admin.monitoring.legend.cpu', 'CPU %');
      state.charts.cpu.update('none');
    }
    if(state.charts.heap){
      state.charts.heap.data.datasets[0].label = i18nLabel('admin.monitoring.legend.heap', 'Heap MB');
      state.charts.heap.update('none');
    }
  }

  function startSampling(ms){
    if(state.poll.id) clearInterval(state.poll.id);
    state.poll.ms = ms;
    
    // Don't clear data when just changing interval - preserve history
    // Only clear if explicitly needed
    
    sampleMetrics(); // immediate first sample
    state.poll.id = setInterval(sampleMetrics, ms);
    
    // Also refresh user stats every 30s
    if(state.users.statsIntervalId) clearInterval(state.users.statsIntervalId);
    state.users.statsIntervalId = setInterval(loadUserStats, 30000);
  }

  function row(u){
    const fullName = [u.firstName||'', u.lastName||''].join(' ').trim();
    const badgeText = u.enabled ? i18n.t('admin.users.badge.active', 'Active') : i18n.t('admin.users.badge.disabled', 'Disabled');
    const enabledBadge = `<span class="badge ${u.enabled?'bg-success':'bg-secondary'}">${badgeText}</span>`;
    const toggleText = u.enabled ? i18n.t('admin.users.btn.disable', 'Disable') : i18n.t('admin.users.btn.enable', 'Enable');
    return `
      <tr data-id="${u.id}">
        <td>${u.email}</td>
        <td>${fullName || '—'}</td>
        <td>
          <select class="form-select form-select-sm role-select" style="width:auto;">
            <option value="USER" ${u.role==='USER'?'selected':''}>USER</option>
            <option value="ADMIN" ${u.role==='ADMIN'?'selected':''}>ADMIN</option>
          </select>
        </td>
        <td>${enabledBadge}</td>
        <td>${(u.createdAt||'').toString().replace('T',' ')}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary toggle-enabled">${toggleText}</button>
          <button class="btn btn-sm btn-outline-primary quota-btn">Quota</button>
        </td>
      </tr>`;
  }

  function loadUsers(){
    const q = document.getElementById('userSearch').value.trim();
    const url = q? `/api/admin/users?q=${encodeURIComponent(q)}` : '/api/admin/users';
    fetchJSON(url).then(list=>{
      document.getElementById('usersTableBody').innerHTML = list.map(row).join('');
    });
  }

  function attachHandlers() {
    // Handle time range change
    document.getElementById('timeRangeSelect').addEventListener('change', (e) => {
      state.timeRange = parseInt(e.target.value);
      filterDataForTimeRange();
      // Update all charts
      updateChart('rps');
      updateChart('cpu');
      updateChart('heap');
    });
    
    // Handle polling interval change
    document.getElementById('metricsIntervalSelect').addEventListener('change', (e) => {
      startSampling(parseInt(e.target.value));
    });
    
    const tbody = document.getElementById('usersTableBody');
    tbody.addEventListener('change', (e)=>{
      if(e.target.classList.contains('role-select')){
        const tr = e.target.closest('tr');
        const id = tr.getAttribute('data-id');
        fetchJSON(`/api/admin/users/${id}/role`, {
          method: 'POST',
          body: JSON.stringify({role: e.target.value})
        }).then(()=>loadUsers());
      }
    });

    tbody.addEventListener('click', (e)=>{
      const tr = e.target.closest('tr');
      if(!tr) return;
      const id = tr.getAttribute('data-id');
      if(e.target.classList.contains('toggle-enabled')){
        const enabledNow = tr.querySelector('.badge').classList.contains('bg-success');
        fetchJSON(`/api/admin/users/${id}/enable`, {
          method: 'POST',
          body: JSON.stringify({enabled: !enabledNow})
        }).then(()=>loadUsers());
      }
      if(e.target.classList.contains('quota-btn')){
        // open modal and load quota
        fetchJSON(`/api/admin/users/${id}/quota`).then(data=>{
          document.getElementById('quotaUserId').value = id;
          const limitEl = document.getElementById('monthlyTokenLimit');
          limitEl.value = (data.monthlyTokenLimit ?? '').toString();
          document.getElementById('tokenUsedInPeriod').textContent = (data.tokenUsedInPeriod ?? '—');
          document.getElementById('periodStart').textContent = (data.periodStart ?? '—');
          const modal = new bootstrap.Modal(document.getElementById('quotaModal'));
          modal.show();
          // attach once handlers for save/reset within modal context
          const saveBtn = document.getElementById('saveQuotaBtn');
          const resetBtn = document.getElementById('resetQuotaBtn');
          // remove previous listeners if any
          saveBtn.onclick = null;
          resetBtn.onclick = null;
          saveBtn.onclick = ()=>{
            const val = limitEl.value.trim();
            const payload = { monthlyTokenLimit: val === '' ? null : Number(val) };
            fetchJSON(`/api/admin/users/${id}/quota`, { method: 'POST', body: JSON.stringify(payload) })
              .then(()=>{
                // refresh the quota display
                return fetchJSON(`/api/admin/users/${id}/quota`);
              })
              .then(q=>{
                document.getElementById('tokenUsedInPeriod').textContent = (q.tokenUsedInPeriod ?? '—');
                document.getElementById('periodStart').textContent = (q.periodStart ?? '—');
              });
          };
          resetBtn.onclick = ()=>{
            fetchJSON(`/api/admin/users/${id}/quota/reset`, { method: 'POST' })
              .then(()=>fetchJSON(`/api/admin/users/${id}/quota`))
              .then(q=>{
                document.getElementById('tokenUsedInPeriod').textContent = (q.tokenUsedInPeriod ?? '—');
                document.getElementById('periodStart').textContent = (q.periodStart ?? '—');
              });
          };
        });
      }
      // reset password functionality removed
    });

    document.getElementById('userSearch').addEventListener('input', ()=>{
      clearTimeout(window.__adm_t);
      window.__adm_t = setTimeout(loadUsers, 300);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initCharts();
    loadUsers();
    loadUserStats();
    attachHandlers();
    // refresh user stats every 10s
    state.users.statsIntervalId = setInterval(loadUserStats, 10000);
    // setup polling with initial interval from select
    const select = document.getElementById('metricsIntervalSelect');
    const initialMs = parseInt(select?.value || '5000', 10);
    startSampling(isNaN(initialMs) ? 5000 : initialMs);
    // Note: event listener for interval change is already attached in attachHandlers()
  });
})();
