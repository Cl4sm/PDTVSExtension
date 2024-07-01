import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const provider = new YamlHighlightProvider();
    const selector = { language: 'yaml', scheme: 'file' };

    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(selector, provider, provider.legend)
    );
}

class YamlHighlightProvider implements vscode.DocumentSemanticTokensProvider {
    private readonly tokenTypes = new Map<string, number>();
    private readonly tokenModifiers = new Map<string, number>();

    constructor() {
        this.tokenTypes.set('keyword', 0);
        this.tokenTypes.set('string', 1);
        this.tokenTypes.set('number', 2);
        this.tokenTypes.set('comment', 3);
        this.tokenTypes.set('bash', 4);
    }

    public get legend() {
        const tokenTypesLegend = [...this.tokenTypes.keys()];
        const tokenModifiersLegend = [...this.tokenModifiers.keys()];
        return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
    }

    public provideDocumentSemanticTokens(
        document: vscode.TextDocument
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        const tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);
        const lines = document.getText().split(/\r\n|\r|\n/);

        let inBashTemplate = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
			console.log("Line: " + line);

            if (line.trim().startsWith('template:')) {
                tokensBuilder.push(
                    new vscode.Range(i, 0, i, line.length),
                    'keyword'
                );
                inBashTemplate = true;
                continue;
            }

            if (inBashTemplate) {
                if (line.startsWith('          ')) {
                    tokensBuilder.push(
                        new vscode.Range(i, 0, i, line.length),
                        'bash'
                    );
                } else {
                    inBashTemplate = false;
                }
                continue;
            }

            const tokens = line.match(/(".*?"|'.*?'|\S+)/g);
            let startIndex = 0;

            if (tokens !== null) {
                for (const token of tokens) {
                    if (token.startsWith('"') || token.startsWith("'")) {
                        tokensBuilder.push(
                            new vscode.Range(i, startIndex, i, startIndex + token.length),
                            'string'
                        );
                    } else if (!isNaN(Number(token))) {
                        tokensBuilder.push(
                            new vscode.Range(i, startIndex, i, startIndex + token.length),
                            'number'
                        );
                    } else if (token.startsWith('#')) {
                        tokensBuilder.push(
                            new vscode.Range(i, startIndex, i, line.length),
                            'comment'
                        );
                        break;
                    }
                    startIndex += token.length + 1;
                }
            }
        }

        return tokensBuilder.build();
    }
}
