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

interface RunBenchOptions
{
  first?: boolean,
  stop?: boolean,
  bench?: boolean,
  extended?: boolean,
  times?: number,
  length?: number
}

const widthTable = 90;

/**
 * Execute
 */
main();

function main()
{
  const opt = parseArg();  
  return runBench(opt);
}

/**
 * @param benchStrLen Length in kilobytes. Default 300 KB.
 */
function initBench(benchStrLen: number = 300, times: number = 1): string
{
  benchStrLen = benchStrLen * 1024;
  const files = load();
  let countFiles = files.length;
  let accumulatedMarkdown = '';

  while(benchStrLen > accumulatedMarkdown.length)
  for(let i = 0; (i < countFiles) && (benchStrLen > accumulatedMarkdown.length); i++)
  {
    accumulatedMarkdown += '\n\n' + files[i];
  }

  const lenAcumulatedFile = Math.round(accumulatedMarkdown.length / 1024);
  console.log('~'.repeat(widthTable));
  console.log(`Benchmark run ${times} times for one file ${lenAcumulatedFile} KB with accumulated Markdown tests:`);
  console.log('='.repeat(widthTable));

  const marginFromName = ' '.repeat(7);
  console.log(`Lib ${marginFromName} | Load lib, ms | Init lib, ms | Bench work, ms | Total, ms | Memory usage, KB`);

  console.log('='.repeat(widthTable));
  return accumulatedMarkdown;
}

/**
 * @param name Name of engine.
 * @param func Function to be used for testing.
 */
function bench
(
  name: string,
  accumulatedMarkdown: string,
  func: Function,
  times: number = 1,
  loadTime: number = 0,
  initTime: number = 0,
): void
{
  // Forcing Garbage Collection (for memory usage purpose).
  global.gc();
  const startBench = Date.now();

  while(times--)
  {
    func(accumulatedMarkdown);
  }

  const heapUsed = Math.round(process.memoryUsage().heapUsed / 1024);
  const benchTime = Date.now() - startBench;
  const total =  loadTime + initTime + benchTime;
  const marginFromName = ' '.repeat(11 - name.length);
  const marginFromLoad = ' '.repeat(12 - loadTime.toString().length);
  const marginFromInit = ' '.repeat(12 - initTime.toString().length);
  const marginFromBench = ' '.repeat(14 - benchTime.toString().length);
  const marginFromTotal = ' '.repeat(9 - total.toString().length);

  const output = name + marginFromName + ' | ' + (loadTime || '-') + marginFromLoad + ' | '
  + initTime + marginFromInit + ' | ' + benchTime + marginFromBench + ' | ' + total + marginFromTotal + ' | ' + heapUsed;

  console.log(output);
  console.log('-'.repeat(widthTable));
}

/**
 * Benchmark all engines
 */

function runBench(options: RunBenchOptions)
{
  interface Lib
  {
    name: string,
    parserName: string,
    static: boolean,
    className?: string
  }

  let libs: Lib[] =
  [
    {name: 'marked-ts', className: 'Marked', parserName: 'parse', static: true},
    {name: 'marked', parserName: 'parse', static: true},
    {name: 'remarkable', parserName: 'render', static: false},
    {name: 'markdown-it', parserName: 'render', static: false},
    {name: 'showdown', className: 'Converter', parserName: 'makeHtml', static: false},
    {name: 'markdown', parserName: 'parse', static: true},
  ];

  options = options || {};
  const times = options.times;
  const length = options.length;
  const accumulatedMarkdown = initBench(length, times);
  libs = options.first ? [libs[0]] : libs;

  libs.forEach(lib =>
  {
    let loadFrom: string = lib.name;

    if(lib.name == 'marked-ts')
    {
      loadFrom = '../';
    }

    try
    {
      const startLoadTime = Date.now();
      const ParserClass = lib.className ? require(loadFrom)[lib.className] : require(loadFrom);
      const loadTime = Date.now() - startLoadTime;

      const startInit = Date.now();
      const parserClass = lib.static ? ParserClass : new ParserClass;
      const parse = parserClass[lib.parserName].bind(parserClass);
      parse('1');
      const initTime = Date.now() - startInit;

      bench(lib.name, accumulatedMarkdown, parse, times, loadTime, initTime);
    }
    catch(e)
    {
      console.log(`Could not bench '${lib.name}'. (Error: ${e.message})`);
    }
  });
}

function parseArg(): RunBenchOptions
{
  const argv = process.argv.slice(2);
  const options: RunBenchOptions = {};

  for(let i = 0; i < argv.length; i++)
  {
    let [key, value] = argv[i].split('=');

    // In `argv` we have next parameter or value of current parameter.
    if(!value && argv[i + 1])
    {
      value = argv[i + 1].split('-')[0];

      // Skip next parameter.
      if(value) i++;
    }

    switch (key)
    {
      case '-l':
      case '--length':
        options.length = +value;
        break;
      case '-f':
      case '--first':
        options.first = true;
        break;
      case '-t':
      case '--times':
        options.times = +value;
        break;
    }
  }

  return options;
}

function load(): string[]
{
  const dir = path.normalize(__dirname + '/../test/tests');
  const files: string[] = [];

  const list = fs
  .readdirSync(dir)
  .filter(file => path.extname(file) == '.md');

  list.forEach(path =>
  {
    files.push(fs.readFileSync(dir + '/' + path, 'utf8'));
  })

  return files;
}
