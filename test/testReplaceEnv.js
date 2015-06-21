var KnowhowShell = require('../knowhow-shell.js');
var knowhowShell = new KnowhowShell();

var testJob = {
  "id": "update KH Agent to latest",
  "working_dir": "./",
  "options": {
    "timeoutms": 360000
  },
  "files": [],
  "script": {
    "env": {
      "KH_SERVER": "http://master102:3001",
      "AGENT": "{\\\"user\\\": \\\"${agent_user}\\\", \\\"password\\\": \\\"${agent_password}\\\", \\\"host\\\": \\\"${agent_host}\\\", \\\"port\\\":${agent_port}}"
    },
    "commands": [

      {
        "command": "echo \"KHCommand resetAgent ${KH_SERVER} \"${AGENT}\"\""
      }
    ]
  },
  "env": 
   {
   	"agent_user": 'johnfelten',
     "agent_password": undefined, 
   	"agent_host": 'Johns-MacBook-Pro.local',
     "agent_port": 3141 
   }
};

knowhowShell.executeJobAsSubProcess(testJob, function(err, job) {
	if (err) {
		console.log(err.message);
		console.log(err.stack);
		//throw err;
	}
	console.log("job success!!");
	console.log(job.scriptRuntime.completedCommands[0]);
	
});

