// ClipForge relay on Cloudflare Workers (free).
// 1) POST /<gemini-model>  -> forwards to Gemini with your secret key
// 2) GET  /tiktok?url=...  -> follows short links and returns TikTok's public oEmbed info
// Settings: secret GEMINI_KEY; variables ALLOWED_ORIGIN, DAILY_LIMIT (optional); KV binding LIMITS (optional).
const TT = /(^|\.)tiktok\.com$/i;
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin'
    };
    const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });
    const err = (status, msg) => json(status, { error: { message: msg } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.headers.get('Origin') !== env.ALLOWED_ORIGIN) return err(403, 'Not allowed.');
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/tiktok') {
      let cur;
      const m = (url.searchParams.get('url') || '').match(/https?:\/\/[^\s]+/i);
      try { cur = new URL(m ? m[0] : ''); } catch (e) { return err(400, 'Bad link.'); }
      for (let i = 0; i < 4; i++) {
        if (cur.protocol !== 'https:' || !TT.test(cur.hostname)) return err(400, 'Only TikTok links.');
        if (!/^(vm|vt)\./i.test(cur.hostname)) break;
        const r = await fetch(cur.toString(), { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } });
        const loc = r.headers.get('location');
        if (!loc) break;
        cur = new URL(loc, cur);
      }
      const idm = cur.pathname.match(/^\/v\/(\d+)/);
      if (idm) cur = new URL('https://www.tiktok.com/@tiktok/video/' + idm[1]);
      cur.search = '';
      const o = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(cur.toString()));
      if (!o.ok) return err(502, 'TikTok replied ' + o.status + ' for ' + cur.hostname + cur.pathname.slice(0, 40));
      return new Response(o.body, { status: o.status, headers: { ...cors, 'content-type': 'application/json' } });
    }

    if (req.method !== 'POST') return err(403, 'Not allowed.');
    const model = url.pathname.slice(1);
    if (!/^gemini-[\w.-]+$/.test(model)) return err(400, 'Unknown model.');
    if (env.LIMITS) {
      const ip = req.headers.get('CF-Connecting-IP') || 'x';
      const key = ip + ':' + new Date().toISOString().slice(0, 10);
      const used = parseInt((await env.LIMITS.get(key)) || '0', 10);
      const max = parseInt(env.DAILY_LIMIT || '5', 10) * 2; // two calls per video
      if (used >= max) return err(429, 'Daily limit reached. Try again tomorrow, or add your own free Gemini key under More options.');
      await env.LIMITS.put(key, String(used + 1), { expirationTtl: 86400 });
    }
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: req.body
    });
    return new Response(r.body, { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
  }
};
