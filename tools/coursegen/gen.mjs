// gen.mjs — build SOP training-course rows from compact specs and load them.
//
//   node gen.mjs            -> if SUPABASE_SERVICE_ROLE_KEY set, upsert via REST;
//                             otherwise write out/courses.sql (run via Supabase SQL).
//   node gen.mjs --print    -> also print a short summary of each built course.
//
// Spec files live in ./courses/*.json. Output (draft) rows match the live course schema:
//   script = [title_card, ...infographic, title_card] ; quizzes = [...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { titleCard, listSlide, stepsSlide, closingCard } from './templates.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SPECS = path.join(DIR, 'courses');
const OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });

const COMPANY = 'dae1afc8-55cb-476e-8099-07ef41e4452d';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xbcdzkrhtjgxdwfqqugc.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const estDur = (n) => Math.max(8, Math.ceil((n || '').length / 6));

function buildScenes(spec) {
  const theme = spec.theme || '#f59e0b';
  const scenes = [];
  let i = 1;
  const introTitlePlain = (spec.intro_title || spec.title).replace(/<br>/g, ' ');
  scenes.push({
    type: 'title_card', scene: i, duration: estDur(spec.intro_narration),
    title_main: introTitlePlain, title_main_vn: introTitlePlain,
    narration: spec.intro_narration, narration_vn: spec.intro_narration,
    _htmlContent: titleCard(spec.intro_kicker || 'KIWOOZA', spec.intro_title || spec.title, theme),
  });
  for (const s of spec.scenes) {
    i++;
    let html;
    if (s.type === 'list') html = listSlide(s.bg || '#0f172a', s.kicker, s.h1, s.rows, theme);
    else if (s.type === 'steps') html = stepsSlide(s.bg || '#0f1419', s.kicker, s.h1, s.steps, theme, s.note || null);
    else throw new Error(`${spec.id}: unknown scene type ${s.type}`);
    scenes.push({
      type: 'infographic', scene: i, duration: estDur(s.narration),
      narration: s.narration, narration_vn: s.narration, _htmlContent: html,
    });
  }
  i++;
  scenes.push({
    type: 'title_card', scene: i, duration: estDur(spec.closing_narration),
    title_main: spec.closing_title, title_main_vn: spec.closing_title,
    narration: spec.closing_narration, narration_vn: spec.closing_narration,
    _htmlContent: closingCard(spec.closing_title, spec.closing_sub || '', theme),
  });
  return scenes;
}

function buildRow(spec) {
  if (!spec.id || !spec.title) throw new Error('spec missing id/title');
  const scenes = buildScenes(spec);
  return {
    id: spec.id, title: spec.title, title_vn: spec.title, title_en: spec.title_en || spec.title,
    category: spec.category || 'General', content: spec.content_html || '', content_vn: spec.content_html || '',
    status: spec.status || 'draft', order_num: spec.order_num || 200, doc_type: 'section', company_id: COMPANY,
    script: scenes, quizzes: spec.quizzes || [], exam_quizzes: [],
  };
}

const sq = (s) => `'` + String(s).replaceAll(`'`, `''`) + `'`;          // plain text literal
const dollar = (s) => `$crs$` + s + `$crs$`;                            // text via dollar-quote
const dollarJson = (o) => `$crs$` + JSON.stringify(o) + `$crs$::jsonb`; // jsonb via dollar-quote
function toSql(r) {
  const cols = ['id', 'title', 'title_vn', 'title_en', 'category', 'content', 'content_vn', 'status', 'order_num', 'doc_type', 'company_id', 'script', 'quizzes', 'exam_quizzes'];
  const vals = [sq(r.id), sq(r.title), sq(r.title_vn), sq(r.title_en), sq(r.category), dollar(r.content), dollar(r.content_vn), sq(r.status), r.order_num, sq(r.doc_type), sq(r.company_id), dollarJson(r.script), dollarJson(r.quizzes), `'[]'::jsonb`];
  const set = ['title', 'title_vn', 'title_en', 'category', 'content', 'content_vn', 'status', 'order_num', 'script', 'quizzes', 'company_id']
    .map((c) => `${c}=EXCLUDED.${c}`).join(',') + ',updated_at=now()';
  return `INSERT INTO sop_documents (${cols.join(',')}) VALUES (${vals.join(',')}) ON CONFLICT (id) DO UPDATE SET ${set};`;
}

const files = fs.readdirSync(SPECS).filter((f) => f.endsWith('.json')).sort();
const rows = [];
for (const f of files) {
  const spec = JSON.parse(fs.readFileSync(path.join(SPECS, f), 'utf8'));
  const r = buildRow(spec);
  JSON.parse(JSON.stringify(r.script)); // sanity: valid JSON
  if (JSON.stringify(r.script).includes('$crs$')) throw new Error(`${r.id}: content collides with SQL tag`);
  rows.push(r);
  if (process.argv.includes('--print')) console.log(`  ${r.id}  scenes=${r.script.length} quizzes=${r.quizzes.length}  "${r.title}"`);
}
console.log(`Built ${rows.length} course(s) from ${files.length} spec file(s).`);

if (KEY) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sop_documents?on_conflict=id`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  const txt = await res.text();
  console.log(`REST upsert -> HTTP ${res.status} ${res.statusText}${txt ? ' | ' + txt.slice(0, 300) : ''}`);
  if (!res.ok) process.exit(1);
  console.log(`✓ Upserted ${rows.length} course(s) directly to Supabase.`);
} else {
  const sql = rows.map(toSql).join('\n');
  fs.writeFileSync(path.join(OUT, 'courses.sql'), sql);
  console.log(`No SUPABASE_SERVICE_ROLE_KEY -> wrote out/courses.sql (${sql.length} bytes, ${rows.length} upserts).`);
}
