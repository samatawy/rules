import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { RulesFileReader } from '../src/reader/rules.file.reader';
import { ConstantsFileReader } from '../src/reader/constants.file.reader';
import { TypesFileReader } from '../src/reader/types.file.reader';
import { FunctionsFileReader } from '../src/reader/functions.file.reader';
import { GeneralFileReader } from '../src/reader/general.file.reader';
import { MarkdownFileReader } from '../src/reader/markdown.file.reader';
import { WorkspaceFilesReader } from '../src/reader/workspace.files.reader';
import { RulesEngine } from '../src';

describe('Readers Tests', () => {

  it('read from rules file', async () => {
    const parser = new RulesFileReader({ read_by: 'line', accept: 'partial' });
    const content = `
      if x > 10 then result = 10 + 5 / 2
      if a == 5 then result = (10 + 5) / 2
      if x > 10 then nested.value = 10 + 5 / 2 else nested.value = (10 + 5) / 2

      // comments and empty lines should be ignored
      // set pi = 3.14159
      // The following is invalid
      if invalid syntax
    `;
    const result = parser.parse(content);
    // console.debug('Rules file parsing result:', result);
    expect(result.read).toBe(4);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.rules.length).toBe(3);
    expect(result.errors.length).toBe(1);

    const strictParser = new RulesFileReader({ read_by: 'line', accept: 'all' });
    const strictResult = strictParser.parse(content);
    // console.debug('Strict rules file parsing result:', strictResult);
    expect(strictResult.read).toBe(4);
    expect(strictResult.passed).toBe(0);
    expect(strictResult.failed).toBe(4);
    expect(strictResult.rules.length).toBe(0);
    expect(strictResult.errors.length).toBe(1);

    const blockParser = new RulesFileReader({ accept: 'partial', read_by: 'block' });
    const blockContent = `
      if x > 10 then result = 10 + 5 / 2
      
      // This is a comment and should be ignored
      if a == 5 then result = (10 + 5) / 2
      
      @name(Split over lines)
      if x > 10 
      then nested.value = 10 + 5 / 2 else nested.value = (10 + 5) / 2
      
      @name(Invalid Rule)
      if invalid syntax
    `;

    const blockResult = blockParser.parse(blockContent);
    expect(blockResult.read).toBe(4);
    expect(blockResult.passed).toBe(3);
    expect(blockResult.failed).toBe(1);
    expect(blockResult.rules.length).toBe(3);
    expect(blockResult.errors.length).toBe(1);

    const space = new Workspace();
    blockResult.rules.forEach(rule => space.addRule(rule));
    const r1 = space.getRule('Split over lines');
    expect(r1).toBeDefined();
    expect(r1!.name).toBe('Split over lines');
    const r2 = space.getRule('Valid Rule');
    expect(r2).toBeUndefined();

    expect(space.checkTypes().valid).toBe(true);
  });


  it('read from constants file', async () => {
    const parser = new ConstantsFileReader({ accept: 'partial' });
    const content = `
      CONST YEAR=365
      AVOGADRO = 6.022e23
      CONST PI= 3.14159
      INVALID SYNTAX
    `;
    const result = parser.parse(content);
    // console.debug('Constants file parsing result:', result);
    expect(result.read).toBe(4);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.constants.YEAR).toBe('365');
    expect(result.constants.AVOGADRO).toBe('6.022e23');
    expect(result.constants.PI).toBe('3.14159');
    expect(result.errors.length).toBe(1);

    const strictResult = new ConstantsFileReader({ accept: 'all' }).parse(content);
    // console.debug('Strict constants file parsing result:', strictResult);
    expect(strictResult.read).toBe(4);
    expect(strictResult.passed).toBe(0);
    expect(strictResult.failed).toBe(4);
    expect(Object.keys(strictResult.constants).length).toBe(0);
    expect(strictResult.errors.length).toBe(1);

    const space = new Workspace();
    space.addConstants(result.constants);
    expect(space.getConstant('YEAR')).toBe('365');
    expect(space.getConstant('AVOGADRO')).toBe('6.022e23');
    expect(space.getConstant('PI')).toBe('3.14159');
  });


  it('read from functions file', async () => {
    const parser = new FunctionsFileReader({ accept: 'partial' });
    const content = `
      triple(n: number) = n * 3
      // all_even(numbers: number[]) = numbers * 3

      join_spaced(s1: string, s2: string) { 
        // return concat(s1, concat(" - () * ", s2))
        return concat(s1, " ", s2)
      }

      round_double(n: number){ 
      d = n * 2;
      d = floor(d);
      return d }

      sales_tax(total: number) {
        tax_rate = (total < 100)? 0.12 : 0.14;
        tax = total * tax_rate;
        return max(1, tax)
      }
      
      invalid syntax
    `;
    const result = parser.parse(content);
    // console.debug('Functions file parsing result:', result);
    expect(result.read).toBe(5);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);

    const strictResult = new FunctionsFileReader({ accept: 'all' }).parse(content);
    // console.debug('Strict functions file parsing result:', strictResult);
    expect(strictResult.read).toBe(5);
    expect(strictResult.passed).toBe(0);
    expect(strictResult.failed).toBe(5);
    expect(Object.keys(strictResult.functions).length).toBe(0);
    expect(strictResult.errors.length).toBe(1);

    const space = new Workspace({});
    space.functionRegistry().addFunctions(result.functions);
    space.addRule('SET tripled = triple(n)');
    space.addRule('SET greeting = join_spaced("Hello", name)');
    space.addRule('SET rounded = round_double(fp)');
    space.addRule('SET tax = sales_tax(invoice.total)');

    // console.debug(space.checkTypes());
    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({ n: 4, fp: 3.2, name: 'world!', invoice: { total: 50 } });

    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    // console.debug('Function evaluation output:', output);
    expect(output.tripled).toBe(12);
    expect(output.greeting).toBe('Hello world!');
    expect(output.rounded).toBe(6);
    expect(output.tax).toBe(6);
    expect(output.tax_rate).toBeUndefined();

    // console.debug('Logged rules during processing:', ctx.getLog().map(logged => ({ rule: logged.rule.toString(), effect: logged.effect })));
  });


  it('read from types file', async () => {
    const parser = new TypesFileReader({ accept: 'partial' });
    const content = `
      {
      "key": "Person",
      "properties": {
        "name": "string",
        "age": "number"
      }
    }
    `;
    const result = parser.parse(content);
    // console.debug('Types file parsing result:', result);
    expect(result.read).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(Object.keys(result.types).length).toBe(1);
    expect(result.types['Person']!.key).toBe('Person');
    expect(result.types['Person']!.properties!.name).toBe('string');
    expect(result.types['Person']!.properties!.age).toBe('number');
    expect(result.errors.length).toBe(0);
  });


  it('read from general file with mixed content', async () => {
    const reader = new GeneralFileReader({ accept: 'partial' });
    const content = `
      // This is a comment
      CONST PI = 3.14159

      triple(n: number) = n * 3

      if x > 10 then result = triple(x) //if x >= 10 then result = x * 3

      { key: "Person",
        properties: {
          name: 'string',
          age: 'number',    // in years 
        }
      }

      invalid syntax here
    `;
    const result = reader.parse(content);
    // console.debug('General file parsing result:', result);
    expect(result.read).toBe(5);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.constants.PI).toBe('3.14159');
    expect(result.functions.triple).toBeDefined();
    expect(result.types.Person).toBeDefined();
    expect(result.rules.length).toBe(1);
    expect(result.errors.length).toBe(1);
  });


  it('read from markdown files with mixed content in code blocks', async () => {
    const reader = new MarkdownFileReader({ accept: 'partial' });
    const content = `
      # This is a markdown file

      Some text here.

      \`\`\`
      CONST PI = 3.14159

      triple(n: number) = n * 3

      if x > 10 then result = triple(x)

      { key: "Person",
        properties: {
          name: 'string',
          age: 'number',    // in years 
        }
      }

      invalid syntax here
      \`\`\`

      - More text here.
    `;
    const result = reader.parse(content);
    // console.debug('Markdown file parsing result:', result);
    expect(result.read).toBe(5);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.constants.PI).toBe('3.14159');
    expect(result.functions.triple).toBeDefined();
    expect(result.types.Person).toBeDefined();
    expect(result.rules.length).toBe(1);
    expect(result.errors.length).toBe(1);
  });

  it('reads ordered file contents', async () => {
    const reader = new GeneralFileReader({ accept: 'all' });
    const content = `
      // This is a comment
      CONST PI = 3.14159

      circle_area(radius: number) = PI * radius * radius

      { key: "circle",
        properties: {
          radius: 'number',
        }
      }

      if circle.radius then circle.area = circle_area(circle.radius)

      invalid syntax here
    `;
    const result = reader.parse(content);
    // console.debug('Markdown file parsing result:', result);
    expect(result.read).toBe(5);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.constants.PI).toBe('3.14159');
    expect(result.types.circle).toBeDefined();
    expect(result.rules.length).toBe(1);
    expect(result.errors.length).toBe(1);
  });

  it('reads declarations out of order', async () => {
    const space = new Workspace({ strict_inputs: false });
    const reader = new WorkspaceFilesReader(space, 'partial');
    // const reader = new GeneralFileReader({ workspace: space, accept: 'all' });
    const content = `
      if circle.radius > 0 then circle.area = circle_area(circle.radius)

      circle_area(radius: number) = PI * radius * radius

      // This is a comment
      CONST PI = 3.14159

      { key: "circle",
        properties: {
          radius: 'number',
        }
      }

      invalid syntax here
    `;
    const result = reader.parse(content);
    // console.debug('Markdown file parsing result:', result);
    expect(result.read).toBe(5);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.constants.PI).toBe('3.14159');
    expect(result.types.circle).toBeDefined();
    expect(result.rules.length).toBe(1);
    expect(result.errors.length).toBe(1);
  });

  it('reads from file system', async () => {
    const reader = new WorkspaceFilesReader(RulesEngine.defaultSpace());
    await reader.loadFileSystem();
    const __dirname = import.meta.dirname;

    const result = reader.readFromFile(`${__dirname}/plain.geometry.txt`);
    expect(result).toBe(true);
  });

});
