'use strict';

// 均匀空间网格:每帧重建,用于敌人的邻近查询
class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  clear() {
    // 玩家在无限地图上移动会不断产生新格子,过多时整体丢弃
    if (this.map.size > 3000) { this.map.clear(); return; }
    for (const a of this.map.values()) a.length = 0;
  }
  key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  insert(e) {
    const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    a.push(e);
  }
  get(cx, cy) { return this.map.get(this.key(cx, cy)); }
}
