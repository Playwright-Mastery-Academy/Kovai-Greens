// Explicit, owner-authorized maintenance. Never runs during a build or deployment.
const { KG_APP_URL, KG_OWNER_USERNAME, KG_OWNER_PASSWORD, KG_NON_OWNER_PASSWORD } = process.env;
if (!KG_APP_URL || !KG_OWNER_USERNAME || !KG_OWNER_PASSWORD || !KG_NON_OWNER_PASSWORD)
  throw new Error('Set KG_APP_URL, KG_OWNER_USERNAME, KG_OWNER_PASSWORD and KG_NON_OWNER_PASSWORD.');
if (!process.argv.includes('--apply')) throw new Error('Pass --apply to reset all non-owner passwords and revoke their sessions.');
const base = new URL('/api/', KG_APP_URL);
if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('Use HTTPS.');
let token = '', cookie = '';
async function request(path, body) {
  const res = await fetch(new URL(path, base), { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error' });
  const value = await res.json();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${value.message || 'Request failed'}`);
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return value;
}
try {
  const signed = await request('auth/login', { username: KG_OWNER_USERNAME, password: KG_OWNER_PASSWORD });
  token = signed.accessToken;
  if (signed.user.role !== 'OWNER') throw new Error('An owner account is required.');
  const users = [];
  for (let page = 1; ; page++) {
    const batch = await request(`users?page=${page}&limit=100`);
    users.push(...batch.data);
    if (users.length >= batch.total) break;
    if (!batch.data.length) throw new Error('Incomplete user list.');
  }
  let count = 0;
  for (const user of users.filter(user => user.role !== 'OWNER')) {
    await request(`users/${user.id}/password`, { password: KG_NON_OWNER_PASSWORD });
    count++;
  }
  console.log(`Updated ${count} non-owner accounts. Owner accounts were excluded.`);
} finally {
  if (cookie) await request('auth/logout', {});
}
