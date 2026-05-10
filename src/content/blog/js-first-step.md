---
title: "友達用TypeScript入門1 - before TypeScript"
description: "TypeScript入門の前提知識として、JavaScriptの構文・基本をまとめたメモ"
pubDate: 2026-05-12
tags: [javascript]
draft: false
---

[友達用TypeScript入門](/blog/ts-first-step/) の前提知識となるJavaScriptの基本をまとめた。
細かい話は省いて、TypeScript入門に出てくる構文を読み書きできるようになることを目標にしている。

各セクションのコードは `index.js` の中身に貼り付けて、そのつど実行しながら読むのがおすすめ。読むだけより、出力を見ながら進めたほうが頭に入る。

最後まで読むと、型注釈なしで動くタスク管理ツールが作れる。そのまま [TypeScript入門](/blog/ts-first-step/) に進むと「同じコードに型を足していく話」として読めるはず。

## JavaScriptとは

ブラウザの中で動く言語として生まれて、Node.jsやBunといった実行環境のおかげでサーバ側でも動くようになった。今回は手元のターミナルで動かすので、Node.jsかBunが入っていれば始められる。

JavaScriptは型を書かない。変数や引数に「文字列が入るのか数値が入るのか」をコードに残せない。動かしてはじめてバグに気づく、というのが基本のスタイル。これを補うのがTypeScript。

## セットアップ

```bash
mkdir js-playground && cd js-playground
touch index.js
```

まずは環境チェック。`index.js` を以下の内容にする。

```js
console.log("Hello, world");
```

実行する。

```bash
node index.js
# または
bun run index.js
```

```
Hello, world
```

これが出れば準備OK。以降のコードはすべて `index.js` の中身をまるごと書き換えて、同じコマンドで実行できる。**1セクションごとに動かしながら**進めるのが一番理解が早い。

## 変数

`const` と `let` の二つを覚えれば十分。

```js
const name = "mozumasu"; // 後から書き換えられない
let hp = 100;            // 後から書き換えられる
hp = 80;                 // ダメージを受けた

console.log(name);
console.log(hp);
```

```
mozumasu
80
```

`var` という古い書き方もあるが、使わなくていい。基本は `const`、書き換えが必要なときだけ `let`。

ためしに `const name = "mozumasu";` の次の行に `name = "other";` を足して実行すると `TypeError: Assignment to constant variable.` で落ちる。`const` で守られていることが確認できる。

## プリミティブ値

最初に覚えるのは4つ。

```js
const name = "mozumasu";   // 文字列 (string)
const hp = 100;            // 数値 (number)  整数も小数も同じ
const active = true;       // 真偽値 (boolean)  true / false
const empty = undefined;   // 値がないこと

console.log(name, hp, active, empty);
```

```
mozumasu 100 true undefined
```

`null` という似た値もあるが、まず `undefined` だけ覚えればいい。「まだ値が入っていない」「見つからなかった」というときに登場する。

## 演算子

```js
console.log(1 + 2);   // 3
console.log(3 - 1);   // 2
console.log(2 * 3);   // 6
console.log(10 / 2);  // 5
console.log(10 % 3);  // 1  (余り)

let hp = 0;
hp++;                 // hp = hp + 1 と同じ
console.log(hp);

console.log("Hello, " + "world"); // 文字列連結
console.log("Age: " + 25);        // 数値が文字列に変換される
console.log(1 + "2");             // 落とし穴
```

```
3
2
6
5
1
1
Hello, world
Age: 25
12
```

最後の `1 + "2"` がJavaScriptの落とし穴で、`+` は数値同士なら足し算、文字列が混ざると連結になる。結果が `3` ではなく `"12"` になっているのを実際の出力で確認しておくといい。

## 比較

```js
console.log(1 === 1);   // true
console.log(1 === "1"); // false  (型が違う)
console.log(1 !== 2);   // true
console.log(2 > 1);     // true
console.log(2 >= 2);    // true
```

```
true
false
true
true
true
```

`==` と `===` の二つがあるが、迷わず `===`(`!==`) を使う。`==` は型を勝手に揃えてしまうので、`1 == "1"` が `true` になる。バグの温床なので使わない。

## 文字列

