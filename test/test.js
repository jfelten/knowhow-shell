
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


knowhowShell.executeJob(dummyJob, function(err) {
	console.log("done...........");
	if (err) {
		console.log(err.message);
		console.log(err.stack);
		throw err;
	}
	
});

var ttyPool = new require('../tty-pool')(2,10);
knowhowShell.executeJobWithPool(ttyPool, dummyJob, function(err,runtimeOutput) {
	console.log("done...........");
	if (err) {
		console.log(err.message);
		console.log(err.stack);
		throw err;
	}
	//console.assertTrue((err),err.message);
	process.exit(0);
});

