import { getCollection } from 'astro:content';

export async function getPublishedPosts() {
  const posts = await getCollection('blog');
  return posts
    .filter(post => !post.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}
