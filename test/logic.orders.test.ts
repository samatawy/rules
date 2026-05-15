import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { FunctionParser, RuleParser } from '../src';

describe('Logic Orders tests', () => {

    it('handles functions passed to functions', async () => {
        const space = new Workspace({});
        space.typeRegistry().addRootType({
            key: 'Person',
            properties: {
                name: 'string',
                age: 'number',
                children: 'string[]',
                ages: 'number[]',
                family: {
                    type: 'array',
                    items: {
                        name: 'string',
                        age: 'number',
                    }
                }
            }
        });

        const funcParser = new FunctionParser({ workspace: space });
        const ageFunc = funcParser.parse('adult(age: number) = age >= 21');
        if (ageFunc) space.functionRegistry().addFunction(ageFunc);

        const personAgeFunc = funcParser.parse('personChecked(person: { age: "number" }) { person.adult = adult(person.age); return person }');
        if (personAgeFunc) space.functionRegistry().addFunction(personAgeFunc);

        space.addRule('IF count(Person.family) > 1 THEN Person.family = map(Person.family, member: personChecked(member))');
        const checkFirst = space.getRules()[0]!.checkTypes(space.typeChecker());
        expect(checkFirst?.errors).toBeUndefined();
        // console.debug(checkFirst);

        let ctx = space.loadContext({
            Person: {
                name: 'Alice', age: 30,
                family: [{
                    'name': 'Bob', age: 22
                }, {
                    name: 'Charlie', age: 18
                }]
            }
        });
        expect(space.applicableRules(ctx).length).toBe(1);
        const ok = space.process(ctx);
        expect(ok).toBe(true);
        const output = ctx.getOutput();
        // console.debug('Output with arrays:', output);
        expect(output.Person.family[0].adult).toBe(true);
        expect(output.Person.family[1].adult).toBe(false);

        const invalidRule = new RuleParser({ workspace: space })
            .parse(`IF count(Person.family) > 0 
                THEN Person.ages = map(Person, member: member.age >= 21)
            `);

        const checked = invalidRule?.checkTypes(space.typeChecker());
        expect(checked?.errors?.length).toBeGreaterThan(0);
        // console.debug(checked);

        const invoiceTaxable = funcParser.parse('invoiceTaxable(invoice: { total: "number" }) = invoice.total > 100');
        if (invoiceTaxable) space.functionRegistry().addFunction(invoiceTaxable);

        // const invoiceShippable = funcParser.parse('invoiceShippable(invoice: { total: "number" }) = invoice.total > 100');
        const invoiceShippable = funcParser.parse('invoiceShippable(invoice: { address: "string" }) = invoice.total > 100');
        if (invoiceShippable) space.functionRegistry().addFunction(invoiceShippable);

        const badTaxableRule = new RuleParser({ workspace: space })
            .parse('IF invoiceTaxable(Person) THEN Person.taxable = true');
        if (badTaxableRule) space.addRule(badTaxableRule);
        console.debug(badTaxableRule?.checkTypes(space.typeChecker()));

        const badShippableRule = new RuleParser({ workspace: space })
            .parse('IF invoiceShippable(invoice) THEN invoice.shippable = true');
        if (badShippableRule) space.addRule(badShippableRule);
        console.debug(badShippableRule?.checkTypes(space.typeChecker()));

        ctx = space.loadContext({
            Person: {
                name: 'Sam',
                family: []
            },
            invoice: {
                total: 120
            }
        });
        space.process(ctx);
        console.debug(ctx);
    });

});