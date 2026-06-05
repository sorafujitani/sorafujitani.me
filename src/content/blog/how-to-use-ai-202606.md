---
title: "最近のAIの使い方 2026年夏"
description: ""
pubDate: 2026-06-03
tags: []
draft: false
---

## Use Tools

- Claude Code（Max）
- Cursor Agent
- Devin
- WezTerm

## How to Use

基本的に、特別な使い方をしていない。
Claude Opus 4.8 のプラクティスに沿って進めている。
それ以上の工夫された使い方やToken削減のための何かなどはあまりやっていない。
HarnessAgentとか使っている時もあったが、オーケストレーション用の外付けツールがAgent本体のプラクティスと噛み合わなくなった時にめんどいのでやめた。

https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8

https://platform.claude.com/docs/ja/build-with-claude/prompt-engineering/claude-prompting-best-practices

https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

https://cursor.com/ja/blog/continually-improving-agent-harness

## 開発環境

### WezTerm

WezTermを使うモチベーションは下記
- 必要中分割最もシンプル
- Lua langで設定できる
  - 便利な実装がWezTermに依存している
- 自分がWezTerm community pluginのmaintenarである
- Ghosttyは上のTabを消せないのがネックで使っていない

WezTermのWorkspace（Tabみたいなやつ）単位でrepositoryを開き、shellやClaude Codeを開いて並列開発を進めている。

https://zenn.dev/soramarjr/articles/ff6d80f7b524d6

## Shell内での工夫

前提として、Terminal操作のコストは重要だと考えている。
ここが整備されていないことで注意力を削がれたりAgent間の行き来をめんどくさくしたくない。

- zoxideでchange directlyを高速化している
https://github.com/ajeetdsouza/zoxide

- ghq * fzf でディレクトリ全体を簡単に行き来できるようにしている

https://zenn.dev/mozumasu/articles/mozumasu-lazy-git

- aliasはshellrcではなく、zeno.zshで設定している

https://github.com/yuki-yano/zeno.zsh

shell aliasの増加による、組み込みコマンドなどとの競合を避けるため

こういうの
https://zenn.dev/owayo/articles/6190821ac1dd1e

### Agentの完了に気づく

WezTermには組み込みの仕組みがないので、Agentの完了検知と通知, Boardviewを自作している。
nativeにやりたい人はCmuxとか使うといいと思う。

https://zenn.dev/soramarjr/articles/7d9ea81fe643dd

### AgentSkills

https://github.com/sorafujitani/skills

user scopeで使いたいskillsをpublishしている。

### Slide作成

SlidevというmarkdownとVue.jsを使ってスライド資料を生成できるツールを利用している。
カラーテーマ, 口調, 自己紹介スライドなどの共通部品をまとめたTemplate Repositoryを用意していて、これをベースに個別の情報を載せてスライドを作成している。

https://github.com/sorafujitani/slidev-template

セッションテーマや調べたこと、章立てをnote.mdにまとめて、 `/gen-slide` skillの実行でそれをベースにスライド資料が生成される。

ex

https://sorafujitani.github.io/phperkaigi2026-prettier-fmt

https://sorafujitani.github.io/slide-rfmt-layer-ruby

## tool

### ccplan

https://github.com/sorafujitani/ccplan

Plan modeが作成するmarkdownにライフサイクルを与えるCLI。
status管理できるようにして、n日より前に作成された `status: done` のfileを全て削除とかできる。

### ccsession

https://github.com/sorafujitani/ccsession

https://zenn.dev/soramarjr/articles/4eb891ab20498e

claude --resumeのラッパーCLIで、全セッション横断でfzf検索 & preview できる。
落としたセッションの復元と作業再開がとてもシームレスになった。
まじ便利。

### MCP

toridoriのproject scopeに入れているMCP。

/Users/fujitanisora/Pictures/neko/スクリーンショット\ 2026-06-05\ 1.36.34.png
