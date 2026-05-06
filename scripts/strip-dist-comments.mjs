import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const distDir = path.resolve('dist');
const supportedExtensions = ['.js', '.cjs'];
const printer = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
});

function getScriptKind(filePath) {
    if (filePath.endsWith('.cjs') || filePath.endsWith('.js')) {
        return ts.ScriptKind.JS;
    }
    return ts.ScriptKind.Unknown;
}

function stripComments(sourceText, filePath, scriptKind) {
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
    return printer.printFile(sourceFile);
}

async function collectFiles(dirPath) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectFiles(entryPath));
            continue;
        }

        if (supportedExtensions.some(ext => entry.name.endsWith(ext))) {
            files.push(entryPath);
        }
    }

    return files;
}

async function main() {
    const distStats = await stat(distDir).catch(() => null);
    if (!distStats?.isDirectory()) {
        return;
    }

    const files = await collectFiles(distDir);

    await Promise.all(files.map(async (filePath) => {
        const scriptKind = getScriptKind(filePath);
        const sourceText = await readFile(filePath, 'utf8');
        const stripped = stripComments(sourceText, filePath, scriptKind);
        await writeFile(filePath, stripped, 'utf8');
    }));
}

main().catch((error) => {
    console.error('Failed to strip comments from dist artifacts.', error);
    process.exitCode = 1;
});