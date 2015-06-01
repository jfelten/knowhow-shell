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
		term.end();
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
		delete jobsInProgress[jobId];
		callback(err, scriptRuntime);

	});
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