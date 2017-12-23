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
import { Noop } from './helpers';
import {
  BlockGrammar,
  MarkedOptions,
  ParamsToken,
  Links,
  Align,
  LexerReturns,
  TokenType,
  BlockGfm,
  BlockTables
} from './interfaces';

export class BlockLexer
{
  private static block: BlockGrammar;
  /**
   * GFM Block Grammar.
   */
  private static gfm: BlockGfm;
  /**
   * GFM + Tables Block Grammar.
   */
  private static tables: BlockTables;
  private rules: BlockGrammar | BlockGfm | BlockTables;
  private options: MarkedOptions;
  private links: Links;
  private tokens: ParamsToken[];

  constructor(options?: MarkedOptions)
  {
    this.options = options || Marked.defaults;
    this.links = {};
    this.tokens = [];

    if(this.options.gfm)
    {
      if(this.options.tables)
      {
        this.rules = BlockLexer.getBlockTables();
      }
      else
      {
        this.rules = BlockLexer.getBlockGfm();
      }
    }
    else
    {
      this.rules = BlockLexer.getBlock();
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
    if(this.gfm)
      return this.gfm;

    const block = this.getBlock();

    const gfm =
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

    return this.gfm = gfm;
  }

  protected static getBlockTables(): BlockTables
  {
    if(this.tables)
      return this.tables;

    return this.tables =
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
  static lex(src: string, options?: MarkedOptions): LexerReturns
  {
    const lexer = new this(options);
    return lexer.lex(src);
  }

  /**
   * Preprocessing.
   */
  private lex(src: string): LexerReturns
  {
    src = src
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/\u00a0/g, ' ')
      .replace(/\u2424/g, '\n');

    return this.getTokens(src, true);
  }

  /**
   * Lexing.
   */
  protected getTokens(src: string, top: boolean, isBlockQuote?: boolean): LexerReturns
  {
    // Removes all rows where there are only whitespaces.
    let nextPart: string = src.replace(/^ +$/gm, '');
    let execArr: RegExpExecArray;

    while(nextPart)
    {
      // newline
      if( execArr = this.rules.newline.exec(nextPart) )
      {
        nextPart = nextPart.substring(execArr[0].length);

        if(execArr[0].length > 1)
        {
          this.tokens.push({type: TokenType.space});
        }
      }

      // code
      if( execArr = this.rules.code.exec(nextPart) )
      {
        nextPart = nextPart.substring(execArr[0].length);
        const code = execArr[0].replace(/^ {4}/gm, '');

        this.tokens.push({
          type: TokenType.code,
          text: !this.options.pedantic ? code.replace(/\n+$/, '') : code
        });

        continue;
      }

      // fences code (gfm)
      if( this.isBlockGfm(this.rules) && (execArr = this.rules.fences.exec(nextPart)) )
      {
        nextPart = nextPart.substring(execArr[0].length);

        this.tokens.push({
          type: TokenType.code,
          lang: execArr[2],
          text: execArr[3] || ''
        });

        continue;
      }

      // heading
      if( execArr = this.rules.heading.exec(nextPart) )
      {
        nextPart = nextPart.substring(execArr[0].length);

        this.tokens.push({
          type: TokenType.heading,
          depth: execArr[1].length,
          text: execArr[2]
        });

        continue;
      }

      // table no leading pipe (gfm)
      if
      (
        top
        && this.isBlockTables(this.rules)
        && (execArr = this.rules.nptable.exec(nextPart))
      )
      {
        nextPart = this.pushTable(nextPart, execArr);
        continue;
      }

      // lheading
      if(execArr = this.rules.lheading.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);

        this.tokens.push({
          type: TokenType.heading,
          depth: execArr[2] === '=' ? 1 : 2,
          text: execArr[1]
        });

        continue;
      }

      // hr
      if(execArr = this.rules.hr.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        this.tokens.push({type: TokenType.hr});

        continue;
      }

      // blockquote
      if(execArr = this.rules.blockquote.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);

        this.tokens.push({type: TokenType.blockquote_start});

        const str = execArr[0].replace(/^ *> ?/gm, '');

        // Pass `top` to keep the current
        // "toplevel" state. This is exactly
        // how markdown.pl works.
        this.getTokens(str, top, true);

        this.tokens.push({type: TokenType.blockquote_end});

        continue;
      }

      // list
      if(execArr = this.rules.list.exec(nextPart))
      {
        nextPart = this.pushList(nextPart, execArr, isBlockQuote);
        continue;
      }

      // html
      if(execArr = this.rules.html.exec(nextPart))
      {
        nextPart = nextPart.substring(execArr[0].length);
        const attr = execArr[1];
        const isPre = (attr === 'pre' || attr === 'script' || attr === 'style');

        this.tokens.push
        ({
          type: this.options.sanitize ? TokenType.paragraph : TokenType.html,
          pre: !this.options.sanitizer && isPre,
          text: execArr[0]
        });

        continue;
      }

      // def
      if( (!isBlockQuote && top) && (execArr = this.rules.def.exec(nextPart)) )
      {
        nextPart = nextPart.substring(execArr[0].length);

        this.links[execArr[1].toLowerCase()] =
        {
          href: execArr[2],
          title: execArr[3]
        };

        continue;
      }

      // table (gfm)
      if( top && this.isBlockTables(this.rules) && (execArr = this.rules.table.exec(nextPart)) )
      {
        nextPart = this.pushTableGfm(nextPart, execArr);
        continue;
      }

      // top-level paragraph
      if( top && (execArr = this.rules.paragraph.exec(nextPart)) )
      {
        nextPart = nextPart.substring(execArr[0].length);

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

        continue;
      }

      // text
      if(execArr = this.rules.text.exec(nextPart))
      {
        // Top-level should never reach here.
        nextPart = nextPart.substring(execArr[0].length);
        this.tokens.push({type: TokenType.text, text: execArr[0]});

        continue;
      }

      if(nextPart)
      {
        throw new Error('Infinite loop on byte: ' + nextPart.charCodeAt(0));
      }
    }

