const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const path = require('path')

const app = express()
const PORT = 8787
const API_INTERNAL = 'http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787'

app.use(createProxyMiddleware({
  target: API_INTERNAL,
  changeOrigin: true,
  proxyTimeout: 120000,
  pathFilter: ['/api/**', '/health'],
}))

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dynex MBS UI serving on :${PORT} — /api/* → ${API_INTERNAL}`)
})
