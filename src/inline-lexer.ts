/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * marked-ts - a markdown parser
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { ReplaceGroup } from './replace-group';
import { escape, noop } from './helpers';
import { InlineGrammar, MarkedOptions, Gfm } from './interfaces';
import { Renderer } from './renderer';
import { Marked } from './marked';


export const inline: InlineGrammar =
{
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/,
  _inside: /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/,
  _href: /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/,

  normal: <any>{},
  pedantic: <any>{},
  gfm: <any>{},
  breaks: <any>{},
};

inline.link = new ReplaceGroup(inline.link)
.setGroup('inside', inline._inside)
.setGroup('href', inline._href)
.getRegexp();

inline.reflink = new ReplaceGroup(inline.reflink)
.setGroup('inside', inline._inside)
.getRegexp();

inline.normal = {...inline};

/**
 * Pedantic Inline Grammar
 */

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
    escape: new ReplaceGroup(inline.escape).setGroup('])', '~|])').getRegexp(),
    url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
    del: /^~~(?=\S)([\s\S]*?\S)~~/,
    text: new ReplaceGroup(inline.text)
    .setGroup(']|', '~]|')
    .setGroup('|', '|https?://|')
    .getRegexp()
  }
};

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks =
{
  ...inline.gfm,
  ...{
    br: new ReplaceGroup(inline.br).setGroup('{2,}', '*').getRegexp(),
    text: new ReplaceGroup(inline.gfm.text).setGroup('{2,}', '*').getRegexp()
  }
};

export class InlineLexer
{
  options: MarkedOptions;
  renderer: Renderer;
  links: any;
  rules: any;
  inLink: boolean;

  constructor(links: any, options: MarkedOptions, renderer?: Renderer)
  {
    this.options = options || Marked.defaults;
    this.links = links;
    this.rules = inline.normal;
    this.renderer = renderer || this.options.renderer || new Renderer;
    this.renderer.options = this.options;

    if (!this.links)
    {
      throw new Error('Tokens array requires a `links` property.');
    }

    if (this.options.gfm)
    {
      if (this.options.breaks)
      {
        this.rules = inline.breaks;
      }
      else
      {
        this.rules = inline.gfm;
      }
    }
    else if (this.options.pedantic)
    {
      this.rules = inline.pedantic;
    }
  }

  static rules = inline;

  static output(src: any, links: any, options: MarkedOptions)
  {
    const inline = new InlineLexer(links, options);
    return inline.output(src);
  }

  output(src: any)
  {
    let out = ''
      , link
      , text
      , href
      , cap;

    while (src)
    {
      // escape
      if (cap = this.rules.escape.exec(src))
      {
        src = src.substring(cap[0].length);
        out += cap[1];
        continue;
      }

      // autolink
      if (cap = this.rules.autolink.exec(src))
      {
        src = src.substring(cap[0].length);

        if (cap[2] === '@')
        {
          text = cap[1].charAt(6) === ':'
            ? this.mangle(cap[1].substring(7))
            : this.mangle(cap[1]);
          href = this.mangle('mailto:') + text;
        }
        else
        {
          text = escape(cap[1]);
          href = text;
        }

        out += this.renderer.link(href, null, text);
        continue;
      }

      // url (gfm)
      if (!this.inLink && (cap = this.rules.url.exec(src)))
      {
        src = src.substring(cap[0].length);
        text = escape(cap[1]);
        href = text;
        out += this.renderer.link(href, null, text);
        continue;
      }

      // tag
      if (cap = this.rules.tag.exec(src))
      {
        if (!this.inLink && /^<a /i.test(cap[0]))
        {
          this.inLink = true;
        }
        else if (this.inLink && /^<\/a>/i.test(cap[0]))
        {
          this.inLink = false;
        }

        src = src.substring(cap[0].length);

        out += this.options.sanitize
          ? this.options.sanitizer
            ? this.options.sanitizer(cap[0])
            : escape(cap[0])
          : cap[0];

        continue;
      }

      // link
      if (cap = this.rules.link.exec(src))
      {
        src = src.substring(cap[0].length);
        this.inLink = true;

        out += this.outputLink(cap, {
          href: cap[2],
          title: cap[3]
        });

        this.inLink = false;
        continue;
      }

      // reflink, nolink
      if
      (
        (cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))
      )
      {
        src = src.substring(cap[0].length);
        link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
        link = this.links[link.toLowerCase()];

        if (!link || !link.href)
        {
          out += cap[0].charAt(0);
          src = cap[0].substring(1) + src;
          continue;
        }

        this.inLink = true;
        out += this.outputLink(cap, link);
        this.inLink = false;
        continue;
      }

      // strong
      if (cap = this.rules.strong.exec(src))
      {
        src = src.substring(cap[0].length);
        out += this.renderer.strong(this.output(cap[2] || cap[1]));
        continue;
      }

      // em
      if (cap = this.rules.em.exec(src))
      {
        src = src.substring(cap[0].length);
        out += this.renderer.em(this.output(cap[2] || cap[1]));
        continue;
      }

      // code
      if (cap = this.rules.code.exec(src))
      {
        src = src.substring(cap[0].length);
        out += this.renderer.codespan(escape(cap[2], true));
        continue;
      }

      // br
      if (cap = this.rules.br.exec(src))
      {
        src = src.substring(cap[0].length);
        out += this.renderer.br();
        continue;
      }

      // del (gfm)
      if (cap = this.rules.del.exec(src))
      {
        src = src.substring(cap[0].length);
        out += this.renderer.del(this.output(cap[1]));
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src))
      {
        src = src.substring(cap[0].length);
        out += this.renderer.text(escape(this.smartypants(cap[0])));
        continue;
      }

      if (src) {
        throw new
          Error('Infinite loop on byte: ' + src.charCodeAt(0));
      }
    }

    return out;
  }

  outputLink(cap: any, link: any)
  {
    const href = escape(link.href)
      , title = link.title ? escape(link.title) : null;

    return cap[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, this.output(cap[1]))
      : this.renderer.image(href, title, escape(cap[1]));
  }

  smartypants(text: string)
  {
    if (!this.options.smartypants)
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

  mangle(text: string)
  {
    if (!this.options.mangle) return text;
    let out = ''
      , l = text.length
      , i = 0
      , ch;

    for (; i < l; i++)
    {
      ch = text.charCodeAt(i);

      if (Math.random() > 0.5)
      {
        ch = 'x' + ch.toString(16);
      }

      out += '&#' + ch + ';';
    }

    return out;
  }
}