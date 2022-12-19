const vscode = require('vscode')

function activate(context) {
	const provider = new PanelProvider(context.extensionUri)
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(provider.viewType, provider))

	context.subscriptions.push(vscode.commands.registerCommand('oi-runner.ping', () => {
		vscode.window.showInformationMessage('pong')
	}))
}

class PanelProvider {
	constructor(extensionUri) {
		this._extensionUri = extensionUri
		this.viewType = 'oi-runner.panel'

		this._view = null
	}

	resolveWebviewView(webviewView, context, _token) {
		this._view = webviewView
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		}
		webviewView.webview.html = this._getHtml(webviewView.webview)
		webviewView.webview.onDidReceiveMessage(data => {
			// this._view.webview.postMessage()
		})
	}

	_getHtml(webview) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'ui', 'dist', 'assets', 'index.js'))
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'ui', 'dist', 'assets', 'index.css'))
    const nonce = getNonce();
		
		return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    
		<script type="module" nonce="${nonce}" crossorigin src="${scriptUri}"></script>
    <link rel="stylesheet" href="${styleUri}">

		<title>OI Runner</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
`
	}
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}