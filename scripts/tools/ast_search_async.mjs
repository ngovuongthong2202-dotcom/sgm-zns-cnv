import ts from 'typescript';
import fs from 'fs';
import path from 'path';

function findBadAsyncInRender(sourceFile) {
    const issues = [];
    
    function isComponentOrHook(node) {
        if (ts.isFunctionDeclaration(node) && node.name) {
            return /^[A-Z]/.test(node.name.text) || node.name.text.startsWith('use');
        }
        if (ts.isVariableDeclaration(node) && ts.isArrowFunction(node.initializer) && node.name) {
            return /^[A-Z]/.test(node.name.text) || node.name.text.startsWith('use');
        }
        return false;
    }

    function isInsideEffectOrCallback(node) {
        let current = node.parent;
        while (current) {
            if (ts.isCallExpression(current)) {
                const text = current.expression.getText();
                if (['useEffect', 'useLayoutEffect', 'useCallback', 'useMemo', 'useSWR'].some(hook => text.includes(hook))) {
                    return true;
                }
            }
            if (ts.isFunctionDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isMethodDeclaration(current)) {
                // If it's a component or hook, then this node is directly inside the body!
                if (isComponentOrHook(current) || (current.parent && ts.isVariableDeclaration(current.parent) && isComponentOrHook(current.parent))) {
                    return false; // Found a component/hook boundary, so our target is directly inside its body!
                }
                // It's a callback/handler (like onClick, anonymous function, Promise resolver)
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    function visit(node) {
        if (ts.isCallExpression(node)) {
            const expText = node.expression.getText();
            if (expText === 'setTimeout' || expText === 'setInterval' || expText.endsWith('.then') || expText === 'fetch') {
                if (!isInsideEffectOrCallback(node)) {
                    issues.push({
                        line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
                        text: node.getText(),
                    });
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return issues;
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);
            const issues = findBadAsyncInRender(sourceFile);
            if (issues.length > 0) {
                console.log(`\n📄 ${fullPath}`);
                issues.forEach(i => console.log(`  L${i.line}: ${i.text.split('\n')[0]}`));
            }
        }
    }
}

processDir('./src');
