/*
 * @license
 *
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 *
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */

export class ExtendRegexp {
  private source: string;
  private flags: string;

  constructor(regex: RegExp, flags: string = '') {
    this.source = regex.source;
    this.flags = flags;
  }

  /**
   * Extend regular expression.
   *
   * @param groupName Regular expression for search a group name.
   * @param groupRegexp Regular expression of named group.
   */
  setGroup(groupName: RegExp | string, groupRegexp: RegExp | string): this {
    let newRegexp: string = typeof groupRegexp == 'string' ? groupRegexp : groupRegexp.source;
    newRegexp = newRegexp.replace(/(^|[^\[])\^/g, '$1');

    // Extend regexp.
    this.source = this.source.replace(groupName, newRegexp);
    return this;
  }

  /**
   * Returns a result of extending a regular expression.
   */
  getRegexp(): RegExp {
    return new RegExp(this.source, this.flags);
  }
}
