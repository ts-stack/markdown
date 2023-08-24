# [@ts-stack/markdown](https://github.com/ts-stack/markdown)

> 一个用TypeScript写的功能齐全的markdown解析器和编译器。

这个项目从一次提交记录开始，那是2017年12月1日向流行库 [marked](https://github.com/markedjs/marked), [chjj](https://github.com/chjj)/release-0.3.7 提交了一次合并请求，PR记录是 [#961](https://github.com/markedjs/marked/pull/961)。

## 目录

- [安装](#安装)
- [使用](#使用)
  - [简洁用法](#简洁用法)
  - [使用highlight示例](#使用highlight示例)
  - [renderer重要方法](#renderer重要方法)
  - [设置一个简单规则示例](#设置一个简单规则示例)
- [基础环境和跑项目](#基础环境和跑项目)
  - [bench命令传参设置](#bench命令传参设置)
    - [bench命令传参的使用示例](#bench命令传参的使用示例)
- [贡献和许可协议](#贡献和许可协议)
- [许可证](#许可证)

## 安装

``` bash
npm install @ts-stack/markdown --save
```

## 使用

### 简洁用法:

```js
import { Marked } from '@ts-stack/markdown';

console.log(Marked.parse('I am using __markdown__.'));
// 输出: I am using <strong>markdown</strong>.
```

实例使用：

```js
import { Marked, Renderer } from '@ts-stack/markdown';

Marked.setOptions ({
  renderer: new Renderer,
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
});

console.log(Marked.parse('I am using __markdown__.'));
```

### 使用highlight示例

```bash
npm install highlight.js --save
```

一个可使代码块高亮的函数：

```ts
import { Marked } from '@ts-stack/markdown';
import hljs from 'highlight.js';

Marked.setOptions({ highlight: (code, lang) => hljs.highlight(lang, code).value });
let md = '```js\n console.log("hello"); \n```';
console.log(Marked.parse(md));
```
### renderer重要方法

renderer的方法允许你自定义设置。这有一个例子，通过添加自定义id头覆盖默认的设置。

```ts
import { Marked, Renderer } from '@ts-stack/markdown';

class MyRenderer extends Renderer {
  // 覆盖父方法.
  override heading(text: string, level: number, raw: string) {
    const regexp = /\s*{([^}]+)}$/;
    const execArr = regexp.exec(text);
    let id: string;
    
    if(execArr) {
      text = text.replace(regexp, '');
      id = execArr[1];
    } else {
      id = text.toLocaleLowerCase().replace(/[^\wа-яіїє]+/gi, '-');
    }

    return `<h${level} id="${id}">${text}</h${level}>`;
  }
}

Marked.setOptions({ renderer: new MyRenderer });

console.log(Marked.parse('# heading {my-custom-hash}'));
```

这段代码输出的HTML是：

```html
<h1 id="my-custom-hash">heading</h1>
```

### 设置一个简单规则示例

如何在执行正则表达式之前需要递归检查某些条件，你可以使用 `Marked.setBlockRule( regexp[, callback] )` 方法，将第一个参数设置为正则表达式，第二个参数是回调函数。经过 `regexp.exec(string)` 处理后，由 `callback(execArr)` 拿到结果，

在正则表达式中开始符号使用 `^` 非常重要，无论如何你都应该这么做。

```ts
import { Marked, escape } from '@ts-stack/markdown';

/**
 * KaTeX 是一个简单易用的运行在web端的JavaScript库
 */
import * as katex from 'katex';


Marked.setBlockRule(/^@@@ *(\w+)\n([\s\S]+?)\n@@@/, function (execArr) {

  // 如果你需要 Renderer 的上下文，this.方法的话，这里建议不要使用箭头函数

  const channel = execArr[1];
  const content = execArr[2];

  switch(channel) {
    case 'youtube': {
      const id = escape(content);
      return `\n<iframe width="420" height="315" src="https://www.youtube.com/embed/${id}"></iframe>\n`;
    }
    case 'katex': {
      return katex.renderToString(escape(content));
    }
    default: {
      const msg = `[Error: a channel "${channel}" for an embedded code is not recognized]`;
      return '<div style="color: red">' + msg + '</div>';
    }
  }
});

const blockStr = `
# Example usage with embed block code

@@@ katex
c = \\pm\\sqrt{a^2 + b^2}
@@@

@@@ youtube
JgwnkM5WwWE
@@@
`;

const html = Marked.parse(blockStr);

console.log(html);
```

## 基础环境和跑项目

基于node的 `v8.9.x`以上版本

``` bash
git clone https://github.com/ts-stack/markdown.git
cd markdown
npm install
cd projects/markdown-tests
npm install
npm run build
npm run bench
```

默认情况下，只需要安装一次测试套件。测试套件包括所有的 markdown 特性。它不迎合特性的方便（你可以自行做些扩展）。

| Lib                     | Lib load, ms | Lib init, ms | Bench work, ms | Total, ms 
| ------------------------|--------------|--------------|----------------|-----------
| @ts-stack/markdown v1.5.0 | 5            | 4            | 84             | 93 
| marked v0.8.0           | 5            | 7            | 86             | 98
| markdown v0.5.0         | 2            | 2            | 128            | 132
| remarkable v2.0.0       | 5            | 2            | 136            | 143
| commonmark v0.29.1      | 19           | 3            | 148            | 170
| markdown-it v10.0.0     | 24           | 3            | 176            | 203
| showdown v1.8.6         | 4            | 7            | 408            | 419

### bench命令传参设置

```text
-l, --length       Approximate string length in kilobytes. Default ~ 300 KB.
-t, --times        Number of runs this bench. Default - 1 times.
```
测试文件积累在一个文件中。例如你可以指定 -- 长度100kb,如果没有，它将被连接到下一个，并检查它的长度，以此类推。

#### bench命令传参的使用示例

为了让npm传递参数，需要通过指定 `-- `：

```text
npm run bench -- -l 500 -t 1
```

## 贡献和许可协议

如果你向该项目贡献代码，请保证你提交的所有代码都是你的原创作品。`</legalese>`

## 许可证

Copyright (c) 2011-2014, Christopher Jeffrey. (MIT License)

Copyright (c) 2018-2021, Костя Третяк. (MIT License)

See LICENSE for more info.

[gfm]: https://help.github.com/articles/github-flavored-markdown
[gfmf]: http://github.github.com/github-flavored-markdown/
[pygmentize]: https://github.com/rvagg/node-pygmentize-bundled
[highlight]: https://github.com/isagalaev/highlight.js
[badge]: http://badge.fury.io/js/marked
[tables]: https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#wiki-tables
[breaks]: https://help.github.com/articles/github-flavored-markdown#newlines

> 欢迎提供修改意见。
