import { setupAppCheck } from "./app.app-check.js";
import { setupAccessRequests } from "./app.auth-access-requests.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  inMemoryPersistence,
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithPopup,
  updateCurrentUser,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getAnalytics,
  isSupported,
  logEvent
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  documentId,
  connectFirestoreEmulator,
  doc,
  collection,
  addDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcRIz1Uy1AZd-9JJdLF92SyqU6m8bdSXo",
  authDomain: "departmentwebsite-5aec1.firebaseapp.com",
  projectId: "departmentwebsite-5aec1",
  storageBucket: "departmentwebsite-5aec1.firebasestorage.app",
  messagingSenderId: "827589080688",
  appId: "1:827589080688:web:ad89c53218104f908926b5",
  measurementId: "G-BFW19TSYL0"
};

const meetingEmulator = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('meetingEmulator') === '1';
const app = initializeApp(meetingEmulator ? { apiKey: 'demo-budget-meeting', projectId: 'demo-budget-meeting', authDomain: 'demo-budget-meeting.firebaseapp.com' } : firebaseConfig);
// Attestation must initialize before any Firestore requests, including anonymous reads.
window.sgcuAppCheckHeaders = await setupAppCheck(app, { emulator: meetingEmulator });
const auth = getAuth(app);
const db = getFirestore(app);
if (meetingEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8089);
}
window.sgcuMeetingEmulator = meetingEmulator;
const ALLOWED_AUTH_EMAIL_DOMAIN = "chula.ac.th";
const AUTH_EMAIL_ACCESS_COLLECTION =
  globalThis.SGCU_APP_CONFIG?.firestore?.collections?.authEmailAccess || "authEmailAccess";
const AUTH_EMAIL_EXCEPTIONS = new Set([
  "tuwanon.kimchiang@gmail.com"
]);

function normalizeAuthEmail(email) {
  return (email || "").toString().trim().toLowerCase();
}

function getAuthEmailDomain(email) {
  const normalized = normalizeAuthEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  return atIndex >= 0 ? normalized.slice(atIndex + 1) : "";
}

function isAllowedAuthEmail(email) {
  const normalized = normalizeAuthEmail(email);
  const domain = getAuthEmailDomain(normalized);
  return (
    domain === ALLOWED_AUTH_EMAIL_DOMAIN ||
    domain.endsWith(`.${ALLOWED_AUTH_EMAIL_DOMAIN}`) ||
    AUTH_EMAIL_EXCEPTIONS.has(normalized)
  );
}

function readDateMs(value) {
  if (!value) return NaN;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return date.getTime();
}

function isTemporaryAuthAccessActive(data, email, nowMs = Date.now()) {
  const normalized = normalizeAuthEmail(email);
  if (!data || typeof data !== "object" || !normalized) return false;
  const storedEmail = normalizeAuthEmail(data.email || normalized);
  const startsAtMs = readDateMs(data.startsAt);
  const endsAtMs = readDateMs(data.endsAt);
  return (
    data.active === true &&
    (!data.status || data.status === 'approved') &&
    storedEmail === normalized &&
    Number.isFinite(startsAtMs) &&
    Number.isFinite(endsAtMs) &&
    startsAtMs <= nowMs &&
    endsAtMs > nowMs
  );
}

// Only successful access checks populate this session-local display context.
const temporaryAuthAccessByEmail = new Map();
function getTemporaryAuthAccess(email) {
  const normalized = normalizeAuthEmail(email);
  if (isAllowedAuthEmail(normalized)) return null;
  const data = temporaryAuthAccessByEmail.get(normalized);
  return isTemporaryAuthAccessActive(data, normalized) ? { ...data } : null;
}

async function isAllowedAuthEmailAsync(email) {
  const normalized = normalizeAuthEmail(email);
  if (isAllowedAuthEmail(normalized)) return true;
  if (!normalized) return false;
  try {
    const snap = await getDoc(doc(db, AUTH_EMAIL_ACCESS_COLLECTION, normalized));
    const data = snap.exists() ? snap.data() : null;
    const allowed = isTemporaryAuthAccessActive(data, normalized);
    if (allowed) temporaryAuthAccessByEmail.set(normalized, data);
    else temporaryAuthAccessByEmail.delete(normalized);
    return allowed;
  } catch (error) {
    temporaryAuthAccessByEmail.delete(normalized);
    console.warn("temporary auth email access check failed", error);
    return false;
  }
}

