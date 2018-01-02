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
import { Renderer } from './renderer';
import { Marked } from './marked';
import {
  RulesInlineBase,
  MarkedOptions,
  Links,
  Link,
  RulesInlineGfm,
  RulesInlineBreaks,
  RulesInlinePedantic,
  InlineRuleFunction
} from './interfaces';


/**
 * Inline Lexer & Compiler.
 * 
 * @todo Remove from constructor reference to current class.
 */
export class InlineLexer<T extends typeof InlineLexer>
{
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
  protected out = '';
  protected nextPart = '';
  protected links: Links;
  protected rules: RulesInlineBase;
  protected options: MarkedOptions;
  protected renderer: Renderer;
  protected inLink: boolean;
  protected ruleFunctions: InlineRuleFunction[];
  protected hasRulesGfm: boolean;

  constructor (private staticThis: T, links: Links, options?: MarkedOptions, renderer?: Renderer)
  {
    this.options = options || Marked.defaults;
    this.renderer = renderer || this.options.renderer || new Renderer(this.options);
    this.links = links;

    if(!this.links)
      throw new Error(`InlineLexer requires 'links' parameter.`);

    this.init();
  }

  protected init()
  {
    this.setRules();
    this.setRulesFunctions();
  }

  /**
   * Static Lexing/Compiling Method.
   */
  static output(src: string, links: Links, options: MarkedOptions): string
  {
    const inlineLexer = new this(this, links, options);
    return inlineLexer.output(src);
  }

  protected setRules()
  {
    if(this.options.gfm)
    {
      if(this.options.breaks)
      {
        this.rules = this.staticThis.getRulesBreaks();
      }
      else
      {
        this.rules = this.staticThis.getRulesGfm();
      }
    }
    else if(this.options.pedantic)
    {
      this.rules = this.staticThis.getRulesPedantic()
    }
    else
    {
      this.rules = this.staticThis.getRulesBase()
    }

    this.hasRulesGfm = (<RulesInlineGfm>this.rules).url !== undefined;
  }

  protected setRulesFunctions()
  {
    this.ruleFunctions =
    [
      // escape
      {
        condition: this.conditionEscape,
        action: this.actionEscape
      },
      // autolink
      {
        condition: this.conditionAutolink,
        action: this.actionAutolink
      },
      // url (gfm)
      {
        condition: this.conditionUrl,
        action: this.actionUrl
      },
      // tag
      {
        condition: this.conditionTag,
        action: this.actionTag
      },
      // link
      {
        condition: this.conditionLink,
        action: this.actionLink
      },
      // reflink
      {
        condition: this.conditionReflink,
        action: this.actionReflink
      },
      // nolink
      {
        condition: this.conditionNolink,
        action: this.actionNolink
      },
      // strong
      {
        condition: this.conditionStrong,
        action: this.actionStrong
      },
      // em
      {
        condition: this.conditionEm,
        action: this.actionEm
      },
      // code
      {
        condition: this.conditionCode,
        action: this.actionCode
      },
      // br
      {
        condition: this.conditionBr,
        action: this.actionBr
      },
      // del (gfm)
      {
        condition: this.conditionDel,
        action: this.actionDel
      },
      // text
      {
        condition: this.conditionText,
        action: this.actionText
      }
    ];
  }

  protected static getRulesBase(): RulesInlineBase
  {
    if(this.rulesBase)
      return this.rulesBase;

    /**
     * Inline-Level Grammar.
     */
    const inline: RulesInlineBase =
    {
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
      _href: /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/,
    };

    inline.link = new ExtendRegexp(inline.link)
    .setGroup('inside', inline._inside)
    .setGroup('href', inline._href)
    .getRegexp();

    inline.reflink = new ExtendRegexp(inline.reflink)
    .setGroup('inside', inline._inside)
    .getRegexp();

    return this.rulesBase = inline;
  }

