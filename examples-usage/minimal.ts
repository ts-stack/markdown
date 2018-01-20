import { Marked, Renderer } from '../';

Marked.setOptions
({
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
});

Marked.setOptions({renderer: new Renderer});

console.log(Marked.parse('I am using __markdown__.'));
