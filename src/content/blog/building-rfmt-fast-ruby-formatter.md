---
title: "Building rfmt: A Fast Ruby Code Formatter"
description: "Introducing rfmt, a high-speed Ruby code formatter built with Rust"
pubDate: 2026-01-25
tags: [ruby, rust, oss, formatter]
draft: false 
---

I'm building rfmt, a fast Ruby code formatter.

## What is rfmt

rfmt is a Ruby-specific code formatter that can be installed via bundler.

It's a Gem, so you can install it just like any other package.

### Features

- **High-speed processing**: Aims to be faster than existing formatters in the ecosystem
- **Opinionated design**: Pre-configured and ready to use out of the box, with minimal configuration parameters
- **Additional features**: check command for Git Hooks and CI, automatic parallel processing optimization, dry run diff output, format on save functionality

### Editor Integration

Currently supports Vim only.

VSCode, RubyMine, and Zed support are planned.

## Technical Architecture

It uses RubyGems' official Rust Extension.

The architecture is as follows:

```
Ruby Frontend (CLI/Ruby interface)
        ↓
    FFI Layer (magnus crate)
        ↓
    Rust Core (Formatter)
        ↓
    Prism Parser (AST)
```

The magnus crate implements the FFI layer between Ruby and Rust.

The Emitter, which outputs formatted code, uses a Bridge layer to decouple from Prism.

Since parsers change over time, I wanted to minimize the dependency surface to avoid major rewrites when the parsing method changes.

## Benchmark

Performance comparison with RuboCop (Layout Cops).

rfmt is approximately 6x faster.

| Files | Total Lines | rfmt | RuboCop | Ratio |
|-------|-------------|------|---------|-------|
| 9 | ~1,000 | 122ms | 798ms | 6.54x |
| 9 | ~1,700 | 120ms | 797ms | 6.62x |
| 35 | ~4,200 | 122ms | 798ms | 6.57x |

Typical formatting completes in 100-350ms. For larger Rails repositories, it finishes in about 500ms.

## Installation

```bash
gem install rfmt
```

Or add to your Gemfile:

```ruby
gem 'rfmt'
```

## Configuration

Generate the configuration file with the init command:

```bash
rfmt init
```

This generates `.rfmt.yml`.

The configuration parameters are as follows:

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| line_length | Maximum line length | 120 | 40-500 |
| indent_width | Indentation width | 2 | 1-8 |
| quote_style | Quote style | double | double/single/consistent |
| include | Files to include | ["**/*.rb"] | - |
| exclude | Files to exclude | [] | - |

## Usage

### Format

```bash
rfmt
```

### Check

Determine whether formatting is needed:

```bash
rfmt check
```

Intended for CI integration.

### Diff

Check the diff before applying changes:

```bash
rfmt ./**.rb --diff
```

## Relationship with Existing Ecosystem

rfmt is a dedicated formatter.

For simple Ruby scripts, you can use rfmt alone without any issues.

However, if you use a Linter like RuboCop in your project, you need to configure it properly.

RuboCop has Layout Cops that fix code formatting, and there may be conflicts with rfmt's formatting output.

Add the following to `.rubocop.yml`:

```yaml
Layout:
  Enabled: false
```

## Closing

I plan to continue development, fixing bugs and adding features.

Please feel free to contribute!

## Links

- GitHub: https://github.com/fs0414/rfmt
- RubyGems: https://rubygems.org/gems/rfmt
- DeepWiki: https://deepwiki.com/fs0414/rfmt