  protected static getRulesPedantic(): RulesInlinePedantic
  {
    if(this.rulesPedantic)
      return this.rulesPedantic;

    return this.rulesPedantic =
    {
      ...this.getRulesBase(),
      ...{
        strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
      }
    };
  }

  protected static getRulesGfm(): RulesInlineGfm
  {
    if(this.rulesGfm)
      return this.rulesGfm;
    
    const inline = this.getRulesBase();

    const escape = new ExtendRegexp(inline.escape)
    .setGroup('])', '~|])')
    .getRegexp();

    const text = new ExtendRegexp(inline.text)
    .setGroup(']|', '~]|')
    .setGroup('|', '|https?://|')
    .getRegexp();

    return this.rulesGfm =
    {
      ...inline,
      ...{
        escape: escape,
        url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
        del: /^~~(?=\S)([\s\S]*?\S)~~/,
        text: text
      }
    };
  }

  protected static getRulesBreaks(): RulesInlineBreaks
  {
    if(this.rulesBreaks)
      return this.rulesBreaks;
    
    const inline = this.getRulesGfm();
    const gfm = this.getRulesGfm();

    return this.rulesBreaks =
    {
      ...gfm,
      ...{
        br: new ExtendRegexp(inline.br).setGroup('{2,}', '*').getRegexp(),
        text: new ExtendRegexp(gfm.text).setGroup('{2,}', '*').getRegexp()
      }
    };
  }

  /**
   * Lexing/Compiling.
   */
  output(nextPart: string): string
  {
    this.nextPart = nextPart;
    const lengthFn = this.ruleFunctions.length;

    nextPart:
    while(this.nextPart)
    {
      for(let i = 0; i < lengthFn; i++)
      {
        const callbacks = this.ruleFunctions[i];
        callbacks.regexp = callbacks.regexp || callbacks.condition.call(this);
        let execArr: RegExpExecArray;

        if( callbacks.regexp && (execArr = callbacks.regexp.exec(this.nextPart)) )
        {
          this.nextPart = this.nextPart.substring(execArr[0].length);
          callbacks.action.call(this, execArr);
          continue nextPart;
        }
      }

      if(this.nextPart)
      {
        throw new Error('Infinite loop on byte: ' + this.nextPart.charCodeAt(0) + `, near text '${this.nextPart.slice(0, 30)}...'`);
      }
    }

    const out = this.out;
    this.out = '';
    return out;
  }

  protected conditionEscape(): RegExp
  {
    return this.rules.escape;
  }

  protected actionEscape(execArr: RegExpExecArray): void
  {
    this.out += execArr[1];
  }

  protected conditionAutolink(): RegExp
  {
    return this.rules.autolink;
  }

  protected actionAutolink(execArr: RegExpExecArray): void
  {
    let text: string, href: string;

    if(execArr[2] === '@')
    {
      text = this.options.escape
      (
        execArr[1].charAt(6) === ':'
        ? this.mangle(execArr[1].substring(7))
        : this.mangle(execArr[1])
      );
      href = this.mangle('mailto:') + text;
    }
    else
    {
      text = this.options.escape(execArr[1]);
      href = text;
    }

    this.out += this.renderer.link(href, null, text);
  }

  protected conditionUrl(): RegExp
  {
    if(!this.inLink && this.hasRulesGfm)
    {
      return (<RulesInlineGfm>this.rules).url;
    }
  }

  protected actionUrl(execArr: RegExpExecArray): void
  {
    let text: string, href: string;
    text = this.options.escape(execArr[1]);
    href = text;
    this.out += this.renderer.link(href, null, text);
  }

  protected conditionTag(): RegExp
  {
    return this.rules.tag;
  }

  protected actionTag(execArr: RegExpExecArray): void
  {
    if(!this.inLink && /^<a /i.test(execArr[0]))
    {
      this.inLink = true;
    }
    else if(this.inLink && /^<\/a>/i.test(execArr[0]))
    {
      this.inLink = false;
    }

    this.out += this.options.sanitize
      ? this.options.sanitizer
        ? this.options.sanitizer(execArr[0])
        : this.options.escape(execArr[0])
      : execArr[0];
  }

