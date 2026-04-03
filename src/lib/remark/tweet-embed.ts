import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Paragraph, Html } from 'mdast';

const TWEET_URL_RE =
  /^https:\/\/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/;

export const remarkTweetEmbed: Plugin<[], Root> = () => {
  return (tree) => {
    const replacements: { parent: any; index: number; html: string }[] = [];

    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.children.length !== 1) return;

      const child = node.children[0];
      let url: string | null = null;

      if (child.type === 'link' && TWEET_URL_RE.test(child.url)) {
        url = child.url;
      } else if (child.type === 'text' && TWEET_URL_RE.test(child.value.trim())) {
        url = child.value.trim();
      }

      if (!url) return;

      const html = [
        '<div class="tweet-embed">',
        '  <blockquote class="twitter-tweet" data-dnt="true">',
        `    <a href="${url}">Loading tweet...</a>`,
        '  </blockquote>',
        '</div>',
      ].join('\n');

      replacements.push({ parent, index, html });
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, html } = replacements[i];
      parent.children.splice(index, 1, { type: 'html', value: html } as Html);
    }
  };
};
