const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }
  return { url: supabaseUrl, key: supabaseAnonKey };
}

async function authRequest(path, body) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.msg || result.message || result.error_description || result.error || 'Supabase authentication failed.');
  }
  return result;
}

export async function signInWithPassword(email, password) {
  return authRequest('token?grant_type=password', { email, password });
}

export async function signUp(email, password) {
  return authRequest('signup', { email, password });
}

export async function resetPassword(email) {
  return authRequest('recover', { email });
}
