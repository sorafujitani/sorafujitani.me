---
title: "SpeakerNote: oxlint-test-toolchain-summary"
description: ""
pubDate: 2026-06-24
tags: [speakernote, typescript]
draft: false
---

### slide
https://www.docswell.com/s/8723788/5MQ6MN-slide-oxlint-test-toolchain-summary

### event
https://smarthr.connpass.com/event/392342/

### speaker note

Oxlint eslint-plugin rule implementation というテーマで話します。よろしくお願いします。

fujitani soraと言います。
TSKaigiには2年前から運営として関わっています。
この前の懇親会でこのイベントのスピーカーを探していたSmartHRのいなおさんに捕まって、今日は運営枠でセッションを担当させていただきます。

Oxlintというのは、TypeScriptやJavaScriptのlintを高速に実行するソフトウェアです。
TSKaigiのセッションでもよく取り上げられていて、名前を聞いたり使い始めた人もいるんじゃないかなと思います。
自分もOxc toolchainは大好きなソフトウェアで、最近はcontributorとして開発に参加しています。

話のテーマになりますが、Oxlintには、ESLintのlint ruleと同じ名前と挙動で実装されるlint ruleと、その移行計画のissueが存在します。
この中で、自分が最近実装しているnode/prefer-global-consoleの移行PRを実装していて、これを例にOxlintの実装概要について話します。

node/prefer-global-consoleは、一言で言うと consoleの使い方を揃えるためのルールです。
JavaScriptではconsoleというオブジェクトはグローバルに使用することもできれば、node:console moduleから明示的にimportして使用することもできます。

このルールを有効化することで、console moduleのimportをlint errorとし、グローバルなconsoleオブジェクトの利用を強制することができます。
現在JavaScriptを書いている人にとってはとても自然な構文だと思います。

覚えているかわかりませんが、commonjsというものもあって、requireによるmodule importの検査にも対応しています。

これらのOxlintが提供するlint ruleは、oxlintrc.jsonからの設定で有効化することができます。
設定を切り替えることができて、JSON Valueにalwaysを設定した場合はグローバルなconsoleオブジェクトを使う、neverは反対にmodule importされたconsoleを使う設定です。

このルールを実装するための、大きく3つの対応を行います。
まずはルールのロジック本体の実装、2つ目に実装したルールをOxlintの共通インターフェースから実行できるようにするための実装、
3つ目はルールをoxlintrc.jsonから設定できるようにするための実装です。
次のページで詳細を見ていきます。

まず、最終的に実装されたルールから二つのものをコード生成する仕組みがあります。
一つはTypeScriptから利用する際の型定義、二つ目はjsonファイルから認識するためのルール名の情報です。
cargo lintgenコマンドと、justコマンドによって生成されます、
justというのはOxc repoが全体的に使用しているタスクランナーです。

ロジック部分についてですが、先ほど話したように、検知したいconsole module importの中でも二つのパターンを見つける必要があります。
一つはESMのmodule import、2つ目はrequireによるconsoleの定数代入です。

これを判定するために実装ではシンプルな分岐を利用しています。
このコードはPRから引用したもので、PreferGlobalConsoleがAlwaysに設定されている場合に、下記のパターンマッチに入ります。
上の方は、VariableDeclaratorなので変数定義、つまりrequireを使うcommonjsの場合です。
下のパターンでは、ImportDeclarationの判定であり、内部ではimported_console_spanという関数でESMのimport構文を捕捉しようとします。
どちらのパターンでも、context diagnosticというlintの診断情報を保持するデータに返却値を詰めて返すことで、lint ruleへの違反をユーザーに報告することができます。

最後にテストですが、大きく3つで、
ルールのロジックに対するunit test、実装したルールからのコード生成が漏れていないかの確認、formattingが必須になっています。
これらはCIにも組み込まれています。

最後にまとめると、ルール本体を実装し、必要なコード生成をしてテストを行う、これがOxlintのeslint-plugin実装の概要になります。
