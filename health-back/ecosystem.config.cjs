/**
 * PM2 process file — auto-restart on crash / exit (like `pm2` defaults).
 * Usage: npm run build && npm run pm2:start
 * Boot persistence: pm2 save && pm2 startup (see PM2 docs for your OS).
 */
module.exports = {
  apps: [
    {
      name: "health-back",
      cwd: __dirname,
      script: "dist/server.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_restarts: 20,
      min_uptime: "4s",
      exp_backoff_restart_delay: 150,
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
