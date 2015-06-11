

# knowhow-shell [![Build Status](https://travis-ci.org/jfelten/knowhow-shell.svg?branch=master)](https://travis-ci.org/jfelten/knowhow-shell)
knowhow-shell is an interpreter that runs script based jobs with a full tty.  When automating there are certain programs such as ssh that need a tty, and don't work well by spawing a child process.  Fortunately there is a nifty project called [pty.js](https://github.com/chjj/pty.js) that exposes a tty as a read and write streams that is the basis for this project.  All jobs are represented as a knowhow job json object, which is mostly self explanatory.  To emulate unix expect functionality simply define a repsonses section in each command:

    {
      command: 'git clone $REPO_TO_CLONE $CHECKOUT_DIR',
      responses: {
       'password': '$GIT_PASSWORD'
      }
    }

This will send the string $GIT_PASSWORD to the terminal when prompted with a string that matches 'password'.

NOTE - incompatible with node 0.11.x  ( verified working in 0.10.x and 0.12.x)  See [joyent#8468](https://github.com/joyent/node/issues/8468)

# Installation

    npm install knowhow-shell
    
# Installation

    npm install knowhow-shell
    
## Simple Usage - executing a single command

If you just want to execute a command without learning knowhow job there is a simple interface:

		var KnowhowShell = require('knowhow-shell.js');
		var knowhowShell = new KnowhowShell();
		
		knowhowShell.executeSingleCommand("node -v", function(err, result) {
			console.log("you are running node version: "+result.output);
		});

For more complex tasks use a command object:

		npmInitCommand = {
				command: 'npm init',
				responses: {
					'name:': "knowhowiscool",
					'version:': "0.0.0",
					'description:': "single command example",
					'entry point:': "",
					'test command:': "",
					'git repository:': "",
					'keywords:': "knowhow",
					'author:': "you",
					'license:': "GPL-3.0+",
					'Is this ok\?': "y"
				}
			};
			
		knowhowShell.executeSingleCommand(npmInitCommand, function(err, result) {
			console.log(result);
		});

# Anatomy of a knowhow job

Knowhow jobs are json objects that define a script to be run and any necessary inputs that are needed.  These objects are then fed into knowhow-shell.executeJob(job, callback) for execution.  Knowhow-shell will trigger a 'job-complete' event when the script is finished with the script output as a variable.  Here is a job marked up with inline explanations of each value:

<samp>
sampleJob = {<br>
&thinsp;"id": "MY_ID",<b>[mandatory] ID of your job,</b><br>
&thinsp;"working_dir": "MY_DIR", <b>where to run this</b><br>
&thinsp;"options": { <b>[optional] define any options here</b><br>
&thinsp;&thinsp;"timeoutms": 3600 <b>job will error out after this time in ms default is 600000</b><br>
&thinsp;},<br>
&thinsp;"shell": { <b>[optional] Default shell is bash, but override here</b><br>
&thinsp;&thinsp;"command": "ssh",  <b>for example ssh</b><br>
&thinsp;&thinsp;"args": [ <b>optional commandline arguments(can also be added to the command line above)</b><br>
&thinsp;&thinsp;&thinsp;"${USER}@${HOST}" <b>We can reference any variables already defined in our script</b><br>
&thinsp;&thinsp;],<br>
&thinsp;&thinsp;"onConnect" : { <b>tell the shell what to do when it connects</b><br>
&thinsp;&thinsp;&thinsp;"responses": { <br>
&thinsp;&thinsp;&thinsp;&thinsp;"[Pp]assword": "${PASSWORD}"  <b>For example send password if asked</b><br>
&thinsp;&thinsp;&thinsp;},<br>
&thinsp;&thinsp;&thinsp;"waitForPrompt" : "[$#]" <b>Wait for the prompt '

 or '#' to appear</b><br>
&thinsp;&thinsp;},<br>
&thinsp;&thinsp;"onExit" : { <b>Add exit behavior here like logging out or closing a session</b><br>
&thinsp;&thinsp;&thinsp;"command": "exit"<br>
&thinsp;}<br>
},<br>
"script": { - <b>[mandatory] Defines the script to be run</b><br>
&thinsp;"env": { <b>[optional]specify any environment variables in the shell here</b><br>
&thinsp;&thinsp;"USER": "VALUE1", <b>set as a shell variable but can also be referenced in job object</b><br>
&thinsp;&thinsp;"PASSWORD": "VALUE2",<b>set as a shell variable but can also be referenced in job object</b><br>
&thinsp;&thinsp;"GIT_PASSWORD": "VALUE3", <b>set as a shell variable but can also be referenced in job object</b><br>
&thinsp;&thinsp;"CHECKOUT_DIR": "VALUE4" <b>set as a shell variable but can also be referenced in job object</b><br>
&thinsp;},<br>
&thinsp;commands: [ <b>Array of commands to execute. Execution starts in ${working_dir}</b><br>
&thinsp;&thinsp;{<br>
&thinsp;&thinsp;&thinsp;command: 'rm -rf ${CHECKOUT_DIR}' <b>first command to execute</b><br>
&thinsp;&thinsp;},<br>
&thinsp;&thinsp;{<br>
&thinsp;&thinsp;&thinsp;command: 'git clone $REPO_TO_CLONE $CHECKOUT_DIR', <b>2nd command to execute</b><br>
&thinsp;&thinsp;&thinsp;responses: { <b>responses is a RegEx/value hash where RegEx is matched to any text in the tty</b><br>
&thinsp;&thinsp;&thinsp;&thinsp;"[Pp]assword": "$GIT_PASSWORD" <b>send $GIT_PASSWORD if prompted with either Password or password</b><br>
&thinsp;&thinsp;&thinsp;}<br>
&thinsp;&thinsp;}<br>
&thinsp;]<br>
&thinsp;}<br>
    };
</samp>

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

By default knowhow-shell will open a host's bash shell, but it is possible to specify other programs like SSH. This is done by specifying the shell element.  This example job will open an ssh session to MY_USER@MY_HOST, login with MY_PASSWORD, and execute a couple commands.  To use change the values of MY_USER, MY_PASSWORD, and MY_HOST under job.script.env to your specific values.   Change job.shell.onConnect.waitForPrompt if necessary to your system's prompt.  Specifying this value tells the shell to wait until login is complete before executing the script.

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

## Getting more sophisticated - Using sudo example with error conditions

We have no control over what the host system will do, and sometimes we need to sense when something has gone wrong.  For example on some systems an invalid password can leave an open prompt forever.  Any command or onConnect may have and "errorConditions" attribute, which is an array of strings to look for when something goes bad.  If any of these strings are detected the job immediately aborts.

    sudoJob = { 
        "id": "run a job as another user",
        "working_dir": "./",
        "shell": {
            "command": "sudo su - ${SUDO_USER}",
            "onConnect" : {
                "responses": {
                    "[Pp]assword": "${PASSWORD}"
                },
                "errorConditions" : ["Sorry","[Dd]enied"],
                "waitForPrompt" : "[$]"
            },
            "onExit" : {
                "command": "exit"
            }
        },
        "options": {
            "timeoutms": 3600
        },
        "files": [],
        script: {
            "env": {
      		    SUDO_USER: 'vip',
      		    PASSWORD: 'password'
    	    },
    	    commands: [
    	        {command: 'ls'},
    	        {command: 'pwd'}
    	    ] 
        }
    }

## [More advanced examples](https://github.com/jfelten/knowhow_example_repo)

## executing as a subprocess vs in the node event loop

		knowhowShell.executeJob will execute within the main nodejs event loop
		knowhowShell.knowhowShellAsSubProcess will spawn a child process and execte the job there
		
Executing as a child process is preferred because pty.js is not thread safe within the node event loop.  This means that if you try to invoke 2 shells problems will occur because of shared state between each pty.js object.  Specifically pty.js objects do not close properly and cause memory leaks.  Executing knowhow jobs in a subprocess eliminates this problem.  The subprocess communicates events back to the main loop so there is no loss of functionality.

## tty pooling

tty objects are heavy and expensive.  Most operating systems limit the number of ttys used simultaneously for good reason.  We also found that pty.js becomes unstable after openiung 50 tty objects.  For this reason we have introduced a tty-pool based on [generic=pool](https://github.com/coopernurse/node-pool).  Jobs work the same way except we use the executeJobWithPool.  The foctory method for TTYPool takes 2 arguments (min, max);

		var KnowhowShell = require('../knowhow-shell.js');
		var knowhowShell = new KnowhowShell();
		var ttyPool = new require('../tty-pool')(2,10); // create pool with a minimum of 2 ttys and a max of 10.
		knowhowShell.executeJobWithPool(ttyPool, myJob, function(err, scriptRuntime) {
			console.log("done...........");
			if (err) {
				console.log(err.message);
				console.log(err.stack);
			}
		});

Please visit the [knowhow example repository project](https://github.com/jfelten/knowhow_example_repo) to see examples of actual production jobs.


