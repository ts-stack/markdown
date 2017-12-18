/**
 * @license
 * 
 * marked tests
 * Copyright (c) 2011-2013, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 * 
 * marked-ts tests
 * Copyright (c) 2018, Третяк Костя. (MIT Licensed)
 * https://github.com/KostyaTretyak/marked-ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Marked, MarkedOptions, BlockLexer, InlineLexer } from '../';

let files: Obj;

/**
 * Execute
 */
if(!module.parent)
{
  process.title = 'marked-ts';
  process.exit(main() ? 0 : 1);
}

export function main()
{
  const opt = parseArg();

  if(opt.bench)
  {
    return runBench(opt);
  }

  if(opt.time)
  {
    return time(opt);
  }

  return runTests(opt);
}

export function runTests(options: runTestsOptions): boolean;
export function runTests(engine: Function, options: runTestsOptions): boolean;
export function runTests(engine: Function | runTestsOptions, options?: runTestsOptions): boolean
{
  if(typeof engine != 'function')
  {
    options = engine;
    engine = null;
  }

  engine = (engine || Marked.parse.bind(Marked)) as Function;
  options = options || {};
  const files = options.files || load();
  const keys = Object.keys(files)
  ,failures = [];

  let original: MarkedOptions
  ,filename
  ,failed = 0
  ,complete = 0
  ,file
  ,flags
  ,text
  ,html;

  if(options.marked)
  {
    Marked.setOptions(options.marked);
  }

  const len = keys.length;

  mainFor:
  for(let i = 0; i < len; i++)
  {
    filename = keys[i];
    file = files[filename];

    if(original)
    {
      Marked.defaults = original;
      original = null;
    }

    flags = filename.split('.').slice(1, -1);

    if(flags.length)
    {
      original = Marked.defaults;
      Marked.defaults = {...Marked.defaults};

      flags.forEach( key =>
      {
        let val = true;

        if(key.indexOf('no') === 0)
        {
          key = key.substring(2);
          val = false;
        }

        if(Marked.defaults.hasOwnProperty(key))
        {
          (<any>Marked.defaults)[key] = val;
        }
      });
    }

    try
    {
      text = engine(file.text).replace(/\s/g, '');
      html = file.html.replace(/\s/g, '');
    }
    catch(e)
    {
      console.log('%s failed.', filename);
      throw e;
    }

    let length = html.length;

    for(let j = 0; j < length; j++)
    {
      if(text[j] !== html[j])
      {
        failed++;
        failures.push(filename);

        text = text.substring
        (
          Math.max(j - 30, 0),
          Math.min(j + 30, text.length)
        );

        html = html.substring
        (
          Math.max(j - 30, 0),
          Math.min(j + 30, html.length)
        );

        console.log
        (
          '\n#%d. %s failed at offset %d. Near: "%s".\n'
          ,i + 1
          ,filename
          ,j
          ,text
        );

        console.log('\nGot:\n%s\n', text.trim() || text);
        console.log('\nExpected:\n%s\n', html.trim() || html);

        if(options.stop)
        {
          break mainFor;
        }

        continue mainFor;
      }
    }

    complete++;
    console.log('#%d. %s completed.', i + 1, filename);
  }

  console.log('%d/%d tests completed successfully.', complete, len);

  if(failed)
    console.log('%d/%d tests failed.', failed, len);

  // Tests currently failing.
  if(~failures.indexOf('def_blocks.text'))
  {
    failed -= 1;
  }

  return !failed;
}

/**
 * Load Tests
 */

export type Obj = {[key: string]: any};

export function load()
{
  const dir = __dirname + '/../test/tests';
  let files: {[key: string]: any} = {};

  const list = fs
  .readdirSync(dir)
  .filter(file => path.extname(file) !== '.html')
  .sort((fileName1, fileName2) =>
  {
    const a = path.basename(fileName1).toLowerCase().charCodeAt(0);
    const b = path.basename(fileName2).toLowerCase().charCodeAt(0);
    return a > b ? 1 : (a < b ? -1 : 0);
  });

  const length = list.length;

  for(let i = 0; i < length; i++)
  {
    const file = path.join(dir, list[i]);

    files[path.basename(file)] =
    {
      text: fs.readFileSync(file, 'utf8'),
      html: fs.readFileSync(file.replace(/[^.]+$/, 'html'), 'utf8')
    };
  }

  return files;
}

/**
 * Test Runner
 */

export interface runTestsOptions
{
  files?: {[key: string]: any},
  marked?: MarkedOptions,
  stop?: boolean,
}

/**
 * Benchmark a function
 */

export function bench(name: string, func: Function)
{
  files = files || load();

  var start = Date.now()
    ,times = 1000
    ,keys = Object.keys(files)
    ,i
    ,l = keys.length
    ,filename
    ,file;

  while(times--)
  {
    for(i = 0; i < l; i++)
    {
      filename = keys[i];
      file = files[filename];
      func(file.text);
    }
  }

  console.log('%s completed in %d ms.', name, Date.now() - start);
}

/**
 * Benchmark all engines
 */

