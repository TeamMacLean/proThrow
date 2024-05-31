module.exports = {
  apps: [
    {
      name: 'proteomics',
      script: 'server.js',
      node_args: '--experimental-modules',
      exec_interpreter: "/mnt/data/.nvm/versions/node/v14.21.3/bin/node",
    },
  ],
};
