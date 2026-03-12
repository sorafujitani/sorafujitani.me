import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const aboutCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/about' }),
  schema: z.object({
    title: z.string(),
  }),
});

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string().default('Sora Fujitani'),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
    externalUrl: z.string().url().optional(),
  }),
});

const talksCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/talks' }),
  schema: z.object({
    title: z.string(),
    event: z.string().optional(),
    date: z.date(),
    slide: z.string().optional(),
    video: z.string().optional(),
    thumbnail: z.string().optional(),
  }),
});

export const collections = {
  about: aboutCollection,
  blog: blogCollection,
  talks: talksCollection,
};
