/**
 * Tells IndexNow-enabled search engines (Bing, Yandex, Seznam, Naver; Bing's
 * index also feeds DuckDuckGo and ChatGPT search) that every URL in the live
 * sitemap has changed, so they recrawl now instead of whenever they next get
 * round to it. Google does not take part in IndexNow: for Google, submit the
 * sitemap in Search Console.
 *
 * Run after a deploy that changes public pages:
 *   npm run indexnow
 *
 * The key is not a secret. IndexNow proves ownership by fetching
 * https://logbook.fit/<key>.txt, which is public/<key>.txt, so that file must
 * be deployed before this runs. The key is read from that file's name rather
 * than repeated here, so there is one place to change it (and no key-shaped
 * literal for the secrets scan to flag).
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../src/lib/seo';

const KEY = readdirSync(path.resolve(__dirname, '../public'))
  .find((name) => /^[0-9a-f]{32}\.txt$/.test(name))
  ?.slice(0, -'.txt'.length);

async function main() {
  if (!KEY) throw new Error('No IndexNow key file (public/<32 hex chars>.txt) found.');

  const sitemap = await fetch(`${SITE_URL}/sitemap.xml`);
  if (!sitemap.ok) throw new Error(`sitemap.xml returned ${sitemap.status}`);
  const urlList = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urlList.length === 0) throw new Error('sitemap.xml lists no URLs');

  const keyFile = await fetch(`${SITE_URL}/${KEY}.txt`);
  if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
    throw new Error(`${SITE_URL}/${KEY}.txt is not live yet. Deploy public/${KEY}.txt first.`);
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList,
    }),
  });
  // 200 and 202 both mean accepted (202: key validation still pending).
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow returned ${res.status}: ${await res.text()}`);
  }
  console.log(`IndexNow accepted ${urlList.length} URLs (HTTP ${res.status}):`);
  for (const url of urlList) console.log(`  ${url}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
