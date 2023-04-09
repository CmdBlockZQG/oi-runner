const vscode = require('vscode')
const Runner = require('./runner.js')

const logChannel = vscode.window.createOutputChannel('OI Runner')

let conf = null
const runners = {}

let view = null

function init(webviewView) {
  view = webviewView
  conf = vscode.workspace.getConfiguration('oi-runner')
  const curTextEditor = vscode.window.activeTextEditor
  if (curTextEditor) {
    registerRunner(curTextEditor.document)
  }
  view.postMessage({
    cmd: 'init',
    langs: Object.keys(conf.get('commands')),
    exts: conf.get('exts'),
    doc: curTextEditor ? curTextEditor.document.fileName : ''
  })
  view.postMessage({
    cmd: 'switchColorTheme',
    type: vscode.window.activeColorTheme.kind
  })
}

function onReceiveMsg(msg) {
  switch (msg.cmd) {
    case 'compile':
      runners[msg.doc].compile(msg.lang)
      break
    case 'run':
      runners[msg.doc].run(msg.lang, msg.stdin)
      break
    case 'stop':
      runners[msg.doc].stop()
      break
    case 'showLog':
      logChannel.show()
      break
    case 'clearLog':
      logChannel.clear()
      break
  }
}

vscode.workspace.onDidCloseTextDocument(e => {
  view.postMessage({
    cmd: 'closeDoc',
    doc: e.fileName
  })
  if (runners[e.fileName]) {
    runners[e.fileName].stop()
    delete runners[e.fileName]
  }
})

function registerRunner(doc) {
  const runner = new Runner(doc, conf)
  runners[doc.fileName] = runner

  runner.on('compileStdout', data => {
    logChannel.append(data)
  })
  runner.on('compileStderr', data => {
    logChannel.append(data)
  })
  runner.on('compileComplete', code => {
    if (code) {
      logChannel.append(`\ncompile abort with code ${code}\n`)
    } else {
      logChannel.append(`\ncompile complete with code 0\n`)
    }
    
    view.postMessage({
      cmd: 'compileComplete',
      doc: doc.fileName,
      code: code
    })
  })

  runner.on('runStdout', data => {
    view.postMessage({
      cmd: 'stdout',
      doc: doc.fileName,
      data: data
    })
  })
  runner.on('runStderr', data => {
    logChannel.show()
    logChannel.append(data)
  })
  runner.on('runFinish', (code, time) => {
    logChannel.append(`exit with code ${code} in ${time / 1000}s`)
    view.postMessage({
      cmd: 'runFinish',
      doc: doc.fileName,
      code: code,
      time: time
    })
  })
}

vscode.window.onDidChangeActiveTextEditor(e => {
  view.postMessage({
    cmd: 'changeDoc',
    doc: e ? e.document.fileName : ''
  })
  if (e) {
    const doc = e.document
    if (!runners[doc.fileName]) {
      registerRunner(doc)
    }
  }
})

vscode.window.onDidChangeActiveColorTheme(e => {
  view.postMessage({
    cmd: 'switchColorTheme',
    type: e.kind
  })
})

module.exports = {
  init,
  onReceiveMsg
}

// init changeDoc closeDoc
// stdout stderr runFinish compileComplete

// compile run stop