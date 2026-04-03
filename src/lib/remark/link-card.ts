import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Paragraph, Html } from 'mdast';
import ogs from 'open-graph-scraper';

const URL_RE = /^https?:\/\/.+/;

// URLs handled by other remark plugins
const GITHUB_PERMALINK_RE =
  /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]+\/.+#L\d+/;
const TWEET_URL_RE =
  /^https:\/\/(?:x\.com|twitter\.com)\/[^/]+\/status\/\d+/;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Replacement {
  parent: any;
  index: number;
  url: string;
  html: string;
  fetch: () => Promise<void>;
}

export const remarkLinkCard: Plugin<[], Root> = () => {
  return async (tree) => {
    const replacements: Replacement[] = [];

    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.children.length !== 1) return;

      const child = node.children[0];
      let url: string | null = null;

      if (child.type === 'link' && URL_RE.test(child.url)) {
        url = child.url;
      } else if (child.type === 'text' && URL_RE.test(child.value.trim())) {
        url = child.value.trim();
      }

      if (!url) return;
      if (GITHUB_PERMALINK_RE.test(url)) return;
      if (TWEET_URL_RE.test(url)) return;

      const entry: Replacement = {
        parent,
        index,
        url,
        html: '',
        fetch: async () => {
          let title = url!;
          let description = '';
          let image = '';
          let siteName = '';

          try {
            const hostname = new URL(url!).hostname;
            siteName = hostname;

            const { result } = await ogs({ url: url! });
            if (result.success) {
              title = result.ogTitle || result.twitterTitle || url!;
              description = result.ogDescription || result.twitterDescription || '';
              image = result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || '';
              siteName = result.ogSiteName || hostname;
            }
          } catch {
            try {
              siteName = new URL(url!).hostname;
            } catch {
              // ignore
            }
          }

          const imageHtml = image
            ? `<div class="link-card-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" /></div>`
            : '';

          const descriptionHtml = description
            ? `<p class="link-card-description">${escapeHtml(description)}</p>`
            : '';

          entry.html = [
            `<a href="${escapeHtml(url!)}" target="_blank" rel="noopener noreferrer" class="link-card">`,
            '<div class="link-card-content">',
            '<div class="link-card-text">',
            `<p class="link-card-title">${escapeHtml(title)}</p>`,
            descriptionHtml,
            `<p class="link-card-url">${escapeHtml(siteName)}</p>`,
            '</div>',
            imageHtml,
            '</div>',
            '</a>',
          ].join('');
        },
      };

      replacements.push(entry);
    });

    await Promise.all(replacements.map((r) => r.fetch()));

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, html } = replacements[i];
      if (html) {
        parent.children.splice(index, 1, { type: 'html', value: html } as Html);
      }
    }
  };
};
