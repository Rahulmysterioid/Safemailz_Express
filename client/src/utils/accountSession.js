const sessionKey = 'safemailz.accountSessions';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
function belongsTo(token, id) {
    try {
        const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(atob(part));
        return String(claims.id) === String(id) && claims.exp * 1000 > Date.now();
    } catch { return false; }
}
export function saveAccountSession(user, token) {
    if (!user?.id || !belongsTo(token, user.id)) return;
    const sessions = read(sessionKey, {});
    sessions[String(user.id)] = { user, token };
    localStorage.setItem(sessionKey, JSON.stringify(sessions));
    const accounts = read('savedAccounts', []).filter(a => String(a.id) !== String(user.id));
    localStorage.setItem('savedAccounts', JSON.stringify([...accounts, user]));
}
export function rememberCurrentSession() {
    saveAccountSession(read('currentUser', null), localStorage.getItem('token') || sessionStorage.getItem('token'));
}
export function forgetAccountSession(id) {
    const sessions = read(sessionKey, {});
    delete sessions[String(id)];
    localStorage.setItem(sessionKey, JSON.stringify(sessions));
}
function requireSignIn(account) {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('safemailzEmails');
    window.location.assign('/signin' + (account?.email ? '?email=' + encodeURIComponent(account.email) : ''));
}
export async function signInToAccount(account, { preserveCurrent = true } = {}) {
    if (preserveCurrent) rememberCurrentSession();
    const saved = account && read(sessionKey, {})[String(account.id)];
    if (!saved || !belongsTo(saved.token, account.id)) { requireSignIn(account); return; }
    // Server validation refreshes roles and rejects revoked or blocked sessions.
    try {
        const response = await fetch('/api/account-session', { headers: { Authorization: `Bearer ${saved.token}` } });
        if (response.status === 401 || response.status === 403) {
            forgetAccountSession(account.id); requireSignIn(account); return;
        }
        if (!response.ok) throw new Error('Session validation unavailable');
        const data = await response.json();
        if (String(data.user?.id) !== String(account.id)) throw new Error('Account mismatch');
        saveAccountSession(data.user, saved.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('token', saved.token);
        sessionStorage.removeItem('token');
        localStorage.removeItem('safemailzEmails');
        window.location.assign(data.user.mustChangePassword ? '/force-change-password' : '/dashboard/email/inbox');
    } catch {
        window.alert('Unable to switch accounts right now. Please try again.');
    }
}
