import { Marked, escape } from '../';
/**
 * KaTeX is a fast, easy-to-use JavaScript library for TeX math rendering on the web.
 */
import * as katex from 'katex';


Marked.setBlockRule(/^@@@ *(\w+)\n([\s\S]+?)\n@@@/, function (execArr) {

  // Don't use arrow function for this callback
  // if you need Renderer's context, for example to `this.options`.

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
