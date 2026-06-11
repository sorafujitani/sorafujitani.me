import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Paragraph, Html, PhrasingContent, RootContent } from 'mdast';

const TWEET_URL_RE =
  /^https:\/\/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/;

function getTweetUrl(child: PhrasingContent): string | null {
  if (child.type === 'link' && TWEET_URL_RE.test(child.url)) {
    return child.url;
  }
  if (child.type === 'text' && TWEET_URL_RE.test(child.value.trim())) {
    return child.value.trim();
  }
  return null;
}

function buildEmbedHtml(url: string): string {
  return [
    '<div class="tweet-embed">',
    '  <blockquote class="twitter-tweet" data-dnt="true">',
    `    <a href="${url}">Loading tweet...</a>`,
    '  </blockquote>',
    '</div>',
  ].join('\n');
}

export const remarkTweetEmbed: Plugin<[], Root> = () => {
  return (tree) => {
    const replacements: { parent: any; index: number; nodes: RootContent[] }[] = [];

    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || index === undefined) return;

      const lines: PhrasingContent[][] = [[]];
      for (const child of node.children) {
        if (child.type === 'break') {
          lines.push([]);
        } else {
          lines[lines.length - 1].push(child);
        }
      }

      const hasTweet = lines.some(
        (line) => line.length === 1 && getTweetUrl(line[0]) !== null,
      );
      if (!hasTweet) return;

      const newNodes: RootContent[] = [];
      for (const line of lines) {
        if (line.length === 0) continue;
        if (line.length === 1) {
          const url = getTweetUrl(line[0]);
          if (url) {
            newNodes.push({ type: 'html', value: buildEmbedHtml(url) } as Html);
            continue;
          }
        }
        newNodes.push({ type: 'paragraph', children: line } as Paragraph);
      }

      replacements.push({ parent, index, nodes: newNodes });
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, nodes } = replacements[i];
      parent.children.splice(index, 1, ...nodes);
    }
  };
};
