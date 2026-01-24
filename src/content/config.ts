import { defineCollection, z } from 'astro:content';

const aboutCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string().default('Sora Fujitani'),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const talksCollection = defineCollection({
  type: 'content',
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
