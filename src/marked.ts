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
import { ParseCallback, MarkedOptions, ParamsToken, Links } from './interfaces';

export class Marked
{
  static defaults = new MarkedOptions;

  /**
   * Merges the default options with options that will be set.
   * 
   * @param options Hash of options. Can also be set using the `Marked.setOptions` method as seen above.
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
   * @param options Hash of options. Can also be set using the `Marked.setOptions` method as seen above.
   */
  static parse(src: string, options: object): string;
  /**
   * Accepts Markdown text and returns text in HTML format.
   * 
   * @param src String of markdown source to be compiled.
   * @param callback Function that handles errors.
   */
  static parse(src: string, callback: ParseCallback): string;
  /**
   * Accepts Markdown text and returns text in HTML format.
   * 
   * @param src String of markdown source to be compiled.
   * @param options Hash of options. Can also be set using the `Marked.setOptions` method as seen above.
   * @param callback Function that handles errors.
   */
  static parse(src: string, options: object, callback: ParseCallback): string;
  static parse(src: string, optsOrCallback?: MarkedOptions | ParseCallback, callback?: ParseCallback): string
  {
    if(callback || typeof optsOrCallback == 'function')
    {
      if(!callback)
      {
        callback = optsOrCallback as ParseCallback;
        optsOrCallback = null;
      }

      const options: MarkedOptions = this.defaults || optsOrCallback as MarkedOptions;

      const highlight = options.highlight;
      let tokens: ParamsToken[], links: Links;

      try
      {
        ({tokens, links} = BlockLexer.lex(src, options));
      }
      catch(e)
      {
        return callback(e);
      }

      let pending = tokens.length;

      if(!highlight || highlight.length < 3)
      {
        return done();
      }

      delete options.highlight;

      if(!pending)
        return done();

      for(let i = 0; i < tokens.length; i++)
      {
        const token = tokens[i];

        if(token.type !== 'code')
        {
          return --pending || done();
        }

        return highlight(token.text, token.lang, function(err: Error, code: string)
        {
          if(err)
            return done(err);

          if(code == null || code === token.text)
          {
            return --pending || done();
          }

          token.text = code;
          token.escaped = true;

          --pending || done();
        });
      }

      return;

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

        return err ? callback(err) : callback(null, out);
      }
    }

    const options: MarkedOptions = this.defaults || optsOrCallback as MarkedOptions;

    try
    {
      const {tokens, links} = BlockLexer.lex(src, options);
      return Parser.parse(tokens, links, options);
    }
    catch(err)
    {
      err.message += '\nPlease report this to https://github.com/KostyaTretyak/marked-ts';

      if( (options || this.defaults).silent )
      {
        return '<p>An error occured:</p><pre>' + this.defaults.escape(err.message + '', true) + '</pre>';
      }

      throw err;
    }
  }
}
