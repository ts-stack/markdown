/**
 * @license
 * 
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Marked } from './marked';
import {
  Token,
  Links,
  TokenType,
  BlockRuleCallback,
  LexerReturns
} from './interfaces';


export abstract class AbstractBlockLexer
{
  protected rules: {newline: RegExp};
  protected options: object;
  protected links: Links = {};
  protected tokens: Token[] = [];
  protected nextPart: string;
  protected ruleCallbacks: BlockRuleCallback[] = [];

  constructor (protected staticThis: typeof AbstractBlockLexer, options?: object)
  {
    this.options = options || Marked.defaults;
    this.init();
  }

  /**
   * Accepts Markdown text and returns object with tokens and links.
   * 
   * @param src String of markdown source to be compiled.
   * @param options Hash of options.
   * 
   * @todo Periodically review whether it is possible
   * to declare this static method abstract in TypeScript.
   */
  static lex(src: string, options?: object, top?: boolean, isBlockQuote?: boolean): LexerReturns
  {
    // *** Uncomment below code in a child class.
    // const lexer = new this(this, options);
    // return lexer.getTokens(src, top, isBlockQuote);
    return;
  }

  protected init()
  {
    this.setRules();
    this.setRuleCallbacks();
  }

  /**
   * Should set an array of rules for markdown to `this.rules`.
   */
  protected abstract setRules(): void;

  /**
   * Should set an array of rules callbacks to `this.ruleCallbacks`.
   */
  protected abstract setRuleCallbacks(): void;

  /**
   * Lexing.
   */
  protected getTokens(src: string, top?: boolean, isBlockQuote?: boolean): LexerReturns
  {
    this.nextPart = src;
    let execArr: RegExpExecArray;
    const lengthFn = this.ruleCallbacks.length;

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

      for(let i = 0; i < lengthFn; i++)
      {
        const callbacks = this.ruleCallbacks[i];
        callbacks.regexp = callbacks.regexp || callbacks.condition.call(this, top, isBlockQuote);
        let execArr: RegExpExecArray;

        if( callbacks.regexp && (execArr = callbacks.regexp.exec(this.nextPart)) )
        {
          this.nextPart = this.nextPart.substring(execArr[0].length);
          callbacks.action.call(this, execArr, top, isBlockQuote);
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
}
