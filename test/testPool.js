var KnowhowShell = require('../knowhow-shell.js');
var knowhowShell = new KnowhowShell();
var ttyPool = new require('../tty-pool')(2,10);


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

knowhowShell.executeJobWithPool(ttyPool, npmInitJob, function(err) {
	console.log("done...........");
	if (err) {
		console.log(err.message);
		console.log(err.stack);
	}
	console.assertTrue((err),err.message);
});


