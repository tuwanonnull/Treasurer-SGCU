/* Paginate after fonts load, using the same A4 dimensions as print. */
function paginateReceiptDocument() {
  const original = document.querySelector('.receipt-sheet');
  if (!original) return;
  // Reserve the tallest possible footer, including page subtotal words that wrap.
  const sourceRows = [...original.querySelectorAll('tr[data-receipt-amount]')];
  const words = original.querySelector('.total-words .fill');
  const originalWords = words.textContent;
  let footerHeight = original.querySelector('.receipt-ending').getBoundingClientRect().height;
  for (let start = 0; start < sourceRows.length; start++) {
    let subtotal = 0;
    for (let end = start; end < sourceRows.length; end++) {
      subtotal += Number(sourceRows[end].dataset.receiptAmount);
      words.textContent = receiptBahtText(subtotal);
      footerHeight = Math.max(footerHeight, original.querySelector('.receipt-ending').getBoundingClientRect().height);
    }
  }
  words.textContent = originalWords;
  original.querySelector('.receipt-ending').style.minHeight = `${footerHeight}px`;
  const template = original.cloneNode(true);
  const rows = [...template.querySelectorAll('tr[data-receipt-amount]')];
  const certificate = original.classList.contains('certificate');
  const maxRows = certificate ? 14 : 8;
  const pages = [];
  const formatMoney = (amount) => (amount / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const updateTotal = (sheet) => {
    const total = [...sheet.querySelectorAll('tr[data-receipt-amount]')].reduce((sum, row) => sum + Number(row.dataset.receiptAmount), 0);
    sheet.querySelector('[data-page-total]').textContent = formatMoney(total);
    sheet.querySelector('.total-words .fill').textContent = receiptBahtText(total);
  };
  const fits = (sheet) => {
    const bottom = sheet.getBoundingClientRect().bottom - parseFloat(getComputedStyle(sheet).paddingBottom);
    return sheet.querySelector('table').getBoundingClientRect().bottom + sheet.querySelector('.receipt-ending').getBoundingClientRect().height <= bottom + 0.5;
  };
  const newPage = () => {
    const sheet = template.cloneNode(true);
    sheet.querySelectorAll('tbody tr:not([data-receipt-total-row])').forEach(row => row.remove());
    original.before(sheet);
    pages.push(sheet);
    return sheet;
  };
  let page = newPage();
  for (const row of rows) {
    page.querySelector('[data-receipt-total-row]').before(row);
    updateTotal(page);
    if (!fits(page)) {
      row.remove();
      updateTotal(page);
      if (!page.querySelector('[data-receipt-amount]')) throw new Error('ข้อมูลยาวเกินพื้นที่หนึ่งหน้า กรุณาลดความยาวข้อความ');
      page = newPage();
      page.querySelector('[data-receipt-total-row]').before(row);
      updateTotal(page);
      if (!fits(page)) throw new Error('ข้อมูลยาวเกินพื้นที่หนึ่งหน้า กรุณาลดความยาวข้อความ');
    }
  }
  original.remove();
  pages.forEach((sheet) => {
    // Retain blank writing rows only while the reserved signature area fits.
    const tbody = sheet.querySelector('tbody');
    while (tbody.rows.length < maxRows + 1) {
      const blank = document.createElement('tr');
      blank.innerHTML = certificate ? '<td>&nbsp;</td><td></td><td></td><td></td>' : '<td>&nbsp;</td><td></td>';
      sheet.querySelector('[data-receipt-total-row]').before(blank);
      if (!fits(sheet)) { blank.remove(); break; }
    }
    if (pages.length > 1) {
      sheet.querySelector('[data-page-total-label]').textContent = 'รวม (หน้านี้)';
    }
  });
}
