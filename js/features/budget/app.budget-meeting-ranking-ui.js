(() => {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.sgcuRankingUI = {
    render(count, options, name) {
      return `<section class="bm-rank-editor" data-rank-editor><div class="bm-rank-toolbar"><div><h4>จัดอันดับโครงการในบัตรนี้</h4><p class="bm-muted">เลือกโครงการหนึ่งรายการต่ออันดับ · ใช้ลูกศรเพื่อสลับอันดับ</p></div><span data-rank-progress aria-live="polite">เลือกแล้ว 0 / ${count}</span></div><div class="bm-rank-head"><span>อันดับ</span><span>โครงการ</span><span>คะแนน</span><span>จัดลำดับ</span></div><div class="bm-rank-rows">${Array.from({length:count}, (_, i) => `<div class="bm-rank-row"><span class="bm-rank-number">${i + 1}</span><div class="bm-rank-project"><select name="${esc(name)}" aria-label="โครงการอันดับ ${i + 1}"><option value="">เลือกโครงการสำหรับอันดับ ${i + 1}</option>${options.map(o => `<option value="${esc(o.id)}" data-code="${esc(o.code || o.id)}">${esc(o.label)}</option>`).join('')}</select></div><strong class="bm-rank-score">${count - i}<small>คะแนน</small></strong><div class="bm-rank-tools"><button type="button" data-rank-move="-1" ${i === 0 ? 'disabled' : ''} title="เลื่อนอันดับขึ้น" aria-label="เลื่อนอันดับ ${i + 1} ขึ้น">&#8593;</button><button type="button" data-rank-move="1" ${i === count - 1 ? 'disabled' : ''} title="เลื่อนอันดับลง" aria-label="เลื่อนอันดับ ${i + 1} ลง">&#8595;</button></div></div>`).join('')}</div></section>`;
    }
  };
  function update(editor) {
    const selects = [...editor.querySelectorAll('select')];
    const chosen = new Set(selects.map(select => select.value).filter(Boolean));
    editor.querySelector('[data-rank-progress]').textContent = `เลือกแล้ว ${chosen.size} / ${selects.length}`;
    selects.forEach(select => {
      select.closest('.bm-rank-row').classList.toggle('is-filled', !!select.value);
      for (const option of select.options) option.disabled = !!option.value && chosen.has(option.value) && option.value !== select.value;
    });
  }
  document.addEventListener('change', event => {
    const editor = event.target.closest('[data-rank-editor]');
    if (!editor || !event.target.matches('select')) return;
    // Clearing through the placeholder keeps the remaining ranks contiguous.
    if (!event.target.value) {
      const selects = [...editor.querySelectorAll('select')];
      const index = selects.indexOf(event.target);
      for (let i = index; i < selects.length - 1; i++) selects[i].value = selects[i + 1].value;
      selects.at(-1).value = '';
    }
    update(editor);
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-rank-move]');
    if (!button || button.disabled) return;
    const editor = button.closest('[data-rank-editor]');
    const selects = [...editor.querySelectorAll('select')];
    const select = button.closest('.bm-rank-row').querySelector('select');
    const other = selects[selects.indexOf(select) + Number(button.dataset.rankMove)];
    if (!other) return;
    const value = select.value; select.value = other.value; other.value = value;
    update(editor);
    other.focus();
  });
})();
