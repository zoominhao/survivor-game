'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { deflateSync } = require('node:zlib');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup() {
  const context = vm.createContext({ btoa, atob, CompressionStream, DecompressionStream, Blob, TextEncoder, TextDecoder, URL });
  loadGame(context, f => battleScript(f) || f.startsWith('js/net/') || f.endsWith('/lan-room.js'));
  return vm.runInContext(`(() => {
    const save = { data: { coins: 99, runs: 2, wins: 1, best: 80, meta: Object.fromEntries(Object.keys(META).map(k => [k, 0])) },
      write() { throw new Error('联机不能写档'); } };
    const game = createBattle({ save });
    game.start('ella', 'echo');
    return { game, save, CFG, LanState, LanLink, lanDescription, localLanCandidate, encodeLanCode, decodeLanCode,
      lanInviteFromHash, LanRoom, LAN_ROOM_VERSION };
  })()`, context);
}

test('房主同时模拟两个人；鬼怪跟踪最近的存活玩家，延迟命中归还给施放者', () => {
  const { game: g } = setup();
  const p = g.player, q = g.partner;
  g.update(0.04, { y: -1 }, { y: 1 });
  assert.ok(p.y < 0 && q.y > 0);
  p.x = -500; p.y = 0; q.x = 100; q.y = 0;
  const enemy = g.spawnEnemy('shade', 125, 0);
  enemy.kx = enemy.ky = 0;
  g.updateEnemies(0.03);
  assert.ok(enemy.x < 125);
  g.grid.clear(); g.grid.insert(enemy);
  g.player = q;
  g.addProj({ x: enemy.x, y: enemy.y, vx: 0, vy: 0, r: 12, life: 1, dmg: 1000, pierce: 1, wid: 'mouse' });
  g.player = p;
  g.updateProjs(0.01);
  assert.equal(p.kills, 0);
  assert.equal(q.kills, 1);
  assert.ok(q.dmgBy.mouse > 0);
});

test('压缩码保留原连接参数，区分邀请和应答，聊天链接可直接填表', async () => {
  const { encodeLanCode, decodeLanCode, lanInviteFromHash } = setup();
  const sdp = 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' +
    'a=candidate:1 1 udp 1 192.168.1.25 34567 typ host\r\n'.repeat(4) + 'a=sctp-port:5000\r\n';
  const legacy = await encodeLanCode('offer', sdp, true);
  const invite = await encodeLanCode('offer', sdp);
  const answer = await encodeLanCode('answer', sdp);
  assert.match(invite, /^I2-[A-Za-z0-9_-]+$/);
  assert.match(answer, /^A2-[A-Za-z0-9_-]+$/);
  assert.ok(invite.length < legacy.length * 0.8);
  assert.equal((await decodeLanCode(invite, 'offer')).sdp, sdp);
  assert.equal((await decodeLanCode(legacy, 'offer')).sdp, sdp);
  assert.equal((await decodeLanCode(`https://game.invalid/survivor/#invite=${encodeURIComponent(invite)}`, 'offer')).sdp, sdp);
  assert.equal((await decodeLanCode(`${answer.slice(0, 12)}\n ${answer.slice(12)}`, 'answer')).sdp, sdp);
  assert.equal(lanInviteFromHash('#invite=' + answer), null);
  await assert.rejects(decodeLanCode(invite, 'answer'), /应答二维码/);
  const oversized = 'I2-' + deflateSync('v=0\r\n'.repeat(5000)).toString('base64url');
  await assert.rejects(decodeLanCode(oversized, 'offer'), /损坏或不完整/);
});

test('房间只接受有效角色和版本，队友准备与取消都由房主确认', () => {
  const { LanRoom, LAN_ROOM_VERSION } = setup();
  const toGuest = [], toHost = [];
  const state = (role, char, output) => ({ ...LanRoom, role, char, localStages: ['dusk', 'storm'], phase: 'connected', fallbackAt: 45000,
    guestReady: false, link: { send(data) { output.push(data); return true; } }, statusText(text) { this.status = text; } });
  const host = state('host', 'ella', toGuest), guest = state('guest', 'zhu', toHost);
  host.receiveRoom({ t: 'hello', version: 1, char: 'zhu' });
  assert.equal(host.otherChar, undefined);
  host.receiveRoom({ t: 'ready', ready: true });
  assert.equal(host.guestReady, false);
  host.receiveRoom({ t: 'hello', version: LAN_ROOM_VERSION, char: 'zhu', stages: ['constructor'] });
  assert.equal(host.otherChar, undefined);
  host.receiveRoom({ t: 'hello', version: LAN_ROOM_VERSION, char: 'zhu', stages: ['storm'] });
  assert.deepEqual(host.peerStages, ['storm']);
  assert.equal(host.fallbackAt, 0);
  guest.receiveRoom(toGuest.shift());
  assert.equal(guest.otherChar, 'ella');
  assert.equal(guest.guestReady, false);
  guest.toggleReady(); guest.toggleReady();
  assert.equal(toHost.length, 1);
  assert.equal(guest.readyPending, true);
  host.receiveRoom(toHost.shift()); guest.receiveRoom(toGuest.shift());
  assert.equal(host.guestReady, true);
  assert.equal(guest.guestReady, true);
  assert.equal(guest.readyPending, false);
  guest.toggleReady();
  host.receiveRoom(toHost.shift()); guest.receiveRoom(toGuest.shift());
  assert.equal(host.guestReady, false);
  assert.equal(guest.guestReady, false);
});

