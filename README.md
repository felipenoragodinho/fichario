# Fichário de Inglês

App para treinar as palavras das aulas de inglês: índice de reforço por palavra, repetição espaçada, exercícios de escuta, textos e conversa com IA.

- **App:** este site (GitHub Pages). Instale no celular com "Adicionar à tela inicial".
- **Dados:** planilha Google "Fichário de Inglês", com o servidor em `Code.gs` (Apps Script). O app guarda tudo no aparelho e sincroniza com a planilha.
- **IA:** Gemini (Google AI Studio). A chave fica nas propriedades do Apps Script, nunca no app.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `index.html` | o app |
| `sw.js` | funcionar sem internet |
| `manifest.webmanifest` e ícones `.png` | instalar como app |
| `qrcode.js` | QR de conexão ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), licença MIT © Kazuhiko Arase) |
| `Code.gs` | servidor: colar no Apps Script da planilha (Extensões > Apps Script) |
