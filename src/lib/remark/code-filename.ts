import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Code, Root } from 'mdast';

export const remarkCodeFilename: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node: Code) => {
      if (node.lang && node.lang.includes(':')) {
        const parts = node.lang.split(':');
        node.lang = parts[0];
        node.meta = (node.meta || '') + ` filename="${parts.slice(1).join(':')}"`;
      }
    });
  };
};
