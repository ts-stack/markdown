import { Marked } from '../';

const blockStr = `
# Example usage with youtube id video

@@@
JgwnkM5WwWE
@@@
`;

Marked.setBlockRule(/^@@@\n([\s\S]+?)\n@@@/, function (execArr){
  const id = execArr[1];
  return `<iframe width="420" height="315" src="https://www.youtube.com/embed/${id}"></iframe>`;
});

const html = Marked.parse(blockStr);

console.log(html);
