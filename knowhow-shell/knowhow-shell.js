var pty = require('pty.js');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

var retCodeRE = new RegExp("ret code:\d*");
var executionDoneRE = new RegExp("D_O_N_E \d*");

var jobsInProgress = {};

var cancelJob = function(job) {
	if (jobsInProgress[job.id] && jobsInProgress[job.id].term) {
		jobsInProgress[job.id].term.exit();
		delete jobsInProgress[job.id];
	}	
};

var executeJob = function(job) {
	setEnv(job);
	var scriptRuntime = {};	
	scriptRuntime.currentStep=0;
	scriptRuntime.progressStepLength = Math.floor(100/job.script.commands.length);
	
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
  	  //console.log(data);
  	  scriptRuntime.currentCommand.output+=data;
	  if (scriptRuntime.currentCommand.responses) {
	  	for (response in scriptRuntime.currentCommand.responses) {
	  		var re = new RegExp(response,"g");
	  		if (data.match(response)) {
	  			term.write(currentCommand.responses[response]+"\r");
	  		}
	  	}
	  }
	  
	  if (data.match(retCodeRE)) {
	  	scriptRuntime.currentCommand.returnCode = data.match(retCodeRE)[0].split(":")[1];
	  }
	  if (data.match(executionDoneRE)) {
	  	console.log(scriptRuntime.currentCommand.command+": is done");
	  	scriptRuntime.currentCommand.callback();
	  	eventEmitter.emit('execution-complete', currentCommand);
	  	job.progress=scriptRuntime.currentStep*scriptRuntime.progressStepLength;
	  	job.status = 'completed: ;+scriptRuntime.currentCommand
	  	//console.log("progress="+job.progress+" currnetStep: "+scriptRuntime.currentStep+" step length: "+scriptRuntime.progressStepLength);
	    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});
	  } 
	});
	term.on('error', function(data) {
		console.log(data);
		clearInterval(progressCheck);
		term.exit();
	});
	var progressCheck = setInterval(function() {
	    job.progress++;
	    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});

	},5000);
	//console.log(job);
	async.eachSeries(job.script.commands, function(command,callback) {
		scriptRuntime.currentStep++;
		console.log(command);
		command.callback = callback;
		scriptRuntime.currentCommand = command;
		term.write(command.command+' || echo "ret code:"$? && echo \"D_O_N_E\" $?\r');
		//term.write("wait | echo \"D_O_N_E: "+currentCommand.command+'\r');
	    }.bind({scriptRuntime: scriptRuntime}), 
	    function(err) {
	    	if (err) {

				logger.error('job error' + err);
				job.progress=0;
				job.status=err.message;
				eventEmitter.emit('job-error',job);
				clearInterval(progressCheck);
				return;
			}
			job.progress=0;
			job.status=job.id+" complete";
			eventEmitter.emit("job-complete", job);
			delete scriptRuntime.currentCommand;
			clearInterval(progressCheck);
	        //logger.info("done");
	    	term.end();
	    	
	  	}
	 );
	 
}

var setEnv = function(job) {
 	job.script.env["working_dir"]=job.working_dir;
	

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
			//console.log(variable+'='+env[variable])
		}
		
		for (commandIndex in job.script.commands) {
			var command = job.script.commands[commandIndex];
			for (response in command.responses) {
				
				command[response] =  replaceVar(dollarRE,variable,command[response]);
				command[response] =  replaceVar(dollarBracketRE,variable,command[response]);
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

