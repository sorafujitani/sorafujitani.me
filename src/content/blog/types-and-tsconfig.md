---
title: "友達用TypeScript入門4 - composing types and tsconfig"
description: "型を組み立てる練習と、tsconfigを実際に触って挙動を比べる回。動かして体感するハンズオン編"
pubDate: 2026-05-09
tags: [typescript]
draft: false
---

[友達用TypeScript入門3](/blog/hono-first-step/) の続編。
これまでは「型を書く」「型のついた値を使う」が中心だった。今回は

- 型を **組み立てる** (union、ユーティリティ型、ジェネリックなど)
- tsconfigを **実際に触って** 挙動の違いを見る

の2本立てで進める。
用語を一気に並べると重いので、第3章で使った `ts-playground/` の中に小さなファイルをトピックごとに足して、**わざとエラーを出す → 直す → tsconfigを書き換える** を繰り返しながら進める。
エディタの赤い波線と `bun run` した時の出力、両方を見比べることで、「TypeScriptが何を守ってくれているのか」「tsconfigが何を切り替えているのか」が具体的に見える。

VSCodeなどTypeScript対応エディタで、ファイルを保存すると数秒で型エラーが反映される、という前提で書いている。

## 準備

特別な準備はなし。第3章で使った `ts-playground/` の中で作業を続ける。
今回は実験ごとに新しい `.ts` ファイルを並べて足していく。サブディレクトリは作らず、`ts-playground/` の直下にフラットに置く。

## Part 1: 型を組み立てる - 動かしながら

### `type` というキーワード

ts-first-stepでは `interface` でオブジェクトの形を定義した。
TypeScriptには `type` というもう1つの書き方があって、こちらは「組み合わせた型に名前を付ける」用途で使う。

```ts
interface User { name: string; level: number }   // オブジェクトの形 → interface
type Status = "todo" | "doing" | "done"           // それ以外の組み立て型 → type
```

ここから出てくる union や Pick の説明はぜんぶ `type` 側なので、これだけ先に紹介しておく。

### 実験1: union と literal — 値そのものを型にする

`status.ts` を作って書き写す。

```ts
// status.ts
type Status = "todo" | "doing" | "done"

let s: Status = "todo"
s = "wip"
```

保存すると `"wip"` の行に赤い波線が出る。

```
Type '"wip"' is not assignable to type 'Status'.
```

`Status` という名前が、3つの **値そのもの** の集合になっている。
`"todo"` のような値リテラルそのものを型として扱うのが **リテラル型**。それを `|` で繋ぐと「どれか1つ」の型になる(これが **union**)。

`s = "doing"` などに直すとエラーが消える。
`s = "` まで打って候補が3つだけ出るのも一度確認しておくと、エディタの補完が型でガードされている感じが掴める。

### 実験2: 判別共用体 (discriminated union) — 形違いの集合を絞り込む

`result.ts` を作る。

```ts
// result.ts
type Result =
  | { ok: true;  value: number }
  | { ok: false; error: string }

function show(r: Result): void {
  if (r.ok) {
    console.log(r.value)
    console.log(r.error)
  } else {
    console.log(r.error)
    console.log(r.value)
  }
}
```

保存すると、`if (r.ok)` の中の `r.error` と、`else` の中の `r.value` にそれぞれエラーが出る。

```
Property 'error' does not exist on type '{ ok: true; value: number; }'.
Property 'value' does not exist on type '{ ok: false; error: string; }'.
```

`r.ok` の値で TypeScript が自動的に分岐先の形を絞ってくれている。
`if (r.ok)` の中では「成功側の形」だけ、`else` の中では「失敗側の形」だけが見えている。これを **絞り込み (narrowing)** と呼ぶ。

APIの戻り値、フォームの状態、フェッチのloading/success/errorの状態管理など、出番がとても多い。
2行を消すとエラーがなくなる。

### 実験3: Pick / Omit / Partial — `Task` から派生型を作る

TypeScriptが標準で用意している、型を加工する型。`utility.ts` を作る。

```ts
// utility.ts
interface Task {
  id: number
  title: string
  done: boolean
}

type CreateTaskInput = Omit<Task, "id" | "done">
//   = { title: string }

type TaskPatch = Partial<Pick<Task, "title" | "done">>
//   = { title?: string; done?: boolean }

const input: CreateTaskInput = { title: "test", id: 1 }  // (a)
const patch: TaskPatch       = { title: "x" }            // (b) OK
```

`(a)` の行にエラーが出る。

```
Object literal may only specify known properties, and 'id' does not exist in type 'CreateTaskInput'.
```

