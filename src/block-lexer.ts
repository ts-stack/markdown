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
import { AbstractBlockLexer } from './abstract-block-lexer';
import {
  RulesBlockBase,
  MarkedOptions,
  Token,
  Links,
  Align,
  LexerReturns,
  TokenType,
  RulesBlockGfm,
  RulesBlockTables,
  RulesBlockCallback
} from './interfaces';

export class BlockLexer extends AbstractBlockLexer
{
  protected static rulesBase: RulesBlockBase;
  /**
   * GFM Block Grammar.
   */
  protected static rulesGfm: RulesBlockGfm;
  /**
   * GFM + Tables Block Grammar.
   */
  protected static rulesTables: RulesBlockTables;
  protected rules: RulesBlockBase | RulesBlockGfm | RulesBlockTables;
  protected options: MarkedOptions;
  protected staticThis: typeof BlockLexer;

  /**
   * Accepts Markdown text and returns object with tokens and links.
   * 
   * @param src String of markdown source to be compiled.
   * @param options Hash of options.
   */
  static lex(src: string, options?: MarkedOptions, top?: boolean, isBlockQuote?: boolean): LexerReturns
  {
    const lexer = new this(this, options);
    return lexer.getTokens(src, top, isBlockQuote);
  }

  protected static getRulesBase(): RulesBlockBase
  {
    if(this.rulesBase)
      return this.rulesBase;

    const base: RulesBlockBase =
    {
      newline: /^\n+/,
      code: /^( {4}[^\n]+\n*)+/,
      hr: /^( *[-*_]){3,} *(?:\n+|$)/,
      heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
      lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
      blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
      list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
      html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
      paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
      text: /^[^\n]+/,
      bullet: /(?:[*+-]|\d+\.)/,
      item: /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/
    };

    base.item = new ExtendRegexp(base.item, 'gm')
    .setGroup(/bull/g, base.bullet)
    .getRegexp();

    base.list = new ExtendRegexp(base.list)
    .setGroup(/bull/g, base.bullet)
    .setGroup('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
    .setGroup('def', '\\n+(?=' + base.def.source + ')')
    .getRegexp();

    const tag = '(?!(?:'
      + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
      + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
      + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

    base.html = new ExtendRegexp(base.html)
    .setGroup('comment', /<!--[\s\S]*?-->/)
    .setGroup('closed', /<(tag)[\s\S]+?<\/\1>/)
    .setGroup('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
    .setGroup(/tag/g, tag)
    .getRegexp();

    base.paragraph = new ExtendRegexp(base.paragraph)
    .setGroup('hr', base.hr)
    .setGroup('heading', base.heading)
    .setGroup('lheading', base.lheading)
    .setGroup('blockquote', base.blockquote)
    .setGroup('tag', '<' + tag)
    .setGroup('def', base.def)
    .getRegexp();

    return this.rulesBase = base;
  }

  protected static getRulesGfm(): RulesBlockGfm
  {
    if(this.rulesGfm)
      return this.rulesGfm;

    const base = this.getRulesBase();

    const gfm: RulesBlockGfm =
    {
      ...base,
      ...{
        fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
        paragraph: /^/,
        heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
      }
    };

    const group1 = gfm.fences.source.replace('\\1', '\\2');
    const group2 = base.list.source.replace('\\1', '\\3');

    gfm.paragraph = new ExtendRegexp(base.paragraph)
    .setGroup('(?!', `(?!${group1}|${group2}|`)
    .getRegexp();

    return this.rulesGfm = gfm;
  }

  protected static getRulesTable(): RulesBlockTables
  {
    if(this.rulesTables)
      return this.rulesTables;

    return this.rulesTables =
    {
      ...this.getRulesGfm(),
      ...{
        nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
        table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
      }
    };
  }

  protected setRules()
  {
    if(this.options.gfm)
    {
      if(this.options.tables)
      {
        this.rules = this.staticThis.getRulesTable();
      }
      else
      {
        this.rules = this.staticThis.getRulesGfm();
      }
    }
    else
    {
      this.rules = this.staticThis.getRulesBase();
    }
  }

  protected setRuleCallbacks()
  {
    this.ruleCallbacks =
    [
      // new line
      {
        condition: this.conditionNewline,
        tokenize: this.tokenizeNewline
      },
      // code
      {
        condition: this.conditionCode,
        tokenize: this.tokenizeCode
      },
      // fences code (gfm)
      {
        condition: this.conditionFencesCode,
        tokenize: this.tokenizeFencesCode
      },
      // heading
      {
        condition: this.conditionHeading,
        tokenize: this.tokenizeHeading
      },
      // table no leading pipe (gfm)
      {
        condition: this.conditionNptable,
        tokenize: this.tokenizeNptable
      },
      // lheading
      {
        condition: this.conditionLheading,
        tokenize: this.tokenizeLheading
      },
      // hr
      {
        condition: this.conditionHr,
        tokenize: this.tokenizeHr
      },
      // blockquote
      {
        condition: this.conditionBlockquote,
        tokenize: this.tokenizeBlockquote
      },
      // list
      {
        condition: this.conditionList,
        tokenize: this.tokenizeList
      },
      // html
      {
        condition: this.conditionHtml,
        tokenize: this.tokenizeHtml
      },
      // def
      {
        condition: this.conditionDef,
        tokenize: this.tokenizeDef
      },
      // table (gfm)
      {
        condition: this.conditionTableGfm,
        tokenize: this.tokenizeTableGfm
      },
      // top-level paragraph
      {
        condition: this.conditionParagraph,
        tokenize: this.tokenizeParagraph
      },
      // text
      {
        condition: this.conditionText,
        tokenize: this.tokenizeText
      },
    ];

    if( (<RulesBlockGfm>this.rules).fences === undefined )
    {
      const i = this.ruleCallbacks.findIndex(cb => cb.tokenize.name == 'tokenizeFencesCode')
      this.ruleCallbacks.splice(i, 1);
    }
    else if( (<RulesBlockTables>this.rules).table === undefined )
    {
      const length = this.ruleCallbacks.length;

      for(let i = 0; i < this.ruleCallbacks.length; i++)
      {
        const cb = this.ruleCallbacks[i];

        if(cb.tokenize.name == 'tokenizeNptable' || cb.tokenize.name == 'tokenizeTableGfm')
        {
          this.ruleCallbacks.splice(i, 1);
          if(length - 2 == this.ruleCallbacks.length)
            break;
          --i;
        }
      }
    }

    if(this.staticThis.simpleRules.length)
    {
      const i = this.ruleCallbacks.findIndex(cb => cb.tokenize.name == 'tokenizeParagraph');
      // Insert all simple rules before check paragraph rule.
      this.ruleCallbacks.splice(i, 0, ...this.staticThis.simpleRules);
    }
  }

  protected conditionCode(): RegExp
  {
    return this.rules.code;
  }

  protected tokenizeCode(execArr: RegExpExecArray): void
  {
    const code = execArr[0].replace(/^ {4}/gm, '');

    this.tokens.push({
      type: TokenType.code,
      text: !this.options.pedantic ? code.replace(/\n+$/, '') : code
    });
  }

  protected conditionFencesCode(): RegExp
  {
    return (<RulesBlockGfm>this.rules).fences;
  }

  protected tokenizeFencesCode(execArr: RegExpExecArray): void
  {
    this.tokens.push({
      type: TokenType.code,
      lang: execArr[2],
      text: execArr[3] || ''
    });
  }

  protected conditionHeading(): RegExp
  {
    return this.rules.heading;
  }

  protected tokenizeHeading(execArr: RegExpExecArray): void
  {
    this.tokens.push({
      type: TokenType.heading,
      depth: execArr[1].length,
      text: execArr[2]
    });
  }

  // table no leading pipe (gfm).
  protected conditionNptable(top: boolean): RegExp
  {
    if(top)
      return (<RulesBlockTables>this.rules).nptable;
  }

  protected tokenizeNptable(execArr: RegExpExecArray): void
  {
    const item: Token =
    {
      type: TokenType.table,
      header: execArr[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
      align: execArr[2].replace(/^ *|\| *$/g, '').split(/ *\| */) as Align[],
      cells: []
    };

    for(let i = 0; i < item.align.length; i++)
    {
      if(/^ *-+: *$/.test(item.align[i]))
      {
        item.align[i] = 'right';
      }
      else if (/^ *:-+: *$/.test(item.align[i]))
      {
        item.align[i] = 'center';
      }
      else if (/^ *:-+ *$/.test(item.align[i]))
      {
        item.align[i] = 'left';
      }
      else
      {
        item.align[i] = null;
      }
    }

    let td: string[] = execArr[3].replace(/\n$/, '').split('\n');

    for(let i = 0; i < td.length; i++)
    {
      item.cells[i] = td[i].split(/ *\| */);
    }

    this.tokens.push(item);
  }

  protected conditionLheading(): RegExp
  {
    return this.rules.lheading;
  }

  protected tokenizeLheading(execArr: RegExpExecArray): void
  {
    this.tokens.push({
      type: TokenType.heading,
      depth: execArr[2] === '=' ? 1 : 2,
      text: execArr[1]
    });
  }

  protected conditionHr(): RegExp
  {
    return this.rules.hr;
  }

  protected tokenizeHr(): void
  {
    this.tokens.push({type: TokenType.hr});
  }

  protected conditionBlockquote(): RegExp
  {
    return this.rules.blockquote;
  }

  protected tokenizeBlockquote(execArr: RegExpExecArray): void
  {
    this.tokens.push({type: TokenType.blockquoteStart});
    const str = execArr[0].replace(/^ *> ?/gm, '');

    const {tokens, links} = this.staticThis.lex(str, this.options, false, true);
    this.tokens.push(...tokens);
    this.links = {...this.links, ...links};

    this.tokens.push({type: TokenType.blockquoteEnd});
  }

  protected conditionList(): RegExp
  {
    return this.rules.list;
  }

  /**
   * @param top Used for compatibility with other methods `check...()`.
   * 
   * @todo Improve performance.
   */
  protected tokenizeList(execArr: RegExpExecArray, top: boolean, isBlockQuote: boolean): void
  {
    const bull: string = execArr[2];

    this.tokens.push({type: TokenType.listStart, ordered: bull.length > 1});

    // Get each top-level item.
    const str = execArr[0].match(this.rules.item);
    const length = str.length;

    let
    next: boolean = false,
    space: number,
    blockBullet: string,
    loose: boolean
    ;

    for(let i = 0; i < length; i++)
    {
      let item = str[i];

      // Remove the list item's bullet so it is seen as the next token.
      space = item.length;
      item = item.replace(/^ *([*+-]|\d+\.) +/, '');

      // Outdent whatever the list item contains. Hacky.
      if(item.includes('\n '))
      {
        space -= item.length;
        item = !this.options.pedantic
          ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
          : item.replace(/^ {1,4}/gm, '');
      }

      // Determine whether the next list item belongs here.
      // Backpedal if it does not belong in this list.
      if(this.options.smartLists && i !== length - 1)
      {
        blockBullet = this.staticThis.getRulesBase().bullet.exec(str[i + 1])[0];

        if( bull !== blockBullet && !(bull.length > 1 && blockBullet.length > 1) )
        {
          this.nextPart = str.slice(i + 1).join('\n') + this.nextPart;
          i = length - 1;
        }
      }

      // Determine whether item is loose or not.
      // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
      // for discount behavior.
      loose = next || /\n\n(?!\s*$)/.test(item);

      if(i !== length - 1)
      {
        next = item.charAt(item.length - 1) === '\n';

        if(!loose)
          loose = next;
      }

      this.tokens.push({type: loose ? TokenType.looseItemStart : TokenType.listItemStart});

      // Recurse.
      const {tokens, links} = this.staticThis.lex(item, this.options, false, isBlockQuote);
      // console.log(`**** local tokens`, tokens);
      // console.log(`**** global tokens`, this.tokens);
      this.tokens.push(...tokens);
      this.links = {...this.links, ...links};
      this.tokens.push({type: TokenType.listItemEnd});
    }

    this.tokens.push({type: TokenType.listEnd});
  }

  protected conditionHtml(): RegExp
  {
    return this.rules.html;
  }

  protected tokenizeHtml(execArr: RegExpExecArray): void
  {
    const attr = execArr[1];
    const isPre = (attr === 'pre' || attr === 'script' || attr === 'style');

    this.tokens.push
    ({
      type: this.options.sanitize ? TokenType.paragraph : TokenType.html,
      pre: !this.options.sanitizer && isPre,
      text: execArr[0]
    });
  }

  protected conditionDef(top: boolean, isBlockQuote: boolean): RegExp
  {
    if(top && !isBlockQuote)
      return this.rules.def;
  }

  protected tokenizeDef(execArr: RegExpExecArray): void
  {
    this.links[execArr[1].toLowerCase()] =
    {
      href: execArr[2],
      title: execArr[3]
    };
  }

  protected conditionTableGfm(top: boolean): RegExp
  {
    if(top)
      return (<RulesBlockTables>this.rules).table;
  }

  protected tokenizeTableGfm(execArr: RegExpExecArray): void
  {
    const item: Token =
    {
      type: TokenType.table,
      header: execArr[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
      align: execArr[2].replace(/^ *|\| *$/g, '').split(/ *\| */) as Align[],
      cells: []
    };

    for(let i = 0; i < item.align.length; i++)
    {
      if( /^ *-+: *$/.test(item.align[i]) )
      {
        item.align[i] = 'right';
      }
      else if( /^ *:-+: *$/.test(item.align[i]) )
      {
        item.align[i] = 'center';
      }
      else if( /^ *:-+ *$/.test(item.align[i]) )
      {
        item.align[i] = 'left';
      }
      else
      {
        item.align[i] = null;
      }
    }

    const td = execArr[3].replace(/(?: *\| *)?\n$/, '').split('\n');

    for(let i = 0; i < td.length; i++)
    {
      item.cells[i] = td[i]
        .replace(/^ *\| *| *\| *$/g, '')
        .split(/ *\| */);
    }

    this.tokens.push(item);
  }

  protected conditionParagraph(top: boolean): RegExp
  {
    if(top)
      return this.rules.paragraph;
  }

  protected tokenizeParagraph(execArr: RegExpExecArray): void
  {
    if(execArr[1].charAt(execArr[1].length - 1) === '\n')
    {
      this.tokens.push({
        type: TokenType.paragraph,
        text: execArr[1].slice(0, -1),
      });
    }
    else
    {
      this.tokens.push({
        type: this.tokens.length > 0 ? TokenType.paragraph : TokenType.html,
        text: execArr[1],
      });
    }

  }

  protected conditionText(): RegExp
  {
    return this.rules.text;
  }

  protected tokenizeText(execArr: RegExpExecArray): void
  {
    // Top-level should never reach here.
    this.tokens.push({type: TokenType.text, text: execArr[0]});
  }
}
