import fs from 'node:fs';
import path from 'node:path';

describe('runtime environment visual contract', () => {
  it('defines non-production accent selectors and avoids production accent selector', () => {
    const cssPath = path.join(process.cwd(), 'src/app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain("body[data-runtime-env='development'] .runtime-chrome-navbar::before");
    expect(css).toContain("body[data-runtime-env='preview'] .runtime-chrome-navbar::before");
    expect(css).toContain("body[data-runtime-env='test'] .runtime-chrome-navbar::before");
    expect(css).not.toContain("body[data-runtime-env='production'] .runtime-chrome-navbar::before");
  });
});