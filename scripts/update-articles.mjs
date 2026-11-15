import fs from 'node:fs/promises';
import path from 'node:path';

const BLOG_ORIGIN = 'https://blog.morningbunny.cloud';
const API_URL = `${BLOG_ORIGIN}/api/posts/available?limit=5`;
const START_MARKER = '<!-- BLOG-POST-LIST:START -->';
const END_MARKER = '<!-- BLOG-POST-LIST:END -->';

function formatPostList(posts, locale) {
  const urlPrefix = locale === 'zh-TW' ? 'zh' : 'en';

  return posts
    .map((post) => {
      const trans = post.translations?.[locale];
      const title = (trans?.title || post.title || 'Untitled').replace(/[\r\n]+/g, ' ').trim();
      const slug = post.slug || post.id;
      const date = post.createdAt ? post.createdAt.slice(0, 10) : '';
      const url = `${BLOG_ORIGIN}/${urlPrefix}/posts/${encodeURIComponent(slug)}`;
      return date ? `- [${title}](${url}) — \`${date}\`` : `- [${title}](${url})`;
    })
    .join('\n');
}

async function updateReadme(filePath, posts, locale) {
  const content = await fs.readFile(filePath, 'utf-8');
  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Markers not found in ${filePath}`);
  }

  const listMarkdown = formatPostList(posts, locale);
  const updated =
    content.slice(0, startIdx + START_MARKER.length) +
    '\n' +
    listMarkdown +
    '\n' +
    content.slice(endIdx);

  if (updated !== content) {
    await fs.writeFile(filePath, updated, 'utf-8');
    console.log(`Updated ${path.basename(filePath)}`);
  } else {
    console.log(`No changes in ${path.basename(filePath)}`);
  }
}

async function main() {
  const response = await fetch(API_URL, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const posts = Array.isArray(payload?.data) ? payload.data.slice(0, 5) : [];

  if (posts.length === 0) {
    console.log('No posts returned; skipping update.');
    return;
  }

  const rootDir = process.cwd();
  await updateReadme(path.join(rootDir, 'README.md'), posts, 'en');
  await updateReadme(path.join(rootDir, 'README.zh-TW.md'), posts, 'zh-TW');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
