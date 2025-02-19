import * as vscode from 'vscode';
import * as path from 'path';
import * as sound from 'sound-play';

const WELCOME_MESSAGE = '🪖 Willkommen in Deutschland! 🪖';
const ERROR_MESSAGE = '⚠️ ACHTUNG! Ich werde Sie nicht in AnyScript programmieren lassen! Vermeiden Sie die Verwendung von "any" als Typ! ⚠️';
let detectedPositions = new Set<string>();
let decorationType: vscode.TextEditorDecorationType | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const welcom = () => vscode.window.showWarningMessage(WELCOME_MESSAGE);

    welcom();

    // Register a command that is invoked when the extension is activated
    const disposable = vscode.commands.registerCommand('anyscript.helloWorld', welcom);

    context.subscriptions.push(disposable);

    const collection = vscode.languages.createDiagnosticCollection('anyscript');
    context.subscriptions.push(collection);

    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'typescript') {
            updateDiagnostics(document, collection);
        }
    });

    // Analyze the file when it's opened
    const onDidOpenTextDocumentDisposable = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.fileName.includes(".ts")) {
            updateDiagnostics(document, collection);
        }
    });

    context.subscriptions.push(onDidOpenTextDocumentDisposable);

    // Analyze the file when it's changed
    const onDidChangeTextDocumentDisposable = vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        if (document.languageId === 'typescript') {
            updateDiagnostics(document, collection);
        }
    });

    context.subscriptions.push(onDidChangeTextDocumentDisposable);

    function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const regex = /\bany\b/g;
        const decorations: { range: vscode.Range, hoverMessage: vscode.MarkdownString }[] = [];
        const newDetectedPositions = new Set<string>();

        let match;
        while ((match = regex.exec(text)) !== null) {
            const startPosition = document.positionAt(match.index);
            const endPosition = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPosition, endPosition);
            const positionKey = `${startPosition.line}:${startPosition.character}`;

            // Ensure we are only capturing "any" used as a type
            const lineText = document.lineAt(startPosition.line).text;
            const typeRegex = new RegExp(`\\bany\\b(?=\\s*[:;=])`);
            if (!typeRegex.test(lineText)) {continue;}

            const diagnostic = new vscode.Diagnostic(
                range,
                ERROR_MESSAGE,
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);

            decorations.push({
                range,
                hoverMessage: new vscode.MarkdownString(ERROR_MESSAGE)
            });

            if (!detectedPositions.has(positionKey)) {
                const audioFilePath = path.join(context.extensionUri.fsPath, 'assets', 'audio.mp3');
                sound.play(audioFilePath).catch(err => {
                    console.error('Error playing audio:', err);
                });
            }
            newDetectedPositions.add(positionKey);
        }

        detectedPositions = newDetectedPositions;

        collection.set(document.uri, diagnostics);

        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === document) {
            applyDecorations(editor, decorations);
        }
    }

    function applyDecorations(editor: vscode.TextEditor, decorations: { range: vscode.Range, hoverMessage: vscode.MarkdownString }[]) {

        if (decorationType) {
            decorationType.dispose();
        }

        decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.3)', // Light red background
            border: '1px solid red'
        });

        // Clear previous decorations
        editor.setDecorations(decorationType, []);

        // Apply new decorations
        editor.setDecorations(decorationType, decorations.map(decoration => ({
            range: decoration.range,
            hoverMessage: decoration.hoverMessage
        })));
    }

    context.subscriptions.push(onDidOpenTextDocumentDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    if (decorationType) {
        decorationType.dispose();
    }
}