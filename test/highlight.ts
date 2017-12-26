import { Marked, MarkedOptions, Renderer, ParseCallback } from '../';
import * as highlight from 'highlight.js';

const highlightAuto = highlight.highlightAuto;
let md = '# head\n\n```js\nconsole.log("hello");\n```';

// let returns = Marked.parse(md, (err, output) =>
// {
//   if(err)
//     return err;

//   return output;
// });

// console.log(returns);

// Marked.setOptions
// ({
//   highlight: (code: string, lang?: string, callback?: ParseCallback) =>
//   {
//     const result = highlightAuto(code).value;
//     return callback(null, result);
//   }
// });

const markedOptions: MarkedOptions =
({
  highlight: (code: string, lang?: string, callback?: ParseCallback) =>
  {
    const result = highlightAuto(code).value;
    return callback(null, result);
  }
});

// const renderer = new Renderer(markedOptions);
// markedOptions.renderer = renderer;

// Marked.setOptions(markedOptions);

// Marked.parse(md, (err, output) =>
// {
//   if(err)
//     return console.log(err);

//   return console.log(output);
// });

// console.log(returns);
