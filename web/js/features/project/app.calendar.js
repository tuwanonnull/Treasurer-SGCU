/*******************************************************
 * Calendar system — ใช้ข้อมูลจาก projects เดิม
 * ไม่โหลดชีตเพิ่ม และยึดวันที่ lastWorkDate (คอลัมน์ M)
 *******************************************************/

let calendarEvents = [];
let calendarEventsByDate = new Map();
let currentCalendarDate = new Date();
let selectedCalendarDate = new Date();

/**
 * แปลง status จากข้อมูลโครงการ → pending / approved / closed / cancelled
 */
function mapProjectStatusToCalendarStatus(p) {
  const main = (p.statusMain || "").trim();
  const ar = (p.statusClose || "").trim();
  const as = (p.statusCloseDecree || "").trim();

  // ยกเลิกโครงการ
  if (main === "ยกเลิกโครงการ") {
    return "cancelled";
  }

  // ปิดโครงการแล้ว
  if (ar === "ส่งกิจการนิสิตเรียบร้อย" || as === "ปิดโครงการเรียบร้อย") {
    return "closed";
  }

  // อนุมัติโครงการแล้ว
  if (main === "อนุมัติโครงการ") {
    return "approved";
  }

  // อย่างอื่นถือเป็น pending
  return "pending";
}


function buildCalendarEventsFromProjects() {
  if (!Array.isArray(projects) || projects.length === 0) {
    calendarEvents = [];
    calendarEventsByDate = new Map();
    return;
  }

  calendarEvents = projects
    .map((p) => {
      // ✅ ใช้วันที่จากคอลัมน์ M เท่านั้น (lastWorkDate)
      const dateStr = p.lastWorkDate;
      let parsedDate = p.lastWorkDateObj;
      if (!parsedDate) {
        parsedDate = parseProjectDate(dateStr);
        if (parsedDate) p.lastWorkDateObj = parsedDate;
      }

      if (!parsedDate) return null; // ถ้า M ว่าง/อ่านไม่ได้ → ไม่เอาใส่ปฏิทิน

      const status = mapProjectStatusToCalendarStatus(p);

      return {
        project: p,
        title: p.name || "(ไม่ระบุชื่อโครงการ)",
        start: parsedDate,
        end: parsedDate,
        org: p.orgName || "(ไม่ระบุฝ่าย/ชมรม)",
        year: p.year || "ไม่ระบุ",
        status,
        code: p.code || "-",
        note: `รหัสโครงการ: ${p.code || "-"}`,
        budgetSource: p.fundSource || "-"
      };
    })
    .filter(Boolean);

  calendarEventsByDate = new Map();
  calendarEvents.forEach((ev) => {
    const d = ev.start;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    if (!calendarEventsByDate.has(key)) {
      calendarEventsByDate.set(key, []);
    }
    calendarEventsByDate.get(key).push(ev);
  });
}


/**
 * เตรียม Filter (ปี / องค์กร) จาก calendarEvents
 */
function initCalendarFilters() {
  const yearSelect = calendarYearSelectEl;
  const orgSelect = calendarOrgSelectEl;

  if (!yearSelect || !orgSelect) return;

  fillProjectYearSelect(yearSelect, selectedProjectSourceYear);
  orgSelect.innerHTML = `<option value="all">ทุกฝ่าย / ทุกชมรม</option>`;

  const orgs = Array.from(new Set(calendarEvents.map((e) => e.org).filter(Boolean)));
  orgs.sort();
  orgs.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    orgSelect.appendChild(opt);
  });
}

/**
 * คืนรายการ events ที่อยู่ในวัน date และผ่านเงื่อนไข filter
 */
function getEventsForDate(date) {
  const yearSel = calendarYearSelectEl;
  const orgSel = calendarOrgSelectEl;
  const statusSel = calendarStatusSelectEl;

  const yearFilter = yearSel ? yearSel.value : "all";
  const orgFilter = orgSel ? orgSel.value : "all";
  const statusFilter = statusSel ? statusSel.value : "all";

  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const baseEvents = calendarEventsByDate.get(key) || [];

  return baseEvents.filter((ev) => {
    if (yearFilter !== "all" && ev.year !== yearFilter) return false;
    if (orgFilter !== "all" && ev.org !== orgFilter) return false;
    if (statusFilter !== "all" && ev.status !== statusFilter) return false;

    return true;
  });
}

function getCalendarDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isSameCalendarDate(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarStatusText(status) {
  if (status === "closed") return "ปิดโครงการแล้ว";
  if (status === "approved") return "อนุมัติโครงการแล้ว";
  if (status === "cancelled") return "ยกเลิกโครงการ";
  return "อยู่ระหว่างดำเนินการ";
}

function getProjectCalendarSelectedEls() {
  return {
    panel: document.getElementById("calendarSelectedDayPanel"),
    title: document.getElementById("calendarSelectedDayTitle"),
    count: document.getElementById("calendarSelectedDayCount"),
    list: document.getElementById("calendarSelectedDayList")
  };
}

function getFilteredCalendarEventsForMonth(year, month) {
  const events = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    events.push(...getEventsForDate(new Date(year, month, day)));
  }
  return events;
}

function syncSelectedCalendarDateToMonth(year, month) {
  if (
    selectedCalendarDate &&
    selectedCalendarDate.getFullYear() === year &&
    selectedCalendarDate.getMonth() === month
  ) {
    return;
  }

  const today = new Date();
  if (today.getFullYear() === year && today.getMonth() === month) {
    selectedCalendarDate = new Date(year, month, today.getDate());
    return;
  }

  const firstEvent = getFilteredCalendarEventsForMonth(year, month)
    .sort((a, b) => a.start - b.start)[0];
  selectedCalendarDate = firstEvent
    ? new Date(firstEvent.start.getFullYear(), firstEvent.start.getMonth(), firstEvent.start.getDate())
    : new Date(year, month, 1);
}

function renderSelectedCalendarDay() {
  const { panel, title, count, list } = getProjectCalendarSelectedEls();
  if (!panel || !title || !count || !list || !selectedCalendarDate) return;

  const events = getEventsForDate(selectedCalendarDate);
  const dateText = selectedCalendarDate.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  title.textContent = dateText;
  count.textContent = `${events.length} โครงการ`;
  list.innerHTML = "";

  if (!events.length) {
    const empty = document.createElement("div");
    empty.innerHTML = renderListEmptyState("ไม่มีรายการโครงการในวันนี้", "เลือกวันอื่นเพื่อดูรายการโครงการ", "calendar");
    list.appendChild(empty);
    return;
  }

  events.forEach((ev) => {
    const item = document.createElement("button");
    item.className = "calendar-selected-item";
    item.type = "button";
    item.addEventListener("click", () => openCalendarModal(ev));

    const main = document.createElement("span");
    main.className = "calendar-selected-main";

    const titleEl = document.createElement("span");
    titleEl.className = "calendar-selected-title";
    titleEl.textContent = ev.title;

    const meta = document.createElement("span");
    meta.className = "calendar-selected-meta";
    meta.textContent = `${ev.code || "-"} · ${ev.org || "-"}`;

    main.appendChild(titleEl);
    main.appendChild(meta);

    const status = document.createElement("span");
    status.className = `status-pill status-${ev.status}`;
    status.textContent = getCalendarStatusText(ev.status);

    item.appendChild(main);
    item.appendChild(status);
    list.appendChild(item);
  });
}

/**
 * อัปเดตหัวปฏิทิน (ชื่อเดือน + ปี)
 */
function updateCalendarHeader() {
  const panel = calendarPanelTitleEl;
  if (!panel) return;

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const y = currentCalendarDate.getFullYear();
  const m = currentCalendarDate.getMonth();

  panel.textContent = `ปฏิทินกิจกรรม — ${monthNames[m]} ${y}`;
}

function getHeatmapLevel(count, maxCount) {
  if (!count || maxCount <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count >= 3 && count <= 5) return 3;
  if (count >= 6 && count <= 10) return 4;
  return 5;
}

function getCalendarMaxEvents() {
  if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) return 2;
  if (window.matchMedia && window.matchMedia("(max-width: 840px)").matches) return 3;
  return 4;
}

