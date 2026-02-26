const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
const sidebarPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'Sidebar.tsx');

const appSource = fs.readFileSync(appPath, 'utf8');
const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');

const routeExpectations = [
  ['timetable/multi', 'TimetableMultiPage'],
  ['grades/edit', 'GradesEditPage'],
  ['grades/appreciations', 'GradesAppreciationsPage'],
  ['homework/planning', 'HomeworkPlanningPage'],
  ['homework/exams', 'HomeworkExamsPage'],
  ['homework/summary', 'HomeworkSummaryPage'],
  ['homework/content', 'HomeworkContentPage'],
  ['attendance/sanctions', 'AttendanceSanctionsPage'],
  ['students', 'StudentsPage'],
  ['trombinoscope', 'StudentsPage'],
  ['teachers', 'TeachersPage'],
  ['resources/students', 'StudentsPage'],
  ['resources/teachers', 'TeachersPage'],
  ['forums', 'ForumsPage'],
  ['progressions', 'ProgressionsPage'],
  ['programs', 'ProgramsPage'],
  ['bulletins/appreciations', 'BulletinsAppreciationsPage'],
  ['bulletins/archive', 'BulletinsArchivePage'],
  ['competences/evaluations', 'CompetencesEvaluationsPage'],
  ['competences/bilans', 'CompetencesBilansPage'],
  ['results/livret', 'ResultsLivretPage'],
  ['results/summary', 'ResultsSummaryPage'],
  ['meetings', 'MeetingsPage'],
  ['rooms', 'RoomsPage'],
  ['casier', 'CasierPage'],
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('critical routes are mapped to real pages (no placeholder regression)', () => {
  for (const [routePath, component] of routeExpectations) {
    const expectedRoute = new RegExp(
      `<Route\\s+path="${escapeRegex(routePath)}"\\s+element=\\{<${component}\\s*/>\\}\\s*/>`,
      'm'
    );
    const placeholderRoute = new RegExp(
      `<Route\\s+path="${escapeRegex(routePath)}"\\s+element=\\{<PlaceholderPage\\s*/>\\}\\s*/>`,
      'm'
    );

    assert.match(
      appSource,
      expectedRoute,
      `route "${routePath}" should render ${component}`
    );
    assert.doesNotMatch(
      appSource,
      placeholderRoute,
      `route "${routePath}" must not point back to PlaceholderPage`
    );
  }
});

test('new route components are lazily imported', () => {
  const components = new Set(routeExpectations.map(([, component]) => component));

  for (const component of components) {
    const importPattern = new RegExp(
      `const\\s+${component}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\("\\./pages/${component}"\\)\\);`
    );
    assert.match(appSource, importPattern, `${component} lazy import missing`);
  }
});

test('sidebar keeps access to new homework entries', () => {
  assert.match(sidebarSource, /path:\s*'\/homework\/content'/, 'missing sidebar link for homework content');
  assert.match(sidebarSource, /path:\s*'\/homework\/exams'/, 'missing sidebar link for homework exams');
  assert.match(sidebarSource, /path:\s*'\/bulletins\/appreciations'/, 'missing sidebar link for bulletin appreciations');
  assert.match(sidebarSource, /path:\s*'\/competences\/bilans'/, 'missing sidebar link for competences bilans');
});

test('App no longer routes any feature page to PlaceholderPage', () => {
  assert.doesNotMatch(
    appSource,
    /<Route\s+path="(grades\/edit|grades\/appreciations|attendance\/sanctions|forums|progressions|programs|bulletins\/appreciations|bulletins\/archive|competences\/evaluations|competences\/bilans|results\/livret|results\/summary|meetings|casier)"\s+element=\{<PlaceholderPage\s*\/>\}\s*\/>/m,
    'a migrated route still points to PlaceholderPage'
  );
});
