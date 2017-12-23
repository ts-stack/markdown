/**
 * @license
 * 
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Marked } from './marked';
import { MarkedOptions, ParamsToken, Align, Links, TokenType } from './interfaces';
import { Renderer } from './renderer';
import { InlineLexer } from './inline-lexer';

/**
 * Parsing & Compiling.
 */
export class Parser
{
  private tokens: ParamsToken[];
  private token: ParamsToken;
  private inlineLexer: InlineLexer;
  private options: MarkedOptions;
  private renderer: Renderer;

  constructor(options?: MarkedOptions)
  {
    this.tokens = [];
    this.token = null;
    this.options = options || Marked.defaults;
    this.renderer = this.options.renderer || new Renderer(this.options);
  }

  static parse(tokens: ParamsToken[], links: Links, options?: MarkedOptions): string
  {
    const parser = new this(options);
    return parser.parse(links, tokens);
  }

  private parse(links: Links, tokens: ParamsToken[])
  {
    this.inlineLexer = new InlineLexer(links, this.options, this.renderer);
    this.tokens = tokens.reverse();

    let out = '';

    while( this.next() )
    {
      out += this.tok();
    }

    return out;
  }

  private next()
  {
    return this.token = this.tokens.pop();
  }

  private peek()
  {
    return this.tokens[this.tokens.length - 1];
  }

  private parseText()
  {
    let body = this.token.text;

    while (this.peek().type == TokenType.text)
    {
      body += '\n' + this.next().text;
    }

    return this.inlineLexer.output(body);
  }

  private tok()
  {
    switch(this.token.type)
    {
      case TokenType.space:
      {
        return '';
      }
      case TokenType.hr:
      {
        return this.renderer.hr();
      }
      case TokenType.heading:
      {
        return this.renderer.heading
        (
          this.inlineLexer.output(this.token.text),
          this.token.depth,
          this.token.text
        );
      }
      case TokenType.code:
      {
        return this.renderer.code
        (
          this.token.text,
          this.token.lang,
          this.token.escaped
        );
      }
      case TokenType.table:
      {
        let header = ''
          ,body = ''
          ,row
          ,cell;

        // header
        cell = '';
        for(let i = 0; i < this.token.header.length; i++)
        {
          const flags = { header: true, align: this.token.align[i] };
          const out = this.inlineLexer.output(this.token.header[i]);

          cell += this.renderer.tablecell(out, flags);
        }

        header += this.renderer.tablerow(cell);

        for(let i = 0; i < this.token.cells.length; i++)
        {
          row = this.token.cells[i];

          cell = '';

          for(let j = 0; j < row.length; j++)
          {
            cell += this.renderer.tablecell
            (
              this.inlineLexer.output(row[j]),
              { header: false, align: this.token.align[j] }
            );
          }

          body += this.renderer.tablerow(cell);
        }

        return this.renderer.table(header, body);
      }
      case TokenType.blockquoteStart:
      {
        let body = '';

        while (this.next().type != TokenType.blockquoteEnd)
        {
          body += this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case TokenType.listStart:
      {
        let body = '', ordered = this.token.ordered;

        while (this.next().type != TokenType.listEnd)
        {
          body += this.tok();
        }

        return this.renderer.list(body, ordered);
      }
      case TokenType.listItemStart:
      {
        let body = '';

        while (this.next().type != TokenType.listItemEnd)
        {
          body += this.token.type == <any>TokenType.text
            ? this.parseText()
            : this.tok();
        }

        return this.renderer.listitem(body);
      }
      case TokenType.looseItemStart:
      {
        let body = '';

        while (this.next().type != TokenType.listItemEnd)
        {
          body += this.tok();
        }

        return this.renderer.listitem(body);
      }
      case TokenType.html:
      {
        const html = !this.token.pre && !this.options.pedantic
          ? this.inlineLexer.output(this.token.text)
          : this.token.text;
        return this.renderer.html(html);
      }
      case TokenType.paragraph:
      {
        return this.renderer.paragraph(this.inlineLexer.output(this.token.text));
      }
      case TokenType.text:
      {
        return this.renderer.paragraph(this.parseText());
      }
    }
  }
}
