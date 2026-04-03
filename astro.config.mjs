// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { remarkCodeFilename } from './src/lib/remark/code-filename.ts';
import { transformerFilename } from './src/lib/shiki/filename-transformer.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://sorafujitani.me',
  integrations: [
    mdx({
      remarkPlugins: [remarkGfm, remarkBreaks, remarkCodeFilename],
    }),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [remarkGfm, remarkBreaks, remarkCodeFilename],
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
