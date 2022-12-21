import { EditorView } from '@codemirror/view'

const dark = EditorView.theme({
  "&": {
    color: '#dddddd',
    backgroundColor: '#1f1f1f'
  },
  ".cm-content": {
    caretColor: '#f2f2f2',
    'font-family': 'var(--vscode-editor-font-family)',
    'font-size': '16px'
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: '#f2f2f2' },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: '#5b5b5b' },
  ".cm-activeLine": { backgroundColor: "#ffffff0b" },
  ".cm-selectionMatch": { backgroundColor: "#363636" },
  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "#616161"
  },
  ".cm-gutters": {
    backgroundColor: '#1f1f1f',
    color: '#666666',
    border: "none",
    'font-family': 'var(--vscode-editor-font-family)',
    'font-size': '16px'
  },
  ".cm-activeLineGutter": {
    backgroundColor: '#363636'
  }
}, { dark: true })

const light = EditorView.theme({
  ".cm-content": {
    'font-family': 'var(--vscode-editor-font-family)',
    'font-size': '16px'
  },
  ".cm-gutters": {
    'font-family': 'var(--vscode-editor-font-family)',
    'font-size': '16px'
  },
})

export default {
  dark,
  light
}