  protected conditionLink(): RegExp
  {
    return this.rules.link;
  }

  protected actionLink(execArr: RegExpExecArray): void
  {
    this.inLink = true;

    this.out += this.outputLink(execArr, {
      href: execArr[2],
      title: execArr[3]
    });

    this.inLink = false;
  }

  protected conditionReflink(): RegExp
  {
    return this.rules.reflink
  }

  /**
   * @todo Improve this (it's duplicate of actionNolink())
   */
  protected actionReflink(execArr: RegExpExecArray): void
  {
    const keyLink = (execArr[2] || execArr[1]).replace(/\s+/g, ' ');
    const link = this.links[keyLink.toLowerCase()];

    if(!link || !link.href)
    {
      this.out += execArr[0].charAt(0);
      this.nextPart = execArr[0].substring(1) + this.nextPart;
      return;
    }

    this.inLink = true;
    this.out += this.outputLink(execArr, link);
    this.inLink = false;
  }

  protected conditionNolink(): RegExp
  {
    return this.rules.nolink;
  }

  /**
   * @todo Improve this (it's duplicate of actionReflink())
   */
  protected actionNolink(execArr: RegExpExecArray): void
  {
    const keyLink = (execArr[2] || execArr[1]).replace(/\s+/g, ' ');
    const link = this.links[keyLink.toLowerCase()];

    if(!link || !link.href)
    {
      this.out += execArr[0].charAt(0);
      this.nextPart = execArr[0].substring(1) + this.nextPart;
      return;
    }

    this.inLink = true;
    this.out += this.outputLink(execArr, link);
    this.inLink = false;
  }

  protected conditionStrong(): RegExp
  {
    return this.rules.strong;
  }

  protected actionStrong(execArr: RegExpExecArray): void
  {
    const output = this.staticThis.output(execArr[2] || execArr[1], this.links, this.options);
    this.out += this.renderer.strong(output);
  }

  protected conditionEm(): RegExp
  {
    return this.rules.em;
  }

  protected actionEm(execArr: RegExpExecArray): void
  {
    const output = this.staticThis.output(execArr[2] || execArr[1], this.links, this.options);
    this.out += this.renderer.em(output);
  }

  protected conditionCode(): RegExp
  {
    return this.rules.code;
  }

  protected actionCode(execArr: RegExpExecArray): void
  {
    const output = this.options.escape(execArr[2].trim(), true);
    this.out += this.renderer.codespan(output);
  }

  protected conditionBr(): RegExp
  {
    return this.rules.br;
  }

  protected actionBr(): void
  {
    this.out += this.renderer.br();
  }

  protected conditionDel(): RegExp
  {
    if(this.hasRulesGfm)
      return (<RulesInlineGfm>this.rules).del;
  }

  protected actionDel(execArr: RegExpExecArray): void
  {
    const output = this.staticThis.output(execArr[1], this.links, this.options);
    this.out += this.renderer.del(output);
  }

  protected conditionText(): RegExp
  {
    return this.rules.text;
  }

  protected actionText(execArr: RegExpExecArray): void
  {
    const output = this.options.escape(this.smartypants(execArr[0]));
    this.out += this.renderer.text(output);
  }

  /**
   * Compile Link.
   */
  protected outputLink(execArr: RegExpExecArray, link: Link)
  {
    const href = this.options.escape(link.href);
    const title = link.title ? this.options.escape(link.title) : null;

    return execArr[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, this.staticThis.output(execArr[1], this.links, this.options))
      : this.renderer.image(href, title, this.options.escape(execArr[1]));
  }

  /**
   * Smartypants Transformations.
   */
  protected smartypants(text: string)
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
  protected mangle(text: string)
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
