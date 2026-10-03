const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',use:{headless:true,launchOptions:{args:['--enable-unsafe-swiftshader']}},webServer:{command:'python3 -m http.server 8080',port:8080,reuseExistingServer:!process.env.CI},reporter:'list'});
