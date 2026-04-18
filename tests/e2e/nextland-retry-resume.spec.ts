import { expect, test } from '@playwright/test';
import { E2E_MODEL_NAME, E2E_PROJECT_ID, E2E_PROJECT_NAME, setupToolBaseMocks } from './helpers/tool-base-mocks';

test('supports extraction retry with backoff feedback and review transition', async ({ page }) => {
  await setupToolBaseMocks(page);
  await page.waitForLoadState('networkidle');

  await page.route('**/api/tools/nextland/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          text: 'Briefing di test per retry extraction NextLand',
        },
      }),
    });
  });

  let extractionAttempts = 0;
  await page.route('**/api/tools/extraction/generate', async (route) => {
    extractionAttempts += 1;

    if (extractionAttempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Errore temporaneo di upstream',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"token","token":"Contesto estratto con retry per NextLand"}\n\n',
    });
  });

  await page.goto(`/tools/nextland?projectId=${E2E_PROJECT_ID}`);
  await page.waitForSelector('h1:has-text("NextLand")', { timeout: 10000 });
  await expect(page.getByRole('button', { name: E2E_PROJECT_NAME })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completa dati obbligatori' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Modello LLM' })).toContainText(E2E_MODEL_NAME);

  await page.locator('#nextland-file-input').setInputFiles({
    name: 'briefing.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Contenuto documento per test retry NextLand', 'utf-8'),
  });

  await expect(page.getByText(/Estrazione: tentativo 2\/3/)).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Avvia generazione NextLand' })).toBeVisible();
  await expect(page.getByText('3. Estrazione')).toBeVisible();
  await expect(page.getByText('Estrazione pronta.')).toBeVisible();
});

test('runs the full landing to thank-you generation flow', async ({ page }) => {
  await setupToolBaseMocks(page);

  await page.route('**/api/tools/nextland/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          text: 'Briefing completo NextLand',
        },
      }),
    });
  });

  await page.route('**/api/tools/extraction/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"token","token":"Contesto estratto NextLand pronto per review"}\n\n',
    });
  });

  await page.route('**/api/tools/nextland/generate', async (route) => {
    const request = route.request();
    const payload = request.postDataJSON() as { step?: string };

    if (payload.step === 'landing') {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [
          'data: {"type":"start","artifactId":"artifact-landing-1"}',
          'data: {"type":"token","token":"## Landing\\n### Headline\\nLanding pronta"}',
          '',
        ].join('\n'),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        'data: {"type":"start","artifactId":"artifact-thankyou-1"}',
        'data: {"type":"token","token":"## Thank-you Page\\n### Confirmation Headline\\nGrazie, prossimo step pronto"}',
        '',
      ].join('\n'),
    });
  });

  await page.goto(`/tools/nextland?projectId=${E2E_PROJECT_ID}`);
  await page.waitForSelector('h1:has-text("NextLand")', { timeout: 10000 });
  await expect(page.getByRole('combobox', { name: 'Modello LLM' })).toContainText(E2E_MODEL_NAME);

  await page.locator('#nextland-file-input').setInputFiles({
    name: 'briefing-nextland.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Contenuto briefing per full flow NextLand', 'utf-8'),
  });

  await expect(page.getByRole('button', { name: 'Avvia generazione NextLand' })).toBeVisible();
  await page.getByRole('button', { name: 'Avvia generazione NextLand' }).click();

  await expect(page.getByText('Landing pronta')).toBeVisible();
  await expect(page.getByText('Grazie, prossimo step pronto')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apri ultimo artefatto' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rigenera NextLand' })).toBeVisible();
});

test('auto-resumes from artifact relaunch intent when checkpoint is available', async ({ page }) => {
  await setupToolBaseMocks(page);

  await page.route('**/api/artifacts?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'artifact-extraction-1',
            type: 'extraction',
            workflowType: 'extraction',
            status: 'completed',
            content: 'Contesto estratto da checkpoint NextLand',
            createdAt: '2026-04-14T10:00:00.000Z',
            input: {
              workflowType: 'extraction',
              terminalState: {
                completionOutcome: 'completed_partial',
              },
            },
          },
          {
            id: 'artifact-landing-1',
            type: 'content',
            workflowType: 'nextland',
            status: 'completed',
            content: 'Landing recuperata da checkpoint',
            createdAt: '2026-04-14T10:01:00.000Z',
            input: {
              workflowType: 'nextland',
              topic: 'nextland_landing',
            },
          },
          {
            id: 'artifact-thankyou-1',
            type: 'content',
            workflowType: 'nextland',
            status: 'generating',
            content: 'Thank-you in recupero',
            createdAt: '2026-04-14T10:02:00.000Z',
            input: {
              workflowType: 'nextland',
              topic: 'nextland_thank_you',
            },
          },
        ],
      }),
    });
  });

  await page.goto(`/tools/nextland?projectId=${E2E_PROJECT_ID}&sourceArtifactId=artifact-source-1&intent=resume`);
  await page.waitForSelector('h1:has-text("NextLand")', { timeout: 10000 });

  await expect(page.getByText('Checkpoint recuperato. Puoi riprendere dalla fase attuale.')).toBeVisible();
  await expect(page.getByText('Landing recuperata da checkpoint')).toBeVisible();
  await expect(page.getByText('Thank-you in recupero')).toBeVisible();
  await expect(page.getByText('Estrazione pronta.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Riprendi dal checkpoint' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rigenera da zero' })).toBeVisible();
});

test('falls back to briefing upload when resume has recovered steps but no extraction context', async ({ page }) => {
  await setupToolBaseMocks(page);

  await page.route('**/api/artifacts?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'artifact-landing-2',
            type: 'content',
            workflowType: 'nextland',
            status: 'completed',
            content: 'Landing recuperata senza extraction context',
            createdAt: '2026-04-14T10:01:00.000Z',
            input: {
              workflowType: 'nextland',
              topic: 'nextland_landing',
            },
          },
        ],
      }),
    });
  });

  await page.goto(`/tools/nextland?projectId=${E2E_PROJECT_ID}`);
  await page.getByRole('button', { name: 'Riprendi da checkpoint' }).click();

  await expect(page.getByText('Checkpoint parziale recuperato, ma manca il contesto estratto per riprendere. Carica di nuovo il briefing per rigenerare NextLand.')).toBeVisible();
  await expect(page.getByText('Landing recuperata senza extraction context')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Carica nuovo briefing' })).toBeVisible();
});

test('uses regenerate primary action for artifact relaunch intent=regenerate', async ({ page }) => {
  await setupToolBaseMocks(page);

  await page.route('**/api/tools/nextland/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          text: 'Briefing artifact-first per flow rigenera NextLand',
        },
      }),
    });
  });

  await page.route('**/api/tools/extraction/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"token","token":"Contesto estratto per rigenerazione da artefatto NextLand"}\n\n',
    });
  });

  await page.goto(`/tools/nextland?projectId=${E2E_PROJECT_ID}&sourceArtifactId=artifact-source-2&intent=regenerate`);
  await page.waitForSelector('h1:has-text("NextLand")', { timeout: 10000 });
  await expect(page.getByRole('combobox', { name: 'Modello LLM' })).toContainText(E2E_MODEL_NAME);

  await page.locator('#nextland-file-input').setInputFiles({
    name: 'briefing-rigenera.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Contenuto briefing per intent rigenera NextLand', 'utf-8'),
  });

  await expect(page.getByText('Estrazione pronta.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rigenera ora' })).toBeVisible();
});