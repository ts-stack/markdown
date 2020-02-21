/**
 * @license
 *
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 *
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */

import { ExtendRegexp } from './extend-regexp';
import {
  Link,
  Links,
  MarkedOptions,
  RulesInlineBase,
  RulesInlineBreaks,
  RulesInlineCallback,
  RulesInlineGfm,
  RulesInlinePedantic
} from './interfaces';
import { Marked } from './marked';
import { Renderer } from './renderer';

/**
 * Inline Lexer & Compiler.
 */
export class InlineLexer {
  protected static rulesBase: RulesInlineBase;
  /**
   * Pedantic Inline Grammar.
   */
  protected static rulesPedantic: RulesInlinePedantic;
  /**
   * GFM Inline Grammar
   */
  protected static rulesGfm: RulesInlineGfm;
  /**
   * GFM + Line Breaks Inline Grammar.
   */
  protected static rulesBreaks: RulesInlineBreaks;
  protected rules: RulesInlineBase | RulesInlinePedantic | RulesInlineGfm | RulesInlineBreaks;
  protected renderer: Renderer;
  protected inLink: boolean;
  protected hasRulesGfm: boolean;
  protected ruleCallbacks: RulesInlineCallback[];

  constructor(
    protected staticThis: typeof InlineLexer,
    protected links: Links,
    protected options: MarkedOptions = Marked.options,
    renderer?: Renderer
  ) {
    this.renderer = renderer || this.options.renderer || new Renderer(this.options);

    if (!this.links) {
      throw new Error(`InlineLexer requires 'links' parameter.`);
    }

    this.setRules();
  }

  /**
   * Static Lexing/Compiling Method.
   */
  static output(src: string, links: Links, options: MarkedOptions): string {
    const inlineLexer = new this(this, links, options);
    return inlineLexer.output(src);
  }

