'use strict';

// 场景灯、芦苇与机关的触发、冷却和本局状态。
const WorldInteractions = {
  landmarks: {
    wardBell: { name: '镇魂钟', prompt: '靠近撞钟 · 震退夜兽', status: '钟声冷却', cd: 35, radius: 155, color: '#ffe1a0', sound: 'wardBell' },
    starSigil: { name: '引星符阵', prompt: '靠近引星 · 吸取经验', status: '符阵充能', cd: 24, radius: 285, color: '#b8e5d2', sound: 'sigilGather' },
    supplyBox: { name: '补给木匣', prompt: '靠近开匣 · 金币与经验', status: '木匣已开', cd: Infinity, coins: 5, xp: 4, color: '#f1bd7c', sound: 'chest' },
    paperWard: { name: '镇纸符', prompt: '靠近引符 · 减速鬼怪', status: '符架冷却', cd: 26, radius: 165, color: '#eac480', sound: 'weddingPaper' },
    warmingShrine: { name: '取暖龛', prompt: '靠近取暖 · 回复生命', status: '暖龛已用', cd: Infinity, heal: 0.18, color: '#ffc88e', sound: 'mango' },
    dawnAltar: { name: '破晓香台', prompt: '鬼怪靠近时 · 短暂无敌', status: '香灰已冷', cd: Infinity, radius: 140, color: '#ffe5a7', sound: 'sigilGather' },
  },

  createRun() { return { lit: new Set(), healed: new Set(), reeds: new Map(), landmarkReady: new Map() }; },
  key(prop, map = 'dusk') { return `${map}:${prop.x}:${prop.y}`; },

  // 交互由走位触发，手机不用增加按钮；点亮、治疗分别记录，满血不会浪费治疗。
  step(g) {
    const run = g.environment;
    const landscape = Environment.forBattle(g).id;
    for (const [key, end] of run.reeds) if (end <= g.time) run.reeds.delete(key);
    const reach = 42;
    for (const p of g.players) {
      if (p.hp <= 0) continue;
      Terrain.forEachProp(p.x - reach, p.y - reach, p.x + reach, p.y + reach, prop => {
        const dist = Math.hypot(p.x - prop.x, p.y - prop.y), key = this.key(prop, landscape);
        if (Object.hasOwn(Environment.lights, prop.kind) && dist <= 36) this.visitLight(g, prop, key, p);
        if (Object.hasOwn(this.landmarks, prop.kind) && dist <= 34) this.visitLandmark(g, prop, key, p);
        if (prop.kind === 'reeds' && p.moving && dist <= 24 && !run.reeds.has(key)) {
          run.reeds.set(key, g.time + 0.95);
          g.burst(prop.x, prop.y, '#a3b66c', 5);
          g.play('rustle');
        }
      }, landscape);
    }
  },

  visitLandmark(g, prop, key, p = g.player) {
    const ready = g.environment.landmarkReady;
    if ((ready.get(key) ?? 0) > g.time) return;
    const def = this.landmarks[prop.kind];
    let message = def.name;
    let affected = 0;
    if (prop.kind === 'wardBell' || prop.kind === 'paperWard') {
      const bell = prop.kind === 'wardBell';
      g.eachEnemyNear(prop.x, prop.y, def.radius, e => {
        if (bell) {
          const dx = e.x - prop.x, dy = e.y - prop.y, d = Math.hypot(dx, dy) || 1;
          const push = (1 - e.kbRes) * 385;
          e.kx += dx / d * push; e.ky += dy / d * push;
        }
        g.slowEnemy(e, bell ? 0.48 : 0.65, bell ? 2.4 : 3.2);
        affected++;
      });
      if (!affected) return; // 没有怪时不会浪费冷却。
    } else if (prop.kind === 'starSigil') {
      for (const gem of g.gems) {
        if (gem.mag || (gem.x - prop.x) ** 2 + (gem.y - prop.y) ** 2 > def.radius ** 2) continue;
        gem.mag = true;
        affected++;
      }
      if (!affected) return;
    } else if (prop.kind === 'supplyBox') {
      const coins = p.coins;
      p.coins += def.coins * p.st.greed;
      g.gainXp(def.xp);
      message = `+${Math.floor(p.coins) - Math.floor(coins)} 金币 · +${Number((def.xp * p.st.growth).toFixed(1))} 经验`;
    } else if (prop.kind === 'warmingShrine') {
      const healed = Math.min(p.st.maxHp - p.hp, Math.round(p.st.maxHp * def.heal));
      if (healed < 1) return;
      p.hp += healed;
      message = `+${Math.round(healed)} 生命`;
    } else if (prop.kind === 'dawnAltar') {
      if (!g.nearestEnemy(prop.x, prop.y, def.radius)) return;
      p.iframe = Math.max(p.iframe, 2.4);
      message = '朝阳护身';
    }
    ready.set(key, g.time + def.cd);
    g.contractLandmark(prop.kind, key, affected);
    g.texts.push({ x: prop.x, y: prop.y - 24, s: message, life: 0.95, c: def.color });
    g.fx.push({ type: 'boom', x: prop.x, y: prop.y, r: Math.min(150, def.radius ?? 48), life: 0.48, max: 0.48, c: def.color });
    g.burst(prop.x, prop.y, def.color, 8);
    g.play(def.sound);
  },

  visitLight(g, prop, key, p = g.player) {
    const run = g.environment;
    if (!run.lit.has(key)) {
      const light = Environment.lights[prop.kind];
      run.lit.add(key);
      g.burst(prop.x, prop.y - light.height, light.color, 6);
      g.play('lantern');
      g.contractLit(prop.kind);
    }
    if (prop.kind !== 'lantern') return;
    const heal = Math.min(p.st.maxHp - p.hp, Math.round(p.st.maxHp * 0.12));
    if (heal < 1 || run.healed.has(key)) return;
    run.healed.add(key);
    p.hp += heal;
    g.texts.push({ x: p.x, y: p.y - 27, s: '+' + Math.round(heal), life: 0.8, c: '#a9e8ad' });
    g.fx.push({ type: 'boom', x: prop.x, y: prop.y, r: 42, life: 0.4, max: 0.4, c: '#dbd898' });
    g.play('mango');
  },
};
