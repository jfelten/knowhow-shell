

# knowhow-shell
knowhow-shell is an interpreter that runs script based jobs with a full tty.  When automating there are certain programs such as ssh that need a tty, and don't work well by spawing a child process.  Fortunately there is a nifty project called [pty.js](https://github.com/chjj/pty.js) that exposes a tty as a read and write streams that is the basis for this project.  All jobs are represented as a knowhow job json object, which is mostly self explanatory.  To emulate unix expect functionality simply define a repsonses section in each command:

    {
      command: 'git clone $REPO_TO_CLONE $CHECKOUT_DIR',
      responses: {
       'password': '$GIT_PASSWORD'
      }
    }

This will send the string $GIT_PASSWORD to the terminal when prompted with a string that matches 'password'.

# Installation

    npm install knowhow-shell

# Usage

Define a job and use the execute job method.  The following events are exposed: 'command-complete','job-complete', 'job-error', 'job-update'.  Also, job.progress is updated at minimum of each 5 seconds for tracking the progress of script.  The script output is captured in the job-complete event.

    cloneRepoJob = { 
     "id": "clone kniowhow-examples GIT repo",
     "working_dir": "./",
     "options": {
      "timeoutms": 3600
    },
    "script": {
     "env": {
      REPO_TO_CLONE: 'https://github.com/jfelten/knowhow_example_repo.git',
      CHECKOUT_DIR: '${working_dir}/knowhow_example_repo',
      GIT_PASSWORD: 'MY_PASSWORD'
    },
    commands: [
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
    var KnowhowShell = require('knowhow-shell.js');
    var knowhowShell = new KnowhowShell();
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

## another example

This is another example take from: [node-suppose](https://github.com/jprichardson/node-suppose), which did not work for our purposes due to the lack of a tty.

    npmInitJob = { 
        "id": "npm init job",
        "working_dir": "./",
        "options": {
            "timeoutms": 3600
        },
        "files": [],
        script: {
            "env": {
                PATH: '/opt/local/bin:/opt/local/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
                PROJECT_DIR: '${working_dir}/npmTest',
                NAME: 'knowhow_project',
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
    var KnowhowShell = require('../knowhow-shell.js');
    var knowhowShell = new KnowhowShell();
    var assert = require('assert');
    knowhowShell.executeJob(npmInitJob, function(err) {
        assert.ifError(err);
    });

## A more interesting example - opening an SSH terminal

By default knowhow-shell will open a host's bash shell, but it is possible to specify other programs like SSH. This is done by specifying the shell element.  This example job will open an ssh session to MY_USER@MY_HOST, login with MY_PASSWORD, and execute a couple commands.  To use change the values of MY_USER, MY_PASSWORD, and MY_HOST under job.script.env to your specific values.   Change job.shell.waitForPrompt if necessary to your system's prompt.  Specifying this value tells the shell to wait until login is complete before executing the script.

    { 
        "id": "example ssh interactive shell",
         "working_dir": "./",
        "shell": {
            "command": "ssh",
            "args": [
                "${USER}@${HOST}"
            ],
            "onConnect" : {
                "responses": {
                    "password": "${PASSWORD}" 
                },
            "waitForPrompt" : "[$]"
            },
        },
        "waitForPrompt" : "[$]",
    },
    "options": {
        "timeoutms": 3600
    },
    "files": [],
    script: {
        "env": {
      		USER: 'MY_USER',
      		PASSWORD: 'MY_PASSWORD',
      		HOST: 'MY_HOST',
    	},
    	commands: [
    	   {
    	    command: 'ls'
    	   },
    	   {
    	    command: 'pwd'
    	   }
    	 ] 
    }
    }

## Developing



### Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.
