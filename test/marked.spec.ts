import { BlockLexer, Marked } from '../';

describe('BlockLexer', () => {
  Marked.setBlockRule(/^1/, () => '11');
  Marked.setBlockRule(/^2/, () => '12');

  it(`should to have in the simpleRules an array with three items`, () => {
    expect(BlockLexer.simpleRules.length).toEqual(2);
  });

  it(`should to have in the simpleRules an array with three items`, () => {
    const result = Marked.parse(`one\n\n1, two\n\n2, three\n\n3`);
    expect(result).toEqual('<p>one</p>\n11<p>, two</p>\n12<p>, three</p>\n<p>3</p>\n');
  });
});
