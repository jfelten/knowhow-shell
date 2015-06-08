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

	console.log(term.process);
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
		term.destroy();
		if (job.progressCheck) {
			clearInterval(job.progressCheck);
		}
		if (callback) {
			callback(new Error("timed out: "+job.id), undefined);
		}
	},timeoutms);
	job.timeout=timeout;
	progressCheck = setInterval(function() {
		    job.progress++;
		    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});
			
		},5000);
	job.progressCheck = progressCheck;
	jobsInProgress[jobId] = job;
	
	knowhowInterpreter.executeJobOnTerm(term, job, eventEmitter, function(err, scriptRuntime) {

		
		term.end();
		term.destroy();
		term._close();
		clearTimeout(timeout);
		clearInterval(progressCheck);
		delete job.timeout;
		delete job.progressCheck;
		delete job.subprocess;
		eventEmitter.emit("job-complete", job);
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
	
	var subprocess = cp.fork(__dirname+'/execJob.js',[JSON.stringify(job)]);
	var events = ['job-complete', 'job-error', 'job-cancel', 
	'execution-start', 'execution-error','execution-password-prmopt', 'execution-complete'];

	
	/**
	 * listen for and remit subprocess events
	 */
	var listenForSubProcessEvents = function(subProcess, events) {
		subProcess.on('message', function(data) {
			var eventType = data.eventType;
			if (eventType =='subprocess-complete') {
				
				clearTimeout(job.timeout);
				clearInterval(job.progressCheck);
				delete job.timeout;
				delete job.progressCheck;
				delete job.subprocess;
				eventEmitter.emit("job-complete", job);
				if (callback) callback(undefined, job);
			} else if (eventType =='job-error' || eventType =='job-cancel' ){
				clearTimeout(job.timeout);
				clearInterval(job.progressCheck);
				delete job.timeout;
				delete job.progressCheck;
				delete job.subprocess;
				if (callback) callback(new Error("job error: "+job.status));
			}
			//console.log("eventType="+data.eventType);
			//console.log(data);
			//delete data.eventType;
			eventEmitter.emit(eventType, data);
		});
	};
	listenForSubProcessEvents(subprocess,events);
	

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
		term.destroy();
		if (job.progressCheck) {
			clearInterval(job.progressCheck);
		}
		if (callback) {
			callback(new Error("timed out: "+job.id), undefined);
		}
	},timeoutms);
	job.timeout=timeout;
	progressCheck = setInterval(function() {
		    job.progress++;
		    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});
			
		},5000);
	job.progressCheck = progressCheck;
	job.subProcess = subprocess;
	jobsInProgress[job.id] = job;
	

	

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
			if (err) {
				cancelJob(job);
				callback(err, scriptRuntime);
			}	else {	
				
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


function KnowhowShell(passedInEmitter) {
	if (passedInEmitter) {
		eventEmitter = passedInEmitter;
	}
}

KnowhowShell.prototype.cancelJob = cancelJob;
KnowhowShell.prototype.executeJob = executeJob;
KnowhowShell.prototype.executeJobAsSubProcess = executeJobAsSubProcess;
KnowhowShell.prototype.executeJobWithPool = executeJobWithPool;
KnowhowShell.eventEmitter = eventEmitter;
KnowhowShell.jobsInProgress = jobsInProgress;
KnowhowShell.prototype.addListener =
KnowhowShell.prototype.on = function(type, func) {
	eventEmitter.on(type, func);
	return this;
};

module.exports = exports = KnowhowShell;
exports.KnowhowShell = KnowhowShell;