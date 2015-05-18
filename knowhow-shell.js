var pty = require('pty.js');
var async = require('async');
var process = require('process');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var knowhowInterpreter = require('./knowhow-interpreter');


var jobsInProgress = {};


var cancelJob = function(job) {
	if (job) {
		if (jobsInProgress[job.id] && jobsInProgress[job.id].job && jobsInProgress[job.id].job.timeout) {
			clearTimeout(jobsInProgress[job.id].job.timeout);
		}
		if (job && job.id) {
	
			delete jobsInProgress[job.id];
		}
		if (job && job.id && jobsInProgress[job.id] && jobsInProgress[job.id].term) {
			jobsInProgress[job.id].term.exit();
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
	jobsInProgress[job.id] = job;
	
	knowhowInterpreter.executeJobOnTerm(term, job, eventEmitter, function(err, scriptRuntime) {
		if (err) {
			clearTimeout(timeout);
		}
		term.end();
		delete jobsInProgress[job.id];
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
		console.log("term="+term);
		jobsInProgress[job.id] = job;
		knowhowInterpreter.executeJobOnTerm(term, job, eventEmitter, function(err, scriptRuntime) {
			if (err) {
				cancelJob(job);
				ttyPool.release(term);
				callback(err, scriptRuntime);
			}	else {	
				ttyPool.release(term);
				callback(undefined, scriptRuntime);
			}
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