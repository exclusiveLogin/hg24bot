module.exports = {
    apps: [{
        name: 'HG-bot',
        script: 'dist/out-tsc/bot.js',
        kill_timeout: 10000,
        instances: 1,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development',
            HOST: 'localhost'
        },
        env_local: {
            NODE_ENV: 'local',
            HOST: '185.178.46.248'
        }
    }],

    // deploy : {
    //   production : {
    //     user : 'node',
    //     host : '212.83.163.1',
    //     ref  : 'origin/master',
    //     repo : 'git@github.com:repo.git',
    //     path : '/var/www/production',
    //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    //   }
    // }
};