function measureCalendarRowHeight(container, lineCount) {
  const temp = document.createElement("div");
  temp.className = "calendar-day";
  temp.style.position = "absolute";
  temp.style.visibility = "hidden";
  temp.style.pointerEvents = "none";
  temp.style.height = "auto";
  temp.style.left = "-9999px";
  temp.style.top = "0";

  const header = document.createElement("div");
  header.className = "calendar-day-header";
  header.textContent = "30";

  const pill = document.createElement("span");
  pill.className = "calendar-today-pill";
  pill.textContent = "วันนี้";
  header.appendChild(pill);
  temp.appendChild(header);

  for (let i = 0; i < lineCount; i++) {
    const evDiv = document.createElement("div");
    evDiv.className = "calendar-event pending";
    evDiv.textContent = "โครงการตัวอย่าง";
    temp.appendChild(evDiv);
  }

  container.appendChild(temp);
  const height = temp.offsetHeight;
  temp.remove();
  return height;
}

function updateCalendarRowHeight() {
  if (!calendarContainerEl) return;
  const maxEvents = getCalendarMaxEvents();
  const lineCount = maxEvents + 1;
  const rowHeight = measureCalendarRowHeight(calendarContainerEl, lineCount);
  const scrollWrap =
    calendarContainerEl.closest(".calendar-grid-scroll") || calendarContainerEl;
  scrollWrap.style.setProperty("--calendar-row-height", `${rowHeight}px`);
}

/**
 * วาดปฏิทินตาม currentCalendarDate
 */
function generateCalendar() {
  const container = calendarContainerEl;
  if (!container) return;

  container.innerHTML = "";
  updateCalendarRowHeight();

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  syncSelectedCalendarDateToMonth(year, month);

  const monthEvents = getFilteredCalendarEventsForMonth(year, month);
  const maxEventsInDay = monthEvents.reduce((max, ev) => {
    const dayCount = getEventsForDate(ev.start).length;
    return Math.max(max, dayCount);
  }, 0);

  // วันแรกของเดือน
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun,1=Mon,...

  // จำนวนวันในเดือน
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // เติมช่องว่างก่อนวันที่ 1
  for (let i = 0; i < startWeekday; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day calendar-day-empty";
    container.appendChild(emptyCell);
  }

  // เติมวันที่ 1..daysInMonth
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = day;
    cell.appendChild(header);

    const thisDate = new Date(year, month, day);
    const todaysEvents = getEventsForDate(thisDate);
    const heatLevel = getHeatmapLevel(todaysEvents.length, maxEventsInDay);
    cell.dataset.date = getCalendarDateKey(thisDate);
    cell.dataset.eventCount = String(todaysEvents.length);
    cell.classList.add(`calendar-heat-${heatLevel}`);
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute(
      "aria-label",
      `${thisDate.toLocaleDateString("th-TH")} มี ${todaysEvents.length} โครงการ`
    );
    if (isSameCalendarDate(thisDate, selectedCalendarDate)) {
      cell.classList.add("calendar-day-selected");
    }

    const isToday =
      thisDate.getFullYear() === todayY &&
      thisDate.getMonth() === todayM &&
      thisDate.getDate() === todayD;
    if (isToday) {
      cell.classList.add("calendar-day-today");
      const pill = document.createElement("span");
      pill.className = "calendar-today-pill";
      pill.textContent = "วันนี้";
      header.appendChild(pill);
    }

    const MAX_EVENTS = getCalendarMaxEvents();
    const visibleEvents = todaysEvents.slice(0, MAX_EVENTS);

    if (todaysEvents.length) {
      cell.classList.add("calendar-day-has-events");
    }

    visibleEvents.forEach((ev) => {
      const evDiv = document.createElement("div");
      evDiv.className = `calendar-event ${ev.status}`;
      evDiv.textContent = ev.title;
      evDiv.title = ev.title;

      evDiv.addEventListener("click", (event) => {
        event.stopPropagation();
        openCalendarModal(ev);
      });

      cell.appendChild(evDiv);
    });

    const remaining = todaysEvents.length - MAX_EVENTS;
    if (remaining > 0) {
      const moreDiv = document.createElement("div");
      moreDiv.className = "calendar-event calendar-more";
      moreDiv.textContent = `และอื่น ๆ อีก ${remaining} โครงการ`;
      moreDiv.addEventListener("click", (event) => {
        event.stopPropagation();
        openCalendarDayModal(thisDate, todaysEvents);
      });
      cell.appendChild(moreDiv);
    }

    const selectDate = () => {
      selectedCalendarDate = new Date(year, month, day);
      generateCalendar();
    };
    cell.addEventListener("click", selectDate);
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectDate();
      }
    });

    // คลิกที่หัววันบน desktop เพื่อดูรายการทั้งหมดของวันนั้น
    if (todaysEvents.length > 0) {
      header.addEventListener("click", (event) => {
        if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) return;
        event.stopPropagation();
        openCalendarDayModal(thisDate, todaysEvents);
      });
    }

    container.appendChild(cell);
  }

  updateCalendarHeader();
  renderSelectedCalendarDay();
}

