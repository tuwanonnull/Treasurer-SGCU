const themeKey = 'sgcu-position-preview-theme';
function applyPreviewTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggle = document.getElementById('theme-toggle');
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  toggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}
let initialTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
try { initialTheme = localStorage.getItem(themeKey) || initialTheme; } catch {}
applyPreviewTheme(initialTheme);
document.getElementById('theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyPreviewTheme(theme);
  try { localStorage.setItem(themeKey, theme); } catch {}
});
const $ = id => document.getElementById(id);
const response = await fetch('/preview-data', { cache: 'no-store' });
const snapshot = await response.json();
if (!response.ok) {
  document.querySelector('.preview-bar span').textContent = snapshot.error || 'โหลดข้อมูลทดสอบไม่สำเร็จ';
  throw new Error('Preview catalog unavailable');
}
const pageOptions = snapshot.pages;
const pageLabel = id => pageOptions.find(page => page.id === id)?.label || id;
// A fresh production snapshot starts a separate local draft, preserving previous test drafts.
const storageKey = `sgcu-staff-position-catalog-preview-${snapshot.fetchedAt}`;
const previewDivisionCode = code => code === '09' ? '99' : code;
const defaults = {
  divisionSchemaVersion: 2,
  divisions: [...new Map(snapshot.positions.map(p => [previewDivisionCode(p.divisionCodeYY), { code: previewDivisionCode(p.divisionCodeYY), name: p.divisionLabel || p.divisionName || `ฝ่าย ${p.divisionCodeYY}` }])).values()],
  positions: snapshot.positions.map(p => ({ id: p.id, name: p.name, division: previewDivisionCode(p.divisionCodeYY), level: p.levelCodeZZ, pages: [...(p.allowedPages || [])] })),

};
const snapshotTime = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }).format(new Date(snapshot.fetchedAt));
document.querySelector('.preview-bar span').textContent = `ชุดทดสอบจากระบบจริง · ${snapshot.positions.length} ตำแหน่ง · ${pageOptions.length} หน้า · แก้ไขเฉพาะในเบราว์เซอร์`;
$('data-source').textContent = `ข้อมูลตำแหน่งและหน้าที่อนุญาต ณ ${snapshotTime} · รายการหน้าจากโค้ดระบบปัจจุบัน`;
const pageGrid = $('permission-options');
$('page-scroll-hint').textContent = `เลื่อนเพื่อดูครบ ${pageOptions.length} หน้า`;
for (const page of pageOptions) {
  const label = document.createElement('label'); label.className = 'staff-position-page-option';
  const input = document.createElement('input'); input.className = 'staff-position-page-checkbox'; input.type = 'checkbox'; input.name = 'pages'; input.value = page.id;
  label.append(input, document.createTextNode(page.label)); pageGrid.append(label);
}
let state = structuredClone(defaults);
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.divisions?.length && Array.isArray(saved.positions)
    && saved.divisions.every(d => /^\d{2}$/.test(d.code) && typeof d.name === 'string')
    && saved.positions.every(p => saved.divisions.some(d => d.code === p.division) && Array.isArray(p.pages))) state = saved;
} catch { /* Storage may be unavailable; the preview still works in memory. */ }
// Upgrade existing local drafts once; newly created student division 09 stays 09.
if (state.divisionSchemaVersion !== 2) {
  state.divisions.forEach(d => { d.code = previewDivisionCode(d.code); });
  state.positions.forEach(p => { p.division = previewDivisionCode(p.division); });
  state.divisionSchemaVersion = 2;
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* In-memory migration still works. */ }
}
delete state.people;
let editingId = null;
let addingDivision = false;
let generalPageSelection = null;
const levels = { '01': 'ประธานฝ่าย', '02': 'รองประธานฝ่าย', '03': 'เลขานุการฝ่าย', '04': 'ผู้ช่วยฝ่าย' };
const normalized = value => value.trim().replace(/^ฝ่าย\s*/u, '').replace(/\s+/g, ' ');
const positionName = p => p.name || nameFor(state.divisions.find(d => d.code === p.division), p.level);
const nameFor = (division, level) => {
  if (!division || !level) return '';
  if (division.code === '00') return level === '01' ? 'เหรัญญิก' : 'เลขานุการฝ่ายเหรัญญิก';
  if (['01', '99'].includes(division.code)) return division.name;
  return levels[level] + normalized(division.name);
};
function selectedDivision() {
  return addingDivision ? { code: $('code').value, name: normalized($('division-name').value) }
    : state.divisions.find(d => d.code === $('division').value);
}
function message(text, error = false) {
  $('message').textContent = text;
  $('message').style.color = error ? '#b91c1c' : '#14704a';
}
function renderDivisions() {
  $('division').replaceChildren(new Option('เลือกฝ่าย / หมวดงาน', ''));
  [...state.divisions].sort((a,b) => a.code.localeCompare(b.code)).forEach(d => $('division').add(new Option(`${d.code} — ${d.name}`, d.code)));
}
function renderLevels() {
  const code = selectedDivision()?.code;
  $('level').disabled = !code;
  $('level').replaceChildren(new Option(code ? 'เลือกระดับตำแหน่ง' : 'เลือกฝ่ายก่อน', ''));
  const choices = code === '00' ? ['01', '03'] : ['01', '99'].includes(code) ? ['04'] : Object.keys(levels);
  if (code) choices.forEach(l => $('level').add(new Option(code === '00' ? (l === '01' ? 'เหรัญญิก' : 'เลขานุการฝ่ายเหรัญญิก') : ['01', '99'].includes(code) ? selectedDivision().name : levels[l], l)));
  const special = ['00', '01', '99'].includes(code);
  $('special').hidden = !special;
  $('special').textContent = '(ใช้ชื่อตำแหน่งเฉพาะของหมวดนี้)';
  const fixed = Boolean(code && choices.length === 1);
  $('level').hidden = fixed;
  $('level').disabled = !code || fixed;
  $('level-fixed').hidden = !fixed;
  if (fixed) {
    $('level').value = choices[0];
    $('level-fixed').textContent = $('level').selectedOptions[0].textContent;
  } else $('level-fixed').textContent = '';
  updateResult();
}
function updateResult() {
  const division = selectedDivision();
  const name = division?.name && nameFor(division, $('level').value);
  $('selected-division-code').textContent = division?.code || '—';
  $('selected-level-code').textContent = $('level').value || '—';
  const original = state.positions.find(p => p.id === editingId);
  $('editing-context').hidden = !original;
  $('editing-context').textContent = original
    ? `กำลังแก้ไข: ${positionName(original)} · รหัสฝ่ายเดิม ${original.division} / ระดับเดิม ${original.level}`
    : '';
  $('result').textContent = name || 'เลือกฝ่ายและระดับตำแหน่ง';
  $('save').disabled = !name;
  const isHead = division?.code === '00' && $('level').value === '01';
  const pageInputs = [...document.querySelectorAll('[name=pages]')];
  if (isHead && generalPageSelection === null) generalPageSelection = pageInputs.filter(el => el.checked).map(el => el.value);
  pageInputs.forEach(el => {
    el.disabled = isHead;
    if (isHead) el.checked = true;
    else if (generalPageSelection !== null) el.checked = generalPageSelection.includes(el.value);
  });
  if (!isHead) generalPageSelection = null;
  const selectedCount = pageInputs.filter(el => el.checked).length;
  $('pages-all').checked = selectedCount === pageInputs.length;
  $('pages-all').indeterminate = selectedCount > 0 && selectedCount < pageInputs.length;
  $('pages-all').disabled = isHead;
  $('permission-count').textContent = isHead ? `(${pageOptions.length} หน้า — หัวหน้าสตาฟ)` : `(${document.querySelectorAll('[name=pages]:checked').length} หน้า)`;
}
function renderList() {
  const filter = $('division-filter');
  const selected = filter.value;
  filter.replaceChildren(new Option('ฝ่าย: ทุกฝ่าย', ''));
  [...state.divisions].sort((a,b) => a.code.localeCompare(b.code)).forEach(d => {
    const option = new Option(`${d.code} ${d.name}`, d.code); option.title = d.name; filter.add(option);
  });
  filter.value = state.divisions.some(d => d.code === selected) ? selected : '';
  const positions = [...state.positions].filter(p => !filter.value || p.division === filter.value)
    .sort((a,b) => a.division.localeCompare(b.division) || a.level.localeCompare(b.level));
  $('count').textContent = `${positions.length} ตำแหน่ง`;
  $('positions').replaceChildren();
  if (!positions.length) {
    const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'ยังไม่มีตำแหน่งในฝ่ายนี้'; $('positions').append(empty);
    return;
  }
  for (const division of [...state.divisions].sort((a,b) => a.code.localeCompare(b.code))) {
    const members = positions.filter(p => p.division === division.code);
    if (!members.length) continue;
    const card = document.createElement('section'); card.className = 'department-card';
    const heading = document.createElement('div'); heading.className = 'department-heading';
    const badge = document.createElement('span'); badge.className = 'division-badge'; badge.textContent = `ฝ่าย ${division.code}`; badge.setAttribute('aria-label', `รหัสฝ่าย ${division.code}`);
    const headingText = document.createElement('div');
    const title = document.createElement('h3'); title.textContent = division.name;
    const count = document.createElement('small'); count.textContent = `${members.length} ตำแหน่ง`;
    headingText.append(title); heading.append(badge, headingText, count); card.append(heading);
    const list = document.createElement('ul'); list.className = 'department-positions';
    for (const p of members) {
      const row = document.createElement('li'); row.className = 'position-entry'; row.dataset.positionId = p.id;
      const info = document.createElement('div');
      const name = document.createElement('div'); name.className = 'position-title';
      name.textContent = !['00','01','99'].includes(p.division) && positionName(p) === nameFor(division,p.level) ? levels[p.level] : positionName(p);
      name.title = positionName(p);
      const meta = document.createElement('span'); meta.className = 'position-meta';
      meta.textContent = `ระดับ ${p.level} · ${p.division === '00' && p.level === '01' ? `ทุกหน้า (${pageOptions.length})` : `แสดง ${p.pages.length} หน้า`}`;
      const pages = document.createElement('span'); pages.className = 'position-pages';
      pages.textContent = p.division === '00' && p.level === '01' ? 'หัวหน้าสตาฟ' : p.pages.length ? p.pages.map(pageLabel).join(' · ') : 'ยังไม่กำหนดหน้า';
      info.className = 'position-info';
      info.append(name, meta);
      row.tabIndex = 0; row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `แก้ไข ${positionName(p)}`);
      row.setAttribute('aria-pressed', String(editingId === p.id));
      row.addEventListener('click', () => editPosition(p));
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editPosition(p); }
      });
      const indicator = document.createElement('span'); indicator.className = 'position-indicator';
      indicator.textContent = '›'; indicator.setAttribute('aria-hidden', 'true');
      row.append(info, indicator); list.append(row);
    }
    card.append(list); $('positions').append(card);
  }
}
function deletePosition(id) {
  const position = state.positions.find(p => p.id === id);
  if (!position) return;
  const name = positionName(position);
  if (!confirm(`ลบตำแหน่ง “${name}” จากชุดทดสอบนี้? ข้อมูลจริงจะไม่เปลี่ยนแปลง`)) return;
  state.positions = state.positions.filter(p => p.id !== id);
  let persisted = true;
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { persisted = false; }
  if (editingId === id) resetForm(); else renderList();
  const result = `ลบ “${name}” จากชุดทดสอบแล้ว${persisted ? '' : ' (เฉพาะหน้านี้ เบราว์เซอร์ไม่อนุญาตให้บันทึกถาวร)'}`;
  $('list-message').textContent = result;
  message(result);
  $('division-filter').focus({ preventScroll: true });
}

