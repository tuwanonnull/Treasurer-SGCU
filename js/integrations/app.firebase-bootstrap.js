import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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
    storedEmail === normalized &&
    Number.isFinite(startsAtMs) &&
    Number.isFinite(endsAtMs) &&
    startsAtMs <= nowMs &&
    endsAtMs > nowMs
  );
}

async function isAllowedAuthEmailAsync(email) {
  const normalized = normalizeAuthEmail(email);
  if (isAllowedAuthEmail(normalized)) return true;
  if (!normalized) return false;
  try {
    const snap = await getDoc(doc(db, AUTH_EMAIL_ACCESS_COLLECTION, normalized));
    return snap.exists() && isTemporaryAuthAccessActive(snap.data(), normalized);
  } catch (error) {
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
  allowedEmailDomain: ALLOWED_AUTH_EMAIL_DOMAIN,
  allowedEmailExceptions: Array.from(AUTH_EMAIL_EXCEPTIONS),
  authEmailAccessCollection: AUTH_EMAIL_ACCESS_COLLECTION,
  isAllowedAuthEmail,
  isAllowedAuthEmailAsync,
  isTemporaryAuthAccessActive,
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
