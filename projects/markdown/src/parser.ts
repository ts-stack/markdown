/**
 * @license
 *
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 *
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */

import { InlineLexer } from './inline-lexer';
import { Links, MarkedOptions, SimpleRenderer, Token, TokenType } from './interfaces';
import { Marked } from './marked';
import { Renderer } from './renderer';

/**
 * Parsing & Compiling.
 */
export class Parser {
  simpleRenderers: SimpleRenderer[] = [];
  protected tokens: Token[];
  protected token: Token;
  protected inlineLexer: InlineLexer;
  protected options: MarkedOptions;
  protected renderer: Renderer;
  protected line: number = 0;

  constructor(options?: MarkedOptions) {
    this.tokens = [];
    this.token = null;
    this.options = options || Marked.options;
    this.renderer = this.options.renderer || new Renderer(this.options);
  }

  static parse(tokens: Token[], links: Links, options?: MarkedOptions): string {
    const parser = new this(options);
    return parser.parse(links, tokens);
  }

  parse(links: Links, tokens: Token[]) {
    this.inlineLexer = new InlineLexer(InlineLexer, links, this.options, this.renderer);
    this.tokens = tokens.reverse();

    let out = '';

    while (this.next()) {
      out += this.tok();
    }

    return out;
  }

  debug(links: Links, tokens: Token[]) {
    this.inlineLexer = new InlineLexer(InlineLexer, links, this.options, this.renderer);
    this.tokens = tokens.reverse();

    let out = '';

    while (this.next()) {
      const outToken: string = this.tok();
      this.token.line = this.line += outToken.split('\n').length - 1;
      out += outToken;
    }

    return out;
  }

  protected next() {
    return (this.token = this.tokens.pop());
  }

  protected getNextElement() {
    return this.tokens[this.tokens.length - 1];
  }

  protected parseText() {
    let body = this.token.text;
    let nextElement: Token;

    while ((nextElement = this.getNextElement()) && nextElement.type == TokenType.text) {
      body += '\n' + this.next().text;
    }

    return this.inlineLexer.output(body);
  }

  protected tok() {
    switch (this.token.type) {
      case TokenType.space: {
        return '';
      }
      case TokenType.paragraph: {
        return this.renderer.paragraph(this.inlineLexer.output(this.token.text));
      }
      case TokenType.text: {
        if (this.options.isNoP) {
          return this.parseText();
        } else {
          return this.renderer.paragraph(this.parseText());
        }
      }
      case TokenType.heading: {
        return this.renderer.heading(this.inlineLexer.output(this.token.text), this.token.depth, this.token.text);
      }
      case TokenType.listStart: {
        let body = '';
        const ordered = this.token.ordered;

        while (this.next().type != TokenType.listEnd) {
          body += this.tok();
        }

        return this.renderer.list(body, ordered);
      }
      case TokenType.listItemStart: {
        let body = '';

        while (this.next().type != TokenType.listItemEnd) {
          body += this.token.type == (TokenType.text as any) ? this.parseText() : this.tok();
        }

        return this.renderer.listitem(body);
      }
      case TokenType.looseItemStart: {
        let body = '';

        while (this.next().type != TokenType.listItemEnd) {
          body += this.tok();
        }

        return this.renderer.listitem(body);
      }
      case TokenType.code: {
        return this.renderer.code(this.token.text, this.token.lang, this.token.escaped);
      }
      case TokenType.table: {
        let header = '';
        let body = '';
        let cell;

        // header
        cell = '';
        for (let i = 0; i < this.token.header.length; i++) {
          const flags = { header: true, align: this.token.align[i] };
          const out = this.inlineLexer.output(this.token.header[i]);

          cell += this.renderer.tablecell(out, flags);
        }

        header += this.renderer.tablerow(cell);

        for (const row of this.token.cells) {
          cell = '';

          for (let j = 0; j < row.length; j++) {
            cell += this.renderer.tablecell(this.inlineLexer.output(row[j]), {
              header: false,
              align: this.token.align[j]
            });
          }

          body += this.renderer.tablerow(cell);
        }

        return this.renderer.table(header, body);
      }
      case TokenType.blockquoteStart: {
        let body = '';

        while (this.next().type != TokenType.blockquoteEnd) {
          body += this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case TokenType.hr: {
        return this.renderer.hr();
      }
      case TokenType.html: {
        const html =
          !this.token.pre && !this.options.pedantic ? this.inlineLexer.output(this.token.text) : this.token.text;
        return this.renderer.html(html);
      }
      default: {
        if (this.simpleRenderers.length) {
          for (let i = 0; i < this.simpleRenderers.length; i++) {
            if (this.token.type == 'simpleRule' + (i + 1)) {
              return this.simpleRenderers[i].call(this.renderer, this.token.execArr);
            }
          }
        }

        const errMsg = `Token with "${this.token.type}" type was not found.`;

        if (this.options.silent) {
          console.log(errMsg);
        } else {
          throw new Error(errMsg);
        }
      }
    }
  }
}
