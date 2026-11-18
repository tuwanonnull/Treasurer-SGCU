import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const source = await fs.readFile(new URL("../../web/js/core/mobile/app.mobile-project.js", import.meta.url), "utf8");
const start = source.indexOf("  const goToCalendarToday =");
const end = source.indexOf("  const sync =", start);
assert.ok(start >= 0 && end > start);
const handlers = source.slice(start, end);

for (const action of ["shiftCalendarMonth(-1)", "shiftCalendarMonth(1)", "goToCalendarToday()"] ) {
  const dates = { public: new Date(2020, 5, 1), staff: new Date(2021, 8, 1) };
  const staffTime = dates.staff.getTime();
  const renders = [];
  // Refreshing a source year visits public then staff, leaving staff active.
  const context = {
    activeProjectStatusContext: "staff",
    currentCalendarDate: dates.staff,
    selectedCalendarDate: dates.staff,
    setActiveProjectStatusContext(key) {
      context.activeProjectStatusContext = key;
      context.currentCalendarDate = dates[key];
    },
    generateCalendar(options) {
      renders.push({ key: context.activeProjectStatusContext, notice: options.showEmptyMonthNotice });
    }
  };
  vm.runInNewContext(`${handlers}\n${action};`, context);
  assert.deepEqual(renders, [{ key: "public", notice: true }], action);
  assert.equal(dates.staff.getTime(), staffTime, "Staff calendar must remain unchanged");
  assert.equal(context.currentCalendarDate, dates.public, "Preserve the public context's date reference");
  if (action.includes("-1")) assert.equal(dates.public.getMonth(), 4);
  else if (action.includes("(1)")) assert.equal(dates.public.getMonth(), 6);
  else {
    const today = new Date();
    assert.equal(dates.public.getFullYear(), today.getFullYear());
    assert.equal(dates.public.getMonth(), today.getMonth());
    assert.equal(context.selectedCalendarDate.getDate(), today.getDate());
  }
}
console.log("Mobile calendar navigation targets public context after a year refresh (3 actions).");
