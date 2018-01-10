import { Marked, Renderer, MarkedOptions } from '../';

// Setting some options for Marked.
const markedOptions: MarkedOptions = {};

const renderer = new Renderer(markedOptions);

// Overriding renderer.
renderer.heading = function (text, level)
{
  const patt = /\s?{([^}]+)}$/;
  const link = patt.exec(text);
  let linkStr: string;
  
  if(link && link.length && link[1])
  {
    text = text.replace(patt, '');
    linkStr = link[1];
  }
  else
  {
    linkStr = text.toLocaleLowerCase().replace(/[^\wа-яіїє]+/gi, '-');
  }

  return '<h' + level + ' id="' + linkStr + '">' + text + '</h' + level + '>';
};

markedOptions.renderer = renderer;
Marked.setOptions(markedOptions);

console.log(Marked.parse('# heading {my-custom-hash}'));
