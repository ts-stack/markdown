/**
 * @license
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Renderer } from './renderer';
import { escape, unescape } from './helpers';

export type Obj = {[key: string]: any};

export interface BlockGrammar
{
  newline?: RegExp,
  code?: RegExp,
  fences?: RegExp,
  hr?: RegExp,
  heading?: RegExp,
  nptable?: RegExp,
  lheading?: RegExp,
  blockquote?: RegExp,
  list?: RegExp,
  html?: RegExp,
  def?: RegExp,
  table?: RegExp,
  paragraph?: RegExp,
  text?: RegExp,
  bullet?: RegExp,
  /**
   * List item (<li>).
   */
  item?: RegExp,
  _tag?: string,

  /**
   * Normal Block Grammar
   */
  normal?: this,
  /**
   * GFM Block Grammar
   */
  gfm?: this,
  /**
   * GFM + Tables Block Grammar
   */
  tables?: this,
}

export interface Link
{
  href: string,
  title: string
}

export interface Links
{
  [key: string]: Link
}

export type TokenType =
'space'
| 'code'
| 'heading'
| 'table'
| 'hr'
| 'blockquote_start'
| 'blockquote_end'
| 'list_start'
| 'list_end'
| 'loose_item_start'
| 'loose_item_end'
| 'list_item_start'
| 'list_item_end'
| 'paragraph'
| 'html'
| 'text'
;

export type Align = 'center' | 'left' | 'right';

export interface ParamsToken
{
  type?: TokenType;
  text?: string;
  lang?: string;
  depth?: number;
  header?: string[];
  align?: Align[];
  cells?: string[][];
  ordered?: boolean;
  pre?: boolean;
  escaped?: boolean;
}

export interface InlineGrammar
{
  escape?: RegExp,
  autolink?: RegExp,
  url?: any,
  tag?: RegExp,
  link?: RegExp,
  reflink?: RegExp,
  nolink?: RegExp,
  strong?: RegExp,
  em?: RegExp,
  code?: RegExp,
  br?: RegExp,
  del?: any,
  text?: RegExp,
  _inside?: RegExp,
  _href?: RegExp,
  /**
   * Normal Inline Grammar
   */
  normal?: this,
  /**
   * GFM Inline Grammar
   */
  gfm?: this,
  /**
   * Pedantic Inline Grammar.
   */
  pedantic?: this,
  /**
   * GFM + Line Breaks Inline Grammar.
   */
  breaks?: this,
}

export type ParseCallback<T=string> = (err: Error, output?: string) => T;

export interface HighlightOverloading
{
  fn(code: string, lang?: string): string;
  fn<T>(code: string, lang?: string, callback?: ParseCallback<T>): T;
}

export type HighlightType = HighlightOverloading['fn'];

export class MarkedOptions
{
  gfm?: boolean = true;
  tables?: boolean = true;
  breaks?: boolean = false;
  pedantic?: boolean = false;
  sanitize?: boolean = false;
  sanitizer?: (text: string) => string;
  mangle?: boolean = true;
  smartLists?: boolean = false;
  silent?: boolean = false;
  /**
   * @param code The section of code to pass to the highlighter.
   * @param lang The programming language specified in the code block.
   * @param callback The callback function to call when using an async highlighter.
   */
  highlight?: HighlightType;
  langPrefix?: string = 'lang-';
  smartypants?: boolean = false;
  headerPrefix?: string = '';
  /**
   * An object containing functions to render tokens to HTML. Default: `new Renderer()`
   */
  renderer?: Renderer;
  /**
   * Self-close the tags for void elements (&lt;br/&gt;, &lt;img/&gt;, etc.)
   * with a "/" as required by XHTML.
   */
  xhtml?: boolean = false;
  /**
   * The function that will be using to escape HTML entities.
   * By default using inner helper.
   */
  escape?: (html: string, encode?: boolean) => string = escape;
  /**
   * The function that will be using to unescape HTML entities.
   * By default using inner helper.
   */
  unescape?: (html: string) => string = unescape;
}

export interface LexerReturns
{
  tokens: ParamsToken[],
  links: Links
}

export interface Replacements
{
  [key: string]: string;
}
