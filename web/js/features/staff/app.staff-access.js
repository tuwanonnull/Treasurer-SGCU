/* Staff application + approval flow */
function initStaffAccessPages() {
  if (window.__sgcuStaffAccessInitDone) return;
  window.__sgcuStaffAccessInitDone = true;

  const shared = window.sgcuStaffAccessShared;
  const catalog = window.sgcuStaffAccessCatalog;
  const catalogViewFactory = window.sgcuStaffAccessCatalogView;
  if (!shared || !catalog || !catalogViewFactory) {
    console.error("staff access dependencies are not loaded - app.staff-access.js:10");
    window.__sgcuStaffAccessInitDone = false;
    return;
  }

  const applicationModalEl = document.getElementById("staffApplicationModal");
  const applicationModalCloseEl = document.getElementById("staffApplicationModalClose");
  const applicationModalOpenEl = document.getElementById("loginHelpApplyBtn");
  const approvalPageEl = document.querySelector('.page-view[data-page="staff-approval"], .page-view[data-page="staff-directory-staff"], .page-view[data-page="staff-temporary-access-staff"], .page-view[data-page="org-representative-approval-staff"]');
  if (!applicationModalEl && !approvalPageEl) return;

  const appFormEl = document.getElementById("staffApplicationForm");
  const appPositionEl = document.getElementById("staffApplicationPosition");
  const appProfileHintEl = document.getElementById("staffApplicationProfileHint");
  const appStudentFieldsEl = document.getElementById("staffApplicationStudentFields");
  const appDivisionLabelEl = document.getElementById("staffApplicationDivisionLabel");
  const appDivisionEl = document.getElementById("staffApplicationDivision");
  const appLevelLabelEl = document.getElementById("staffApplicationLevelLabel");
  const appLevelEl = document.getElementById("staffApplicationLevel");
  const appResolvedPositionEl = document.getElementById("staffApplicationResolvedPosition");
  const appSubmitEl = document.getElementById("staffApplicationSubmitBtn");
  const appMessageEl = document.getElementById("staffApplicationMessage");
  const myTableBodyEl = document.getElementById("staffApplicationMyTableBody");
  const myCaptionEl = document.getElementById("staffApplicationListCaption");

  const approvalPanelTitleEl = document.getElementById("staffApprovalPanelTitle");
  const approvalPanelCaptionEl = document.getElementById("staffApprovalPanelCaption");
  const approvalBodyEl = document.getElementById("staffApprovalPendingBody");
  const approvalCaptionEl = document.getElementById("staffApprovalPendingCaption") || approvalPanelCaptionEl;
  const approvalMessageEl = document.getElementById("staffApprovalMessage");
  const approvalPendingContentEl = document.getElementById("staffApprovalPendingContent");
  const approvalHistoryContentEl = document.getElementById("staffApprovalHistoryContent");
  const approvalHistoryBodyEl = document.getElementById("staffApprovalHistoryBody");
  const approvalHistoryCaptionEl = document.getElementById("staffApprovalHistoryCaption");
  const approvalDetailModalEl = document.getElementById("staffApprovalDetailModal");
  const approvalDetailCloseEl = document.getElementById("staffApprovalDetailClose");
  const approvalDetailBodyEl = document.getElementById("staffApprovalDetailBody");
  const approvalPendingPanelEl = document.getElementById("staffApprovalPendingPanel");
  const approvalShowPendingBtnEl = document.getElementById("staffApprovalShowPendingBtn");
  const approvalShowHistoryBtnEl = document.getElementById("staffApprovalShowHistoryBtn");
  const staffManagementPeopleTabEl = document.getElementById("staffManagementPeopleTab");
  const staffManagementPositionTabEl = document.getElementById("staffManagementPositionTab");
  const staffPositionSettingsViewEl = document.getElementById("staffPositionSettingsView");
  const staffApprovalSearchInputEl = document.getElementById("staffApprovalSearchInput");
  const staffApprovalDivisionFilterEl = document.getElementById("staffApprovalDivisionFilter");
  const staffApprovalPositionFilterEl = document.getElementById("staffApprovalPositionFilter");
  const staffApprovalSortFilterEl = document.getElementById("staffApprovalSortFilter");
  const staffApprovalFilterResetBtnEl = document.getElementById("staffApprovalFilterResetBtn");
  const staffApprovalSelectAllEl = document.getElementById("staffApprovalSelectAll");
  const staffApprovalSelectionToggleBtnEl = document.getElementById("staffApprovalSelectionToggleBtn");
  const staffApprovalPendingContentEl = document.getElementById("staffApprovalPendingContent");
  const staffApprovalBulkBarEl = document.getElementById("staffApprovalBulkBar");
  const staffApprovalBulkCountEl = document.getElementById("staffApprovalBulkCount");
  const staffApprovalBulkClearBtnEl = document.getElementById("staffApprovalBulkClearBtn");
  const staffApprovalBulkDeleteBtnEl = document.getElementById("staffApprovalBulkDeleteBtn");
  const staffCurrentSelectAllEl = document.getElementById("staffCurrentSelectAll");
  const staffCurrentSelectionToggleBtnEl = document.getElementById("staffCurrentSelectionToggleBtn");
  const staffCurrentBulkBarEl = document.getElementById("staffCurrentBulkBar");
  const staffCurrentBulkCountEl = document.getElementById("staffCurrentBulkCount");
  const staffCurrentBulkClearBtnEl = document.getElementById("staffCurrentBulkClearBtn");
  const staffCurrentBulkRevokeBtnEl = document.getElementById("staffCurrentBulkRevokeBtn");
  const staffBulkDeleteConfirmModalEl = document.getElementById("staffBulkDeleteConfirmModal");
  const staffApprovalPendingCountEl = document.getElementById("staffApprovalPendingCount");
  const staffApprovalApprovedCountEl = document.getElementById("staffApprovalApprovedCount");
  const staffApprovalPositionCountEl = document.getElementById("staffApprovalPositionCount");
  const staffApprovalTypeStaffBtnEl = document.getElementById("staffApprovalTypeStaffBtn");
  const staffApprovalTypeOrgBtnEl = document.getElementById("staffApprovalTypeOrgBtn");
  const staffApprovalStaffSectionEl = document.getElementById("staffApprovalStaffSection");
  const staffApprovalMainApprovalTabEl = document.getElementById("staffApprovalMainApprovalTab");
  const staffApprovalMainStructureTabEl = document.getElementById("staffApprovalMainStructureTab");
  const staffApprovalMainAuthAccessTabEl = document.getElementById("staffApprovalMainAuthAccessTab");
  const staffApprovalMainPanelEl = document.getElementById("staffApprovalMainPanel");
  const staffStructurePanelEl = document.getElementById("staffStructurePanel");
  const staffAuthAccessPanelEl = document.getElementById("staffAuthAccessPanel");
  const staffAuthAccessFormEl = document.getElementById("staffAuthAccessForm");
  const staffAuthAccessTableBodyEl = document.getElementById("staffAuthAccessTableBody");
  const staffAuthAccessMobileListEl = document.getElementById("staffAuthAccessMobileList");
  const staffAuthAccessListCaptionEl = document.getElementById("staffAuthAccessListCaption");
  const staffAuthAccessProfilePreviewEl = document.getElementById("staffAuthAccessProfilePreview");
  const staffAuthAccessMessageEl = document.getElementById("staffAuthAccessMessage");
  const staffAuthAccessDeleteBtnEl = document.getElementById("staffAuthAccessDeleteBtn");
  const staffAuthAccessResetBtnEl = document.getElementById("staffAuthAccessResetBtn");
  const staffAuthAccessRefreshBtnEl = document.getElementById("staffAuthAccessRefreshBtn");
  const staffAuthAccessFields = {
    id: document.getElementById("staffAuthAccessId"),
    email: document.getElementById("staffAuthAccessEmail"),
    startsAt: document.getElementById("staffAuthAccessStartsAt"),
    endsAt: document.getElementById("staffAuthAccessEndsAt"),
    active: document.getElementById("staffAuthAccessActive"),
    reason: document.getElementById("staffAuthAccessReason")
  };
  const orgRepresentativeApprovalSectionEl = document.getElementById("orgRepresentativeApprovalSection");
  const orgRepresentativePanelTitleEl = document.getElementById("orgRepresentativeApprovalPanelTitle");
  const orgRepresentativePanelCaptionEl = document.getElementById("orgRepresentativeApprovalPanelCaption");
  const orgRepresentativePendingContentEl = document.getElementById("orgRepresentativePendingContent");
  const orgRepresentativeHistoryContentEl = document.getElementById("orgRepresentativeHistoryContent");
  const orgRepresentativePendingBodyEl = document.getElementById("orgRepresentativePendingBody");
  const orgRepresentativeHistoryBodyEl = document.getElementById("orgRepresentativeHistoryBody");
  const orgRepresentativeHistoryCaptionEl = document.getElementById("orgRepresentativeHistoryCaption");
  const orgRepresentativeMessageEl = document.getElementById("orgRepresentativeApprovalMessage");
  const orgRepresentativeOverviewContentEl = document.getElementById("orgRepresentativeOverviewContent");
  const orgRepresentativeOverviewBodyEl = document.getElementById("orgRepresentativeOverviewBody");
  const orgRepresentativeShowOverviewBtnEl = document.getElementById("orgRepresentativeShowOverviewBtn");
  const orgRepresentativeExportCsvBtnEl = document.getElementById("orgRepresentativeExportCsvBtn");
  const orgRepresentativeDeleteYearBtnEl = document.getElementById("orgRepresentativeDeleteYearBtn");
  const orgRepresentativeShowPendingBtnEl = document.getElementById("orgRepresentativeShowPendingBtn");
  const orgRepresentativeShowHistoryBtnEl = document.getElementById("orgRepresentativeShowHistoryBtn");
  const orgRepresentativeSearchInputEl = document.getElementById("orgRepresentativeSearchInput");
  const orgRepresentativeStatusFilterEl = document.getElementById("orgRepresentativeStatusFilter");
  const orgRepresentativeAcademicYearFilterEl = document.getElementById("orgRepresentativeAcademicYearFilter");
  const orgRepresentativeGroupFilterEl = document.getElementById("orgRepresentativeGroupFilter");
  const orgRepresentativeFilterResetBtnEl = document.getElementById("orgRepresentativeFilterResetBtn");
  const orgRepresentativeTotalOrgCountEl = document.getElementById("orgRepresentativeTotalOrgCount");
  const orgRepresentativeCompleteOrgCountEl = document.getElementById("orgRepresentativeCompleteOrgCount");
  const orgRepresentativeIncompleteOrgCountEl = document.getElementById("orgRepresentativeIncompleteOrgCount");
  const orgRepresentativeApprovedTotalCountEl = document.getElementById("orgRepresentativeApprovedTotalCount");
  const orgRepresentativeMainOverviewTabEl = document.getElementById("orgRepresentativeMainOverviewTab");
  const orgRepresentativeMainFilterTabEl = document.getElementById("orgRepresentativeMainFilterTab");
  const orgRepresentativeOverviewPanelEl = document.getElementById("orgRepresentativeOverviewPanel");
  const orgRepresentativeFilterPanelEl = document.getElementById("orgRepresentativeFilterPanel");
  const organizationCatalogImportBtnEl = document.getElementById("organizationCatalogImportBtn");
  const organizationCatalogImportFileEl = document.getElementById("organizationCatalogImportFile");
  const organizationCatalogImportMessageEl = document.getElementById("organizationCatalogImportMessage");
  const organizationCatalogTableBodyEl = document.getElementById("organizationCatalogTableBody");
  const organizationCatalogTableCaptionEl = document.getElementById("organizationCatalogTableCaption");
  const organizationCatalogFormEl = document.getElementById("organizationCatalogForm");
  const organizationCatalogFormTitleEl = document.getElementById("organizationCatalogFormTitle");
  const organizationCatalogFormMessageEl = document.getElementById("organizationCatalogFormMessage");
  const organizationCatalogSaveBtnEl = document.getElementById("organizationCatalogSaveBtn");
  const organizationCatalogResetBtnEl = document.getElementById("organizationCatalogResetBtn");
  const organizationCatalogArchiveBtnEl = document.getElementById("organizationCatalogArchiveBtn");
  const organizationCatalogAccountFilterEl = document.getElementById("organizationCatalogAccountFilter");
  const organizationCatalogGroupFilterEl = document.getElementById("organizationCatalogGroupFilter");
  const organizationCatalogSearchInputEl = document.getElementById("organizationCatalogSearchInput");
  const organizationCatalogFilterResetBtnEl = document.getElementById("organizationCatalogFilterResetBtn");
  const organizationCatalogCopyYearBtnEl = document.getElementById("organizationCatalogCopyYearBtn");
  const organizationCatalogShowMoreBtnEl = document.getElementById("organizationCatalogShowMoreBtn");
  const organizationCatalogTableActionsEl = document.getElementById("organizationCatalogTableActions");
  const organizationCatalogAcademicYearEl = document.getElementById("organizationCatalogAcademicYear");
  const organizationCatalogTableAcademicYearFilterEl = document.getElementById("organizationCatalogTableAcademicYearFilter");
  const organizationCatalogTotalCountEl = document.getElementById("organizationCatalogTotalCount");
  const organizationCatalogGroupCountEl = document.getElementById("organizationCatalogGroupCount");
  const organizationCatalogFilteredCountEl = document.getElementById("organizationCatalogFilteredCount");
  const organizationCatalogVisibleCountEl = document.getElementById("organizationCatalogVisibleCount");
  const organizationCatalogResponsibilityControlsEl = document.getElementById("organizationCatalogResponsibilityControls");
  const organizationCatalogResponsibilityDivisionEl = document.getElementById("organizationCatalogResponsibilityDivision");
  const organizationCatalogResponsibilitySubCodeEl = document.getElementById("organizationCatalogResponsibilitySubCode");
  const organizationCatalogCustomResponsibilityControlsEl = document.getElementById("organizationCatalogCustomResponsibilityControls");
  const organizationCatalogCustomDivisionCodeEl = document.getElementById("organizationCatalogCustomDivisionCode");
  const organizationCatalogCustomDivisionNameEl = document.getElementById("organizationCatalogCustomDivisionName");
  const organizationCatalogFields = {
    id: document.getElementById("organizationCatalogId"),
    group: document.getElementById("organizationCatalogGroup"),
    name: document.getElementById("organizationCatalogName"),
    code: document.getElementById("organizationCatalogCode"),
    documentRunCode: document.getElementById("organizationCatalogRunCode"),
    accountNo: document.getElementById("organizationCatalogAccountNo")
  };

  if (approvalDetailModalEl && approvalDetailModalEl.parentElement !== document.body) {
    document.body.appendChild(approvalDetailModalEl);
  }
  if (staffBulkDeleteConfirmModalEl && staffBulkDeleteConfirmModalEl.parentElement !== document.body) {
    document.body.appendChild(staffBulkDeleteConfirmModalEl);
  }

  const positionManageFormEl = document.getElementById("staffPositionManageForm");
  const positionManagePanelEl = document.getElementById("staffPositionManagePanel");
  const positionManageInputEl = document.getElementById("staffPositionManageInput");
  const positionDivisionCodeEl = document.getElementById("staffPositionDivisionCode");
  const positionDivisionNameEl = document.getElementById("staffPositionDivisionName");
  const positionLevelCodeEl = document.getElementById("staffPositionLevelCode");
  const positionAllowedPagesEl = document.getElementById("staffPositionAllowedPages");
  const positionManageSubmitBtnEl = document.getElementById("staffPositionManageAddBtn");
  const positionManageDeleteBtnEl = document.getElementById("staffPositionManageDeleteBtn");
  const positionManageCancelBtnEl = document.getElementById("staffPositionManageCancelBtn");
  const positionManageMessageEl = document.getElementById("staffPositionManageMessage");
  const positionListEl = document.getElementById("staffPositionList");
  const positionListPanelEl = document.querySelector(".staff-position-list-panel");
  const positionOptionsDatalistEl = document.getElementById("staffPositionOptionsList");
  const divisionCodeOptionsDatalistEl = document.getElementById("staffDivisionCodeOptionsList");
  const divisionNameOptionsDatalistEl = document.getElementById("staffDivisionNameOptionsList");
  const orgStructureMemberFormEl = document.getElementById("orgStructureMemberForm");
  const orgStructureTableBodyEl = document.getElementById("orgStructureTableBody");
  const orgStructureMobileListEl = document.getElementById("orgStructureMobileList");
  const orgStructureListCaptionEl = document.getElementById("orgStructureListCaption");
  const orgStructureFormMessageEl = document.getElementById("orgStructureFormMessage");
  const orgStructureTermFilterEl = document.getElementById("orgStructureTermFilter");
  const orgStructureStatusFilterEl = document.getElementById("orgStructureStatusFilter");
  const orgStructureSearchInputEl = document.getElementById("orgStructureSearchInput");
  const orgStructureFilterResetEl = document.getElementById("orgStructureFilterReset");
  const orgStructureRefreshBtnEl = document.getElementById("orgStructureRefreshBtn");
  const orgStructureExportBtnEl = document.getElementById("orgStructureExportBtn");
  const orgStructureArchiveBtnEl = document.getElementById("orgStructureArchiveBtn");
  const orgStructureResetBtnEl = document.getElementById("orgStructureResetBtn");
  const orgStructurePhotoPreviewEl = document.getElementById("orgStructurePhotoPreview");
  const orgStructureFields = {
    id: document.getElementById("orgStructureMemberId"),
    positionCode: document.getElementById("orgStructurePositionCode"),
    position: document.getElementById("orgStructurePosition"),
    prefix: document.getElementById("orgStructurePrefix"),
    firstName: document.getElementById("orgStructureFirstName"),
    lastName: document.getElementById("orgStructureLastName"),
    nick: document.getElementById("orgStructureNick"),
    studentId: document.getElementById("orgStructureStudentId"),
    year: document.getElementById("orgStructureYear"),
    faculty: document.getElementById("orgStructureFaculty"),
    email: document.getElementById("orgStructureEmail"),
    lineId: document.getElementById("orgStructureLineId"),
    phone: document.getElementById("orgStructurePhone"),
    photoUrl: document.getElementById("orgStructurePhotoUrl"),
    status: document.getElementById("orgStructureStatus")
  };

  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const firestoreCollections = appConfig.firestore?.collections || {};
  const COLLECTION_APPLICATIONS = firestoreCollections.staffApplications || "staffApplications";
  const COLLECTION_ORG_REPRESENTATIVES =
    firestoreCollections.organizationRepresentativeApplications || "organizationRepresentativeApplications";
  const COLLECTION_AUTH_EMAIL_ACCESS = firestoreCollections.authEmailAccess || "authEmailAccess";
  const COLLECTION_PROFILES = firestoreCollections.staffProfiles || "staffProfiles";
  const COLLECTION_USER_PROFILES = firestoreCollections.userProfiles || "userProfiles";
  const COLLECTION_POSITIONS = firestoreCollections.staffPositionCatalog || "staffPositionCatalog";
  const COLLECTION_ORG_STRUCTURE = firestoreCollections.orgStructureMembers || "orgStructureMembers";
  const COLLECTION_ORGANIZATION_CATALOG = firestoreCollections.organizationCatalog || "organizationCatalog";
  const COLLECTION_PUBLIC_CACHE = firestoreCollections.publicCache || "publicCache";
  const COLLECTION_POSITION_CODE_COUNTERS =
    firestoreCollections.staffPositionCodeCounters || "staffPositionCodeCounters";
  const STAFF_APPLICATION_LIST_LIMIT = 500;
  const ORG_REPRESENTATIVE_LIST_LIMIT = 500;
  const STAFF_HEAD_EMAIL_OVERRIDES = new Set([
    "tuwanon.kimchiang@gmail.com",
    "treasurer.sgcu68@gmail.com"
  ]);
  const LOGIN_PROFILE_STORAGE_KEY = "sgcu_user_profile_by_email_v1";
  const LEGACY_LOGIN_PROFILE_STORAGE_KEY = "sgcu_borrow_profile_by_email_v1";
  const STUDENT_FACULTY_MAP = {
    "21": "วิศวกรรมศาสตร์",
    "22": "อักษรศาสตร์",
    "23": "วิทยาศาสตร์",
    "24": "รัฐศาสตร์",
    "25": "สถาปัตยกรรมศาสตร์",
    "26": "พาณิชยศาสตร์และการบัญชี",
    "27": "ครุศาสตร์",
    "28": "นิเทศศาสตร์",
    "29": "เศรษฐศาสตร์",
    "30": "แพทยศาสตร์",
    "31": "สัตวแพทยศาสตร์",
    "32": "ทันตแพทยศาสตร์",
    "33": "เภสัชศาสตร์",
    "34": "นิติศาสตร์",
    "35": "ศิลปกรรมศาสตร์",
    "37": "สหเวชศาสตร์",
    "38": "จิตวิทยา",
    "39": "วิทยาศาสตร์การกีฬา",
    "40": "เกษตรและบูรณาการ",
    "56": "สถาบันนวัตกรรมบูรณาการฯ"
  };
  const DEFAULT_POSITION_OPTIONS = [
    { name: "เหรัญญิก", divisionCodeYY: "00", levelCodeZZ: "01" },
    { name: "เลขานุการฝ่ายเหรัญญิก", divisionCodeYY: "00", levelCodeZZ: "03" },
    { name: "ผู้ช่วยเหรัญญิก", divisionCodeYY: "01", levelCodeZZ: "04" },
    { name: "ประธานฝ่ายบริหารและพัฒนางบประมาณ", divisionCodeYY: "02", levelCodeZZ: "01" },
    { name: "รองประธานฝ่ายบริหารและพัฒนางบประมาณ", divisionCodeYY: "02", levelCodeZZ: "02" },
    { name: "ผู้ช่วยฝ่ายบริหารและพัฒนางบประมาณ", divisionCodeYY: "02", levelCodeZZ: "04" },
    { name: "ประธานฝ่ายหาทุนและสิทธิประโยชน์", divisionCodeYY: "03", levelCodeZZ: "01" },
    { name: "รองประธานฝ่ายหาทุนและสิทธิประโยชน์", divisionCodeYY: "03", levelCodeZZ: "02" },
    { name: "ผู้ช่วยฝ่ายหาทุนและสิทธิประโยชน์", divisionCodeYY: "03", levelCodeZZ: "04" },
    { name: "ประธานฝ่ายกายภาพและพัสดุ", divisionCodeYY: "04", levelCodeZZ: "01" },
    { name: "เลขานุการฝ่ายกายภาพและพัสดุ", divisionCodeYY: "04", levelCodeZZ: "03" },
    { name: "ผู้ช่วยฝ่ายกายภาพและพัสดุ", divisionCodeYY: "04", levelCodeZZ: "04" },
    { name: "เจ้าหน้าที่สำนักบริหารกิจการนิสิต", divisionCodeYY: "09", levelCodeZZ: "04" }
  ];
  const STAFF_PAGE_OPTIONS = [
    { id: "dashboard-staff", label: "ภาพรวมโครงการ" },
    { id: "project-live-staff", label: "จัดการโครงการ" },
    { id: "treasurer-handover-staff", label: "คู่มือ เหรัญญิก อบจ." },
    { id: "system-data-staff", label: "ข้อมูลระบบ" },
    { id: "budget-approval-staff", label: "คำของบประมาณ" },
    { id: "borrow-assets-staff", label: "ยืม-คืนพัสดุ" },
    { id: "meeting-room-staff", label: "ห้องประชุม" },
    { id: "staff-approval", label: "จัดการสตาฟ" },
    { id: "staff-directory-staff", label: "ทำเนียบรุ่น" },
    { id: "staff-temporary-access-staff", label: "สิทธิ์ชั่วคราว" },
    { id: "org-representative-approval-staff", label: "ตัวแทนองค์กร" },
    { id: "content-management-staff", label: "จัดการเนื้อหา" },
    { id: "content-news-staff", label: "ข่าวสาร" },
    { id: "content-documents-staff", label: "เอกสารการเงิน" }
  ];
  const STAFF_IMPLICIT_ALLOWED_PAGES = ["login"];
  const REQUIRED_ORG_REPRESENTATIVE_ROLES = [
    { key: "president", label: "ประธาน" },
    { key: "vice_president", label: "รองประธาน" },
    { key: "secretary", label: "เลขา" },
    { key: "treasurer", label: "เหรัญญิก" }
  ];

  let firestore = window.sgcuFirestore || {};
  let hasStore = false;
  let unsubscribeMyApplications = null;
  let unsubscribePendingApplications = null;
  let unsubscribeApprovalHistory = null;
  let unsubscribePositionCatalog = null;
  let positionCatalogGeneration = 0;
  let positionCatalogHasListenerError = false;
  let unsubscribeOrgStructureMembers = null;
  let unsubscribeAuthEmailAccess = null;
  let unsubscribeOrgRepresentativeApplications = null;

  let currentMyApplications = [];
  let currentPendingApplications = [];
  let currentApprovedHistory = [];
  let currentApprovedHistoryGrouped = [];
  let currentAuthEmailAccessEntries = [];
  let currentOrgRepresentativeApplications = [];
  let currentOrgRepresentativePending = [];
  let currentOrgStructureMembers = [];
  const ORGANIZATION_CATALOG_PAGE_SIZE = 120;
  const organizationCatalogFilters = {
    account: "all",
    group: "all",
    query: "",
    visibleLimit: ORGANIZATION_CATALOG_PAGE_SIZE
  };
  let orgStructureTermInitialized = false;
  const orgStructureFilters = {
    query: "",
    term: "all",
    status: "all"
  };
  let currentOrgRepresentativeApproved = [];
  let currentOrgRepresentativeOrganizations = [];
  let currentOrgRepresentativeFilteredOrganizations = [];
  let currentOrgRepresentativeAcademicYear = "";
  let orgRepresentativeOrganizationsDirty = true;
  let orgRepresentativeCatalogIndexCache = {
    signature: "",
    rows: [],
    byId: new Map(),
    byBaseId: new Map(),
    byGroup: new Map(),
    byCodeGroup: new Map(),
    byRunGroup: new Map(),
    byNameGroup: new Map()
  };
  let orgRepresentativeResolveCache = new WeakMap();
  let orgRepresentativeOrgFiltersLoadPromise = null;
  let orgRepresentativeOrgFiltersLoadedForPage = false;
  let currentPositionCatalog = [];
  let lastPositionAccessSyncSignature = "";
  let positionAccessSyncInFlight = false;
  let positionCatalogLoadState = "idle";
  let currentEditingPositionId = "";
  let appFormStatusLocked = false;
  let currentApprovalView = "pending";
  let currentStaffManagementView = "people";
  const staffApprovalFilters = {
    query: "",
    division: "all",
    position: "all",
    sort: "newest"
  };
  let staffApprovalPositionDivisionMap = new Map();
  const selectedPendingApplicationIds = new Set();
  let visiblePendingApplicationIds = [];
  const selectedCurrentStaffKeys = new Set();
  let visibleCurrentStaffKeys = [];
  let currentApprovalType = "staff";
  let currentStaffApprovalMainTab = "approval";
  let currentOrgRepresentativeView = "overview";
  let currentApprovalDetailRequestKey = "";
  let currentAccessProfile = null;
  let currentAccessProfileEmail = "";
  let currentAccessProfileLoadingEmail = "";
  let lastKnownAuthState = {
    isAuthenticated: false,
    uid: "",
    email: ""
  };
  let deferredBootstrapTimer = 0;
  let approvalUiSyncTimer = 0;
  let organizationCatalogManualRunSyncTimer = 0;
  let organizationCatalogManualRunSyncSignature = "";

  /* @include ./app.staff-access.parts/approval-views-and-dialogs.js.inc */
  /* @include ./app.staff-access.parts/access-and-position-policy.js.inc */
  /* @include ./app.staff-access.parts/staff-directory.js.inc */
  /* @include ./app.staff-access.parts/position-catalog-forms.js.inc */
  /* @include ./app.staff-access.parts/approval-lists.js.inc */
  /* @include ./app.staff-access.parts/representative-organization-matching.js.inc */
  /* @include ./app.staff-access.parts/organization-catalog-codes.js.inc */
  /* @include ./app.staff-access.parts/organization-catalog-editor.js.inc */
  /* @include ./app.staff-access.parts/organization-catalog-year-copy.js.inc */
  /* @include ./app.staff-access.parts/organization-catalog-save.js.inc */
  /* @include ./app.staff-access.parts/representative-roster.js.inc */
  /* @include ./app.staff-access.parts/temporary-access.js.inc */
  /* @include ./app.staff-access.parts/firestore-listeners.js.inc */
  /* @include ./app.staff-access.parts/staff-application-actions.js.inc */
  /* @include ./app.staff-access.parts/approval-actions.js.inc */
  /* @include ./app.staff-access.parts/approval-events.js.inc */
  /* @include ./app.staff-access.parts/organization-events.js.inc */
  const activateStaffAdminPage = (page = "") => {
    if (page === "staff-directory-staff") {
      setStaffApprovalMainTab("structure");
    } else if (page === "staff-temporary-access-staff") {
      setStaffApprovalMainTab("auth-access");
    } else if (page === "staff-approval") {
      setStaffApprovalMainTab("approval");
    } else {
      return;
    }
    scheduleApprovalUiSync();
  };

  window.addEventListener("sgcu:auth-state", handleAuthOrProfileUpdate);
  window.addEventListener("sgcu:user-profile-updated", prefillApplicationForm);
  window.addEventListener("sgcu:page-active", (event) => {
    activateStaffAdminPage((event?.detail?.page || "").toString());
  });
  window.addEventListener("hashchange", () => {
    const page = (window.location.hash || "").replace("#", "");
    activateStaffAdminPage(page);
    if (["staff-approval", "staff-directory-staff", "staff-temporary-access-staff", "org-representative-approval-staff"].includes(page)) {
      scheduleApprovalUiSync();
    }
  });

  if (window.sgcuAuth?.auth && typeof window.sgcuAuth.onAuthStateChanged === "function") {
    window.sgcuAuth.onAuthStateChanged(window.sgcuAuth.auth, (user) => {
      lastKnownAuthState = {
        isAuthenticated: !!user,
        uid: (user?.uid || "").toString().trim(),
        email: (user?.email || "").toString().trim().toLowerCase()
      };
      handleAuthOrProfileUpdate();
    });
  }

  resolveStore();
  startPositionCatalogListener();
  renderApplicationPositionSelect();
  prefillApplicationForm();
  setApplicationAvailabilityByAuth();
  setApprovalAvailabilityByRole();
  startMyApplicationsListener();
  startPendingApplicationsListener();
  startApprovedHistoryListener();
  resetAuthAccessForm();
  startOrgRepresentativeApplicationsListener();
  setApprovalView("pending");
  setStaffManagementView("people");
  const initialStaffPage = (window.location.hash || "").replace("#", "");
  setStaffApprovalMainTab(
    initialStaffPage === "staff-directory-staff"
      ? "structure"
      : initialStaffPage === "staff-temporary-access-staff"
        ? "auth-access"
        : "approval"
  );
  setOrgRepresentativeView("overview");
  setApprovalType("staff");
  updateOrgStructurePhotoPreview();
  startOrganizationCatalogManualRunAutosync();

  window.addEventListener("beforeunload", () => {
    if (deferredBootstrapTimer) {
      window.clearTimeout(deferredBootstrapTimer);
      deferredBootstrapTimer = 0;
    }
    if (approvalUiSyncTimer) {
      window.clearTimeout(approvalUiSyncTimer);
      approvalUiSyncTimer = 0;
    }
    if (organizationCatalogManualRunSyncTimer) {
      window.clearInterval(organizationCatalogManualRunSyncTimer);
      organizationCatalogManualRunSyncTimer = 0;
    }
    [
      unsubscribeMyApplications,
      unsubscribePendingApplications,
      unsubscribeApprovalHistory,
      unsubscribeOrgRepresentativeApplications,
      unsubscribePositionCatalog,
      unsubscribeOrgStructureMembers,
      unsubscribeAuthEmailAccess
    ].forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch (_) {
          // ignore
        }
      }
    });
    unsubscribeMyApplications = null;
    unsubscribePendingApplications = null;
    unsubscribeApprovalHistory = null;
    unsubscribeOrgRepresentativeApplications = null;
    unsubscribePositionCatalog = null;
    positionCatalogGeneration += 1;
    unsubscribeOrgStructureMembers = null;
    unsubscribeAuthEmailAccess = null;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStaffAccessPages, { once: true });
} else {
  initStaffAccessPages();
}
