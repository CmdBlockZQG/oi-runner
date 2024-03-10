<template>
  <div id="container">
    
    <div id="action-bar">

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
    <div id="main">
      <div class="editor-area">
        <div class="label">INPUT</div>
        <codemirror
          :style="{ height: 'calc(100% - 16px)' }"
          v-model="stdinInput"
          :disabled="!curDoc || curState.status"
          :indent-with-tab="true"
          :tab-size="4"
          :extensions="cmExtensions"
        />
      </div>

      <div class="editor-area">
        <div class="label">OUTPUT</div>
        <codemirror
          :style="{ height: 'calc(100% - 16px)' }"
          :modelValue="curState.stdout"
          :disabled="true"
          :indent-with-tab="true"
          :tab-size="4"
          :extensions="cmExtensions"
        />
      </div>
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
  import { Codemirror } from 'vue-codemirror'
  import { basicSetup } from 'codemirror'
  import cmTheme from './cm-theme.js'

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
  const curState = computed(() => {
    const t = state.value[curDoc.value]
    if (t) {
      return t
    } else {
      return {
        status: 0,
        stdin: '',
        stdout: '',
        lang: ''
      }
    }
  })

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
      case 'compile':
        state.value[x.doc].stdout = 'Compiling...'
        break
      case 'compileComplete':
        state.value[x.doc].stdout = ''
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
      case 'switchColorTheme':
        cmThemeType.value = x.type
        break
    }
  })
  const cmThemeType = ref(2)
  const cmExtensions = computed(() => {
    console.log(cmThemeType.value)
    return [basicSetup, cmThemeType.value === 1 || cmThemeType.value === 4 ? cmTheme.light : cmTheme.dark]
  })

</script>

<style scoped>
#action-bar {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;

  height: 32px;
}

#action-bar vscode-button {
  margin-left: 8px;
}

#main {
  height: calc(100vh - 32px);
}

.label {
  height: 16px; line-height: 16px;
}

.editor-area {
  box-sizing: border-box;
  padding: 4px;

  width: 50%;
  height: 100%;
  display: inline-block;
}

@media screen and (max-width: 648px) {
  .editor-area {
    width: 100%;
    height: 50%;
    display: block;
  }
}
</style>