---
title: "友達用TypeScript入門4 - composing types and tsconfig"
description: "型を組み立てるスキルと、tsconfigで厳しさを上げる設定を両輪でまとめたメモ"
pubDate: 2026-05-09
tags: [typescript]
draft: false
---

[友達用TypeScript入門3](/blog/hono-first-step/) の続編。
これまでは「型を書く」「型のついた値を使う」が中心だった。今回は

- 型を **組み立てる** (`A | B`、`extends`、ジェネリック、ユーティリティ型 など)
- tsconfigで **TypeScriptの厳しさを上げる**

の2本立てで進める。
この2つはセットで意味があって、組み立てた型がちゃんと働くかどうかは tsconfig の設定で決まるし、tsconfig をいくら締めても型を平らな `string` だけで書いていると恩恵が出ない。両輪と思って読んでほしい。

## Part 1: 型を組み立てる

### `type` という書き方

ts-first-step では `interface` を使ってオブジェクトの形を定義した。
TypeScriptにはもう一つ、`type` というキーワードがあって、こちらは「組み合わせた型に名前を付ける」用途で使う。

```ts
interface User {           // オブジェクトの形を表すならこっち
  name: string
  level: number
}

type Status = "todo" | "doing" | "done"  // 後述するunionなどはこっち
```

ざっくり「オブジェクトの形 = `interface`、それ以外の組み立て型 = `type`」と覚えておけば困らない。

### Union Type — 「AまたはB」

`|` で繋ぐと「どちらかの型」になる。

```ts
function format(value: string | number): string {
  return String(value)
}

format("hello") // OK
format(42)      // OK
format(true)    // エラー: boolean は string | number に割り当てられない
```

ts-first-stepで出てきた `Task | undefined` も同じ仕組み。「`Task` または `undefined`」という意味だった。

### リテラル型

`"todo"` のような具体値そのものを型として扱える。

```ts
type Status = "todo" | "doing" | "done"

let s: Status = "todo"
s = "done"
s = "wip" // エラー: '"wip"' は Status に割り当てられない
```

文字列・数値・booleanの「特定の値」を束ねる、という感覚。
状態管理が型でガードされるので、`if (status === "wpi")` みたいなtypoが書いた瞬間にエラーになる。

### 判別共用体 (discriminated union)

「成功なら値、失敗ならエラー」のように **形が違うレコードの集合** を表したい時の定番。

```ts
type Result =
  | { ok: true;  value: number }
  | { ok: false; error: string }

function show(r: Result): void {
  if (r.ok) {
    console.log(r.value)   // ここでは value にアクセスできる
  } else {
    console.log(r.error)   // ここでは error にアクセスできる
  }
}
```

`r.ok` の値で TypeScript が分岐先の形を絞り込んでくれる。
`if (r.ok)` の中で `r.error` にアクセスしようとするとエラーになるし、逆もしかり。これを **絞り込み (narrowing)** と呼ぶ。
APIの戻り値、フォームの状態、フェッチの状態 (loading / success / error) など、出番がとても多い。

### Intersection Type — 「AかつB」

`&` で繋ぐと「両方の性質を持つ型」になる。

```ts
interface Task {
  id: number
  title: string
}

type WithCreatedAt = Task & { createdAt: Date }

const t: WithCreatedAt = {
  id: 1,
  title: "...",
  createdAt: new Date(),
}
```

`Task` に「`createdAt` も持っている」という条件を足した型ができる。

### interface の extends

オブジェクトの形を拡張するなら `interface` の `extends` のほうが自然。

```ts
interface Task {
  id: number
  title: string
}

interface DatedTask extends Task {
  createdAt: Date
}
```

`extends` で `Task` に `createdAt` を足した interface を作っている。
`Task` の項目が変わったら `DatedTask` 側にも反映される。

### ジェネリック関数

`<T>` を関数定義の頭に書くと、「呼び出し時に決まる型」を扱える。

```ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}

const n = first([1, 2, 3])     // T は number → 戻り値は number | undefined
const s = first(["a", "b"])    // T は string → 戻り値は string | undefined
```

Hono入門で出てきた `c.req.json<T>()` は、Hono側がこのパターンで作っている関数。
「呼び出し側で型を渡せば、その型として扱う」が `<T>` の役割。

### ユーティリティ型: Partial / Pick / Omit

TypeScriptが標準で用意している、型を加工する関数のような型。

