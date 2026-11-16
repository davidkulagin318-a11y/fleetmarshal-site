// Shared by every page: the Supabase client, sign-in by texted code, calls to
// the billing function, and a few small helpers.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const config = window.FLEET_CONFIG;
export const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export const $ = (id) => document.getElementById(id);
export const show = (el, on = true) => el.classList.toggle('hidden', !on);

/** Build an element. Text always goes in as text, never as HTML. */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function setNote(node, message, kind = 'error') {
  node.textContent = message || '';
  node.className = message ? `note ${kind}` : 'note hidden';
}

/** 2499, "usd" -> $24.99 */
export function money(amount, currency = 'usd') {
  if (amount == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

/** What we send to sign-in: +15155550101. Null if it can't be a phone number. */
export function toE164(input) {
  const digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return null;
}

export function prettyPhone(stored) {
  const d = String(stored).replace(/\D/g, '');
  const us = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
  return us.length === 10 ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : `+${d}`;
}

/** Call the billing Edge Function. Throws an Error with a readable message. */
export async function billing(action, body = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? config.supabaseKey;
  const res = await fetch(`${config.supabaseUrl}/functions/v1/billing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.supabaseKey, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

/** The signed-in person's company and role (null if this number has none). */
export async function membership() {
  const { data, error } = await supabase.rpc('claim_membership');
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Wire up a "phone number, then texted code" sign-in form.
 * Expects inside `root`: [data-phone] [data-send] [data-code-step] [data-code] [data-verify] [data-note]
 */
export function phoneSignIn(root, onSignedIn) {
  const q = (name) => root.querySelector(`[data-${name}]`);
  const note = q('note');
  let phone = null;

  q('send').addEventListener('click', async () => {
    phone = toE164(q('phone').value);
    if (!phone) return setNote(note, 'Enter your 10-digit mobile number.');
    q('send').disabled = true;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    q('send').disabled = false;
    if (error) return setNote(note, error.message || "Couldn't send the code.");
    setNote(note, `We texted a code to ${prettyPhone(phone)}.`, 'info');
    show(q('code-step'));
    q('code').focus();
  });

  q('verify').addEventListener('click', async () => {
    q('verify').disabled = true;
    const { error } = await supabase.auth.verifyOtp({ phone, token: q('code').value.trim(), type: 'sms' });
    q('verify').disabled = false;
    if (error) return setNote(note, "That code didn't work. Check it, or send a new one.");
    setNote(note, '');
    onSignedIn();
  });
}

/**
 * "Text (515) 555-0188 or email help@… We answer within one business day."
 * The contact comes from the server (one value, shared with the app). Returns
 * null when no contact has been set yet, so a page shows nothing rather than a blank promise.
 */
export function supportLine(support, lead = 'Questions?') {
  if (!support || (!support.sms && !support.email)) return null;
  const ways = [];
  if (support.sms) ways.push(['text ', el('a', { href: `sms:+${support.sms}` }, prettyPhone(support.sms))]);
  if (support.email) ways.push(['email ', el('a', { href: `mailto:${support.email}` }, support.email)]);
  ways[0][0] = ways[0][0][0].toUpperCase() + ways[0][0].slice(1);
  const line = el('span', {}, `${lead} `);
  ways.forEach(([verb, link], i) => line.append(i ? ' or ' : '', verb, link));
  line.append(`. We answer within ${support.reply_within || 'one business day'}.`);
  return line;
}

/** Hand the browser a file to save. */
export function download(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = el('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Put the app's name wherever a page asks for it.
document.querySelectorAll('[data-app-name]').forEach((n) => (n.textContent = config.appName));
document.title = document.title.replace('{app}', config.appName);
