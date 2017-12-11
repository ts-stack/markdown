/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * marked-ts - a markdown parser
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Parser } from './parser';
import { BlockLexer } from './block-lexer';
import { escape } from './helpers';
import { MarkedCallback, MarkedOptions } from './interfaces';

export class Marked
{
  static defaults = new MarkedOptions;

  static setOptions(opt: MarkedOptions)
  {
    this.defaults = {...this.defaults, ...opt};
    return this;
  }

  static options(opt: MarkedOptions)
  {
    this.defaults = {...this.defaults, ...opt};
    return this;
  }

  static parser(src: string, options: object ): string;
  static parser(src: string, callback: MarkedCallback ): string;
  static parser(src: string, options: object, callback: MarkedCallback ): string;
  static parser(src: string, options: any, callback?: MarkedCallback ): string
  {
    if(callback || typeof options == 'function')
    {
      if(!callback)
      {
        callback = options;
        options = null;
      }

      options = {...this.defaults, ...options || {}};

      const highlight = options.highlight;

      let tokens: any;

      try
      {
        tokens = BlockLexer.lex(src, options)
      }
      catch(e)
      {
        return callback(e);
      }

      let pending = tokens.length;

      const done = function(err?: Error)
      {
        if(err)
        {
          options.highlight = highlight;
          return callback(err);
        }

        let out: string;

        try
        {
          out = Parser.parse(tokens, options);
        }
        catch(e)
        {
          err = e;
        }

        options.highlight = highlight;

        return err ? callback(err) : callback(null, out);
      };

      if(!highlight || highlight.length < 3)
      {
        return done();
      }

      delete options.highlight;

      if(!pending)
        return done();

      for (let i = 0; i < tokens.length; i++)
      {
        const token = tokens[i];

        if (token.type !== 'code')
        {
          return --pending || done();
        }

        return highlight(token.text, token.lang, function(err: Error, code: number)
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
    }

    try
    {
      if(options)
        options = {...this.defaults, ...options};

      return Parser.parse(BlockLexer.lex(src, options), options);
    }
    catch(e)
    {
      e.message += '\nPlease report this to https://github.com/KostyaTretyak/marked-ts';

      if( (options || this.defaults).silent )
      {
        return '<p>An error occured:</p><pre>' + escape(e.message + '', true) + '</pre>';
      }

      throw e;
    }
  }
}
