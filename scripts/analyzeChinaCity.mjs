/**
 * 分析 public/geo/china-city.json 的结构——只抽字段名与层级关系，不关心值。
 * 运行方式：node scripts/analyzeChinaCity.mjs
 *
 * 输出两样东西：
 *  1. 概览：文件根结构、features 数量、按 level 分组统计、properties 字段池
 *  2. 抽象树：任意一条路径出现过的 key 轨迹（递归抽取，值不打印）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '../public/geo/china-city.json');

const raw = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(raw);

const leafTypes = new Set(['string', 'number', 'boolean', 'bigint', 'undefined']);
const seenPaths = new Map(); // path -> Set(key)
let maxDepth = 0;

/** 递归扫描：把每个 Level 的 key 收集进 seenPaths，值只取类型，不打印内容 */
function scan(node, trail, depth) {
  maxDepth = Math.max(maxDepth, depth);
  if (Array.isArray(node)) {
    // 数组取其元素轴的字段分歧，但只取首个元素深入（避免 O(n) 遍历）、并记录维度
    const dims = new Set();
    for (const item of node) {
      dims.add(Array.isArray(item) ? `Array(${item.length})` : typeof item);
    }
    record(trail, `[items:${dims.size ? [...dims].join('/') : 'empty'}]`);
    if (node.length > 0 && !leafTypes.has(typeof node[0])) {
      scan(node[0], trail, depth + 1);
    }
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      record(trail, key);
      scan(node[key], trail === '' ? key : `${trail}.${key}`, depth + 1);
    }
  }
}

function record(trail, key) {
  if (!seenPaths.has(trail)) seenPaths.set(trail, new Set());
  seenPaths.get(trail).add(key);
}

scan(data, 'root', 0);

/* ---------- 1. 概览 ---------- */
console.log('========== 概览 ==========');
console.log('根对象 key：', Object.keys(data).join(', '));
console.log('features 数量：', Array.isArray(data.features) ? data.features.length : 'N/A');

// 按 properties.level 统计（只看类型，确认各行政区层级）
const levelStats = {};
for (const f of data.features || []) {
  const lv = f?.properties?.level;
  if (typeof lv === 'string') levelStats[lv] = (levelStats[lv] || 0) + 1;
}
console.log('行政区 level 分布：', JSON.stringify(levelStats, null, 2));

// 各 level 下 properties 字段的差异（值类型）
const propsByLevel = {};
const propsValueType = {};
for (const f of data.features || []) {
  const lv = f?.properties?.level;
  if (!lv) continue;
  propsByLevel[lv] ??= { count: 0, keys: new Set(), types: {} };
  propsByLevel[lv].count++;
  for (const [k, v] of Object.entries(f.properties || {})) {
    propsByLevel[lv].keys.add(k);
    const t = Array.isArray(v) ? 'array' : typeof v;
    propsByLevel[lv].types[k] ??= new Set();
    propsByLevel[lv].types[k].add(t);
  }
}
console.log('\n各 level 的 properties 字段（含值类型）：');
for (const [lv, info] of Object.entries(propsByLevel)) {
  const typesStr = [...info.keys].map(
    (k) => `${k}:${[...info.types[k]].join('/')}`
  ).join('  ');
  console.log(`  [${lv}]×${info.count}  ${typesStr}`);
}
void propsValueType;

/* ---------- 2. 抽象树 ---------- */
console.log('\n========== 抽象键树（每行 = 一条 key 轨迹） ==========');
for (const [trail, keys] of seenPaths) {
  const sorted = [...keys].sort();
  console.log(`${trail} -> { ${sorted.join(', ')} }`);
}
console.log('\n最大深度：', maxDepth);