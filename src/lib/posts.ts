import { getCollection } from 'astro:content';

const ZENN_USERNAME = 'soramarjr';
const NOTE_USERNAME = 'sorafujitani';

// 外部API向けの保護: 個人スケールでも全ページから呼ばれるとビルド毎に数十回叩くため
// モジュールレベルでビルド全体を1回に圧縮する
const FETCH_TIMEOUT_MS = 10_000;
const MAX_PAGES = 50;

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

interface NoteArticle {
  name: string;
  key: string;
  status: string;
  publishAt: string;
  description: string | null;
  noteUrl: string;
}

interface NoteResponse {
  data: {
    contents: NoteArticle[];
    isLastPage: boolean;
    totalCount: number;
  };
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
    pinned?: boolean;
    externalUrl?: string;
  };
  slug: string;
}

async function fetchZennArticles(): Promise<Post[]> {
  const articles: ZennArticle[] = [];
  let page = 1;

  try {
    for (let i = 0; i < MAX_PAGES; i++) {
      const res = await fetch(
        `https://zenn.dev/api/articles?username=${ZENN_USERNAME}&order=latest&page=${page}`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
      );
      if (!res.ok) break;

      const data: ZennResponse = await res.json();
      articles.push(...data.articles);

      if (!data.next_page) break;
      page = data.next_page;
    }
  } catch {
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

async function fetchNoteArticles(): Promise<Post[]> {
  const articles: NoteArticle[] = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(
        `https://note.com/api/v2/creators/${NOTE_USERNAME}/contents?kind=note&page=${page}`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
      );
      if (!res.ok) break;

      const json: NoteResponse = await res.json();
      articles.push(...json.data.contents);

      if (json.data.isLastPage) break;
    }
  } catch {
    console.warn('Failed to fetch note articles');
  }

  return articles
    .filter(article => article.status === 'published')
    .map(article => ({
      data: {
        title: article.name,
        description: article.description ?? '',
        pubDate: new Date(article.publishAt),
        externalUrl: article.noteUrl,
      },
      slug: `note-${article.key}`,
    }));
}

let cachedPosts: Promise<Post[]> | null = null;

async function computePublishedPosts(): Promise<Post[]> {
  const [localPosts, zennPosts, notePosts] = await Promise.all([
    getCollection('blog'),
    fetchZennArticles(),
    fetchNoteArticles(),
  ]);

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
          pinned: post.data.pinned,
          externalUrl: post.data.externalUrl,
        },
        slug: post.id,
      })),
    ...zennPosts,
    ...notePosts,
  ];

  return posts.sort((a, b) => {
    if (a.data.pinned && !b.data.pinned) return -1;
    if (!a.data.pinned && b.data.pinned) return 1;
    return b.data.pubDate.getTime() - a.data.pubDate.getTime();
  });
}

export function getPublishedPosts(): Promise<Post[]> {
  cachedPosts ??= computePublishedPosts();
  return cachedPosts;
}
