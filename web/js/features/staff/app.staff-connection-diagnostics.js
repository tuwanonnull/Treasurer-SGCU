/* Read-only diagnostics. Return explicit fields only; never serialize a user or token. */
window.sgcuStaffConnectionDiagnostics = async ({ auth, store, collection, request = fetch }) => {
  const user = auth?.currentUser;
  const project = store?.db?.app?.options?.projectId || '';
  const result = { version: window.sgcuAssetVersion || '', project, collection, email: user?.email || '', signedIn: Boolean(user?.uid) };
  if (!user || !project || !collection || collection.includes('/')) return result;
  let token;
  try {
    const identity = await user.getIdTokenResult();
    result.tokenEmail = identity.claims?.email || '';
    result.tokenProject = identity.claims?.aud || '';
    result.expires = identity.expirationTime || '';
    token = identity.token;
  } catch { result.authentication = 'token-unavailable'; return result; }
  if (auth.currentUser?.uid !== user.uid) return { ...result, authentication: 'account-changed' };
  try {
    const response = await request(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${encodeURIComponent(collection)}?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    result.directRead = response.status;
    if (!response.ok) {
      const payload = await response.json();
      result.directError = payload.error?.status || 'read-failed';
    }
  } catch { result.directRead = 'network-unavailable'; }
  let timer;
  try {
    await Promise.race([
      store.getDocs(store.query(store.collection(store.db, collection), store.limit(1))),
      new Promise((_, reject) => { timer = setTimeout(() => reject({ code: 'diagnostic-timeout' }), 15000); })
    ]);
    result.sdkRead = 'ok';
  } catch (error) {
    const code = String(error?.code || 'read-failed');
    result.sdkRead = /^[a-z/-]+$/.test(code) ? code : 'read-failed';
  }
  finally { clearTimeout(timer); }
  return result;
};
