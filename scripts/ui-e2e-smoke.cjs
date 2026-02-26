const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { setTimeout: sleep } = require('node:timers/promises');
const path = require('node:path');

const BASE_URL = 'http://127.0.0.1:4173';
const DEV_PORT = 4173;
const SERVER_BOOT_TIMEOUT_MS = 30_000;

function resolveBrowserPath() {
  const envPath = process.env.PW_CHROMIUM_PATH || process.env.CHROME_BIN;
  if (envPath) return envPath;

  const candidates = [
    'google-chrome',
    'google-chrome-stable',
    'chromium-browser',
    'chromium',
  ];

  for (const bin of candidates) {
    const probe = spawnSync('bash', ['-lc', `command -v ${bin}`], { encoding: 'utf8' });
    if (probe.status === 0) {
      const path = probe.stdout.trim();
      if (path) return path;
    }
  }
  return null;
}

async function waitForServer(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await sleep(400);
  }
  throw new Error(`Timeout: dev server not ready after ${timeoutMs}ms`);
}

function startDevServer() {
  const viteBin = path.resolve(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js');
  return spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(DEV_PORT), '--strictPort'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1' },
    }
  );
}

function buildMockPayloads() {
  const now = new Date();
  const lessonStart = new Date(now);
  lessonStart.setHours(9, 0, 0, 0);
  const lessonEnd = new Date(now);
  lessonEnd.setHours(10, 0, 0, 0);

  return {
    periods: [
      {
        id: 'T1',
        name: 'Trimestre 1',
        start: '2025-09-01',
        end: '2025-12-20',
      },
    ],
    timetable: [
      {
        id: 'l1',
        subject: { id: 'math', name: 'Mathématiques', groups: false },
        teacher_name: 'Mme Durand',
        teacher_names: ['Mme Durand'],
        classroom: '207',
        classrooms: ['207'],
        start: lessonStart.toISOString(),
        end: lessonEnd.toISOString(),
        is_cancelled: false,
        is_outing: false,
        is_detention: false,
        is_exempted: false,
        background_color: '#3b82f6',
        status: null,
        group_name: '3A',
        group_names: ['3A'],
        memo: '',
      },
    ],
    homework: [
      {
        id: 'h1',
        subject: { id: 'math', name: 'Mathématiques', groups: false },
        description: 'Exercices 1 à 5 page 42',
        done: false,
        date: now.toISOString(),
        files: [],
      },
    ],
    discussions: [
      {
        id: 'd1',
        subject: 'Forum de classe',
        creator: 'Administration',
        unread: true,
        date: now.toISOString(),
        participants: ['Direction'],
        messages: [
          {
            id: 'm1',
            author: 'Administration',
            content: 'Bienvenue sur l’espace de discussion.',
            date: now.toISOString(),
            seen: false,
          },
        ],
      },
    ],
    informations: [
      {
        id: 'i1',
        title: 'Information test',
        author: 'Vie scolaire',
        content: 'Message d’information.',
        date: now.toISOString(),
        read: false,
        category: 'Général',
      },
    ],
    grades: [
      {
        id: 'g1',
        grade: '15',
        out_of: '20',
        default_out_of: '20',
        date: now.toISOString(),
        subject: { id: 'math', name: 'Mathématiques', groups: false },
        period: {
          id: 'T1',
          name: 'Trimestre 1',
          start: '2025-09-01',
          end: '2025-12-20',
        },
        average: '13',
        max: '18',
        min: '6',
        coefficient: '1',
        comment: 'Bon devoir',
        is_bonus: false,
        is_optionnal: false,
        is_out_of_20: true,
      },
    ],
    averages: [
      {
        student: '15.0',
        class_average: '12.4',
        max: '18',
        min: '6',
        out_of: '20',
        default_out_of: '20',
        subject: { id: 'math', name: 'Mathématiques', groups: false },
        background_color: '#3b82f6',
      },
    ],
  };
}

