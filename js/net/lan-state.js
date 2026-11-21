'use strict';

// 只传渲染和界面需要的字段，不传命中集合、对象引用、存档或浏览器数据。
const LanState = (() => {
  const number = (v, min = -1e8, max = 1e8) => Number.isFinite(v) && v >= min && v <= max;
  const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const own = (catalog, k) => typeof k === 'string' && Object.hasOwn(catalog, k);
  const color = v => typeof v === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
  const anyText = v => typeof v === 'string' && v.length <= 120;
  const plan = v => ['ward', 'challenge', 'normal'].includes(v);
  const typeKeys = Object.keys(ENEMIES);
  const points = 'x y';
  const enemyFields = 'id x y r t flash frozen slowT elite hp maxHp';
  const bossFields = 'id kind name plan phase arrivedAt cd windTime cx cy r x y chargeSpeed attackAngle fanWings tier hp maxHp t';
  const playerFields = 'x y hp level xp xpNeed char dirx diry face moving walkT iframe kills coins rerolls';
  const weaponFields = 'id lv on ang guards';
  const projs = 'uid x y r age vx vy look color rot';
  const zones = 'type look x y r t max maxR life color wid fromX fromY trigger';
  const fx = 'type x y x2 y2 r life max c';
  const bullets = 'x y r look vx vy';
  const schemas = new Map();
  const wrap = fields => {
    if (!schemas.has(fields)) schemas.set(fields, fields.split(' '));
    return schemas.get(fields);
  };
  const pack = (o, fields) => wrap(fields).map(k => {
    const v = o[k];
    return number(v) ? Math.round(v * 100) / 100 : typeof v === 'boolean' || anyText(v) ? v : null;
  });

  const checks = {
    x: number, y: number, r: v => number(v, 0, 4000), type: anyText, look: anyText,
    color, c: color, uid: v => typeof v === 'string' && /^p\d{1,9}$/.test(v),
    id: v => integer(v, 0, 1e9), wid: v => own(WEAPONS, v), kind: v => own(BOSS_TYPES, v),
    name: anyText, plan, phase: v => ['', 'wind', 'charge', 'sealWind', 'fanWind'].includes(v),
    char: v => own(CHARS, v), face: v => v === 1 || v === -1, moving: v => typeof v === 'boolean',
    elite: v => typeof v === 'boolean', s: anyText, max: v => number(v, 0.01, 4000),
    life: v => number(v, 0, 4000), maxR: v => number(v, 0.01, 4000), trigger: v => number(v, 0, 4000),
  };
  function unpack(row, fields, extra = {}) {
    const keys = wrap(fields), o = {};
    if (!Array.isArray(row) || row.length !== keys.length) return null;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i], value = row[i];
      if (value === null) continue;
      if (!(extra[key] || checks[key] || number)(value)) return null;
      o[key] = value;
    }
    if (keys.includes('x') && (!number(o.x) || !number(o.y))) return null;
    return o;
  }

  const mapRows = (rows, max, fn) => !Array.isArray(rows) ? [] : rows.slice(0, max).map(fn).filter(Boolean);
  const dictionaries = (rows, limit) => mapRows(rows, limit, row => typeof row === 'string' &&
    /^[a-z]+:-?\d+(?:\.\d+)?:-?\d+(?:\.\d+)?$/.test(row) && row.length <= 90 ? [row] : null).flat();
  const timed = rows => mapRows(rows, 2000, row => Array.isArray(row) && dictionaries([row[0]], 1).length &&
    (row[1] === null || number(row[1], 0, 2000)) ? [row[0], row[1] ?? Infinity] : null);
  const bound = (arr, limit) => arr.slice(0, limit);

  function packPlayer(p) {
    return [pack(p, playerFields), pack(p.st, 'maxHp area amount'),
      p.weapons.map(w => pack(w, weaponFields)), p.passives.map(q => [q.id, q.lv])];
  }

  function unpackPlayer(data, slot) {
    if (!Array.isArray(data)) return null;
    const p = unpack(data[0], playerFields), st = unpack(data[1], 'maxHp area amount');
    if (!p?.char || !number(st?.maxHp, 1, 5000) || !number(st.area, 0.1, 10) || !integer(st.amount, 0, 32) ||
        !integer(p.level, 1, 5000) || !number(p.xpNeed, 1) || !number(p.hp, 0, 5000)) return null;
    p.slot = slot; p.st = st; p.dmgBy = {};
    p.weapons = mapRows(data[2], CFG.MAX_WEAPONS, row => {
      const w = unpack(row, weaponFields, { id: v => own(WEAPONS, v) });
      if (!w?.id || !integer(w.lv, 1, WEAPONS[w.id].max || 1)) return null;
      w.s = weaponStats(w.id, w.lv); return w;
    });
    p.passives = mapRows(data[3], CFG.MAX_PASSIVES, row => Array.isArray(row) && own(PASSIVES, row[0]) &&
      integer(row[1], 1, PASSIVES[row[0]].max) ? { id: row[0], lv: row[1] } : null);
    return p;
  }

  function packFrame(g) {
    const b = g.boss, e = g.environment;
    return {
      clock: pack(g, 'time bossClearAt lastBossArena shake'), players: g.players.map(packPlayer),
      boss: b && [pack(b, bossFields), b.arena && [b.arena.id, b.arena.from], b.seals?.map(s => pack(s, 'x y r'))],
      enemies: g.enemies.filter(e => !e.dead && e !== b).map(e => [typeKeys.indexOf(e.type), ...pack(e, enemyFields)]),
      projs: bound(g.projs, 400).map(p => pack(p, projs)), bullets: bound(g.ebullets, 120).map(p => pack(p, bullets)),
      zones: bound(g.zones, 200).map(z => pack(z, zones)), gems: g.gems.map(g => pack(g, 'x y v')),
      pickups: bound(g.pickups, 400).map(p => pack(p, 'x y type')), fx: bound(g.fx, 100).map(f => pack(f, fx)),
      parts: bound(g.parts, 100).map(q => pack(q, 'x y life c')), texts: bound(g.texts, 80).map(t => pack(t, 'x y life c s')),
      lit: [...e.lit].slice(-2000), reeds: [...e.reeds].slice(-2000), ready: [...e.landmarkReady].slice(-2000),
    };
  }

  function readFrame(s) {
    if (!s || !Array.isArray(s.players) || s.players.length !== 2) return null;
    const players = s.players.map(unpackPlayer);
    const clock = unpack(s.clock, 'time bossClearAt lastBossArena shake', { lastBossArena: v => own(Environment.scenes, v) });
    if (!players.every(Boolean) || !clock || !number(clock.time, 0, CFG.RUN_TIME + 1)) return null;
    const [partner, player] = players;
    const frame = { ...clock, player, partner, players, boss: null, bossClearAt: clock.bossClearAt ?? -Infinity, lastBossArena: clock.lastBossArena ?? null };
    frame.enemies = mapRows(s.enemies, CFG.MAX_ENEMIES, row => {
      if (!Array.isArray(row) || !integer(row[0], 0, typeKeys.length - 1) || typeKeys[row[0]] === 'boss') return null;
      const e = unpack(row.slice(1), enemyFields);
      return e?.r > 0 && number(e.t) ? { ...e, type: typeKeys[row[0]] } : null;
    });
    if (Array.isArray(s.boss)) {
      const b = unpack(s.boss[0], bossFields);
      const arena = s.boss[1];
      if (b?.kind && b.r > 0 && number(b.maxHp, 1) && number(b.arrivedAt, 0) && number(b.t)) {
        if (Array.isArray(arena) && arena.length === 2 && arena.every(k => own(Environment.scenes, k))) b.arena = { id: arena[0], from: arena[1] };
        b.seals = mapRows(s.boss[2], 3, row => unpack(row, 'x y r'));
        frame.boss = { ...b, type: 'boss', boss: true };
        frame.enemies.push(frame.boss);
      }
    }
    frame.projs = mapRows(s.projs, 400, row => unpack(row, projs));
    frame.ebullets = mapRows(s.bullets, 120, row => unpack(row, bullets));
    frame.zones = mapRows(s.zones, 200, row => {
      const z = unpack(row, zones);
      return z && (!z.max || z.t >= 0 && z.t <= z.max) ? z : null;
    });
    frame.gems = mapRows(s.gems, CFG.MAX_GEMS, row => unpack(row, 'x y v'));
    frame.pickups = mapRows(s.pickups, 400, row => unpack(row, 'x y type'));
    frame.fx = mapRows(s.fx, 100, row => {
      const f = unpack(row, fx);
      return f?.max && f.life <= f.max ? f : null;
    });
    frame.parts = mapRows(s.parts, 100, row => unpack(row, 'x y life c'));
    frame.texts = mapRows(s.texts, 80, row => unpack(row, 'x y life c s'));
    frame.environment = { lit: new Set(dictionaries(s.lit, 2000)), reeds: new Map(timed(s.reeds)), landmarkReady: new Map(timed(s.ready)) };
    return frame;
  }

  function choices(rows) {
    return mapRows(rows, 3, c => {
      if (!c || typeof c !== 'object') return null;
      const { kind, id, lv, to } = c;
      if (kind === 'coins' || kind === 'heal') return { kind };
      if (kind === 'weapon' && own(WEAPONS, id) && integer(lv, 1, WEAPONS[id].max || 1)) return { kind, id, lv };
      if (kind === 'passive' && own(PASSIVES, id) && integer(lv, 1, PASSIVES[id].max)) return { kind, id, lv };
      if (kind === 'evo' && own(WEAPONS, id) && own(WEAPONS, to) && WEAPONS[id].evo?.to === to) return { kind, id, to };
      return null;
    });
  }

  return { packFrame, readFrame, choices, number, integer, own, anyText };
})();
