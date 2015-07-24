var pty = require('pty.js');
var async = require('async');
var process = require('process');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var knowhowInterpreter = require('./knowhow-interpreter');


var jobsInProgress = {};
var jobCounter = 0;

var cancelJob = function(job) {
	if (job) {
		if (job.subProcess) {
			job.subProcess.kill('SIGTERM');
		}
		if (jobsInProgress[job.id] && jobsInProgress[job.id].job && jobsInProgress[job.id].job.timeout) {
			clearTimeout(jobsInProgress[job.id].job.timeout);
		}
		if (jobsInProgress[job.id] && jobsInProgress[job.id].job && jobsInProgress[job.id].job.progressCheck) {
			clearInterval(jobsInProgress[job.id].job.progressCheck);
		}
		if (job && job.id) {
	
			delete jobsInProgress[job.id];
		}
		if (job && job.id && jobsInProgress[job.id] && jobsInProgress[job.id].term) {
			console.log("ending shell for "+job.id);
			//jobsInProgress[job.id].term.removeAllListeners();
			//jobsInProgress[job.id].term.exit();
		}	
	}
};

/**
 * Executes a job on a tty that is created and destroyed after the job is complete
 */
var executeJob = function(job, callback) {
	var shell="bash";
	var args = [];
	var term = pty.spawn(shell, args, {
		  name: 'xterm-color',
		  cols: 80,
		  rows: 30,
		  cwd: job.working_dir,
		  env: job.script.env
		});
	term.write('\r');
	var jobId = job.id+jobCounter++;
	if (job.options && job.options.outputToConsole) {
		console.log(term.process);
	}
	var timeoutms = 120000;
	if (job.options && job.options.timeoutms) {
		timeoutms = job.options.timeoutms;
	}
	job.timeout = setTimeout(function() {
		if (job.progressCheck) {
			clearInterval(job.progressCheck);
		}
		job.status='Timed out';
		
		term.destroy();
		if (job.progressCheck) {
			clearInterval(job.progressCheck);
		}
		if (callback) {
			callback(new Error("timed out: "+job.id), undefined);
		}
		eventEmitter.emit('job-error',job);
	},timeoutms);
	job.progress=1;
	job.progressCheck = setInterval(function() {
		    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress++});
			
		},5000);
	jobsInProgress[jobId] = job;
	
	knowhowInterpreter.executeJobOnTerm(term, job, eventEmitter, function(err, scriptRuntime) {

		
		term.end();
		term.destroy();
		term._close();
		clearTimeout(job.timeout);
		clearInterval(job.progressCheck);
		//delete job.timeout;
		//delete job.progressCheck;
		delete job.subprocess;
		job.scriptRuntime = scriptRuntime;
		if (!err) {
			eventEmitter.emit("job-complete", job);
		}
		delete jobsInProgress[jobId];
		callback(err, scriptRuntime);

	});
}


/**
 * Executes a job as a subprocess instead of in the main event loop.  This method shoul be used when running multiple knowhow jobs simultaneously,
 * because pty.js is not thread safe within the node event loop.  We have found that pty.js does not always clean up 
 * properly after ending, which leads to resource/memory leaks.  Executing in a separate process allows us to contain this.
 *
 * @param job the job to execute
 */
var executeJobAsSubProcess = function(job, callback) {

	var cp = require('child_process');
	delete job.scriptRuntime;
	console.log(job);
	job.callback = callback;
	var subprocess = cp.fork(__dirname+'/execJob.js',[JSON.stringify(job)]);
	job.subProcess = subprocess;
	jobsInProgress[job.id] = job;
	
	subprocess.on('exit', function(code, signal) {
		
		if (code && code >0) {
			job.message="job process terminated with error";
			eventEmitter.emit('job-error', job);
		}
	}); 
	var events = ['job-complete', 'job-error', 'job-cancel', 'job-update', 
	'execution-start', 'execution-error','execution-password-prmopt', 'execution-complete', 'execution-output'];

	
	/**
	 * listen for and remit subprocess events
	 */
	var listenForSubProcessEvents = function(subProcess, events) {
		subProcess.on('message', function(data) {
			var eventType = data.eventType;
			console.log("eventType="+eventType);
			console.log(data);
			if (eventType =='subprocess-complete') {
				
				if (job.timeout) {
					clearTimeout(job.timeout);
				}
				if (job.progressCheck) {
					clearInterval(job.progressCheck);
				}
				if (job.subProcess) {
					job.subProcess.kill('SIGTERM');
				}
				//delete job.timeout;
				//delete job.progressCheck;
				delete job.subProcess;
				//eventEmitter.emit("job-complete", data);
				if (job.callback) {
					delete job.callback;
					callback(undefined, data);
				}
			} else if (eventType =='execution-error' || eventType =='job-error' || eventType =='job-cancel' ){
				if (job.timeout) {
					clearTimeout(job.timeout);
				}
				if (job.progressCheck) {
					clearInterval(job.progressCheck);
				}
				if (job.subProcess) {
					job.subProcess.kill('SIGTERM');
				}
				//delete job.timeout;
				//delete job.progressCheck;
				delete job.subProcess;
				if (job.callback)  {
					delete job.callback;
					if (data.output) {
					  callback(new Error("job error: "+data.output), data);
					 }
					 else if (data.status) {
					 	callback(new Error("job error: "+data.status), data);
					 }
					 else {
					 	callback(new Error(job.id+" "+eventType), data);
					 }
				}
			}
			if (eventType =='execution error') {
				job.status="ERROR";
				eventEmitter.emit('job-error', job);
			}
			//console.log("eventType="+data.eventType);
			//console.log(data);
			//delete data.eventType;
			eventEmitter.emit(eventType, data);
		});
	};
	listenForSubProcessEvents(subprocess,events);
	

}

