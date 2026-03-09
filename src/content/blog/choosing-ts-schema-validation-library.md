---
title: "Zodはclassオブジェクトにtree-shakingが効かないこともあってbundle sizeがでかい"
description: "Zodのclass base設計によるtree shakingの制約とbundle sizeへの影響、使い分けの観点をまとめました"
pubDate: 2026-03-07
tags: [typescript, zod, valibot, bundle-size, tree-shaking]
draft: false
---

TypeScript schema validation libraryの選定ってどうしてる？みたいな相談をされることがあったので、観点として持っているものを簡単にまとめてみます。一番有名（な気がする）なのはZodで僕もよく使うので、逆にZodを使わないのはどんな時かみたいな話です。

## 前提: TypeScriptのトランスパイルとbundle size

前提の話として、TypeScriptはそのまま機械語に変換して実行することはできず、一度JavaScriptに変換してから実行する必要がある（トランスパイルってやつ）。

このトランスパイルを含めた、開発者が記述したTypeScriptをランタイムで実行したいJavaScriptに変換して、かつそれを最適化する一連の変換プロセスをbuildという。buildが完了した後のJavaScriptコードのデータサイズを「bundle size」という。

友達の記事がわかりやすくて、先に読むと理解しやすいかも

https://qiita.com/JinA293/items/6b60456fa9cceba1341f

このbundle sizeというのは意識するのが難しいけど大切で、小さいと下記の嬉しさにつながる

- JavaScriptはブラウザ上で動作するという特徴があり、web serverからブラウザへの送信が頻繁に行われる。この時に、bundle sizeが小さいほど通信の帯域幅を取らず、webパフォーマンスの高速さにつながる
- npm installなどはbuild後のJavaScriptをダウンロードしてくるので、これが小さいとインストール速度が速くなりやマシンの使用量が小さくなることにつながる（これは結構微差だが）

## tree shakingとclass構文の制約

このbuild後のbundle sizeが、Zodを使うかの選定に関係しています。buildのトランスパイル以外のプロセスの一つにtree shakingというのがあります。定義されたが参照がないコード（デットコード）をbuild成果物から除外するための仕組みです。

これがなければ実際に使用されていない変数や関数もbuild成果物に含まれ、未使用コードによってbundle sizeの肥大化が発生するなどの原因になります。そもそもデッドコードを残しておくなという話ではあるが、人間ではなく機械がなんとかできるということが大切。

https://rollupjs.org/introduction/#tree-shaking

この便利なtree shakingですが、重要な制約があります。通常の関数や変数、それらを含めたオブジェクトには作用するが、class構文内に定義された未使用コードをbuild成果物から除外することができません。

これにより、ユーザーが

```
import { ClassDef } from "zod";
```

などでzodからclass定義されたものをimportすることで、そのclass内に定義されているが使っていない全てのオブジェクトがbuildに含まれる結果になる。Zodの内部実装はこんな感じ

https://github.com/colinhacks/zod/blob/7d98c909329713cb2f478620f8a67aaf3ef40ce2/packages/zod/src/v3/types.ts#L158

この制約によってZodのbundle sizeはユーザーにとっての課題の一つになり、競合OSSの付け入る隙になっているわけです。例えばValibotは関数ベースの設計であり、Zodと比較した際のbundle sizeの改善に成功しています

https://speakerdeck.com/nayuta999999/baridesiyonraiburariche-di-bi-jiao?slide=16

## なぜZodはclass baseの設計判断をしたのか

この制約があって、なぜZodはclass baseの設計判断をしたのか。Zodの開発者本人とTypeScriptの元マネージャーの議事録に残っていて、「Zodの設計をしているときにclass base以外の実装方法を知らなかった」らしいです。かわいいですね。

> 15:29 You've chosen classes with Zod, and pretty much everything in Zod there's a lot of things which are not classes, a lot of things are basically just methods inside these classes. The main types you've chosen to represent with classes. Why was that?

> Colin: 15:43 The super brief answer is, when I was doing this, I was not aware of any other way to really represent that. Now, this is what IOTS does as well, and we can talk the fact that you use classes here lets you represent complex types in a pretty concise way.

https://www.totaltypescript.com/bonuses/typescript-expert-interviews/colin-mcdonnell-talks-about-the-design-choices-behind-zod

## 使い分け

ではZodは使うべきではないのか？みたいな話。僕は下記の使い分けをしています。

### backend ts → Zod

例えばbackend tsではZodを使うことが多い。backendのtsではトランスパイル以上のbuild最適化をしないことが多く、サーバに配置されるだけなのでbundle sizeはあまり問題にならない。

番外編知識として、backend tsのコードをminifyやbundleすると実行時に正しいstack traceが取れなくなるなどの不便がある。Zodの優れたAPIは便利なので必要なケースでは積極的に使う。

### CLIやParser → Zod

マシン上で動けばいいツール（CLI, Parser）でも基本的にZodを使って、backend tsとほぼ同じ理由。

### ブラウザで動作するJS → Valibot

bundle sizeが気になる（ブラウザで動作する前提のjsなど）ケースでは、現状はValibotを使っています。他にも選択肢はあるがそっちはあまり知らない。

## まとめ

正直個人で使うツールなどでここまで意識することがコスパいいかと言われると微妙ですが、ユーザーが多いOSSの開発をしたりしている関係で自分には重要だったりします。

これを見てライブラリを変えよう！とかは重たい話だと思うので、まずはbuildツールのbundle size表示オプションをonにして、自分が書いてるコードのsizeは何byteくらいだろうか、とかを見てみるとよさそう
