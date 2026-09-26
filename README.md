# Light dev tools

![Node.js CI](https://github.com/xfenix/light-dev-tools/workflows/Node.js%20CI/badge.svg)

Bunch of small useful tools in one projects.

Current tools support:
- Base64 decoder/encoder
- Url decoder/encoder
- Emoji picker
- Color picker
- QR code generator
- Image converter with resize and crop
- More tools currently under development...

Project hostend on github pages: https://xfenix.github.io/light-dev-tools/.

## Development

Written in TypeScript with React, built by Vite. Node.js 22.22 or newer is needed.

```sh
npm install
npm start          # dev server
npm test           # tests in watch mode
npm run typecheck  # tsc
npm run lint       # oxlint
npm run build      # production build into ./build
```
