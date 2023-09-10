const { EventEmitter } = require('events')
const { spawn } = require('child_process')
const { platform } = require('process')
const vscode = require('vscode')

class Runner extends EventEmitter {
  constructor(document, config) {
    super()

    this._document = document
    this._config = config
    this._process = null

    this._status = 0 // 0: idle 1: compiling 2: running
    this._error = false

    const f = this._document.fileName
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
    this._dir = getDir()
    this._path = f
    this._fileName = getFileName()
    this._fileNameWithoutExt = getFileNameWithoutExt()
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

    let cmd = this._config.get('commands')[lang][0]
    if (!cmd[0]) {
      this.emit('compileComplete', 0)
      return
    }
    cmd = this._convertCmd(cmd)

    this._status = 1

    const process = spawn(cmd[0], cmd[1], { cwd: this._dir })
    this._process = process

    process.stdout.on('data', data => {
      this.emit('compileStdout', data.toString())
    })

    process.stderr.on('data', data => {
      this.emit('compileStderr', data.toString())
    })

    process.on('close', code => { // 总是会触发，无论是否错误
      this.emit('compileComplete', code)
      this._status = 0
    })

    process.on('error', err => {
      this.emit('compileStderr', err.toString() + '\n')
    })

  }

  run(lang, stdin) {
    if (this._status) {
      if (this._status === 1) {
        vscode.window.showInformationMessage('Compiling, please wait.')
      } else if (this._status === 2) {
        vscode.window.showInformationMessage('Program is already running.')
      }
      return
    }

    let cmd = this._config.get('commands')[lang][1]
    if (!cmd[0]) {
      this.emit('runFinish', 0, 0)
      return
    }
    cmd = this._convertCmd(cmd)

    this._status = 2

    const process = spawn(cmd[0], cmd[1], { cwd: this._dir })
    let timeStamp = Date.now()
    this._process = process

    process.stdin.write(stdin)
    process.stdin.end()

    process.stdout.on('data', data => {
      this.emit('runStdout', data.toString())
    })

    process.stderr.on('data', data => {
      this.emit('runStderr', data.toString())
    })

    process.on('exit', () => { // 错误时可能触发，也可能不
      if (this._error) {
        return
      }
      timeStamp = Date.now() - timeStamp
    })

    process.on('close', code => { // 总是会触发，无论是否错误
      this._error = false
      this._status = 0
      this.emit('runFinish', code, timeStamp)
    })

    process.on('error', err => {
      this._error = true
      this.emit('runStderr', err.toString() + '\n')
      timeStamp = Date.now() - timeStamp
    })

  }

  stop() {
    if (this._status) {
      this._process.kill()
    }
  }

  _getWorkingDir() {
    const f = this._document.fileName
    const a = f.match(/(.*[\/\\]).*/)
    return a ? a[1] : f
  }

  _convertCmd(cmd) {
    const replace = (s) => {
      let cmd = s
      cmd = cmd.replace(/\[dir\]/g, this._dir)
      cmd = cmd.replace(/\[path\]/g, this._path)
      cmd = cmd.replace(/\[file\]/g, this._fileName)
      cmd = cmd.replace(/\[file-\]/g, this._fileNameWithoutExt)
      cmd = cmd.replace(/\[ext\]/g, platform === 'win32' ? '.exe' : '') 
      return cmd
    }
    const res = [replace(cmd[0]), []]
    for (const i of cmd[1]) {
      res[1].push(replace(i))
    }
    return res
  }
}

module.exports = Runner
