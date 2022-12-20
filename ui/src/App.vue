<template>
  <div id="container">
    <textarea
      v-model="stdinInput"
      :disabled="!curDoc || curState.status"
    ></textarea>
    <vscode-text-area readonly :value="curState.stdout" :disabled="!curDoc">STDOUT</vscode-text-area>
    <div id="action">

      <vscode-dropdown
        ref="langDropdown"
        :disabled="!curDoc || curState.status"
      >
        <vscode-option v-for="i in langs">{{ i }}</vscode-option>
      </vscode-dropdown>

      <vscode-button
        appearance="icon"
        aria-label="Compile"
        @click="compile"
        :disabled="!curDoc || curState.status"
      >
        <span class="codicon codicon-extensions"></span>
      </vscode-button>
      <vscode-button
        appearance="icon"
        aria-label="Run"
        @click="run"
        :disabled="!curDoc || curState.status"
      >
        <span class="codicon codicon-debug-start"></span>
      </vscode-button>
      <vscode-button
        appearance="icon"
        aria-label="Compile&Run"
        @click="cr"
        :disabled="!curDoc || curState.status"
      >
        <span class="codicon codicon-run-all"></span>
      </vscode-button>
      <vscode-button
        appearance="icon"
        aria-label="Stop"
        @click="stop"
        :disabled="!curDoc || !curState.status"
      >
        <span class="codicon codicon-debug-stop"></span>
      </vscode-button>

    </div>
  </div>
</template>

<script setup>
  import { inject, ref, computed } from 'vue'
  import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeDropdown,
    vsCodeOption,
    vsCodeTextArea
  } from '@vscode/webview-ui-toolkit'

  const vscode = inject('vscode')
  
  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeDropdown(),
    vsCodeOption(),
    vsCodeTextArea()
  )
  
  const langs = ref([])
  const langDropdown = ref(null)

  const state = ref({
    '': {
      status: 0, // 0:idle 1:compiling 2:running 3:compiling(1/2) 4:running(2/2)
      stdin: '',
      stdout: '',
      lang: ''
    }
  })
  const curDoc = ref('')
  const curState = computed(() => state.value[curDoc.value])

  const stdinInput = ref('')

  function applyEdit() {
    state.value[curDoc.value].lang = langDropdown.value.getAttribute('current-value')
    state.value[curDoc.value].stdin = stdinInput.value
  }

  function compile() {
    applyEdit()
    state.value[curDoc.value].status = 1
    vscode.postMessage({ cmd: 'clearLog' })
    vscode.postMessage({ cmd: 'showLog' })
    vscode.postMessage({
      cmd: 'compile',
      doc: curDoc.value,
      lang: state.value[curDoc.value].lang
    })
  }

  function run() {
    applyEdit()
    state.value[curDoc.value].stdout = ''
    state.value[curDoc.value].status = 2
    vscode.postMessage({ cmd: 'clearLog' })
    vscode.postMessage({
      cmd: 'run',
      doc: curDoc.value,
      lang: state.value[curDoc.value].lang,
      stdin: state.value[curDoc.value].stdin
    })
  }

  function cr() {
    applyEdit()
    state.value[curDoc.value].stdout = ''
    state.value[curDoc.value].status = 3
    vscode.postMessage({ cmd: 'clearLog' })
    vscode.postMessage({
      cmd: 'compile',
      doc: curDoc.value,
      lang: langDropdown.value.getAttribute('current-value')
    })
  }

  function stop() {
    vscode.postMessage({
      cmd: 'stop',
      doc: curDoc.value
    })
  }

  let exts = null
  function autoLang(doc) {
    const ext = doc.slice(doc.lastIndexOf('.') + 1)
    return exts[ext] ? exts[ext] : langs.value[0]
  }

  window.addEventListener('message', e => {
    const x = e.data
    switch (x.cmd) {
      case 'init':
        exts = x.exts
        langs.value = x.langs
        if (x.doc) {
          state.value[x.doc] = {
            status: 0,
            stdin: '',
            stdout: '',
            lang: autoLang(x.doc)
          }
          langDropdown.value.setAttribute('current-value', state.value[x.doc].lang)
        }
        curDoc.value = x.doc
        break
      case 'changeDoc':
        if (!state.value[x.doc]) {
          state.value[x.doc] = {
            status: 0,
            stdin: '',
            stdout: '',
            lang: autoLang(x.doc)
          }
        }
        applyEdit()
        stdinInput.value = state.value[x.doc].stdin
        langDropdown.value.setAttribute('current-value', state.value[x.doc].lang)
        curDoc.value = x.doc
        break
      case 'closeDoc':
        delete state.value[x.doc]
        break
      case 'stdout':
        state.value[x.doc].stdout += x.data
        break
      case 'stderr':
        state.value[x.doc].stderr += x.data
        break
      case 'runFinish':
        state.value[x.doc].stdout += `\n--------\nexit with code ${x.code} in ${x.time / 1000}s`
        state.value[x.doc].status = 0
        break
      case 'compileComplete':
        if (state.value[x.doc].status === 1) {
          state.value[x.doc].status = 0
          return
        } else if (state.value[x.doc].status === 3) { // compile & run
          if (x.code) { // compile failed
            vscode.postMessage({ cmd: 'showLog' })
            state.value[x.doc].status = 0
          } else { // compile success
            state.value[x.doc].status = 4
            vscode.postMessage({
              cmd: 'run',
              doc: x.doc,
              lang: state.value[x.doc].lang,
              stdin: state.value[x.doc].stdin
            })
          }
        }
        break
    }
  })

</script>

<style scoped>
#action {
  position: absolute;
  right: 20px;
  top: 4px;

  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}

#action vscode-button {
  margin-left: 8px;
}
</style>