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
import { ParseCallback, MarkedOptions, ParamsToken, Links, TokenType } from './interfaces';

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
   */
  static parse(src: string): string;
  /**
   * Accepts Markdown text and returns text in HTML format.
   * 
   * @param src String of markdown source to be compiled.
   * @param options Hash of options. They replace, but do not merge with the default options.
   * If you want the merging, you can to do this via `Marked.setOptions()`.
   */
  static parse(src: string, options: MarkedOptions): string;
  /**
   * Accepts Markdown text and returns text in HTML format.
   * 
   * @param src String of markdown source to be compiled.
   * @param callback Function called when the `src` has been fully parsed
   * when using async call. If the `options` argument is omitted,
   * this can be used as the second argument.
   */
  static parse<T>(src: string, callback: ParseCallback<T>): T;
  /**
   * Accepts Markdown text and returns text in HTML format.
   * 
   * @param src String of markdown source to be compiled.
   * 
   * @param options Hash of options. They replace, but do not merge with the default options.
   * If you want the merging, you can to do this via `Marked.setOptions()`.
   * 
   * @param callback Function called when the `src` has been fully parsed
   * when using async call. If the `options` argument is omitted,
   * this can be used as the second argument.
   */
  static parse<T>(src: string, options: MarkedOptions, callback: ParseCallback<T>): T;
  static parse(src: string, optsOrCallback?: MarkedOptions | ParseCallback, callback?: ParseCallback): any
  {
    const self = this;

    let
    options: MarkedOptions,
    callOnError = callMe,
    tokens: ParamsToken[],
    links: Links
    ;

    // Normalization.
    if(callback)
    {
      callOnError = callback;
    }
    else if(typeof optsOrCallback == 'function')
    {
      callback = optsOrCallback;
      optsOrCallback = null;
    }

    options = (optsOrCallback as MarkedOptions) || this.defaults;

    // Lexing.
    try
    {
      ({tokens, links} = BlockLexer.lex(src, options));
    }
    catch(e)
    {
      return callOnError(e);
    }

    // Highlighting.
    const highlight = options.highlight;

    if(!highlight || highlight.length < 3) // <-- number of function arguments
    {
      if(callback)
        return done();
      else
        return Parser.parse(tokens, links, options);
    }

    delete options.highlight;
    let pending = tokens.length;

    if(!pending)
      return done();

    for(let i = 0; i < tokens.length; i++)
    {
      const token = tokens[i];

      if(token.type !== TokenType.code)
      {
        if(!--pending)
          return done();

        continue;
      }

      highlight(token.text, token.lang, (err: Error, code: string) =>
      {
        if(err)
          return done(err);

        if(code == null || code === token.text)
        {
          if(!--pending)
            return done();
        }

        token.text = code;
        token.escaped = true;

        if(!--pending)
          return done();
      });
    }

    function done(err?: Error)
    {
      if(err)
      {
        options.highlight = highlight;
        return callback(err);
      }

      let out: string;

      try
      {
        out = Parser.parse(tokens, links, options);
      }
      catch(e)
      {
        err = e;
      }

      options.highlight = highlight;
      return callback(err, out);
    }

    function callMe(err: Error)
    {
      err.message += '\nPlease report this to https://github.com/KostyaTretyak/marked-ts';

      if(options.silent)
      {
        return '<p>An error occured:</p><pre>' + self.defaults.escape(err.message + '', true) + '</pre>';
      }

      throw err;
    }
  }
}
