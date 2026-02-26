import { getCollection } from 'astro:content';

const ZENN_USERNAME = 'soramarjr';

interface ZennArticle {
  title: string;
  slug: string;
  published_at: string;
  path: string;
}

interface ZennResponse {
  articles: ZennArticle[];
  next_page: number | null;
}

export interface Post {
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    author?: string;
    tags?: string[];
    draft?: boolean;
    externalUrl?: string;
  };
  slug: string;
}

async function fetchZennArticles(): Promise<Post[]> {
  const articles: ZennArticle[] = [];
  let page = 1;

  try {
    while (true) {
      const res = await fetch(
        `https://zenn.dev/api/articles?username=${ZENN_USERNAME}&order=latest&page=${page}`
      );
      if (!res.ok) break;

      const data: ZennResponse = await res.json();
      articles.push(...data.articles);

      if (!data.next_page) break;
      page = data.next_page;
    }
  } catch {
    // API取得失敗時はZenn記事なしで続行
    console.warn('Failed to fetch Zenn articles');
  }

  return articles.map(article => ({
    data: {
      title: article.title,
      description: '',
      pubDate: new Date(article.published_at),
      externalUrl: `https://zenn.dev${article.path}`,
    },
    slug: `zenn-${article.slug}`,
  }));
}

export async function getPublishedPosts(): Promise<Post[]> {
  const localPosts = await getCollection('blog');
  const zennPosts = await fetchZennArticles();

  const posts: Post[] = [
    ...localPosts
      .filter(post => !post.data.draft)
      .map(post => ({
        data: {
          title: post.data.title,
          description: post.data.description,
          pubDate: post.data.pubDate,
          updatedDate: post.data.updatedDate,
          author: post.data.author,
          tags: post.data.tags,
          draft: post.data.draft,
          externalUrl: post.data.externalUrl,
        },
        slug: post.slug,
      })),
    ...zennPosts,
  ];

  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}
