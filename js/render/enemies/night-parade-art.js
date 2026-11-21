'use strict';

// 常规怪潮的民俗剪影。先用帽、袖、角、穗区分轮廓，再加局部亮色。
const NightParadeArt = (() => {
  const paths = Object.fromEntries(Object.entries({
    burialRobe: 'M-5-4L-9-2-15 8-11 10-7 6-7 14-2 12 2 15 7 12 8 6 12 10 15 7 9-2 5-4Z',
    mourningHair: 'M-7 6L-8-7Q-8-15 0-15Q8-15 8-7L9 8 5 6 3-6-5-8-4 6Z',
    burialTrim: 'M-5-2L3 4 0 10M5-2L3 4M-12 6L-9 8M12 6L9 8',
    paperKite: 'M0-12L4-7 16-8 11 0 5 4 4 9 0 6-4 9-5 4-11 0-16-8-4-7Z',
    kiteFrame: 'M0-11V6M-14-7L0-2 14-7M-10-1L-4 1M10-1L4 1',
    kiteTails: 'M-3 7Q-7 10-3 16L0 15Q-4 11-1 7ZM3 7Q8 11 5 15L8 14Q10 10 5 6Z',
    lanternLimbs: 'M-10 0L-15-5-13 3-9 6M10 0L15-5 13 3 9 6M-5 7L-8 13-5 12-1 8M5 7L8 13 5 12 1 8',
    lanternTrim: 'M-6-9H6V-6H-6ZM-6 6H6V9H-6ZM-1 9V15L2 13 1 9Z',
    stoneBody: 'M-7-11L-12-13-13-8-16-5-15 5-12 7-14 12-6 12-3 9H3L6 12H14L12 7 15 5 16-5 13-8 12-13 7-11Z',
    stoneMane: 'M-5-9C-14-11-15 2-9 1Q-5 0-8-4Q-11-7-11-2M5-9C14-11 15 2 9 1Q5 0 8-4Q11-7 11-2M-11 8L-10 12M11 8L10 12',
    stoneSnout: 'M-7 1L-4-2H4L7 1 6 6 0 8-6 6Z',
    paintedSleeves: 'M-5-3L-11-2-15 6-10 10-6 7-8 13 3 15 10 11 7 3 13 5 15-2 11-6 6-3Z',
    paintedHair: 'M-6 5L-9-7Q-9-16 0-16Q8-15 9-8L11 2 7 5Z',
    halfMask: 'M-5-11Q2-14 6-9L4-6 7-3 3 0 4 4Q0 6-4 2L-6-4Z',
    maskShard: 'M7 0L-1 5-6 2-4-4 2-3Z',
    envoyRobe: 'M-4-4L-9-2-14 6-8 8-6 6-8 13-2 15 1 12 6 15 9 13 6 5 9 8 14 5 9-2 4-4Z',
    envoyHat: 'M-7-5L-6-16-3-18 5-17 7-5Z',
    envoyTrim: 'M-5-2L3 4 0 11M5-2L3 4M-2-15H2V-12H-2ZM-2-10H2M0-12V-8',
    bullArmor: 'M-5-6L-11-4-16 0-15 7-11 7-11 12-5 15H5L11 12V7H15L16 0 11-4 5-6Z',
    bullHorns: 'M-6-6Q-16-5-16-17Q-11-12-5-11M6-6Q16-5 16-17Q11-12 5-11',
    bullHead: 'M-9-8L-12-10-13-6-8-3-6 4H6L8-3 13-6 12-10 9-8 6-12H-6Z',
    bullArmorTrim: 'M-13 1L-11 5-5 6M13 1L11 5 5 6M-10 9H-4M4 9H10M-7 12H7',
  }).map(([key, d]) => [key, new Path2D(d)]));

  function stroke(c, path, color, width = 1.1) {
    c.strokeStyle = color; c.lineWidth = width; c.stroke(paths[path]);
  }

  function paint(c, path, fill, edge, width = 1.25) {
    c.fillStyle = fill; c.fill(paths[path]);
    if (edge) stroke(c, path, edge, width);
  }

  function oval(c, x, y, rx, ry, fill) {
    c.fillStyle = fill;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  }

  function sprite(paintSprite) {
    return (c, r) => {
      c.save(); c.scale(r / 13, r / 13); c.lineJoin = 'round'; c.lineCap = 'round';
      paintSprite(c);
      c.restore();
    };
  }

  const shade = sprite(c => { // 寿衣鬼：拖袖、交领、长发下露出一只眼。
    paint(c, 'burialRobe', '#afa4ad', '#514652', 1.55);
    stroke(c, 'burialTrim', '#66576a', 1.3);
    oval(c, -0.5, -5.5, 5.9, 6.6, '#e0ddd0');
    paint(c, 'mourningHair', '#3b323e', '#776c7d');
    oval(c, -1.9, -5.8, 1.7, 1.15, '#4c3546');
  });

  const moth = sprite(c => { // 招魂纸鸢：燕尾、竹骨、两条招魂纸带。
    paint(c, 'kiteTails', '#c96864', '#6e3949');
    paint(c, 'paperKite', '#eccd92', '#8d5a50', 1.65);
    stroke(c, 'kiteFrame', '#936254', 1.4);
    oval(c, 0, -4, 2.6, 2.7, '#b04955');
  });

  const swarm = sprite(c => { // 灯笼小鬼：红纸、金箍和垂穗。
    paint(c, 'lanternLimbs', '#6d4452', '#ca7770', 1.4);
    oval(c, 0, 0, 11, 8, '#c44d49');
    oval(c, 0, 0, 7.7, 7.4, '#e18455');
    oval(c, 0, 0, 4.5, 6.9, '#efa661');
    paint(c, 'lanternTrim', '#f5c874', '#975346');
    for (const s of [-1, 1]) oval(c, s * 3.7, -0.5, 1.55, 1.75, '#583340');
  });

  const brute = sprite(c => { // 镇墓石兽：石刻卷鬃、宽鼻和压低的双爪。
    paint(c, 'stoneBody', '#737f6c', '#adb09a', 1.3);
    stroke(c, 'stoneMane', '#404d43', 1.6);
    paint(c, 'stoneSnout', '#9b9f87', '#4f5b4e');
    for (const s of [-1, 1]) {
      oval(c, s * 4.1, -4.8, 1.9, 1.3, '#f2bf73');
      oval(c, s * 2.6, 1.2, 1.15, 0.9, '#434c41');
    }
    c.fillStyle = '#e0d7b9'; c.fillRect(-4.8, 4.5, 1.75, 1.9); c.fillRect(3, 4.5, 1.75, 1.9);
  });

  const spitter = sprite(c => { // 画皮妖：一手抬袖，脸上只剩半张裂开的面皮。
    paint(c, 'paintedSleeves', '#87546e', '#d49895', 1.4);
    paint(c, 'paintedHair', '#453443', '#9c7480');
    paint(c, 'halfMask', '#ead2ba', '#b07476');
    oval(c, -2.5, -6, 1.65, 1.1, '#963d59');
    oval(c, 2.5, 2, 1.7, 0.8, '#a6465e');
    oval(c, 2, -13.1, 4.6, 1.15, '#efb37e');
  });

  const wraith = sprite(c => { // 黑无常：高帽、皂袍和垂在袖侧的拘魂锁。
    paint(c, 'envoyRobe', '#424b66', '#91a0be', 1.45);
    oval(c, 0, -4.7, 5.5, 5.5, '#a9afc5');
    for (const s of [-1, 1]) oval(c, s * 2.3, -3, 1.05, 1.35, '#43425b');
    paint(c, 'envoyHat', '#343a55', '#a8b7d2');
    stroke(c, 'envoyTrim', '#c3bdab');
    c.strokeStyle = '#c1c5d1'; c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.ellipse(10 + i, 7 + i * 2.2, 1.35, 2.1, -0.45, 0, TAU); c.stroke();
    }
  });

  const golem = sprite(c => { // 牛头阴差：外张牛角、宽嘴鼻环与旧铜甲。
    paint(c, 'bullArmor', '#5b4a41', '#9d8268', 1.35);
    stroke(c, 'bullArmorTrim', '#bc9167', 1.35);
    paint(c, 'bullHorns', '#d6c3a0', '#95795e');
    paint(c, 'bullHead', '#805650', '#bf9276');
    for (const s of [-1, 1]) oval(c, s * 4, -6.6, 1.6, 0.95, '#f5cd86');
    oval(c, 0, 0.3, 5.5, 3.6, '#ac7d6e');
    for (const s of [-1, 1]) oval(c, s * 2.4, -0.1, 1.15, 0.9, '#503d41');
    c.strokeStyle = '#edc786'; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, 3.3, 2.05, 2.3, 0, 0, TAU); c.stroke();
  });

  function maskShard(c, b) {
    c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx)); c.lineJoin = 'round';
    paint(c, 'maskShard', '#eccfb0', '#f4989a');
    oval(c, -0.5, -0.55, 2, 0.85, '#8c4059');
    c.restore();
  }

  return { shade, moth, swarm, brute, spitter, wraith, golem, maskShard };
})();
