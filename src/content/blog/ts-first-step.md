---
title: "友達用TypeScript入門2 - TypeScript"
description: "細かい話は省いて、まず書けること・動くものを作れることを重視した入門メモ"
pubDate: 2026-05-11
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

[前回](/blog/js-first-step/) はJS用に `js-playground` を作った。今回からはTypeScript用に `ts-playground` を新しく作って、ここを **第3章 (Hono) と第4章 (型と tsconfig) でもそのまま使い回す**。
追加で掘るのは新しいファイルだけ。サブディレクトリは作らない、フラットに並べていくのが今回のシリーズの作業ルール。

```bash
mkdir ts-playground && cd ts-playground
bun init -y                  # package.json / tsconfig.json / index.ts が生成される
```

`bun init -y` の生成物に `index.ts` が含まれているので、追加で `touch` する必要もない。`index.ts` にコードを書いて `bun run index.ts` で実行できる。

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

## 動くものをテストする: vitest

ここまでで作ったタスク管理ツールは、毎回 `bun run index.ts` を叩いて `console.log` を目視で読むことでしか確認できない。「タスクが本当に追加されたか」「`completeTask` で `done` が `true` になっているか」を、コードで検証してワンコマンドで一覧できるようにしておきたい。それが **テスト** の役割。

ここでは `vitest` という定番のテストランナーを使う。BunのプロジェクトでもそのままTypeScriptで動く。

### 関数を別ファイルから呼べるようにする

今の `index.ts` は「関数の定義」と「関数の呼び出し（実行例）」が同じファイルに同居している。テストファイルから関数を呼ぶには、関数を **別ファイルから読み込める形** にしておく必要がある。

ロジックを `tasks.ts` に切り出して、`index.ts` はそれを使うだけにする。

```ts
// tasks.ts
export interface Task {
  id: number;
  title: string;
  done: boolean;
}

export const tasks: Task[] = [];
let nextId = 1;

export function addTask(title: string): void {
  tasks.push({ id: nextId++, title, done: false });
}

export function completeTask(id: number): void {
  const task = tasks.find((t) => t.id === id);
  if (task !== undefined) {
    task.done = true;
  }
}

export function listTasks(): void {
  for (const task of tasks) {
    const mark = task.done ? "✓" : " ";
    console.log(`[${mark}] ${task.title}`);
  }
}

// テストごとに状態を初期化したい時用
export function resetTasks(): void {
  tasks.length = 0;
  nextId = 1;
}
```

```ts
// index.ts
import { addTask, completeTask, listTasks } from "./tasks";

addTask("TypeScriptを学ぶ");
addTask("ブログ記事を書く");
addTask("散歩に行く");

completeTask(1);

listTasks();
```

`export` は「このファイルから外に出す」、`import` は「他のファイルから取り込む」宣言。詳しくは次回（Hono編）で改めて触れるので、今は「テストファイルから関数を呼ぶための準備」と捉えてくれればOK。

この時点で `bun run index.ts` の出力は前と同じはず。挙動は変えていない。

### vitest を入れる

```bash
bun add -D vitest
```

`-D` は **開発時にしか使わない依存** を意味するフラグ。本番ビルドには含めない `devDependencies` に入る。テストランナーは開発時にしか動かさないのでここに入れる。

### テストを書く

`tasks.test.ts` を作る。vitest はファイル名の末尾が `.test.ts` (または `.spec.ts`) のファイルを自動でテストとして拾ってくれる。

```ts
// tasks.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { tasks, addTask, completeTask, resetTasks } from "./tasks";

describe("tasks", () => {
  beforeEach(() => {
    resetTasks(); // 前のテストで足したタスクが残らないようにする
  });

  it("addTask で配列にタスクが増える", () => {
    addTask("買い物");
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe("買い物");
    expect(tasks[0].done).toBe(false);
  });

  it("addTask は id を 1 から連番で振る", () => {
    addTask("a");
    addTask("b");
    expect(tasks[0].id).toBe(1);
    expect(tasks[1].id).toBe(2);
  });

  it("completeTask で対応するタスクの done が true になる", () => {
    addTask("掃除");
    completeTask(1);
    expect(tasks[0].done).toBe(true);
  });

  it("存在しない id を completeTask しても落ちない", () => {
    addTask("洗濯");
    completeTask(999);
    expect(tasks[0].done).toBe(false);
  });
});
```

主要な部品を1つずつ。

- `describe(name, fn)`: 関連するテストをまとめるブロック。出力が読みやすくなる。
- `it(name, fn)`: テスト1ケース。`test` でも同じ意味。
- `expect(value).toBe(...)`: 期待値と一致するか検証する。`toBe` は厳密等価（`===`）。オブジェクトや配列の中身を比較したい時は `toEqual` を使う。
- `beforeEach(fn)`: 各 `it` の前に毎回呼ばれるフック。`tasks` のような **状態を持つコード** をテストするときは「テストごとに状態をリセット」が定番。これを怠ると、前のテストで足したタスクが次のテストに残って、テストが順序依存になってしまう。

### 実行する

```bash
bun x vitest
```

`bun x` は **インストール済みパッケージのコマンドを実行** する。`vitest` はファイル変更を監視して自動で再実行するwatchモードで立ち上がる。1回だけ走らせたい時は `bun x vitest run`。

```
 ✓ tasks.test.ts (4)
   ✓ tasks (4)
     ✓ addTask で配列にタスクが増える
     ✓ addTask は id を 1 から連番で振る
     ✓ completeTask で対応するタスクの done が true になる
     ✓ 存在しない id を completeTask しても落ちない

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

全部 ✓ になれば成功。

### わざと壊して赤を見る

テストが赤くなる体験もしておくと感覚が掴める。`tasks.ts` の `completeTask` をわざと壊す。

```ts
export function completeTask(id: number): void {
  const task = tasks.find((t) => t.id === id);
  if (task !== undefined) {
    task.done = false; // ← わざと true ではなく false にしてみる
  }
}
```

watchモードのままなので、保存すると即座に再実行されて、

```
 ❯ tasks.test.ts (4)
   ❯ tasks (4)
     ✓ addTask で配列にタスクが増える
     ✓ addTask は id を 1 から連番で振る
     ✗ completeTask で対応するタスクの done が true になる
       AssertionError: expected false to be true
     ✓ 存在しない id を completeTask しても落ちない
```

「どのテストが」「何を期待していて」「実際は何だったか」が一目でわかる。修正して保存すれば即座に緑に戻る。テストがあると、壊した瞬間に気づけるし、直した瞬間に確認できる。

### package.json に script を足しておく

毎回 `bun x vitest` を手で打つのは面倒なので、`package.json` の `scripts` に登録しておく。

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

```bash
bun run test       # watchモード
bun run test:run   # 1回だけ走らせて終わる（CIや「サクッと全部通るか確認」向け）
```

ここまで来ると、開発中は別ターミナルで `bun run test` を立ち上げっぱなしにしておいて、コードを書きながらテストが緑のままか見続ける、という流れになる。これがTypeScriptの型チェック（書いた瞬間にエラーがわかる）の **動作レベル版**。型では拾えない「ロジックが意図通り動くか」をテストでカバーする、という分担になる。

## 今回触れなかったこと

- `generic`（`Array<T>` の書き方）
- `Partial` / `Required` / `Readonly` などのユーティリティ型
- 型の継承（`extends`）
- `.d.ts` ファイルの仕組み
- `as const` / `satisfies` 演算子

[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) が公式で一番まとまっている。
