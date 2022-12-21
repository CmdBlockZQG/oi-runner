const vscode = require('vscode')
const handler = require('./handler.js')

function activate(context) {
  const provider = new PanelProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      provider.viewType,
      provider,
      { 
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  )
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
    handler.init(this._view.webview)
    webviewView.webview.onDidReceiveMessage(data => {
      handler.onReceiveMsg(data)
    })
  }

  _getHtml(webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'ui', 'dist', 'assets', 'index.js'))
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'ui', 'dist', 'assets', 'index.css'))

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
		<script type="module" crossorigin src="${scriptUri}"></script>
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

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
