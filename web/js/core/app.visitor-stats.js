function visitorShiftDate(key, offset) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function visitorDateRange(start, end) {
  const valid = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(Date.parse(`${key}T00:00:00Z`)) && new Date(`${key}T00:00:00Z`).toISOString().slice(0, 10) === key;
  if (!valid(start) || !valid(end) || start > end) throw Error('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดให้ถูกต้อง');
  const count = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (count > 366) throw Error('เลือกช่วงวันที่ได้ไม่เกิน 366 วันต่อช่วง');
  return Array.from({ length: count }, (_, index) => visitorShiftDate(start, index));
}
function visitorCompare(values, currentDates, previousDates) {
  const sum = (keys) => keys.reduce((total, key) => total + (Number.isFinite(values[key]) ? values[key] : 0), 0);
  const complete = currentDates.length > 0 && currentDates.length === previousDates.length && [...currentDates, ...previousDates].every(key => Number.isFinite(values[key]));
  const current = sum(currentDates), previous = sum(previousDates);
  return { currentDates, previousDates, current, previous, complete,
    percent: complete && previous > 0 ? (current - previous) / previous * 100 : complete && current === 0 ? 0 : null };
}
function compareVisitorPeriods(values, dates, days) {
  const completed = dates.slice(0, -1);
  return visitorCompare(values, completed.slice(-days), completed.slice(-days * 2, -days));
}
function visitorGroupDays(keys, values, mode) {
  const groups = new Map();
  keys.forEach(key => {
    const date = new Date(`${key}T00:00:00Z`);
    const bucket = mode === 'month' ? key.slice(0, 7) : mode === 'week' ? visitorShiftDate(key, -((date.getUTCDay() + 6) % 7)) : key;
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket).push(key);
  });
  return [...groups.values()].map(days => ({ days, value: days.every(key => Number.isFinite(values[key])) ? days.reduce((sum, key) => sum + values[key], 0) : null }));
}
(() => {
  const $ = (id) => document.getElementById(id);
  let history = null, config = null, chart = null, loading = false, requestId = 0;
  const cache = new Map();
  const format = value => Number.isFinite(value) ? value.toLocaleString('th-TH') : 'ยังไม่มีข้อมูล';
  const dateLabel = key => new Date(`${key}T12:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' });
  const range = keys => keys.length ? keys.length === 1 ? dateLabel(keys[0]) : `${dateLabel(keys[0])} – ${dateLabel(keys.at(-1))}` : '—';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  function readConfig() {
    const lastDay = visitorShiftDate(today(), -1);
    const preset = $('visitorDays').value;
    const currentDates = preset === 'custom' ? visitorDateRange($('visitorStart').value, $('visitorEnd').value)
      : visitorDateRange(visitorShiftDate(lastDay, 1 - Number(preset)), lastDay);
    const compare = $('visitorCompare').value;
    const previousDates = compare === 'none' ? [] : compare === 'custom'
      ? visitorDateRange($('visitorCompareStart').value, $('visitorCompareEnd').value)
      : visitorDateRange(visitorShiftDate(currentDates[0], -currentDates.length), visitorShiftDate(currentDates[0], -1));
    if (currentDates.at(-1) > lastDay || (previousDates.length && previousDates.at(-1) > lastDay)) throw Error('เลือกได้ถึงเมื่อวาน เพื่อเปรียบเทียบวันที่ครบแล้ว');
    if (previousDates.length && previousDates.length !== currentDates.length) throw Error(`ช่วงเปรียบเทียบต้องมี ${currentDates.length} วันเท่ากับช่วงหลัก`);
    return { currentDates, previousDates, page: $('visitorPage').value, pageLabel: $('visitorPage').selectedOptions[0].textContent };
  }
  let detailState = 'empty';
  function setDetailState(state) {
    detailState = state;
    $('visitorDetailEmpty').hidden = state === 'ready';
    $('visitorDetailTable').hidden = state !== 'ready';
    const messages = {
      loading: ['กำลังโหลดรายละเอียด', 'กำลังเตรียมข้อมูลตามตัวกรองที่เลือก', ''],
      empty: ['ยังไม่มีข้อมูลในช่วงนี้', 'ยังไม่มีสถิติที่บันทึกไว้สำหรับหน้าและช่วงวันที่นี้ ลองเปลี่ยนช่วงวันที่หรือดูทั้งเว็บไซต์', 'ดูทั้งเว็บไซต์ย้อนหลัง 30 วัน'],
      incomplete: ['ข้อมูลยังไม่ครบสำหรับรวมยอด', 'มีข้อมูลบางวัน แต่ยังรวมเป็นสัปดาห์หรือเดือนไม่ได้ ลองดูรายวันเพื่อดูข้อมูลที่มี', 'ดูข้อมูลรายวัน'],
      error: ['โหลดรายละเอียดไม่สำเร็จ', 'กรุณาลองโหลดข้อมูลอีกครั้ง หากยังไม่ได้ ลองเลือกข้อมูลทั้งเว็บไซต์', 'ลองอีกครั้ง'],
      invalid: ['กรุณาตรวจช่วงวันที่', 'แก้ไขช่วงวันที่ตามข้อความด้านบน หรือกลับไปดูย้อนหลัง 30 วัน', 'กลับไปดูย้อนหลัง 30 วัน']
    };
    if (state === 'ready') return;
    const [title, description, action] = messages[state];
    $('visitorEmptyTitle').textContent = title;
    $('visitorEmptyDescription').textContent = description;
    $('visitorEmptyAction').textContent = action;
    $('visitorEmptyAction').hidden = !action;
  }
  function clearResults() {
    chart?.destroy(); chart = null; history = null;
    setDetailState('loading');
    $('visitorChart').replaceChildren(); $('visitorLegend').replaceChildren(); $('visitorTableBody').replaceChildren();
    ['dashboardVisitorCount', 'dashboardVisitorAllTimeCount', 'visitorUniqueToday', 'visitorGrowth'].forEach(id => $(id).textContent = '—');
    $('visitorGrowth').dataset.trend = 'neutral';
    $('visitorGrowthCaption').textContent = 'รอข้อมูลตามตัวกรอง';
    $('visitorUniqueCaption').textContent = 'นับเบราว์เซอร์เดิมวันละ 1 คน';
  }
  function render() {
    if (!history || !config || loading) return;
    const unique = $('visitorMetric').checked;
    const label = unique ? 'ยอดคนไม่ซ้ำรายวันรวม' : 'ครั้งเข้าชม';
    const mode = $('visitorGrouping').value;
    const groupLabel = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน' }[mode];
    const values = unique ? history.unique : history.visits;
    const { currentDates, previousDates, page, pageLabel } = config;
    const { current, previous, complete, percent } = visitorCompare(values, currentDates, previousDates);
    const comparing = previousDates.length > 0;
    $('visitorChartTitle').textContent = `${label} · ราย${groupLabel}`;
    $('visitorDetailTitle').textContent = `รายละเอียดราย${groupLabel}`;
    $('visitorComparisonRange').textContent = `${range(currentDates)}${comparing ? ` เทียบ ${range(previousDates)}` : ''}`;
    $('systemVisitorPanel').dataset.metric = unique ? 'unique' : 'visits';
    $('visitorDetailCaption').textContent = `${label} · เรียงจากวันที่ล่าสุด · — หมายถึงไม่มีข้อมูล`;
    document.querySelectorAll('[data-visitor-previous]').forEach(el => el.hidden = !comparing);
    $('visitorGrowthLabel').textContent = unique ? 'ยอดคนไม่ซ้ำรายวันรวมเทียบช่วงก่อน' : 'การเข้าชมเทียบช่วงก่อน';
    $('visitorGrowth').dataset.trend = percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral';
    $('visitorGrowth').textContent = percent == null ? '—' : `${percent > 0 ? '+' : ''}${percent.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;
    $('visitorGrowthCaption').textContent = !comparing ? 'ไม่ได้เลือกช่วงเปรียบเทียบ' : !complete ? `ข้อมูลยังไม่ครบสำหรับเทียบช่วงละ ${currentDates.length} วัน`
      : percent == null ? `ช่วงก่อนเป็น 0 · ช่วงล่าสุด ${format(current)} จึงคำนวณ % ไม่ได้`
      : `${format(current)} เทียบ ${format(previous)} · ช่วงละ ${currentDates.length} วัน${unique ? ' (รวมยอดรายวัน)' : ''}`;
    chart?.destroy(); chart = null;
    $('visitorChart').classList.remove('has-canvas');
    $('visitorChart').replaceChildren(); $('visitorLegend').replaceChildren(); $('visitorTableBody').replaceChildren();
    const currentPoints = visitorGroupDays(currentDates, values, mode);
    const previousPoints = visitorGroupDays(previousDates, values, mode);
    const pointCount = Math.max(currentPoints.length, previousPoints.length);
    const hasDetailData = [...currentPoints, ...previousPoints].some(point => Number.isFinite(point.value));
    const hasDailyData = [...currentDates, ...previousDates].some(key => Number.isFinite(values[key]));
    setDetailState(hasDetailData ? 'ready' : unique && history.uniqueUnavailable ? 'error' : hasDailyData && mode !== 'day' ? 'incomplete' : 'empty');
    if (hasDetailData) for (let index = 0; index < pointCount; index++) {
      const row = document.createElement('tr');
      const addPeriod = point => {
        const cell = document.createElement('td');
        const date = document.createElement('span'); date.className = 'visitor-detail-date'; date.textContent = range(point?.days || []);
        const number = document.createElement('span'); number.className = 'visitor-detail-value';
        number.textContent = Number.isFinite(point?.value) ? format(point.value) : '—';
        if (!Number.isFinite(point?.value)) { number.classList.add('is-missing'); number.setAttribute('aria-label', 'ยังไม่มีข้อมูล'); }
        cell.append(date, number); row.append(cell);
      };
      addPeriod(currentPoints[index]);
      if (comparing) {
        addPeriod(previousPoints[index]);
        const cell = document.createElement('td');
        const main = currentPoints[index]?.value, before = previousPoints[index]?.value;
        const percent = Number.isFinite(main) && Number.isFinite(before) ? before > 0 ? (main - before) / before * 100 : main === 0 ? 0 : null : null;
        const change = document.createElement('span'); change.className = 'visitor-detail-change';
        change.dataset.trend = percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral';
        change.textContent = percent == null ? '—' : `${percent > 0 ? '+' : ''}${percent.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;
        change.title = percent == null ? 'คำนวณไม่ได้: ข้อมูลไม่ครบ หรือยอดช่วงก่อนเป็นศูนย์' : 'เทียบยอดของสองช่วงในแถวนี้';
        cell.append(change); row.append(cell);
      }
      $('visitorTableBody').prepend(row);
    }
    const series = [{ points: currentPoints, label: `ช่วงหลัก · ${range(currentDates)}`, color: '#ec4899', fill: 'rgba(236,72,153,.10)' }];
    if (comparing) series.push({ points: previousPoints, label: `ช่วงเปรียบเทียบ · ${range(previousDates)}`, color: '#059669', fill: 'rgba(5,150,105,.06)' });
    if (window.Chart && hasDetailData) {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `กราฟเส้นเปรียบเทียบ${label}สองช่วงเวลา ดูค่าพร้อมวันที่จริงในตารางรายละเอียดรายวัน`);
      $('visitorChart').append(canvas); $('visitorChart').classList.add('has-canvas');
      chart = new window.Chart(canvas, {
        type: 'line',
        data: { labels: Array.from({ length: pointCount }, (_, index) => `${groupLabel}ที่ ${index + 1}`), datasets: series.map((item, index) => ({
          label: item.label, data: Array.from({ length: pointCount }, (_, index) => item.points[index]?.value ?? null),
          borderColor: item.color, backgroundColor: item.fill, pointBackgroundColor: item.color,
          borderDash: index ? [5, 4] : [], borderWidth: 2, pointRadius: pointCount > 7 ? 2 : 3,
          pointHoverRadius: 5, fill: true, tension: .35, spanGaps: false
        })) },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: { callbacks: {
            title: (items) => `${groupLabel}ที่ ${items[0].dataIndex + 1} ของแต่ละช่วง`,
            label: (context) => `${range(series[context.datasetIndex].points[context.dataIndex]?.days || [])}: ${format(context.parsed.y)}`
          } } },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8, color: '#64748b' }, border: { display: false } },
            y: { beginAtZero: true, ticks: { precision: 0, color: '#64748b' }, grid: { color: '#f1f5f9' }, border: { display: false } }
          }
        }
      });
      series.forEach((item, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-pressed', 'true');
        const swatch = document.createElement('i'); swatch.style.setProperty('--series-color', item.color); swatch.setAttribute('aria-hidden', 'true');
        button.append(swatch, document.createTextNode(item.label));
        button.addEventListener('click', () => { const visible = !chart.isDatasetVisible(index); chart.setDatasetVisibility(index, visible); chart.update(); button.setAttribute('aria-pressed', String(visible)); });
        $('visitorLegend').append(button);
      });
    } else {
      const message = document.createElement('p'); message.className = 'visitor-chart-empty';
      message.textContent = hasDetailData ? 'กราฟยังโหลดไม่ได้ ดูตัวเลขเปรียบเทียบได้ในตารางด้านล่าง' : 'ยังไม่มีข้อมูลเพียงพอสำหรับกราฟนี้';
      $('visitorChart').append(message);
    }
    $('dashboardVisitorCount').textContent = format(history.todayVisits);
    $('dashboardVisitorAllTimeCount').textContent = format(history.allTime);
    $('visitorUniqueToday').textContent = Number.isFinite(history.todayUnique) ? format(history.todayUnique) : '—';
    $('visitorUniqueCaption').textContent = history.uniqueUnavailable ? 'โหลดข้อมูลไม่ได้ · ลองรีเฟรชสถิติ' : Number.isFinite(history.todayUnique) ? 'นับเบราว์เซอร์เดิมวันละ 1 คน' : 'ยังไม่มีข้อมูลคนไม่ซ้ำสำหรับวันนี้';
    const missing = [...currentDates, ...previousDates].some(key => !Number.isFinite(values[key]));
    $('visitorStatus').textContent = unique && history.uniqueUnavailable ? 'ยังโหลดข้อมูลคนไม่ซ้ำไม่ได้ ลองรีเฟรชอีกครั้ง หรือเลือกดูครั้งเข้าชม'
      : missing ? 'ข้อมูลบางวันยังไม่มี · ไม่แทนด้วยศูนย์ และไม่รวมยอดช่วงที่ข้อมูลไม่ครบ'
      : comparing ? 'จับคู่ตามลำดับช่วง · แตะเส้นเพื่อดูวันที่จริงและยอด' : 'แสดงข้อมูลช่วงที่เลือก';
    $('visitorFilterStatus').dataset.error = 'false';
    $('visitorFilterStatus').textContent = `${pageLabel} · ${page === 'all' ? 'ยอดรวมเดิมนับการโหลดเว็บไซต์' : 'ยอดหน้านี้นับการเปิดหน้าและการเปลี่ยนเข้าหน้า เริ่มเก็บเมื่อเปิดใช้ฟีเจอร์'} · ${mode === 'week' ? 'สัปดาห์จันทร์–อาทิตย์ รวมเฉพาะวันที่เลือก' : mode === 'month' ? 'เดือนปฏิทิน รวมเฉพาะวันที่เลือก' : 'รายวันตามเวลาไทย'}${unique && mode !== 'day' ? ' · รวมยอดคนไม่ซ้ำรายวัน ไม่ใช่คนไม่ซ้ำทั้งช่วง' : ''}`;
  }
  async function load({ refresh = false } = {}) {
    const id = ++requestId;
    $('visitorCustomDates').hidden = $('visitorDays').value !== 'custom';
    $('visitorCompareDates').hidden = $('visitorCompare').value !== 'custom';
    let next;
    try { next = readConfig(); }
    catch (error) {
      loading = false; clearResults(); $('visitorRefresh').disabled = false;
      $('visitorFilterStatus').dataset.error = 'true'; $('visitorFilterStatus').textContent = error.message;
      $('visitorStatus').textContent = 'กรุณาตรวจช่วงวันที่ด้านบน'; setDetailState('invalid'); return;
    }
    loading = true; clearResults(); $('visitorRefresh').disabled = true;
    $('visitorStatus').textContent = 'กำลังโหลดสถิติ…';
    $('visitorFilterStatus').dataset.error = 'false'; $('visitorFilterStatus').textContent = `กำลังโหลด ${next.pageLabel}`;
    if (refresh) cache.clear();
    try {
      await window.sgcuUniqueVisitorReady;
      const read = async keys => {
        if (!keys.length) return { visits: {}, unique: {} };
        const key = `${today()}/${next.page}/${keys[0]}/${keys.at(-1)}`;
        if (!cache.has(key)) {
          const promise = window.sgcuVisitorCounter.getVisitorHistory(keys[0], keys.at(-1), next.page);
          cache.set(key, promise);
          promise.catch(() => { if (cache.get(key) === promise) cache.delete(key); });
        }
        return cache.get(key);
      };
      const [main, previous] = await Promise.all([read(next.currentDates), read(next.previousDates)]);
      try { await window.sgcuVendorLoader?.ensureChart?.(); } catch (error) { console.warn('Chart library unavailable', error); }
      if (id !== requestId) return;
      config = next; history = { ...main, visits: { ...previous.visits, ...main.visits }, unique: { ...previous.unique, ...main.unique }, uniqueUnavailable: main.uniqueUnavailable || previous.uniqueUnavailable };
      loading = false; render();
    } catch (error) {
      if (id !== requestId) return;
      $('visitorStatus').textContent = next.page === 'all' ? 'โหลดสถิติไม่สำเร็จ กรุณากดรีเฟรชสถิติอีกครั้ง' : 'ยังโหลดสถิติแยกหน้าไม่ได้ ต้องเปิดใช้การเก็บข้อมูลและกฎฐานข้อมูลแยกหน้าก่อน';
      $('visitorFilterStatus').textContent = next.pageLabel;
      setDetailState('error');
      console.warn('Visitor history unavailable', error);
    } finally { if (id === requestId) { loading = false; $('visitorRefresh').disabled = false; } }
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!$('systemVisitorPanel')) return;
    const end = visitorShiftDate(today(), -1);
    $('visitorStart').value = visitorShiftDate(end, -29); $('visitorEnd').value = end;
    $('visitorCompareStart').value = visitorShiftDate(end, -59); $('visitorCompareEnd').value = visitorShiftDate(end, -30);
    ['visitorStart', 'visitorEnd', 'visitorCompareStart', 'visitorCompareEnd'].forEach(id => $(id).max = end);
    const pages = new Map();
    document.querySelectorAll('a[data-page]').forEach(link => {
      const page = link.dataset.page;
      if (/^[a-z0-9-]{1,80}$/.test(page) && !pages.has(page)) pages.set(page, link.textContent.trim());
    });
    pages.forEach((label, page) => { const option = document.createElement('option'); option.value = page; option.textContent = label; $('visitorPage').append(option); });
    $('visitorMetric').addEventListener('change', render); $('visitorGrouping').addEventListener('change', render);
    ['visitorDays', 'visitorCompare', 'visitorStart', 'visitorEnd', 'visitorCompareStart', 'visitorCompareEnd', 'visitorPage'].forEach(id => $(id).addEventListener('change', () => load()));
    $('visitorRefresh').addEventListener('click', () => load({ refresh: true }));
    $('visitorEmptyAction').addEventListener('click', () => {
      if (detailState === 'error') { load({ refresh: true }); return; }
      if (detailState === 'incomplete') { $('visitorGrouping').value = 'day'; render(); return; }
      $('visitorDays').value = '30'; $('visitorCompare').value = 'previous';
      $('visitorGrouping').value = 'day'; $('visitorPage').value = 'all'; $('visitorMetric').checked = false;
      load();
    });
    document.querySelector('[data-system-data-tab="visitors"]').addEventListener('click', () => load({ refresh: true }));
  });
})();
