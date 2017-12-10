/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * marked-ts - a markdown parser
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Marked } from './marked';
import { MarkedOptions } from './interfaces';
import { Renderer } from './renderer';
import { InlineLexer } from './inline-lexer';

export class Parser
{
  tokens: any[];
  token: any;
  inline: any;
  options: MarkedOptions;
  renderer: Renderer;

  constructor(options?: MarkedOptions, renderer?: Renderer)
  {
    this.tokens = [];
    this.token = null;
    this.options = options || Marked.defaults;
    this.options.renderer = this.options.renderer || new Renderer;
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
  }

  static parse(src: any, options?: MarkedOptions, renderer?: Renderer): string
  {
    const parser = new this(options, renderer);
    return parser.parse(src);
  }

  parse(src: any)
  {
    this.inline = new InlineLexer(src.links, this.options, this.renderer);
    this.tokens = src.reverse();

    let out = '';

    while( this.next() )
    {
      out += this.tok();
    }

    return out;
  }

  next()
  {
    return this.token = this.tokens.pop();
  }

  peek()
  {
    return this.tokens[this.tokens.length - 1] || 0;
  }

  parseText()
  {
    let body = this.token.text;

    while (this.peek().type === 'text')
    {
      body += '\n' + this.next().text;
    }

    return this.inline.output(body);
  }

  tok()
  {
    switch (this.token.type)
    {
      case 'space':
      {
        return '';
      }
      case 'hr':
      {
        return this.renderer.hr();
      }
      case 'heading':
      {
        return this.renderer.heading
        (
          this.inline.output(this.token.text),
          this.token.depth,
          this.token.text
        );
      }
      case 'code':
      {
        return this.renderer.code(this.token.text,
          this.token.lang,
          this.token.escaped);
      }
      case 'table':
      {
        let header = ''
          , body = ''
          , row
          , cell
          , flags
          , j;

        // header
        cell = '';
        for(let i = 0; i < this.token.header.length; i++)
        {
          flags = { header: true, align: this.token.align[i] };
          cell += this.renderer.tablecell(
            this.inline.output(this.token.header[i]),
            { header: true, align: this.token.align[i] }
          );
        }
        header += this.renderer.tablerow(cell);

        for(let i = 0; i < this.token.cells.length; i++)
        {
          row = this.token.cells[i];

          cell = '';

          for(j = 0; j < row.length; j++)
          {
            cell += this.renderer.tablecell(
              this.inline.output(row[j]),
              { header: false, align: this.token.align[j] }
            );
          }

          body += this.renderer.tablerow(cell);
        }

        return this.renderer.table(header, body);
      }
      case 'blockquote_start':
      {
        let body = '';

        while (this.next().type !== 'blockquote_end')
        {
          body += this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case 'list_start':
      {
        let body = '', ordered = this.token.ordered;

        while (this.next().type !== 'list_end')
        {
          body += this.tok();
        }

        return this.renderer.list(body, ordered);
      }
      case 'list_item_start':
      {
        let body = '';

        while (this.next().type !== 'list_item_end')
        {
          body += this.token.type === 'text'
            ? this.parseText()
            : this.tok();
        }

        return this.renderer.listitem(body);
      }
      case 'loose_item_start':
      {
        let body = '';

        while (this.next().type !== 'list_item_end')
        {
          body += this.tok();
        }

        return this.renderer.listitem(body);
      }
      case 'html':
      {
        const html = !this.token.pre && !this.options.pedantic
          ? this.inline.output(this.token.text)
          : this.token.text;
        return this.renderer.html(html);
      }
      case 'paragraph':
      {
        return this.renderer.paragraph(this.inline.output(this.token.text));
      }
      case 'text':
      {
        return this.renderer.paragraph(this.parseText());
      }
    }
  }
}
