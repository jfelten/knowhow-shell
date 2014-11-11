var KnowhowShell = require('../knowhow-shell.js');
var knowhowShell = new KnowhowShell();
console.log(knowhowShell);

cloneRepoJob = { 
  "id": "clone GIT repo",
  "working_dir": "./",
  "options": {
    "timeoutms": 3600
  },
  "files": [],
	script: {
		"env": {
      		REPO_TO_CLONE: 'https://github.com/jfelten/knowhow_example_repo.git',
      		CHECKOUT_DIR: '${working_dir}/knowhow_example_repo',
      		GIT_PASSWORD: 'MY_PASSWORD'
    	},
		commands: [
			{
				command: 'cd asdas'
			},
			{
				command: 'rm -rf ${CHECKOUT_DIR}'
			},
			{
				command: 'git clone $REPO_TO_CLONE $CHECKOUT_DIR',
				responses: {
					'password': '$GIT_PASSWORD'
				}
			}
		] 
	}
};

knowhowShell.on('command-complete', function(command) {
	console.log('command: '+command.command);
	console.log('ret code: '+command.retCode);
	console.log('output: '+command.output);
});

knowhowShell.on('job-complete', function(job) {
	console.log(job.id+' complete');
});

knowhowShell.on('job-error', function(job) {
	console.log(job.id+' error: ');
});

knowhowShell.on('job-update', function(job) {
	console.log(job.id +' progress '+job.progress);
});

knowhowShell.executeJob(cloneRepoJob);