import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const bunLifetimeInfographicHtml = readFileSync(new URL('../test.html', import.meta.url), 'utf8');
const bunLifetimeInfographicFooter = "This page is an interactive infographic analyzing oven-sh/bun's open-source workflow scripts.";

const pasteText = async (page: Page, text: string) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
  await page.locator('body').click({ position: { x: 10, y: 10 } });
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
};

const clearPreview = async (page: Page) => {
  await page.getByLabel('Clear').click();
  await expect(page.getByText('Preview Claude Artifacts instantly')).toBeVisible();
};

const waitForEsbuild = async (page: Page) => {
  await expect
    .poll(
      () => page.evaluate(() => Boolean((window as unknown as { esbuild?: unknown }).esbuild)),
      { timeout: 20_000 }
    )
    .toBe(true);
};

const expectNoCompilerError = async (page: Page, consoleErrors: string[]) => {
  await expect(page.getByText("Couldn't transform the code")).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Error' })).toHaveCount(0);
  expect(consoleErrors.filter((message) => (
    message.includes('ESBuild transformation error') ||
    message.includes("Couldn't transform the code") ||
    message.includes('Expected identifier but found "!"') ||
    message.includes('Expected "}" but found ":"')
  ))).toEqual([]);
};

const htmlDocuments = [
  {
    name: 'downloaded infographic style document with css variables',
    marker: "Bun's Lifetime Classifier Workflow",
    code: `<!doctype html>
<html lang="ja" data-theme="paper">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Bun's Lifetime Classifier Workflow</title>
<style>
:root{
--color-bg:#FFFFFF; --color-fg:#0D1B2A; --color-accent1:#0D1B2A; --color-accent2:#1B263B;
--grid-gap:30px; --grid-min:640px; --radius:15px; --card-pad:25px;
--shadow: 0 8px 24px rgba(0,0,0,.25); --shadow-soft: 0 2px 10px rgba(0,0,0,.15);
}
*{box-sizing:border-box}
body{margin:0;background:var(--color-bg);color:var(--color-fg);font:16px/1.6 system-ui}
.container{max-width:1200px;margin:0 auto;padding:28px}
.card{background:rgba(13,27,42,0.06);border-radius:var(--radius);padding:var(--card-pad)}
</style>
</head>
<body>
<main class="container">
<section class="card"><h1>Bun's Lifetime Classifier Workflow</h1></section>
</main>
</body>
</html>`,
  },
  {
    name: 'full html document with component-like script names',
    marker: 'Script Names Stay HTML',
    code: `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>Script Names Stay HTML</title>
<style>
:root{
--color-bg:#FFFFFF;
--shadow: 0 8px 24px rgba(0,0,0,.25);
}
body{background:var(--color-bg)}
</style>
<script>
const MyObjectStore = {
  theme: { color: "blue" }
};
</script>
</head>
<body><main><h1>Script Names Stay HTML</h1></main></body>
</html>`,
  },
  {
    name: 'bun lifetime infographic with tailwind config object',
    marker: 'LLM Orchestration Analysis',
    code: bunLifetimeInfographicHtml,
  },
  {
    name: 'commented html fragment',
    marker: 'LLM Orchestration Analysis',
    code: `<!-- Header Hero Banner -->
<header class="relative overflow-hidden border-b border-slate-200 bg-white">
  <div class="max-w-6xl mx-auto relative z-10">
    <span>LLM Orchestration Analysis</span>
  </div>
</header>`,
  },
  {
    name: 'html fragment with inline style tag',
    marker: 'Raw HTML Style OK',
    code: `<style>
:root { --brand: #0D1B2A; }
.hero { color: var(--brand); padding: 24px; }
</style>
<section class="hero"><h1>Raw HTML Style OK</h1></section>`,
  },
];

const reactComponents = [
  {
    name: 'component with leading html comment',
    heading: 'Comment OK',
    code: `<!-- Header Hero Banner -->
const MyObjectStore = () => <main><h1>Comment OK</h1></main>;
export default MyObjectStore;`,
  },
  {
    name: 'component with leading doctype',
    heading: 'Doctype OK',
    code: `<!DOCTYPE html>
const MyObjectStore = () => <main><h1>Doctype OK</h1></main>;
export default MyObjectStore;`,
  },
  {
    name: 'component with unclosed leading html comment',
    heading: 'Open Comment OK',
    code: `<!-- Header Hero Banner
const MyObjectStore = () => <main><h1>Open Comment OK</h1></main>;
export default MyObjectStore;`,
  },
  {
    name: 'component with raw html style content',
    heading: 'React Raw Style OK',
    code: `const MyObjectStore = () => (
  <main>
    <style>
      :root {
        --color-bg: #FFFFFF;
        --shadow: 0 8px 24px rgba(0,0,0,.25);
      }
      .panel { color: var(--color-bg); box-shadow: var(--shadow); }
    </style>
    <section className="panel"><h1>React Raw Style OK</h1></section>
  </main>
);
export default MyObjectStore;`,
  },
  {
    name: 'component with imports hooks and html comment',
    heading: 'Counter 1',
    code: `import { useState } from 'react';
<!-- Controls -->
const MyObjectStore = () => {
  const [count, setCount] = useState(1);
  return <button onClick={() => setCount(count + 1)}>Counter {count}</button>;
};
export default MyObjectStore;`,
  },
];

