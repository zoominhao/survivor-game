'use strict';

// 均匀空间网格:每帧重建,用于敌人的邻近查询
class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); this.active = []; }
  clear() {
    // 每帧只清空实际用过的格子，避免长局移动后遍历大量空格。
    if (this.map.size > 3000) this.map.clear();
    else for (const a of this.active) a.length = 0;
    this.active.length = 0;
  }
  key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  insert(e) {
    const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    if (!a.length) this.active.push(a);
    a.push(e);
  }
  get(cx, cy) { return this.map.get(this.key(cx, cy)); }
}
