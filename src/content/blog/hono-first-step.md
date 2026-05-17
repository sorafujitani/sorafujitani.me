---
title: "友達用TypeScript入門3 - build Hono Backend"
description: "TypeScript入門の次の一歩として、Honoで小さなバックエンドサーバを動かすまでをまとめたメモ"
pubDate: 2026-05-10
tags: [hono, typescript, bun]
draft: false
---

[友達用TypeScript入門](/blog/ts-first-step/) の続編。
TypeScriptで「ターミナルに出力するだけ」から先に進んで、ブラウザや `curl` から叩けるバックエンドサーバを作る。

最後まで読むと、HTTPでタスクを追加・取得・完了できる小さなAPIが手元で動く。
TypeScript側の収穫としては、`import` / `export`、`async` / `await`、関数のジェネリクス（`<T>` の書き方）あたりが出てくる。前回 *今回触れなかったこと* に挙げた項目を、Honoを動かしながら拾っていくイメージで読んでほしい。

Webサーバ自体にあまり触れたことがない人でも読めるよう、HTTPや `localhost` まわりの話を最初に一度だけ整理する。「だいたい知ってる」人は次の「Honoとは」まで読み飛ばしてOK。

## そもそも「Webサーバを作る」とは何をすることか

普段ブラウザで開いているサイトの向こう側では、必ず **Webサーバ** と呼ばれるプログラムが動いている。これからやるのは、その「向こう側」を自分のPCの中に小さく作ること。

### 役割: 待ち受けて、返事をする

Webサーバの仕事はひと言で言うと

1. リクエストが来るまでひたすら待つ
2. 来たら内容を見て、レスポンスを組み立てて返す
3. また待つ

これを延々と繰り返すだけ。サーバは「自分から動く」ことはなく、常に **クライアント**（ブラウザ、curl、他のサーバなど）からのリクエスト待ちで、それに応答する役。

### HTTPというお約束

クライアントとサーバは好き勝手な形でやり取りはできず、HTTPというプロトコル（決まった手順）に従う。中身をざっくり書くとこう。

リクエスト（クライアント → サーバ）:

```text
POST /tasks HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{"title": "Honoを動かす"}
```

- **メソッド**: `GET`（取得）/ `POST`（作成）/ `PATCH`（一部更新）/ `PUT`（全置換）/ `DELETE`（削除）。リクエストの意図を表す動詞。
- **パス**: `/tasks` の部分。サーバ内のどこを指しているか。
- **ヘッダー**: 補足情報（送るデータの種類、認証情報など）。
- **ボディ**: 送りたいデータ本体。`POST` / `PATCH` などで使う。

レスポンス（サーバ → クライアント）:

```text
HTTP/1.1 201 Created
Content-Type: application/json

{"id": 1, "title": "Honoを動かす", "done": false}
```

- **ステータスコード**: 3桁の数字。`200`成功 / `201`作成成功 / `400`リクエストが変 / `404`見つからない / `500`サーバ内部エラー、あたりを最初は覚えておけばOK。
- **ヘッダー / ボディ** はリクエストと同じ役割。

### JSON

`{"id": 1, "title": "..."}` の形をした文字列フォーマット。サーバとクライアントの間でデータをやり取りするときの定番。TypeScriptのオブジェクトリテラルにそっくりだけど、JSONはあくまで「文字列」で、受け取ったら `JSON.parse` でオブジェクトに戻して使う。Honoの `c.req.json()` や `c.json()` がその変換を裏でやってくれる。

### API

ブラウザでサイトを開くとHTMLが返ってくる、というのが普段の体験。一方、プログラムから呼ぶことを前提に、HTMLではなくJSONを返すサーバの口を **API**（Application Programming Interface の略）と呼ぶ。今回作るのはほぼAPIで、最初の `/` だけ動作確認用に "Hello Hono!" というテキストを返す。

### localhost:3000

`http://localhost:3000` の意味。

- **localhost**: 自分のPC自身を指す特別な名前。外部からはアクセスできないので、開発中の動作確認用。
- **3000**: ポート番号。同じPC内で複数のサーバを別々に動かせるよう、それぞれに番号を割り当てる仕組み。Honoはデフォルトで3000番を使う。

### curl

ターミナルからHTTPリクエストを送るコマンド。ブラウザでも同じことはできるけど、`POST` でJSONを送ったり、ヘッダーを細かく指定したりするのはcurlの方が早い。本記事では動作確認のたびに登場する。

