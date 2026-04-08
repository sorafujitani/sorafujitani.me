---
title: "友達用TypeScript入門"
description: "細かい話は省いて、まず書けること・動くものを作れることを重視した入門メモ"
pubDate: 2026-04-08
tags: [typescript]
draft: false
---

友達に向けたTypeScript入門向けのまとめ。
TypeScriptの詳細には踏み込んでいない。
最後までがんばると、簡単なタスク管理CLIが作れるようになるよ。

## TypeScriptとは

JavaScriptに型注釈を追加したもの。

```js
// JavaScript
function add(a, b) {
  return a + b;
}
```

```ts
// TypeScript
function add(a: number, b: number): number {
  return a + b;
}
```

`: number` の部分が型注釈で、「この引数は数値」「この関数は数値を返す」という情報を書いている。

TypeScriptのコードは実行時にJavaScriptへ変換（トランスパイル）される。このとき型注釈は全て消える。つまりTypeScriptは「書いている最中にチェックしてくれる仕組み」であって、実行時の動作はJavaScriptそのもの。

型注釈があると、コードを書いた時点でバグを見つけてくれる。

```ts
add(1, "2"); // エラー: Argument of type 'string' is not assignable to parameter of type 'number'
```

JavaScriptでこれを実行すると `"12"` が返る（文字列の連結になる）。バグだけど実行するまでわからない。TypeScriptはファイルを保存した瞬間にエディタ上でエラーにしてくれる。

もう一つの利点として、エディタの補完が効くようになる。型情報があるおかげで変数にドット `.` を打った時点でプロパティの候補が表示される。これは後述する `interface` を使うと特に便利になる。

## セットアップ

Node.jsまたはBunが入っていれば始められる。

```bash
mkdir ts-playground && cd ts-playground
bun init
```

`tsconfig.json` と `index.ts` が生成される。`index.ts` にコードを書いて `bun run index.ts` で実行できる。

## 型を書く

### プリミティブ型

最初に覚える型は4つ。

```ts
const name: string = "mozumasu";
const count: number = 25;            // 整数・小数どちらもこれ
const active: boolean = true;
const scores: number[] = [90, 85]; // 配列は型の後ろに []
```

### interface

オブジェクト（`{ key: value }` の形のデータ）には `interface` で形を定義する。

```ts
interface User {
  name: string;
  level: number;
  active: boolean;
}

const user: User = {
  name: "mozumasu",
  level: 3,
  active: true,
};
```

`interface` で形を定義しておくと二つの恩恵がある。

一つは、存在しないプロパティを参照したときにエラーになること。

```ts
console.log(user.naem); // エラー: 'naem' は 'User' に存在しない。'name' では？
```

もう一つは、同じ形のオブジェクトを複数の場所で使い回せること。関数の引数にも使える。

```ts
function greetUser(user: User): string {
  return "Hello, " + user.name;
}
```

`User` という型を一箇所で定義して、変数にも関数の引数にも使う。形が変わったら定義を直すだけで、使っている箇所に矛盾があればTypeScriptがエラーにしてくれる。

## 関数の型注釈

引数の後ろに `: 型`、引数リストを囲む `)` の後ろに `: 返り値の型` を書く。

```ts
function greet(name: string): string {
  return "Hello, " + name;
}

function add(a: number, b: number): number {
  return a + b;
}

// 返り値がない関数には void を使う（プリミティブ型4つに加えて、関数の返り値専用の型）
function log(message: string): void {
  console.log(message);
}
```

アロー関数も同じ。

```ts
const double = (n: number): number => n * 2;
```

### 型推論: いつ書いて、いつ省略するか

TypeScriptは代入された値から型を推測できる（型推論）。

```ts
const name = "mozumasu"; // string と推論される
const count = 25;    // number と推論される
```

判断基準:

- **関数の引数**: 必ず書く（推論できないので省略不可）
- **関数の返り値**: 最初のうちは書いておくのが安全。意図しない値を返したときにすぐ気づける
- **変数**: 代入と同時に定義するなら省略でいい

どうしても解決できない型エラーが出たら `as any` を使って先に進めばいい。後で戻って直せる。

## 動くものを作る: タスク管理ツール

ここまでの知識でタスク管理ツールが作れる。タスクを追加・完了・一覧表示する。

### データ構造を決める

まず `interface` でタスクの形を定義する。

```ts
interface Task {
  id: number;
  title: string;
  done: boolean;
}
```

### 処理を書く

タスクの配列と、それを操作する関数を用意する。

```ts
const tasks: Task[] = [];
let nextId = 1;

function addTask(title: string): void {
  tasks.push({ id: nextId++, title, done: false });
  // ↑ { title: title } の省略記法。変数名とプロパティ名が同じなら省略できる
}

function completeTask(id: number): void {
  const task = tasks.find((t) => t.id === id);
  // find は条件に合う要素を配列から探す
  // 見つからない可能性があるので、返り値の型は Task | undefined になる

  if (task !== undefined) {
    task.done = true;
  }
  // ↑ undefined チェックを省略すると型エラーになる
  // 「task が undefined かもしれないのに .done にアクセスするな」という意味
}

function listTasks(): void {
  for (const task of tasks) {
    const mark = task.done ? "✓" : " ";
    console.log(`[${mark}] ${task.title}`);
  }
}
```

`find` の返り値が `Task | undefined` になるのは実務でもよく出てくるパターン。`| undefined` は「この値は `undefined` かもしれない」という意味で、`Task` または `undefined` のどちらかであることを表す。

TypeScriptは `undefined` かもしれない値に対して、チェックなしでプロパティを参照することを許可しない。

```ts
// これは型エラーになる
const task = tasks.find((t) => t.id === id);
task.done = true; // エラー: 'task' is possibly 'undefined'
```

`if (task !== undefined)` を書くことで、そのブロック内では `task` が `Task` であることが確定し、`.done` にアクセスできるようになる。

### 実行する

```ts
addTask("TypeScriptを学ぶ");
addTask("ブログ記事を書く");
addTask("散歩に行く");

completeTask(1);

listTasks();
```

```bash
bun run index.ts
```

```
[✓] TypeScriptを学ぶ
[ ] ブログ記事を書く
[ ] 散歩に行く
```

### TypeScriptに検出してもらえるミスの例

```ts
addTsk("テスト");       // エラー: 'addTsk' は存在しない。'addTask' では？
completeTask("1");      // エラー: string は number に割り当てられない
```

JavaScriptだと前者は `addTsk is not defined` として実行時にクラッシュ、後者は `id` の比較が壊れたまま動き続ける。TypeScriptはどちらもコードを書いた時点で検出する。

## 今回触れなかったこと

- `generic`（`Array<T>` の書き方）
- `Partial` / `Required` / `Readonly` などのユーティリティ型
- 型の継承（`extends`）
- `.d.ts` ファイルの仕組み
- `as const` / `satisfies` 演算子

[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) が公式で一番まとまっている。
