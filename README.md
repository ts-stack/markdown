# @ts-stack/markdown

> A full-featured markdown parser and compiler, written in TypeScript.

This is fork of popular library `marked` from [this commit](https://github.com/markedjs/marked/tree/39fbc8aed)
(Merge pull request #961 from chjj/release-0.3.7, Dec 1, 2017).

## lang
- [Chinese](./lang/zh/README.md)

## Table of contents

- [Install](#install)
- [Usage](#usage)
  - [Minimal usage](#minimal-usage)
  - [Example usage with highlight.js](#example-usage-with-highlightjs)
  - [Overriding renderer methods](#overriding-renderer-methods)
  - [Example of setting a simple block rule](#example-of-setting-a-simple-block-rule)
- [Benchmarks](#benchmarks)
  - [Options for benchmarks](#options-for-benchmarks)
    - [Example of usage bench options](#example-of-usage-bench-options)
- [Contribution and License Agreement](#contribution-and-license-agreement)
- [License](#license)

## Install

``` bash
npm install @ts-stack/markdown --save
```

## Usage

### Minimal usage:

```js
import { Marked } from '@ts-stack/markdown';

console.log(Marked.parse('I am using __markdown__.'));
// Outputs: I am using <strong>markdown</strong>.
```

Example setting options with default values:

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

### Example usage with highlight.js

```bash
npm install highlight.js --save
```

A function to highlight code blocks:

```ts
import { Marked } from '@ts-stack/markdown';
import hljs from 'highlight.js';

Marked.setOptions({ highlight: (code, lang) => hljs.highlight(lang, code).value });
let md = '```js\n console.log("hello"); \n```';
console.log(Marked.parse(md));
```

### Overriding renderer methods

The renderer option allows you to render tokens in a custom manner. Here is an
example of overriding the default heading token rendering by adding custom head id:

```ts
import { Marked, Renderer } from '@ts-stack/markdown';

class MyRenderer extends Renderer {
  // Overriding parent method.
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

This code will output the following HTML:

```html
<h1 id="my-custom-hash">heading</h1>
```

### Example of setting a simple block rule

If you do not need recursiveness or checks some conditions before execute a regular expression, you can use the
`Marked.setBlockRule( regexp[, callback] )` method, which takes a regular expression as the first argument,
and returns result `regexp.exec(string)` to `callback(execArr)`, which can be passed as a second argument.

In regular expression very important adding symbol `^` from start. You should do this anyway.

```ts
import { Marked, escape } from '@ts-stack/markdown';

/**
 * KaTeX is a fast, easy-to-use JavaScript library for TeX math rendering on the web.
 */
import * as katex from 'katex';


Marked.setBlockRule(/^@@@ *(\w+)\n([\s\S]+?)\n@@@/, function (execArr) {

  // Don't use arrow function for this callback
  // if you need Renderer's context, for example to `this.options`.

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

## Benchmarks

node v8.9.x

``` bash
git clone https://github.com/ts-stack/markdown.git
cd markdown
npm install
npm run build
npm run bench
```

By default, these benchmarks run the entire markdown test suite once. The test suite includes every markdown feature,
it doesn't cater to specific aspects.

| Lib                     | Lib load, ms | Lib init, ms | Bench work, ms | Total, ms 
| ------------------------|--------------|--------------|----------------|-----------
| @ts-stack/markdown v1.5.0 | 5            | 4            | 84             | 93 
| marked v0.8.0           | 5            | 7            | 86             | 98
| markdown v0.5.0         | 2            | 2            | 128            | 132
| remarkable v2.0.0       | 5            | 2            | 136            | 143
| commonmark v0.29.1      | 19           | 3            | 148            | 170
| markdown-it v10.0.0     | 24           | 3            | 176            | 203
| showdown v1.8.6         | 4            | 7            | 408            | 419


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

## Other libs from the author

If you enjoy working with TypeScript, we also recommend other libraries by the same author:

- [Ditsmod](https://ditsmod.github.io/en/) - a web framework for Node.js to build modular applications;
- [@ts-stack/openapi-spec](https://github.com/ts-stack/openapi-spec) - TypeScript models for writing OpenAPI documentation.
