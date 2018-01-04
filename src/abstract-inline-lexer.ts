/**
 * @license
 * 
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

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
  RulesInlineCallback
} from './interfaces';


/**
 * Inline Lexer & Compiler.
 */
export abstract class AbstractInlineLexer
{
  protected out = '';
  protected nextPart = '';
  protected rules: object;
  protected renderer: object;
  protected ruleFunctions: RulesInlineCallback[];

  constructor
  (
    protected staticThis: typeof AbstractInlineLexer,
    protected links: Links,
    protected options: MarkedOptions = Marked.defaults,
    renderer?: Renderer
  )
  {
    this.renderer = renderer || this.options.renderer || new Renderer(this.options);

    if(!this.links)
      throw new Error(`InlineLexer requires 'links' parameter.`);

    this.init();
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
          callbacks.tokenize.call(this, execArr);
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
}