- 何も付けない → `GET`
- `-X POST` → メソッドを `POST` に変える
- `-H 'Content-Type: application/json'` → ヘッダーを付ける
- `-d '{"title": "..."}'` → ボディを付ける

### Webフレームワーク

裸のBunやNode.jsでHTTPサーバを書こうとすると、リクエストのパース・ルーティング・レスポンスの整形を全部自分で書くハメになる。**Webフレームワーク** はその面倒な部分を肩代わりしてくれるライブラリのこと。次に出てくるHonoがまさにそれ。

## Honoとは

Bun・Node.js・Deno・Cloudflare Workers などで動く、軽量なWebフレームワーク。
TypeScriptで書く前提で作られていて、ルーティングや `c.req.param` の戻り値の型などをエディタが自然に補完してくれる。

> Hono - means flame🔥 in Japanese - is a small, simple, and ultrafast web framework built on Web Standards.

書きながら [Hono公式ドキュメント](https://hono.dev/docs/getting-started/basic) を行き来するのが一番早い。

## セットアップ

[前回](/blog/ts-first-step/) で作った `ts-playground` ディレクトリでそのまま続ける。
今回はHonoを使うので、まずパッケージを足して、新しい `server.ts` を1ファイル増やすだけ。第2章で書いた `index.ts` (タスク管理ツール) はそのまま残しておく。

```bash
# ts-playground/ の中で
bun add hono
touch server.ts
```

`bun create hono@latest` で公式テンプレートから始める方法もあるけど、それだと別ディレクトリが切られてしまう。今回は既存の `ts-playground` に1ファイル足すだけのシンプル構成で進める。

`server.ts` に最小のHonoサーバを書く。

```ts
// ts-playground/server.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
```

起動はホットリロード付きで。

```bash
bun run --hot server.ts
```

Bun は `export default` された値が `fetch` メソッドを持つオブジェクトだと認識すると、自動でHTTPサーバとして起動する。デフォルトで `http://localhost:3000` で待ち受ける。

ブラウザで `http://localhost:3000` を開くと `Hello Hono!` と表示される。これが最小のHonoサーバ。
起動したままにして、別のターミナルで `curl http://localhost:3000` を叩いても同じレスポンスが返ってくる。以降の動作確認はブラウザでもcurlでもどちらでもいい。

## 中身を見る

`server.ts` の内容をもう一度。

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
```

短い。1行ずつ意味を確認する。

### `import { Hono } from 'hono'`

ts-first-stepでは触れなかった `import` 構文。

`hono` というnpmパッケージから `Hono` という名前のものを取り込む、という意味。先ほど `bun add hono` でインストールしたので、別ファイルから `Hono` を使えるようになっている。

逆方向の `export` もこのファイルの最終行で使われていて、`export default app` で「このファイルの代表エクスポートはこの `app` です」と宣言している。Bunは `export default` された値が `fetch` メソッドを持つオブジェクト（Honoの `app` がまさにそれ）なら、それをHTTPサーバとして起動する。だから `bun run --hot server.ts` でサーバが立つ。

### `const app = new Hono()`

`new` はclassからインスタンスを作る構文で、これも前回出てこなかった。
`Hono` というclassのインスタンス（実体）を作って `app` という変数に入れている、と読めばいい。`app` に対してメソッドを呼び出すことでルートを足していく。

### `app.get('/', (c) => { ... })`

「`/` に GET でアクセスされたら、このアロー関数を実行する」というルート登録。リクエストごとに呼ばれるこのアロー関数のことを **ハンドラ** と呼ぶ。
引数の `c` は context の略で、リクエスト情報の取得（`c.req.*`）とレスポンスの組み立て（`c.text`, `c.json` など）の窓口になる。`c` の型はHonoが自動で付けてくれるので、エディタで `c.` と打てば候補がずらっと出る。これがHonoとTypeScriptの相性のいいところ。

## ルートを足す

`server.ts` に追記してみる。

```ts
app.get('/hello', (c) => {
  return c.text('Hello, world')
})

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.text(`user id is ${id}`)
})

app.get('/api/health', (c) => {
  return c.json({ ok: true })
})
```

`bun run --hot` で起動しているので、ファイルを保存すると自動でリロードされる。

```bash
curl http://localhost:3000/hello
# Hello, world

curl http://localhost:3000/users/42
# user id is 42

