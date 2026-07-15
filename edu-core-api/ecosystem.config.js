module.exports = {
  apps: [
    {
      name: 'edu-core-api',
      script: 'src/server.js',
      instances: 'max', // Scale to all available CPU cores
      exec_mode: 'cluster', // Enable PM2 cluster mode
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Restart if memory usage exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