`"..."`、`'...'`、`` `...` `` のどれでも書ける。バッククォート(`` ` ``)を使うとテンプレートリテラルになり、`${...}` で式を埋め込める。

```js
const name = "mozumasu";

console.log("Hello, " + name);  // 連結
console.log(`Hello, ${name}`);  // テンプレートリテラル (こちらを推奨)
```

```
Hello, mozumasu
Hello, mozumasu
```

複数行も書ける。

```js
const message = `line 1
line 2`;

console.log(message);
```

```
line 1
line 2
```

## 配列

複数の値を順番に並べて入れる箱。

```js
const scores = [90, 85, 78];

console.log(scores[0]);     // 添字は0から
console.log(scores.length); // 要素数

scores.push(60);            // 末尾に追加
console.log(scores);
```

```
90
3
[ 90, 85, 78, 60 ]
```

よく使うのは `push` と `find`、慣れてきたら `map` / `filter`。

```js
const scores = [90, 85, 78];

const found = scores.find((n) => n >= 80);
// 条件に合う最初の要素を返す。なければ undefined

console.log(found);
```

```
90
```

`(n) => n >= 80` はアロー関数(後述)で、配列の各要素に対して呼ばれる「条件」を渡している。

## オブジェクト

`{ key: value }` の形でデータをまとめる。

```js
const user = {
  name: "mozumasu",
  hp: 100,
  active: true,
};

console.log(user.name);   // ドットでアクセス
user.hp = 80;             // 上書き (ダメージを受けた)
console.log(user.hp);
```

```
mozumasu
80
```

配列に入れることもできる。

```js
const users = [
  { name: "alice", hp: 100, active: true },
  { name: "bob",   hp: 80,  active: true },
];

console.log(users[0].name);
console.log(users[1].hp);
```

```
alice
80
```

### ショートハンド記法

プロパティ名と変数名が同じなら省略できる。TypeScript入門のコードに出てくるので押さえておく。

```js
const title = "TypeScriptを学ぶ";
const done = false;

const taskA = { title: title, done: done }; // 普通の書き方
const taskB = { title, done };              // 同じ意味のショートハンド

console.log(taskA);
console.log(taskB);
```

```
{ title: 'TypeScriptを学ぶ', done: false }
{ title: 'TypeScriptを学ぶ', done: false }
```

中身が同じになっているのを実際の出力で確認しておくと「省略できる」が腹落ちしやすい。

## 関数

宣言の仕方は2種類。挙動はほぼ同じなので好みでいい。以下3つは「足し算をする `add`」を書き方違いで並べただけ。

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

3つを同時に貼ると `add` が重複してエラーになるので、実行するときは1つだけ選んで貼る。

```js
function add(a, b) {
  return a + b;
}

console.log(add(1, 2));
console.log(add(10, 5));
```

```
3
15
```

返り値が必要ないときは `return` を書かない。

```js
function log(message) {
  console.log(message);
}

log("hello");
log("world");
```

```
hello
world
```

配列の `find` や `map` に渡すコールバックは、アロー関数で書くのが一般的。

```js
const users = [
  { name: "alice", hp: 100, active: true },
  { name: "bob",   hp: 80,  active: true },
];

const hps = users.map((u) => u.hp);
console.log(hps);
```

```
[ 100, 80 ]
```

## 制御構文

### if / else

```js
const hp = 5;

if (hp > 50) {
  console.log("元気");
} else if (hp > 0) {
  console.log("ピンチ");
} else {
  console.log("倒れた");
}
```

```
ピンチ
```

`hp` の値を `100` や `0` に変えて再実行すると、別の分岐に入るのが見える。

### 三項演算子

`条件 ? trueのとき : falseのとき` で短く書ける。

```js
const done = true;
const mark = done ? "✓" : " ";

console.log(`[${mark}] task`);
```

```
[✓] task
```

### for...of

配列を順番に取り出すならこれが一番わかりやすい。

```js
const tasks = ["A", "B", "C"];

for (const task of tasks) {
  console.log(task);
}
```

```
A
B
C
```

`for (let i = 0; i < tasks.length; i++)` という古典的な書き方もあるけど、まずは `for...of` を覚えておけば困らない。

## undefined をどう扱うか

配列の `find` などは見つからないとき `undefined` を返す。これを意識しないとバグる。

```js
const tasks = [{ id: 1, title: "A" }];
const task = tasks.find((t) => t.id === 999); // 該当なし → undefined

console.log(task.title);
```

実行すると、

```
TypeError: Cannot read properties of undefined (reading 'title')
```

でクラッシュする。これを防ぐには `undefined` チェックを書く。

```js
const tasks = [{ id: 1, title: "A" }];
const task = tasks.find((t) => t.id === 999);

if (task !== undefined) {
  console.log(task.title);
} else {
  console.log("not found");
}
```

```
not found
```

JavaScriptはこのチェックを書き忘れても、実行するまでエラーにならない。TypeScriptはコードを書いた瞬間にエラーにしてくれる。これが [TypeScript入門](/blog/ts-first-step/) のモチベーションの一つ。

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

```bash
node index.js
```

```
[✓] JavaScriptを学ぶ
[ ] TypeScriptを学ぶ
[ ] 散歩に行く
```

ここまで出てきた要素(`const`/`let`、配列、オブジェクト、関数、`for...of`、三項演算子、undefinedチェック)が一通り入っている。動いたら、`completeTask(1)` を `completeTask(2)` にしたり、新しいタスクを足したりして挙動を確認すると理解が定着する。

### JavaScriptが見逃すミスの例

タスク管理ツールの最後に、わざと壊した行を足してみる。

```js
// listTasks() の前に追加
addTsk("テスト");       // 実行時に ReferenceError でクラッシュ
completeTask("1");      // クラッシュはしない (が、completeされない)
```

前者は実行するまで気づけない。後者はクラッシュもせず、ただ静かに動かないだけなのでもっと厄介(`"1" === 1` が `false` なので `find` が `undefined` を返し、`if` で弾かれて何も起こらない)。これらを書いた瞬間に検出してくれるのが [TypeScript入門](/blog/ts-first-step/) で扱う型注釈。

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
