var KnowhowShell = require('../knowhow-shell.js');
var knowhowShell = new KnowhowShell();
var assert = require('assert');

npmInitJob = { 
  "id": "npm init job",
  "working_dir": ".",
  "options": {
    "timeoutms": 10000
  },
  "files": [],
	script: {
		"env": {
			PATH: '/opt/local/bin:/opt/local/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
			PROJECT_DIR: "npmTest",
      		NAME: 'knowhow_project2',
      		VERSION: '0.0.0',
      		DESCRIPTION: 'An example that demos a knowhow job',
      		ENTRY_POINT: '\r',
      		TEST_COMMAND: 'npm test',
      		GIT_REPOSITORY: '\n',
      		KEYWORDS: 'very cool',
      		AUTHOR: 'jfelten',
      		LICENSE: 'GPL-3.0+'	
    	},
		commands: [
			{
				"command": "sleep 15"
			},
			{
		    	"command": "echo ${PROJECT_DIR}"
		    },
			{
		    	"command": "pwd"
		    },
		    {
		    	command: 'rm -rf $PROJECT_DIR'
		    },
		    {
		    	command: 'mkdir -p $PROJECT_DIR'
		    },
		   
		    {
		    	command: 'cd $PROJECT_DIR'
		    },
			{
				command: 'npm init',
				responses: {
					'name:': "${NAME}",
					'version:': "${VERSION}",
					'description:': "${DESCRIPTION}",
					'entry point:': "${ENTRY_POINT}",
					'test command:': "${TEST_COMMAND}",
					'git repository:': "${GIT_REPOSITORY}",
					'keywords:': "${KEYWORDS}",
					'author:': "${AUTHOR}",
					'license:': "${LICENSE}",
					'Is this ok\?': '\n'
				}
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

knowhowShell.on('execution-erro', function(scriptRuntime) {
	console.log("execution-error: "+scriptRuntime);
});

var npmInitJob2 = npmInitJob
knowhowShell.executeJobAsSubProcess(npmInitJob2, function(err) {
	if (err) {
		console.log(err.message);
		console.log(err.stack);
		//throw err;
	}
	console.log("executeJobAsSubprocess success!!");
	
});









