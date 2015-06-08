/**
 * Executes a knowhow Job
 */
 
var KnowhowShell = require('./knowhow-shell.js');
var knowhowShell = new KnowhowShell();
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();


exports.executeJob = function(job) {

	knowhowShell.executeJob(npmInitJob, function(err) {
		console.log("done...........");
		if (err) {
			console.log(err.message);
			console.log(err.stack);
			throw err;
		}
		
	});
	
}

var events = ['job-complete', 'job-error', 'job-cancel','execution-start', 'execution-error','execution-password-prompt', 'execution-complete'];

/**
 * listens for and rebroadcast 
 */
var listenForEvents = function(knowhowShell,events) {
	for (index in events) {
		var event = events[index];
		console.log(event);
		knowhowShell.on(event, function(data) {
			console.log("EVENT: "+this.event);
			data.eventType = this.event;
			//console.log(data);
			process.send(data);
		}.bind({event:event}));
	}
}


console.log("starting...");

if (!process.argv[2]) {
	console.error("no job specified");
	process.exit(1);

} else {
	var job = JSON.parse(process.argv[2]);
	var EventEmitter = new EventEmitter();
	listenForEvents(knowhowShell,events);
	knowhowShell.executeJob(job, function(err, completedJob) {
		if(err) {
			throw err;
			process.exit(1);
		}
		console.log(job.id+" subprocess complete");
		job.eventType="subprocess-complete";
		process.send(job);
		process.exit(0);
	});
}