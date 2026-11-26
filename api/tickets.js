// Vercel Serverless Function: shared, real-time community tickets with anti-spam.
// Storage: Upstash Redis via REST (add the "Upstash for Redis" integration in Vercel → Storage).
// Works with either UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN env vars.

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const VILLAGES = {
  'Pachakkara (North)': ['Arjun Menon', 'GG-14'],
  'Puzhayoram (East)': ['Anoop Varghese', 'GG-07'],
  'Kavumthazham (South)': ['Lekha Pillai', 'GG-22'],
  'Thengumpadam (West)': ['Sreejith Nair', 'GG-31'],
  'Manjadikunnu': ['Anoop Varghese', 'GG-07'],
  'Kuttikkadavu': ['Sreejith Nair', 'GG-31'],
};
const TYPES = ['Water', 'Air', 'Waste'];
const BAD_WORDS = ['fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'porn', 'sex', 'idiot', 'stupid', 'loser', 'myre', 'myran', 'poori', 'thendi', 'kunna', 'pottan', 'naaye'];
const LIST = 'gg:tickets';
const MAX_KEEP = 60;
const ADMIN_PIN = process.env.ADMIN_PIN || '8492';

const SEED_TICKETS = [
  { id: 'GG-2026-088', name: 'Lakshmi P.', village: 'Puzhayoram (East)', type: 'Water', desc: 'Slight odour from hand-pump near temple', guardian: 'Anoop Varghese', gid: 'GG-07', status: 'In progress', ts: Date.now() - 3 * 3600000 },
  { id: 'GG-2026-087', name: 'Thomas K.', village: 'Pachakkara (North)', type: 'Air', desc: 'Dust from trucks on school road during mornings', guardian: 'Arjun Menon', gid: 'GG-14', status: 'Resolved', ts: Date.now() - 26 * 3600000 },
  { id: 'GG-2026-086', name: 'Fathima S.', village: 'Kuttikkadavu', type: 'Waste', desc: 'Packaging scrap dumped near canal bund', guardian: 'Sreejith Nair', gid: 'GG-31', status: 'Resolved', ts: Date.now() - 120 * 3600000 },
];

function isAuthorized(req, body = {}) {
  const pin = req.headers['x-admin-pin'] || body.pin || (new URL(req.url, 'http://localhost')).searchParams.get('pin');
  return pin === ADMIN_PIN;
}

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}

