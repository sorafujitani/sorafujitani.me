---
title: "CodingAgentにLocal環境のパス依存を吸収させる"
description: ""
pubDate: 2026-01-07
tags: [ai, claude, linux]
draft: false
---

年末は紅白とCDTVを見ていて、お目当てだったミセスの大ちょけに頭を抱えていました。<br/>
fujitani soraです。

## Issue
下記のケースを想定します
- remote repositoryに共有するCodingAgentのリソースを作成する
    - SlashCommand, AgentSkillsなど
- 上記のリソースを配置するディレクトリとは別のディレクトリを、Agentから参照したい
    - 自分の場合は、APIを別のrepositoryに移行する作業を行うWorkflowを組むときにこのニーズが発生した
- 特定ディレクトリを指定したいが、Claude Codeなどのlocalで動作する環境では、開発者毎にディレクトリの配置が異なるため、対象ディレクトリへのパスをハードコードできない

Devinのようなremoteから複数repositoryを横断できる環境であれば問題にならないと思います。<br/>
Claude CodeやCursorのようなlocal環境で動作する仕組みの共有時に、開発者間のディレクトリ差分を吸収する仕組みが必要だと考えました。<br/>
この問題を解くのが本記事のテーマです。

## fdによる検索
本記事では検索したいディレクトリ名を `hogerepo` と仮置きします。

SlashCommand定義のmd内で作業をPhase分割し、別のディレクトリを読み込ませたいタイミングで下記の指示を記述しました。

```md:.claude/commands/hoge.md
## hogerepo リポジトリの検出

移行作業を開始する前に、以下のコマンドでhogerepoリポジトリの配置場所を特定してください：

fd -H "^\.git$" ~/ -t d | xargs -I {} dirname {} | grep "hogerepo$" | head -1

検出したパスを `CMA_ROOT` として以降の作業で使用します。例：
- main.ts: `${CMA_ROOT}/apps/backend/main.ts`
```

```sh:agent
⏺ まず、hogerepoリポジトリの場所を特定し、エンドポイントの情報を収集します。

⏺ Bash(fd -H "^\.git$" ~/ -t d 2>/dev/null | xargs -I {} dirname {} | grep "hogerepo$" | head -1)
  ⎿  /Users/fujitanisora/dev/work/hogerepo

⏺ リポジトリを検出しました。次に...

⏺ Search(pattern: path: "~/dev/work/hogerepo")
```

この記述によって、Agentが自律的にlocal環境から指定のディレクトリを検索し、Agentが以降の作業を行えます。

コマンドの役割についても軽くまとめます。

`fd -H "^\.git$" ~/ -t d`

- **fd**: 高速なfind代替コマンド
- **-H**: 隠しファイル/ディレクトリも検索対象に含める
- **"^\.git$"**: .git という名前に完全一致（正規表現）
- **~/** : 検索開始ディレクトリ
- **-t d**: ディレクトリのみ検索

`| xargs -I {} dirname {}`

- **|**: 前のコマンドの出力をパイプで渡す
- **xargs -I {}**: 入力を {} に置き換えて実行
- **dirname {}**: パスから最後のディレクトリを除去

`| grep "hogerepo$"`

- **grep**: パターンにマッチする行を抽出
- **"hogerepo$"**: 末尾が hogerepo で終わる行（$ は行末）
 

https://github.com/sharkdp/fd
 

## 使用コマンドの判断とベンチマーク
名前に依存したディレクトリ検索の手段として、下記の3つを検討しました
- find
- fd
- ghq

検索はどれでも達成できるので、Linuxのtimeコマンドによるベンチマークで判断しました<br/>
https://linuxjm.sourceforge.io/html/LDP_man-pages/man1/time.1.html

検索対象のリポジトリ名はfuga/hogerepoとしてマスクしています

```sh:find
% time find ~/ -type d -name ".git" 2>/dev/null | xargs -I {} dirname {} | grep "hogerepo$" | head -1
/Users/fujitanisora/dev/fuga/hogerepo
find ~/ -type d -name ".git" 2> /dev/null  1.02s user 34.94s system 45% cpu 1:18.97 total
xargs -I {} dirname {}  0.04s user 0.34s system 0% cpu 1:19.68 total
grep "hogerepo$"  0.00s user 0.01s system 0% cpu 1:19.68 total
head -1  0.00s user 0.00s system 0% cpu 1:19.67 total
```

```sh:fd
% time fd -H "^\.git$" ~/ -t d | xargs -I {} dirname {} | grep "hogerepo$" | head -1

/Users/fujitanisora/dev/fuga/hogerepo
fd -H "^\.git$" ~/ -t d  0.77s user 4.14s system 200% cpu 2.446 total
xargs -I {} dirname {}  0.03s user 0.24s system 11% cpu 2.444 total
grep "hogerepo$"  0.00s user 0.00s system 0% cpu 2.443 total
head -1  0.00s user 0.00s system 0% cpu 2.443 total
```

```sh:ghq
% time  ghq list -p | grep "hogerepo$" | head -1
/Users/fujitanisora/dev/fuga/hogerepo
ghq list -p  25.56s user 265.29s system 263% cpu 1:50.46 total
grep "hogerepo$"  0.00s user 0.00s system 0% cpu 1:50.46 total
head -1  0.00s user 0.00s system 0% cpu 1:50.46 total
```

下記の結果に整理できます

- **fd**: 2.4秒（最速）
- **find**: 1分19秒（fdの約32倍遅い）
- **ghq**: 1分50秒（最も遅い）

ghqはGit管理しているディレクトリ数にも依存するので環境差がありますが、僕の環境では一番遅い結果でした。<br/>
実行速度はそのままAgentのボトルネックになるので重要です。<br/>
このベンチマークをもって、fdを選択しています。

## おわりに
この辺の仕組みはベンダーが機能として提供してくれるといいなと思ったりします。<br/>
より再現性の高い仕組みや、それはもうリリース済みの機能やIssueとしてあるよ！！とかあったら教えていただけると嬉しいです🙏
