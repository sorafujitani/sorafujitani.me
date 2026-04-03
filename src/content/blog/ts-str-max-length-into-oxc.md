---
title: "TypeScriptで使えるキーワードの中で一番長いのはconstructorで11文字"
description: ""
pubDate: 2026-04-03
tags: [TypeScript, parser , oxc]
draft: false
---

実装中にコードを見て興味が湧いた内容をパッと調べたやつです。

タイトルの通り、TypeScriptで現在利用できるキーワードの中で、最も長い文字数なのは`constructor`の11文字のようです。
どうでもいいかも

一つ留意点で、ECMAScriptではconstructorは予約語ではなく通常の識別子として扱われ TypeScriptコンパイラが独自にキーワードトークンとして登録しています。
話のスコープがEcmaScriptではなくTypeScriptだという話です。
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar

## 調べたきっかけ
OXCの実装をしていた関係でoxc-parserのコードを見ていました。
発端はこのcrates/oxc_parser/src/lexer/kind.rs#L447-L449 に記述されている早期return文です。
条件にマッチした場合に、Identを返却してユーザー定義の字句であるとlexerがtoken生成を行います。
https://github.com/sorafujitani/oxc/blob/4a180d46c1e2524992649b85df2a9e980ac4fc12/crates/oxc_parser/src/lexer/kind.rs#L447-L449

| 条件 | 意味 |
| ---- | ---- |
| `len <= 1` | 1文字以下 |
| `len >= 12` | 12文字以上 |
| `!is_ascii_lowercase()` | 先頭が小文字アルファベットでない | 

## なぜ12文字以上なのか
oxc の match_keyword_impl に登録されている最長キーワードは constructorの11文字です。
これ以上の12文字以上の文字列は絶対にキーワードにならないので、len >= 12 で即座に Ident を返します。
https://github.com/sorafujitani/oxc/blob/4a180d46c1e2524992649b85df2a9e980ac4fc12/crates/oxc_parser/src/lexer/kind.rs#L550

MDNのキーワード一覧でも、constructorが最長文字数のようです。
https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Lexical_grammar

synchronized（12文字）というキーワードが EcmaScript1~3 で存在していたようですが、現在の実装では使われておらず、oxc-parserとしても対応していないようです。
ESMでは `const synchronized = "hello";` も有効です。
https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Lexical_grammar
https://www.tutorialrepublic.com/javascript-reference/javascript-reserved-keywords.php



## なぜこの条件があるか
ここからは番外編で、実装意図への考察です。
結論は、パフォーマンス最適化です

### レキサーが処理する量

レキサーはソースコード内の**全ての識別子**に対して「これはキーワードか？」を判定します。
Expressの例

```typescript
const express = require("express");
const app = express();

app.get("/users/:id", authenticateMiddleware, async (req, res) => {
    const userRepository = new UserRepository(databaseConnection);
    const validationResult = validateRequestParams(req.params);
    res.json(await userRepository.findById(req.params.id));
});
```
識別子の大半は authenticateMiddleware、userRepository、databaseConnection、validateRequestParams のような長い変数名・関数名。これらは絶対にキーワードではないと判定できます。
これにより、長い識別子や大文字始まりのクラス名が、整数比較とバイト比較だけで即座にスキップされます。

### #[cold] アノテーション

```rs
#[cold]
pub fn match_keyword(s: &str) -> Self {
```

#[cold] は「この関数はあまり呼ばれない」というヒントです。コンパイラはこの関数をホットパスから離れた場所に配置し、呼び出し元の命令キャッシュ効率を上げます。キーワードより識別子の方がはるかに多いので、キーワードマッチング自体が cold path です。
https://doc.rust-lang.org/reference/attributes/codegen.html
