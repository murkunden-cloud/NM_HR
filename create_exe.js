const { Service } = require('node-windows');

// Create a new service object
const svc = new Service({
  name: 'PZHR Web Application',
  description: 'PZHR HR Management System',
  script: require('path').join(__dirname, 'server.js'),
  nodeOptions: [
    '--max-old-space-size=4096'
  ]
});

// Listen for the "install" event
svc.on('install', function(){
  console.log('Service installed successfully!');
  console.log('To start the service, run: sc start PZHRWebApplication');
  console.log('Or use Windows Services manager');
  svc.start();
});

svc.on('alreadyinstalled', function(){
  console.log('Service is already installed.');
});

// Install the service
svc.install();
