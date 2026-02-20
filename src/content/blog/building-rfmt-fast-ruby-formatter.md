---
title: "Building rfmt: A Fast Ruby Code Formatter"
description: "Introducing rfmt, a high-speed Ruby code formatter built with Rust"
pubDate: 2026-01-25
tags: [ruby, rust, oss, formatter]
draft: false
---

I'm building rfmt, a fast Ruby code formatter.

## Links

- GitHub: https://github.com/sorafujitani/rfmt
- RubyGems: https://rubygems.org/gems/rfmt
- DeepWiki: https://deepwiki.com/sorafujitani/rfmt

If you find rfmt useful, please give it a star on GitHub!

## rfmt

rfmt is a Ruby-specific code formatter that can be installed via bundler.

It has the following main features:

- High-speed processing
  - As I'll explain later, I'm developing it with the goal of being faster than existing formatters in the ecosystem
- Opinionated design
  - The necessary configuration is ready at initialization, so you can start using it right away
  - User-configurable parameters are kept to a minimum, making it easy to unify formatting by following conventions
- Additionally, it supports the following cases:
  - check command for Git Hooks and CI
  - Automatic parallel processing optimization based on target file size
  - Diff output via dry run
  - Format on save (currently only supports Vim, other editors will be supported in sequence)

## Technical Architecture

I'm using RubyGems' official Rust Extension for implementation and building the environment.
I adopted this architecture aiming to combine Ruby's flexibility, the implementation of the Rfmt Class that can be used from Ruby code, and Rust's execution speed and robustness.
Using the magnus crate, which is included in the Rust Extension, I implement the FFI layer between Ruby and Rust.

```
Ruby Frontend (CLI/Ruby interface)
        ↓
    FFI Layer (magnus crate)
        ↓
    Rust Core (Formatter)
        ↓
    Prism Parser (AST)
```

I'm using Prism as the parser for syntax analysis of input source code.
To make it easy to adapt even if the de facto standard parser changes, I've chosen a design where the Emitter module that executes formatting doesn't depend directly on Prism, but rather separates the dependency through a Bridge layer.
I plan to write separate articles covering these technical details individually.

## Benchmark

Below is a speed comparison of formatting between rfmt and RuboCop.
Both complete processing at stable speeds even as file size increases, but rfmt is approximately 6x faster.

In my environment, formatting typically completes in 100ms-350ms, and even for fairly large Rails repositories, it finishes in about 500ms.

| Files | Total Lines | rfmt | RuboCop | Ratio |
|-------|-------------|------|---------|-------|
| 9 | ~1,000 | 122ms | 798ms | 6.54x |
| 9 | ~1,700 | 120ms | 797ms | 6.62x |
| 35 | ~4,200 | 122ms | 798ms | 6.57x |

The benchmark comparison is summarized in the file below.
The results show that rfmt is approximately 6x faster in average cases, and memory efficiency is about 1/6.

https://github.com/sorafujitani/rfmt/blob/main/docs/benchmark.md

## Usage

### Install

You can install via bundler.

```sh
gem install rfmt
```

or

```ruby
gem 'rfmt'
```

### Configuration File Initialization

All rfmt-related settings are consolidated in `.rfmt.yml`, which is generated with the following command.
Since the config file is generated at init time, you can start using it immediately without additional configuration.
An option to specify the directory for generation is also available, allowing customization as needed.

```sh
% rfmt init
Created .rfmt.yml
```

You can configure target files, excluded files, and minimal formatting options.

```yaml
version: "1.0"

formatting:
  line_length: 100        # Maximum line length (40-500)
  indent_width: 2         # Spaces/tabs per indent (1-8)
  indent_style: "spaces"  # "spaces" or "tabs"
  quote_style: "double"   # "double", "single", or "consistent"

include:
  - "**/*.rb"
  - "**/*.rake"
  - "**/Rakefile"
  - "**/Gemfile"

exclude:
  - "vendor/**/*"
  - "tmp/**/*"
  - "node_modules/**/*"
  - "db/schema.rb"
```

### Format

I've made the CLI design simple.
Just running rfmt completes the necessary formatting.

```sh
% rfmt
```

For cases where you want to determine "whether there are files that need formatting" in Git Hooks or CI steps, you can use the check command.

```sh
% rfmt check
```

For cases where you want to check the diff without applying the format results, you can confirm the dry run results with the diff option.

```sh
% rfmt ./**.rb --diff
```

### Format on Save

This feature currently only supports Vim.
Support for VSCode, RubyMine, and Zed is in the development plan and will be added in sequence.

Personally, I feel that the importance of format on save has decreased somewhat due to the rise of AI Coding, so I've experimentally implemented support for Vim which I use, and am prioritizing other features.

## Integration with Existing Ecosystem

For simple Ruby scripts, you can use rfmt right away via bundler.
There are no other dependencies.

In environments where a linter is needed, you'll likely want tools like RuboCop.
When using rfmt as a formatter, configuration to avoid conflicts is necessary.
For RuboCop, it's simple - just set Layout Cop to false to turn off the formatting functionality, eliminating conflicts with other tools.

```yaml
# Disable formatting-related Cops
Layout:
  Enabled: false
```

## Going Forward

I will continue with feature additions, maintenance, and addressing Public Issues.

Also, I've prepared templates for GitHub Issues and Pull Requests, so please feel free to contribute.
Bug fixes will be handled as a priority.

I would be happy if rfmt becomes one of the options in the Ruby ecosystem, and if I can contribute to building a fast toolchain.

have fun
