import { Marked, Renderer } from '../../markdown/src';

Marked.setOptions({
  renderer: new Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
});

console.log(Marked.parse('I am using __markdown__.', { sanitize: true }));
