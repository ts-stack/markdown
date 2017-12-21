import { Marked, ParseCallback } from '../';
import * as highlight from 'highlight.js';

const highlightAuto = highlight.highlightAuto;
let md = '# head\n\n```js\nconsole.log("hello");\n```';

let returns = Marked.parse(md, (err, output) =>
{
  if(err)
    return err;

  return output;
});

console.log(returns);

Marked.setOptions
({
  highlight: (code: string, lang?: string, callback?: ParseCallback) =>
  {
    const result = highlightAuto(code).value;
    return callback(null, result);
  }
});

returns = Marked.parse(md, (err, output) =>
{
  if(err)
    return err;

  return output;
});

console.log(returns);
