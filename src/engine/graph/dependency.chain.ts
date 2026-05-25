import type { AbstractRule } from "../../rules/abstract.rule";

export interface DependencyChain {

    circular: boolean;

    stack: AbstractRule[];
}