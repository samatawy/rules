import { EngineError } from "../rules/exception";
import { WorkSpace } from "./workspace";

export class RulesEngine {

    protected workspaces: Map<string, WorkSpace>;

    private static _global_registry: RulesEngine;

    private static _common_workspace: WorkSpace;

    /**
     * Get the global registry instance of the RulesEngine. This is a singleton instance that can be used 
     * throughout the application to manage workspaces and rules.
     * 
     * @returns The global RulesEngine instance.
     */
    public static registry(): RulesEngine {
        this._global_registry = this._global_registry || new RulesEngine();
        return this._global_registry;
    }

    /**
     * Get the common workspace instance. This is a singleton workspace that can be used as a shared space 
     * for common rules, constants, types, and functions that can be sufficient for small applications.
     * 
     * @returns The common WorkSpace instance.
     */
    public static commonSpace(): WorkSpace {
        if (!this._common_workspace) {
            const engine = this.registry();
            if (!engine.hasWorkspace("common")) {
                engine.addWorkspace("common", new WorkSpace());
            }
            this._common_workspace = engine.getWorkspace("common")!;
        }
        return this._common_workspace;
    }

    protected constructor() {
        this.workspaces = new Map<string, WorkSpace>();
    }

    /**
     * Check if a workspace with the given name exists in this engine.
     * @param name The name of the workspace.
     * @returns True if the workspace exists, false otherwise.
     */
    public hasWorkspace(name: string): boolean {
        return this.workspaces.has(name);
    }

    /**
     * Check if a workspace with the given name exists in the global registry.
     * 
     * @param name The name of the workspace.
     * @returns True if the workspace exists, false otherwise.
     */
    public static hasWorkspace(name: string): boolean {
        return this.registry().hasWorkspace(name);
    }

    /**
     * Get a workspace by name from this engine.
     * 
     * @param name The name of the workspace to retrieve.
     * @returns The WorkSpace instance associated with the given name, or undefined if not found.
     */
    public getWorkspace(name: string): WorkSpace | undefined {
        return this.workspaces.get(name);
    }

    /**
     * Get a workspace by name from the global registry.
     * 
     * @param name The name of the workspace to retrieve.
     * @returns The WorkSpace instance associated with the given name, or undefined if not found.
     */
    public static getWorkspace(name: string): WorkSpace | undefined {
        return this.registry().getWorkspace(name);
    }

    /**
     * Add a workspace to this engine with the given name. If a workspace with the same name already exists, an error will be thrown.
     * 
     * N.B. To reuse a name, get the workspace instance using getWorkspace() and call clear() to reset it.
     * 
     * @param name The name of the workspace.
     * @param workspace The WorkSpace instance to add.
     * @throws EngineError if a workspace with the same name already exists.
     */
    public addWorkspace(name: string, workspace: WorkSpace): void {
        if (this.workspaces.has(name)) {
            throw new EngineError(`Workspace with name "${name}" already exists.`);
        }
        this.workspaces.set(name, workspace);
    }

    /**
     * Add a workspace to the global registry with the given name. If a workspace with the same name already exists, an error will be thrown.
     * 
     * N.B. To reuse a name, get the workspace instance using getWorkspace() and call clear() to reset it.
     * 
     * @param name The name of the workspace.
     * @param workspace The WorkSpace instance to add.
     * @throws EngineError if a workspace with the same name already exists.
     */
    public static addWorkspace(name: string, workspace: WorkSpace): void {
        if (this.registry().hasWorkspace(name)) {
            throw new EngineError(`Workspace with name "${name}" already exists in the global registry.`);
        }
        this.registry().addWorkspace(name, workspace);
    }

    /**
     * Create a clone of the original WorkSpace instance, including all rules, constants, types, and functions.
     * This is useful for creating isolated copies of the workspace for testing, experimentation, or parallel processing 
     * without affecting the original workspace.
     * You can safely mutate a cloned workspace without affecting the source, since no references are shared.
     * 
     * N.B. To clone a Workspace without adding it to a registry, you can simply call the clone() method on the Workspace instance itself, 
     * which will return a deep clone of the workspace.
     * 
     * @param source the WorkSpace instance or name of the workspace to clone.
     * @param name name for the cloned workspace. The cloned workspace will be added to the engine's workspace map with this name.
     * @returns a new WorkSpace instance that is a deep clone of the original workspace.
     * @throws EngineError if the source workspace is not found in the engine's workspace map 
     * or if a workspace with the new name already exists in the engine's workspace map.
     */
    public cloneWorkspace(source: WorkSpace | string, target_name: string): WorkSpace {
        if (this.hasWorkspace(target_name)) {
            throw new EngineError(`Workspace with name "${target_name}" already exists.`);
        }

        const original = typeof source === "string" ? this.getWorkspace(source) : source;

        if (!original) {
            throw new EngineError(`Workspace not found: ${source}`);
        }

        // We can use the clone method of the WorkSpace class, which is designed to create a deep clone of the workspace, 
        // including all its components (rules, constants, types, functions).
        const cloned = original.clone();
        this.addWorkspace(target_name, cloned);
        return cloned;
    }

    /**
     * Clone a workspace by name from the global registry and add it to the global registry with a new name.
     * 
     * @param source the workspace instance or name of the workspace to clone.
     * @param name the name for the cloned workspace in the global registry.
     * @returns a new WorkSpace instance that is a deep clone of the original workspace, added to the global registry with the new name.
     * @throws EngineError if the source workspace is not found in the global registry 
     * or if a workspace with the new name already exists in the global registry.
     */
    public static cloneWorkspace(source: WorkSpace | string, name: string): WorkSpace {
        return this.registry().cloneWorkspace(source, name);
    }

}