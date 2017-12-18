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
import { escape } from './helpers';
import { MarkedCallback, MarkedOptions, ParamsToken, Links } from './interfaces';

export class Marked
{
  static defaults = new MarkedOptions;

  static setOptions(options: MarkedOptions)
  {
    this.defaults = {...this.defaults, ...options};
    return this;
  }

  static parse(src: string): string;
  static parse(src: string, options: object): string;
  static parse(src: string, callback: MarkedCallback): string;
  static parse(src: string, options: object, callback: MarkedCallback): string;
  static parse(src: string, optsOrCallback?: MarkedOptions | MarkedCallback, callback?: MarkedCallback): string
  {
    if(callback || typeof optsOrCallback == 'function')
    {
      if(!callback)
      {
        callback = optsOrCallback as MarkedCallback;
        optsOrCallback = null;
      }

      const options: MarkedOptions = {...this.defaults, ...optsOrCallback};

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

    const options = {...this.defaults, ...optsOrCallback};

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
        return '<p>An error occured:</p><pre>' + escape(err.message + '', true) + '</pre>';
      }

      throw err;
    }
  }
}
