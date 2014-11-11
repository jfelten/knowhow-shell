

# knowhow-shell
knowhow-shell is an interpreter that runs script based jobs with a full tty.  When automating there are certain programs such as ssh that need a tty, and don't work well by spawing a child process.  Fortunately there is a nifty project called pty.js that exposes a tty as a read and write streams that is the basis for this project.  All jobs are represented as a knowhow job json object, which is mostly self explanatory.  To emulate unix expect functionality simply define a repsonses section in each command:

    {
      command: 'git clone $REPO_TO_CLONE $CHECKOUT_DIR',
      responses: {
       'password': '$GIT_PASSWORD'
      }
    }

This will send the string $GIT_PASSWORD to the terminal when prompted with a string that matches 'password'.

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
    var KnowhowShell = require('../knowhow-shell.js');
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


## Developing



### Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.
