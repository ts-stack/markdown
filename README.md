[![Build Status](https://travis-ci.org/KostyaTretyak/marked-ts.svg?branch=master)](https://travis-ci.org/KostyaTretyak/marked-ts)

# marked-ts

> A full-featured markdown parser and compiler, written in TypeScript.

This is fork of popular library `marked` from [this commit](https://github.com/chjj/marked/tree/39fbc8aedb3e17e0b098cf753492402614bd6b3e)
(Merge pull request #961 from chjj/release-0.3.7, Dec 1, 2017).

For now - work in progress (there is only alpha.5 version).

- [Install](#install)
- [Usage](#usage)
  - [Minimal usage](#minimal-usage)
  - [Example usage with highlight.js](#example-usage-with-highlightjs)
  - [Overriding renderer methods](#overriding-renderer-methods)
  - [Example of setting a simple block rule](#example-of-setting-a-simple-block-rule)
- [API](#api)
  - [Methods of Marked class and necessary types](#methods-of-marked-class-and-necessary-types)
  - [Renderer methods API](#renderer-methods-api)
- [Philosophy behind marked](#philosophy-behind-marked)
- [Benchmarks](#benchmarks)
  - [Options for benchmarks](#options-for-benchmarks)
    - [Example of usage bench options](#example-of-usage-bench-options)
- [Contribution and License Agreement](#contribution-and-license-agreement)
- [License](#license)

## Install

``` bash
npm install marked-ts --save
```

## Usage

### Minimal usage:

```js
import { Marked } from 'marked-ts';

console.log(Marked.parse('I am using __markdown__.'));
// Outputs: I am using <strong>markdown</strong>.
```

Example setting options with default values:

```js
import { Marked, Renderer } from 'marked-ts';

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

### Example usage with highlight.js

```bash
npm install highlight.js @types/highlight.js --save
```

A function to highlight code blocks:

```ts
import { Marked } from 'marked-ts';
import { highlightAuto } from 'highlight.js';

let md = '```js\n console.log("hello"); \n```';

Marked.setOptions({ highlight: code => highlightAuto(code).value });

console.log(Marked.parse(md));
```

### Overriding renderer methods

The renderer option allows you to render tokens in a custom manner. Here is an
example of overriding the default heading token rendering by adding custom head id:

```ts
import { Marked, Renderer, MarkedOptions } from 'marked-ts';

// Setting some options for Marked.
const markedOptions: MarkedOptions = {};

const renderer = new Renderer(markedOptions);

// Overriding renderer.
renderer.heading = function (text, level)
{
  const patt = /\s?{([^}]+)}$/;
  const link = patt.exec(text);
  let linkStr: string;
  
  if(link && link.length && link[1])
  {
    text = text.replace(patt, '');
    linkStr = link[1];
  }
  else
  {
    linkStr = text.toLocaleLowerCase().replace(/[^\wа-яіїє]+/gi, '-');
  }

  return '<h' + level + ' id="' + linkStr + '">' + text + '</h' + level + '>';
};

markedOptions.renderer = renderer;
Marked.setOptions(markedOptions);

console.log(Marked.parse('# heading {my-custom-hash}'));
```

This code will output the following HTML:

```html
<h1 id="my-custom-hash">heading</h1>
```

### Example of setting a simple block rule

This functionality is still available only in the `dev` branch.

If you need to set simple rules, when you do not need recursiveness or other advanced features,
you can use the `Marked.setBlockRule()` method:

```ts
import { Marked } from 'marked-ts';

const blockStr = `
# Example usage with youtube id video

@@@
JgwnkM5WwWE
@@@
`;

Marked.setBlockRule(/^@@@\n([\s\S]+?)\n@@@/, function (execArr) {
  const id = execArr[1];
  return `<iframe width="420" height="315" src="https://www.youtube.com/embed/${id}"></iframe>`;
});

const html = Marked.parse(blockStr);

console.log(html);
```

This code output:

```html
<h1 id="example-usage-with-youtube-id-video">Example usage with youtube id video</h1>
<iframe width="420" height="315" src="https://www.youtube.com/embed/JgwnkM5WwWE"></iframe>
```

## API

### Methods of Marked class and necessary types

```ts
/**
 * Accepts Markdown text and returns text in HTML format.
 * 
 * @param src String of markdown source to be compiled.
 * 
 * @param options Hash of options. Can also be
 * set using the `Marked.setOptions` method as seen above.
 */
static parse(src: string, options?: MarkedOptions): string;


/**
 * Merges the default options with options that will be set.
 * 
 * @param options Hash of options.
 */
static setOptions(options: MarkedOptions): this;

// This class also using as a type.
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
   * @param code The section of code to pass to the highlighter.
   * @param lang The programming language specified in the code block.
   */
  highlight?: (code: string, lang?: string) => string;
  langPrefix?: string = 'lang-';
  smartypants?: boolean = false;
  headerPrefix?: string = '';
  /**
   * An object containing functions to render tokens to HTML. Default: `new Renderer()`
   */
  renderer?: Renderer;
  /**
   * Self-close the tags for void elements (&lt;br/&gt;, &lt;img/&gt;, etc.)
   * with a "/" as required by XHTML.
   */
  xhtml?: boolean = false;
  /**
   * The function that will be using to escape HTML entities.
   * By default using inner helper.
   */
  escape?: (html: string, encode?: boolean) => string = escape;
  /**
   * The function that will be using to unescape HTML entities.
   * By default using inner helper.
   */
  unescape?: (html: string) => string = unescape;
}
```

### Renderer methods API

```ts
//*** Block level renderer methods. ***

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

//*** Inline level renderer methods. ***

strong(text: string): string;

em(text: string): string;

codespan(text: string): string;

br(): string;

del(text: string): string;

link(href: string, title: string, text: string): string;

image(href: string, title: string, text: string): string;

text(text: string): string;

```

## Philosophy behind marked

The point of marked was to create a markdown compiler where it was possible to
frequently parse huge chunks of markdown without having to worry about
caching the compiled output somehow...or blocking for an unnecessarily long time.

Marked is very concise and still implements all markdown features.

Marked more or less passes the official markdown test suite in its
entirety. This is important because a surprising number of markdown compilers
cannot pass more than a few tests. It was very difficult to get marked as
compliant as it is.

Along with implementing every markdown feature, marked also implements [GFM
features][gfmf].

## Benchmarks

node v8.9.x

``` bash
git clone https://github.com/KostyaTretyak/marked-ts.git
cd marked-ts
npm install
npm run compile
npm run bench
```

By default, these benchmarks run the entire markdown test suite once. The test suite includes every markdown feature,
it doesn't cater to specific aspects.

| Lib                   | Load lib, ms | Init lib, ms | Bench work, ms | Total, ms | Memory usage, KB
| ----------------------|--------------|--------------|----------------|-----------|------------------
| marked-ts alpha.5     | 6            | 6            | 101            | 113       | 8 641
| marked v0.3.9         | 4            | 2            | 106            | 112       | 9 323
| remarkable v1.7.1     | 36           | 6            | 174            | 216       | 15 356
| markdown-it v8.4.0    | 29           | 10           | 227            | 266       | 18 890
| showdown v1.8.6       | 10           | 14           | 353            | 377       | 36 833
| markdown v0.5.0       | 4            | 3            | 314            | 321       | 22 664


### Options for benchmarks

```text
-l, --length       Approximate string length in kilobytes. Default ~ 300 KB.
-t, --times        Number of runs this bench. Default - 1 times.
```

Test files are accumulated in one file. If you specify, for example, `--length 100`
the first file will be taken, checked whether it is longer than 100 kilobytes,
and if no - it will be attached to the next one and checked its length, and so on.

#### Example of usage bench options

In order for npm passing the parameters, they need to be separated via ` -- `:

```text
npm run bench -- -l 500 -t 1
```

## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`

## License

Copyright (c) 2011-2014, Christopher Jeffrey. (MIT License)

Copyright (c) 2018, Костя Третяк. (MIT License)

See LICENSE for more info.

[gfm]: https://help.github.com/articles/github-flavored-markdown
[gfmf]: http://github.github.com/github-flavored-markdown/
[pygmentize]: https://github.com/rvagg/node-pygmentize-bundled
[highlight]: https://github.com/isagalaev/highlight.js
[badge]: http://badge.fury.io/js/marked
[tables]: https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#wiki-tables
[breaks]: https://help.github.com/articles/github-flavored-markdown#newlines
