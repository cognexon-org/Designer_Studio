#!/usr/bin/env node
/**
 * ProgressionAi Visual Engine v1 — asset budget audit.
 *
 * Pure Node.js: no runtime dependency additions. Reads GLB JSON chunks to
 * estimate triangle counts and audits model/texture bytes against V1 budgets.
 * It does not mutate source assets. Use the JSON output to drive Blender or
 * glTF-Transform optimisation and to populate catalogue visual metadata.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.argv[2] || 'public/assets/realistic');
const strict = process.argv.includes('--strict');
const outArg = process.argv.find((value) => value.startsWith('--out='));
const out = path.resolve(outArg ? outArg.slice('--out='.length) : '.visual-asset-audit.json');

const BUDGETS = {
  modelBytes: 2 * 1024 * 1024,
  modelTriangles: 120_000,
  textureBytes: 1024 * 1024,
  environmentBytes: 4 * 1024 * 1024,
};

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function glbJson(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') return null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) {
      const json = buffer.toString('utf8', offset, offset + length).replace(/\u0000+$/g, '').trim();
      return JSON.parse(json);
    }
    offset += length;
  }
  return null;
}

function triangleCount(gltf) {
  if (!gltf?.meshes || !gltf?.accessors) return null;
  let triangles = 0;
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives || []) {
      const mode = primitive.mode ?? 4;
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      const count = gltf.accessors?.[accessorIndex]?.count;
      if (!Number.isFinite(count)) continue;
      if (mode === 4) triangles += Math.floor(count / 3); // TRIANGLES
      else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2); // STRIP/FAN
    }
  }
  return triangles;
}

const files = walk(root);
const models = [];
const textures = [];
const environments = [];
const warnings = [];

for (const file of files) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const stat = fs.statSync(file);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.glb') {
    let triangles = null;
    try { triangles = triangleCount(glbJson(file)); }
    catch (error) { warnings.push(`${rel}: unable to parse GLB JSON (${error.message})`); }
    const row = { path: rel, bytes: stat.size, triangles };
    models.push(row);
    if (stat.size > BUDGETS.modelBytes) warnings.push(`${rel}: ${(stat.size / 1048576).toFixed(2)} MiB exceeds 2 MiB V1 model budget`);
    if (triangles != null && triangles > BUDGETS.modelTriangles) warnings.push(`${rel}: ${triangles.toLocaleString()} triangles exceeds 120k V1 high-LOD budget`);
  } else if (['.webp', '.png', '.jpg', '.jpeg', '.ktx2'].includes(ext)) {
    const row = { path: rel, bytes: stat.size };
    textures.push(row);
    if (stat.size > BUDGETS.textureBytes) warnings.push(`${rel}: ${(stat.size / 1048576).toFixed(2)} MiB exceeds 1 MiB V1 texture budget`);
  } else if (['.hdr', '.exr'].includes(ext)) {
    const row = { path: rel, bytes: stat.size };
    environments.push(row);
    if (stat.size > BUDGETS.environmentBytes) warnings.push(`${rel}: ${(stat.size / 1048576).toFixed(2)} MiB exceeds 4 MiB V1 environment budget`);
  }
}

const totalBytes = [...models, ...textures, ...environments].reduce((sum, row) => sum + row.bytes, 0);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  root,
  budgets: BUDGETS,
  summary: {
    models: models.length,
    textures: textures.length,
    environments: environments.length,
    totalBytes,
    totalMiB: Number((totalBytes / 1048576).toFixed(2)),
    warnings: warnings.length,
  },
  models,
  textures,
  environments,
  warnings,
  optimisationPolicy: {
    high: 'Preserve silhouette/detail; target <=120k triangles and <=2 MiB where practical.',
    medium: 'Create approximately 45–60% triangle LOD for mid-distance use.',
    low: 'Create approximately 15–25% triangle LOD for room-overview / distant use.',
    textures: 'Prefer WebP/KTX2 derivatives; preserve source masters outside the web bundle.',
  },
};

fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Visual asset audit: ${report.summary.models} models, ${report.summary.textures} textures, ${report.summary.totalMiB} MiB`);
for (const warning of warnings) console.warn(`WARN ${warning}`);
console.log(`Report: ${out}`);
if (strict && warnings.length) process.exitCode = 2;
