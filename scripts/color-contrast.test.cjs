const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const loadColorContrastModule = () => {
  const sourcePath = path.join(__dirname, '..', 'src/lib/ui/colorContrast.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const moduleRef = { exports: {} };
  const compiled = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    transpiled
  );
  compiled(moduleRef.exports, require, moduleRef, sourcePath, path.dirname(sourcePath));
  return moduleRef.exports;
};

const { buildLessonPalette, getContrastRatio, getReadableTextColor } = loadColorContrastModule();

test('getReadableTextColor picks readable color on light and dark backgrounds', () => {
  const onLight = getReadableTextColor('#e0ebfe', '#60a5fa');
  const onDark = getReadableTextColor('#1e293b', '#475569');

  assert.ok(getContrastRatio(onLight, '#e0ebfe') >= 4.5);
  assert.ok(getContrastRatio(onDark, '#1e293b') >= 4.5);
});

test('buildLessonPalette keeps title and secondary text readable on problematic colors', () => {
  const problematicColors = ['#22c55e', '#3b82f6'];

  for (const accent of problematicColors) {
    const palette = buildLessonPalette(accent);

    assert.ok(getContrastRatio(palette.cardTitle, palette.cardBackground) >= 4.5);
    assert.ok(getContrastRatio(palette.cardSecondary, palette.cardBackground) >= 4.5);
    assert.ok(getContrastRatio(palette.detailTitle, palette.detailBackground) >= 4.5);
    assert.ok(getContrastRatio(palette.detailSecondary, palette.detailBackground) >= 4.5);
  }
});

