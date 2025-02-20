import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ERROR_MESSAGE } from '../extension';
import { randomUUID } from 'crypto';

// Helper function to create a temporary file
async function createTempFile(content: string): Promise<vscode.Uri> {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    const tempFilePath = path.join(tempDir, `temp_${randomUUID()}.ts`);
    fs.writeFileSync(tempFilePath, content);
    const uri = vscode.Uri.file(tempFilePath);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    return uri;
}

suite('Extension Test Suite', function () {
    this.timeout(5000);
    vscode.window.showInformationMessage('🧪 Alle Tests starten 🧪'.toLocaleUpperCase());

    test('Check welcome message', async () => {
        assert.ok(vscode.commands.executeCommand('anyscript.helloWorld'));
    });

    test('Detect "any" type and show error message', async () => {
        const tempUri = await createTempFile('let foo: any = 42;');
        const diagnostics = vscode.languages.getDiagnostics(tempUri);
        assert.strictEqual(diagnostics.some(d => d.message === ERROR_MESSAGE), true);
    });

    test('Do not show error message for correct types', async () => {
        const tempUri = await createTempFile('let foo: string = "Hello";');
        const diagnostics = vscode.languages.getDiagnostics(tempUri);
        assert.strictEqual(diagnostics.some(d => d.message === ERROR_MESSAGE), false);
    });
});