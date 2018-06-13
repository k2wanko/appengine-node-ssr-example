const fs = require('fs')
const path = require('path')
const http = require('http')
const { createBundleRenderer } = require('vue-server-renderer')
const LRU = require('lru-cache')
const resolve = file => path.resolve(__dirname, file)
const template = fs.readFileSync(resolve('./server-dist/index.html'), 'utf-8')

const bunyan = require('bunyan');
const { LoggingBunyan } = require('@google-cloud/logging-bunyan')
const loggingBunyan = new LoggingBunyan()

const logger = bunyan.createLogger({
  name: 'default',
  level: 'info',
  streams: [
    {stream: process.stdout},
    loggingBunyan.stream(),
  ],
})

const bundle = require('./server-dist/vue-ssr-server-bundle.json')
const clientManifest = require('./dist/vue-ssr-client-manifest.json')

const renderer = createBundleRenderer(bundle, {
  clientManifest,
  template,
  cache: LRU({
    max: 1000,
    maxAge: 1000 * 60 * 15
  }),
  basedir: resolve('./server-dist'),
  runInNewContext: false
})

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "text/html")

  const context = {
    url: req.url
  }

  renderer.renderToString(context, (err, html) => {
    const handleError = err => {
      res.statusCode = 500
      res.end('500 | Internal Server Error')
      logger.error(`error during render : ${req.url}`)
      logger.error(err.stack)
    }
    if (err) {
      return handleError(err)
    }
    res.end(html)
  })
})

server.listen(process.env.PORT || 3000)
