// In your project you should import from 'marked-ts'.
import { BlockLexer, RulesBlockBase } from '../';


interface MyRulesBlock extends RulesBlockBase
{
  myRule: RegExp
}

export class MyBlockLexer extends BlockLexer
{
  protected rules: MyRulesBlock;

  protected init()
  {
    super.init();
    this.setMyRule();
  }

  protected setMyRule()
  {
    // The original array is static, and therefore it is necessary to merge it, not just edit.
    this.rules =
    {
      ...this.rules,
      ...{ myRule: /^some (regexp|here)/ }
    };

    /**
     * The condition should to return `void` or `RegExp` object.
     */
    const condition = () => this.rules.myRule;

    /**
     * If we have string `some here and other` then `execArr[0]` includes `some here`
     * and `execArr[1]` includes `here`.
     */
    const tokenize = (execArr: RegExpExecArray) =>
    {
      this.tokens.push({type: 'my-type-token', text: execArr[0]})
    }

    /**
     * Here you need to know in which place of the array you will insert your callbacks.
     * See `BlockLexer.prototype.ruleCallbacks()` for more information.
     * 
     * Now its inserts with index number 2.
     */
    this.ruleCallbacks.splice(2, 0, { condition, tokenize });
  }
}