function setNewMode(active) {
  addingDivision = active;
  $('new-fields').hidden = !active;
  $('existing-fields').hidden = active;
  $('division').disabled = active;
  $('division').required = !active;
  $('division-name').required = active;
  $('new-division').setAttribute('aria-expanded', String(active));
}
function resetForm() {
  editingId = null;
  generalPageSelection = null;
  $('position-form').reset(); setNewMode(false);
  $('delete-edit').hidden = true;
  $('permission-scroll').scrollTop = 0;
  $('form-title').textContent = 'เพิ่มตำแหน่งใหม่'; $('save').textContent = 'เพิ่มตำแหน่ง'; $('cancel-edit').hidden = true;
  renderDivisions(); renderLevels(); renderList();
}
function editPosition(p) {
  resetForm(); editingId = p.id;
  $('division').value = p.division; renderLevels(); $('level').value = p.level;
  generalPageSelection = null;
  document.querySelectorAll('[name=pages]').forEach(el => { el.checked = p.pages.includes(el.value); });
  $('form-title').textContent = 'แก้ไขตำแหน่ง'; $('save').textContent = 'บันทึกการแก้ไข'; $('cancel-edit').hidden = false;
  $('delete-edit').hidden = false;
  updateResult(); renderList(); message('');
  $('form-title').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  $('division').focus({ preventScroll: true });
}
$('new-division').addEventListener('click', () => {
  const code = Array.from({length:94}, (_,i) => String(i+5).padStart(2,'0')).find(c => !state.divisions.some(d => d.code === c) && c !== '99');
  if (!code) { message('ไม่มีรหัสฝ่ายว่าง', true); return; }
  setNewMode(true); $('code').value = code; $('division-name').value = ''; renderLevels(); $('division-name').focus(); message('');
});
$('cancel-division').addEventListener('click', () => { setNewMode(false); renderLevels(); message(''); $('division').focus(); });
$('division').addEventListener('change', () => { renderLevels(); message(''); });
$('level').addEventListener('change', updateResult);
$('pages-all').addEventListener('change', () => {
  document.querySelectorAll('[name=pages]').forEach(el => { if (!el.disabled) el.checked = $('pages-all').checked; });
  updateResult();
});
$('delete-edit').addEventListener('click', () => { if (editingId) deletePosition(editingId); });
$('division-name').addEventListener('input', updateResult);
$('division-filter').addEventListener('change', renderList);
document.querySelectorAll('[name=pages]').forEach(el => el.addEventListener('change', updateResult));
$('cancel-edit').addEventListener('click', () => { resetForm(); message('ยกเลิกการแก้ไขแล้ว'); });
$('position-form').addEventListener('submit', event => {
  event.preventDefault();
  const division = selectedDivision(), level = $('level').value;
  if (!division?.name || !level) { message('กรุณาเลือกฝ่ายและระดับตำแหน่งให้ครบ', true); return; }
  if (addingDivision && state.divisions.some(d => normalized(d.name).toLowerCase() === normalized(division.name).toLowerCase())) {
    message('มีชื่อฝ่ายนี้แล้ว กรุณากลับไปเลือกฝ่ายเดิม', true); return;
  }
  const name = nameFor(division, level);
  if (state.positions.some(p => p.id !== editingId && ((p.division === division.code && p.level === level) || positionName(p) === name))) {
    message('มีตำแหน่งนี้แล้ว สามารถแก้ไขได้จากรายการด้านล่าง', true); return;
  }
  if (addingDivision) state.divisions.push(division);
  const position = { id: editingId || crypto.randomUUID(), name, division: division.code, level, pages: [...document.querySelectorAll('[name=pages]:checked')].map(el => el.value) };
  if (editingId) state.positions = state.positions.map(p => p.id === editingId ? position : p);
  else state.positions.push(position);
  let persisted = true;
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { persisted = false; }
  $('division-filter').value = '';
  resetForm(); message(`บันทึก “${name}” ใน${persisted ? 'ข้อมูลทดลองแล้ว' : 'หน้านี้แล้ว (เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูลถาวร)'}`);
});
$('reset').addEventListener('click', () => {
  if (!confirm('คืนค่าชุดข้อมูลที่อ่านจากระบบจริง และล้างการแก้ไขในพื้นที่ทดลองนี้?')) return;
  state = structuredClone(defaults);
  $('division-filter').value = '';
  try { localStorage.removeItem(storageKey); } catch { /* In-memory reset remains available. */ }
  resetForm(); $('list-message').textContent = ''; message('คืนค่าชุดข้อมูลจากระบบจริงแล้ว');
});
resetForm();
