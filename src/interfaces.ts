/**
 * @license
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Renderer } from './renderer';

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
  item?: RegExp,
  _tag?: string,

  /**
   * Normal Block Grammar
   */
  normal?: this,
  /**
   * GFM Block Grammar
   */
  gfm?: BlockGfm,
  /**
   * GFM + Tables Block Grammar
   */
  tables?: any,

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

export interface BlockGfm extends BlockGrammar
{
  
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
  gfm?: InlineGfm,
  /**
   * Pedantic Inline Grammar.
   */
  pedantic?: this,
  /**
   * GFM + Line Breaks Inline Grammar.
   */
  breaks?: object,
}

export interface InlineGfm extends InlineGrammar
{

}

export type MarkedCallback = (...args: any[]) => any;

export class MarkedOptions
{
  highlight: (code: string, lang: string, callback?: MarkedCallback) => string = null;
  renderer: Renderer = new Renderer;
  gfm: boolean = true;
  tables: boolean = true;
  breaks: boolean = true;
  pedantic: boolean = false;
  sanitize: boolean = false;
  sanitizer: any = null;
  smartLists: boolean = true;
  smartypants: boolean = false;
  mangle: boolean = true;
  silent: boolean = false;
  langPrefix: string = 'lang-';
  headerPrefix: string = '';
  xhtml: boolean = false;
}
