import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Paragraph, Code, Html } from 'mdast';

const GITHUB_PERMALINK_RE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([a-f0-9]+)\/(.+?)#L(\d+)(?:-L(\d+))?$/;

const EXT_TO_LANG: Record<string, string> = {
  '.rs': 'rust',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.py': 'python',
  '.go': 'go',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.rb': 'ruby',
  '.sh': 'bash',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.css': 'css',
  '.html': 'html',
  '.sql': 'sql',
  '.swift': 'swift',
  '.kt': 'kotlin',
};

function getLang(filePath: string): string {
  const ext = filePath.match(/\.[^.]+$/)?.[0] || '';
  return EXT_TO_LANG[ext] || '';
}

function dedent(lines: string[]): string[] {
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  if (nonEmptyLines.length === 0) return lines;
  const minIndent = Math.min(
    ...nonEmptyLines.map((l) => l.match(/^(\s*)/)?.[1].length ?? 0),
  );
  if (minIndent === 0) return lines;
  return lines.map((l) => l.slice(minIndent));
}

interface Replacement {
  parent: { children: Array<unknown> };
  index: number;
  nodes: Array<Html | Code>;
  fetch: () => Promise<void>;
}

export const remarkGithubEmbed: Plugin<[], Root> = () => {
  return async (tree) => {
    const replacements: Replacement[] = [];

    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.children.length !== 1) return;

      const child = node.children[0];
      let url: string | null = null;

      if (child.type === 'link' && GITHUB_PERMALINK_RE.test(child.url)) {
        url = child.url;
      } else if (child.type === 'text' && GITHUB_PERMALINK_RE.test(child.value.trim())) {
        url = child.value.trim();
      }

      if (!url) return;

      const match = url.match(GITHUB_PERMALINK_RE);
      if (!match) return;

      const [, owner, repo, commit, filePath, startStr, endStr] = match;
      const startLine = parseInt(startStr, 10);
      const endLine = endStr ? parseInt(endStr, 10) : startLine;

      const entry: Replacement = {
        parent: parent as { children: Array<unknown> },
        index,
        nodes: [],
        fetch: async () => {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${filePath}`;
            const res = await globalThis.fetch(rawUrl);
            if (!res.ok) return;

            const content = await res.text();
            const lines = content.split('\n');
            const codeLines = dedent(lines.slice(startLine - 1, endLine));
            const lang = getLang(filePath);
            const shortCommit = commit.slice(0, 7);

            const lineInfo =
              startLine === endLine
                ? `Line ${startLine} in ${shortCommit}`
                : `Lines ${startLine} to ${endLine} in ${shortCommit}`;

            const repoPath = `${owner}/${repo}/${filePath}`;

            const headerHtml = [
              '<div class="github-embed">',
              '<div class="github-embed-header">',
              '<svg class="github-embed-icon" viewBox="0 0 16 16" width="20" height="20" fill="currentColor">',
              '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>',
              '</svg>',
              '<div class="github-embed-meta">',
              `<a href="${url}" target="_blank" rel="noopener noreferrer" class="github-embed-link">${repoPath}</a>`,
              `<span class="github-embed-line-info">${lineInfo}</span>`,
              '</div>',
              '</div>',
            ].join('');

            entry.nodes = [
              { type: 'html', value: headerHtml } as Html,
              { type: 'code', lang, meta: null, value: codeLines.join('\n') } as Code,
              { type: 'html', value: '</div>' } as Html,
            ];
          } catch {
            // fetch failed: leave the URL as-is
          }
        },
      };

      replacements.push(entry);
    });

    await Promise.all(replacements.map((r) => r.fetch()));

    // Apply replacements in reverse order to preserve indices
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, nodes } = replacements[i];
      if (nodes.length > 0) {
        parent.children.splice(index, 1, ...nodes);
      }
    }
  };
};
