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
import { Marked, MarkedOptions, BlockLexer, InlineLexer, Obj } from '../';

interface runTestsOptions
{
  files?: {[key: string]: any},
  marked?: MarkedOptions,
  once?: boolean,
  stop?: boolean,
  bench?: boolean,
  extended?: boolean,
  times?: number,
  length?: number
}

let files: Obj;

/**
 * Execute
 */
main();

function main()
{
  const opt = parseArg();

  if(opt.bench)
  {
    return runBench(opt);
  }

  if(opt.once)
  {
    return once(opt);
  }

  return runTests(opt);
}

function runTests(options: runTestsOptions): boolean;
function runTests(engine: Function, options: runTestsOptions): boolean;
function runTests(functionOrEngine: Function | runTestsOptions, options?: runTestsOptions): boolean
{
  if(typeof functionOrEngine != 'function')
  {
    options = functionOrEngine;
    functionOrEngine = null;
  }

  const engine: Function = functionOrEngine || Marked.parse.bind(Marked);
  options = options || {};
  const files = options.files || load();
  const filenames = Object.keys(files)
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

  const len = filenames.length;

  mainFor:
  for(let i = 0; i < len; i++)
  {
    filename = filenames[i];
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
      Marked.defaults = {...original};

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
  if(~failures.indexOf('def_blocks.md'))
  {
    failed -= 1;
  }

  return !failed;
}

/**
 * Load Tests
 */

function load()
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
 * Benchmark a function
 */

/**
 * @param lengthStr Length in kilobytes. Default 300 KB.
 */
function initBench(lengthStr: number = 300, times: number = 1): string
{
  lengthStr = lengthStr * 1024;

  files = files || load();

  let
  keys = Object.keys(files)
  ,i
  ,countFiles = keys.length
  ,filename
  ,file
  ,accumulatedMarkdown = ''
  ;

  while(lengthStr > accumulatedMarkdown.length)
  for(i = 0; (i < countFiles) && (lengthStr > accumulatedMarkdown.length); i++)
  {
    filename = keys[i];
    file = files[filename];
    accumulatedMarkdown += '\n\n' + file.text;
  }

  const lenAcumulatedFile = Math.round(accumulatedMarkdown.length / 1024);
  console.log('*'.repeat(40));
  console.log(`Benchmark run ${times} times for one file ${lenAcumulatedFile} KB \nwith accumulated Markdown tests:`);
  console.log('-'.repeat(40));
  return accumulatedMarkdown;
}

/**
 * @param name Name of engine.
 * @param func Function to be used for testing.
 */
function bench(name: string, accumulatedMarkdown: string, func: Function, times: number = 1): void
{
  const start = Date.now();

  while(times--)
  {
    func(accumulatedMarkdown);
  }

  console.log('%s%s%d ms.', name, ' '.repeat(21 - name.length), Date.now() - start);
  console.log('-'.repeat(40));
}

/**
 * Benchmark all engines
 */

function runBench(options: runTestsOptions)
{
  options = options || {};
  const times = options.times;
  const length = options.length;
  const accumulatedMarkdown = initBench(length, times);

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

  bench('marked-ts', accumulatedMarkdown, Marked.parse.bind(Marked), times);

  if(options.extended)
  {
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

    bench('marked-ts (gfm)', accumulatedMarkdown, Marked.parse.bind(Marked), times);

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

    bench('marked-ts (pedantic)', accumulatedMarkdown, Marked.parse.bind(Marked), times);
  }

  const marked = require('../lib');

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

  bench('marked', accumulatedMarkdown, marked, times);

  if(options.extended)
  {
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

    bench('marked (gfm)', accumulatedMarkdown, marked, times);

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

    bench('marked (pedantic)', accumulatedMarkdown, marked, times);
  }

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
        breaks: false,
      }
    );

    const render = md.render.bind(md);

    bench('remarkable', accumulatedMarkdown, render, times);
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

    bench('markdown-it', accumulatedMarkdown, render, times);
  }
  catch(e)
  {
    console.log(`Could not bench 'markdown-it'. (Error: ${e.message})`);
  }

  // showdown
  try
  {
    const Showdown = require('showdown');
    const converter = new Showdown.Converter();
    const render = converter.makeHtml.bind(converter);
    bench('showdown', accumulatedMarkdown, render, times);
  }
  catch(e)
  {
    console.log(`Could not bench 'showdown'. (Error: ${e.message})`);
  }

  // markdown
  try
  {
    bench('markdown', accumulatedMarkdown, require('markdown').parse, times);
  }
  catch(e)
  {
    console.log(`Could not bench 'markdown'. (Error: ${e.message})`);
  }
}

/**
 * A simple one-time benchmark
 */

function once(options?: runTestsOptions)
{
  if(options.marked)
  {
    Marked.setOptions(options.marked);
  }

  const times = options.times;
  const length = options.length;

  const accumulatedMarkdown = initBench(length, times);

  bench('marked', accumulatedMarkdown, Marked.parse.bind(Marked), times);
}

/**
 * Argument Parsing
 */

function parseArg(): runTestsOptions
{
  const argv = process.argv.slice(2);
  const options: runTestsOptions = {};

  for(let i = 0; i < argv.length; i++)
  {
    const arg = argv[i];
    let [key, value] = arg.split('=');

    // We have next parameter or value of current parameter.
    if(!value && argv[i + 1])
    {
      value = argv[i + 1].split('-')[0];

      if(value) i++;
    }

    switch (key)
    {
      case '-b':
      case '--bench':
        options.bench = true;
        break;
      case '-l':
      case '--length':
        options.length = +value;
        break;
      case '-s':
      case '--stop':
        options.stop = true;
        break;
      case '--once':
        options.once = true;
        break;
      case '-t':
      case '--times':
        options.times = +value;
        break;
      case '-e':
      case '--ext':
        options.extended = true;
        break;
    }
  }

  return options;
}
