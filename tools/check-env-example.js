#!/usr/bin/env node
/**
 * `.env.example` ↔ `src/common/env.validation.schema.ts` mosligini tekshiradi.
 *
 *  - schema'da bor, example'da yo'q kalit → XATO (exit 1)
 *  - example'da bor, schema'da yo'q kalit → OGOHLANTIRISH
 *  - `dist/` mavjud bo'lsa, example qiymatlari Joi schema'dan o'tishi ham tekshiriladi
 *    (yo'q bo'lsa `pnpm build` dan keyin qayta ishga tushiring).
 *
 * Ishlatish: `pnpm env:check` (CI'da ham).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const schemaSrc = fs.readFileSync(
  path.join(root, 'src/common/env.validation.schema.ts'),
  'utf8',
);
const exampleSrc = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

const schemaKeys = [...schemaSrc.matchAll(/^\s+([A-Z][A-Z0-9_]*):\s*Joi\./gm)].map(
  (m) => m[1],
);

const example = {};
for (const line of exampleSrc.split('\n')) {
  const m = line.match(/^\s*([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  // inline izohni olib tashlaymiz: KEY=value   # izoh
  example[m[1]] = m[2].replace(/\s+#.*$/, '').trim();
}
const exampleKeys = Object.keys(example);

const missing = schemaKeys.filter((k) => !exampleKeys.includes(k));
const extra = exampleKeys.filter((k) => !schemaKeys.includes(k));

let failed = false;

if (missing.length) {
  failed = true;
  console.error('✖ .env.example da yo\'q (schema talab qiladi):');
  for (const k of missing) console.error('   - ' + k);
}
if (extra.length) {
  console.warn('⚠ .env.example da ortiqcha (schema\'da yo\'q):');
  for (const k of extra) console.warn('   - ' + k);
}

// Qiymatlar Joi'dan o'tadimi (build qilingan schema orqali)
const distSchema = path.join(root, 'dist/common/env.validation.schema.js');
if (fs.existsSync(distSchema)) {
  const { envValidationSchema } = require(distSchema);
  const { error } = envValidationSchema.validate(example, {
    allowUnknown: true,
    abortEarly: false,
  });
  if (error) {
    failed = true;
    console.error('✖ .env.example qiymatlari Joi schema\'dan o\'tmadi:');
    for (const d of error.details) console.error('   - ' + d.message);
  } else {
    console.log('✓ .env.example qiymatlari Joi schema\'dan o\'tdi');
  }
} else {
  console.warn('⚠ dist/ topilmadi — qiymatlar tekshirilmadi (pnpm build)');
}

if (!failed) {
  console.log(
    `✓ env:check: ${schemaKeys.length} ta kalit schema'da, hammasi .env.example da bor`,
  );
}
process.exit(failed ? 1 : 0);
