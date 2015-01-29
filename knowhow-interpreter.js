var async = require('async');
var _ = require('underscore');

var setEnv = function(job, callback) {
	//console.log("setting environment");
	if (!job || !job.script) {
		callback(new Error("no job defined"));
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
	//job.script.env.PS1=knowhowShellPrompt;
	//job.script.env.PROMPT_COMMAND=knowhowShellPromptCommand;
	
	//add the process.env to job.env
	//for (envVar in process.env) {
	//	if (!job.script.env[envVar]) {
	//		job.script.env[envVar] = process.env[envVar];
	//	}
	//}

	
	replaceVar = function(regEx,searchString, rvCB) {

			if (!searchString) {
				return searchString;
			}
	    	
		    var iteration=0;
		    var replacedString = String(searchString);
		   	//console.log("executing: "+regEx+" on "+replacedString);
			var res = replacedString.match(regEx);
			var recurse = undefined;
			//console.log("res="+res);
			if (res && res != null) {
				 for (i=0; i < res.length; i++) {
			        var replaceVal = res[i];
			        //console.log("repalceVal="+replaceVal);
			        if (replaceVal) {
				        var varName = replaceVal.replace('{','').replace('}','').replace('$','');
				        var value = job.script.env[varName];
				    	if (!value) {
				    		console.error("invalid variable: "+varName);
				    		rvCB(new Error("invalid variable: "+varName));
				    		return searchString;
				    	}
				    	console.log("replaceVal="+replaceVal+" value="+value);
				    	replacedString=replacedString.replace(replaceVal,value);
				    	console.log("replacedString="+replacedString+" "+replaceVal);
				    }
			      }
			      var otherMatches = replacedString.match(regEx);
			      //console.log(otherMatches);
			      if (otherMatches && otherMatches !=null) {
			      	  recurse = true;
				      async.each(otherMatches, function(match, omcb) {
				      	var envVariable = match.replace('\${','').replace('}','');
				 		//console.log("replacing value: "+envVariable);
				 		//console.log("replacing other match: "+replacedString+" "+envVariable);
				 		
				      	replaceVar(regEx, replacedString, function (err, newString) {
				      		replacedString = newString;
				      		omcb();
				      	});

				      }, function(err) {
				      	if(err) {
				      		console.log(err.message);
				      		console.log(err.stack);
				      		if (rvCB) {
				      			rvCB(err);
				      		}
				      		return;
				      	}
				      	rvCB(undefined,replacedString);
				      });
				  }
			}
			if (!recurse && rvCB) {
				rvCB(undefined,replacedString);
			}
			return replacedString;
			
	};
	var dollarRE = /\$\w+/g;
	var dollarBracketRE = /\${\w*}/g;
	executeReplaceVars = function(value,ervcb) {
		if (!value) {
			ervcb();
			return;
		}
		replaceVar(dollarRE,value, function(err,dreplacedString) {
			if (err) {
				console.log(err.message);
				console.log(err.stack);
				if (ervcb) {
					ervcb(err);
				}
				return;
			}
			replaceVar(dollarBracketRE,dreplacedString, function(err,dsreplacedString) {
				if (err) {
					console.log(err.message);
					console.log(err.stack);
					if (ervcb) {
						ervcb(err);
					}
					return;
				}
				value = dsreplacedString;
				//console.log(dsreplacedString);
				if (ervcb) {
					ervcb(undefined, dsreplacedString);
				}
				return value;
			});
		});
	}

	

	
		async.series([
			
			function(cb) {
				var index=0;
				async.eachSeries(Object.keys(job.script.env), function(variable, ecb) {
					job.script.env[index++] = executeReplaceVars(job.script.env[variable],ecb);
				}, function(err) {
					if (err) {
						cb(err);
					} else {
						cb();
					}
				});
			}, function (cb) {
				//console.log("replacing shell vars");

				if (job.shell) {
					index=0;
					//console.log(job.shell.args);
					if (job.shell.args) {
						async.eachSeries(job.shell.args, function(arg, acb) {
							index = job.shell.args.indexOf(arg);
							//console.log("arg="+arg+" index="+index);
							 executeReplaceVars(arg,function (err, val) {
							 	job.shell.args[index] = val;
								acb();
							});
						}, function(err) {
							if (err) {
								console.error(err.message);
								console.log(err.stack);
								cb(err);
								return;
							} 
						});
					}
					if (job.shell.command) {
						executeReplaceVars(job.shell.command,function(err,val) {
							job.shell.command = val;
						});
					}
					cb();
				} else {
					cb();
				}
			}, function (cb) {
				if (job.shell && job.shell.onConnect ) {
					executeReplaceVars(job.shell.onConnect.command, function(err,val) {
						if (err) {
							callback(err);
						} else {
							job.shell.onConnect.command = val;
							//console.log("job.shell.onConnect.command="+job.shell.onConnect.command);
							executeReplaceVars(job.shell.onConnect.waitForPrompt, function(err, val2) {
								if (err) {
									callback(err);
								} else {
							 		job.shell.onConnect.waitForPrompt = val2;
							 		if (job.shell.onConnect.responses) {
										async.eachSeries(Object.keys(job.shell.onConnect.responses), function( response, rcb) {
											executeReplaceVars(job.shell.onConnect.responses[response],function(err,val) {
												job.shell.onConnect.responses[response] = val;
												rcb();
											});
											//console.log("job.shell.onConnect.responses."+response+"="+job.shell.onConnect.responses[response]); 
										}, function(err) {
											if (err) {
												cb(err);
												return;
											}
											cb();
										});
									} else {
										cb();
									}
							 	}
							 	//console.log("waitForPrompt ="+job.shell.onConnect.waitForPrompt);
							});
						}
					});
					
					
				} else {
					//console.log("job.shell.onConnect.command="+job.shell.onConnect.command);
					cb();
				}
		}, function (cb) {
			if (job.shell && job.shell.onExit) {
					executeReplaceVars(job.shell.onExit.command, function (err, val) {
						if (err) {
							cb(err);
						} else {
							job.shell.onExit.command = val;
							executeReplaceVars(job.shell.onExit.waitForPrompt, function(err, val) {
								if (err) {
									cb(err);
								} else {
									job.shell.onExit.waitForPrompt = val;
									if(job.shell.onExit.responses) {
										async.eachSeries(Object.keys(job.shell.onExit.responses), function( response, rcb) {
											executeReplaceVars(job.shell.onExit.responses[response],rcb, function(err, val) {
												job.shell.onExit.responses[response] = val;
												rcb();
											});
										}, function(err) {
											if (err) {
												cb(err);
											}
											cb();
										});
									} else {
										cb();
									}
								}
							});
						}
					});
				} else {
					cb();
				}
			}, function(cb) {
			
				try{
				
					for (commandIndex in job.script.commands) {
						var command = job.script.commands[commandIndex];
						if (command.responses) {
							async.each(Object.keys(command.responses), function( response, rcb) {
								executeReplaceVars(job.script.commands[commandIndex].responses[response],function(err, val) {
									job.script.commands[commandIndex].responses[response]=val;
									rcb();
								});
							}, function(err) {
								if (err) {
									cb(err);
								} 
							});
						}

					}
					cb();
				} catch (err) {
					cb(err);
				}
			}
		], function(err) {
			if (err) {
				console.log(err.message);
				console.log(err.stack);
				if(callback) {
					callback(err);
				}
				return;
			} else {
				//console.log("env completed");
				if(callback) {
					callback();
				}
			}
		});

		
 };
 
 exports.setEnv = setEnv;