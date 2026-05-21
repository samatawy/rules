---
title: How to Design Rules
---

# How to Design Rules

The following is some advice and best practices to keep in mind when designing rules. 

You can always experiment to find your preferred approach. This is neither compulsory nor the exclusively correct way.

## Start with Constants

Decide what your business or use case needs to know when making decisions.

- Examples include your standard currency, your company brand name, your default tax_rate.

- You can have tiered constants, e.g. for tiered taxation: 
```
TAX_A_RATE = 5

TAX_A_FROM = 10000

TAX_B_RATE = 7.5

TAX_B_FROM = 25000
```

- You can also declare constants as functions that take no arguments (a purely stylistic choice):
```
LOCAL_CURRENCY() = 'USD'

// is the same as:
LOCAL_CURRENCY = 'USD'
```

- You don't need to cover everything in the first session; only what is readily evident. You can always come back and add anything you need.

## Codify Formulae as Functions

Decide how your business combines values into new values. Codify these equations into simple functions. These can be simple or quite complex.
```
net_profit(gross: number, tax: number) = gross - tax
```

- Also use ternary and switch clauses to branch inside a function, even to decide which other function to call:
```
calculate_vat(total: number, currency: string) = currency == LOCAL_CURRENCY ? local_vat(total) : foreign_vat(total, currency)
```

- You don't need to cover everything in the first session; only what is readily evident. You can always come back and add anything you need.

## Declare Data Structures

You will generally know what your inputs look like from your existing code base (e.g. Model classes) and API (e.g. HTTP endpoints).

Declare a root type with a unique key for each of your required classes and each of your uniquely structured data transfer objects.
Choose your names (root keys) carefully since you will wrap your structured inputs into one of these names when you create a context.

- You don't need to cover everything in the first session; only what will get you started. You can always come back and add anything you need.

## Declare Exception Rules

Having declared your input (and maybe some output) types, you can see what values would violate business logic.

- Type validations are already covered by your type declaration.

- For simple validations (such as min/max values and character length), you can always use another package before passing data to the rules engine. If you already have these validations in place you should not duplicate them here. However, you can add any validations with a suitable error message if you will reply on the rules engine to do everything.

- Define rules that are relevant to bsuiness logic, especially those using one of your declared constants:
```
IF Applicant.age < LEGAL_AGE_OF_EMPLOYMENT THROW "Job Applicants must be of legal age to apply"
```

- You don't need to cover everything in the first session; only what is readily apparent. You can always come back and add anything you need.

## Declare State Rules

Your Rules engine will run best if it knows what rules are relevant for each particular case. State variables are ideal for dividing an endless sea of possibilities into a set of manageable states. 

- This will also reduce the likelihood of salience clashes (when more than one rule compete to set different values with the same priority).

- States can represent different pricing policies, customer tiers, support ticket types, etc.
```
SET VIP_CUSTOMER = Invoice.customer.total_sales > 100000

SET EMPLOYEE_CUSTOMER = is(Invoice.customer.employee_id)

IF Invoice.total > 1000 AND VIP_CUSTOMER THEN Invoice.loyalty_discount = 2.5

IF Invoice.total > 200 AND EMPLOYEE_CUSTOMER THEN Invoice.loyalty_discount = 4.5
```

- These states (or flags) are invaluable to make sense of your rules when your space grows into hundreds or thousands of rules.

- You don't need to cover everything in the first session; only what will get you started. You can always come back and add anything you need.

## Declare Conditional Rules

You have seen how to declare conditional rules making use of constants, functions, and states.

You will now find that designing rules will be very straighforward. Literally translate business requirements into cases.

- Optionally name your rules and describe them with annotations to know what was intended by each. This is less important when using markdown files to declare your logic.

- Use salience only when obvious; don't try to guess a salience for each rule. Salience is only required when you have more than one rule setting the same value (e.g. when several rules compete to set the discount on a sold item):

    - If one rule is clearly a default rule you can set at at a low salience. 

    - If one rule is clearly a special case, you can set it at a higher salience.

    - If one rule is a MUST-be-enforced kind of logic, set it at a very high salience.


## Test your Workspace

You must create a workspace for your business domain or use case for testing before you deploy to production.

Preogrammatically you should run checkTypes() on the workspace once loaded and inspect any errors reported.

- Start by hitting it with an expected correct output (the best case):

    - Make sure nothing is failing (e.g. no conflicts).

    - Make sure outputs are as expected for every expected state (varying input values).

    - If necessary, go back and fix incorrect functions, missing salience annotations, etc.

- Then try invalid inputs:

    - See if invalid values report a meaningful exception.

    - If necessary, go back and add missing exception rules or improve the returned messages.

- If you need to fix issues you can temporarily make readers more tolerant (using `partial` instead of `all`) or turn off `strict_syntax`, `strict_inputs`, or `strict_outputs` on the testing workspace until you can find and fix issues.

- You can also selectively disable one or more rules or functions using `@disabled()` annotations (or programmatically). This can help you test while still developing and can help pinpoint a problematic rule or function causing issues.

- After an error you can inspect the context. It will contain an audit trail of all rules invoked, any errors encountered, and even a cache of expressions with their last values.

- For even more in-depth troubleshooting of an issue, set your `WorkLogger.logLevel` to 'warn', then 'info', then 'debug' - each time going through the lines until you find the culprit. Do not start with 'debug' as this can be quite verbose and overhelming.

- Do NOT go into production (especially in a business setting) until all your test payloads work with the highest strictness settings.

## Deploy your workspace

Wire the startup code in your application to read your declarations from your designated folder (or database, etc.) and run a `checkTypes()` on each workspace before announcing readiness. This should be done every time the application starts (or declarations change).

- Make sure all your spaces start up properly before finally deploying to the production server.

- New deployments should best be made to standalone workspaces, each designed for a business domain or use case.

- Simple deployments can use the default workspace created by the engine. Use this only if you do not plan on expanding in the future.

- When an issue is reported, please request the returned context. It will contain all the rules that were invoked in order as well as any exceptions raised.

- Keep `WorkLogger.logLevel` at 'warn' or 'error' in production. Only lower these to troubleshoot issues, and preferably only on a staging server. Logs recorded by the engine can be quite verbose and overwhelming.

Good luck with your Rules engine.