/* App configuration (loaded before app.core.js) */
const SGCU_APP_CONFIG = {
  sheets: {
    projectSources:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoybDIWotYcgg-UWuRAUvbEkmWrdIbKbHWANHRyzta4i7CCNR5dKPVi_40ruIxrvbVMtsxrUUagrEx/pub?output=csv",
    borrowAssets:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcx0zotyWntFscUtgXHg4dkJQ6xI16Xrasy58sQfr-29iwgdpujpuvLC7poHH3TG4KR6P36A-bLyZR/pub?gid=0&single=true&output=csv"
  },
  managementLinks: {
    projectSources:
      "https://docs.google.com/spreadsheets/d/1YmrHUdwdCGErwuMOlm9ohEFDvJkeeSq8AKNUu4h6c8c/edit?usp=sharing",
    borrowAssets: ""
  },
  firestore: {
    collections: {
      auditLogs: "auditLogs",
      appSettings: "appSettings",
      borrowAssetRequests: "borrowAssetRequests",
      borrowAssetCatalog: "borrowAssetCatalog",
      borrowAssetStockReservations: "borrowAssetStockReservations",
      budgetApprovalRequests: "budgetApprovalRequests",
      budgetApprovalSettings: "budgetApprovalSettings",
      downloadDocuments: "downloadDocuments",
      meetingRoomBookings: "meetingRoomBookings",
      meetingRoomHolidays: "meetingRoomHolidays",
      meetingRooms: "meetingRooms",
      newsItems: "newsItems",
      publicCache: "publicCache",
      organizationCatalog: "organizationCatalog",
      orgStructureMembers: "orgStructureMembers",
      organizationRepresentativeApplications: "organizationRepresentativeApplications",
      authEmailAccess: "authEmailAccess",
      staffApplications: "staffApplications",
      staffPositionCatalog: "staffPositionCatalog",
      staffPositionCodeCounters: "staffPositionCodeCounters",
      staffProfiles: "staffProfiles",
      userProfiles: "userProfiles"
    },
    docs: {
      budgetApprovalSettings: "global"
    }
  },
  features: {
    borrowAssets: {
      useCsvAssetCatalog: true,
      enableAssetAvailabilityCheck: false,
      allowedPickupDays: [1, 4]
    }
  },
  documents: {
    signersByAcademicYear: {}
  },
  org: {
    defaultBaseGroups: [
      "ชมรมฝ่ายศิลปะและวัฒนธรรม",
      "ชมรมฝ่ายวิชาการ",
      "ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์",
      "ชมรมฝ่ายกีฬา",
      "องค์การบริหารสโมสรนิสิต",
      "สภานิสิต",
      "องค์การบริหารสโมสรนิสิต, สภานิสิต"
    ]
  },
  auth: {
    sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
    staffEmailLegacyColumn: -1
  },
  cache: {
    ttlMs: 60 * 60 * 1000,
    keys: {
      PROJECTS: "sgcu_cache_projects",
      NEWS: "sgcu_cache_news",
      DOWNLOADS: "sgcu_cache_downloads",
      ORG_FILTERS: "sgcu_cache_org_filters",
      SCOREBOARD: "sgcu_cache_scoreboard"
    }
  }
};

globalThis.SGCU_APP_CONFIG = SGCU_APP_CONFIG;