curl http://localhost:3000/api/health
# {"ok":true}
```

`/users/:id` の `:id` は、URLパスの一部を変数として受け取るための書き方。`/users/1` でも `/users/abc` でも同じハンドラにマッチし、`c.req.param('id')` でその値を取り出せる。

ここでひとつ確認しておきたいのは `c.req.param('id')` の戻り値の型。

エディタで `const id = c.req.param('id')` の `id` にカーソルを当てると、型が `string` だと表示される。
URLからパースした値はとりあえず文字列として渡ってくる、というのはWebのお約束。なので「数値として扱いたい」場合は `Number(id)` で明示的に変換する必要がある。

```ts
app.get('/users/:id', (c) => {
  const id = Number(c.req.param('id'))
  if (Number.isNaN(id)) {
    return c.text('id must be a number', 400)
  }
  return c.text(`user id is ${id}`)
})
```

`Number("42")` は `42` を返すけど、`Number("abc")` は `NaN`（Not-a-Number）を返す。`Number.isNaN(...)` でチェックして、おかしな入力には400を返す、というのがWebサーバの基本動作。

## JSONを返す

`c.json(value)` を呼ぶと、`value` をJSON文字列にして `Content-Type: application/json` 付きで返してくれる。

```ts
app.get('/api/me', (c) => {
  return c.json({
    name: 'mozumasu',
    level: 3,
    active: true,
  })
})
```

```bash
curl http://localhost:3000/api/me
# {"name":"mozumasu","level":3,"active":true}
```

返したい形が決まっているなら、`interface` を定義して型注釈を付けるのが安全。

```ts
interface User {
  name: string
  level: number
  active: boolean
}

app.get('/api/me', (c) => {
  const me: User = {
    name: 'mozumasu',
    level: 3,
    active: true,
  }
  return c.json(me)
})
```

`me` を `User` 型で受けることで、書き間違い（例えば `levle: 3`）はコードを書いた瞬間にエラーになる。前回作ったタスク管理ツールと同じ発想で、APIサーバ側にも同じ恩恵が効く。

## 動くものを作る: タスクAPI

ts-first-stepで作ったタスク管理ツールをHTTPで叩けるようにする。
`Task` の interface はそのまま流用。配列をメモリに持って、HTTPでCRUDする最小構成。

`server.ts` を以下に書き換える。

```ts
import { Hono } from 'hono'

interface Task {
  id: number
  title: string
  done: boolean
}

const tasks: Task[] = []
let nextId = 1

const app = new Hono()

// 一覧
app.get('/tasks', (c) => {
  return c.json(tasks)
})

// 1件取得
app.get('/tasks/:id', (c) => {
  const id = Number(c.req.param('id'))
  const task = tasks.find((t) => t.id === id)
  if (task === undefined) {
    return c.json({ error: 'not found' }, 404)
  }
  return c.json(task)
})

// 追加
app.post('/tasks', async (c) => {
  const body = await c.req.json<{ title: string }>()
  const task: Task = { id: nextId++, title: body.title, done: false }
  tasks.push(task)
  return c.json(task, 201)
})

// 完了にする
app.patch('/tasks/:id/done', (c) => {
  const id = Number(c.req.param('id'))
  const task = tasks.find((t) => t.id === id)
  if (task === undefined) {
    return c.json({ error: 'not found' }, 404)
  }
  task.done = true
  return c.json(task)
})

export default app
```

保存したら、別のターミナルから叩いて動作を確認する。

```bash
# 追加
curl -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title": "Honoを動かす"}'
# {"id":1,"title":"Honoを動かす","done":false}

curl -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title": "ブログを書く"}'
# {"id":2,"title":"ブログを書く","done":false}

# 一覧
curl http://localhost:3000/tasks
# [{"id":1,...},{"id":2,...}]

# 完了にする
curl -X PATCH http://localhost:3000/tasks/1/done
# {"id":1,"title":"Honoを動かす","done":true}

# 1件取得
curl http://localhost:3000/tasks/1
# {"id":1,"title":"Honoを動かす","done":true}

# 存在しないid
curl http://localhost:3000/tasks/999
# {"error":"not found"}
```

サーバを止めるとメモリの中身も消えるので、再起動するとタスクは空に戻る。永続化はDB導入の話なのでここでは触れない。

## ここで出てきたTypeScriptの新顔

### `async` / `await`

`app.post('/tasks', async (c) => { ... })` の `async` と、関数本体の `await c.req.json(...)` の `await`。

`c.req.json()` は「リクエストのbodyを最後まで読んでJSONにパースする」処理で、body読み込みはネットワーク越しなので時間がかかる。こういう「すぐには結果が返らない処理」はTypeScript（JavaScript）では `Promise` という入れ物に包まれて返ってくる。

`await` を付けると、Promiseが解決するのを待って中身の値を取り出してくれる。
そして `await` を使うには、関数を `async` にする必要がある。これはセットで覚えればOK。

```ts
// 同期: その場で値が返る
const x = 1 + 2

