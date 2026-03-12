// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import { remarkCodeFilename } from './src/lib/remark/code-filename.ts';
import { transformerFilename } from './src/lib/shiki/filename-transformer.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://sorafujitani.me',
  fonts: [
    {
      name: 'Fredoka',
      cssVariable: '--font-fredoka',
      provider: fontProviders.google(),
      weights: [500, 600],
      styles: ['normal'],
    },
  ],
  experimental: {
    queuedRendering: { enabled: true },
    rustCompiler: true,
  },
  integrations: [
    mdx({
      remarkPlugins: [remarkGfm, remarkCodeFilename],
    }),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [remarkGfm, remarkCodeFilename],
    shikiConfig: {
      theme: {
        name: 'custom-cyan-white-theme',
        type: 'dark',
        colors: {
          'editor.background': '#0d1117',
          'editor.foreground': '#e6edf3',
        },
        tokenColors: [
          {
            scope: ['comment', 'punctuation.definition.comment'],
            settings: {
              foreground: '#8b949e',
              fontStyle: 'italic',
            },
          },
          {
            scope: ['source.shell', 'text.shell'],
            settings: {
              foreground: '#e6edf3',
            },
          },
          {
            scope: [
              'keyword',
              'storage.type',
              'storage.modifier',
              'keyword.control',
              'keyword.operator.new',
            ],
            settings: {
              foreground: '#00d8ff',
              fontStyle: 'bold',
            },
          },
          {
            scope: ['source.shell keyword', 'source.shell support.function'],
            settings: {
              foreground: '#e6edf3',
              fontStyle: 'normal',
            },
          },
          {
            scope: ['entity.name.function', 'support.function'],
            settings: {
              foreground: '#79c0ff',
            },
          },
          {
            scope: ['string', 'string.quoted'],
            settings: {
              foreground: '#a5d6ff',
            },
          },
          {
            scope: ['constant.numeric', 'constant.language'],
            settings: {
              foreground: '#79c0ff',
            },
          },
          {
            scope: ['variable', 'variable.other'],
            settings: {
              foreground: '#e6edf3',
            },
          },
          {
            scope: ['entity.name.type', 'entity.name.class', 'support.class'],
            settings: {
              foreground: '#00d8ff',
            },
          },
          {
            scope: ['punctuation', 'meta.brace'],
            settings: {
              foreground: '#e6edf3',
            },
          },
          {
            scope: ['constant.other'],
            settings: {
              foreground: '#79c0ff',
            },
          },
        ],
      },
      wrap: true,
      transformers: [transformerFilename()],
    },
  },
});
