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
import { Marked } from './marked';
import {
  BlockGrammar,
  MarkedOptions,
  Token,
  Links,
  Align,
  LexerReturns,
  TokenType,
  BlockGfm,
  BlockTables,
  BlockRuleFunction
} from './interfaces';


export class BlockLexer<T extends typeof BlockLexer>
{
  protected static block: BlockGrammar;
  /**
   * GFM Block Grammar.
   */
  protected static blockGfm: BlockGfm;
  /**
   * GFM + Tables Block Grammar.
   */
  protected static blockTables: BlockTables;
  protected rules: BlockGrammar | BlockGfm | BlockTables;
  protected options: MarkedOptions;
  protected links: Links;
  protected tokens: Token[];
  protected nextPart: string;
  protected isMatch: boolean;

  constructor(private staticThis: T, options?: MarkedOptions)
  {
    this.options = options || Marked.defaults;
    this.links = {};
    this.tokens = [];

    if(this.options.gfm)
    {
      if(this.options.tables)
      {
        this.rules = staticThis.getBlockTables();
      }
      else
      {
        this.rules = staticThis.getBlockGfm();
      }
    }
    else
    {
      this.rules = staticThis.getBlock();
    }
  }

  protected static getBlock(): BlockGrammar
  {
    if(this.block)
      return this.block;

    const block: BlockGrammar =
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
      item: /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/,
      _tag: ''
    };

    block.item = new ExtendRegexp(block.item, 'gm')
    .setGroup(/bull/g, block.bullet)
    .getRegexp();

    block.list = new ExtendRegexp(block.list)
    .setGroup(/bull/g, block.bullet)
    .setGroup('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
    .setGroup('def', '\\n+(?=' + block.def.source + ')')
    .getRegexp();

    block._tag = '(?!(?:'
      + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
      + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
      + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

    block.html = new ExtendRegexp(block.html)
    .setGroup('comment', /<!--[\s\S]*?-->/)
    .setGroup('closed', /<(tag)[\s\S]+?<\/\1>/)
    .setGroup('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
    .setGroup(/tag/g, block._tag)
    .getRegexp();

    block.paragraph = new ExtendRegexp(block.paragraph)
    .setGroup('hr', block.hr)
    .setGroup('heading', block.heading)
    .setGroup('lheading', block.lheading)
    .setGroup('blockquote', block.blockquote)
    .setGroup('tag', '<' + block._tag)
    .setGroup('def', block.def)
    .getRegexp();

    return this.block = block;
  }

  protected static getBlockGfm(): BlockGfm
  {
    if(this.blockGfm)
      return this.blockGfm;

    const block = this.getBlock();

    const gfm: BlockGfm =
    {
      ...block,
      ...{
        fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
        paragraph: /^/,
        heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
      }
    };

    const group1 = gfm.fences.source.replace('\\1', '\\2');
    const group2 = block.list.source.replace('\\1', '\\3');

    gfm.paragraph = new ExtendRegexp(block.paragraph)
    .setGroup('(?!', `(?!${group1}|${group2}|`)
    .getRegexp();

    return this.blockGfm = gfm;
  }

  protected static getBlockTables(): BlockTables
  {
    if(this.blockTables)
      return this.blockTables;

    return this.blockTables =
    {
      ...this.getBlockGfm(),
      ...{
        nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
        table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
      }
    };
  }

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

  protected ruleFunctions: BlockRuleFunction[] =
  [
    // code
    this.checkCode.bind(this),
    // fences code (gfm)
    this.checkFencesCode.bind(this),
    // heading
    this.checkHeading.bind(this),
    // table no leading pipe (gfm)
    this.checkNptable.bind(this),
    // lheading
    this.checkLheading.bind(this),
    // hr
    this.checkHr.bind(this),
    // blockquote
    this.checkBlockquote.bind(this),
    // list
    this.checkList.bind(this),
    // html
    this.checkHtml.bind(this),
    // def
    this.checkDef.bind(this),
    // table (gfm)
    this.checkTableGfm.bind(this),
    // top-level paragraph
    this.checkParagraph.bind(this),
    // text
    this.checkText.bind(this)
  ];

  /**
   * Lexing.
   */
  protected getTokens(src: string, top?: boolean, isBlockQuote?: boolean): LexerReturns
  {
    this.nextPart = src;
    let execArr: RegExpExecArray;

    nextPart:
    while(this.nextPart)
    {
      // newline
      if( execArr = this.rules.newline.exec(this.nextPart) )
      {
        this.nextPart = this.nextPart.substring(execArr[0].length);

        if(execArr[0].length > 1)
        {
          this.tokens.push({type: TokenType.space});
        }
      }

      for(let i = 0; i < this.ruleFunctions.length; i++)
      {
        this.ruleFunctions[i](top, isBlockQuote);

        if(this.isMatch)
        {
          this.isMatch = false;
          continue nextPart;
        }
      }

      if(this.nextPart)
      {
        throw new Error('Infinite loop on byte: ' + this.nextPart.charCodeAt(0) + `, near text '${this.nextPart.slice(0, 30)}...'`);
      }
    }

    return {tokens: this.tokens, links: this.links};
  }

  protected checkCode(): void
  {
    const execArr = this.rules.code.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);
    const code = execArr[0].replace(/^ {4}/gm, '');

    this.tokens.push({
      type: TokenType.code,
      text: !this.options.pedantic ? code.replace(/\n+$/, '') : code
    });
  }

