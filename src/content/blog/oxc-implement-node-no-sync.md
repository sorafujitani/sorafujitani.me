---
title: "OxlintのESLint互換ルールを実装する"
description: "OxlintにESLint互換ルールを実装した経験をもとに、ASTの探索方法やテストの実行方法を解説します。"
pubDate: 2026-08-25
tags: [Rust, TypeScript, lint, OSS, Oxc]
draft: false
---

VIVANTとイコラブで夏を消化してます。  
[fujitani sora](https://x.com/sorafujitani)です。

---

oxlintにいくつかPRを出してmergeされているので、実装や学びについてまとめます。

<https://github.com/oxc-project/oxc/pull/23589>

oxcは、Rustで書かれた高速なJavaScript/TypeScriptツールチェーンです。  
ParserやLinterなど複数のツールを提供しており、そのうちLinterにあたるのがoxlintです。

Node.js向けESLintルールの一つである`no-sync` の基本的な仕様を確認したうえで、  
oxlintへの互換実装でどのようにASTを探索してルールを実装したのかを解説します。

<https://oxc.rs/docs/guide/usage/linter>

## no-sync ルールとは

Node.jsには、`fs.readFileSync` のように名前が `Sync` で終わる同期メソッドがあります。  
`eslint-plugin-n` の `no-sync` は、こうした同期メソッドの呼び出しを検出するルールです。

### なぜ同期メソッドを使ってはいけないのか

Node.jsでは、JavaScriptの処理を主にイベントループ上で実行します。I/Oを非同期で処理することで、待ち時間にも別の処理を進められます。

一方、`fs.readFileSync` のような同期メソッドを呼び出すと、ファイルの読み込みが終わるまでイベントループがブロックされます。

```javascript
const fs = require("fs");

// NG 同期メソッド: 読み込みが終わるまで他の処理が全て止まる
const data = fs.readFileSync("/path/to/file");

// OK 非同期メソッド: 読み込み中も他の処理を継続できる
fs.readFile("/path/to/file", (err, data) => {
  // ...
});
```

> 解説をシンプルにする為にCommonJSの `require()` を使っていますが、`no-sync` はCommonJS専用のルールではありません。  
> ES Modulesで `import * as fs from "node:fs"` と書いた場合も、同じ同期メソッドの呼び出しが検出対象になります。  
> ES Modulesについては[Node.js公式ドキュメント](https://nodejs.org/api/esm.html)、ルールの詳細は[`eslint-plugin-n`のドキュメント](https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-sync.md)を参照してください。

Webサーバーで同期メソッドを使うと、あるリクエストのI/Oが終わるまで、ほかのリクエストも処理を待たされる可能性があります。

そのため、Node.jsでは基本的に非同期メソッドの利用が推奨されます。同期メソッドの呼び出しを静的解析で見つけるのが `no-sync` です。

### ルールの仕様

このルールは、呼び出し先の関数名やプロパティ名が `Sync` で終わっている場合に警告します。

利用できるオプションは次の2つです。

- `allowAtRootLevel`: `true` にすると、ファイルのトップレベルにある同期メソッドの呼び出しを許可します。CLIツールの起動時やスクリプトの初期化処理など、同期処理を許容できる場面で使います。
- `ignores`: 警告の対象から外す関数名を、文字列の配列で指定します。これは今回Oxlintに実装した形式です。

## oxc（oxlint）のLint処理

実装を見る前に、oxlintがソースコードを解析する流れを確認します。Lint処理は、大きく次の3段階に分かれます。

1. Parser: ソースコードを字句解析・構文解析し、AST（抽象構文木）を生成する。
2. Semantic Analyzer: ASTをトラバースし、スコープ（変数の有効範囲）やシンボル（変数の定義と参照）の情報を構築する。
3. Linter: ASTの各ノードを巡回しながら、各ルールのチェック処理を実行する。

oxcのLintルールは、`Rule` トレイトを実装して定義します。  
各ルールの `run` メソッドは、ASTノード（`AstNode`）と解析情報を持つコンテキスト（`LintContext`）を受け取ります。

```rust
impl Rule for NoSync {
    fn run<'a>(&self, node: &AstNode<'a>, ctx: &LintContext<'a>) {
        // ここにルールのロジックを書く
    }
}
```

<https://github.com/oxc-project/oxc/blob/46f362530da1c2c5e868613e339999314b9f3a72/crates/oxc_linter/src/rules/node/no_sync.rs#L74-L98>

ルールを呼び出す `RuleRunner` は、生成コード側に実装されています。`NoSync` では対象ノードが `CallExpression` に限定されているため、関数呼び出しを表すASTノードに対してだけ `run` が呼ばれます。

`LintContext` を使うと、Semantic Analyzerが構築したスコープ情報の参照や、`ctx.diagnostic()` による違反の報告ができます。

### ルール実装の基本構造

oxlintのルールを読むときは、ASTを調べる `run` だけでなく、設定や診断、テストを含めた全体の役割を意識すると理解しやすくなります。

今回追加した[`no_sync.rs`](https://github.com/oxc-project/oxc/blob/46f362530da1c2c5e868613e339999314b9f3a72/crates/oxc_linter/src/rules/node/no_sync.rs)は、概略として次の構造になっています。

```text
no_sync.rs
├─ no_sync_diagnostic  違反時のメッセージと表示範囲を作る
├─ NoSyncConfig        ルールのオプションを定義する
├─ NoSync              ルール本体と設定を保持する
├─ declare_oxc_lint!   名前やプラグインなどのメタデータを宣言する
├─ impl Rule           設定の読み込みとASTノードの検査を行う
├─ 補助関数            runから探索処理を切り出す
└─ test                 正常系と違反ケースを検証する
```

設定は、JavaScript側のキャメルケースをRust側のスネークケースへ変換して受け取ります。

```rust
#[derive(Debug, Default, Clone, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
struct NoSyncConfig {
    allow_at_root_level: bool,
    ignores: FxHashSet<CompactStr>,
}
```

<https://github.com/oxc-project/oxc/blob/46f362530da1c2c5e868613e339999314b9f3a72/crates/oxc_linter/src/rules/node/no_sync.rs#L22-L32>

`declare_oxc_lint!` には、ルール名、所属プラグイン、カテゴリ、設定型などを宣言します。`Rule` トレイトの実装では、`from_configuration` が設定を読み込み、`run` が対象のASTノードを検査します。違反を見つけたら、最後に `ctx.diagnostic()` へ診断情報を渡します。

```text
設定を読み込む
  ↓
対象のASTノードでrunを呼ぶ
  ↓
違反条件を調べる
  ↓
ctx.diagnostic()で報告する
```

ルールファイルの末尾には、警告しない `pass` と警告する `fail` のケースを並べたテストも置かれています。実装時は、検出したいコードだけでなく、似ているものの検出してはいけないコードも用意することが重要です。

## no-sync ルールの実装詳細

ここからは、この基本構造のうち `run` とAST探索の処理を順に見ていきます。

### 1. CallExpressionに絞り込む

最初に、対象ノードが関数呼び出しを表す `AstKind::CallExpression` かどうかを確認します。

```rust
fn run<'a>(&self, node: &AstNode<'a>, ctx: &LintContext<'a>) {
    let AstKind::CallExpression(call_expr) = node.kind() else {
        return;
    };

    // ...
}
```

たとえば、次のコードを考えます。

```javascript
fs.readFileSync("/path/to/file");
```

この呼び出しは、概略として次のようなASTになります。

```text
CallExpression
├─ callee: StaticMemberExpression
│  ├─ object: Identifier("fs")
│  └─ property: Identifier("readFileSync")
└─ arguments
   └─ StringLiteral("/path/to/file")
```

この段階で `run` が受け取るのは、全体を表す `CallExpression` です。ここから `call_expr.callee` を取り出し、呼び出し先の式を詳しく調べます。

### 2. Syncで終わる名前を探す

次に、呼び出し先（`callee`）の関数名やプロパティ名が `Sync` で終わるかを判定します。

JavaScriptでは呼び出し方に複数の形式があるため、`get_sync_property_name` 関数で式を再帰的に探索します。

```rust
fn get_sync_property_name<'a>(expr: &'a Expression<'a>) -> Option<&'a str> {
    match expr.get_inner_expression() {
        // 1. fooSync() のような単純な識別子
        Expression::Identifier(ident) if ident.name.as_str().ends_with("Sync") => {
            Some(ident.name.as_str())
        }
        // 2. fs.fooSync() のような静的プロパティアクセス
        Expression::StaticMemberExpression(member) => {
            if member.property.name.as_str().ends_with("Sync") {
                Some(member.property.name.as_str())
            } else {
                get_sync_property_name(&member.object)
            }
        }
        // 3. fs["fooSync"]() のような動的プロパティアクセス
        Expression::ComputedMemberExpression(member) => {
            if let Some(name) = member.static_property_name()
                && name.as_str().ends_with("Sync")
            {
                return Some(name.as_str());
            }
            get_sync_property_name(&member.object)
        }
        _ => None,
    }
}
```

<https://github.com/oxc-project/oxc/blob/46f362530da1c2c5e868613e339999314b9f3a72/crates/oxc_linter/src/rules/node/no_sync.rs#L100-L122>

探索対象は、単純な識別子、静的なプロパティアクセス、動的なプロパティアクセスの3種類です。

| 呼び出し | `callee` のAST | 調べる名前 |
| --- | --- | --- |
| `fooSync()` | `Identifier` | `fooSync` |
| `fs.fooSync()` | `StaticMemberExpression` | `fooSync` |
| `fs["fooSync"]()` | `ComputedMemberExpression` | `fooSync` |

さらに、各メンバー式の `member.object` も再帰的に調べます。たとえば、`fs.fooSync.apply()` の `callee` は次のような形です。

```text
StaticMemberExpression
├─ object: StaticMemberExpression
│  ├─ object: Identifier("fs")
│  └─ property: Identifier("fooSync")
└─ property: Identifier("apply")
```

最外側のプロパティ名は `apply` なので、ここだけを見ても違反を検出できません。そこで `object` 側へ進み、内側の `StaticMemberExpression` にある `fooSync` を見つけます。このようにメンバーチェーンを内側へたどることで、直接呼び出されていない同期メソッドも検出できます。

### 3. トップレベルの呼び出しか判定する

`allowAtRootLevel` が有効な場合は、同期メソッドの呼び出しがトップレベルにあるかを判定します。

oxcには、ノードを囲む関数を取得する `get_enclosing_function` ユーティリティがあります。これを使えば、次のように判定できます。

```rust
if self.0.allow_at_root_level && get_enclosing_function(node, ctx).is_none() {
    return; // トップレベルでの呼び出しなので無視する
}
```

`get_enclosing_function` が `None` を返す場合、そのノードを囲む関数はありません。つまり、呼び出しはトップレベルにあります。

## テスト実行

oxcには、Lintルールを検証するための `Tester` が用意されています。警告しないコードを `pass`、警告するコードを `fail` に分け、それぞれソースコードとオプションをタプルで渡します。

```rust
let pass = vec![
    ("var foo = fs.foo.foo();", None),
    ("fooSync();", Some(serde_json::json!([{ "ignores": ["fooSync"] }]))),
];

let fail = vec![
    ("var foo = fs.fooSync();", None),
];
```

ルール名、プラグイン名、`pass`、`fail` を `Tester::new` に渡し、`test_and_snapshot()` を呼び出します。

```rust
Tester::new(NoSync::NAME, NoSync::PLUGIN, pass, fail).test_and_snapshot();
```

<https://github.com/oxc-project/oxc/blob/46f362530da1c2c5e868613e339999314b9f3a72/crates/oxc_linter/src/rules/node/no_sync.rs#L125-L163>

これにより、各コードが期待どおりに通過または違反するかを検証できます。違反ケースでは、診断メッセージや指摘位置もスナップショットとして確認されます。

テストは、oxcリポジトリのルートで次のコマンドを実行します。

```bash
cargo test -p oxc_linter no_sync
```

`-p oxc_linter` は対象のcrateを `oxc_linter` に絞り、末尾の `no_sync` は名前に `no_sync` を含むテストだけを実行するためのフィルターです。

## おわりに

Parser, Linter, Formatterなどのツールチェインは、設計思想やパフォーマンスのための最適化などはそれぞれ違いますが、今回示したようなアーキテクチャは共通のものだったりします。  
これを機にツールチェインの実装について知る足がかりになればよきです。

以前に別のOxlintでの開発をまとめたスライドもあるのでよければこちらも 👀  
<https://www.docswell.com/s/8723788/5MQ6MN-slide-oxlint-test-toolchain-summary>
