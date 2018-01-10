import { Marked } from '../';
import { highlight } from 'highlight.js';

let md = '```js\n console.log("hello"); \n```';

Marked.setOptions({ highlight: (code, lang) => highlight(lang, code).value });

console.log(Marked.parse(md));
