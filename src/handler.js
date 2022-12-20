const vscode = require('vscode')
const Runner = require('./runner.js')

let conf = null
const runners = {}

let view = null

function init(webviewView) {
  view = webviewView
  conf = vscode.workspace.getConfiguration('oi-runner')
  const curDoc = vscode.window.activeTextEditor.document
  if (curDoc) {
    registerRunner(curDoc)
  }
  view.postMessage({
    cmd: 'init',
    langs: Object.keys(conf.get('commands')),
    doc: curDoc ? curDoc.fileName : undefined
  })
}

function onReceiveMsg(msg) {
  switch (msg.cmd) {
    case 'compile':
      runners[msg.doc].compile(msg.lang)
      break
    case 'run':
      runners[msg.doc].run(msg.lang)
      break
    case 'stop':
      runners[msg.doc].stop()
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

  runner.on('stdout', data => {
    view.postMessage({
      cmd: 'stdout',
      doc: doc.fileName,
      data: data
    })
  })

  runner.on('stderr', data => {
    view.postMessage({
      cmd: 'stderr',
      doc: doc.fileName,
      data: data
    })
  })

  runner.on('runFinish', data => {
    view.postMessage({
      cmd: 'runFinish',
      doc: doc.fileName,
      code: data
    })
  })

  runner.on('compileComplete', data => {
    view.postMessage({
      cmd: 'compileComplete',
      doc: doc.fileName,
      code: data
    })
  })
}

vscode.window.onDidChangeActiveTextEditor(e => {
  view.postMessage({
    cmd: 'changeDoc',
    doc: e ? e.document.fileName : undefined
  })
  if (e) {
    registerRunner(e.document)
  }
})

module.exports = {
  init,
  onReceiveMsg
}

// init changeDoc
// stdout stderr runFinish compileComplete

// compile run stop