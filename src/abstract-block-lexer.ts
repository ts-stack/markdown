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
  RulesBlockCallback,
  LexerReturns
} from './interfaces';


export abstract class AbstractBlockLexer
{
  static simpleRules: RulesBlockCallback[] = [];
  protected rules: {newline: RegExp};
  protected options: object;
  protected links: Links = {};
  protected tokens: Token[] = [];
  protected nextPart: string;
  protected ruleCallbacks: RulesBlockCallback[] = [];

  constructor (protected staticThis: typeof AbstractBlockLexer, options?: object)
  {
    this.options = options || Marked.defaults;
    this.init();
  }

  protected init()
  {
    this.setRules();
    this.setRuleCallbacks();
  }

  /**
   * Should set an array of objects with rules for markdown to `this.rules`.
   */
  protected setRules(): void
  {
    this.rules = {newline: /^\n+/};
  }

  /**
   * Should set an array of objects with rules callbacks to `this.ruleCallbacks`.
   */
  protected setRuleCallbacks(): void
  {
    this.ruleCallbacks =
    [
      {
        condition: this.conditionNewline,
        tokenize: this.tokenizeNewline
      }
    ];
  }

  /**
   * Lexing.
   */
  protected getTokens(src: string, top?: boolean, isBlockQuote?: boolean): LexerReturns
  {
    this.nextPart = src;
    const lengthFn = this.ruleCallbacks.length;

    nextPart:
    while(this.nextPart)
    {
      for(let i = 0; i < lengthFn; i++)
      {
        const callbacks = this.ruleCallbacks[i];
        callbacks.regexp = callbacks.regexp || callbacks.condition.call(this, top, isBlockQuote);
        let execArr: RegExpExecArray;

        if( callbacks.regexp && (execArr = callbacks.regexp.exec(this.nextPart)) )
        {
          this.nextPart = this.nextPart.substring(execArr[0].length);
          callbacks.tokenize.call(this, execArr, top, isBlockQuote);
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

  protected conditionNewline(): RegExp
  {
    return this.rules.newline;
  }

  protected tokenizeNewline(execArr: RegExpExecArray): void
  {
    if(execArr[0].length > 1)
    {
      this.tokens.push({type: TokenType.space});
    }
  }
}
