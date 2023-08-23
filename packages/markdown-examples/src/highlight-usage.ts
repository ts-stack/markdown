import hljs from 'highlight.js';
import { Marked } from '../../markdown/src';

Marked.setOptions({ highlight: (code, lang) => hljs.highlight(lang, code).value });

console.log(Marked.parse('```js\n console.log("hello"); \n```'));
