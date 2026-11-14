// Test-only source: production meetings always start with an explicit import.
export async function loadMeetingFixture(page) {
  const amounts = [120000, 80000, 60000, 40000, 30000, 20000];
  const names = ['กิจการนิสิต', 'ศิลปวัฒนธรรม', 'พัฒนาสังคม', 'กีฬา', 'วิชาการ', 'สื่อสารองค์กร'];
  const projects = ['ต้อนรับนิสิตใหม่', 'เทศกาลดนตรีนิสิต', 'อาสาพัฒนาชุมชน', 'กีฬาสานสัมพันธ์', 'เวทีแลกเปลี่ยนวิชาการ', 'สื่อสร้างสรรค์นิสิต'];
  const organizations = names.map((name, i) => ({code: `SGCU-${String(i + 1).padStart(2, '0')}.00`, name: `ฝ่าย${name}`}));
  const source = {version: 1, rounds: [{id: 'fixture', label: 'รอบทดสอบ', organizations}], requests: projects.map((name, i) => ({id: `fixture-${i}`, budgetRoundId: 'fixture', projectCodeGenerated: `${organizations[i].code}.01`, projectName: name, organizationName: organizations[i].name, estimatedExpense: amounts[i]}))};
  await page.locator('[data-source-file]').setInputFiles({name: 'meeting.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source))});
  
  await page.locator('[data-form="import"] button[type="submit"]').click();
}
