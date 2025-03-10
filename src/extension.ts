import * as vscode from 'vscode';
import * as path from 'path';
import * as sound from 'sound-play';

export const WELCOME_MESSAGE = '🪖 Willkommen in Deutschland! 🪖'.toLocaleUpperCase();
export const ERROR_MESSAGE = '⚠️ ACHTUNG! Ich werde Sie nicht in AnyScript programmieren lassen! Vermeiden Sie die Verwendung von "any" als Typ! ⚠️'.toLocaleUpperCase();
export const SUCCESS_MESSAGE = '🎉 Herzlichen Glückwunsch! Sie haben alle "any"-Typen entfernt! 🎉'.toLocaleUpperCase();
let detectedPositions = new Set<string>();
let decorationType: vscode.TextEditorDecorationType | null = null;
let previousAnyCount = 0;
const IGNORED_PATHS = ["node_modules", "dist", "out", "build", "www"];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const welcome = () => vscode.window.showInformationMessage(WELCOME_MESSAGE);

    welcome();

    // Register a command that is invoked when the extension is activated
    const disposable = vscode.commands.registerCommand('anyscript.helloWorld', welcome);

    context.subscriptions.push(disposable);

    const collection = vscode.languages.createDiagnosticCollection('anyscript');
    context.subscriptions.push(collection);

    const isIngnoredFile = (path: string) => {
        return IGNORED_PATHS.some(i => path.includes(i));
    };

    vscode.workspace.textDocuments.forEach(document => {
        if (document.fileName.includes(".ts") && !isIngnoredFile(document.fileName)) {
            updateDiagnostics(document, collection);
        }
    });

    // Analyze the file when it's opened
    const onDidOpenTextDocumentDisposable = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.fileName.includes(".ts") && !isIngnoredFile(document.fileName)) {
            updateDiagnostics(document, collection);
        }
    });

    context.subscriptions.push(onDidOpenTextDocumentDisposable);

    // Analyze the file when it's changed
    const onDidChangeTextDocumentDisposable = vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        if (document.fileName.includes(".ts") && !isIngnoredFile(document.fileName)) {
            updateDiagnostics(document, collection);
        }
    });

    context.subscriptions.push(onDidChangeTextDocumentDisposable);
    
    function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const regex = /\b(?<!\/\/.*|\/\*.*|\*.*|\s)any\b/g;
        const decorations: { range: vscode.Range, hoverMessage: vscode.MarkdownString }[] = [];
        const newDetectedPositions = new Set<string>();
        let currentAnyCount = 0;
    
        let match;
        while ((match = regex.exec(text)) !== null) {
            currentAnyCount++;
            const startPosition = document.positionAt(match.index);
            const endPosition = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPosition, endPosition);
            const positionKey = `${startPosition.line}:${startPosition.character}`;
    
            // Ensure we are only capturing "any" used as a type
            const lineText = document.lineAt(startPosition.line).text;
            const beforeAny = lineText.slice(0, startPosition.character).slice(-1);
            const afterAny = lineText.slice(startPosition.character + match[0].length)[0];
    
            const beforeAnyPattern = /(\s|<|\[)$/; // Matches space character, "<", or "[" indicating a type annotation or generic type
            const afterAnyPattern = /^(>|,|\)|\||\}|\=|\]|\s|;)/; // Matches characters that indicate the end of a type annotation or generic type, including whitespace and ";"
    
            if (!beforeAnyPattern.test(beforeAny) || !afterAnyPattern.test(afterAny)) {
                continue;
            }
    
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

        if (previousAnyCount > 0 && currentAnyCount === 0) {
            vscode.window.showInformationMessage(SUCCESS_MESSAGE);
            const victoryAudioFilePath = path.join(context.extensionUri.fsPath, 'assets', 'victory.mp3');
            sound.play(victoryAudioFilePath).catch(err => {
                console.error('Error playing victory audio:', err);
            });
        }

        previousAnyCount = currentAnyCount;
    }

    function applyDecorations(editor: vscode.TextEditor, decorations: { range: vscode.Range, hoverMessage: vscode.MarkdownString }[]) {

        if (decorationType) {
            decorationType.dispose();
        }

        decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.4)', // Light red background
            border: '2px solid red'
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