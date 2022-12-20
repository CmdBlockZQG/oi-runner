const { EventEmitter } = require('events')
const { spawn } = require('child_process')
const vscode = require('vscode')

// stdout stderr runFinish compileComplete
class Runner extends EventEmitter {
  constructor(document, config) {
    super()

    this._document = document
    this._config = config
    this._process = null

    this._status = 0 // 0: idle 1: compiling 2: running
  }

  async compile(lang) {
    if (this._status) {
      if (this._status === 1) {
        vscode.window.showInformationMessage('Already compiling.')
      } else if (this._status === 2) {
        vscode.window.showInformationMessage('Program is running.')
      }
      return
    }
    if (this._document.isUntitled) { // 未保存的文件
      vscode.window.showInformationMessage('Please save the file before compile.')
      return
    }

    if (!(await this._document.save())) {
      return
    }

    this._status = 1

    const shell = this._config.get('shell')
    const shellArg = {
      'sh': '-c',
      'powershell': '-NoLogo',
      'cmd': '/C'
    }
    const process = spawn([shell, [shellArg[shell], this._convertCmd(this._config.get('commands')[lang][0])]])
    this._process = process

    process.stdout.on('data', data => {
      this.emit('stdout', data)
    })

    process.stderr.on('data', data => {
      this.emit('stderr', data)
    })

    process.on('close', code => {
      this.emit('compileComplete', code)
      this._status = 0
    })

  }

  run(lang) {
    if (this._status) {
      if (this._status === 1) {
        vscode.window.showInformationMessage('Compiling, please wait.')
      } else if (this._status === 2) {
        vscode.window.showInformationMessage('Program is already running.')
      }
      return
    }

    this._status = 2

    const shell = this._config.get('shell')
    const shellArg = {
      'sh': '-c',
      'powershell': '-NoLogo',
      'cmd': '/C'
    }
    const process = spawn([shell, [shellArg[shell], this._convertCmd(this._config.get('commands')[lang][1])]])
    this._process = process

    process.stdout.on('data', data => {
      this.emit('stdout', data)
    })

    process.stderr.on('data', data => {
      this.emit('stderr', data)
    })

    process.on('close', code => {
      this.emit('runFinish', code)
    })

  }

  stop() {
    if (this._status) {
      this._process.kill()
    }
  }

  _convertCmd(s) {
    let cmd = s
    let f = this._document.fileName

    const getDir = () => {
      const a = f.match(/(.*[\/\\]).*/)
      return a ? a[1] : f
    }

    const getFileName = () => {
      const a = f.match(/.*[\/\\](.*)/)
      return a ? a[1] : f
    }

    const getFileNameWithoutExt = () => {
      const a = f.match(/.*[\/\\](.*(?=\..*))/)
      return a ? a[1] : f
    }

    const placeholders = [
      { regex: /\[dir\]/g, value: getDir() }, // dir without filename, with trailing slash
      { regex: /\[path\]/g, value: f }, // path with dir and filename
      { regex: /\[file\]/g, value: getFileName() }, // filename without dir
      { regex: /\[file-\]/g, value: getFileNameWithoutExt() } // filename without dir and ext
    ]

    placeholders.forEach(x => {
      cmd = cmd.replace(x.regex, x.value)
    })

    return cmd
  }
}

module.exports = Runner