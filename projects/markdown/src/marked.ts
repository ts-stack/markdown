/**
 * @license
 *
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 *
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */

import { BlockLexer } from './block-lexer';
import { DebugReturns, LexerReturns, Links, MarkedOptions, SimpleRenderer, Token, TokenType } from './interfaces';
import { Parser } from './parser';

export class Marked {
  static options = new MarkedOptions();
  protected static simpleRenderers: SimpleRenderer[] = [];

  /**
   * Merges the default options with options that will be set.
   *
   * @param options Hash of options.
   */
  static setOptions(options: MarkedOptions) {
    Object.assign(this.options, options);
    return this;
  }

  /**
   * Setting simple block rule.
   */
  static setBlockRule(regexp: RegExp, renderer: SimpleRenderer = () => '') {
    BlockLexer.simpleRules.push(regexp);
    this.simpleRenderers.push(renderer);

    return this;
  }

  /**
   * Accepts Markdown text and returns text in HTML format.
   *
   * @param src String of markdown source to be compiled.
   * @param options Hash of options. They replace, but do not merge with the default options.
   * If you want the merging, you can to do this via `Marked.setOptions()`.
   */
  static parse(src: string, options: MarkedOptions = this.options): string {
    try {
      const { tokens, links } = this.callBlockLexer(src, options);
      return this.callParser(tokens, links, options);
    } catch (e) {
      return this.callMe(e);
    }
  }

  /**
   * Accepts Markdown text and returns object with text in HTML format,
   * tokens and links from `BlockLexer.parser()`.
   *
   * @param src String of markdown source to be compiled.
   * @param options Hash of options. They replace, but do not merge with the default options.
   * If you want the merging, you can to do this via `Marked.setOptions()`.
   */
  static debug(src: string, options: MarkedOptions = this.options): DebugReturns {
    const { tokens, links } = this.callBlockLexer(src, options);
    let origin = tokens.slice();
    const parser = new Parser(options);
    parser.simpleRenderers = this.simpleRenderers;
    const result = parser.debug(links, tokens);

    /**
     * Translates a token type into a readable form,
     * and moves `line` field to a first place in a token object.
     */
    origin = origin.map(token => {
      token.type = (TokenType as any)[token.type] || token.type;

      const line = token.line;
      delete token.line;
      if (line) {
        return { ...{ line }, ...token };
      } else {
        return token;
      }
    });

    return { tokens: origin, links, result };
  }

  protected static callBlockLexer(src: string = '', options?: MarkedOptions): LexerReturns {
    if (typeof src != 'string') {
      throw new Error(`Expected that the 'src' parameter would have a 'string' type, got '${typeof src}'`);
    }

    // Preprocessing.
    src = src
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/\u00a0/g, ' ')
      .replace(/\u2424/g, '\n')
      .replace(/^ +$/gm, '');

    return BlockLexer.lex(src, options, true);
  }

  protected static callParser(tokens: Token[], links: Links, options?: MarkedOptions): string {
    if (this.simpleRenderers.length) {
      const parser = new Parser(options);
      parser.simpleRenderers = this.simpleRenderers;
      return parser.parse(links, tokens);
    } else {
      return Parser.parse(tokens, links, options);
    }
  }

  protected static callMe(err: Error) {
    err.message += '\nPlease report this to https://github.com/ts-stack/markdown';

    if (this.options.silent) {
      return '<p>An error occured:</p><pre>' + this.options.escape(err.message + '', true) + '</pre>';
    }

    throw err;
  }
}
