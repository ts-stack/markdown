import { Marked } from '../';

const blockStr = `
# Example usage with embed block code

@@@ gist
a9dfd77500990871fc58b97fdb57d91f.js
@@@

@@@ youtube
JgwnkM5WwWE
@@@
`;

Marked.setBlockRule(/^@@@ *(\w+)\n([\s\S]+?)\n@@@/, function (execArr) {

  const channel = execArr[1];

  switch(channel)
  {
    case 'youtube':
    {
      const id = execArr[2];
      return `<iframe width="420" height="315" src="https://www.youtube.com/embed/${id}"></iframe>\n`;
    }
    case 'gist':
    {
      const id = execArr[2];
      return `<script src="https://gist.github.com/${id}"></script>\n`;
    }
  }
});

const html = Marked.parse(blockStr);

console.log(html);
