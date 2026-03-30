import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

async function scrape() {
  const url = 'https://www.spc.noaa.gov/exper/mesoanalysis/new/viewsector.php';
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  });
  await context.addInitScript(() => {
    // hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  const page = await context.newPage();

  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // (no debug)

  const categories = await page.evaluate(() => {
    const result: [string, [string, string][]][] = [];

    // The site uses category anchors that call mopen('id') onmouseover and the submenu is in a <div id="id">.
    // Find all anchors with mopen(...) and collect anchors inside the referenced div.
    const catAnchors = Array.from(document.querySelectorAll('a[onmouseover]'));
    for (const a of catAnchors) {
      const on = a.getAttribute('onmouseover') || '';
      const m = on.match(/mopen\(['"]([^'"]+)['"]\)/);
      if (!m) continue;
      const id = m[1];
      const submenu = document.getElementById(id);
      if (!submenu) continue;
      const params: [string, string][] = [];
      const anchors = Array.from(submenu.querySelectorAll('a'));
      for (const aa of anchors) {
        const onclick = aa.getAttribute('onclick') || '';
        const outer = aa.outerHTML || '';
        const mm = onclick.match(/showimage\s*\(\s*['"]([^'\"]+)['\"]/i) || outer.match(/showimage\s*\(\s*['"]([^'\"]+)['\"]/i);
        if (!mm) continue;
        params.push([mm[1], (aa.textContent || '').replace(/\u00A0/g, ' ').trim()]);
      }
      const categoryName = (a.textContent || '').replace(/\u00A0/g, ' ').trim();
      if (params.length) result.push([categoryName, params]);
    }

    // If nothing found, fallback to scanning all anchors (preserve previous behavior)
    if (result.length === 0) {
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const a of anchors) {
        const onclick = a.getAttribute('onclick') || '';
        const outer = a.outerHTML || '';
        const m = onclick.match(/showimage\s*\(\s*['"]([^'\"]+)['\"]/i) || outer.match(/showimage\s*\(\s*['"]([^'\"]+)['\"]/i);
        if (!m) continue;
        const parameter = m[1];
        const parameterName = (a.textContent || '').replace(/\u00A0/g, ' ').trim();

        let categoryName = 'Unknown';
        const innerUl = a.closest('ul');
        if (innerUl) {
          const categoryLi = innerUl.closest('li');
          if (categoryLi) {
            const catA = categoryLi.querySelector('a');
            if (catA) categoryName = (catA.textContent || '').replace(/\u00A0/g, ' ').trim();
          }
        }

        let cat = result.find(([name]) => name === categoryName);
        if (!cat) {
          cat = [categoryName, []];
          result.push(cat);
        }
        cat[1].push([parameter, parameterName]);
      }
    }

    return result;
  });

  await browser.close();
  return categories;
}

async function main() {
  try {
    const categories = await scrape();
    const outDir = path.resolve(process.cwd(), 'src', 'generated');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, 'spcMesoanalysis.json');
    await fs.writeFile(outPath, JSON.stringify(categories, null, 2), 'utf8');
    console.log('Wrote', outPath);
  } catch (err) {
    console.error('Error during scrape:', err);
    process.exit(1);
  }
}

main();
