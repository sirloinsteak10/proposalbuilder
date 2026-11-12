module.exports = {
  apps: [
    {
      name: "oshom-proposal-builder",
      cwd: "/var/www/proposal-builder",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 36899",
      env: { NODE_ENV: "production" },
      max_memory_restart: "700M",
    },
  ],
};
