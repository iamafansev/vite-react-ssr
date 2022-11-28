import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import {createServer as createViteServer, ViteDevServer} from 'vite';
import chalk from 'chalk';
import {performance} from 'perf_hooks';

// @ts-ignore
if (!globalThis.__ssr_start_time) {
  // @ts-ignore
  globalThis.__ssr_start_time = performance.now()
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const root = process.cwd();
const isTest = process.env.VITEST;
const isProd = process.env.NODE_ENV === 'production';

const PORT = 5173;

const resolve = (p: string) => path.resolve(__dirname, '..', p);

function matchEntryPointByUrl(this: {path: string}, url: string) {
  return url.startsWith(this.path);
}

const entries = [
  {
    path: '/about',
    entryTemplate: 'src/entries/about/index.html',
    entryServer: 'src/entries/about/entry-server.tsx',
    match: matchEntryPointByUrl,
  },
  {
    path: '/',
    entryTemplate: 'src/entries/home/index.html',
    entryServer: 'src/entries/home/entry-server.tsx',
    match: matchEntryPointByUrl,
  }
];

const getEntry = (url: string) => {
  const entry = entries.find((currentEntry) => currentEntry.match(url));
  return entry && {
    path: entry.path,
    entryTemplate: entry.entryTemplate,
    entryServer: entry.entryServer
  };
}

export async function createServer() {
  const indexProd = isProd
    ? fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
    : ''

  const app = express()

  let vite: ViteDevServer | undefined = undefined;
  if (!isProd) {
    vite = await createViteServer({
      root,
      server: {
        middlewareMode: true,
        watch: {
          usePolling: true,
          interval: 100
        },
      },
      appType: 'custom',
    })

    app.use(vite.middlewares)
  } else {
    app.use((await import('compression')).default())
    app.use(
      (await import('serve-static')).default(resolve('dist/client'), {
        index: false
      })
    )
  }

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl
      const entry = getEntry(url);

      if (!entry) {
        return res.status(404);
      };

      let template, render
      if (!isProd) {
        template = fs.readFileSync(resolve(entry.entryTemplate), 'utf-8')
        template = await vite!.transformIndexHtml(url, template)
        const entryServer = await vite!.ssrLoadModule(entry.entryServer);
        render = entryServer.render;
      } else {
        template = indexProd
        const entryServer = await import(resolve('dist/server/entry-server.js'));
        render = entryServer.render;
      }

      const context = {}
      const appHtml = render(url, context)

      if (context.url) {
        return res.redirect(301, context.url)
      }

      const html = template.replace(`<!--app-html-->`, appHtml)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      !isProd && vite!.ssrFixStacktrace(e as Error)
      console.log((e as Error).stack)
      res.status(500).end((e as Error).stack)
    }
  })

  return { app, vite }
}

if (!isTest) {
  createServer().then(({ app, vite }) =>
    app.listen(PORT, () => {
      if (!isProd) {
        printServerInfo(vite!);
      }
    })
  )
}

const printServerInfo = (server: ViteDevServer) => {
  const info = server.config.logger.info

  let ssrReadyMessage = '\n -- SSR mode'

  info(
    chalk.green(`dev server running at:\n`),
    { clear: !server.config.logger.hasWarned }
  )

  info(`http://localhost:${PORT}`);

  // @ts-ignore
  if (globalThis.__ssr_start_time) {
    ssrReadyMessage += chalk.cyan(
      ` ready in ${Math.round(
        // @ts-ignore
        performance.now() - globalThis.__ssr_start_time
      )}ms.`
    )
  }

  info(ssrReadyMessage + '\n')
}