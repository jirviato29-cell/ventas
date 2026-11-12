// Solo para `npm start` (servidor de desarrollo de CRA); no entra al build.
// Replica el rewrite de vercel.json: /api/* -> backend de Render.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://ato-appservidor-nvxt.onrender.com',
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/api': '' },
    })
  );
};
