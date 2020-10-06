/**
 * @license
 *
 * marked tests
 * Copyright (c) 2011-2013, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 *
 * @ts-stack/markdown tests
 * Copyright (c) 2018, Третяк Костя. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */

import * as fs from 'fs';
import * as path from 'path';

interface RunBenchOptions {
  single?: number;
  times?: number;
  length?: number;
}

const widthTable = 100;

runBench();

/**
 * @param benchStrLen Length in kilobytes. Default 300 KB.
 */
function initBench(benchStrLen: number = 300, times: number = 1): string {
  benchStrLen = benchStrLen * 1024;
  const files = load();
  const countFiles = files.length;
  let accumulatedMarkdown = '';

  while (benchStrLen > accumulatedMarkdown.length) {
    for (let i = 0; i < countFiles && benchStrLen > accumulatedMarkdown.length; i++) {
      accumulatedMarkdown += '\n\n' + files[i];
    }
  }

  const lenAcumulatedFile = Math.round(accumulatedMarkdown.length / 1024);
  console.log('~'.repeat(widthTable));
  console.log(`Benchmark run ${times} times for one file ${lenAcumulatedFile} KB with accumulated Markdown tests:`);
  console.log('='.repeat(widthTable));

  const marginFromName = ' '.repeat(16);
  console.log(`Lib ${marginFromName} | Lib load, ms | Lib init, ms | Bench work, ms | Total, ms | Memory usage, KB`);

  console.log('='.repeat(widthTable));
  return accumulatedMarkdown;
}

/**
 * @param name Name of engine.
 * @param parseAndCompile Function to be used for testing.
 */
function bench(
  name: string,
  accumulatedMarkdown: string,
  parseAndCompile: (...args: any[]) => any,
  times: number = 1,
  loadTime: number = 0,
  initTime: number = 0
): void {
  // Forcing Garbage Collection (for memory usage purpose).
  global.gc();
  const startBench = Date.now();

  while (times--) {
    parseAndCompile(accumulatedMarkdown);
  }

  const heapUsed = Math.round(process.memoryUsage().heapUsed / 1024);
  const benchTime = Date.now() - startBench;
  const total = loadTime + initTime + benchTime;
  const marginFromName = ' '.repeat(20 - name.length);
  const marginFromLoad = ' '.repeat(12 - loadTime.toString().length);
  const marginFromInit = ' '.repeat(12 - initTime.toString().length);
  const marginFromBench = ' '.repeat(14 - benchTime.toString().length);
  const marginFromTotal = ' '.repeat(9 - total.toString().length);

  const output =
    name +
    marginFromName +
    ' | ' +
    (loadTime || '-') +
    marginFromLoad +
    ' | ' +
    initTime +
    marginFromInit +
    ' | ' +
    benchTime +
    marginFromBench +
    ' | ' +
    total +
    marginFromTotal +
    ' | ' +
    heapUsed;

  console.log(output);
  console.log('-'.repeat(widthTable));
}

/**
 * Benchmark all engines
 */
function runBench() {
  let options: RunBenchOptions = parseArg();

  interface Lib {
    name: string;
    parserClass?: string;
    compilerClass?: string;
    parserAndCompilerMethod?: string;
    parserMethod?: string;
    compilerMethod?: string;
    isParserStatic?: boolean;
  }

  let libs: Lib[] = [
    { name: '@ts-stack/markdown', parserClass: 'Marked', parserAndCompilerMethod: 'parse', isParserStatic: true },
    { name: 'marked', parserAndCompilerMethod: 'parse', isParserStatic: true },
    { name: 'markdown', parserAndCompilerMethod: 'parse', isParserStatic: true },
    { name: 'remarkable', parserClass: 'Remarkable', parserAndCompilerMethod: 'render' },
    {
      name: 'commonmark',
      parserClass: 'Parser',
      parserMethod: 'parse',
      compilerClass: 'HtmlRenderer',
      compilerMethod: 'render'
    },
    { name: 'markdown-it', parserAndCompilerMethod: 'render' },
    { name: 'showdown', parserClass: 'Converter', parserAndCompilerMethod: 'makeHtml' }
  ];

  options = options || {};
  const times = options.times;
  const length = options.length;
  const accumulatedMarkdown = initBench(length, times);
  if (options.single !== -1) {
    if (!libs[options.single]) {
      return console.warn(`libraries with this index ${options.single} do not exist.\n`);
    }

    libs = [libs[options.single]];
  }

  libs.forEach(lib => {
    let loadFrom: string = lib.name;

    if (lib.name == '@ts-stack/markdown') {
      loadFrom = '../';
    }

    try {
      const startLoadTime = Date.now();
      const fullLib = require(loadFrom);
      const loadTime = Date.now() - startLoadTime;

      const ParserClass = lib.parserClass ? fullLib[lib.parserClass] : fullLib;
      const CompilerClass = lib.compilerClass ? fullLib[lib.compilerClass] : null;
      const parserInstance = lib.isParserStatic ? ParserClass : new ParserClass();
      const compilerInstance = CompilerClass ? new CompilerClass() : null;
      let parseAndCompile: (md: string) => string;

      if (lib.parserAndCompilerMethod) {
        parseAndCompile = parserInstance[lib.parserAndCompilerMethod].bind(parserInstance);
      } else {
        const parse = parserInstance[lib.parserMethod].bind(parserInstance);
        const compile = compilerInstance[lib.compilerMethod].bind(compilerInstance);
        parseAndCompile = function(md: string): string {
          return compile(parse(md));
        };
      }

      const startInit = Date.now();
      parseAndCompile('1');
      const initTime = Date.now() - startInit;

      bench(lib.name, accumulatedMarkdown, parseAndCompile, times, loadTime, initTime);
    } catch (e) {
      console.log(`Could not bench '${lib.name}'.`);
      console.log(e.stack);
    }
  });
}

function parseArg(): RunBenchOptions {
  const argv = process.argv.slice(2);
  const options: RunBenchOptions = { single: -1 };

  for (let i = 0; i < argv.length; i++) {
    let [key, value] = argv[i].split('=');

    // In `argv` we have next parameter or value of current parameter.
    if (!value && argv[i + 1]) {
      value = argv[i + 1].split('-')[0];

      // Skip next parameter.
      if (value) {
        i++;
      }
    }

    switch (key) {
      case '-l':
      case '--length':
        options.length = +value;
        break;
      case '-s':
      case '--single':
        options.single = +value || 0;
        break;
      case '-t':
      case '--times':
        options.times = +value;
        break;
    }
  }

  return options;
}

function load(): string[] {
  const dir = path.normalize(__dirname + '/../test/tests');
  const files: string[] = [];

  const list = fs.readdirSync(dir).filter(file => path.extname(file) == '.md');

  list.forEach(path => {
    files.push(fs.readFileSync(dir + '/' + path, 'utf8'));
  });

  return files;
}
