import { mergeValidationResults } from "../common.utils";
import type { ArrayType, AtomicType, FunctionDefinition } from "../types";
import type { TypeChecker, ValidationResult } from "../interfaces";
import { ScopeTypeChecker } from "./scope.memory";
import type { WorkspaceOptions } from "./workspace";
import { ParserError } from "../rules/exception";
import { FunctionFactory } from "../parser/function.factory";
import { FunctionCompiler } from "../parser/function.compiler";
import { Logger } from "../logging";

/**
 * FunctionRegistry is responsible for storing and managing function definitions within the working context. 
 * It allows adding, retrieving, and checking for the existence of function definitions. 
 * This registry is used during rule evaluation to resolve function calls and validate their usage 
 * against defined function signatures.
 */
export class FunctionRegistry {

    private functions: Map<string, FunctionDefinition>;

    protected options: Partial<WorkspaceOptions>;

    /**
     * Create a new instance of FunctionRegistry.
     * @param options Optional workspace options to configure the behavior of the function registry.
     */
    constructor(options?: Partial<WorkspaceOptions>) {
        this.functions = new Map<string, FunctionDefinition>();

        this.options = {
            ...options
        };
    }
    /**
     * Set or update the options for the registry.
     * @param options an object containing the options to set or update.
     */
    public setOptions(options: Partial<WorkspaceOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Check if a function with the given name exists in the registry.
     * @param name The name of the function to check.
     * @returns True if the function exists, false otherwise.
     */
    public hasFunction(name: string): boolean {
        return this.functions.has(name);
    }

    /**
     * Retrieve a function definition by its name.
     * @param name The name of the function to retrieve.
     * @returns The function definition if found, undefined otherwise.
     */
    public getFunction(name: string): FunctionDefinition | undefined {
        return this.functions.get(name);
    }

    /**
     * Add a function definition to the registry.
     * @param func The function definition to add.
     * @throws Error if the function name is reserved or already exists in the registry.
     */
    public addFunction(func: FunctionDefinition): void {
        if (FunctionFactory.isReservedName(func.name)) {
            throw new ParserError(`Cannot add function with reserved name: ${func.name}`);
        }
        if (this.functions.has(func.name)) {
            throw new ParserError(`Function with name ${func.name} already exists`);
        }
        this.functions.set(func.name, func);

        if (FunctionCompiler.enabled) {
            // Check for missing function dependencies before attempting to compile the expression, and log a warning if any are found. 
            // This helps to avoid runtime errors when executing the compiled function.
            if (FunctionCompiler.missingFunctions(func.expression)) {
                Logger.warn(`Cannot compile function ${func.name} due to missing dependencies`);
                return;
            }
            const compiled = FunctionCompiler.compileDefinition(func);
            if (compiled) {
                (globalThis as any)[func.name] = compiled;
            }
        }
    }

    /**
     * Add multiple function definitions to the registry.
     * @param funcs The function definitions to add, can be a Map, Record, or array.
     * @throws Error if any function name is reserved or already exists in the registry.
     */
    public addFunctions(funcs: Map<string, FunctionDefinition> | Record<string, FunctionDefinition> | FunctionDefinition[]): void {
        if (funcs instanceof Map) {
            for (const func of funcs.values()) {
                this.addFunction(func);
            }
        } else if (Array.isArray(funcs)) {
            for (const func of funcs) {
                this.addFunction(func);
            }
        } else {
            for (const func of Object.values(funcs)) {
                this.addFunction(func);
            }
        }
    }

    /**
     * Retrieve all function definitions stored in the registry.
     * @returns A record of all function definitions, keyed by their names.
     */
    public getFunctions(): Record<string, FunctionDefinition> {
        const result: Record<string, FunctionDefinition> = {};
        for (const [key, value] of this.functions.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Perform type checking on all function definitions in the registry using the provided type checker.
     * This method iterates through each function definition, checks its types against the type checker, and returns an array of validation results.
     * 
     * N.B. Disabled functions are skipped during type checking, as they are not intended to be used in rule evaluation and may contain incomplete or invalid definitions.
     * 
     * @param checker The type checker to use for validating function definitions.
     * @returns An array of validation results for each function definition.
     */
    public checkTypes(checker: TypeChecker): ValidationResult[] {
        return Array.from(this.functions.values())
            .filter(func => !func.disabled)
            .map(func => this.checkDefinitionTypes(func, checker));
    }

    protected checkDefinitionTypes(definition: FunctionDefinition, checker: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];

        const scopeChecker = new ScopeTypeChecker(checker);

        for (const param of definition.parameters) {
            scopeChecker.setType(param.name, param.type as AtomicType | ArrayType);
        }

        for (const line of definition.lines || []) {
            checks.push(line.checkTypes(scopeChecker));
            const changes = line.typedChanges(checker);
            for (const change of Object.keys(changes)) {
                const newType = changes[change];
                if (newType) {
                    scopeChecker.setType(change, newType);
                }
            }
        }

        checks.push(definition.expression.checkTypes(scopeChecker));

        return mergeValidationResults(...checks);
    }

    /**
     * Clear all function definitions from the registry.
     */
    public clear(): void {
        this.functions.clear();
    }

}