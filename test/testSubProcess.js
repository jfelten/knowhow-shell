var KnowhowShell = require('../knowhow-shell.js');
var knowhowShell = new KnowhowShell();
//require('./testJob.js');
//require('./testPool.js');

var dummyJob = {
  "id": "dummy Job to test workflows",
  "working_dir": "./",
  "options": {
    "timeoutms": 360000
  },
  "files": [],
  "script": {
    "env": {
      "TEST_VAR": "HELLLO0o0o0o0o0 ",
      "TEST_VAR2": "W0RLD"
    },
    "commands": [
      {
        "command": "echo $TEST_VAR"
      },
      {
        "command": "echo ${TEST_VAR2}!"
      }
    ]
  }
}

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

knowhowShell.executeJobAsSubProcess(dummyJob);