  protected static getRulesBase(): RulesInlineBase {
    if (this.rulesBase) {
      return this.rulesBase;
    }

    /**
     * Inline-Level Grammar.
     */
    const base: RulesInlineBase = {
      escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
      autolink: /^<([^ <>]+(@|:\/)[^ <>]+)>/,
      tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^<'">])*?>/,
      link: /^!?\[(inside)\]\(href\)/,
      reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
      nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
      strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
      em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
      code: /^(`+)([\s\S]*?[^`])\1(?!`)/,
      br: /^ {2,}\n(?!\s*$)/,
      text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/,
      _inside: /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/,
      _href: /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/
    };

    base.link = new ExtendRegexp(base.link)
      .setGroup('inside', base._inside)
      .setGroup('href', base._href)
      .getRegexp();

    base.reflink = new ExtendRegexp(base.reflink).setGroup('inside', base._inside).getRegexp();

    return (this.rulesBase = base);
  }

  protected static getRulesPedantic(): RulesInlinePedantic {
    if (this.rulesPedantic) {
      return this.rulesPedantic;
    }

    return (this.rulesPedantic = {
      ...this.getRulesBase(),
      ...{
        strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
      }
    });
  }

  protected static getRulesGfm(): RulesInlineGfm {
    if (this.rulesGfm) {
      return this.rulesGfm;
    }

    const base = this.getRulesBase();

    const escape = new ExtendRegexp(base.escape).setGroup('])', '~|])').getRegexp();

    const text = new ExtendRegexp(base.text)
      .setGroup(']|', '~]|')
      .setGroup('|', '|https?://|')
      .getRegexp();

    return (this.rulesGfm = {
      ...base,
      ...{
        escape,
        url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
        del: /^~~(?=\S)([\s\S]*?\S)~~/,
        text
      }
    });
  }

  protected static getRulesBreaks(): RulesInlineBreaks {
    if (this.rulesBreaks) {
      return this.rulesBreaks;
    }

    const inline = this.getRulesGfm();
    const gfm = this.getRulesGfm();

    return (this.rulesBreaks = {
      ...gfm,
      ...{
        br: new ExtendRegexp(inline.br).setGroup('{2,}', '*').getRegexp(),
        text: new ExtendRegexp(gfm.text).setGroup('{2,}', '*').getRegexp()
      }
    });
  }

  protected setRules() {
    if (this.options.gfm) {
      if (this.options.breaks) {
        this.rules = this.staticThis.getRulesBreaks();
      } else {
        this.rules = this.staticThis.getRulesGfm();
      }
    } else if (this.options.pedantic) {
      this.rules = this.staticThis.getRulesPedantic();
    } else {
      this.rules = this.staticThis.getRulesBase();
    }

    this.hasRulesGfm = (this.rules as RulesInlineGfm).url !== undefined;
  }

  /**
   * Lexing/Compiling.
   */
  output(nextPart: string): string {
    nextPart = nextPart;
    let execArr: RegExpExecArray;
    let out = '';

    while (nextPart) {
      // escape
      if ((execArr = this.rules.escape.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        out += execArr[1];
        continue;
      }

      // autolink
      if ((execArr = this.rules.autolink.exec(nextPart))) {
        let text: string;
        let href: string;
        nextPart = nextPart.substring(execArr[0].length);

        if (execArr[2] === '@') {
          text = this.options.escape(
            execArr[1].charAt(6) === ':' ? this.mangle(execArr[1].substring(7)) : this.mangle(execArr[1])
          );
          href = this.mangle('mailto:') + text;
        } else {
          text = this.options.escape(execArr[1]);
          href = text;
        }

        out += this.renderer.link(href, null, text);
        continue;
      }

      // url (gfm)
      if (!this.inLink && this.hasRulesGfm && (execArr = (this.rules as RulesInlineGfm).url.exec(nextPart))) {
        let text: string;
        let href: string;
        nextPart = nextPart.substring(execArr[0].length);
        text = this.options.escape(execArr[1]);
        href = text;
        out += this.renderer.link(href, null, text);
        continue;
      }

      // tag
      if ((execArr = this.rules.tag.exec(nextPart))) {
        if (!this.inLink && /^<a /i.test(execArr[0])) {
          this.inLink = true;
        } else if (this.inLink && /^<\/a>/i.test(execArr[0])) {
          this.inLink = false;
        }

        nextPart = nextPart.substring(execArr[0].length);

        out += this.options.sanitize
          ? this.options.sanitizer
            ? this.options.sanitizer(execArr[0])
            : this.options.escape(execArr[0])
          : execArr[0];
        continue;
      }

      // link
      if ((execArr = this.rules.link.exec(nextPart))) {
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
      if ((execArr = this.rules.reflink.exec(nextPart)) || (execArr = this.rules.nolink.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        const keyLink = (execArr[2] || execArr[1]).replace(/\s+/g, ' ');
        const link = this.links[keyLink.toLowerCase()];

        if (!link || !link.href) {
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
      if ((execArr = this.rules.strong.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.strong(this.output(execArr[2] || execArr[1]));
        continue;
      }

      // em
      if ((execArr = this.rules.em.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.em(this.output(execArr[2] || execArr[1]));
        continue;
      }

      // code
      if ((execArr = this.rules.code.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.codespan(this.options.escape(execArr[2].trim(), true));
        continue;
      }

      // br
      if ((execArr = this.rules.br.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.br();
        continue;
      }

      // del (gfm)
      if (this.hasRulesGfm && (execArr = (this.rules as RulesInlineGfm).del.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.del(this.output(execArr[1]));
        continue;
      }

      // text
      if ((execArr = this.rules.text.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        out += this.renderer.text(this.options.escape(this.smartypants(execArr[0])));
        continue;
      }

      if (nextPart) {
        throw new Error('Infinite loop on byte: ' + nextPart.charCodeAt(0));
      }
    }

    return out;
  }

  /**
   * Compile Link.
   */
  protected outputLink(execArr: RegExpExecArray, link: Link) {
    const href = this.options.escape(link.href);
    const title = link.title ? this.options.escape(link.title) : null;

    return execArr[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, this.output(execArr[1]))
      : this.renderer.image(href, title, this.options.escape(execArr[1]));
  }

  /**
   * Smartypants Transformations.
   */
  protected smartypants(text: string) {
    if (!this.options.smartypants) {
      return text;
    }

    return (
      text
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
        .replace(/\.{3}/g, '\u2026')
    );
  }

  /**
   * Mangle Links.
   */
  protected mangle(text: string) {
    if (!this.options.mangle) {
      return text;
    }

    let out = '';
    const length = text.length;

    for (let i = 0; i < length; i++) {
      let str: string;

      if (Math.random() > 0.5) {
        str = 'x' + text.charCodeAt(i).toString(16);
      }

      out += '&#' + str + ';';
    }

    return out;
  }
}
