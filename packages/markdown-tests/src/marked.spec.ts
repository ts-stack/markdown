import { BlockLexer, Marked } from '@ts-stack/markdown';

describe('BlockLexer', () => {
  Marked.setBlockRule(/^1/, () => '11');
  Marked.setBlockRule(/^2/, () => '12');

  it('should to have in the simpleRules an array with three items', () => {
    expect(BlockLexer.simpleRules.length).toEqual(2);
  });

  it('should to have in the simpleRules an array with three items', () => {
    const result = Marked.parse('one\n\n1, two\n\n2, three\n\n3');
    expect(result).toEqual('<p>one</p>\n11<p>, two</p>\n12<p>, three</p>\n<p>3</p>\n');
  });

  it('Marked.parse should merge options', () => {
    const md = '<script></script>I am using __markdown__.';
    expect(() => Marked.parse(md, { sanitize: true })).not.toThrow();
    expect(Marked.parse(md, { sanitize: false })).toBe('<p><script></script>I am using <strong>markdown</strong>.</p>\n');
    expect(Marked.parse(md, { sanitize: true })).toBe('<p>&lt;script&gt;&lt;/script&gt;I am using <strong>markdown</strong>.</p>\n');
    expect(Marked.options.sanitize).toBe(false);
  });
});