```ts
interface Task {
  id: number
  title: string
  done: boolean
}

// 全プロパティをオプショナルに
type TaskPatch = Partial<Task>
// = { id?: number; title?: string; done?: boolean }

// 一部だけ抜き出す
type TaskListItem = Pick<Task, "id" | "title">
// = { id: number; title: string }

// 一部を除外
type CreateTaskInput = Omit<Task, "id">
// = { title: string; done: boolean }
```

`Task` という1つの定義から、用途別の型を派生させられる。
APIの「作成時のbody」「更新時のbody」「一覧の表示用」みたいに微妙に違う型が、本体の `Task` を1箇所直せば全部追従する、というのがこの嬉しさ。

### typeof — 値から型を取る

```ts
const defaultConfig = {
  port: 3000,
  host: "localhost",
}

type Config = typeof defaultConfig
// = { port: number; host: string }
```

すでにある値の形を、もう一度 interface で書き直すのは無駄。`typeof` を使うと「今ある値の型をそのまま型として使う」ことができる。

### as const — リテラルとして固定する

```ts
const STATUSES = ["todo", "doing", "done"]
// 推論される型: string[]

const STATUSES2 = ["todo", "doing", "done"] as const
// 推論される型: readonly ["todo", "doing", "done"]

type Status = typeof STATUSES2[number]
// = "todo" | "doing" | "done"
```

通常の `const` で配列を書くと中身は `string[]` 扱いになるが、`as const` を付けるとそのままの形が型に乗る。
そこから `[number]` (添字アクセス) で要素の型を取れば、リテラル型のunionが手に入る。
「定数の配列があって、それと同じ集合を型として使いたい」時の定番パターン。

## Part 2: tsconfig を読む

`tsconfig.json` は TypeScript の動作を制御するファイル。`bun init` した時点で生成されている。

抜粋するとこんな中身。

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
    // ...
  }
}
```

ここで「TypeScriptの厳しさをどこまで上げるか」「どのJavaScriptに変換するか」「どのAPIを使えると思っていいか」を決める。
組み立てた型をちゃんと働かせるには、この設定が締まっていることが前提になる。

### `"strict": true`

これ1行で、TypeScriptの主要な厳格チェックがまとめてONになる。
含まれるオプションは、

- `noImplicitAny`: 型を書き忘れて `any` になる状況をエラーにする
- `strictNullChecks`: `null` / `undefined` を他の型に紛れ込ませない
- `strictFunctionTypes`: 関数型のチェックを厳しくする
- `strictBindCallApply`: `.call` / `.bind` / `.apply` の引数を型チェック
- `strictPropertyInitialization`: classのプロパティ初期化漏れをエラーにする
- `noImplicitThis`: `this` が暗黙の `any` になるのを防ぐ
- `alwaysStrict`: 各ファイルを ECMAScript strict mode で解釈する
- `useUnknownInCatchVariables`: `try/catch` の `e` を `any` ではなく `unknown` にする

新規プロジェクトなら、まず `strict: true` から始めるのが基本。後から個別に切ることはできても、最初から緩い設定だと、あとから型を足しても効きが弱い。

### `strictNullChecks` の効き目

OFFだとどうなるか体験してみるとわかりやすい。

```ts
// strictNullChecks: false の世界
function getTitle(task: Task | undefined): string {
  return task.title  // エラーにならない (実行時には壊れる)
}
```

```ts
// strictNullChecks: true の世界
function getTitle(task: Task | undefined): string {
  return task.title  // エラー: 'task' is possibly 'undefined'
}
```

ts-first-stepでやった `if (task !== undefined)` のチェックが必要になるのは、この設定がONだから。
逆にOFFだと、TypeScriptは型としては書かせてくれるけど、実行時には `Cannot read properties of undefined` で落ちるコードを通してしまう。
**`strict: true` を切ってほしくない** 最大の理由がこれ。

### `noUncheckedIndexedAccess` (`strict` には含まれない)

配列のインデックスアクセスや `Record<string, T>` のキーアクセスが `T | undefined` になる。

```ts
const items = ["a", "b", "c"]

// noUncheckedIndexedAccess: false (デフォルト)
const x: string = items[10]  // エラーにならない (実態は undefined)

