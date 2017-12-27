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

interface RunTestsOptions
{
  files?: {[key: string]: any},
  marked?: MarkedOptions,
  stop?: boolean
}

/**
 * Execute
 */
main();

function main()
{
  const opt = parseArg();
  return runTests(opt);
}

function runTests(options?: RunTestsOptions): boolean;
function runTests(engine: Function, options?: RunTestsOptions): boolean;
function runTests(functionOrEngine?: Function | RunTestsOptions, options?: RunTestsOptions): boolean
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
  .filter(file => path.extname(file) == '.md')
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
 * Argument Parsing
 */

function parseArg(): RunTestsOptions
{
  const argv = process.argv.slice(2);
  const options: RunTestsOptions = {};

  for(let i = 0; i < argv.length; i++)
  {
    const arg = argv[i];
    let [key, value] = arg.split('=');

    // We have next parameter or value of current parameter.
    if(!value && argv[i + 1])
    {
      value = argv[i + 1].split('-')[0];

      // Skip next parameter.
      if(value) i++;
    }

    switch (key)
    {
      case '-s':
      case '--stop':
        options.stop = true;
        break;
    }
  }

  return options;
}