/**
 * Executes a job and uses a tty from a tty pool
 * @param ttyPool the terminam pool to use
 * @param job the job to execute
 * @param callback
 */
var executeJobWithPool = function(ttyPool, job, callback) {
	ttyPool.acquire( function(err, term) {
	
		var timeoutms = 120000;
		if (job.options && job.options.timeoutms) {
			timeoutms = job.options.timeoutms;
		}
		var timeout = setTimeout(function() {
			//if (progressCheck) {
			//	clearInterval(progressCheck);
			//}
			job.status='Timed out';
			eventEmitter.emit('job-error',job);
			term.end();
			if (callback) {
				callback(new Error("timed out: "+job.id), undefined);
			}
		},timeoutms);
		progressCheck = setInterval(function() {
		    job.progress++;
		    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});
	
		},5000);
		job.progressCheck = progressCheck;
		console.log("term="+term);
		jobsInProgress[job.id] = job;
		knowhowInterpreter.executeJobOnTerm(term, job, eventEmitter, function(err, scriptRuntime) {
			
			job.scriptRuntime = scriptRuntime;
			if (err) {
				cancelJob(job);
				callback(err, scriptRuntime);
				//eventEmitter.emit("job-error", job);
				return;
			}else {	
				callback(undefined, scriptRuntime);
			}
			clearTimeout(timeout);
			clearInterval(progressCheck);
			delete job.timeout;
			delete job.progressCheck;
			delete job.subprocess;
			eventEmitter.emit("job-complete", job);
			term.removeAllListeners();
			ttyPool.release(term);
			delete jobsInProgress[job.id];
		});
	});
}

/**
 * Convenience method for executing a single command for those who don't
 * want to complexity of creating their own jobs
 */
var executeSingleCommand = function(command, callback) {
	
	var jobSkeleton = {
	  "id": "KH execute single command",
	  "working_dir": "/tmp/KHAgent",
	  "options": {
	    "timeoutms": 40000,
	    "noEcho": true
	  },
	  "files": [],
	  "script": {
	    "env": {
	      "PATH": '/opt/local/bin:/opt/local/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
	    },
	    "commands": [
	    ]
	  }
	}

	if (!command.command) {
		command = { command: command};
	}
	jobSkeleton.script.commands.push(command);
	executeJobAsSubProcess(jobSkeleton, function(err, jobRuntime) {
		if(err) {
			console.error("error execing: "+command.command+" "+err.message);
			callback(err);	
			
		} else {
			callback(undefined, jobRuntime.scriptRuntime.completedCommands[0]);
		}
	});

}
exports.executeSingleCommand = executeSingleCommand;

function KnowhowShell(passedInEmitter) {
	
	self = this;
	if (passedInEmitter) {
		eventEmitter = passedInEmitter;
	}
	self.cancelJob = cancelJob;
	self.executeJob = executeJob;
	self.executeJobAsSubProcess = executeJobAsSubProcess;
	self.executeJobWithPool = executeJobWithPool;
	self.executeSingleCommand = executeSingleCommand;
	self.eventEmitter = eventEmitter;
	self.jobsInProgress = jobsInProgress;
	self.addListener =
	self.on = function(type, func) {
		eventEmitter.on(type, func);
		return this;
	};
	
	return self;
}

KnowhowShell.prototype.cancelJob = cancelJob;
KnowhowShell.prototype.executeJob = executeJob;
KnowhowShell.prototype.executeJobAsSubProcess = executeJobAsSubProcess;
KnowhowShell.prototype.executeJobWithPool = executeJobWithPool;
KnowhowShell.prototype.executeSingleCommand = executeSingleCommand;
KnowhowShell.eventEmitter = eventEmitter;
KnowhowShell.jobsInProgress = jobsInProgress;
KnowhowShell.prototype.addListener =
KnowhowShell.prototype.on = function(type, func) {
	eventEmitter.on(type, func);
	return this;
};

module.exports = exports = KnowhowShell;
exports.KnowhowShell = KnowhowShell;