---
title: "AI AgentとHarness Engineeringの知識グラフ（勉強用）"
description: "AI Agent、Harness Engineering、Loop Engineering、Context Windowを説明するための語彙関係メモ"
pubDate: 2026-07-02
tags: [ai, agent]
draft: false
---

# AI AgentとHarness Engineeringの知識グラフ

人に説明するときの土台として、文脈の単語を知識グラフっぽく並べたもの。

各行はだいたい `A -> 関係 -> B` として読む。

## 中心の整理

- AI Agent -> 期待されている成果 -> 生成物ではなく検証済みの完了
- AI Agent -> 実行するもの -> LLM
- AI Agent -> 使うもの -> tool
- AI Agent -> 触るもの -> file / CLI / Web Search / MCP / Hooks / Sub Agent / Agent Skills
- AI Agent -> 進めるもの -> 周辺作業
- 周辺作業 -> 例 -> 調査 / 編集 / 実行 / 検証 / 修正 / 報告
- LLM -> 得意なこと -> もっともらしい出力
- LLM -> そのままだと弱いこと -> 外部状態の確認
- もっともらしい出力 -> 不足しているもの -> 実際に正しいという観測
- 実際に正しいという観測 -> 作るもの -> trust
- trust -> 支えるもの -> Verification
- Verification -> 含むもの -> build / test / lint / typecheck / 実画面確認 / API確認 / log確認
- AI Agent活用 -> 失敗しやすい状態 -> 大量生成して人間が全部確認し直す
- AI Agent活用 -> 目指す状態 -> 人間がレビューできる粒度で検証済みの変更が残る

## LLM

- LLM -> 略 -> Large Language Model
- LLM -> 入力を受け取る -> prompt
- LLM -> 出力する -> text / code / structured data
- LLM -> 扱えるもの -> natural language / source code / number / bit / binary / image / video / audio / color
- LLM -> 例 -> GPT / Claude / Gemini
- LLM -> 性質 -> 非決定的
- 非決定的 -> 意味 -> 同じ依頼でも同じ経路になるとは限らない
- 非決定的 -> 影響 -> 作業品質がぶれる
- 作業品質のぶれ -> 扱う設計 -> Harness Engineering
- LLM単体 -> できること -> 推論と生成
- AI Agent -> LLM単体に足すもの -> tool use / file operation / command execution / search / verification

## AI Agent

- Agent -> 原義 -> 代理人
- AI Agent -> 役割 -> 人間の代わりにLLMと周辺作業を実行する仕組み
- AI Agent -> 単位 -> 作業実行の単位
- AI Agent -> 入力 -> Goal / Context / user request / repository state
- AI Agent -> 出力 -> 変更 / 調査結果 / 実行結果 / 検証結果
- AI Agent -> 内側で使うもの -> Harness
- AI Agent -> 外側から動かすもの -> Loop
- AI Agent -> 失敗パターン -> source of truthを間違える
- AI Agent -> 失敗パターン -> Context Windowに不要情報を詰めすぎる
- AI Agent -> 失敗パターン -> Verificationなしで完了扱いにする
- AI Agent -> 失敗パターン -> Model選択を作業の難度と合わせない
- AI Agent -> よい完了条件 -> 要求理解 / 変更作成 / 影響確認 / 検証完了 / 結果報告

## 生成と完了

- 生成 -> 例 -> 文章を書く / コードを書く / 要約する
- 完了 -> 例 -> 要求を満たす変更を作り、確認し、レビュー可能にする
- 生成 -> 足りないもの -> correctness
- correctness -> 必要なもの -> evidence
- evidence -> 例 -> command output / test result / production log / actual API response / visual check
- verified completion -> 構成要素 -> output + evidence + residual risk
- residual risk -> 人間に渡すもの -> 未確認点 / 既存不具合 / 検証不能だった理由
- AI Agentへの期待 -> 生成ではなく -> verified completion

