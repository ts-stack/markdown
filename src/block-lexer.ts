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
  Align,
  LexerReturns,
  Links,
  MarkedOptions,
  RulesBlockBase,
  RulesBlockGfm,
  RulesBlockTables,
  Token,
  TokenType
} from './interfaces';
import { Marked } from './marked';

export class BlockLexer<T extends typeof BlockLexer> {
  static simpleRules: RegExp[] = [];
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
  protected links: Links = {};
  protected tokens: Token[] = [];
  protected hasRulesGfm: boolean;
  protected hasRulesTables: boolean;

  constructor(protected staticThis: T, options?: object) {
    this.options = options || Marked.options;
    this.setRules();
  }

  /**
   * Accepts Markdown text and returns object with tokens and links.
   *
   * @param src String of markdown source to be compiled.
   * @param options Hash of options.
   */
  static lex(src: string, options?: MarkedOptions, top?: boolean, isBlockQuote?: boolean): LexerReturns {
    const lexer = new this(this, options);
    return lexer.getTokens(src, top, isBlockQuote);
  }

  protected static getRulesBase(): RulesBlockBase {
    if (this.rulesBase) {
      return this.rulesBase;
    }

    const base: RulesBlockBase = {
      newline: /^\n+/,
      code: /^( {4}[^\n]+\n*)+/,
      hr: /^( *[-*_]){3,} *(?:\n+|$)/,
      heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
      lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
      blockquote: /^( *>[^\n]+(\n[^\n]+)*\n*)+/,
      list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
      html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
      paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
      text: /^[^\n]+/,
      bullet: /(?:[*+-]|\d+\.)/,
      item: /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/
    };

    base.item = new ExtendRegexp(base.item, 'gm').setGroup(/bull/g, base.bullet).getRegexp();

    base.list = new ExtendRegexp(base.list)
      .setGroup(/bull/g, base.bullet)
      .setGroup('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
      .setGroup('def', '\\n+(?=' + base.def.source + ')')
      .getRegexp();

    const tag =
      '(?!(?:' +
      'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code' +
      '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo' +
      '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

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

    return (this.rulesBase = base);
  }

  protected static getRulesGfm(): RulesBlockGfm {
    if (this.rulesGfm) {
      return this.rulesGfm;
    }

    const base = this.getRulesBase();

    const gfm: RulesBlockGfm = {
      ...base,
      ...{
        fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
        paragraph: /^/,
        heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
      }
    };

    const group1 = gfm.fences.source.replace('\\1', '\\2');
    const group2 = base.list.source.replace('\\1', '\\3');

    gfm.paragraph = new ExtendRegexp(base.paragraph).setGroup('(?!', `(?!${group1}|${group2}|`).getRegexp();

    return (this.rulesGfm = gfm);
  }

  protected static getRulesTable(): RulesBlockTables {
    if (this.rulesTables) {
      return this.rulesTables;
    }

    return (this.rulesTables = {
      ...this.getRulesGfm(),
      ...{
        nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
        table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
      }
    });
  }

  protected setRules() {
    if (this.options.gfm) {
      if (this.options.tables) {
        this.rules = this.staticThis.getRulesTable();
      } else {
        this.rules = this.staticThis.getRulesGfm();
      }
    } else {
      this.rules = this.staticThis.getRulesBase();
    }

    this.hasRulesGfm = (this.rules as RulesBlockGfm).fences !== undefined;
    this.hasRulesTables = (this.rules as RulesBlockTables).table !== undefined;
  }

  /**
   * Lexing.
   */
  protected getTokens(src: string, top?: boolean, isBlockQuote?: boolean): LexerReturns {
    let nextPart = src;
    let execArr: RegExpExecArray;

    mainLoop: while (nextPart) {
      // newline
      if ((execArr = this.rules.newline.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);

        if (execArr[0].length > 1) {
          this.tokens.push({ type: TokenType.space });
        }
      }

      // code
      if ((execArr = this.rules.code.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        const code = execArr[0].replace(/^ {4}/gm, '');

        this.tokens.push({
          type: TokenType.code,
          text: !this.options.pedantic ? code.replace(/\n+$/, '') : code
        });
        continue;
      }

      // fences code (gfm)
      if (this.hasRulesGfm && (execArr = (this.rules as RulesBlockGfm).fences.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);

        this.tokens.push({
          type: TokenType.code,
          lang: execArr[2],
          text: execArr[3] || ''
        });
        continue;
      }

      // heading
      if ((execArr = this.rules.heading.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        this.tokens.push({
          type: TokenType.heading,
          depth: execArr[1].length,
          text: execArr[2]
        });
        continue;
      }

      // table no leading pipe (gfm)
      if (top && this.hasRulesTables && (execArr = (this.rules as RulesBlockTables).nptable.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);

        const item: Token = {
          type: TokenType.table,
          header: execArr[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
          align: execArr[2].replace(/^ *|\| *$/g, '').split(/ *\| */) as Align[],
          cells: []
        };

        for (let i = 0; i < item.align.length; i++) {
          if (/^ *-+: *$/.test(item.align[i])) {
            item.align[i] = 'right';
          } else if (/^ *:-+: *$/.test(item.align[i])) {
            item.align[i] = 'center';
          } else if (/^ *:-+ *$/.test(item.align[i])) {
            item.align[i] = 'left';
          } else {
            item.align[i] = null;
          }
        }

        const td: string[] = execArr[3].replace(/\n$/, '').split('\n');

        for (let i = 0; i < td.length; i++) {
          item.cells[i] = td[i].split(/ *\| */);
        }

        this.tokens.push(item);
        continue;
      }

      // lheading
      if ((execArr = this.rules.lheading.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);

        this.tokens.push({
          type: TokenType.heading,
          depth: execArr[2] === '=' ? 1 : 2,
          text: execArr[1]
        });
        continue;
      }

      // hr
      if ((execArr = this.rules.hr.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        this.tokens.push({ type: TokenType.hr });
        continue;
      }

      // blockquote
      if ((execArr = this.rules.blockquote.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        this.tokens.push({ type: TokenType.blockquoteStart });
        const str = execArr[0].replace(/^ *> ?/gm, '');

        // Pass `top` to keep the current
        // "toplevel" state. This is exactly
        // how markdown.pl works.
        this.getTokens(str);
        this.tokens.push({ type: TokenType.blockquoteEnd });
        continue;
      }

      // list
      if ((execArr = this.rules.list.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        const bull: string = execArr[2];

        this.tokens.push({ type: TokenType.listStart, ordered: bull.length > 1 });

        // Get each top-level item.
        const str = execArr[0].match(this.rules.item);
        const length = str.length;

        let next = false;
        let space: number;
        let blockBullet: string;
        let loose: boolean;

        for (let i = 0; i < length; i++) {
          let item = str[i];

          // Remove the list item's bullet so it is seen as the next token.
          space = item.length;
          item = item.replace(/^ *([*+-]|\d+\.) +/, '');

          // Outdent whatever the list item contains. Hacky.
          if (item.indexOf('\n ') !== -1) {
            space -= item.length;
            item = !this.options.pedantic
              ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
              : item.replace(/^ {1,4}/gm, '');
          }

          // Determine whether the next list item belongs here.
          // Backpedal if it does not belong in this list.
          if (this.options.smartLists && i !== length - 1) {
            blockBullet = this.staticThis.getRulesBase().bullet.exec(str[i + 1])[0];

            if (bull !== blockBullet && !(bull.length > 1 && blockBullet.length > 1)) {
              nextPart = str.slice(i + 1).join('\n') + nextPart;
              i = length - 1;
            }
          }

          // Determine whether item is loose or not.
          // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
          // for discount behavior.
          loose = next || /\n\n(?!\s*$)/.test(item);

          if (i !== length - 1) {
            next = item.charAt(item.length - 1) === '\n';

            if (!loose) {
              loose = next;
            }
          }

          this.tokens.push({ type: loose ? TokenType.looseItemStart : TokenType.listItemStart });

          // Recurse.
          this.getTokens(item, false, isBlockQuote);
          this.tokens.push({ type: TokenType.listItemEnd });
        }

        this.tokens.push({ type: TokenType.listEnd });
        continue;
      }

      // html
      if ((execArr = this.rules.html.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        const attr = execArr[1];
        const isPre = attr === 'pre' || attr === 'script' || attr === 'style';

        this.tokens.push({
          type: this.options.sanitize ? TokenType.paragraph : TokenType.html,
          pre: !this.options.sanitizer && isPre,
          text: execArr[0]
        });
        continue;
      }

      // def
      if (top && (execArr = this.rules.def.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);

        this.links[execArr[1].toLowerCase()] = {
          href: execArr[2],
          title: execArr[3]
        };
        continue;
      }

      // table (gfm)
      if (top && this.hasRulesTables && (execArr = (this.rules as RulesBlockTables).table.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);

        const item: Token = {
          type: TokenType.table,
          header: execArr[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
          align: execArr[2].replace(/^ *|\| *$/g, '').split(/ *\| */) as Align[],
          cells: []
        };

        for (let i = 0; i < item.align.length; i++) {
          if (/^ *-+: *$/.test(item.align[i])) {
            item.align[i] = 'right';
          } else if (/^ *:-+: *$/.test(item.align[i])) {
            item.align[i] = 'center';
          } else if (/^ *:-+ *$/.test(item.align[i])) {
            item.align[i] = 'left';
          } else {
            item.align[i] = null;
          }
        }

        const td = execArr[3].replace(/(?: *\| *)?\n$/, '').split('\n');

        for (let i = 0; i < td.length; i++) {
          item.cells[i] = td[i].replace(/^ *\| *| *\| *$/g, '').split(/ *\| */);
        }

        this.tokens.push(item);
        continue;
      }

      // simple rules
      if (this.staticThis.simpleRules.length) {
        const simpleRules = this.staticThis.simpleRules;
        for (let i = 0; i < simpleRules.length; i++) {
          if ((execArr = simpleRules[i].exec(nextPart))) {
            nextPart = nextPart.substring(execArr[0].length);
            const type = 'simpleRule' + (i + 1);
            this.tokens.push({ type, execArr });
            continue mainLoop;
          }
        }
      }

      // top-level paragraph
      if (top && (execArr = this.rules.paragraph.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);

        if (execArr[1].slice(-1) === '\n') {
          this.tokens.push({
            type: TokenType.paragraph,
            text: execArr[1].slice(0, -1)
          });
        } else {
          this.tokens.push({
            type: this.tokens.length > 0 ? TokenType.paragraph : TokenType.text,
            text: execArr[1]
          });
        }
        continue;
      }

      // text
      // Top-level should never reach here.
      if ((execArr = this.rules.text.exec(nextPart))) {
        nextPart = nextPart.substring(execArr[0].length);
        this.tokens.push({ type: TokenType.text, text: execArr[0] });
        continue;
      }

      if (nextPart) {
        throw new Error(
          'Infinite loop on byte: ' + nextPart.charCodeAt(0) + `, near text '${nextPart.slice(0, 30)}...'`
        );
      }
    }

    return { tokens: this.tokens, links: this.links };
  }
}
