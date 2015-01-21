var KnowhowShell = require('../knowhow-shell.js');
var knowhowShell = new KnowhowShell();
var assert = require('assert');

sshKeyGenJob = {
  "id": "create ssh key",
  "working_dir": "./",
  "options": {
    "timeoutms": 360000
  },
  "files": [],
  "script": {
    "env": {
      "KEY_NAME": "KH_KEY",
      "USER": "",
      "FILE_LOCATION": "/Users/${USER}/.ssh/id_${KEY_NAME}"
    },
    "commands": [
      {
        "command": "ssh-keygen -t rsa",
        "responses": {
          "Enter file in which to save the key": "${FILE_LOCATION}",
          "Enter passphrase": "",
          "Enter same passphrase again": "",
          "Overwrite": "y"
        }
      },
      {
        "command": "chmod 700 ~/.ssh"
      },
      {
        "command": "chmod 600 ${FILE_LOCATION}"
      }
    ]
  }
};

knowhowShell.on('execution-complete', function(command) {
	console.log('Execution complete:');
	console.log('\tcommand: '+command.command);
	console.log('\tret code: '+command.returnCode);
	console.log('\toutput: '+command.output);
	console.log('\n');
});

knowhowShell.on('execution-error', function(command) {
	console.log('Execution error:');
	console.log('\tcommand: '+command.command);
	console.log('\tret code: '+command.returnCode);
	console.log('\toutput: '+command.output);
	console.log('\n');
});

knowhowShell.on('job-complete', function(job) {
	console.log(job.id+' complete!');
});

knowhowShell.on('job-error', function(job) {
	console.log(job.id+' error!');
});

knowhowShell.on('job-update', function(job) {
	console.log(job.id +' progress = '+job.progress);
});


knowhowShell.executeJob(sshKeyGenJob, function(err) {
	assert.ifError(err);
});