const markdownDocuments = [
  {
    name: 'standard markdown',
    heading: 'Markdown OK',
    code: `# Markdown OK

This is **rendered markdown**.

- one
- two`,
  },
  {
    name: 'markdown with mermaid fence',
    heading: 'Workflow',
    code: `# Workflow

\`\`\`mermaid
graph TD
  A[Start] --> B[Done]
\`\`\`

| Step | State |
| --- | --- |
| A | Done |`,
  },
];

test.describe('paste classification and rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Preview Claude Artifacts instantly')).toBeVisible();
  });

  for (const sample of htmlDocuments) {
    test(`renders HTML paste: ${sample.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await pasteText(page, sample.code);
      const frame = page.frameLocator('iframe[title="HTML Preview"]');
      await expect(frame.getByText(sample.marker)).toBeVisible();
      const bodyText = await frame.locator('body').innerText();
      expect(bodyText).not.toContain('<!doctype');
      expect(bodyText).not.toContain('<header');
      if (sample.name.includes('bun lifetime')) {
        await expect(frame.getByText(bunLifetimeInfographicFooter)).toBeVisible();
        await expect
          .poll(
            () => page.locator('iframe[title="HTML Preview"]').evaluate((iframe) => {
              const element = iframe as HTMLIFrameElement;
              return {
                iframeHeight: element.getBoundingClientRect().height,
                contentHeight: element.contentDocument?.documentElement.scrollHeight || 0,
              };
            }),
            { timeout: 5_000 }
          )
          .toEqual(expect.objectContaining({
            iframeHeight: expect.any(Number),
            contentHeight: expect.any(Number),
          }));
        const dimensions = await page.locator('iframe[title="HTML Preview"]').evaluate((iframe) => {
          const element = iframe as HTMLIFrameElement;
          return {
            iframeHeight: element.getBoundingClientRect().height,
            contentHeight: element.contentDocument?.documentElement.scrollHeight || 0,
          };
        });
        expect(dimensions.iframeHeight).toBeGreaterThanOrEqual(dimensions.contentHeight - 2);
        expect(dimensions.iframeHeight).toBeGreaterThan(2000);
      }
      await expectNoCompilerError(page, consoleErrors);
    });
  }

  test('downloads long HTML preview as an image without truncating the iframe', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const sample = htmlDocuments.find((item) => item.name.includes('bun lifetime'));
    expect(sample).toBeTruthy();
    await pasteText(page, sample!.code);

    const frame = page.frameLocator('iframe[title="HTML Preview"]');
    await expect(frame.getByText(bunLifetimeInfographicFooter)).toBeVisible();
    await page.waitForTimeout(3_000);

    const dimensions = await page.locator('iframe[title="HTML Preview"]').evaluate((iframe) => {
      const element = iframe as HTMLIFrameElement;
      return {
        iframeHeight: element.getBoundingClientRect().height,
        contentHeight: element.contentDocument?.documentElement.scrollHeight || 0,
      };
    });
    expect(dimensions.iframeHeight).toBeGreaterThanOrEqual(dimensions.contentHeight - 2);

    const downloadPromise = page.waitForEvent('download');
    const desktopButton = page.getByRole('button', { name: 'Save as Image' });
    if (await desktopButton.count()) {
      await desktopButton.click();
    } else {
      await page.getByLabel('画像保存').click();
    }
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('commandv-html-preview.png');
    expect(await download.failure()).toBeNull();
    await expectNoCompilerError(page, consoleErrors);
  });

  for (const sample of reactComponents) {
    test(`renders React paste: ${sample.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await waitForEsbuild(page);
      await pasteText(page, sample.code);
      await expect(page.getByText(sample.heading)).toBeVisible();
      await expectNoCompilerError(page, consoleErrors);
    });
  }

  for (const sample of markdownDocuments) {
    test(`renders Markdown paste: ${sample.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await pasteText(page, sample.code);
      await expect(page.getByText(sample.heading)).toBeVisible();
      await expectNoCompilerError(page, consoleErrors);
    });
  }

  test('survives a long mixed paste session without stale mode leakage', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await pasteText(page, htmlDocuments[0].code);
    await expect(page.frameLocator('iframe[title="HTML Preview"]').getByText(htmlDocuments[0].marker)).toBeVisible();
    await clearPreview(page);

    await waitForEsbuild(page);
    for (const sample of reactComponents) {
      await pasteText(page, sample.code);
      await expect(page.getByText(sample.heading)).toBeVisible();
      await clearPreview(page);
    }

    for (const sample of markdownDocuments) {
      await pasteText(page, sample.code);
      await expect(page.getByRole('heading', { name: sample.heading })).toBeVisible();
      await clearPreview(page);
    }

    await pasteText(page, htmlDocuments[1].code);
    await expect(page.frameLocator('iframe[title="HTML Preview"]').getByText(htmlDocuments[1].marker)).toBeVisible();
    await expectNoCompilerError(page, consoleErrors);
  });
});