  protected checkFencesCode(): void
  {
    let execArr: RegExpExecArray;

    if
    (
      !this.isBlockGfm(this.rules)
      || !(execArr = this.rules.fences.exec(this.nextPart))
    )
    {
      return;
    }

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);

    this.tokens.push({
      type: TokenType.code,
      lang: execArr[2],
      text: execArr[3] || ''
    });
  }

  protected checkHeading(): void
  {
    const execArr = this.rules.heading.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);
    this.tokens.push({
      type: TokenType.heading,
      depth: execArr[1].length,
      text: execArr[2]
    });
  }

  // table no leading pipe (gfm).
  protected checkNptable(top: boolean): void
  {
    let execArr: RegExpExecArray;

    if
    (
      !top
      || !this.isBlockTables(this.rules)
      || !(execArr = this.rules.nptable.exec(this.nextPart))
    )
    {
      return;
    }

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);

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

  protected checkLheading(): void
  {
    const execArr = this.rules.lheading.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);

    this.tokens.push({
      type: TokenType.heading,
      depth: execArr[2] === '=' ? 1 : 2,
      text: execArr[1]
    });
  }

  protected checkHr(): void
  {
    const execArr = this.rules.hr.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);
    this.tokens.push({type: TokenType.hr});
  }

  protected checkBlockquote(top: boolean): void
  {
    const execArr = this.rules.blockquote.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);
    this.tokens.push({type: TokenType.blockquoteStart});
    const str = execArr[0].replace(/^ *> ?/gm, '');

    // Pass `top` to keep the current
    // "toplevel" state. This is exactly
    // how markdown.pl works.
    const {tokens, links} = this.staticThis.lex(str, this.options, top, true);
    this.tokens.push(...tokens);
    this.links = {...this.links, ...links};

    this.tokens.push({type: TokenType.blockquoteEnd});
  }

  /**
   * @todo Improve performance.
   */
  protected checkList(top: boolean, isBlockQuote: boolean): void
  {
    const execArr = this.rules.list.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);
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
        blockBullet = this.staticThis.getBlock().bullet.exec(str[i + 1])[0];

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

  protected checkHtml(): void
  {
    const execArr = this.rules.html.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);
    const attr = execArr[1];
    const isPre = (attr === 'pre' || attr === 'script' || attr === 'style');

    this.tokens.push
    ({
      type: this.options.sanitize ? TokenType.paragraph : TokenType.html,
      pre: !this.options.sanitizer && isPre,
      text: execArr[0]
    });
  }

  protected checkDef(top: boolean, isBlockQuote: boolean): void
  {
    if(isBlockQuote || !top)
    {
      return;
    }

    const execArr = this.rules.def.exec(this.nextPart);

    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);

    this.links[execArr[1].toLowerCase()] =
    {
      href: execArr[2],
      title: execArr[3]
    };
  }

  protected checkTableGfm(top: boolean): void
  {
    let execArr: RegExpExecArray;

    if
    (
      !top
      || !this.isBlockTables(this.rules)
      || !(execArr = this.rules.table.exec(this.nextPart))
    )
    {
      return;
    }

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);

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

  protected checkParagraph(top: boolean): void
  {
    let execArr: RegExpExecArray;

    if( !top || !(execArr = this.rules.paragraph.exec(this.nextPart)) )
    {
      return;
    }

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);

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

  protected checkText(): void
  {
    // Top-level should never reach here.
    const execArr = this.rules.text.exec(this.nextPart);
    if(!execArr)
      return;

    this.isMatch = true;
    this.nextPart = this.nextPart.substring(execArr[0].length);
    this.tokens.push({type: TokenType.text, text: execArr[0]});
  }

  protected isBlockGfm(block: BlockGrammar | BlockGfm | BlockTables): block is BlockGfm
  {
    return (<BlockGfm>block).fences !== undefined;
  }

  protected isBlockTables(rules: BlockGrammar | BlockGfm | BlockTables): rules is BlockTables
  {
    return (<BlockTables>rules).table !== undefined;
  }
}
