var pty = require('pty.js');
var async = require('async');
var process = require('process');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

var retCodeRE = /ret code:\d+/;

var jobsInProgress = {};

var cancelJob = function(job) {
	if (jobsInProgress[job.id] && jobsInProgress[job.id].term) {
		jobsInProgress[job.id].term.exit();
		delete jobsInProgress[job.id];
	}	
};

var executeJob = function(job, callback) {
	setEnv(job);
	var scriptRuntime = {	
		currentStep: 0,
		output: '',
		progressStepLength: Math.floor(100/job.script.commands.length)
	};
	
	var term = pty.spawn('bash', [], {
	  name: 'xterm-color',
	  cols: 80,
	  rows: 30,
	  cwd: job.working_dir,
	  env: job.script.env
	});
	
	console.log(term.process);
	var currentCommand;	
	term.on('data', function(data) {
		if (data) {
	  	  //console.log(data);
	  	  output=data.split(retCodeRE)[0];
	  	  if (output) {
	  	  	scriptRuntime.output+=output
	  	  	scriptRuntime.currentCommand.output+=output;
	  	  }
		  if (scriptRuntime.currentCommand.responses) {
		  	for (response in scriptRuntime.currentCommand.responses) {
		  		var re = new RegExp(response,"g");
		  		if (data.match(response)) {
		  			//console.log("response: "+response+" "+scriptRuntime.currentCommand.responses[response]);
		  			term.write(scriptRuntime.currentCommand.responses[response]+"\r");
		  		}
		  	}
		  }
		  
		  if (data.match(retCodeRE)) {
		  	
		  	scriptRuntime.currentCommand.returnCode = data.match(retCodeRE)[0].split(":")[1];
		  	//console.log('return code: '+scriptRuntime.currentCommand.returnCode);
		  	if (scriptRuntime.currentCommand.returnCode != 0) {
		  		eventEmitter.emit('execution-error',scriptRuntime.currentCommand);
		  		scriptRuntime.currentCommand.callback(new Error(scriptRuntime.currentCommand.output));
		  	} else {
		  		eventEmitter.emit('execution-complete', scriptRuntime.currentCommand);
		  		scriptRuntime.currentCommand.callback();
		  	}
		  	job.progress=scriptRuntime.currentStep*scriptRuntime.progressStepLength;
		  	job.status = 'completed: '+scriptRuntime.currentCommand
		  	eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});
		  }
		}
	  
	});
	term.on('error', function(err) {
		//console.log(err.message);
		clearInterval(progressCheck);
		term.end();
		if (callback) {
			callback(err, scriptRuntime);
		}
	});
	var progressCheck = setInterval(function() {
	    job.progress++;
	    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});

	},5000);
	//console.log(job);
	async.eachSeries(job.script.commands, function(command,callback) {
		scriptRuntime.currentStep++;
		//console.log(command);
		command.callback = callback;
		command.output = '';
		scriptRuntime.currentCommand = command;
		term.write(command.command+'; echo "ret code:"$?\r');
		//term.write("wait | echo \"D_O_N_E: "+currentCommand.command+'\r');
	    }.bind({scriptRuntime: scriptRuntime}), 
	    function(err) {
	    	if (err) {
				job.progress=0;
				job.status=err.message;
				eventEmitter.emit('job-error',job);
				clearInterval(progressCheck);
				term.end();
				if (callback) {
					callback(err, scriptRuntime);
				}
				return;
			}
			job.progress=0;
			job.status=job.id+" complete";
			eventEmitter.emit("job-complete", job);
			delete scriptRuntime.currentCommand;
			clearInterval(progressCheck);
	        //logger.info("done");
	    	term.end();
	    	if (callback) {
				callback(undefined, scriptRuntime);
			}
		}
	    	
	 );
	 
}

var setEnv = function(job) {

	if (!job || !job.script) {
		return;
	}
	if (!job.script.env) {
		job.script.env = {};
	}
	if (job.working_dir) {
 		job.script.env["working_dir"]=job.working_dir;
 	} else {
 		job.script.env["working_dir"]='./';
 	}
	
	//add the process.env to job.env
	for (envVar in process.env) {
		if (!job.script.env[envVar]) {
			job.script.env[envVar] = process.env[envVar];
		}
	}

	
	replaceVar = function(regEx,varName, searchString) {
		    var iteration=0;
		    var replacedString = searchString;
			while( res = regEx.exec(replacedString) ){
				 for (i=0; i < res.length; i++) {
			        var replaceVal = res[i];
			    	var value = job.script.env[replaceVal.replace('\${','').replace('}','')];
			    	//console.log("replaceVal="+replaceVal+" value="+value);
			    	replacedString=searchString.replace(replaceVal,value);
			      }
			      var otherMatches = regEx.exec(job.script.env[varName]);
			      for (index in otherMatches)
			      {
			      	var envVariable = otherMatches[index].replace('\${','').replace('}','');
			 		//console.log("replacing value: "+envVariable);
			      	job.script.env[varName] = replaceVar(regEx, envVariable, job.script.env[envVariable]);
			      }
			}
			//console.log("converted: "+searchString+" to: "+replacedString+" using: "+regEx);
			return replacedString;
			
		};

	for (envVar in job.script.env) {
	    var envVarValue = job.script.env[envVar];
	    //replace env_var references in values
	    
		
		var dollarRE = /\$\w+/g;
		var dollarBracketRE = /\${\w*}/g;
		for (variable in job.script.env) {
			job.script.env[variable] = replaceVar(dollarRE,variable,job.script.env[variable]);
			job.script.env[variable] = replaceVar(dollarBracketRE,variable,job.script.env[variable]);
			//console.log(variable+'='+job.script.env[variable])
		}
		
		for (commandIndex in job.script.commands) {
			var command = job.script.commands[commandIndex];
			for (response in command.responses) {
				command.responses[response] =  replaceVar(dollarRE,variable,command.responses[response]);
				command.responses[response] =  replaceVar(dollarBracketRE,variable,command.responses[response]);
				//console.log('repsonse: '+response+'='+command.responses[response]);
			}
		}
	
		//logger.info(envVar+'='+envVars[envVar]);
		//env[envVar] = envVars[envVar];
		
	}
 };

function KnowhowShell() {

}

KnowhowShell.prototype.cancelJob = cancelJob;
KnowhowShell.prototype.executeJob = executeJob;
KnowhowShell.eventEmitter = eventEmitter;
KnowhowShell.prototype.addListener =
KnowhowShell.prototype.on = function(type, func) {
	eventEmitter.on(type, func);
	return this;
};

module.exports = exports = KnowhowShell;
exports.KnowhowShell = KnowhowShell;

