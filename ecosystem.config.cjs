module.exports = {
    apps: [{
        name: 'finance-tracker',
        script: 'server/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production',
            PORT: 3001
        },
        env_development: {
            NODE_ENV: 'development',
            PORT: 3001
        }
    }]
};
