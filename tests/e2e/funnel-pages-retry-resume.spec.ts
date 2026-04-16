import { expect, test, type Page } from '@playwright/test';

async function setupFunnelBaseMocks(page: Page): Promise<void> {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'user-e2e', role: 'user' } }),
    });
  });

  await page.route('**/api/projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [{ id: 'project-e2e-1', name: 'Project E2E' }],
      }),
    });
  });

  await page.route('**/api/models', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        models: [{ id: 'model-e2e-1', name: 'Model E2E', default: true }],
      }),
    });
  });
}

test('supports extraction retry with backoff feedback and review transition', async ({ page }) => {
  await setupFunnelBaseMocks(page);

  await page.route('**/api/tools/funnel-pages/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          text: 'Briefing di test per retry extraction',
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
      body: 'data: {"type":"token","token":"Contesto estratto con retry"}\n\n',
    });
  });

  await page.goto('/tools/funnel-pages?projectId=project-e2e-1');
  await expect(page.getByText('Project E2E')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completa dati obbligatori' })).toBeVisible();

  await page.locator('#funnel-file-input').setInputFiles({
    name: 'briefing.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Contenuto documento per test retry/resume', 'utf-8'),
  });

  await expect(page.getByText(/Estrazione: tentativo 2\/3/)).toBeVisible();
  await expect(page.getByText('Contesto estratto con retry')).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Avvia generazione funnel' })).toBeVisible();
  await expect(page.getByText('Estrazione completa')).toBeVisible();
});

test('auto-resumes from artifact relaunch intent when checkpoint is available', async ({ page }) => {
  await setupFunnelBaseMocks(page);

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
            content: 'Contesto estratto da checkpoint',
            createdAt: '2026-04-14T10:00:00.000Z',
            input: {
              workflowType: 'extraction',
              terminalState: {
                completionOutcome: 'completed_partial',
              },
            },
          },
          {
            id: 'artifact-optin-1',
            type: 'content',
            workflowType: 'funnel_pages',
            status: 'completed',
            content: 'Optin recuperata da checkpoint',
            createdAt: '2026-04-14T10:01:00.000Z',
            input: {
              workflowType: 'funnel_pages',
              topic: 'funnel_optin',
            },
          },
          {
            id: 'artifact-quiz-1',
            type: 'content',
            workflowType: 'funnel_pages',
            status: 'generating',
            content: 'Quiz in recupero',
            createdAt: '2026-04-14T10:02:00.000Z',
            input: {
              workflowType: 'funnel_pages',
              topic: 'funnel_quiz',
            },
          },
        ],
      }),
    });
  });

  await page.goto('/tools/funnel-pages?projectId=project-e2e-1&sourceArtifactId=artifact-source-1&intent=resume');
  await expect(page.getByText('Project E2E')).toBeVisible();

  await expect(page.getByText('Checkpoint recuperato. Puoi riprendere dalla fase attuale.')).toBeVisible();
  await expect(page.getByText('Optin recuperata da checkpoint')).toBeVisible();
  await expect(page.getByText('Quiz in recupero')).toBeVisible();
  await expect(page.getByText('Estrazione parziale')).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Riprendi dal checkpoint' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rigenera da zero' })).toBeVisible();
});

test('falls back to briefing upload when resume has recovered steps but no extraction context', async ({ page }) => {
  await setupFunnelBaseMocks(page);

  await page.route('**/api/artifacts?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'artifact-optin-2',
            type: 'content',
            workflowType: 'funnel_pages',
            status: 'completed',
            content: 'Optin recuperata senza extraction context',
            createdAt: '2026-04-14T10:01:00.000Z',
            input: {
              workflowType: 'funnel_pages',
              topic: 'funnel_optin',
            },
          },
        ],
      }),
    });
  });

  await page.goto('/tools/funnel-pages?projectId=project-e2e-1');
  await page.getByRole('button', { name: 'Riprendi da checkpoint' }).click();

  await expect(page.getByText('Checkpoint parziale recuperato, ma manca il contesto estratto per riprendere. Carica di nuovo il briefing per rigenerare il funnel.')).toBeVisible();
  await expect(page.getByText('Optin recuperata senza extraction context')).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Carica nuovo briefing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Riprendi da checkpoint' })).toBeVisible();
});

test('uses regenerate primary action for artifact relaunch intent=regenerate', async ({ page }) => {
  await setupFunnelBaseMocks(page);

  await page.route('**/api/tools/funnel-pages/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          text: 'Briefing artifact-first per flow rigenera',
        },
      }),
    });
  });

  await page.route('**/api/tools/extraction/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"token","token":"Contesto estratto per rigenerazione da artefatto"}\n\n',
    });
  });

  await page.goto('/tools/funnel-pages?projectId=project-e2e-1&sourceArtifactId=artifact-source-2&intent=regenerate');
  await expect(page.getByText('Project E2E')).toBeVisible();

  await page.locator('#funnel-file-input').setInputFiles({
    name: 'briefing-rigenera.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Contenuto briefing per intent rigenera', 'utf-8'),
  });

  await expect(page.getByText('Contesto estratto per rigenerazione da artefatto')).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Rigenera ora' })).toBeVisible();
});