// noUncheckedIndexedAccess: true
const x: string = items[10]  // エラー: string | undefined を string に代入できない
```

実行時クラッシュ源として `undefined` の次に多いのが「配列の存在しない添字」。
これをONにしておくと、TypeScriptが事前に `undefined` チェックを強制してくれる。
`strict: true` には **含まれていない** ので、別途 `"noUncheckedIndexedAccess": true` を足すのが推奨。

### `target` と `lib`

```jsonc
"target": "ESNext",
"lib": ["ESNext"]
```

- `target`: TypeScriptがどのJSバージョンに変換するか。古い環境(IE11など)向けに書くなら `ES5` のように落とす
- `lib`: コードから「使えると思っていいAPI」のリスト。`DOM` を入れるとブラウザAPI(`document`, `window` など)が型として使える

ブラウザで動くフロントエンド: `lib` に `DOM` が必要。
Bun/Node.jsのサーバ: `DOM` は基本不要、`ESNext` だけでよい。

「使えないはずのAPIがエラーにならない」「使えるはずのAPIがエラーになる」という症状は、だいたい `lib` の設定。

### `moduleResolution` と path alias

```jsonc
"moduleResolution": "bundler",
"baseUrl": ".",
"paths": {
  "@components/*": ["src/components/*"]
}
```

- `moduleResolution`: `import './foo'` をどう解決するか。Bun / Vite / 最近のbundler系は `"bundler"`、Node.js直なら `"nodenext"`
- `paths`: importを相対パス地獄から救うエイリアス。`import X from "@components/X"` のような書き方ができるようになる

このあたりは「動かないとき調べる」順でよくて、最初は `bun init` の生成値のままで困らない。

## 両者を合わせる: なぜセットなのか

最後に、Part 1 と Part 2 を1つに束ねた例。
`Task` を1つ定義して、ユーティリティ型で派生させて、ジェネリック関数で受け取って、`strictNullChecks` + `noUncheckedIndexedAccess` で守られている、という状態。

```ts
interface Task {
  id: number
  title: string
  done: boolean
}

type CreateTaskInput = Omit<Task, "id" | "done">
type TaskPatch = Partial<Pick<Task, "title" | "done">>

const tasks: Task[] = []
let nextId = 1

function createTask(input: CreateTaskInput): Task {
  const task: Task = { id: nextId++, title: input.title, done: false }
  tasks.push(task)
  return task
}

function patchTask(id: number, patch: TaskPatch): Task | undefined {
  const task = tasks.find((t) => t.id === id)
  if (task === undefined) return undefined          // ← strictNullChecks
  if (patch.title !== undefined) task.title = patch.title
  if (patch.done !== undefined) task.done = patch.done
  return task
}

function first<T>(items: T[]): T | undefined {
  return items[0]                                   // ← noUncheckedIndexedAccess
}

const t = first(tasks)                              // Task | undefined
if (t !== undefined) {                              // strictNullChecksの絞り込み
  console.log(t.title)
}
```

短いコードに、効いていることがいくつも詰まっている。

- `Omit` / `Pick` / `Partial` で `Task` から派生型を作る → **型を組み立てる** 側
- `<T>` のジェネリック関数で「中身の型」を保ったまま値を扱う → **型を組み立てる** 側
- `tasks.find` の戻り値が `Task | undefined` になり、`if (task === undefined)` のチェックが必要になる → **tsconfig** 側 (`strictNullChecks`)
- `items[0]` が `T | undefined` になる → **tsconfig** 側 (`noUncheckedIndexedAccess`)

**型を組み立てる** 側で「`Task` の派生・ジェネリックの抽象化」を表現し、**tsconfig** 側で「`undefined` を見逃さない」を強制する。
両方が揃ってはじめて、コードを書いた瞬間にバグを止めてくれる体験になる。
`strict: true` だけONになっているプロジェクトは多いけど、`noUncheckedIndexedAccess` は意外と切れているので、自分の手元の `tsconfig.json` を一度開いてみてほしい。

## 今回触れなかったこと

- 条件型 (`T extends U ? X : Y`) と `infer`
- mapped type (`{ [K in keyof T]: ... }`)
- template literal types (`` `${string}-id` ``)
- `keyof` / `Record<K, V>` / `Readonly<T>` / `ReturnType<T>` / `Awaited<T>` などその他のユーティリティ型
- ジェネリック制約 (`<T extends Y>`)
- `satisfies` 演算子
- declaration merging / module augmentation
- `tsconfig.json` の `references` / `composite` (monorepo / 増分ビルド系)

このあたりは「ライブラリを自作する」「型レベルで何かを計算する」段階で必要になる。
[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) の "Type Manipulation" 章と、[TSConfig Reference](https://www.typescriptlang.org/tsconfig/) が一次情報として一番まとまっている。

[1: before TypeScript](/blog/js-first-step/) → [2: TypeScript](/blog/ts-first-step/) → [3: Hono](/blog/hono-first-step/) → 今回 で「TypeScriptで動くものを作って、設定で守りを固める」ところまで来た。
次に何を学ぶかは、今書いているコードで一番困っているところに依存するので、自分の手元のコードを見て選んでください。
