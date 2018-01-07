import { Marked, escape } from '../';

Marked.setBlockRule(/^@@@ *(\w+)\n([\s\S]+?)\n@@@/, function (execArr) {

  // Don't use arrow function for this callback
  // if you need Renderer's context, for example to `this.options`.

  const channel = execArr[1];

  switch(channel)
  {
    case 'youtube':
    {
      const id = escape(execArr[2]);
      return `<iframe width="420" height="315" src="https://www.youtube.com/embed/${id}"></iframe>\n`;
    }
    case 'gist':
    {
      const id = escape(execArr[2]);
      return `<script src="https://gist.github.com/${id}"></script>\n`;
    }
  }
});

const blockStr = `
# Example usage with embed block code

@@@ gist
a9dfd77500990871fc58b97fdb57d91f.js
@@@

@@@ youtube
JgwnkM5WwWE
@@@
`;


const html = Marked.parse(blockStr);

console.log(html);