test('经验共享，轮流各自选卡，离队和作弊不会写单人存档', () => {
  const { game: g, save } = setup();
  const before = JSON.stringify(save.data), p = g.player, q = g.partner;
  g.gainXp(5);
  assert.equal(p.level, 2);
  assert.equal(q.level, 2);
  g.nextLevelUp();
  assert.equal(g.levelPlayer, p);
  g.choices = [{ kind: 'coins' }];
  g.choose(0);
  assert.equal(p.coins, 25);
  assert.equal(q.coins, 0);
  assert.equal(g.levelPlayer, q);
  g.choices = [{ kind: 'coins' }];
  g.choose(0);
  assert.equal(q.coins, 25);
  assert.equal(g.state, 'playing');
  g.openChest(false, null, q);
  assert.ok(q.coins > 25);
  assert.equal(p.coins, 25);
  g.state = 'practice';
  assert.equal(g.usePractice('coins'), false);
  g.finish(true);
  assert.equal(g.result.earned, 0);
  assert.equal(g.result.coop, true);
  assert.equal(JSON.stringify(save.data), before);
});

test('一人倒下不结束，击败 Boss 后可以回场，两人都倒下才失败', () => {
  const { game: g } = setup();
  const p = g.player, q = g.partner;
  g.hurtPlayer(1000, null, q);
  assert.equal(q.hp, 0);
  assert.equal(g.state, 'playing');
  assert.equal(g.nearestPlayer(q.x, q.y), p);
  const boss = g.summonBoss('nightmare', 0, 40, 0);
  g.killEnemy(boss, p);
  assert.equal(q.hp, q.st.maxHp * 0.25);
  assert.ok(q.iframe > 0);
  p.iframe = q.iframe = 0;
  g.hurtPlayer(1000, null, q);
  g.hurtPlayer(1000, null, p);
  assert.equal(g.state, 'gameover');
});

test('双人在同一张已启用地图连续迎战三位 Boss，撑完十五分钟正常结算', () => {
  const { game: g, CFG, LanState } = setup();
  g.save.data.routes = { storm: true };
  g.start('ella', 'echo', { peerStages: ['storm'] });
  for (const [time, kind] of [[240, 'nightmare'], [480, 'coffinKing'], [720, 'bridalQueen']]) {
    g.time = time - 0.01;
    g.update(0.02);
    assert.equal(g.state, 'decision');
    assert.equal(g.describeBossDecision().scene, '雷雨荒祠');
    assert.ok(g.chooseBossPlan('normal'));
    assert.equal(g.boss.kind, kind);
    assert.equal(g.stage, 'storm');
    if (kind === 'coffinKing') g.boss.seals = [{ x: 20, y: 50, r: 40 }];
    const snapshot = LanState.readFrame(JSON.parse(JSON.stringify(LanState.packFrame(g))));
    assert.equal(snapshot.stage, 'storm');
    if (kind === 'coffinKing') assert.deepEqual(Array.from(snapshot.boss.seals, s => [s.x, s.y, s.r]), [[20, 50, 40]]);
    const invalid = LanState.packFrame(g);
    invalid.clock[2] = 'constructor';
    assert.equal(LanState.readFrame(invalid), null);
    g.killEnemy(g.boss, g.partner);
  }
  g.time = CFG.RUN_TIME - 0.01;
  g.update(0.02);
  assert.equal(g.state, 'victory');
  assert.equal(g.result.kills, 3);
  assert.equal(g.result.time, CFG.RUN_TIME);
});