`Omit<Task, "id" | "done">` で `id` と `done` を除外した型を作っているので、そこに `id` を入れるのは契約違反。
`Pick<Task, "title" | "done">` は逆に `title` と `done` だけを抜き出した型。`Partial<...>` でそれを全部オプショナルに変えている。

(a) を `{ title: "test" }` に直すとエラーが消える。

`Task` という1つの定義から、用途別の型を派生させられるのがこれの嬉しさ。
本体の `Task` を1箇所直せば、`CreateTaskInput` も `TaskPatch` も自動で追従する。APIの「作成時のbody」「更新時のbody」「一覧の表示用」みたいに微妙に違う型が、1箇所の更新で揃う。

### 実験4: ジェネリック関数 — 呼び出し時に型が決まる

第3章で `c.req.json<T>()` の `<T>` がジェネリクスだ、という話だけ出てきた。今度は自分で書いてみる。`generic.ts`:

```ts
// generic.ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}

const n = first([1, 2, 3])
const s = first(["alice", "bob"])
const t = first([{ id: 1, title: "test" }])
```

`n`、`s`、`t` のそれぞれにマウスをホバーして、推論されている型を見てみる。

- `n: number | undefined`
- `s: string | undefined`
- `t: { id: number; title: string } | undefined`

呼び出し側で渡された配列の中身の型から、`<T>` が自動で決まる。
1つの関数定義で、どんな型の配列にも使えるのがジェネリックの嬉しさ。

ここまでがPart 1。型を組み立てる側のスキルは、最低限これくらいで一気に世界が広がる。

## Part 2: tsconfig を「触って」確かめる

ここからが本題の、tsconfigを実際に編集して挙動の違いを見る回。

### 現状の中身を確認

`ts-playground/tsconfig.json` を開く。`bun init -y` の生成値だと、抜粋でこんな感じ。

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
    // ...
  }
}
```

注目するのは `"strict": true`。これ1行で、`strictNullChecks` / `noImplicitAny` / `strictFunctionTypes` など、TypeScriptの主要な厳格チェックがまとめてONになっている。

ここからは「あえて切ってみる」「あえて追加してみる」を交互にやる。

### 実験5: `strict` を切ってみる

まず壊れるコードを用意する。`null-experiment.ts`:

```ts
// null-experiment.ts
function getTitle(task: { title: string } | undefined): string {
  return task.title
}

console.log(getTitle(undefined))
```

保存すると `task.title` の行にエラーが出る。

```
'task' is possibly 'undefined'.
```

このエラーが出るのは `strict: true` (の中の `strictNullChecks`) のおかげ。
**ここで実際に走らせてみる:**

```bash
bun run null-experiment.ts
```

```
TypeError: Cannot read properties of undefined (reading 'title')
```

エディタの警告が言っていたとおり、実行時にクラッシュした。
ポイントは、**Bunは型エラーがあっても実行はする**こと。型チェックを走らせているのはエディタ側のTypeScript Language Serverで、Bunはそれを見ない。
つまりtsconfigの効果は「壊れたコードを止める」ことではなく、「壊れていることをコードを書いている時点で教えてくれる」ことに限られる。

ここで `ts-playground/tsconfig.json` を開いて、`"strict": true` を `"strict": false` に書き換えて保存する。
`null-experiment.ts` に戻ると、**エディタの赤い波線が消える**。型エラーがなくなったように見える。

もう一度走らせると、

```bash
bun run null-experiment.ts
```

```
TypeError: Cannot read properties of undefined (reading 'title')
```

実行結果は同じ。クラッシュする。
つまり「壊れているかどうか」は変わっていない。変わったのは「壊れていることをコードを書いている時点で教えてくれるかどうか」だけ。

`strict` を切るのは「自分の目に問題が見えなくなる」だけで、バグはそこに残ったまま。
**`strict: true` に戻して保存しておく。**

参考までに、`strict: true` でまとめてONになる主なフラグ:

- `strictNullChecks`: `null` / `undefined` を他の型に紛れ込ませない (今回見たやつ)
- `noImplicitAny`: 引数の型を書き忘れて `any` になるのをエラーにする
- `strictFunctionTypes`: 関数型のチェックを厳しくする
- `strictPropertyInitialization`: classのプロパティ初期化漏れをエラーにする
- `useUnknownInCatchVariables`: `try/catch` の `e` を `any` ではなく `unknown` にする
- ほか数項目

新規プロジェクトはまず `"strict": true` から始めるのが基本。

### 実験6: `noUncheckedIndexedAccess` を入れてみる

`strict: true` には **含まれていない** 別系統のチェック。`array-experiment.ts` を作る。

```ts
// array-experiment.ts
const items = ["a", "b", "c"]
const x: string = items[10]
console.log(x.toUpperCase())
```

保存しても、**今はエラーが出ない**。`items[10]` の戻り値はデフォルトでは `string` 扱いになっている(添字が範囲外でもTSは気にしない)。

走らせると、

```bash
bun run array-experiment.ts
```

```
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

