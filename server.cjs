const express = require('express');
const path = require('path');
const open = require('open');

const app = express();

// 静态文件目录
// pkg 打包后，__dirname 指向虚拟文件系统内部
const distPath = path.join(__dirname, 'dist');

// 中间件：服务静态文件
app.use(express.static(distPath));

// 所有其他请求返回 index.html (SPA 支持)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const startServer = async () => {
  let port = 3000;
  let server;
  const maxRetries = 100;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        server = app.listen(port)
          .once('listening', () => resolve())
          .once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              server = null;
              reject(err);
            } else {
              reject(err);
            }
          });
      });
      break; // 成功启动
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        port++;
      } else {
        console.error('Server startup error:', err);
        process.exit(1);
      }
    }
  }

  if (server) {
    const url = `http://localhost:${port}`;
    console.log(`Application started at ${url}`);
    console.log('Press Ctrl+C to exit');
    
    // 打开浏览器
    try {
        await open(url);
    } catch (err) {
        console.error('Failed to open browser automatically:', err);
    }
  } else {
    console.error('Could not find an open port.');
    process.exit(1);
  }
};

startServer();