function getAuthEmailRequirementMessage(email) {
  const normalized = normalizeAuthEmail(email);
  const suffix = normalized ? `\nอีเมลที่ใช้: ${normalized}` : "";
  return [
    `กรุณาเข้าสู่ระบบด้วยอีเมลที่ลงท้าย ${ALLOWED_AUTH_EMAIL_DOMAIN}`,
    "ยกเว้นบัญชีที่ได้รับอนุญาตเป็นรายกรณี"
  ].join("\n") + suffix;
}

window.sgcuFirestore = {
  db,
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  serverTimestamp
};

window.sgcuAuth = {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  meetingEmulator,
  allowedEmailDomain: ALLOWED_AUTH_EMAIL_DOMAIN,
  allowedEmailExceptions: Array.from(AUTH_EMAIL_EXCEPTIONS),
  authEmailAccessCollection: AUTH_EMAIL_ACCESS_COLLECTION,
  isAllowedAuthEmail,
  isAllowedAuthEmailAsync,
  isTemporaryAuthAccessActive,
  getTemporaryAuthAccess,
  getAuthEmailRequirementMessage
};

window.sgcuAnalytics = {
  trackPageView: () => {}
};
window.sgcuVisitorCounter = {
  syncDailyVisitorCount: async () => null
};

isSupported()
  .then((supported) => {
    if (!supported) return;
    const analytics = getAnalytics(app);
    window.sgcuAnalytics.trackPageView = (pageName) => {
      const safePage = (pageName || "home").toString();
      const pagePath = `${window.location.pathname}#${safePage}`;
      const pageLocation = `${window.location.origin}${pagePath}`;
      logEvent(analytics, "page_view", {
        page_title: `Treasurer SGCU - ${safePage}`,
        page_location: pageLocation,
        page_path: pagePath
      });
    };
  })
  .catch(() => {
    // ignore analytics init failures
  });

function getDateKeyInBangkok() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

