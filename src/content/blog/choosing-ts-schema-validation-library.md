---
title: "Bundle Size Constraints of Class-Based Zod, and When to Use It"
description: "Zod's class-based design limits tree-shaking and impacts bundle size — here's when that matters and when it doesn't"
pubDate: 2026-03-07
tags: [typescript, zod, valibot, bundle-size, tree-shaking]
draft: false
---

I sometimes get asked how I choose a schema validation library in TypeScript, so I wanted to write down the criteria I use.

The most popular option is [Zod](https://github.com/colinhacks/zod), and I use it often — so this is more about when I _don't_ use Zod.

## Background: TypeScript, Transpilation, and Bundle Size

TypeScript can't be executed directly. It has to be converted to JavaScript first — a process called transpilation.

The broader pipeline of transforming the TypeScript you write into optimized, runtime-ready JavaScript is called the **build** process. The data size of the resulting JavaScript is called the **bundle size**.

Bundle size is easy to overlook but important. Smaller bundles lead to:

- **Faster web performance** — JavaScript runs in the browser, and it's frequently sent from the web server to the client. A smaller bundle means less bandwidth and faster page loads.
- **Faster installs** — `npm install` downloads built JavaScript, so a smaller package means quicker installs and less disk usage (though this difference is relatively small).

## Tree-Shaking and Its Limitation with Classes

Bundle size is directly related to the choice between Zod and its alternatives.

One key step in the build process (beyond transpilation) is **tree-shaking** — a mechanism that removes dead code (code that's defined but never referenced) from the build output.

Without tree-shaking, unused variables and functions end up in the final bundle, bloating its size unnecessarily. Of course, you shouldn't leave dead code around in the first place — but having machines handle this automatically is what matters.

https://rollupjs.org/introduction/#tree-shaking

However, tree-shaking has an important limitation: **it cannot eliminate unused code defined inside class syntax.** It works fine for regular functions, variables, and objects — but not for class internals.

This means that when a user does something like `import { z } from "zod"`, all the methods and properties defined inside Zod's classes get pulled into the build — even the ones you never use.

Here's what Zod's internals look like:
https://github.com/colinhacks/zod/blob/7d98c909329713cb2f478620f8a67aaf3ef40ce2/packages/zod/src/v3/types.ts#L158

This limitation makes Zod's bundle size a real concern and creates an opening for competing libraries.

For example, [Valibot](https://github.com/open-circle/valibot) uses a function-based design and achieves a significantly smaller bundle size compared to Zod:
https://speakerdeck.com/nayuta999999/baridesiyonraiburariche-di-bi-jiao?slide=16

## Why Did Zod Choose a Class-Based Design?

So why did Zod go with classes in the first place?

This is actually documented in a conversation between Zod's creator and TypeScript's former manager. The answer: **he didn't know any other way to implement it at the time.**

> 15:29 You've chosen classes with Zod, and pretty much everything in Zod there's a lot of things which are not classes, a lot of things are basically just methods inside these classes. The main types you've chosen to represent with classes. Why was that?

> Colin: 15:43 The super brief answer is, when I was doing this, I was not aware of any other way to really represent that. Now, this is what IOTS does as well, and we can talk the fact that you use classes here lets you represent complex types in a pretty concise way.

https://www.totaltypescript.com/bonuses/typescript-expert-interviews/colin-mcdonnell-talks-about-the-design-choices-behind-zod

Endearing, honestly.

## So When Should You Use What?

Here's how I decide:

### Backend TypeScript → Zod

Backend TypeScript typically doesn't go through heavy build optimization beyond transpilation. The code just sits on a server, so bundle size rarely matters. Zod's excellent API is convenient, so I use it whenever it fits.

As a side note, minifying or bundling backend TypeScript can cause issues like losing accurate stack traces at runtime — another reason not to over-optimize there.

### CLI Tools & Parsers → Zod

Same reasoning as backend. It runs on a machine, not in a browser, so bundle size isn't a concern.

### Browser-Facing JavaScript → Valibot

When bundle size matters — i.e., the code runs in the browser — I currently use Valibot. There are other alternatives out there, but I'm less familiar with them.

## Final Thoughts

Honestly, for personal tools and small projects, worrying about this level of detail may not be the best use of your time. But since I work on OSS projects with a larger user base, it matters to me.

I'm not suggesting you immediately swap libraries — that's a heavy decision. Instead, a good first step is to turn on your build tool's bundle size reporting and start getting a feel for how big your code actually is.
