// Shared by the main app, request-only auth app and standalone public calendar.
// The site key is public; never ship a reCAPTCHA secret or an App Check debug token.
export async function setupAppCheck(app, { emulator = false } = {}) {
  const siteKey = globalThis.SGCU_APP_CONFIG?.appCheck?.siteKey;
  if (!siteKey || emulator) return async () => ({});
  const { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true
  });
  return async () => ({ "X-Firebase-AppCheck": (await getToken(appCheck, false)).token });
}
