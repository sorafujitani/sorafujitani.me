---
title: Unlisted ページのサンプル
description: 一覧には表示されないが、直接URLを知っていれば閲覧できるページ。
pubDate: 2026-04-26
tags: [sample]
---

これは `src/content/private/` 配下に置かれた unlisted ページのサンプルです。

- ブログ一覧には表示されません
- RSS には含まれません
- sitemap.xml にも含まれません
- HTML には `<meta name="robots" content="noindex, nofollow">` が出力されます
- URL を知っている人だけがアクセスできます

検証が終わったら削除して問題ありません。