function validate(b) {
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  const desc = String(b.desc || '').trim().replace(/\s+/g, ' ');
  const village = String(b.village || ''), type = String(b.type || '');
  if (b.website) return 'Spam detected.';                                  // honeypot
  if (typeof b.elapsed !== 'number' || b.elapsed < 4000) return 'Please take a moment to fill the form properly.';
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,39}$/u.test(name)) return 'Enter a valid name (letters only, 2-40 characters).';
  if (!VILLAGES[village]) return 'Select a valid village.';
  if (!TYPES.includes(type)) return 'Select a valid issue type.';
  if (desc.length < 15 || desc.length > 300) return 'Description must be 15-300 characters.';
  if (desc.split(' ').filter(w => w.length > 1).length < 3) return 'Please describe the issue in a few words.';
  if (/(https?:\/\/|www\.|\.com|\.in\b|@)/i.test(desc + name)) return 'Links, emails or handles are not allowed.';
  if (/(.)\1{4,}/u.test(desc + name)) return 'Please avoid repeated characters.';
  const caps = desc.replace(/[^A-Za-z]/g, ''); if (caps.length > 15 && caps === caps.toUpperCase()) return 'Please avoid ALL CAPS.';
  const lower = (desc + ' ' + name).toLowerCase();
  if (BAD_WORDS.some(w => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(lower))) return 'Please keep the report respectful.';
  return { name, desc, village, type };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ live: false, error: 'Storage not configured' });

  try {
    if (req.method === 'GET') {
      let raw = (await redis('LRANGE', LIST, 0, 59)) || [];
      const frozen = (await redis('GET', 'gg:frozen')) === '1';
      if (raw.length === 0) {
        for (let i = SEED_TICKETS.length - 1; i >= 0; i--) {
          await redis('LPUSH', LIST, JSON.stringify(SEED_TICKETS[i]));
        }
        raw = (await redis('LRANGE', LIST, 0, 59)) || [];
      }
      return res.status(200).json({ live: true, frozen, tickets: raw.map(s => JSON.parse(s)) });
    }

    if (req.method === 'POST') {
      const isFrozen = (await redis('GET', 'gg:frozen')) === '1';
      if (isFrozen) {
        return res.status(423).json({ error: 'New issue submissions are temporarily paused by the Guardian Desk during the presentation.' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const v = validate(body);
      if (typeof v === 'string') return res.status(400).json({ error: v });

      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
      // 1 report / 60s per device
      if (!(await redis('SET', `gg:rl:${ip}`, 1, 'EX', 60, 'NX'))) return res.status(429).json({ error: 'You just submitted a report. Please wait a minute.' });
      // 5 reports / day per device
      const day = await redis('INCR', `gg:day:${ip}`);
      if (day === 1) await redis('EXPIRE', `gg:day:${ip}`, 86400);
      if (day > 5) return res.status(429).json({ error: 'Daily limit reached (5 reports). Thank you for caring!' });
      // global flood guard: 40 / 10 min
      const g = await redis('INCR', 'gg:global');
      if (g === 1) await redis('EXPIRE', 'gg:global', 600);
      if (g > 40) return res.status(429).json({ error: 'High traffic right now - please try again in a few minutes.' });
      // duplicate text guard (1 hr)
      const key = (v.village + v.type + v.desc).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 120);
      if (!(await redis('SET', `gg:dup:${key}`, 1, 'EX', 3600, 'NX'))) return res.status(409).json({ error: 'This issue has already been reported.' });

      const seq = await redis('INCR', 'gg:seq');
      const [guardian, gid] = VILLAGES[v.village];
      const ticket = { id: `GG-2026-${String(88 + seq).padStart(3, '0')}`, ...v, guardian, gid, status: 'Assigned', ts: Date.now() };
      await redis('LPUSH', LIST, JSON.stringify(ticket));
      await redis('LTRIM', LIST, 0, MAX_KEEP - 1);
      return res.status(201).json({ ticket });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!isAuthorized(req, body)) {
        return res.status(401).json({ error: 'Unauthorized: Guardian moderator PIN required' });
      }
      if (body.action === 'freeze' || typeof body.frozen === 'boolean') {
        const setVal = body.frozen ? '1' : '0';
        await redis('SET', 'gg:frozen', setVal);
        return res.status(200).json({ success: true, frozen: body.frozen });
      }
      const { id, status } = body;
      if (!id || !['Assigned', 'In progress', 'Resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid ticket id or status' });
      }
      let raw = (await redis('LRANGE', LIST, 0, 59)) || [];
      let updated = null;
      let newList = raw.map(s => {
        const item = JSON.parse(s);
        if (item.id === id) {
          item.status = status;
          updated = item;
        }
        return JSON.stringify(item);
      });
      // Fallback for initial seed tickets if not in raw yet
      if (!updated) {
        const seedItem = SEED_TICKETS.find(t => t.id === id);
        if (seedItem) {
          updated = { ...seedItem, status };
          newList.unshift(JSON.stringify(updated));
        }
      }
      if (!updated) return res.status(404).json({ error: 'Ticket not found' });
      await redis('DEL', LIST);
      if (newList.length > 0) {
        await redis('RPUSH', LIST, ...newList);
      }
      return res.status(200).json({ success: true, ticket: updated });
    }

    if (req.method === 'DELETE') {
      const urlObj = new URL(req.url, 'http://localhost');
      if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized: Guardian moderator PIN required' });
      }
      const id = urlObj.searchParams.get('id');
      const reset = urlObj.searchParams.get('reset');

      if (reset === 'true') {
        await redis('DEL', LIST);
        await redis('DEL', 'gg:seq');
        for (let i = SEED_TICKETS.length - 1; i >= 0; i--) {
          await redis('LPUSH', LIST, JSON.stringify(SEED_TICKETS[i]));
        }
        return res.status(200).json({ success: true, reset: true, tickets: SEED_TICKETS });
      }

      if (!id) return res.status(400).json({ error: 'Missing ticket id' });

      const raw = (await redis('LRANGE', LIST, 0, 59)) || [];
      const remaining = [];
      let found = false;
      for (const s of raw) {
        const item = JSON.parse(s);
        if (item.id === id) {
          found = true;
        } else {
          remaining.push(s);
        }
      }
      if (!found) return res.status(404).json({ error: 'Ticket not found' });
      await redis('DEL', LIST);
      if (remaining.length > 0) {
        await redis('RPUSH', LIST, ...remaining);
      }
      return res.status(200).json({ success: true, deleted: id });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error, please try again.' });
  }
}
