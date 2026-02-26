import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog');
  const sortedPosts = posts
    .filter(post => !post.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'Sora Fujitani Blog',
    description: 'sora fujitani portfolio site',
    site: context.site || 'https://sorafujitani.me',
    items: sortedPosts.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: post.data.externalUrl || `/blog/${post.slug}/`,
    })),
    customData: `<language>ja</language>`,
  });
}