## Harness Engineering

- Harness Engineering -> 関心 -> 1回のAgent実行の精度
- Harness Engineering -> 扱うもの -> Goal / Context / Verification / Model
- Harness -> 役割 -> Agentが迷わず、壊しにくく、検証しやすく動く枠組み
- Harness -> Agentの能力を増やすものではない -> Agentの動き方を制御するもの
- Harness -> 必要になる理由 -> Agentの出力と行動が非決定的だから
- Harness -> 防ぐもの -> 曖昧な完了 / 推測による判断 / 検証漏れ / 危険な操作
- Harness -> 具体化される場所 -> prompt / AGENTS.md / hooks / skills / commands / checklists / approval rules
- Harnessが弱い -> 起きること -> 動いているように見えるが成果が安定しない
- Harnessが強い -> 起きること -> 同じ種類の作業を再現しやすくなる

## Harnessの4要素

- Goal -> 決めること -> 何を達成したら完了か
- Context -> 決めること -> 何を根拠に判断するか
- Verification -> 決めること -> 何をもって正しいとするか
- Model -> 決めること -> どのモデルにどの作業を任せるか
- Goal + Context -> Agentの探索範囲を決める
- Verification + Model -> Agentの信頼性とコストを決める
- Goalが弱い -> 結果 -> 終了条件が曖昧になる
- Contextが弱い -> 結果 -> 間違った前提で進む
- Verificationが弱い -> 結果 -> もっともらしいだけの変更になる
- Modelが弱い -> 結果 -> 高すぎるか、安いが手戻りが増える

## Goal

- Goal -> 意味 -> Agentが目指す完了状態
- 悪いGoal -> 例 -> 調査して
- 悪いGoal -> 例 -> 直して
- 悪いGoal -> 例 -> いい感じにして
- 悪いGoal -> 例 -> まとめて
- 悪いGoal -> 問題 -> 作業名だけで終了条件がない
- よいGoal -> 含むもの -> 対象 / 完了条件 / 制約 / 検証方法
- よいGoal -> 例 -> 対象ファイルの記事を初学者向けの教材として読める状態にする
- よいGoal -> 例 -> `bun run build` が通るところまで確認する
- よいGoal -> 例 -> 既存のユーザー変更は触らない
- よいGoal -> 例 -> 参照した公式ドキュメントのリンクを本文に残す
- Goal -> Agentに与えるもの -> 優先順位の基準
- Goal -> 人間に与えるもの -> レビュー基準

## Context

- Context -> 意味 -> Agentが判断に使う材料
- Context -> 単なる背景ではない -> 判断の根拠
- Context -> 例 -> ユーザー依頼
- Context -> 例 -> AGENTS.md
- Context -> 例 -> README
- Context -> 例 -> 既存コード
- Context -> 例 -> git diff
- Context -> 例 -> issue / PR本文
- Context -> 例 -> review comment
- Context -> 例 -> 実行ログ
- Context -> 例 -> 公式ドキュメント
- Context -> 例 -> 過去の会話 / memory
- source of truth -> 意味 -> 判断で最優先する根拠
- source of truth -> 候補 -> user request / existing implementation / official docs / production log / actual diff
- source of truthが曖昧 -> 起きること -> Agentが推測で埋める
- Harness -> Contextに対して決めること -> 何を先に読むか
- Harness -> Contextに対して決めること -> 何を根拠にしてよいか
- Harness -> Contextに対して決めること -> 何を根拠にしてはいけないか

## Verification

