---
title: "Claude CodeのリソースをDevinに同期するshell scriptを運用している"
description: "Claude CodeとDevinを併用しているプロジェクトで、Claude Code側をSingle Source of Truthとし、Devin APIへ同期するシェルスクリプトを開発・運用しています。"
pubDate: 2026-02-24
tags: [ai, shell, devin, claude-code]
draft: false
---

マクドナルドのてりやきが苦手です。
[fujitani sora](https://x.com/sorafujitani)です。

自分はClaude Codeをメイン利用のAgentとし、Remote環境での並列開発などにDevinを利用している。

これらを併用しているプロジェクトでは、それぞれに独自のナレッジやワークフロー定義を持たせることになる。

Claude Code には以下の独自機能がある

| Claude Code の概念 | 役割 |
| --- | --- |
| **Command** | スラッシュコマンドとして呼び出せるワークフロー定義（現在はSkillと統合されている） |
| **SubAgent** | 特定タスクに特化したサブエージェント定義 |
| **Skill** | 特定のトリガーで自動的に発動するスキル定義 |

一方 Devin にも独自機能がある

| Devin の概念 | 役割 |
| --- | --- |
| **Knowledge** | Devinが参照するナレッジベース（トリガー条件付き） |
| **Playbooks** | 手順書としてDevinが実行するワークフロー |

両者は概念的に対応関係にあるにもかかわらず、記法が異なるため手動で二重管理するのはメンテコストがかなり厳しい。

CodexなどのLocalで動作するAgentであればSymbolic Linkなどの解決がありますが、DevinのリソースはRemoteに置かれることや、独自の機能表現もあり単純ではありません。

そこで **Claude Code側をSingle Source of Truthとし、Devin APIへ同期するスクリプト** を作って運用しているので紹介します。

Claude Codeの最新仕様では、CommandとSkillが統合されています。
自分も新しく作成するものはSkillとして作成していますが、本記事で紹介するworkflowにおいては`.claude/command/`をそのまま利用しています。

後方互換のサポートはあるので問題はないですが、Claude Skillの特定パターンのみをDevin Playbooksにマッピングするなど追加の工夫があってもいいかもしれません。

[https://code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)

## ディレクトリ構成

```
project-root/
├── .claude/                 # Claude Code 設定（マスター）
│   ├── commands/            #   スラッシュコマンド定義
│   ├── agents/              #   サブエージェント定義
│   ├── skills/              #   スキル定義
│   └── docs/                #   共有ドキュメント
├── .devin/                  # Devin 設定（自動生成）
│   ├── knowledge/           #   ← sync-to-devin.sh が生成
│   ├── playbooks/           #   ← sync-to-devin.sh が生成
│   └── scripts/
│       └── sync-to-devin.sh
```

## sync-to-devin.sh

`.claude`のリソースを`.devin`用に変換し、Devin APIでRemoteに反映するshell scriptの本体。

```
.claude/commands/  ──┐
.claude/agents/    ──┤── sync-to-devin.sh ──→ Devin API
.claude/skills/    ──┘       │
                             ├── Claude記法の変換
                             ├── ローカルファイル生成 (.devin/)
                             └── API経由でupsert
```

下記が運用しているファイル全体です。
長いです。

普段利用しているshでは具体的なファイル名などが入っていますが、本記事では汎用的なデータに書き換えている。

使用する時は各自の環境に合わせて修正してください。

<summary>sync-to-devin.shファイル全体</summary>

```bash
#!/bin/bash
#
# Devin API登録スクリプト
# Knowledge と Playbook を Devin API に一括登録する
#
# 使用方法:
#   export DEVIN_API_KEY="your-api-key"
#   ./sync-to-devin.sh
#
# オプション:
#   --dry-run    実際の登録を行わず、何が登録されるかを表示
#   --knowledge  Knowledge のみ登録
#   --playbooks  Playbook のみ登録

set -euo pipefail

# 設定
BASE_URL="https://api.devin.ai/v1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVIN_DIR="$(dirname "$SCRIPT_DIR")"
PINNED_REPO="${PINNED_REPO:-your-org/your-repo}"
CLAUDE_DIR="$(dirname "$DEVIN_DIR")/.claude"

# Claude commands → Devin playbooks マッピング (claude_file:devin_file)
COMMAND_PLAYBOOK_MAP=(
    "run-migration.md:run-migration.md"
    "check-guidelines.md:check-guidelines.md"
    "generate-test.md:generate-test.md"
    "update-doc.md:update-guideline.md"
)

# Claude SubAgent → Devin knowledge マッピング (claude_file:devin_file)
AGENT_KNOWLEDGE_MAP=(
    "endpoint-analyzer.md:endpoint-analyzer.md"
    "code-implementer.md:code-implementer.md"
    "code-reviewer.md:code-reviewer.md"
    "webhook-handler.md:webhook-handler.md"
)

# Claude skill → Devin playbooks マッピング (claude_file:devin_file)
SKILL_PLAYBOOK_MAP=(
    "analyze-endpoint.md:analyze-endpoint.md"
    "verify-result.md:verify-result.md"
)

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ヘルプ表示
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run      Show what would be registered without making API calls"
    echo "  --knowledge    Register only Knowledge items"
    echo "  --playbooks    Register only Playbooks"
    echo "  --no-sync-files  Skip local file conversion (Claude → Devin)"
    echo "  --help         Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DEVIN_API_KEY    Required. Your Devin API key"
    echo "  PINNED_REPO      Optional. Repository to pin knowledge to (default: your-org/your-repo)"
}

# エラーハンドリング
error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

info() {
    echo -e "${GREEN}$1${NC}"
}

warn() {
    echo -e "${YELLOW}$1${NC}"
}

# API キー確認
check_api_key() {
    if [[ -z "${DEVIN_API_KEY:-}" ]]; then
        error "DEVIN_API_KEY environment variable is not set"
    fi
}

# 既存リソースのキャッシュ
EXISTING_KNOWLEDGE=""
EXISTING_PLAYBOOKS=""

# 既存 Knowledge 一覧を取得
fetch_existing_knowledge() {
    info "Fetching existing Knowledge..."
    EXISTING_KNOWLEDGE=$(curl -s -X GET "$BASE_URL/knowledge" \
        -H "Authorization: Bearer $DEVIN_API_KEY" \
        -H "Content-Type: application/json")

    local count
    count=$(echo "$EXISTING_KNOWLEDGE" | jq '.knowledge | length')
    info "  Found $count existing Knowledge entries"
}

# 既存 Playbook 一覧を取得
fetch_existing_playbooks() {
    info "Fetching existing Playbooks..."
    EXISTING_PLAYBOOKS=$(curl -s -X GET "$BASE_URL/playbooks" \
        -H "Authorization: Bearer $DEVIN_API_KEY" \
        -H "Content-Type: application/json")

    local count
    count=$(echo "$EXISTING_PLAYBOOKS" | jq 'length')
    info "  Found $count existing Playbooks"
}

# 既存 Knowledge から name で ID を検索
find_knowledge_id() {
    local name="$1"
    if [[ -z "$EXISTING_KNOWLEDGE" ]]; then
        echo ""
        return
    fi
    echo "$EXISTING_KNOWLEDGE" | jq -r --arg name "$name" '.knowledge[] | select(.name == $name) | .id // empty'
}

# 既存 Playbook から title で ID を検索
find_playbook_id() {
    local title="$1"
    if [[ -z "$EXISTING_PLAYBOOKS" ]]; then
        echo ""
        return
    fi
    echo "$EXISTING_PLAYBOOKS" | jq -r --arg title "$title" '.[] | select(.title == $title) | .playbook_id // empty'
}

# Knowledge 登録 (upsert)
register_knowledge() {
    local name="$1"
    local body="$2"
    local trigger="$3"
    local repo="$4"

    local existing_id
    existing_id=$(find_knowledge_id "$name")

    if [[ "$DRY_RUN" == "true" ]]; then
        if [[ -n "$existing_id" ]]; then
            echo "Would update Knowledge: $name (ID: $existing_id)"
        else
            echo "Would create Knowledge: $name"
        fi
        echo "  Trigger: $trigger"
        echo "  Pinned repo: $repo"
        return
    fi

    # jq でペイロード全体を安全に構築
    local payload
    payload=$(jq -n \
        --arg name "$name" \
        --arg body "$body" \
        --arg trigger "$trigger" \
        --arg repo "$repo" \
        '{name: $name, body: $body, trigger_description: $trigger, pinned_repo: $repo}')

    local response
    if [[ -n "$existing_id" ]]; then
        response=$(curl -s -X PUT "$BASE_URL/knowledge/$existing_id" \
            -H "Authorization: Bearer $DEVIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$payload")

        if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
            info "✓ Updated Knowledge: $name (ID: $existing_id)"
        else
            local error_msg
            error_msg=$(echo "$response" | jq -r '.message // .error // .detail // "Unknown error"' 2>/dev/null || echo "$response")
            warn "✗ Failed to update Knowledge: $name - $error_msg"
        fi
    else
        response=$(curl -s -X POST "$BASE_URL/knowledge" \
            -H "Authorization: Bearer $DEVIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$payload")

        if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
            local id
            id=$(echo "$response" | jq -r '.id')
            info "✓ Created Knowledge: $name (ID: $id)"
        else
            local error_msg
            error_msg=$(echo "$response" | jq -r '.message // .error // .detail // "Unknown error"' 2>/dev/null || echo "$response")
            warn "✗ Failed to create Knowledge: $name - $error_msg"
        fi
    fi
}

# Playbook 登録 (upsert)
register_playbook() {
    local name="$1"
    local body="$2"

    local existing_id
    existing_id=$(find_playbook_id "$name")

    if [[ "$DRY_RUN" == "true" ]]; then
        if [[ -n "$existing_id" ]]; then
            echo "Would update Playbook: $name (ID: $existing_id)"
        else
            echo "Would create Playbook: $name"
        fi
        return
    fi

    # jq でペイロード全体を安全に構築
    local payload
    payload=$(jq -n \
        --arg title "$name" \
        --arg body "$body" \
        '{title: $title, body: $body}')

    local response
    if [[ -n "$existing_id" ]]; then
        response=$(curl -s -X PUT "$BASE_URL/playbooks/$existing_id" \
            -H "Authorization: Bearer $DEVIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$payload")

        if echo "$response" | jq -e '.status' > /dev/null 2>&1; then
            info "✓ Updated Playbook: $name (ID: $existing_id)"
        else
            local error_msg
            error_msg=$(echo "$response" | jq -r '.message // .error // .detail // "Unknown error"' 2>/dev/null || echo "$response")
            warn "✗ Failed to update Playbook: $name - $error_msg"
        fi
    else
        response=$(curl -s -X POST "$BASE_URL/playbooks" \
            -H "Authorization: Bearer $DEVIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$payload")

        if echo "$response" | jq -e '.playbook_id' > /dev/null 2>&1; then
            local id
            id=$(echo "$response" | jq -r '.playbook_id')
            info "✓ Created Playbook: $name (ID: $id)"
        else
            local error_msg
            error_msg=$(echo "$response" | jq -r '.message // .error // .detail // "Unknown error"' 2>/dev/null || echo "$response")
            warn "✗ Failed to create Playbook: $name - $error_msg"
        fi
    fi
}

# Knowledge trigger_description マッピング
get_trigger_description() {
    local filename="$1"
    case "$filename" in
        "endpoint-analyzer.md")  echo "APIのエンドポイントを解析する時" ;;
        "code-implementer.md")   echo "モジュールを仕様に従って実装する時" ;;
        "code-reviewer.md")      echo "実装結果をレビュー・検証する時" ;;
        *)                       echo "関連する作業時" ;;
    esac
}

# Knowledge ファイル登録
sync_knowledge() {
    info "=== Syncing Knowledge ==="

    # 直接の Knowledge ファイル
    for file in "$DEVIN_DIR/knowledge"/*.md; do
        if [[ -f "$file" ]]; then
            local name
            name=$(basename "$file" .md)
            local body
            body=$(cat "$file")
            local trigger
            trigger=$(get_trigger_description "$(basename "$file")")

            register_knowledge "$name" "$body" "$trigger" "$PINNED_REPO"
        fi
    done

    # サブディレクトリ内のファイル
    local sub_dir="$DEVIN_DIR/knowledge/guidelines"
    if [[ -d "$sub_dir" ]]; then
        for file in "$sub_dir"/*.md; do
            if [[ -f "$file" ]]; then
                local name
                name="guidelines-$(basename "$file" .md)"
                local body
                body=$(cat "$file")
                local trigger
                trigger=$(get_trigger_description "$(basename "$file")")

                register_knowledge "$name" "$body" "$trigger" "$PINNED_REPO"
            fi
        done
    fi
}

# Playbook ファイル登録
sync_playbooks() {
    info "=== Syncing Playbooks ==="

    for file in "$DEVIN_DIR/playbooks"/*.md; do
        if [[ -f "$file" ]]; then
            local name
            name=$(basename "$file" .md)
            local instructions
            instructions=$(cat "$file")

            register_playbook "$name" "$instructions"
        fi
    done
}

# Claude固有記法をDevin用に変換
convert_claude_to_devin() {
    local file="$1"

    perl -0777 -pe '
        # 1. YAML frontmatter 除去
        s/\A---\n.*?\n---\n//s;

        # 2. @.claude/docs/xxx.md → Knowledge名に変換
        s|\@\.claude/docs/guidelines/([a-zA-Z_{}-]+)\.md|guidelines-\1（Knowledge）|g;

        # 3. @docs/guidelines → guidelines ナレッジ
        s|\@docs/guidelines|guidelines ナレッジ|g;

        # 4. Task tool subagent 呼び出し行を変換（旧形式）
        s|\*\*Task tool\*\* で \*\*([a-zA-Z_-]+)\*\* を呼び出す[^\n]*|**Knowledge参照**: `\1`（Knowledge）|g;

        # 5. Task tool コードブロック除去（新形式: subagent_type 記法）
        s/\n```\nTask tool:\n\s*subagent_type:.*?\n(?:.*?\n)*?```\n/\n/gs;

        # 6. Task tool コードブロック除去（旧形式）
        s/\n```\nTask tool:\n(?:[^\n]+\n)+```\n/\n/g;

        # 7. subagent_type 参照を Knowledge 参照に変換
        s|subagent_type:\s*"([a-zA-Z_-]+)"|**Knowledge参照**: `\1`（Knowledge）|g;

        # 8. Task[agent-name] 形式を変換
        s|Task\[([a-zA-Z_-]+)\]|`\1`（Knowledge参照）|g;

        # 9. /skill-name 形式のスラッシュコマンド参照を変換
        s|`/analyze-endpoint`|`analyze-endpoint`（Playbook）|g;
        s|`/verify-result`|`verify-result`（Playbook）|g;

        # 10. Claude agent 参照を除去
        s/- `code-simplifier`, `typescript-pro`などのagentを活用\n//g;
    ' "$file"
}

# マッピング配列を使ってファイルを同期する共通関数
sync_mapped_files() {
    local label="$1"
    local src_dir="$2"
    local dst_dir="$3"
    shift 3
    local mappings=("$@")

    if [[ ! -d "$src_dir" ]]; then
        warn "  $label source directory not found: $src_dir"
        return
    fi

    mkdir -p "$dst_dir"

    for mapping in "${mappings[@]}"; do
        local claude_file="${mapping%%:*}"
        local devin_file="${mapping##*:}"
        local src="$src_dir/$claude_file"
        local dst="$dst_dir/$devin_file"

        if [[ ! -f "$src" ]]; then
            warn "  Skip: $claude_file (not found)"
            continue
        fi

        if [[ "$DRY_RUN" == "true" ]]; then
            echo "  Would sync: $claude_file → $devin_file"
            continue
        fi

        convert_claude_to_devin "$src" > "$dst"
        info "  ✓ Synced: $claude_file → $devin_file"
    done
}

# Claude SubAgent/Skill/Commands → Devin knowledge/playbooks ローカルファイル同期
sync_local_files() {
    info "=== Syncing Claude → Devin (Local Files) ==="

    # 1. SubAgent → Knowledge
    info "--- SubAgent → Knowledge ---"
    sync_mapped_files "SubAgent" \
        "$CLAUDE_DIR/agents" \
        "$DEVIN_DIR/knowledge" \
        "${AGENT_KNOWLEDGE_MAP[@]}"

    # 2. Skills → Playbooks
    info "--- Skills → Playbooks ---"
    sync_mapped_files "Skills" \
        "$CLAUDE_DIR/skills" \
        "$DEVIN_DIR/playbooks" \
        "${SKILL_PLAYBOOK_MAP[@]}"

    # 3. Commands → Playbooks
    info "--- Commands → Playbooks ---"
    sync_mapped_files "Commands" \
        "$CLAUDE_DIR/commands" \
        "$DEVIN_DIR/playbooks" \
        "${COMMAND_PLAYBOOK_MAP[@]}"
}

# メイン処理
main() {
    local DRY_RUN="false"
    local SYNC_KNOWLEDGE="true"
    local SYNC_PLAYBOOKS="true"
    local SYNC_FILES="true"

    # 引数パース
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --knowledge)
                SYNC_PLAYBOOKS="false"
                shift
                ;;
            --playbooks)
                SYNC_KNOWLEDGE="false"
                shift
                ;;
            --no-sync-files)
                SYNC_FILES="false"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    # jq 確認
    if ! command -v jq &> /dev/null; then
        error "jq is required but not installed. Install with: brew install jq"
    fi

    # API キー確認（dry-run以外）
    if [[ "$DRY_RUN" != "true" ]]; then
        check_api_key
    fi

    echo "Devin Sync Script"
    echo "================="
    echo "Devin Dir: $DEVIN_DIR"
    echo "Pinned Repo: $PINNED_REPO"
    echo "Dry Run: $DRY_RUN"
    echo ""

    echo "Claude Dir: $CLAUDE_DIR"
    echo ""

    # ローカルファイル同期（Claude SubAgent/Skill/Commands → Devin knowledge/playbooks）
    # デフォルトで実行。API sync 前に常にローカルファイルを最新化する
    if [[ "$SYNC_FILES" == "true" ]]; then
        sync_local_files
        echo ""
    fi

    # 既存リソースの取得（dry-run以外）
    if [[ "$DRY_RUN" != "true" ]]; then
        if [[ "$SYNC_KNOWLEDGE" == "true" ]]; then
            fetch_existing_knowledge
        fi
        if [[ "$SYNC_PLAYBOOKS" == "true" ]]; then
            fetch_existing_playbooks
        fi
        echo ""
    fi

    if [[ "$SYNC_KNOWLEDGE" == "true" ]]; then
        sync_knowledge
        echo ""
    fi

    if [[ "$SYNC_PLAYBOOKS" == "true" ]]; then
        sync_playbooks
        echo ""
    fi

    info "=== Sync Complete ==="
}

main "$@"
```

実行時のログは下記のように出力され、`.claude`をソースとした`.devin`への同期とDevin APIを利用した反映が完了します。

```
$ ./sync-to-devin.sh

Devin Sync Script
=================
Devin Dir: /path/to/project/.devin
Pinned Repo: your-org/your-repo
Dry Run: false

Claude Dir: /path/to/project/.claude

=== Syncing Claude → Devin (Local Files) ===
--- SubAgent → Knowledge ---
  ✓ Synced: endpoint-analyzer.md → endpoint-analyzer.md
  ✓ Synced: code-implementer.md → code-implementer.md
  ✓ Synced: code-reviewer.md → code-reviewer.md
  ✓ Synced: webhook-handler.md → webhook-handler.md
--- Skill → Playbooks ---
  ✓ Synced: analyze-endpoint.md → analyze-endpoint.md
  ✓ Synced: verify-result.md → verify-result.md
--- Commands → Playbooks ---
  ✓ Synced: run-migration.md → run-migration.md
  ✓ Synced: check-guidelines.md → check-guidelines.md
  ✓ Synced: generate-test.md → generate-test.md
  ✓ Synced: update-doc.md → update-guideline.md

Fetching existing Knowledge...
  Found 4 existing Knowledge entries
Fetching existing Playbooks...
  Found 6 existing Playbooks

=== Syncing Knowledge ===
✓ Updated Knowledge: endpoint-analyzer (ID: kn_a1b2c3d4)
✓ Updated Knowledge: code-implementer (ID: kn_e5f6g7h8)
✓ Updated Knowledge: code-reviewer (ID: kn_i9j0k1l2)
✓ Updated Knowledge: webhook-handler (ID: kn_m3n4o5p6)

=== Syncing Playbooks ===
✓ Updated Playbook: analyze-endpoint (ID: pb_q7r8s9t0)
✓ Updated Playbook: check-guidelines (ID: pb_u1v2w3x4)
✓ Updated Playbook: generate-test (ID: pb_y5z6a7b8)
✓ Updated Playbook: run-migration (ID: pb_c9d0e1f2)
✓ Updated Playbook: update-guideline (ID: pb_g3h4i5j6)
✓ Updated Playbook: verify-result (ID: pb_k7l8m9n0)

=== Sync Complete ===
```

## 概念のマッピング

Claude Code と Devin の概念は以下のように対応させます

| Claude Code | Devin | 方向 |
| --- | --- | --- |
| Commands | Playbooks | commands/ → playbooks/ |
| SubAgent | Knowledge | agents/ → knowledge/ |
| Skill | Playbooks | skills/ → playbooks/ |

マッピングはスクリプト内で配列として定義している

```bash
# Claude commands → Devin playbooks（claude側ファイル名:devin側ファイル名）
COMMAND_PLAYBOOK_MAP=(
    "run-migration.md:run-migration.md"
    "check-guidelines.md:check-guidelines.md"
)

# Claude SubAgent → Devin knowledge
AGENT_KNOWLEDGE_MAP=(
    "endpoint-analyzer.md:endpoint-analyzer.md"
    "code-reviewer.md:code-reviewer.md"
)

# Claude skills → Devin playbooks
SKILL_PLAYBOOK_MAP=(
    "analyze-endpoint.md:analyze-endpoint.md"
    "verify-result.md:verify-result.md"
)
```

## 1. Claude固有記法のDevin向け変換

Claude Code のMarkdownにはClaude固有の記法が含まれる。
これをDevinが理解できる形式に変換する必要がある。

```bash
convert_claude_to_devin() {
    local file="$1"

    perl -0777 -pe '
        # 1. YAML frontmatter 除去
        s/\A---\n.*?\n---\n//s;

        # 2. @ファイル参照 → Knowledge名に変換
        s|\@\.claude/docs/migration/([a-zA-Z_{}-]+)\.md|migration-\1（Knowledge）|g;

        # 3. @docs/guidelines → guidelines ナレッジ
        s|\@docs/guidelines|guidelines ナレッジ|g;

        # 4. Task tool サブエージェント呼び出しを変換
        s|\*\*Task tool\*\* で \*\*([a-zA-Z_-]+)\*\* を呼び出す[^\n]*|**Knowledge参照**: `\1`（Knowledge）|g;

        # 5. Task tool コードブロック除去（subagent_type 記法）
        s/\n```\nTask tool:\n\s*subagent_type:.*?\n(?:.*?\n)*?```\n/\n/gs;

        # 6. subagent_type 参照を Knowledge 参照に変換
        s|subagent_type:\s*"([a-zA-Z_-]+)"|**Knowledge参照**: `\1`（Knowledge）|g;

        # 7. スラッシュコマンド参照を Playbook参照に変換
        s|`/analyze-endpoint`|`analyze-endpoint`（Playbook）|g;
    ' "$file"
}
```

変換対象のまとめ

| 変換前 (Claude Code) | 変換後 (Devin) |
| --- | --- |
| YAML frontmatter (`---...---`) | 除去 |
| `@.claude/docs/xxx.md`（ファイル参照） | `xxx（Knowledge）` |
| `Task tool` + `subagent_type`（エージェント呼び出し） | `Knowledge参照: agent-name` |
| `/skill-name`（スラッシュコマンド参照） | `playbook-name（Playbook）` |
| Claude固有エージェント記述 | 除去 |

## 2. Knowledge のトリガー定義

Devin の Knowledge には `trigger_description` を設定できる。これにより、Devin が「いつそのナレッジを参照すべきか」を判断する。

```bash
get_trigger_description() {
    local filename="$1"
    case "$filename" in
        "endpoint-analyzer.md")  echo "APIのエンドポイントを解析する時" ;;
        "code-implementer.md")   echo "モジュールを仕様に従って実装する時" ;;
        "code-reviewer.md")      echo "実装結果をレビュー・検証する時" ;;
        *)                       echo "関連する作業時" ;;
    esac
}
```

Claude Code の場合、SubAgent や Skill の発動条件はMarkdown内のメタデータやシステムプロンプトで暗黙的に制御されるが、Devin では明示的な `trigger_description` が必要。
この変換テーブルがその橋渡しを担います。

[https://docs.devin.ai/ja/api-reference/v1/knowledge/create-knowledge](https://docs.devin.ai/ja/api-reference/v1/knowledge/create-knowledge)

### 3. UpsertによるAPI同期

既存リソースを事前に一括取得し、名前ベースで存在チェック → 作成 or 更新を行う。

```bash
# 既存リソースのキャッシュ
EXISTING_KNOWLEDGE=""

# 起動時に一括取得
fetch_existing_knowledge() {
    EXISTING_KNOWLEDGE=$(curl -s -X GET "$BASE_URL/knowledge" \
        -H "Authorization: Bearer $DEVIN_API_KEY" \
        -H "Content-Type: application/json")
}

# 名前でIDを検索
find_knowledge_id() {
    local name="$1"
    echo "$EXISTING_KNOWLEDGE" | jq -r \
        --arg name "$name" \
        '.knowledge[] | select(.name == $name) | .id // empty'
}

# 登録（upsert）
register_knowledge() {
    local name="$1" body="$2" trigger="$3" repo="$4"

    local existing_id
    existing_id=$(find_knowledge_id "$name")

    # jq でペイロードを安全に構築（エスケープ問題を回避）
    local payload
    payload=$(jq -n \
        --arg name "$name" \
        --arg body "$body" \
        --arg trigger "$trigger" \
        --arg repo "$repo" \
        '{name: $name, body: $body, trigger_description: $trigger, pinned_repo: $repo}')

    if [[ -n "$existing_id" ]]; then
        curl -s -X PUT "$BASE_URL/knowledge/$existing_id" \
            -H "Authorization: Bearer $DEVIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$payload"
    else
        curl -s -X POST "$BASE_URL/knowledge" \
            -H "Authorization: Bearer $DEVIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$payload"
    fi
}
```

upsert実行により、ファイル名をkeyとして重複のないリソース作成を達成できる。

余談ですが、実装時のテスト実行でこの考慮を忘れており、作成されてしまった重複リソースをポチポチと手で消してました。

`jq -n --arg` でJSONペイロードを構築している** のも重要なポイントです。
Markdownの中身を `$body` に入れるため、ダブルクォート・バックスラッシュ・改行などの特殊文字が大量に含まれることがあり、ヒアドキュメントや手動エスケープでは簡単に壊れますが、`jq` に任せることでこの問題を回避している。

[https://docs.devin.ai/ja/api-reference/overview](https://docs.devin.ai/ja/api-reference/overview)

## 4. マッピング配列による汎用的なファイル同期

マッピング配列を使い、Claude側のディレクトリからDevin側のディレクトリへファイルを変換コピーする共通関数を用意している

```bash
sync_mapped_files() {
    local label="$1"    # ログ用ラベル
    local src_dir="$2"  # Claude側ディレクトリ
    local dst_dir="$3"  # Devin側ディレクトリ
    shift 3
    local mappings=("$@")  # マッピング配列

    mkdir -p "$dst_dir"

    for mapping in "${mappings[@]}"; do
        local claude_file="${mapping%%:*}"  # コロンの前
        local devin_file="${mapping##*:}"   # コロンの後
        local src="$src_dir/$claude_file"
        local dst="$dst_dir/$devin_file"

        # Claude記法をDevin向けに変換して出力
        convert_claude_to_devin "$src" > "$dst"
    done
}

# 使用例
sync_mapped_files "SubAgent" \
    "$CLAUDE_DIR/agents" \
    "$DEVIN_DIR/knowledge" \
    "${AGENT_KNOWLEDGE_MAP[@]}"
```

この共通関数により、新しいマッピングの追加は配列に1行足すだけで済む。

## 5. 全体の実行フロー

```
1. ローカルファイル同期 (sync_local_files)
   .claude/ 内のファイルを変換し、.devin/ ディレクトリに出力
   ↓
2. 既存リソース取得 (fetch_existing_*)
   Devin API から現在登録されている Knowledge/Playbooks を一括取得
   ↓
3. Knowledge 同期 (sync_knowledge)
   .devin/knowledge/*.md を API に upsert
   ↓
4. Playbook 同期 (sync_playbooks)
   .devin/playbooks/*.md を API に upsert
```

ローカルの `.devin/` ディレクトリにも変換済みファイルを出力することで、
**Devinがリポジトリを直接読む際にも参照できる** というメリットがあると考えています。

## 使い方

```bash
# 基本的な使い方
export DEVIN_API_KEY="your-api-key"
./sync-to-devin.sh

# dry-run で何が登録されるかだけ確認（APIキー不要）
./sync-to-devin.sh --dry-run

# Knowledge だけ同期
./sync-to-devin.sh --knowledge

# Playbook だけ同期
./sync-to-devin.sh --playbooks

# ローカルファイル変換をスキップしてAPI同期のみ
./sync-to-devin.sh --no-sync-files
```

## まとめ

この仕組みにより、異なる性質を持ったAgentの相互運用、メンテナンスコストの削減にアプローチしています。

自分はこの辺りのAgentを組み込んだworkflow構築が好きな気配もあるので、いろいろ試していきたい。