window.sgcuVisitorCounter.syncDailyVisitorCount = async () => {
  // Local previews may read statistics but must never increment production counters.
  if (["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) return null;
  const dateKey = getDateKeyInBangkok();
  const dailyRef = doc(db, "site_daily_visitors", dateKey);
  const allTimeRef = doc(db, "site_stats", "visitors_all_time");

  return runTransaction(db, async (transaction) => {
    const dailySnap = await transaction.get(dailyRef);
    const allTimeSnap = await transaction.get(allTimeRef);

    const currentDaily = Number(dailySnap.data()?.total || 0);
    const currentAllTime = Number(allTimeSnap.data()?.total || 0);
    const nextDaily = Number.isFinite(currentDaily) ? currentDaily + 1 : 1;
    const nextAllTime = Number.isFinite(currentAllTime) ? currentAllTime + 1 : 1;

    transaction.set(
      dailyRef,
      {
        total: nextDaily,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    transaction.set(
      allTimeRef,
      {
        total: nextAllTime,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return {
      dailyTotal: nextDaily,
      allTimeTotal: nextAllTime
    };
  });
};

// A persistent random browser ID deduplicates concurrent tabs through a transaction.
window.sgcuVisitorCounter.syncUniqueVisitorCount = async (page = null) => {
  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) return null;
  let browserId;
  try {
    browserId = localStorage.getItem("sgcuVisitorBrowserId");
    if (!/^[a-f0-9-]{36}$/.test(browserId || "")) {
      browserId = crypto.randomUUID();
      localStorage.setItem("sgcuVisitorBrowserId", browserId);
    }
  } catch { return null; } // Without persistence, do not inflate the unique count.
  const dateKey = getDateKeyInBangkok();
  const dailyRef = page ? doc(db, "site_page_visitors", page, "unique", dateKey) : doc(db, "site_daily_unique_visitors", dateKey);
  const markerRef = doc(collection(dailyRef, "browsers"), browserId);
  return runTransaction(db, async (transaction) => {
    const daily = await transaction.get(dailyRef);
    const marker = await transaction.get(markerRef);
    if (marker.exists()) return daily.data()?.total ?? null;
    const total = Number(daily.data()?.total || 0) + 1;
    transaction.set(markerRef, { createdAt: serverTimestamp() });
    transaction.set(dailyRef, { total, updatedAt: serverTimestamp(), lastBrowserId: browserId });
    return total;
  });
};

let lastCountedVisitorPage = null;
window.sgcuVisitorCounter.trackPageVisit = async (page) => {
  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) return;
  if (!/^[a-z0-9-]{1,80}$/.test(page)) return;
  const dateKey = getDateKeyInBangkok();
  const key = `${dateKey}/${page}`;
  if (lastCountedVisitorPage === key) return;
  lastCountedVisitorPage = key;
  const dailyRef = doc(db, "site_page_visitors", page, "days", dateKey);
  const totalRef = doc(db, "site_stats", `page_${page}`);
  const results = await Promise.allSettled([
    runTransaction(db, async (transaction) => {
      const daily = await transaction.get(dailyRef);
      const total = await transaction.get(totalRef);
      transaction.set(dailyRef, { total: Number(daily.data()?.total || 0) + 1, updatedAt: serverTimestamp() });
      transaction.set(totalRef, { total: Number(total.data()?.total || 0) + 1, updatedAt: serverTimestamp() });
    }),
    window.sgcuVisitorCounter.syncUniqueVisitorCount(page)
  ]);
  if (results[0].status === 'rejected' && lastCountedVisitorPage === key) lastCountedVisitorPage = null;
  for (const result of results) if (result.status === 'rejected') console.warn('Page visitor tracking unavailable', result.reason);
};

window.sgcuVisitorCounter.getVisitorHistory = async (startDate, endDate, page = 'all') => {
  if (page !== 'all' && !/^[a-z0-9-]{1,80}$/.test(page)) throw new Error('Invalid visitor page');
  const visitPath = page === 'all' ? ["site_daily_visitors"] : ["site_page_visitors", page, "days"];
  const uniquePath = page === 'all' ? ["site_daily_unique_visitors"] : ["site_page_visitors", page, "unique"];
  const today = getDateKeyInBangkok();
  const readDays = async (path) => {
    const snapshot = await getDocs(query(collection(db, ...path), where(documentId(), ">=", startDate), where(documentId(), "<=", endDate)));
    return Object.fromEntries(snapshot.docs.map((item) => [item.id, Number(item.data().total)]));
  };
  const readToday = async (path) => {
    const snapshot = await getDoc(doc(db, ...path, today));
    return snapshot.exists() ? Number(snapshot.data().total) : null;
  };
  const [visits, unique, allTime, todayVisits, todayUnique] = await Promise.all([
    readDays(visitPath),
    readDays(uniquePath).then((days) => ({ days, unavailable: false })).catch(() => ({ days: {}, unavailable: true })),
    getDoc(doc(db, "site_stats", page === 'all' ? "visitors_all_time" : `page_${page}`)),
    readToday(visitPath), readToday(uniquePath).catch(() => null)
  ]);
  return { visits, unique: unique.days, uniqueUnavailable: unique.unavailable, todayVisits, todayUnique,
    allTime: allTime.exists() ? Number(allTime.data().total) : null };
};

// Keep request-only Google verification separate from the application's login session.
const applicantApp = initializeApp(meetingEmulator ? { apiKey: 'demo-budget-meeting', projectId: 'demo-budget-meeting', authDomain: 'demo-budget-meeting.firebaseapp.com' } : firebaseConfig, 'access-requests');
await setupAppCheck(applicantApp, { emulator: meetingEmulator });
const applicantAuth = getAuth(applicantApp);
const applicantDb = getFirestore(applicantApp);
if (meetingEmulator) {
  connectAuthEmulator(applicantAuth, 'http://127.0.0.1:9098', { disableWarnings: true });
  connectFirestoreEmulator(applicantDb, '127.0.0.1', 8089);
}
setPersistence(applicantAuth, inMemoryPersistence).then(() => setupAccessRequests({
  doc, getDocFromServer, getDocs, collection, query, where, runTransaction, serverTimestamp,
  GoogleAuthProvider, signInWithPopup, updateCurrentUser, signOut, onAuthStateChanged,
  isAllowedAuthEmail, isTemporaryAuthAccessActive
}, applicantAuth, applicantDb, auth, db)).catch(error => {
  console.error('Access request initialization failed', error);
  const status = document.getElementById('authAccessStatus');
  if (status) status.textContent = 'เปิดระบบคำร้องไม่สำเร็จ กรุณาโหลดหน้าใหม่';
});
