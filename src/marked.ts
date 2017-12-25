/**
 * @license
 * 
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Parser } from './parser';
import { BlockLexer } from './block-lexer';
import {
  ParseCallback,
  MarkedOptions,
  ParamsToken,
  Links,
  TokenType,
  LexerReturns
} from './interfaces';

export class Marked
{
  static defaults = new MarkedOptions;

  /**
   * Merges the default options with options that will be set.
   * 
   * @param options Hash of options.
   */
  static setOptions(options: MarkedOptions)
  {
    this.defaults = {...this.defaults, ...options};
    return this;
  }

  /**
   * Accepts Markdown text and returns text in HTML format.
   * 
   * @param src String of markdown source to be compiled.
   * @param options Hash of options. They replace, but do not merge with the default options.
   * If you want the merging, you can to do this via `Marked.setOptions()`.
   */
  static parse(src: string, options: MarkedOptions = this.defaults): any
  {
    try
    {
      const {tokens, links} = this.callBlockLexer(src, options);
      return this.callParser(tokens, links, options);
    }
    catch(e)
    {
      return this.callMe(e);
    }
  }

  protected static callBlockLexer(src: string, options?: MarkedOptions): LexerReturns
  {
    return BlockLexer.lex(src, options);
  }

  protected static callParser(tokens: ParamsToken[], links: Links, options?: MarkedOptions)
  {
    return Parser.parse(tokens, links, options);
  }

  protected static callMe(err: Error)
  {
    err.message += '\nPlease report this to https://github.com/KostyaTretyak/marked-ts';

    if(this.defaults.silent)
    {
      return '<p>An error occured:</p><pre>' + this.defaults.escape(err.message + '', true) + '</pre>';
    }

    throw err;
  }
}
