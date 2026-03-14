---
title: "Claude Code Plan modeが作成したMarkdownを効率的に管理する（ccplan）"
description: "Claude CodeのPlan modeで生成されるmdファイルを効率的に管理するCLI「ccplan」の紹介"
pubDate: 2026-03-13
tags: [typescript, cli, bun, claude, claude-code]
draft: false
---

好きな単位は、パイントです。

[fujitani sora](https://x.com/sorafujitani)です。

## 課題

Claude CodeのPlan modeはデフォルトではplansDirectoryで指定したディレクトリにmarkdown fileを生成します。

自分も基本的にはPlan modeを利用して開発を進めますが、下記の課題を感じていました。

- 逐次整理していかないとmarkdownが増え続ける
- 増えていくと、今どのplanを進めてたっけがわかりづらくなる
- fuzzy findの結果にPlan modeが生成したmdの文字列が含まれてしまい、検索のノイズになる

これらを解決するためにccplanというCLIを開発しているので、それを使ってどうしているのかを紹介します。

GitHub Starしてネ👇

https://github.com/sorafujitani/ccplan

## ccplanが達成すること

上記で記載している課題の達成手段として、Claude Code本体の機能提案ではなくOSSとして公開することの理由は重要だと考えているので、開発者としての考えを記載しています。

READMEより抜粋

https://github.com/sorafujitani/ccplan/blob/main/README.md

> We believe plan documents in agent coding are ephemeral by nature. Once a task is complete, the valuable outcomes should be published to Issues, PRs, Wikis, or other durable artifacts — the plan files themselves have served their purpose.
> In our view, a tool with a broad user base like Claude Code shouldn't impose an opinionated way to manage these generated files. Users should be free to choose the management approach that fits their workflow. ccplan is one such approach.
> Accumulated plan files also appear in fuzzy finders (e.g. fzf, Ctrl-P in editors), polluting search results and degrading the navigation experience in your project.
> Since humans ultimately judge whether work is complete, we find that fully automating a plan's lifecycle is difficult. ccplan aims to give humans a simple way to manage plans in the batches and cadences that make sense to them.
> Future direction: We are exploring Agent Skills integration so that agents can assist with plan lifecycle management on behalf of the user.

長いですが要するに

- Plan modeの成果物はストック情報ではなくフロー情報であると考えている。その情報が必要であればIssue, PR, Wikiなどに明示的にPublishするべきと考える
- 様々なユーザーが操作することを考えると、生成されたリソースの管理方法はClaude Code本体が機能化せずにユーザーに委ねられてほしい
- 不必要に蓄積されたリソースは、fuzzy findの結果やAIの参照情報としての品質など、開発体験を一定低下させるものと考える
- agentによるplan fileの自動運用も検討したが、planにおける「作業完了」を判断するのは現状人間であり、自動化は目指さずにシンプルなCLIとして設計する

Plan modeが不要なリソースを溜めずに効率良く運用するためにあるのがccplanです。

下記の機能を提供します。

- Plan mdファイルの一覧確認
  - `ccplan list`
- Plan mdファイルの状態を一括更新
  - `ccplan status`
- 不要になったPlan mdファイルを一括削除
  - `ccplan clean`
- Plan mdファイルをCLIから開く
  - `ccplan open`

## install

最初にinstall方法をまとめておきます。

```sh
# npm
npm install -g ccplan

# Bun
bun add -g ccplan

# Single binary (GitHub Releases)
curl -L https://github.com/sorafujitani/ccplan/releases/latest/download/ccplan-darwin-arm64 -o ccplan
chmod +x ccplan
```

## plansDirectory

Claude Codeのデフォルトは、Plan modeの出力mdファイルをuser scope（`~/.claude/plans`）に生成します。

ですが、ccplanはproject scope（`.claude/plans`）にmdファイルを配置する前提の設計をしています。

必要であればplansDirectoryにproject scopeを指定してください。

https://code.claude.com/docs/en/settings

## ccplan list

`.claude/plans/**.md`のファイルを対象に、管理下のmdファイルとその状態を一覧表示します。

![ccplan list](/blog/ccplan/ccplan-list.png)

```sh
(nix) ccplan $ ccplan list
  draft      dry-run-option.md today
  draft      config-file-support.md today
  done       export-json.md today
  done       plan-template.md today
  active     search-command.md today
  active     archive-command.md today
  active     add-tag-support.md 8 days ago
```

ccplanは内部的に3つのstatus（状態）でmdを管理します。

- draft
- active
- done

着手前, 着手中, 完了 を表現するものです。

Plan modeによる作成時はactive。

正しく運用すれば、今はどののplanを進めているのか？どのplanがもう必要ないのか？をユーザーやccplanが判断する助けになります。

## ccplan status

statusを変更する際に使用します。

Planの実装完了時はdoneにするし、今は実装しないものはdraftにします。

inquirer.jsを使ってインタラクティブな複数選択、ファイル名のfuzzy findをサポートしています。

https://www.npmjs.com/package/inquirer

![ccplan status](/blog/ccplan/ccplan-status-1.png)
![ccplan status](/blog/ccplan/ccplan-status-2.png)

```sh
(nix) ccplan $ ccplan status draft
✔ Select plans (space to toggle, enter to confirm) active  search-command.md  today, active
archive-command.md  today
✓ search-command.md: active → draft
✓ archive-command.md: active → draft
```

## ccplan clean

実装が完了し、不要になったPlanによるmdファイルを一括削除します。

デフォルトはstatus: doneのファイルが削除対象です。

`.claude/plans/`以下のmdファイルが実際に削除されます。

人間が必要に応じてファイルを確認して、LinuxコマンドやGUIで一つずつ削除していく必要がなくなります。

役目を終えたものをstatus管理して、一気に削除してしまいましょう

残しておきたい情報があれば、適切な場所に移してから削除してください。

![ccplan clean](/blog/ccplan/ccplan-clean.png)

```sh
(nix) ccplan $ ccplan clean --all
Found 2 plan(s) to delete:
  archive-command.md
  interactive-status-update.md

Delete these plans? [y/N] y
- archive-command.md deleted
- interactive-status-update.md deleted
```

## ccplan open

これは個人的に推し機能で、CLIから選択したPlan mdファイルを直接開くことができます。

`.claude/plans/`はgit管理から外して運用するケースがあると思いますが（僕はそう）、これによってファイル名検索に引っかからないことがあります。

ccplan openを使えばそれを気にすることなく、ファイルツリーの移動なしで直接mdファイルを開くことができます。

エディタは`$EDITOR`の環境変数によって選択可能です。

```sh
(nix) ccplan $ ccplan open .claude/plans/dry-run-option.md
```

## 技術構成

READMEにも記載していますが、ざっくりの技術構成が下記です。

contributionする際の参考にしてください。

- Bun + TypeScript (ESM)
- type check: tsgo
- schema validation: valibot
- test: vitest + fast-check (PBT)
- lint/fmt: oxlint / oxfmt
- build: esbuild (bundle) / bun build --compile (single binary)

## まとめ

Agentは人間ではとても追いつかないレベルで自然言語や高級言語（場合によっては機械語とか）を生成してきます。

正しい情報を正しく残して、それ以外を効率的に破棄するための手段は重要度が上がっていくでしょう。

ccplanもその一つになればいいと考えています。

今後はAgentSkillsの提供や、より運用を自動化するための機能を追加していく予定です。

よいAI駆動人生を👋

ccplanのGitHub広めてくれると嬉しいです！
