import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog');
  return posts
    .filter(post => !post.data.externalUrl)
    .map((post) => ({
      params: { slug: post.slug },
      props: { title: post.data.title, tags: post.data.tags || [] },
    }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, tags } = props as { title: string; tags: string[] };

  // Noto Sans JPのフォントを取得
  const fontData = await fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-700-normal.woff'
  ).then((res) => res.arrayBuffer());

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0d1117 0%, #0d1a24 40%, #0a1f2e 70%, #0d1117 100%)',
          fontFamily: 'Noto Sans JP',
        },
        children: [
          // 左上のアクセントライン
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '8px',
                height: '100%',
                background: 'linear-gradient(180deg, #00d8ff 0%, #0088cc 100%)',
              },
            },
          },
          // メインコンテンツ
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'center',
                paddingLeft: '20px',
              },
              children: [
                // タイトル
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: title.length > 40 ? '48px' : title.length > 25 ? '56px' : '64px',
                      fontWeight: 700,
                      color: '#ffffff',
                      lineHeight: 1.3,
                      letterSpacing: '-0.02em',
                      maxWidth: '1080px',
                      wordBreak: 'break-word',
                    },
                    children: title,
                  },
                },
                // タグ
                tags.length > 0
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '12px',
                          marginTop: '32px',
                        },
                        children: tags.slice(0, 4).map((tag: string) => ({
                          type: 'div',
                          props: {
                            style: {
                              padding: '8px 20px',
                              background: 'rgba(0, 216, 255, 0.15)',
                              border: '1px solid rgba(0, 216, 255, 0.3)',
                              borderRadius: '20px',
                              color: '#00d8ff',
                              fontSize: '24px',
                            },
                            children: tag,
                          },
                        })),
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // フッター
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingLeft: '20px',
                marginBottom: '40px',
              },
              children: [
                // サイト名
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '28px',
                      color: '#00d8ff',
                      fontWeight: 700,
                    },
                    children: 'Sora Fujitani',
                  },
                },
                // デコレーション
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '40px',
                            height: '4px',
                            background: '#00d8ff',
                            borderRadius: '2px',
                          },
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '20px',
                            height: '4px',
                            background: 'rgba(0, 216, 255, 0.5)',
                            borderRadius: '2px',
                          },
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '10px',
                            height: '4px',
                            background: 'rgba(0, 216, 255, 0.3)',
                            borderRadius: '2px',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
