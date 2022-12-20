<template>
  <div id="container">
    <vscode-panels>
      <vscode-panel-tab id="io">STD IN/OUT</vscode-panel-tab>
      <vscode-panel-tab id="compiler">STDERR</vscode-panel-tab>

      <vscode-panel-view id="io">
        io
      </vscode-panel-view>
      <vscode-panel-view id="compiler">
        compiler
      </vscode-panel-view>
    </vscode-panels>
    <div id="action">
      <vscode-dropdown>
        <vscode-option>C++14 -O2</vscode-option>
        <vscode-option>Python3</vscode-option>
      </vscode-dropdown>
      <vscode-button appearance="icon" aria-label="Compile">
        <span class="codicon codicon-extensions"></span>
      </vscode-button>
      <vscode-button appearance="icon" aria-label="Run">
        <span class="codicon codicon-debug-start"></span>
      </vscode-button>
      <vscode-button appearance="icon" aria-label="Compile&Run">
        <span class="codicon codicon-run-all"></span>
      </vscode-button>
      <vscode-button appearance="icon" aria-label="Stop" disabled>
        <span class="codicon codicon-debug-stop"></span>
      </vscode-button>
    </div>
  </div>
</template>

<script setup>
  import { inject, ref } from 'vue'
  import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodePanels,
    vsCodePanelTab,
    vsCodePanelView,
    vsCodeDropdown,
    vsCodeOption
  } from '@vscode/webview-ui-toolkit'
  
  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView(),
    vsCodeDropdown(),
    vsCodeOption()
  )
  const vscode = inject('vscode')


  window.addEventListener('message', e => {
    console.log('fe-receive:', e.data)
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

@media screen and (max-width: 460px) {
  #container {
    padding-top: 32px;
  }
}
</style>