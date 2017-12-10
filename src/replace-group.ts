/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * marked-ts - a markdown parser
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import {  } from './interfaces';


export class ReplaceGroup
{
  source: string;
  flags: string;

  constructor(regex: RegExp, flags: string = '')
  {
    this.source = regex.source;
    this.flags = flags;
  }

  /**
   * Extends regular expressions.
   * 
   * @param groupName Regular expretion for search a group name.
   * @param groupRegexp Regular expretion of named group.
   */
  setGroup(groupName: RegExp | string, groupRegexp: RegExp | string): this
  {
    let str = typeof groupRegexp == 'string' ? groupRegexp : groupRegexp.source;

    // Remove all occurrences of `^` character.
    str = str.replace(/(^|[^\[])\^/g, '$1');

    // Extends regexp.
    this.source = this.source.replace(groupName, str);
    return this;
  }

  getRegexp(): RegExp
  {
    return new RegExp(this.source, this.flags);
  }
}
