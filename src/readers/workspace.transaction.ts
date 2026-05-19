import { EngineError } from "../rules/exception";
import type { Workspace } from "../engine/workspace";

export class WorkspaceTransaction {

    private original: Workspace;

    private backup?: Workspace;

    /**
     * Begin a mutation transaction on a Workspace.
     * 
     * @param source the Workspace to mutate.
     * @returns a WorkspaceTransaction instance with commit() and rollback() methods.
     * @throws an EngineError if any error was encountered.
     */
    public static begin(source: Workspace): WorkspaceTransaction {
        return new WorkspaceTransaction(source);
    }

    protected constructor(source: Workspace) {
        this.original = source;
        this.backup = source.clone();
    }

    /**
     * Keep changes to the target Workspace.
     * Calling this is currently not required.
     */
    public commit(): void {
        this.backup = undefined;
    }

    /**
     * Rollback the target Workspace to before any changes were made.
     * @throws an EngineError if any error was encountered.
     */
    public rollback(): void {
        if (this.backup) {
            this.original.clearSpace();
            this.original.import(this.backup);
            this.backup = undefined;
        } else {
            throw new EngineError('Transaction already completed');
        }
    }
}