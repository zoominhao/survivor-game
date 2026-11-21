'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptPaths = [...html.matchAll(/<script src="(js\/[^"?]+)(?:\?[^\"]*)?"/g)].map(match => match[1]);
const battleScript = file => file.startsWith('js/battle/') || file.startsWith('js/shared/');
const scripts = new Map();

function loadGame(context, select) {
  for (const file of scriptPaths.filter(select)) {
    if (!scripts.has(file)) scripts.set(file, new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }));
    scripts.get(file).runInContext(context);
  }
}

module.exports = { root, scriptPaths, battleScript, loadGame };
