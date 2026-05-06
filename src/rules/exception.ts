/**
 * Abstract class for all custom exceptions reported by the rules engine.
 */
export abstract class AbstractException {

    public message: string;

    public context?: any;

    constructor(message: string, context?: any) {
        this.message = message;
        this.context = context;
    }

}

/**
 * An error raised intentionally by a rule as part of its execution.
 */
export class RuleException extends AbstractException {

    constructor(message: string, context?: any) {
        super(message, context);
    }

}

/**
 * An error that occurs during the validation of a rule, which may indicate a problem with the rule definition 
 * or with the data being validated.
 */
export class TypeException extends AbstractException {

    constructor(message: string, context?: any) {
        super(message, context);
    }

}

/**
 * An error that occurs during the execution of the rules engine, which may indicate a problem with the engine itself 
 * or with the rule definitions.
 */
export class EngineException extends AbstractException {

    constructor(message: string, context?: any) {
        super(message, context);
    }

}

export class EngineError extends Error {
    public context?: any;

    constructor(message: string, context?: any) {
        super(message);
        this.context = context;
    }

}

export class ParserError extends Error {
    public context?: any;

    constructor(message: string, context?: any) {
        super(message);
        this.context = context;
    }
}