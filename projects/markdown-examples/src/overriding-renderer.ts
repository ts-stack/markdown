import { Marked, Renderer } from '@ts-stack/markdown';

class MyRenderer extends Renderer {
  // Overriding parent method.
  heading(text: string, level: number, raw: string) {
    const regexp = /\s*{([^}]+)}$/;
    const execArr = regexp.exec(text);
    let id: string;

    if (execArr) {
      text = text.replace(regexp, '');
      id = execArr[1];
    } else {
      id = text.toLocaleLowerCase().replace(/[^\wа-яіїє]+/gi, '-');
    }

    return `<h${level} id="${id}">${text}</h${level}>`;
  }
}

Marked.setOptions({ renderer: new MyRenderer() });

console.log(Marked.parse('# heading {my-custom-hash}'));
