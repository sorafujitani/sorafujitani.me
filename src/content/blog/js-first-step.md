---
title: "友達用JavaScript入門 - TypeScriptを始める前に"
description: "TypeScript入門の前提知識として、JavaScriptの構文・基本をまとめたメモ"
pubDate: 2026-05-04
tags: [javascript]
draft: false
---

[友達用TypeScript入門](/blog/ts-first-step/) の前提知識となるJavaScriptの基本をまとめた。
細かい話は省いて、TypeScript入門に出てくる構文を読み書きできるようになることを目標にしている。

最後まで読むと、型注釈なしで動くタスク管理ツールが作れる。そのまま [TypeScript入門](/blog/ts-first-step/) に進むと「同じコードに型を足していく話」として読めるはず。

## JavaScriptとは

ブラウザの中で動く言語として生まれて、Node.jsやBunといった実行環境のおかげでサーバ側でも動くようになった。今回は手元のターミナルで動かすので、Node.jsかBunが入っていれば始められる。

JavaScriptは型を書かない。変数や引数に「文字列が入るのか数値が入るのか」をコードに残せない。動かしてはじめてバグに気づく、というのが基本のスタイル。これを補うのがTypeScript。

## セットアップ

```bash
mkdir js-playground && cd js-playground
touch index.js
```

`index.js` にコードを書いて、以下のどちらかで実行する。

```bash
node index.js
# または
bun run index.js
```

## 変数

`const` と `let` の二つを覚えれば十分。

```js
const name = "mozumasu"; // 後から書き換えられない
let count = 0;           // 後から書き換えられる
count = 1;
```

`var` という古い書き方もあるが、使わなくていい。基本は `const`、書き換えが必要なときだけ `let`。

## プリミティブ値

最初に覚えるのは4つ。

```js
const name = "mozumasu";   // 文字列 (string)
const count = 25;          // 数値 (number)  整数も小数も同じ
const active = true;       // 真偽値 (boolean)  true / false
const empty = undefined;   // 値がないこと
```

`null` という似た値もあるが、まず `undefined` だけ覚えればいい。「まだ値が入っていない」「見つからなかった」というときに登場する。

## 演算子

```js
1 + 2;        // 3
3 - 1;        // 2
2 * 3;        // 6
10 / 2;       // 5
10 % 3;       // 1  (余り)

count++;      // count = count + 1 と同じ

"Hello, " + "world"; // "Hello, world"  (文字列連結)
"Age: " + 25;        // "Age: 25"       (数値が文字列に変換される)
```

最後の例がJavaScriptの落とし穴で、`+` は数値同士なら足し算、文字列が混ざると連結になる。`1 + "2"` は `"12"` で、これがバグの原因になりやすい。

## 比較

```js
1 === 1;   // true
1 === "1"; // false  (型が違う)
1 !== 2;   // true
2 > 1;     // true
2 >= 2;    // true
```

`==` と `===` の二つがあるが、迷わず `===`(`!==`) を使う。`==` は型を勝手に揃えてしまうので、`1 == "1"` が `true` になる。バグの温床なので使わない。

## 文字列