export function runBench(options: runTestsOptions)
{
  options = options || {};

  // Non-GFM, Non-pedantic
  Marked.setOptions
  ({
    gfm: false,
    tables: false,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: false
  });

  if(options.marked)
  {
    Marked.setOptions(options.marked);
  }

  bench('marked-ts', Marked.parse.bind(Marked));

  // GFM
  Marked.setOptions
  ({
    gfm: true,
    tables: false,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: false
  });

  if(options.marked)
  {
    Marked.setOptions(options.marked);
  }

  bench('marked-ts (gfm)', Marked.parse.bind(Marked));

  // Pedantic
  Marked.setOptions
  ({
    gfm: false,
    tables: false,
    breaks: false,
    pedantic: true,
    sanitize: false,
    smartLists: false
  });

  if(options.marked)
  {
    Marked.setOptions(options.marked);
  }

  bench('marked-ts (pedantic)', Marked.parse.bind(Marked));

  const marked = require('marked');

  // Non-GFM, Non-pedantic
  marked.setOptions
  ({
    gfm: false,
    tables: false,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: false
  });

  if(options.marked)
  {
    marked.setOptions(options.marked);
  }

  bench('marked', marked);

  // GFM
  marked.setOptions
  ({
    gfm: true,
    tables: false,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: false
  });

  if(options.marked)
  {
    marked.setOptions(options.marked);
  }

  bench('marked (gfm)', marked);

  // Pedantic
  marked.setOptions
  ({
    gfm: false,
    tables: false,
    breaks: false,
    pedantic: true,
    sanitize: false,
    smartLists: false
  });

  if(options.marked)
  {
    marked.setOptions(options.marked);
  }

  bench('marked (pedantic)', marked);

  // remarkable
  try
  {
    const Remarkable = require('remarkable');

    const md = new Remarkable
    (
      'full',
      {
        html: true,
        linkify: true,
        typographer: false,
      }
    );

    const render = md.render.bind(md);

    bench('remarkable', render);
  }
  catch(e)
  {
    console.log(`Could not bench 'remarkable'. (Error: ${e.message})`);
  }

  // markdown-it
  try
  {
    const MarkdownIt = require('markdown-it');
    const md = new MarkdownIt
    ({
      html: true,
      linkify: true,
      typographer: false,
    });
    const render = md.render.bind(md);

    bench('markdown-it', render);
  }
  catch(e)
  {
    console.log(`Could not bench 'markdown-it'. (Error: ${e.message})`);
  }

  // markdown
  try
  {
    bench('markdown', require('markdown').parse);
  }
  catch(e)
  {
    console.log(`Could not bench 'markdown'. (Error: ${e.message})`);
  }

  // showdown
  try
  {
    const Showdown = require('showdown');
    const converter = new Showdown.Converter();
    const render = converter.makeHtml.bind(converter);
    bench('showdown', render);
  }
  catch(e)
  {
    console.log(`Could not bench 'showdown'. (Error: ${e.message})`);
  }
}

/**
 * A simple one-time benchmark
 */

function time(options: runTestsOptions = {})
{
  if(options.marked)
  {
    Marked.setOptions(options.marked);
  }

  bench('marked', Marked.parse.bind(Marked));
}

/**
 * Argument Parsing
 */

function parseArg(argv?: Obj): Obj
{
  argv = process.argv.slice(2);
  let options: Obj = {}
  ,orphans = []
  ,arg;

  while (argv.length)
  {
    arg = getarg();
    switch (arg)
    {
      case '-b':
      case '--bench':
        options.bench = true;
        break;
      case '-s':
      case '--stop':
        options.stop = true;
        break;
      case '-t':
      case '--time':
        options.time = true;
        break;
      default:
        if(arg.indexOf('--') === 0)
        {
          const opt = camelize(arg.replace(/^--(no-)?/, ''));

          if(!Marked.defaults.hasOwnProperty(opt))
          {
            continue;
          }

          options.marked = options.marked || {};

          if(arg.indexOf('--no-') === 0)
          {
            options.marked[opt] = typeof (<any>Marked.defaults)[opt] !== 'boolean'
              ? null
              : false;
          }
          else
          {
            options.marked[opt] = typeof (<any>Marked.defaults)[opt] !== 'boolean'
              ? argv.shift()
              : true;
          }
        }
        else
        {
          orphans.push(arg);
        }
        break;
    }
  }

  return options;

  function getarg()
  {
    let arg = argv.shift();

    if(arg.indexOf('--') === 0)
    {
      // e.g. --opt
      arg = arg.split('=');

      if(arg.length > 1)
      {
        // e.g. --opt=val
        argv.unshift(arg.slice(1).join('='));
      }

      arg = arg[0];
    }
    else if(arg[0] === '-')
    {
      if(arg.length > 2)
      {
        // e.g. -abc
        argv = arg.substring(1).split('').map( (ch: string) =>
        {
          return '-' + ch;
        }).concat(argv);

        arg = argv.shift();
      }
      else
      {
        // e.g. -a
      }
    }
    else
    {
      // e.g. foo
    }

    return arg;
  }
}

/**
 * Helpers
 */

function camelize(text: string)
{
  return text.replace(/(\w)-(\w)/g, function(_, a, b)
  {
    return a + b.toUpperCase();
  });
}
