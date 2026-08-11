---
title: "Grok Buildをforkして改変する（背景透過）"
description: "Grok Build のforkにパッチを当てて手元のマシンで使う運用についてです。"
pubDate: 2026-07-21
tags: [AI, Rust, terminal, Agent, Grok, tech]
draft: false
---

夏の暑さに苦しめられています。
[fujitani sora](https://x.com/sorafujitani) です。

Grok Build のforkにパッチを当てて手元のマシンで使う運用についてです。
現状は外部PR不可であるため、この対応にしています。
fullscreen mode で、テーマの背景色を画面全体に塗らずに、terminalの背景色をそのまま使えるようにしたのでその例で解説します。

https://github.com/xai-org/grok-build

手元で使う fork repo（パッチは main に merge 済み）

https://github.com/sorafujitani/grok-build

PR

https://github.com/sorafujitani/grok-build/pull/1

前提として、本記事公開時点で Grok Build のライセンスは`Apache-2.0`です。
これは対象ソフトウェアの改変が許可されていることを意味します。

https://licenses.opensource.jp/Apache-2.0/Apache-2.0.html

## やりたいこと

Coding Agent 起動時にもterminalの背景色を使いたいですが、
Grok Build の fullscreen modeでは画面全体をテーマの背景色（`bg_base` など）で塗り潰す仕様になっています。

Grok Build fullscreen mode 起動時にもterminalの背景色を使えるようにするのが達成状態です。

パッチ前のfull tui mode
![パッチ前のfull tui mode](/blog/grok-build-transparent-background/3e9bd5fd24d7-20260718.png)

パッチ後のfull tui mode
![パッチ後のfull tui mode](/blog/grok-build-transparent-background/4b017ee82bb0-20260718.png)

## fullscreen と minimal

公式の render mode は `screen_mode` で切り替えます。
値は `"fullscreen"` と `"minimal"`。

| モード | 設定 / CLI | 画面背景 |
| --- | --- | --- |
| fullscreen | `screen_mode = "fullscreen"` / `--fullscreen` / `/fullscreen` | テーマの `bg_base` などで塗りつぶし |
| minimal | `screen_mode = "minimal"` / `--minimal` / `/minimal` | 端末の default 背景（`Color::Reset`） |

```toml
# ~/.grok/config.toml
[ui]
screen_mode = "fullscreen"  # または "minimal"
theme = "auto"
```

```sh
grok --fullscreen
grok --minimal
```

minimal なら画面背景は端末 default になるが、fullscreen 側の見た目と機能は捨てることになります。
`pager.toml` のブロック `bg = "none"` はパネル単位の話で、画面全体のテーマ塗りを切る設定ではないです。

fullscreen のまま背景だけ `Color::Reset` にする公式スイッチは見当たらなかったので、fork にパッチを入れて main で運用しています。

## パッチ

テーマの背景スロットは docs 上も `bg_base` / `bg_light` / `bg_dark` などとして定義されています。
minimal 用 palette はもともとこれらを `Color::Reset` にしているので背景色の投下が可能です。

```rust:crates/codegen/xai-grok-pager-render/src/theme/terminal_default.rs
// bg_base: Color::Reset,
```

fullscreen でも同じことをしてあげます。
`Theme::current()` の末尾で、背景スロットだけ Reset に寄せて、
アクセントなど前景のテーマ色はそのままにします。

```rust:crates/codegen/xai-grok-pager-render/src/theme/terminal_default.rs
let themed = /* 既存のテーマ解決 */;

if transparent_canvas_enabled() {
    themed.with_transparent_canvas()
} else {
    themed
}
```

```rust:crates/codegen/xai-grok-pager-render/src/theme/terminal_default.rs
// 名前の canvas は手元パッチ側の命名。触っている実体は bg_base などの背景スロット
pub fn with_transparent_canvas(mut self) -> Self {
    use ratatui::style::Color;
    self.bg_base = Color::Reset;
    self.bg_light = Color::Reset;
    self.bg_dark = Color::Reset;
    self.bg_highlight = Color::Reset;
    self.bg_hover = Color::Reset;
    self.bg_terminal = Color::Reset;
    self.bg_visual = Color::Reset;
    self.scrollbar_bg = Color::Reset;
    self.md_code_bg = Color::Reset;
    self.paste_bg = Color::Reset;
    self.diff_delete_bg = Color::Reset;
    self.diff_insert_bg = Color::Reset;
    self
}
```

```rust:crates/codegen/xai-grok-pager-render/src/theme/terminal_default.rs
// デフォルト有効。stock の塗りに戻すときは GROK_OPAQUE_BG=1
fn transparent_canvas_enabled() -> bool {
    match std::env::var("GROK_OPAQUE_BG") {
        Ok(v) => {
            let v = v.trim();
            !(v == "1" || v.eq_ignore_ascii_case("true") || v.eq_ignore_ascii_case("yes"))
        }
        Err(_) => true,
    }
}
```

## ビルドと入れ方

ソースは fork の main を使います。パッチはすでに merge 済みです。
GitHubにforkした Grok Build に同様のパッチを当ててbuildすれば同じことができます。

```sh
git clone https://github.com/sorafujitani/grok-build.git
cd grok-build
# 手元の ghq 配置なら
# cd ~/ghq/github.com/sorafujitani/grok-build

cargo build -p xai-grok-pager-bin --release

cp target/release/xai-grok-pager \
  ~/.grok/downloads/grok-0.2.102-patched-transparent-macos-aarch64
ln -sfn ../downloads/grok-0.2.102-patched-transparent-macos-aarch64 \
  ~/.grok/bin/grok
```

```toml
# ~/.grok/config.toml
[ui]
screen_mode = "fullscreen"
```

```sh
grok --version
GROK_OPAQUE_BG=1 grok  # テーマ塗りに戻す
```

## その他

- 公式 prebuilt の update が `~/.grok/bin/grok` を差し替えることがある。そのときは fork から rebuild して symlink を張り直す
- 手元ビルドは open source の `0.2.102` 系。直前に使っていた prebuilt は `0.2.103`
- 切っているのは `bg_base` などの背景スロットだけ。選択ハイライトなど一部 UI は色を塗る

```sh
cd ~/ghq/github.com/sorafujitani/grok-build
git pull origin main
cargo build -p xai-grok-pager-bin --release
cp target/release/xai-grok-pager \
  ~/.grok/downloads/grok-0.2.102-patched-transparent-macos-aarch64
ln -sfn ../downloads/grok-0.2.102-patched-transparent-macos-aarch64 \
  ~/.grok/bin/grok
```