    return {tokens: this.tokens, links: this.links};
  }

  protected isBlockGfm(block: BlockGrammar | BlockGfm | BlockTables): block is BlockGfm
  {
    return (<BlockGfm>block).fences !== undefined;
  }

  protected isBlockTables(block: BlockGrammar | BlockGfm | BlockTables): block is BlockTables
  {
    return (<BlockTables>block).table !== undefined;
  }

  protected pushTableGfm(nextPart: string, execArr: RegExpExecArray): string
  {
    nextPart = nextPart.substring(execArr[0].length);

    let item: ParamsToken =
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

    return nextPart;
  }

  // table no leading pipe (gfm).
  protected pushTable(nextPart: string, execArr: RegExpExecArray): string
  {
    nextPart = nextPart.substring(execArr[0].length);

    const item: ParamsToken =
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

    return nextPart;
  }

  /**
   * @todo Improve performance.
   */
  protected pushList(nextPart: string, execArr: RegExpExecArray, isBlockQuote: boolean): string
  {
    nextPart = nextPart.substring(execArr[0].length);
    const bull: string = execArr[2];

    this.tokens.push({type: TokenType.list_start, ordered: bull.length > 1});

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
        blockBullet = BlockLexer.getBlock().bullet.exec(str[i + 1])[0];

        if( bull !== blockBullet && !(bull.length > 1 && blockBullet.length > 1) )
        {
          nextPart = str.slice(i + 1).join('\n') + nextPart;
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

      this.tokens.push({type: loose ? TokenType.loose_item_start : TokenType.list_item_start});

      // Recurse.
      this.getTokens(item, false, isBlockQuote);
      this.tokens.push({type: TokenType.list_item_end});
    }

    this.tokens.push({type: TokenType.list_end});

    return nextPart;
  }
}