`"..."`、`'...'`、`` `...` `` のどれでも書ける。バッククォート(`` ` ``)を使うとテンプレートリテラルになり、`${...}` で式を埋め込める。

```js
const name = "mozumasu";

console.log("Hello, " + name);  // 連結
console.log(`Hello, ${name}`);  // テンプレートリテラル (こちらを推奨)
```

複数行も書ける。

```js
const message = `line 1
line 2`;
```

## 配列

複数の値を順番に並べて入れる箱。

```js
const scores = [90, 85, 78];

scores[0];       // 90  (添字は0から)
scores.length;   // 3

scores.push(60); // 末尾に追加 → [90, 85, 78, 60]
```

よく使うのは `push` と `find`、慣れてきたら `map` / `filter`。

```js
const found = scores.find((n) => n >= 80);
// 条件に合う最初の要素を返す。なければ undefined
```

`(n) => n >= 80` はアロー関数(後述)で、配列の各要素に対して呼ばれる「条件」を渡している。

## オブジェクト

`{ key: value }` の形でデータをまとめる。

```js
const user = {
  name: "mozumasu",
  level: 3,
  active: true,
};

user.name;       // "mozumasu"  (ドットでアクセス)
user.level = 4;  // 上書き
```

配列に入れることもできる。

```js
const users = [
  { name: "alice", level: 1 },
  { name: "bob",   level: 2 },
];
```

### ショートハンド記法

プロパティ名と変数名が同じなら省略できる。TypeScript入門のコードに出てくるので押さえておく。

```js
const title = "TypeScriptを学ぶ";
const done = false;

const task = { title: title, done: done };
const task = { title, done };  // ↑とまったく同じ意味
```

## 関数

宣言の仕方は2種類。挙動はほぼ同じなので好みでいい。

```js
// 関数宣言
function add(a, b) {
  return a + b;
}

// アロー関数
const add = (a, b) => a + b;

// アロー関数 (本体が複数行)
const add = (a, b) => {
  const result = a + b;
  return result;
};
```

呼び出し方はどちらも同じ。

```js
add(1, 2); // 3
```

返り値が必要ないときは `return` を書かない。

```js
function log(message) {
  console.log(message);
}
```

配列の `find` や `map` に渡すコールバックは、アロー関数で書くのが一般的。

```js
const ids = users.map((u) => u.level);
```

## 制御構文

### if / else

```js
if (count > 10) {
  console.log("多い");
} else if (count > 0) {
  console.log("ふつう");
} else {
  console.log("ない");
}
```

### 三項演算子

`条件 ? trueのとき : falseのとき` で短く書ける。

```js
const mark = task.done ? "✓" : " ";
```

### for...of

配列を順番に取り出すならこれが一番わかりやすい。

```js
const tasks = ["A", "B", "C"];

for (const task of tasks) {
  console.log(task);
}
```

`for (let i = 0; i < tasks.length; i++)` という古典的な書き方もあるけど、まずは `for...of` を覚えておけば困らない。

## undefined をどう扱うか

配列の `find` などは見つからないとき `undefined` を返す。これを意識しないとバグる。

```js
const tasks = [{ id: 1, title: "A" }];
const task = tasks.find((t) => t.id === 999); // 該当なし → undefined

console.log(task.title);
// TypeError: Cannot read properties of undefined (reading 'title')
```

なので `undefined` チェックを書く。

```js
if (task !== undefined) {
  console.log(task.title);
}
```

JavaScriptはこれを書き忘れても、実行するまでエラーにならない。TypeScriptはコードを書いた瞬間にこれをエラーにしてくれる。これが [TypeScript入門](/blog/ts-first-step/) のモチベーションの一つ。

## 動くものを作る: タスク管理ツール (JS版)

[TypeScript入門](/blog/ts-first-step/) で作るタスク管理ツールのJavaScript版。型注釈を取り除いた以外はほぼ同じ。

```js
const tasks = [];
let nextId = 1;

function addTask(title) {
  tasks.push({ id: nextId++, title, done: false });
  // { title: title } の省略記法
}

function completeTask(id) {
  const task = tasks.find((t) => t.id === id);

  if (task !== undefined) {
    task.done = true;
  }
}

function listTasks() {
  for (const task of tasks) {
    const mark = task.done ? "✓" : " ";
    console.log(`[${mark}] ${task.title}`);
  }
}

addTask("JavaScriptを学ぶ");
addTask("TypeScriptを学ぶ");
addTask("散歩に行く");

completeTask(1);

listTasks();
```

実行する。

```bash
node index.js
```

```
[✓] JavaScriptを学ぶ
[ ] TypeScriptを学ぶ
[ ] 散歩に行く
```

### JavaScriptが見逃すミスの例

```js
addTsk("テスト");       // 実行時に ReferenceError でクラッシュ
completeTask("1");      // クラッシュはしないが、completeされない
                        // ("1" === 1 が false なので find が undefined を返す)
```

前者は実行するまで気づけない。後者はクラッシュもせず、ただ静かに動かないだけなのでもっと厄介。これらを書いた瞬間に検出してくれるのが [TypeScript入門](/blog/ts-first-step/) で扱う型注釈。

## 今回触れなかったこと

- `class` / `prototype`
- `async` / `await` と `Promise` (非同期処理)
- `try` / `catch` (例外処理)
- `import` / `export` (モジュール)
- `Map` / `Set`
- 分割代入 (`const { name } = user`)
- スプレッド構文 (`...args`)

[MDN JavaScript ガイド](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide) が網羅的で一番まとまっている。

ここまで来たら [TypeScript入門](/blog/ts-first-step/) に進んでみてください。
