// @ts-check
import { defineConfig, memoryCache } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { remarkCodeFilename } from './src/lib/remark/code-filename.ts';
import { remarkGithubEmbed } from './src/lib/remark/github-embed.ts';
import { remarkTweetEmbed } from './src/lib/remark/tweet-embed.ts';
import { remarkLinkCard } from './src/lib/remark/link-card.ts';
import { transformerFilename } from './src/lib/shiki/filename-transformer.ts';

const remarkPlugins = [remarkGfm, remarkBreaks, remarkGithubEmbed, remarkTweetEmbed, remarkLinkCard, remarkCodeFilename];
const useBundledDev = process.env.ASTRO_VITE_BUNDLED_DEV === '1';

// https://astro.build/config
export default defineConfig({
  site: 'https://sorafujitani.me',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/private/'),
    }),
  ],
  cache: {
    provider: memoryCache(),
  },
  routeRules: {
    '/blog/[...path]': { maxAge: 300, swr: 60 },
    '/private/[...path]': { maxAge: 300, swr: 60 },
  },
  vite: {
    css: {
      transformer: 'lightningcss',
    },
    ...(useBundledDev ? { experimental: { bundledDev: true } } : {}),
  },
  markdown: {
    processor: unified({
      remarkPlugins,
    }),
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
