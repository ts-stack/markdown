/**
 * @license
 * 
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import {  } from './interfaces';


export class ExtendRegexp
{
  source: string;
  flags: string;

  constructor(regex: RegExp, flags: string = '')
  {
    this.source = regex.source;
    this.flags = flags;
  }

  /**
   * Extends regular expression.
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

  /**
   * Returns a result of extending a regular expression.
   */
  getRegexp(): RegExp
  {
    return new RegExp(this.source, this.flags);
  }
}