test('怪潮为 Boss 留名额，满场快照可编码，来客只收到绘制字段', () => {
  const { game: g, CFG, LanState } = setup();
  for (let i = 0; i < CFG.MAX_ENEMIES + 30; i++) g.spawnEnemy('shade', 200 + i, 20);
  assert.equal(g.enemies.length, CFG.MAX_ENEMIES - 1);
  const boss = g.summonBoss('coffinKing', 1, 400, 400);
  boss.phase = 'sealWind'; boss.seals = [{ x: 5, y: -20, r: 52 }];
  g.environment.lit.add('dusk:4:-20');
  g.environment.landmarkReady.set('dusk:5:1', Infinity);
  g.partner.weapons[0].hit = new Set([1, 2]);
  const packet = JSON.stringify(LanState.packFrame(g));
  assert.ok(Buffer.byteLength(packet) < 24_000);
  const frame = LanState.readFrame(JSON.parse(packet));
  assert.equal(frame.enemies.length, CFG.MAX_ENEMIES);
  assert.equal(frame.player.char, 'echo');
  assert.equal(frame.player.slot, 1);
  assert.equal(frame.partner.char, 'ella');
  assert.equal(frame.boss.kind, 'coffinKing');
  assert.equal(frame.boss.seals[0].r, 52);
  assert.equal(frame.environment.lit.has('dusk:4:-20'), true);
  assert.equal(frame.environment.landmarkReady.get('dusk:5:1'), Infinity);
  assert.equal(frame.player.weapons[0].hit, undefined);
  assert.equal(frame.save, undefined);
});

test('连接码限本地候选，非法角色、选项、信令不进入战斗', () => {
  const { game, LanState, lanDescription, localLanCandidate } = setup();
  const candidate = 'a=candidate:1 1 udp 1 192.168.1.25 34567 typ host';
  assert.ok(localLanCandidate(candidate));
  assert.ok(localLanCandidate(candidate.replace('192.168.1.25', 'any-browser-identifier.local')));
  assert.ok(!localLanCandidate(candidate.replace('192.168.1.25', '203.0.113.25')));
  assert.ok(!localLanCandidate(candidate.replace('typ host', 'typ relay')));
  const sdp = `v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n${candidate}\r\n`;
  const offer = 'NW1-' + btoa(JSON.stringify({ type: 'offer', sdp }));
  assert.equal(lanDescription(offer, 'offer').sdp, sdp);
  assert.throws(() => lanDescription(offer, 'answer'), /应答二维码/);
  assert.throws(() => lanDescription('0'.repeat(24001), 'offer'), /不完整/);
  assert.equal(LanState.choices([{ kind: 'weapon', id: 'constructor', lv: 1 }, { kind: 'weapon', id: 'mouse', lv: 999 }]).length, 0);
  const malformed = LanState.packFrame(game);
  malformed.players[1][0][6] = '__proto__';
  assert.equal(LanState.readFrame(malformed), null);
});

test('来客使用工程师·竹时，专属技能和各自未选卡数都能跨局域网同步', () => {
  const { game: g, LanState } = setup();
  g.start('ella', 'zhu');
  g.addWeapon('boardingPass', g.partner);
  g.addWeapon('noodleRing', g.partner);
  g.addWeapon('aiIntercept', g.partner);
  const foe = g.spawnEnemy('brute', g.partner.x + 65, 0);
  foe.speed = 0;
  g.update(1 / 60);
  g.player.level = 2; g.pending = 1;
  g.partner.level = 5; g.partner.pending = 0;
  const frame = LanState.readFrame(JSON.parse(JSON.stringify(LanState.packFrame(g))));
  assert.equal(frame.player.char, 'zhu');
  assert.ok(frame.projs.some(p => p.look === 'code') && frame.projs.some(p => p.look === 'ticket'));
  assert.ok(frame.zones.some(z => z.type === 'ring' && z.look === 'noodles' && z.wid === 'noodleRing'));
  assert.ok(frame.zones.some(z => z.type === 'meteor' && z.look === 'aiScan' && z.wid === 'aiIntercept'));
  assert.equal(frame.player.outfitPending, 0);
  assert.equal(frame.partner.outfitPending, 1);
});

test('可靠通道分块拼接，拥塞时不排入更多快照', () => {
  const { LanLink } = setup();
  const sender = Object.create(LanLink.prototype), receiver = Object.create(LanLink.prototype);
  const wire = [], received = [];
  sender.dc = { readyState: 'open', bufferedAmount: 0, send: text => wire.push(text) };
  receiver.hooks = { message: value => received.push(value) };
  const message = { t: 'frame', body: '守'.repeat(18000) };
  assert.ok(sender.send(message));
  assert.equal(wire.length, 3);
  for (const part of wire) receiver.receive(part);
  assert.equal(received[0].body, message.body);
  sender.dc.bufferedAmount = 35000;
  assert.equal(sender.send(message), false);
  assert.equal(sender.send({ t: 'pick', turn: 1, index: 0 }, true), true);
});
