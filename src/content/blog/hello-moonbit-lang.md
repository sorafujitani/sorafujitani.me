---
title: "MoonBitことはじめメモ"
description: ""
pubDate: 2026-07-18
tags: [memo]
draft: false
---

MoonBit ことはじめメモ。

https://www.moonbitlang.com/

書く前のイメージ
- match, struct ,raiseによる例外のResult型表現などなど、Rustのような表現力を持つ
- AOTで、wasm,JS,nativeなど複数のcompile targetを指定できる
  - 速度を見ても、RustとJSの良いところを取った言語
- moonによるcommandlineが整備されており、Agentも扱いやすいだろう

やったこと
小さな正規表現パーサを書いた
https://github.com/sorafujitani/moon-regex-parser

```sh
moon-regex-parser $ time moon run cmd/main
input: a(b|c)*
=> accepted
moon run cmd/main  0.01s user 0.03s system 34% cpu 0.136 total
```

```sh
moon-regex-parser $ moon
The build system and package manager for MoonBit.

Usage: moon [OPTIONS] <COMMAND>

Commands:
  new                    Create a new MoonBit module
  build                  Build the current package
  check                  Check the current package, but don't build object files
  prove                  Prove the current package
  run                    Run a main package
  runwasm                Run a local package as WebAssembly or a prebuilt WebAssembly binary
  test                   Test the current package
  clean                  Remove the _build directory
  fmt                    Format source code
  doc                    Generate documentation or searching documentation for a symbol
  explain                Explain compiler diagnostics and language topics
  info                   Generate public interface (`.mbti`) files for all packages in the module or workspace
  bench                  Run benchmarks in the current package
  add                    Add a dependency
  remove                 Remove a dependency
  install                Install a binary package globally or install project dependencies (deprecated without args)
  tree                   Display the dependency tree
  fetch                  Download a package to .repos directory (unstable)
  work                   Workspace maintenance commands
  login                  Log in to your account
  whoami                 Show login status and username
  register               Register an account at mooncakes.io
  publish                Publish the current module
  package                Package the current module
  update                 Update the package registry index
  coverage               Code coverage utilities
  generate-build-matrix  Generate build matrix for benchmarking (legacy feature)
  upgrade                Upgrade toolchains
  shell-completion       Generate shell completion for bash/elvish/fish/pwsh/zsh to stdout
  version                Print version information and exit
  help                   Print this message or the help of the given subcommand(s)

Options:
  -V, --version
          Print all version information and exit

  -h, --help
          Print help

Common Options:
  -C <DIR>
          Change to DIR before doing anything else (must appear before the subcommand). Relative paths in other options and arguments are interpreted relative to DIR. Example: `moon -C a run .` runs the same as invoking `moon run .` from within `a`

      --target-dir <TARGET_DIR>
          The target directory. Defaults to `<project-root>/_build`

  -q, --quiet
          Suppress output

  -v, --verbose
          Increase verbosity

      --trace
          Trace the execution of the program

      --dry-run
          Do not actually run the command

  -Z, --unstable-feature <UNSTABLE_FEATURE>
          Unstable flags to MoonBuild

          [env: MOON_UNSTABLE=]
          [default: ]
```

データ構造の定義
```mbt
///|
pub(all) enum Quantifier {
  Star
  Plus
  Question
} derive(Debug, Eq)

///|
pub(all) enum Ast {
  Literal(Char)
  Concat(Array[Ast])
  Choice(Array[Ast])
  Repetition(Ast, Quantifier)
} derive(Debug, Eq)

///|
test "ast construction and equality" {
  let ast = Repetition(Choice([Literal('a'), Literal('b')]), Star)
  assert_eq(ast, Repetition(Choice([Literal('a'), Literal('b')]), Star))
  assert_true(ast != Repetition(Choice([Literal('a'), Literal('b')]), Plus))
}
```

Enumにparameterを取って値を生成できる。Rustっぽい。
Array parameterなども表現可能。

また、実装とテストを同じファイルに記述できる。（in source testing）
この時に、関数の近くにテストを置くか、実装とテストを上下で分離して書くか迷っている🤔
普通は後者だと思うけど。

## `///|` って何

https://docs.moonbitlang.com/ja/latest/language/docs.html

MoonBitソースをBlockの列として扱っており、その開始位置を表現するための仕様であるようです。
構文上はdoc commentと同じであり、なくても動きます。
消した状態で`moon check`を実行しても診断対象にはならない。
`moon fmt`を実行すれば自動挿入されるので毎回手で描く必要はないです。


## JS build

```sh

moon build --target js
```

dev buildでは`_build/js/debug/build/cmd/main/main.js`にbundle後、minify前の状態。
`--release`をcmdline末尾につけるとrelease buildに切り替わる。


抜粋
```js:_build/js/debug/build/cmd/main/main.js
function _M0IP016_24default__implPB6Logger5writeGRPB13StringBuilderE(self, show) {
  show.method_table.method_0(show.self, { self: self, method_table: _M0FP092moonbitlang_2fcore_2fbuiltin_2fStringBuilder_24as_24_40moonbitlang_2fcore_2fbuiltin_2eLogger });
}
function _M0MPC16string6String11sub_2einner(self, start, end) {
  const len = self.length;
  let end$2;
  if (end === undefined) {
    end$2 = len;
  } else {
    const _Some = end;
    end$2 = _Some;
  }
  if (start >= 0 && (start <= end$2 && end$2 <= len)) {
    if (start < len) {
      if (!_M0MPC16uint166UInt1623is__trailing__surrogate(self.charCodeAt(start))) {
      } else {
        $panic();
      }
    }
    if (end$2 < len) {
      if (!_M0MPC16uint166UInt1623is__trailing__surrogate(self.charCodeAt(end$2))) {
      } else {
        $panic();
      }
    }
    return new _M0TPC16string10StringView(self, start, end$2);
  } else {
    return $panic();
  }
```

nodeで実行可能
```sh
moon-regex-parser $ node _build/js/debug/build/cmd/main/main.js
input: a(b|c)*
=> accepted
```

minidyまではやってくれないので、必要に応じて別toolで実行する必要があるでしょう。

```sh
moon-regex-parser $ npx esbuild _build/js/debug/build/cmd/main/main.js --minify --outfile=main.min.js

moon-regex-parser $ node main.min.js
input: a(b|c)*
=> accepted
```


今後やりたいこと
- 並行処理はどうか
  - 今回の実装はCPU Boundであり、MoonBitはシングルスレッド利用であるためベンチはとっていない
  - https://docs.moonbitlang.com/en/latest/language/async-experimental.html
- http framework
  - https://github.com/oboard/mocket
- 普段ならTSを選択するケースでMoonBitを意識的に選ぶことはあるかも