`items[10]` は実態としては `undefined` だった。TypeScriptは、デフォルトのままだと **これに気づいてくれない**。

ここで `ts-playground/tsconfig.json` の `compilerOptions` の中に1行足す。

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,    // ← この行を追加
    // ...
  }
}
```

保存して `array-experiment.ts` に戻ると、**赤い波線が出る**。

```
Type 'string | undefined' is not assignable to type 'string'.
```

ONの世界では、配列のインデックスアクセスの戻り値が `T | undefined` になる。
`items[10]` の戻り値は `string | undefined` 扱いになり、`undefined` を考慮しないコードはエラーになる。

```ts
const x = items[10]            // string | undefined
if (x !== undefined) {
  console.log(x.toUpperCase()) // ここでは string として扱える
}
```

このように書き換えるとエラーが消える。

実行時クラッシュ源として `undefined` の次に多いのが「配列の存在しない添字」。
`noUncheckedIndexedAccess` をONにしておくと、TypeScriptが事前に `undefined` チェックを強制してくれる。
`strict: true` には含まれないので、自分で1行足す必要がある。

### 設定の効果まとめ

ここまでの2実験で見えたこと:

- tsconfigは **「エディタで何をエラーとして見せるか」** を制御するもの
- 実行時の挙動は変わらない。壊れたコードはtsconfigをどう設定しても壊れたまま
- だから「設定を緩める」は「自分の目に問題が見えなくなる」だけで、バグは残ったまま
- `strict: true` だけだと埋まらない部分があり、`noUncheckedIndexedAccess` のような追加フラグで補う

新規プロジェクトなら、

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

の2つは入れておいて損がない。

## ここまでに作ったファイル

シリーズ全体の作業ディレクトリは2つだけ。

```
js-playground/        # 第1章
└── index.js

ts-playground/        # 第2章 〜 第4章
├── package.json
├── tsconfig.json     # 第4章で noUncheckedIndexedAccess: true を追加
├── index.ts          # 第2章: タスク管理ツール
├── server.ts         # 第3章: Honoサーバ
├── status.ts         # 第4章 実験1
├── result.ts         # 第4章 実験2
├── utility.ts        # 第4章 実験3
├── generic.ts        # 第4章 実験4
├── null-experiment.ts   # 第4章 実験5
└── array-experiment.ts  # 第4章 実験6
```

`Task` を1つ定義して、用途別の派生型を `Pick` / `Omit` / `Partial` で作って、ジェネリック関数で受け取って、`strictNullChecks` と `noUncheckedIndexedAccess` で `undefined` を見逃さない、という最低限のセットが手元で動く状態になった。

## 今回触れなかったこと

- intersection types (`A & B`) と `interface` の `extends`
- `typeof` で値から型を取る
- `as const` でリテラルとして固定する
- `keyof` / `Record<K, V>` / `Readonly<T>` / `ReturnType<T>` / `Awaited<T>` などその他のユーティリティ型
- ジェネリック制約 (`<T extends Y>`)
- 条件型 (`T extends U ? X : Y`) と `infer`
- mapped type (`{ [K in keyof T]: ... }`)
- template literal types (`` `${string}-id` ``)
- `satisfies` 演算子
- declaration merging / module augmentation
- `target` / `lib` / `moduleResolution` / `paths` などその他のtsconfigオプション
- `tsconfig.json` の `references` / `composite` (monorepo / 増分ビルド系)

このあたりは「ライブラリを自作する」「型レベルで何かを計算する」段階で必要になってくる。
[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) の "Type Manipulation" 章と、[TSConfig Reference](https://www.typescriptlang.org/tsconfig/) が一次情報として一番まとまっている。

[1: before TypeScript](/blog/js-first-step/) → [2: TypeScript](/blog/ts-first-step/) → [3: Hono](/blog/hono-first-step/) → 今回 で「TypeScriptで動くものを作って、設定で守りを固める」ところまで来た。
次に何を学ぶかは、今書いているコードで一番困っているところに依存するので、自分の手元のコードを見て選んでほしい。
