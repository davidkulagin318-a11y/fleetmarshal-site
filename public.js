// Shared by the two pages a texted link opens (job.html, track.html). No
// sign-in and no libraries: one request to the public-link function.
const config = window.FLEET_CONFIG;

export const $ = (id) => document.getElementById(id);
export const token = new URLSearchParams(location.search).get('t') ?? '';

/** English or Spanish: the phone's language, unless the person switched. */
let lang = 'en';
try {
  lang = localStorage.getItem('fm-lang') ?? '';
} catch {
  lang = '';
}
if (lang !== 'en' && lang !== 'es') lang = (navigator.language ?? 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
export const language = () => lang;

/** t('key', 'value for {0}') — looks the key up in the page's two dictionaries. */
export function translator(words) {
  return (key, ...values) => {
    const text = words[lang]?.[key] ?? words.en[key] ?? key;
    return text.replace(/\{(\d)\}/g, (_, i) => String(values[Number(i)] ?? ''));
  };
}

/** The "Español / English" switch at the foot of the page. */
export function languageSwitch(node, redraw) {
  const draw = () => {
    node.textContent = lang === 'es' ? 'English' : 'Español';
    node.setAttribute('lang', lang === 'es' ? 'en' : 'es');
    document.documentElement.lang = lang;
  };
  node.addEventListener('click', () => {
    lang = lang === 'es' ? 'en' : 'es';
    try {
      localStorage.setItem('fm-lang', lang);
    } catch {
      // Private browsing: the choice lasts for this visit.
    }
    draw();
    redraw();
  });
  draw();
}

/** What the link shows, or { found: false } / { ended: true }. Throws when offline. */
export async function load() {
  if (!/^[0-9a-f]{32,128}$/.test(token)) return { found: false };
  const res = await fetch(`${config.supabaseUrl}/functions/v1/public-link?t=${token}`, {
    headers: { apikey: config.supabaseKey },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('unavailable');
  return res.json();
}

/** "Tue, Nov 17" from 2026-11-17, in the page's language. */
export function dayText(isoDay) {
  const [y, m, d] = String(isoDay).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}
