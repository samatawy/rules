export interface UsesFileSystem {

    /**
     * Provide a node file system module to be used for reading files.
     * This method or the equivalent `loadFileSystem()` must be called before attempting to read files in a Node environment.
     * 
     * @param fs the node fs module to use.
     * @returns the current instance for chaining.
     */
    withFS(fs: typeof import('fs')): this;

    /**
     * Dynamically import the Node.js file system module in a Node environment.
     * This method or the equivalent `withFS()` must be called before attempting to read files in a Node environment. 
     * In a browser environment, this method will log an error since file system access is not supported.
     * 
     * @returns the imported fs module if successful, otherwise undefined.
     */
    loadFileSystem(): Promise<any>;
}