/**
 * เปิด Modal รายละเอียดกิจกรรม
 */
function openCalendarModal(ev) {
  if (!ev?.project) return;
  closeCalendarModal();
  openProjectModal(ev.project);
}

function openCalendarDayModal(dateObj, events) {
  const modal = document.getElementById("calendarModal");
  const titleEl = document.getElementById("calendarModalTitle");
  const bodyEl = document.getElementById("calendarModalBody");
  if (!modal || !titleEl || !bodyEl) return;
  if (!dateObj || !Array.isArray(events) || !events.length) return;

  const dateText = dateObj.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  titleEl.textContent = `โครงการวันที่ ${dateText}`;

  const rows = events
    .map((ev, idx) => {
      const statusText = getCalendarStatusText(ev.status);
      return `
        <tr data-day-idx="${idx}">
          <td>${ev.code || "-"}</td>
          <td>
            <div class="modal-table-title">${ev.title}</div>
            <div class="modal-table-caption">${ev.org || "-"}</div>
          </td>
          <td>
            <span class="status-pill status-${ev.status}">${statusText}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  bodyEl.innerHTML = `
    <div class="modal-table-wrap">
      <table class="modal-table">
        <thead>
          <tr>
            <th>รหัสโครงการ</th>
            <th>ชื่อโครงการ</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  // คลิกแถวเพื่อเปิดรายละเอียดโครงการเดียว
  bodyEl.querySelectorAll("tr[data-day-idx]").forEach((row) => {
    const idx = Number(row.getAttribute("data-day-idx"));
    const ev = events[idx];
    if (!ev) return;
    row.addEventListener("click", () => openCalendarModal(ev));
  });
  openDialog(modal, { focusSelector: "#calendarModalClose" });
}

function closeCalendarModal() {
  const modal = document.getElementById("calendarModal");
  if (!modal) return;
  closeDialog(modal);
}

/**
 * initCalendar — เรียกหลังจาก loadProjectsFromSheet() เสร็จ
 */
function initCalendar(ctxKey = activeProjectStatusContext) {
  setActiveProjectStatusContext(ctxKey);

  const prevBtn = prevMonthBtnEl;
  const nextBtn = nextMonthBtnEl;
  const modal = document.getElementById("calendarModal");
  const modalClose = document.getElementById("calendarModalClose");

  // สร้าง events จาก projects
  buildCalendarEventsFromProjects();
  // ตั้งค่า filter
  initCalendarFilters();
  // วาดปฏิทินครั้งแรก
  generateCalendar();

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      setActiveProjectStatusContext(ctxKey);
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      generateCalendar();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      setActiveProjectStatusContext(ctxKey);
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      generateCalendar();
    });
  }

  if (calendarYearSelectEl) {
    calendarYearSelectEl.addEventListener("change", async () => {
      setActiveProjectStatusContext(ctxKey);
      const selectedYear = calendarYearSelectEl.value;
      if (typeof switchProjectSourceYear === "function" && selectedYear && selectedYear !== "all") {
        await switchProjectSourceYear(selectedYear);
        return;
      }
      generateCalendar();
    });
  }

  [calendarOrgSelectEl, calendarStatusSelectEl].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => {
      setActiveProjectStatusContext(ctxKey);
      generateCalendar();
    });
  });

  if (modalClose) {
    modalClose.addEventListener("click", closeCalendarModal);
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeCalendarModal();
      }
    });
  }
}
