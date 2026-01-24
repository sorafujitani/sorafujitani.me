import type { ShikiTransformer } from 'shiki';

export const transformerFilename = (): ShikiTransformer => ({
  name: 'transformer-filename',
  preprocess(code, options) {
    const meta = options.meta?.__raw || '';
    const match = meta.match(/filename="([^"]+)"/);
    if (match) {
      (this as { filename?: string }).filename = match[1];
    }
    return code;
  },
  pre(node) {
    const filename = (this as { filename?: string }).filename;
    if (filename) {
      node.properties['data-filename'] = filename;
    }
  },
});
