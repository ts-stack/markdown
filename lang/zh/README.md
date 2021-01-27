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
- [API](#api)
  - [Marked的class和types的方法](#Marked的class和types的方法)
  - [Renderer的API](#Renderer的API)
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

Marked.setOptions
({
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
npm install @types/highlight.js -D
```

一个可使代码块高亮的函数：

```ts
import { Marked } from '@ts-stack/markdown';
import { highlight } from 'highlight.js';

Marked.setOptions({ highlight: (code, lang) => highlight(lang, code).value });
let md = '```js\n console.log("hello"); \n```';
console.log(Marked.parse(md));
```
### renderer重要方法

renderer的方法允许你自定义设置。这有一个例子，通过添加自定义id头覆盖默认的设置。

```ts
import { Marked, Renderer } from '@ts-stack/markdown';

class MyRenderer extends Renderer
{
  // 覆盖父方法.
  heading(text: string, level: number, raw: string)
  {
    const regexp = /\s*{([^}]+)}$/;
    const execArr = regexp.exec(text);
    let id: string;
    
    if(execArr)
    {
      text = text.replace(regexp, '');
      id = execArr[1];
    }
    else
    {
      id = text.toLocaleLowerCase().replace(/[^\wа-яіїє]+/gi, '-');
    }

    return `<h${level} id="${id}">${text}</h${level}>`;
  }
}

Marked.setOptions({renderer: new MyRenderer});

console.log(Marked.parse('# heading {my-custom-hash}'));
```

这段代码输出的HTML是：

```html
<h1 id="my-custom-hash">heading</h1>
```

更多[渲染器的API](#渲染器的API)。

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

  switch(channel)
  {
    case 'youtube':
    {
      const id = escape(content);
      return `\n<iframe width="420" height="315" src="https://www.youtube.com/embed/${id}"></iframe>\n`;
    }
    case 'katex':
    {
      return katex.renderToString(escape(content));
    }
    default:
    {
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

## API

### Marked的class和types的方法

```ts
/**
 * 接受Markdown文本以HTML格式返回文本
 * 
 * @param src 需要编译的markdown源码字符串
 * 
 * @param options 一些选项，他们可以被替换，但是不能与默认选项合并
 * 如何你想合并，你可以通过 `Marked.setOptions()` 做，你也可以使用`Marked.setOptions`
 * 
 */
static parse(src: string, options?: MarkedOptions): string;

/**
 * 允许Markdown文本可以返回格式化的HTML对象文本，通过 `BlockLexer.parser()` 来解析
 * 
 * @param src 需要编译的markdown源码字符串
 * @param options 一些选项，他们可以被替换，但是不能与默认选项合并
 * 如何你想合并，你可以通过 `Marked.setOptions()` 做
 */
static debug(src: string, options?: MarkedOptions): {result: string, tokens: Token[], links: Links};


/**
 * 将设置选项和默认选项合并
 * 
 * @param options 散列选项.
 */
static setOptions(options: MarkedOptions): this;


interface Token
{
  type: number | string;
  text?: string;
  lang?: string;
  depth?: number;
  header?: string[];
  align?: ('center' | 'left' | 'right')[];
  cells?: string[][];
  ordered?: boolean;
  pre?: boolean;
  escaped?: boolean;
  execArr?: RegExpExecArray;
  /**
   * 用于调试，标识生成的HTML文件中的行号
   */
  line?: number;
}

enum TokenType
{
  space = 1
  ,text
  ,paragraph
  ,heading
  ,listStart
  ,listEnd
  ,looseItemStart
  ,looseItemEnd
  ,listItemStart
  ,listItemEnd
  ,blockquoteStart
  ,blockquoteEnd
  ,code
  ,table
  ,html
  ,hr
}


// 这个class也可以用作接口.
class MarkedOptions
{
  gfm?: boolean = true;
  tables?: boolean = true;
  breaks?: boolean = false;
  pedantic?: boolean = false;
  sanitize?: boolean = false;
  sanitizer?: (text: string) => string;
  mangle?: boolean = true;
  smartLists?: boolean = false;
  silent?: boolean = false;

  /**
   * @param code 需要高亮的代码片段.
   * @param lang 在代码块中指定的编码语言.
   */
  highlight?: (code: string, lang?: string) => string;
  langPrefix?: string = 'lang-';
  smartypants?: boolean = false;
  headerPrefix?: string = '';
  /**
   * 默认是实例化的渲染器即：`new Renderer()`
   */
  renderer?: Renderer;
  /**
   * 自关闭无效标签按照XHML要求处理 (&lt;br/&gt;, &lt;img/&gt;, etc.)
   * with a "/" as required by XHTML.
   */
  xhtml?: boolean = false;
  /**
   * 用于转义HTML实体的函数，默认情况下使用内部 helper
   */
  escape?: (html: string, encode?: boolean) => string = escape;
  /**
   * 用于返转义HTML实体的函数，默认情况下也使用内部 helper
   */
   unescape?: (html: string) => string = unescape;
   /**
   * 如果设置为 `false`，一行文本默认会生成一段
   * 
   * ```ts
   * // isNoP == false
   * Marked.parse('some text'); // returns '<p>some text</p>'
   * 
   * Marked.setOptions({isNoP: true});
   * 
   * Marked.parse('some text'); // returns 'some text'
   * ```
   */
  isNoP?: boolean;
  }
```

### Renderer的API

```ts
//*** 块级渲染的方法 ***

code(code: string, lang?: string, escaped?: boolean): string;

blockquote(quote: string): string;

html(html: string): string;

heading(text: string, level: number, raw: string): string;

hr(): string;

list(body: string, ordered?: boolean): string;

listitem(text: string): string;

paragraph(text: string): string;

table(header: string, body: string): string;

tablerow(content: string): string;

tablecell(content: string, flags: {header?: boolean, align?: 'center' | 'left' | 'right'}): string;

//*** 内联级的渲染方法. ***

strong(text: string): string;

em(text: string): string;

codespan(text: string): string;

br(): string;

del(text: string): string;

link(href: string, title: string, text: string): string;

image(href: string, title: string, text: string): string;

text(text: string): string;

```

## 基础环境和跑项目

基于node的 `v8.9.x`以上版本

``` bash
git clone https://github.com/ts-stack/markdown.git
cd markdown
npm install
cd projects/markdown-tests
npm install
npm run compile
npm run bench
```

默认情况下，只需要安装一次测试套件。测试套件包括所有的 markdown 特性。它不迎合特性的方便（你可以自行做些扩展）。

| Lib                     | Lib load, ms | Lib init, ms | Bench work, ms | Total, ms | Memory usage, KB
| ------------------------|--------------|--------------|----------------|-----------|------------------
| @ts-stack/markdown v1.0.0-beta.4 | 5            | 4            | 84             | 93        | 5 706
| marked v0.8.0           | 5            | 7            | 86             | 98        | 7 489
| markdown v0.5.0         | 2            | 2            | 128            | 132       | 19 220
| remarkable v2.0.0       | 5            | 2            | 136            | 143       | 12 408
| commonmark v0.29.1      | 19           | 3            | 148            | 170       | 22 571
| markdown-it v10.0.0     | 24           | 3            | 176            | 203       | 17 190
| showdown v1.8.6         | 4            | 7            | 408            | 419       | 57 767

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

Copyright (c) 2018-2020, Костя Третяк. (MIT License)

See LICENSE for more info.

[gfm]: https://help.github.com/articles/github-flavored-markdown
[gfmf]: http://github.github.com/github-flavored-markdown/
[pygmentize]: https://github.com/rvagg/node-pygmentize-bundled
[highlight]: https://github.com/isagalaev/highlight.js
[badge]: http://badge.fury.io/js/marked
[tables]: https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#wiki-tables
[breaks]: https://help.github.com/articles/github-flavored-markdown#newlines

> 欢迎提供修改意见。
