'use strict';
// 民俗怪谈造型：清晰的黄符、官帽与红盖头，不使用血腥表现。
const FolkEnemyArt = (() => {
  const paths = {
    robe: new Path2D('M-7-4Q0-8 7-4L11 12Q5 17 0 14Q-5 17-11 12Z'),
    sleeves: new Path2D('M-7-3Q-11-4-13 2L-14 5L-8 7L-5 0M7-3Q11-4 13 2L14 5L8 7L5 0'),
    hat: new Path2D('M-14-13L-10-17L-5-18Q0-22 5-18L10-17L14-13Q8-9 0-11Q-8-9-14-13Z'),
    talisman: new Path2D('M-2.7-13L3.5-12.5L2.7-1L0.2-2L-3-1Z'),
    rune: new Path2D('M0-11V-4M-1.5-9H1.6M-1.4-6.6L1.5-5.7M-1.7-4.2L1.3-7.7'),
    weddingDress: new Path2D('M-6-6Q0-9 6-6Q9-1 9 4L15 17Q9 22 2 18Q-5 22-15 17L-10 7Z'),
    leftSleeve: new Path2D('M-7-5Q-11-4-13 0L-17 12Q-13 15-9 10L-5 1Z'),
    rightSleeve: new Path2D('M7-5Q11-4 13 0L17 12Q13 15 9 10L5 1Z'),
    veil: new Path2D('M-12-17Q0-23 12-17L15 2Q9 6 4 3L0 6L-4 3Q-9 6-15 2Z'),
    veilTrim: new Path2D('M-12-15Q0-19 12-15M-13.5 1Q-9 4-4 2L0 4L4 2Q9 4 13.5 1'),
    goldLines: new Path2D('M-5 5L-9 15M5 5L10 15M-2 7L0 15L2 7M-14 10L-10 12M10 12L14 10'),
    invitation: new Path2D('M-6.5-4L6-4L7 3.7L-6 4.5Z'),
    invitationFold: new Path2D('M-6-3L0 1L6-3M-5 3L-2 0M5 3L2 0'),
    paperRobe: new Path2D('M-5-4L5-4 14 6 9 10 6 7 9 16H-9L-6 7-9 10-14 6Z'),
    paperCollar: new Path2D('M-5-4L5 4 8-3M0 0-3 13M-5 13H5'),
    umbrella: new Path2D('M-20-3Q-14-16 0-21Q14-16 20-3Q13-6 7-1Q0-5-7-1Q-13-6-20-3Z'),
    ribs: new Path2D('M0-20Q-6-13-7-2M0-20Q6-13 7-2M0-20V-4'),
    ghostTail: new Path2D('M-6-6Q0-10 7-5Q12 2 9 12Q6 18 0 21Q1 13-5 15Q-11 12-10 3Z'),
    envoyCoat: new Path2D('M-6-3H6L13 4 16 11 9 10 13 18Q3 22-1 18Q-6 22-13 18L-9 10-16 11-13 4Z'),
    envoyHat: new Path2D('M-7-9L-6-22Q1-25 7-21L8-9Z'),
    envoyTrim: new Path2D('M-6-1L3 5 0 15M6-1L3 5M-11 12-10 17M7 11L10 17M-0.5-20L-1.8-17.4M-2.2-17.2H2V-12.1H-2.2ZM-1.9-14.8H1.6'),
    raindrop: new Path2D('M8 0Q-1-7-6-3Q-11 0-6 3Q-1 7 8 0Z'),
  };

  function paint(c, path, fill, edge, width = 1.15) {
    c.fillStyle = fill; c.fill(path);
    if (edge) { c.strokeStyle = edge; c.lineWidth = width; c.stroke(path); }
  }

  function oval(c, x, y, rx, ry, fill) {
    c.fillStyle = fill;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  }

  function jiangshi(c, r) {
    c.save(); c.scale(r / 14, r / 14); c.lineJoin = 'round';
    oval(c, -4.7, 14.2, 3.6, 2.3, '#232039');
    oval(c, 4.7, 14.2, 3.6, 2.3, '#232039');
    paint(c, paths.robe, '#434b68', '#211f37');
    paint(c, paths.sleeves, '#677999', '#37374f');
    oval(c, -12, 4.7, 2.8, 2.1, '#acbf9a');
    oval(c, 12, 4.7, 2.8, 2.1, '#acbf9a');
    oval(c, 0, -8.9, 8.2, 6.9, '#7f9b79');
    oval(c, -4, -8.2, 1.6, 1.1, '#e6c78a');
    oval(c, 4.2, -8.2, 1.6, 1.1, '#e6c78a');
    paint(c, paths.hat, '#373049', '#211e30');
    oval(c, 0, -18.7, 2.1, 1.4, '#ce776a');
    paint(c, paths.talisman, '#efc767', '#9f6945', 0.65);
    c.strokeStyle = '#a9493c'; c.lineWidth = 0.68; c.stroke(paths.rune);
    c.fillStyle = '#bb9e67'; c.fillRect(-4.4, 7, 8.8, 1.45);
    c.restore();
  }

  function bride(c, r) {
    c.save(); c.scale(r / 15, r / 15); c.lineJoin = 'round';
    paint(c, paths.weddingDress, '#923d57', '#45243e');
    paint(c, paths.leftSleeve, '#ab4961', '#583047');
    paint(c, paths.rightSleeve, '#ab4961', '#583047');
    c.strokeStyle = '#e5ab75'; c.lineWidth = 1; c.stroke(paths.goldLines);
    paint(c, paths.veil, '#bd515f', '#663044');
    c.strokeStyle = '#f0b67c'; c.lineWidth = 1; c.stroke(paths.veilTrim);
    oval(c, 0, -13.6, 2.4, 1.9, '#ffdb9d');
    oval(c, -4.4, -4.2, 1.25, 0.7, '#ffd8a6');
    oval(c, 4.4, -4.2, 1.25, 0.7, '#ffd8a6');
    c.restore();
  }

  function weddingPaper(c, b) {
    c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx));
    paint(c, paths.invitation, '#da6973', '#ffbe9d', 0.9);
    c.strokeStyle = '#79405a'; c.lineWidth = 0.75; c.stroke(paths.invitationFold);
    oval(c, 0, 0.5, 1.2, 1.15, '#ffdb97');
    c.restore();
  }

  function paperChild(c, r) {
    c.save(); c.scale(r / 13, r / 13); c.rotate(-0.12); c.lineJoin = 'round';
    paint(c, paths.paperRobe, '#dad0ac', '#594b52');
    c.strokeStyle = '#94717a'; c.lineWidth = 1; c.stroke(paths.paperCollar);
    oval(c, 0, -8.3, 8, 7.6, '#efdfb8');
    oval(c, -5, -14.3, 4.3, 2.7, '#443644');
    oval(c, 5, -14.3, 4.3, 2.7, '#443644');
    for (const side of [-1, 1]) {
      oval(c, side * 3.05, -9, 1.25, 1.65, '#5a3d51');
      oval(c, side * 4.7, -5.1, 1.65, 1.1, '#be7774');
    }
    oval(c, 0, -4.5, 0.9, 1.3, '#7e5665');
    c.restore();
  }

  function umbrellaGhost(c, r) {
    c.save(); c.scale(r / 15, r / 15); c.lineJoin = 'round';
    paint(c, paths.ghostTail, '#68849e', '#37485d');
    oval(c, 0, 3.2, 6.6, 6.2, '#96c2c8');
    oval(c, -2.8, 4.1, 1, 1.2, '#354858'); oval(c, 2.8, 4.1, 1, 1.2, '#354858');
    paint(c, paths.umbrella, '#657bab', '#344159');
    c.strokeStyle = '#b0c5cc'; c.lineWidth = 0.95; c.stroke(paths.ribs);
    oval(c, 0, -21, 1.35, 1.25, '#d9e4e3');
    c.restore();
  }

  function snowEnvoy(c, r) {
    c.save(); c.scale(r / 17, r / 17); c.lineJoin = 'round';
    paint(c, paths.envoyCoat, '#becfd4', '#5c687e');
    oval(c, 0, -6, 6.3, 6.1, '#8babb6');
    oval(c, -2.6, -6.1, 0.96, 1.15, '#3a536e'); oval(c, 2.6, -6.1, 0.96, 1.15, '#3a536e');
    paint(c, paths.envoyHat, '#e3e9e3', '#687991');
    c.strokeStyle = '#748898'; c.lineWidth = 0.9; c.stroke(paths.envoyTrim);
    oval(c, -12, 9.4, 2.2, 1.4, '#d1e9e8'); oval(c, 12, 9.4, 2.2, 1.4, '#d1e9e8');
    c.restore();
  }

  function rainDrop(c, b) {
    c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx));
    paint(c, paths.raindrop, '#8ac5db', '#d0e9f3', 0.9);
    oval(c, 1, -1, 1.8, 0.85, '#e0f4ff');
    c.restore();
  }

  return { jiangshi, bride, paperChild, umbrellaGhost, snowEnvoy, weddingPaper, rainDrop };
})();