- Verification -> 意味 -> 作業が正しいことを確認する仕組み
- Verification -> Agent活用で一番重要な部分
- Verification -> 目的 -> 説明のもっともらしさと実際の正しさを分ける
- Verification -> build -> プロジェクトが構築できることを見る
- Verification -> test -> 期待する振る舞いが保たれていることを見る
- Verification -> lint -> 規約違反や静的な問題を見る
- Verification -> typecheck -> 型契約が壊れていないことを見る
- Verification -> visual check -> 画面が期待どおり見えることを見る
- Verification -> API call -> 実際の応答を見る
- Verification -> queue check -> enqueueされたことを見る
- Verification -> worker log -> 処理完了を見る
- Verification -> file readback -> 生成ファイルを実際に読む
- 「たぶん正しい」 -> Verificationではない
- 「この観測で正しいと言える」 -> Verification
- Verification -> 完了条件に入れるもの

## Model

- Model -> 意味 -> どのLLMをどの作業に使うか
- Model選択 -> 目的 -> コストと信頼性の調整
- 強いモデル -> 向くもの -> 広い設計判断
- 強いモデル -> 向くもの -> 最終レビュー
- 速いモデル -> 向くもの -> コード検索
- 安いモデル -> 向くもの -> 大量ログの要約
- 決定的なツール -> 向くもの -> 機械的な整形
- 軽いモデルに難しい判断を任せる -> 起きること -> 安く見えて手戻りが増える
- 強いモデルに全部任せる -> 起きること -> 信頼性は上がるがコストが増える
- Model -> Harnessの一部 -> 作業の割り当てを設計するため

## Harnessの部品

- Hooks -> 関係 -> Agentのライフサイクルに処理を差し込む
- Hooks -> 使い道 -> 危険なコマンドを止める
- Hooks -> 使い道 -> ツール実行後に検証を走らせる
- Hooks -> 位置づけ -> 外側からのguard / verification
- Prompt -> 関係 -> AgentにGoalとContextを渡す
- Prompt -> 強いこと -> 判断基準の明示
- Prompt -> 弱いこと -> 外部状態の制御
- Promptだけ -> 起きること -> Verificationや実行制御が不足しやすい
- Sub Agent -> 関係 -> 作業の一部を別Contextに分ける
- Sub Agent -> 向くもの -> 大量検索 / ログ確認 / コードレビュー / 並列調査
- Sub Agent -> 注意 -> 密に連動する判断には向かない
- Agent Skills -> 関係 -> 再利用可能な手順や知識を渡す
- Agent Skills -> 置き換えるもの -> 人間が毎回説明していた作業手順
- MCP -> 関係 -> 外部ツールやデータソースへの接続面
- MCP -> 例 -> GitHub / Linear / Google Workspace / Datadog / 社内ツール
- MCP -> 可能にすること -> 実データを読む / 実操作を行う

## Loop Engineering

- Loop Engineering -> 関心 -> Agentをいつ、どこで、何回、どの順序で実行するか
- Loop Engineering -> 扱うもの -> scheduling / event / queue / retry / approval / status / notification
- Loop -> Agentの外側にあるもの
- Loop -> 役割 -> Agent実行を業務やシステムに組み込む
- Loop -> 例 -> cronで定期実行する
- Loop -> 例 -> GitHub eventで起動する
- Loop -> 例 -> Slack commandで起動する
- Loop -> 例 -> queueに積む
- Loop -> 例 -> 失敗したらretryする
- Loop -> 例 -> human approvalを挟む
- Loop -> 例 -> dashboardで状態を見る
- Loop -> 例 -> 完了したら通知する
- Loop -> 言い換え -> orchestration layer
- Agent -> コンテナに近い -> 作業を実行する単位
- Loop -> Kubernetesに近い -> 実行場所、個数、再起動、公開、状態を管理するもの
- HarnessなしのLoop -> 起きること -> 不安定な作業が自動で増える
- LoopなしのHarness -> 起きること -> 人間が毎回起動し続ける

## HarnessとLoop

