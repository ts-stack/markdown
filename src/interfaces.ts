/**
 * marked-ts - a markdown parser
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import { Renderer } from './renderer';
import { noop } from './helpers';

export interface BlockLevelGrammar
{
  newline: RegExp,
  code: RegExp,
  fences: () => void,
  hr: RegExp,
  heading: RegExp,
  nptable: () => void,
  lheading: RegExp,
  blockquote: RegExp,
  list: RegExp,
  html: RegExp,
  def: RegExp,
  table: () => void,
  paragraph: RegExp,
  text: RegExp,
  bullet: RegExp,
  item: RegExp,
  _tag: string,
  gfm: Gfm,

  /**
   * GFM + Tables Block Grammar
   */
  tables: any,

  /**
   * Normal Block Grammar
   */
  normal: any,
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

  normal?: object,
  pedantic?: object,
  gfm?: Gfm,
  breaks?: object,
}

export interface Gfm extends InlineGrammar
{
  paragraph?: RegExp,
  fences?: RegExp
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