async function installApiMocks(page) {
  const payloads = buildMockPayloads();
  let config = {
    api_port: 5174,
    check_updates: true,
    theme: 'light',
    notifications_enabled: true,
    pronote_url: '',
    language: 'fr',
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    const ok = (body) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(body),
      });

    if (path.endsWith('/api/login') && method === 'POST') {
      return ok({
        success: true,
        client_info: {
          name: 'Professeur Demo',
          establishment: 'Collège de test',
          class_name: '3A',
          profile_picture_url: null,
        },
      });
    }

    if (path.endsWith('/api/health')) return ok({ status: 'ok', version: '1.7.11' });
    if (path.endsWith('/api/timetable')) return ok(payloads.timetable);
    if (path.endsWith('/api/homework') && method === 'GET') return ok(payloads.homework);
    if (/\/api\/homework\/.+\/done$/.test(path) && method === 'PATCH') return ok({ updated: true });
    if (path.endsWith('/api/discussions') && method === 'GET') return ok(payloads.discussions);
    if (/\/api\/discussions\/.+\/reply$/.test(path) && method === 'POST') return ok({ replied: true });
    if (/\/api\/discussions\/.+\/status$/.test(path) && method === 'PATCH') return ok({ updated: true });
    if (/\/api\/discussions\/.+$/.test(path) && method === 'DELETE') return ok({ deleted: true });
    if (path.endsWith('/api/discussions/new') && method === 'POST') return ok({ created: true });
    if (path.endsWith('/api/informations')) return ok(payloads.informations);
    if (path.endsWith('/api/periods')) return ok(payloads.periods);
    if (path.endsWith('/api/grades')) return ok(payloads.grades);
    if (path.endsWith('/api/averages')) return ok(payloads.averages);
    if (path.endsWith('/api/absences')) return ok([]);
    if (path.endsWith('/api/delays')) return ok([]);
    if (path.endsWith('/api/recipients')) return ok([]);
    if (path.endsWith('/api/menus')) return ok([]);
    if (/\/api\/lessons\/.+\/content$/.test(path)) return ok({ content: 'Contenu du cours de test' });

    if (path.endsWith('/api/config')) {
      if (method === 'GET') return ok(config);
      if (method === 'PATCH') {
        try {
          const payload = request.postDataJSON();
          config = { ...config, ...payload };
        } catch {
          // ignore malformed payload in tests
        }
        return ok(config);
      }
    }

    return ok({});
  });
}

async function assertHeadingVisible(page, headingRegex) {
  await page.getByRole('heading', { name: headingRegex }).first().waitFor({ state: 'visible', timeout: 10_000 });
}

async function ensureSidebarLinkVisible(page, sectionRegex, linkRegex) {
  const link = page.getByRole('link', { name: linkRegex }).first();
  if (await link.isVisible().catch(() => false)) {
    return link;
  }
  await page.getByRole('button', { name: sectionRegex }).first().click();
  await link.waitFor({ state: 'visible', timeout: 10_000 });
  return link;
}

async function fillLoginForm(page) {
  await page.locator('input[type="url"]').first().fill('https://demo.index-education.net/pronote/professeur.html');
  await page.locator('input[type="text"]').first().fill('demonstration');
  await page.locator('input[type="password"], input[type="text"]').nth(1).fill('pronotevs');
}

async function run() {
  const browserPath = resolveBrowserPath();
  if (!browserPath) {
    throw new Error(
      'Aucun navigateur Chromium trouvé. Définissez PW_CHROMIUM_PATH/CHROME_BIN pour exécuter test:e2e:ui.'
    );
  }

  const server = startDevServer();
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});

  try {
    await waitForServer(`${BASE_URL}/login`, SERVER_BOOT_TIMEOUT_MS);

    const { chromium } = require('playwright-core');
    const browser = await chromium.launch({
      headless: true,
      executablePath: browserPath,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await installApiMocks(page);

      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await assertHeadingVisible(page, /PRONOTE/i);
      await page.waitForSelector('form', { state: 'visible', timeout: 10_000 });

      await fillLoginForm(page);
      await page.getByRole('button', { name: /Se connecter/i }).click();

      await page.waitForURL(/\/dashboard$/, { timeout: 10_000 });
      await assertHeadingVisible(page, /Bonjour/i);

      await page.getByRole('link', { name: /Cours aujourd'hui/i }).click();
      await page.waitForURL(/\/timetable$/, { timeout: 10_000 });
      await assertHeadingVisible(page, /Emploi du temps/i);

      const homeworkLink = await ensureSidebarLinkVisible(page, /Cahier de textes/i, /Travail à faire/i);
      await homeworkLink.click();
      await page.waitForURL(/\/homework$/, { timeout: 10_000 });
      await assertHeadingVisible(page, /Cahier de textes/i);

      const discussionsLink = await ensureSidebarLinkVisible(page, /Communication/i, /Discussions/i);
      await discussionsLink.click();
      await page.waitForURL(/\/messaging$/, { timeout: 10_000 });
      await assertHeadingVisible(page, /Messagerie/i);

      await page.getByRole('link', { name: /Paramètres/i }).click();
      await page.waitForURL(/\/settings$/, { timeout: 10_000 });
      await assertHeadingVisible(page, /Paramètres/i);

      const casierLink = await ensureSidebarLinkVisible(page, /Communication/i, /Casier numérique/i);
      await casierLink.click();
      await page.waitForURL(/\/casier$/, { timeout: 10_000 });
      await assertHeadingVisible(page, /Casier numérique/i);

      const storedCreds = await page.evaluate(() => localStorage.getItem('pronote_credentials'));
      assert.ok(storedCreds, 'pronote_credentials should be stored after login');

      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), sleep(3000)]);
    if (!server.killed) server.kill('SIGKILL');
  }
}

run().catch((error) => {
  console.error('[ui-e2e-smoke] FAILED:', error);
  process.exitCode = 1;
});
