/**
 * @license
 *
 * marked tests
 * Copyright (c) 2011-2013, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 *
 * @ts-stack/markdown tests
 * Copyright (c) 2018-2021, Третяк Костя. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */

import * as fs from 'fs';
import * as path from 'path';
import { Links, Marked, MarkedOptions, Replacements, Token } from '@ts-stack/markdown';

interface RunTestsOptions extends MarkedOptions {
  stop?: boolean;
}

const testDir = path.normalize(__dirname + '../../test/expect-actual');

runTests();

function runTests(): void {
  const files = load();
  const filenames = Object.keys(files);
  const lenFiles = filenames.length;
  const cliOptions = parseArg();
  let failed = 0;
  let complete = 0;

  mainFor: for (let indexFile = 0; indexFile < lenFiles; indexFile++) {
    const options: RunTestsOptions = { ...cliOptions, ...Marked.options };
    const filename = filenames[indexFile];
    const file: { text: string; html: string } = files[filename];
    const resolvedPath = path.resolve(testDir, filename);
    const relativePath = path.relative(process.cwd(), resolvedPath);
    let expectedRows: string[], actualRows: string[], tokens: Token[], links: Links, result: string;

    // Getting options from filename.
    const flags = filename.split('.').slice(1);
    if (flags.length) {
      flags.forEach((key) => {
        let val = true;

        if (key.indexOf('no') === 0) {
          key = key.substring(2);
          val = false;
        }

        if (Marked.options.hasOwnProperty(key)) {
          (options as any)[key] = val;
        }
      });
    }

    try {
      // Getting expected rows.
      expectedRows = file.html.split('\n');

      // Getting actual rows and tokens with links.
      ({ result, tokens, links } = Marked.debug(file.text, options));
      actualRows = result.split('\n');
    } catch (e) {
      console.log('%s failed.', filename);
      throw e;
    }

    const lenRows = Math.max(expectedRows.length, actualRows.length);

    for (let indexRow = 0; indexRow < lenRows; indexRow++) {
      let expectedRow = expectedRows[indexRow];
      let actualRow = actualRows[indexRow];
      // 1 to compare missing and empty lines.
      const lenStr = Math.max(expectedRow.length, actualRow.length, 1);

      for (let indexChar = 0; indexChar < lenStr; indexChar++) {
        if (expectedRow !== undefined && actualRow !== undefined && expectedRow[indexChar] === actualRow[indexChar]) {
          continue;
        }

        failed++;
        fs.writeFileSync(`${testDir}/${filename}-actual.html`, result, 'utf8');

        if (expectedRow !== undefined) {
          expectedRow = expectedRow.substring(
            Math.max(indexChar - 30, 0),
            Math.min(indexChar + 30, expectedRow.length)
          );
        }

        if (actualRow !== undefined) {
          actualRow = actualRow.substring(Math.max(indexChar - 30, 0), Math.min(indexChar + 30, actualRow.length));
        }

        expectedRow = escapeAndShow(expectedRow);
        actualRow = escapeAndShow(actualRow);
        const erroredLine = indexRow + 1;
        const indexFrom = findIndexFrom(tokens, erroredLine);
        const indexTo = findIndexTo(tokens, erroredLine, lenRows);

        console.log(`\n#${indexFile + 1}. failed ${filename}.md`);
        console.log(
          `\nExpected:\n~~~~~~~~> in ${relativePath}.html:${erroredLine}:${indexChar + 1}\n\n'${expectedRow}'\n`
        );
        console.log(
          `\nActual:\n--------> in ${relativePath}-actual.html:${erroredLine}:${indexChar + 1}\n\n'${actualRow}'\n`
        );
        console.log(
          `\nExcerpt tokens:`,
          tokens.filter((token, index) => index >= indexFrom && index <= indexTo)
        );
        console.log(`links:`, links);

        if (options.stop) {
          break mainFor;
        }

        continue mainFor;
      }
    }

    complete++;
    console.log(`#${indexFile + 1}. ${filename}.md completed.`);
    const fileCompleted = `${relativePath}-actual.html`;

    if (fs.existsSync(fileCompleted)) {
      fs.unlinkSync(fileCompleted);
    }
  }

  console.log('%d/%d tests completed successfully.', complete, lenFiles);

  if (failed) {
    console.log('%d/%d tests failed.', failed, lenFiles);
    // console.log(`tokens:`, tokens);
  }
}

/**
 * Searches for a maximum line number preceding an error line number,
 * and returns its index from an array of tokens.
 *
 * Here, "line number" refers to a line number of a resulting HTML file.
 */
function findIndexFrom(tokens: Token[], erroredLine: number) {
  let indexFrom = 0;

  tokens.reduce((acc, token, index) => {
    if (token.line < erroredLine) {
      const nextMax = Math.max(acc, token.line);
      if (acc !== nextMax) {
        indexFrom = index;
      }
      return nextMax;
    } else {
      return acc;
    }
  }, 0);

  return indexFrom;
}

/**
 * Searches for a minimum line number that goes after an error line number,
 * and returns its index from an array of tokens.
 *
 * Here, "line number" refers to a line number of a resulting HTML file.
 */
function findIndexTo(tokens: Token[], erroredLine: number, lenRows: number) {
  let indexTo = tokens.length - 1;

  tokens.reduce((acc, token, index) => {
    if (token.line > erroredLine) {
      const nextMin = Math.min(acc, token.line);
      if (nextMin !== acc) {
        indexTo = index;
      }
      return nextMin;
    } else {
      return acc;
    }
  }, lenRows);

  return indexTo;
}

function escapeAndShow(str: string) {
  if (str === '') {
    return '\\n';
  } else if (str === undefined) {
    return `[missing '\\n' here]`;
  }

  const replacements: Replacements = {
    '\r': '\\r',
    '\t': '\\t',
    '\f': '\\f',
    '\v': '\\v',
  };

  return str.replace(/[\r\t\f\v]/g, (ch: string) => replacements[ch]);
}

/**
 * Load Tests.
 */
function load() {
  const files: { [key: string]: any } = {};

  const list = fs
    .readdirSync(testDir)
    .filter((file) => path.extname(file) == '.md')
    .sort((fileName1, fileName2) => {
      const a = path.basename(fileName1).toLowerCase().charCodeAt(0);
      const b = path.basename(fileName2).toLowerCase().charCodeAt(0);
      return a > b ? 1 : a < b ? -1 : 0;
    });

  for (let i = 0; i < list.length; i++) {
    const file = path.join(testDir, list[i]);
    const ext = path.extname(file);
    const fineName = path.basename(file).replace(ext, '');

    files[fineName] = {
      text: fs.readFileSync(file, 'utf8'),
      html: fs.readFileSync(file.replace(/[^.]+$/, 'html'), 'utf8'),
    };
  }

  return files;
}

/**
 * Argument Parsing
 */
function parseArg(): RunTestsOptions {
  const argv = process.argv.slice(2);
  const options: RunTestsOptions = {} as any;

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
      case '-s':
      case '--stop':
        options.stop = true;
        break;
    }
  }

  return options;
}