// 非同期: Promise に包まれて返る → await で取り出す
const body = await c.req.json<{ title: string }>()
```

ファイル読み込み (`fs.readFile`)、HTTPリクエスト (`fetch`)、DBアクセスなど、外部とやりとりする処理はだいたい `async` / `await` の世界に入っていく。Honoのハンドラを `async` にしておけば、その中で何でも `await` できる、と覚えておけばいい。

### ジェネリクス: `c.req.json<T>()`

`c.req.json<{ title: string }>()` の `<...>` がジェネリクス。

`c.req.json()` は「何が来るかわからないJSON」を受け取るので、デフォルトでは戻り値の型が緩く（`unknown` 寄りに）なる。`<{ title: string }>` を渡すことで、「このAPIには `{ title: string }` のJSONが来るはずだ」とTypeScriptに伝えられる。

```ts
const body = await c.req.json<{ title: string }>()
body.title       // OK: string
body.titel       // エラー: 'titel' は存在しない
body.title.toUpperCase() // OK: string のメソッドが補完される
```

`<>` の中身はその場で書いても、事前に定義した interface でもいい。

```ts
interface CreateTaskInput {
  title: string
}

const body = await c.req.json<CreateTaskInput>()
```

注意点として、これはあくまで「TypeScriptに伝える型情報」であって、実行時に「本当に `title` が入っているか」をチェックしてくれるわけではない。クライアントが嘘のJSONを送ってきたら、`body.title` は `undefined` になる可能性がある。
本気でやるなら [Zodなどのスキーマバリデーション](/blog/choosing-ts-schema-validation-library/) を組み合わせるのが定番だけど、まずはこの「型注釈は付けておく」状態で動くものを作るのが優先。

### `import` / `export` (再掲)

`import { Hono } from 'hono'` で外部パッケージから機能を取り込む。
自分で書いたファイルを別ファイルから使いたい時にもこの構文を使う。例えば `tasks.ts` にタスク周りの処理をまとめて、

```ts
// tasks.ts
export interface Task {
  id: number
  title: string
  done: boolean
}

export const tasks: Task[] = []
```

```ts
// server.ts
import { Task, tasks } from './tasks'
```

と書ける。プロジェクトが大きくなってくると最初に気になるのは「ファイルをどう分けるか」になるはず。そのときに `import` / `export` の出番が来る。

## 動作の振り返り

`bun run --hot server.ts` でやっていることをまとめると、

1. Bunが `server.ts` を読み込む
2. `import` で `hono` パッケージから `Hono` クラスを取り込む
3. `new Hono()` で `app` を作り、`app.get(...)` / `app.post(...)` などでルートを登録する
4. `export default app` でBunに渡す
5. Bunは `app.fetch` を見つけて、`http://localhost:3000` でリクエストを待ち受ける
6. リクエストが来ると、登録されたハンドラのうちパスとメソッドが一致するものを呼ぶ

TypeScriptはこの一連の流れを、書いている最中ずっと見てくれている。
`c.req.param('id')` の戻り値が `string` であることも、`c.json(task)` の `task` が `Task` 型であることも、`c.req.json<T>()` で受けた `body` の型も、すべてエディタで確認できる。前回まで「ターミナル出力が出るかどうか」でしか確認できなかった世界から、ひと回り大きな部品をTypeScriptが守ってくれている、というのが今回の収穫。

## 今回触れなかったこと

- ミドルウェア (`app.use(logger())` など、リクエストの前後処理を挟む仕組み)
- バリデーション (`@hono/zod-validator` での実行時の型チェック)
- RPCモード (Hono独自のEnd-to-End型付け、サーバ側のルート定義からクライアント側の型を生成する)
- 永続化 (SQLite / Postgres などDBとつなぐ話)
- デプロイ (Cloudflare Workers / Bunサーバとして公開する話)

このあたりは「動くものができた後に、必要になった時に足していく」順番でいい。
公式の [Hono Documentation](https://hono.dev/docs) が一番網羅的で、項目ごとにまとまっている。

[js-first-step](/blog/js-first-step/) → [ts-first-step](/blog/ts-first-step/) → 今回、と読んできて手元に動くものが3つ並んだはず。次に作りたいものがあれば、それを起点にHonoのドキュメントを引きにいくのが一番早い。