- Harness -> 対象 -> 1回のAgent実行
- Loop -> 対象 -> Agent実行の開始、継続、再試行、通知
- Harness -> 主な関心 -> 精度
- Loop -> 主な関心 -> 運用
- Harness -> Agentの内側の設計
- Loop -> Agentの外側の設計
- Harness -> 例 -> よいGoalを渡す
- Harness -> 例 -> よいContextを渡す
- Harness -> 例 -> 検証方法を固定する
- Harness -> 例 -> 危険な操作を止める
- Harness -> 例 -> 作業手順をSkill化する
- Harness -> 例 -> 調査をSub Agentに分離する
- Loop -> 例 -> 定期的に起動する
- Loop -> 例 -> eventで起動する
- Loop -> 例 -> queueで順番を制御する
- Loop -> 例 -> retryする
- Loop -> 例 -> approvalを挟む
- Loop -> 例 -> 完了を通知する
- Loop -> 例 -> 状態を可視化する
- HarnessとLoopを混ぜる -> 起きること -> 設計の責務がぼやける
- HarnessとLoopを分ける -> 起きること -> Agent活用の設計が見通しやすくなる

## Context Window

- Context Window -> 意味 -> LLMが一度に参照できる情報量の上限
- Agent -> Context Windowの中にある情報をもとに判断する
- Context Window外の情報 -> Agentには基本的に見えていない
- Context Windowに入れるもの -> 判断材料
- Context Windowに入れすぎるもの -> 重要情報を埋もれさせる
- Context Window -> 作業メモ置き場ではない
- Context Window -> 限られた判断領域
- Context Window管理 -> Harness Engineeringの一部
- Context Window管理 -> 目的 -> Agentが何を見て判断しているかを整える

## Context Windowで起きる問題

- 長いログをそのまま貼る -> 重要な行が埋もれる
- 関係ないファイルを大量に読ませる -> 判断材料が濁る
- 古い方針と新しい方針が同時に入る -> 前提が衝突する
- 会話が途中で圧縮される -> 細かい前提が落ちる
- source of truthではない要約 -> 事実として扱われる
- 似た名前のファイルやissue -> 混ざる
- 間違った前提 -> 正しそうな作業を生む

## Context Windowを守る方法

- 最初にGoalを短く固定する -> 探索範囲を絞る
- source of truthを明示する -> 根拠の優先順位を固定する
- 大量ログから必要行だけ抽出する -> ノイズを減らす
- 調査結果を事実と推測に分ける -> 判断の強さを分ける
- Sub Agentに探索を分離する -> メインContextを汚さない
- メインには結論だけ返す -> working memoryを節約する
- 重要な検証コマンドを残す -> 再現性を上げる
- 古い前提が変わったら明示的に上書きする -> 矛盾を残さない

## 説明するときの流れ

- まず -> AI AgentはLLMそのものではなく、LLMとtoolを使って作業を進める単位
- 次に -> 期待しているのは生成ではなく、検証済みの完了
- 次に -> その1回の実行を安定させる設計がHarness Engineering
- 次に -> HarnessはGoal / Context / Verification / Modelで見る
- 次に -> Agentを継続的に動かす外側の仕組みがLoop Engineering
- 次に -> HarnessとLoopは内側の精度と外側の運用で分ける
- 最後に -> Context WindowはAgentの判断材料の上限なので、Harnessの重要な対象になる

## まとめの関係

- AI Agent -> LLMを使う -> ただしLLMそのものではない
- AI Agent -> toolを使う -> 外部状態を読んで操作する
- AI Agent -> 目指す -> verified completion
- verified completion -> 必要 -> Verification
- Verification -> 支える -> trust
- trust -> 必要 -> evidence
- Harness Engineering -> 支える -> 1回のAgent実行
- Loop Engineering -> 支える -> 継続的なAgent運用
- Context Window -> 制約する -> Agentの判断
- source of truth -> 固定する -> Agentの判断根拠
- Goal -> 固定する -> 完了条件
- Context -> 固定する -> 根拠
- Verification -> 固定する -> 正しさ
- Model -> 固定する -> 作業分担
- Harness + Loop -> 分けて考える -> Agent活用の設計が見通しやすくなる
