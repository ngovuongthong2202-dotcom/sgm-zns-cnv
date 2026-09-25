import ts from 'typescript';
import fs from 'fs';
import path from 'path';

function findStateUpdatesInRender(sourceFile) {
    const issues = [];
    let reactComponentNames = new Set();
    
    // Simple heuristic: PascalCase functions are likely components
    function isComponent(node) {
        if (ts.isFunctionDeclaration(node) && node.name) {
            return /^[A-Z]/.test(node.name.text);
        }
        if (ts.isVariableDeclaration(node) && ts.isArrowFunction(node.initializer) && node.name) {
            return /^[A-Z]/.test(node.name.text);
        }
        return false;
    }

    function isInsideEffectOrCallback(node) {
        let current = node.parent;
        while (current) {
            if (ts.isCallExpression(current)) {
                const text = current.expression.getText();
                if (['useEffect', 'useLayoutEffect', 'useCallback', 'setTimeout', 'setInterval', 'Promise', 'then', 'catch', 'finally'].some(hook => text.includes(hook))) {
                    return true;
                }
            }
            if (ts.isFunctionDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
                // If it's a component, then this node is directly inside the component body, not in a callback!
                if (isComponent(current) || (current.parent && ts.isVariableDeclaration(current.parent) && isComponent(current.parent))) {
                    return false;
                }
                // It's a callback/handler of some sort
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    function visit(node) {
        if (ts.isCallExpression(node)) {
            const tempText = node.expression.getText();
            if (/^set[A-Z]/.test(tempText)) {
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
            const issues = findStateUpdatesInRender(sourceFile);
            if (issues.length > 0) {
                console.log(`\n📄 ${fullPath}`);
                issues.forEach(i => console.log(`  L${i.line}: ${i.text}`));
            }
        }
    }
}

processDir('./src');
