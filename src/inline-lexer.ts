/**
 * @license
 * 
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { ExtendRegexp } from './extend-regexp';
import { escape, Noop } from './helpers';
import { Renderer } from './renderer';
import { Marked } from './marked';
import {
  InlineGrammar,
  MarkedOptions,
  Links,
  Link
} from './interfaces';

/**
 * Inline-Level Grammar.
 */
const inline: InlineGrammar =
{
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  url: <any>Noop,
  del: <any>Noop,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)([\s\S]*?[^`])\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/,
  _inside: /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/,
  _href: /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/,
};

inline.link = new ExtendRegexp(inline.link)
.setGroup('inside', inline._inside)
.setGroup('href', inline._href)
.getRegexp();

inline.reflink = new ExtendRegexp(inline.reflink)
.setGroup('inside', inline._inside)
.getRegexp();

inline.normal = {...inline};

inline.pedantic =
{
  ...inline.normal,
  ...{
    strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
    em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
  }
};

inline.gfm =
{
  ...inline.normal,
  ...{
    escape: new ExtendRegexp(inline.escape).setGroup('])', '~|])').getRegexp(),
    url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
    del: /^~~(?=\S)([\s\S]*?\S)~~/,
    text: new ExtendRegexp(inline.text)
    .setGroup(']|', '~]|')
    .setGroup('|', '|https?://|')
    .getRegexp()
  }
};

inline.breaks =
{
  ...inline.gfm,
  ...{
    br: new ExtendRegexp(inline.br).setGroup('{2,}', '*').getRegexp(),
    text: new ExtendRegexp(inline.gfm.text).setGroup('{2,}', '*').getRegexp()
  }
};

/**
 * Inline Lexer & Compiler.
 */
export class InlineLexer
{
  private links: Links;
  private rules: InlineGrammar;
  private options: MarkedOptions;
  private renderer: Renderer;
  private inLink: boolean;

  constructor(links: Links, options?: MarkedOptions, renderer?: Renderer)
  {
    this.options = options || Marked.defaults;
    this.renderer = renderer || this.options.renderer || new Renderer(this.options);
    this.links = links;

    if(!this.links)
      throw new Error(`InlineLexer requires 'links' parameter.`);

    if(this.options.gfm)
    {
      if(this.options.breaks)
      {
        this.rules = inline.breaks;
      }
      else
      {
        this.rules = inline.gfm;
      }
    }
    else if(this.options.pedantic)
    {
      this.rules = inline.pedantic;
    }
    else
    {
      this.rules = inline.normal;
    }
  }

  /**
   * Static Lexing/Compiling Method.
   */
  static output(src: string, links: Links, options: MarkedOptions)
  {
    const inlineLexer = new this(links, options);
    return inlineLexer.output(src, links);
  }

  /**
   * Lexing/Compiling.
   */
  output(nextPart: string, links?: Links)
  {
    let out = '', execArr: RegExpExecArray;

    if(links)
      this.links = links;

    while(nextPart)
    {
      // escape
      if(execArr = this.rules.escape.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        out += execArr[1];
        continue;
      }

      // autolink
      if(execArr = this.rules.autolink.exec(nextPart))
      {
        let text: string, href: string;

        nextPart = nextPart.substring(execArr[0].length);

        if(execArr[2] === '@')
        {
          text = execArr[1].charAt(6) === ':'
            ? this.mangle(execArr[1].substring(7))
            : this.mangle(execArr[1]);

          href = this.mangle('mailto:') + text;
        }
        else
        {
          text = escape(execArr[1]);
          href = text;
        }

        out += this.renderer.link(href, null, text);
        continue;
      }

      // url (gfm)
      if(!this.inLink && (execArr = this.rules.url.exec(nextPart)))
      {
        let text: string, href: string;

        nextPart = nextPart.substring(execArr[0].length);
        text = escape(execArr[1]);
        href = text;
        out += this.renderer.link(href, null, text);
        continue;
      }

      // tag
      if(execArr = this.rules.tag.exec(nextPart))
      {
        if(!this.inLink && /^<a /i.test(execArr[0]))
        {
          this.inLink = true;
        }
        else if(this.inLink && /^<\/a>/i.test(execArr[0]))
        {
          this.inLink = false;
        }

        nextPart = nextPart.substring(execArr[0].length);

        out += this.options.sanitize
          ? this.options.sanitizer
            ? this.options.sanitizer(execArr[0])
            : escape(execArr[0])
          : execArr[0];

        continue;
      }

      // link
      if(execArr = this.rules.link.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        this.inLink = true;

        out += this.outputLink(execArr, {
          href: execArr[2],
          title: execArr[3]
        });

        this.inLink = false;
        continue;
      }

      // reflink, nolink
      if
      (
        (execArr = this.rules.reflink.exec(nextPart))
        || (execArr = this.rules.nolink.exec(nextPart))
      )
      {
        nextPart = nextPart.substring(execArr[0].length);
        const keyLink = (execArr[2] || execArr[1]).replace(/\s+/g, ' ');
        const link = this.links[keyLink.toLowerCase()];

        if(!link || !link.href)
        {
          out += execArr[0].charAt(0);
          nextPart = execArr[0].substring(1) + nextPart;
          continue;
        }

        this.inLink = true;
        out += this.outputLink(execArr, link);
        this.inLink = false;
        continue;
      }

      // strong
      if(execArr = this.rules.strong.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.strong(this.output(execArr[2] || execArr[1]));
        continue;
      }

      // em
      if(execArr = this.rules.em.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.em(this.output(execArr[2] || execArr[1]));
        continue;
      }

      // code
      if(execArr = this.rules.code.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.codespan(escape(execArr[2].trim(), true));
        continue;
      }

      // br
      if(execArr = this.rules.br.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.br();
        continue;
      }

      // del (gfm)
      if(execArr = this.rules.del.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.del(this.output(execArr[1]));
        continue;
      }

      // text
      if(execArr = this.rules.text.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.text( escape(this.smartypants(execArr[0])) );
        continue;
      }

      if(nextPart)
        throw new Error('Infinite loop on byte: ' + nextPart.charCodeAt(0));
    }

    return out;
  }

  /**
   * Compile Link.
   */
  outputLink(execArr: RegExpExecArray, link: Link)
  {
    const href = escape(link.href)
      ,title = link.title ? escape(link.title) : null;

    return execArr[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, this.output(execArr[1]))
      : this.renderer.image(href, title, escape(execArr[1]));
  }

  /**
   * Smartypants Transformations.
   */
  smartypants(text: string)
  {
    if(!this.options.smartypants)
      return text;

    return text
        // em-dashes
        .replace(/---/g, '\u2014')
        // en-dashes
        .replace(/--/g, '\u2013')
        // opening singles
        .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
        // closing singles & apostrophes
        .replace(/'/g, '\u2019')
        // opening doubles
        .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
        // closing doubles
        .replace(/"/g, '\u201d')
        // ellipses
        .replace(/\.{3}/g, '\u2026');
    }

  /**
   * Mangle Links.
   */
  mangle(text: string)
  {
    if(!this.options.mangle)
      return text;

    let out = '', length = text.length;

    for(let i = 0; i < length; i++)
    {
      let str: string;

      if(Math.random() > 0.5)
      {
        str = 'x' + text.charCodeAt(i).toString(16);
      }

      out += '&#' + str + ';';
    }

    return out;
  }
}
