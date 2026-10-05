import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

// Exercise the production date filtering with a cursor carrying the time of day,
// as it does after pressing Today, and with midnight after navigating back.
for (const name of ["calendar-public", "staff", "booking"]) {
  const filename = `../js/features/booking/app.meeting-room-${name}.js`;
  const source = await fs.readFile(new URL(filename, import.meta.url), "utf8");
  const start = source.indexOf("    const weekStart = new Date(calendarCursor);");
  const end = source.indexOf("    Object.values(periodBookings)", start);
  assert.ok(start >= 0 && end > start, `${name}: date filtering exists`);
  const filter = source.slice(start, end);
  const rows = ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-10", "2026-10-11"]
    .map((date) => ({ date, status: "approved", roomId: "room-1" }));
  for (const hour of [0, 14, 23]) {
    for (const day of [4, 5]) {
      for (const mode of ["week", "month", "mobile"]) {
        const month = { year: 2026, month: 9, firstDay: new Date(2026, 9, 1) };
        const context = {
          calendarCursor: new Date(2026, 9, day, hour, 30),
          selectedMonthStart: month,
          monthState: month,
          calendarDisplayMode: mode === "month" ? "month" : "week",
          staffCalendarDisplayMode: mode === "month" ? "month" : "week",
          isMobilePublicCalendar: () => mode === "mobile",
          isMobileStaffCalendar: () => mode === "mobile",
          isMobileBookingCalendar: () => mode === "mobile",
          calendarDateJumpEl: null,
          staffCalendarDateJumpEl: null,
          calendarRoomFilterValue: "all",
          staffCalendarRoomFilterValue: "all",
          bookings: rows,
          sourceRows: rows,
          normalizeStatus: (status) => status,
          toDateKey: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        };
        const actual = vm.runInNewContext(`${filter}\nObject.keys(periodBookings).join(',')`, context);
        const expected = mode === "mobile" ? `2026-10-0${day}`
          : mode === "month" ? rows.map((row) => row.date).join(",")
          : "2026-10-04,2026-10-05,2026-10-10";
        assert.equal(actual, expected, `${name}: ${mode}, day ${day}, hour ${hour}`);
      }
    }
  }
}
console.log("Calendar date range checks passed (54 cases).");
