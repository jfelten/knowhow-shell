var async = require('async');
var _ = require('underscore');
var knowhowShellPrompt= '~~KHshell~~';
var knowhowShellPromptCommand='\'echo "#ret-code:$?"\'';
var retCodeRE = /\#ret-code:\d+/;
var promptRE = /~~KHshell~~/;
//var promptRE = new RegExp(knowhowShellPrompt);

var progressCheck;

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
	for (envVar in process.env) {
		if ((job.script.env && !job.script.env[envVar]) && (job.env && !job.env[envVar])) {
			job.script.env[envVar] = process.env[envVar];
		} else {
			console.log("prepending "+process.env[envVar]+" to: "+envVar);
			if (job.script.env && job.script.env[envVar]) {
				console.log("prepending "+process.env[envVar]+" to: "+envVar);
				job.script.env[envVar] = process.env[envVar]+require("path").delimiter+job.script.env[envVar];
			} else if (job.env && job.env[envVar]) {
				console.log("prepending "+process.env[envVar]+" to: "+envVar);
				job.env[envVar] = process.env[envVar]+require("path").delimiter+job.env[envVar];
			}
		}
	}

	
	replaceVar = function(regEx,searchString, envHash, rvCB) {

			if (!searchString) {
				rvCB(new Error("no search string specified"));
				return;
			}
			if (!envHash) {
				rvCB(undefined, searchString);
				return;
			}
	    	
		    var iteration=0;
		    var replacedString = String(searchString);
		   	//console.log("executing: "+regEx+" on "+replacedString+" "+envHash);
			var res = replacedString.match(regEx);
			var recurse = undefined;
			//console.log("res="+res);
			if (res && res != null) {
				 for (i=0; i < res.length; i++) {
			        var replaceVal = res[i];
			        //console.log("repalceVal="+replaceVal);
			        if (replaceVal) {
				        var varName = replaceVal.replace('{','').replace('}','').replace('$','');
				        var value = envHash[varName];
				    	if (!value) {
				    		console.error("invalid variable: "+varName);
				    		rvCB(new Error("invalid variable: "+varName),searchString);
				    		return searchString;
				    	}
				    	//console.log("replaceVal="+replaceVal+" value="+value);
				    	replacedString=replacedString.replace(replaceVal,value);
				    	//console.log("replacedString="+replacedString+" "+replaceVal);
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
				 		
				      	replaceVar(regEx, replacedString, envHash,function (err, newString) {
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
		//console.log("replacing: "+value);
		replaceVar(dollarRE,value, job.env, function(err,edreplacedString) {
			//if (err) {
			//	console.log(err.message);
			//	console.log(err.stack);
			//	if (ervcb) {
			//		ervcb(err);
			//	}
			//	return;
			//}
			//console.log("replaced string="+edreplacedString);
			replaceVar(dollarRE,edreplacedString,job.script.env, function(err,sdreplacedString) {
				//if (err) {
				//	console.log(err.message);
				//	console.log(err.stack);
				//	if (ervcb) {
				//		ervcb(err);
				//	}
				//	return;
				//}
				//console.log("replaced string="+sdreplacedString);
				replaceVar(dollarBracketRE,sdreplacedString, job.env, function(err,edsreplacedString) {
					//if (err) {
					//	console.log(err.message);
					//	console.log(err.stack);
					//	if (ervcb) {
					//		ervcb(err);
					//	}
					//	return;
					//}
					//console.log("replaced string="+edsreplacedString);
					replaceVar(dollarBracketRE,edsreplacedString,job.script.env, function(err,sdsreplacedString) {
						//if (err) {
						//	console.log(err.message);
						//	console.log(err.stack);
						//	if (ervcb) {
						//		ervcb(err);
						//	}
						//	return;
						//}
						console.log(value+" replaced string="+sdsreplacedString);
						value = sdsreplacedString;
						
						if (ervcb) {
							ervcb(undefined, sdsreplacedString);
						}
						return value;
					});
				});
			});
		});
	}

	

	
		async.series([
			
			function(cb) {
				var index=0;
				async.eachSeries(Object.keys(job.script.env), function(variable, ecb) {
					executeReplaceVars(job.script.env[variable],function(err, value) {
						job.script.env[variable] = value;
						//console.log(variable+"="+job.script.env[variable]);
						ecb();
					});
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
					//console.log("replaced shell variables");
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
									console.log("response: "+response+"="+val);
									rcb();
								});
							}, function(err) {
								if (err) {
									cb(err);
								}  else {
									//cb();
								}
							});
						} else {
							//cb();
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
				console.log("env completed");
				if(callback) {
					callback();
				}
			}
		});

		
 };
 
 exports.setEnv = setEnv;
 
 /**
  * Executes a job on a tty object
  *
  * @param term the pty.js term object
  * @param job the job to execute
  * @param callback
  */
 var executeJobOnTerm = function(term, job, eventEmitter, callback) {
	
	
	setEnv(job, function(err) {
		
		if (err) {
			if (callback) {
				scriptRuntime = {};
				scriptRuntime.output = "Unable to intialize job: err.message";
				callback(err, scriptRuntime);
			}
			return;
		}
		//console.log(job.id+" environment set.");
		
		var shell="bash";
		var args = [];
		var newCommands1 = new Array(job.script.commands.length+2);
		newCommands1[0] ={
			"command" : "PS1="+knowhowShellPrompt+"; PROMPT_COMMAND="+knowhowShellPromptCommand
		};
		newCommands1[1] = {command: ""};
		for (env in job.script.env) {
			if (env && env != '' && job.script.env[env] && job.script.env[env] !='') {
				newCommands1[1].command+=env+'=\"'+job.script.env[env]+"\"";
				if (newCommands1[1].command.slice(-1)!=';') {
					newCommands1[1].command+='; ';
				}
			}
		}
		for (index = 0; index < job.script.commands.length; index++) {
			newCommands1[index+2]=job.script.commands[index];
		}
		job.script.commands = newCommands1;
		if (job.shell && job.shell.command) {
			shellCommand=job.shell;
			if (job.shell.args) {
				for (index in job.shell.args) {
					shellCommand.command+=" "+job.shell.args[index];
				}
			}
			
			job.script.commands = newCommands1;
			
			if (job.shell.onConnect) {
				if (job.shell.onConnect.waitForPrompt) {
					if (!job.shell.onConnect.responses) {
						job.shell.onConnect.responses = {};
					}
					job.shell.onConnect.responses[job.shell.onConnect.waitForPrompt] = "#ret-code:0";
				}
				if (job.shell.onConnect.errorConditions) {
					shellCommand.errorConditions = job.shell.onConnect.errorConditions;
				}
				shellCommand.responses = job.shell.onConnect.responses;
			}

			newCommands = new Array(job.script.commands.length+2);
			newCommands[0] = job.script.commands[0];
			newCommands[1] = shellCommand;
			newCommands[2] ={
				"command" : "PS1="+knowhowShellPrompt+"; PROMPT_COMMAND="+knowhowShellPromptCommand
			};
			for (index = 1; index < job.script.commands.length; index++) {
				//console.log(index+" "+job.script.commands[index].command);
				newCommands[index+2]=job.script.commands[index];
			}
			job.script.commands = newCommands;
			
		}
		var scriptRuntime = {	
			currentStep: 0,
			output: '',
			progressStepLength: Math.floor(100/job.script.commands.length)
		};
				
		var currentCommand;	
		term.on('data', function(data) {
			
			if (data) {
				//if (scriptRuntime.currentCommand) {
			  		process.stdout.write(data);
			  	//}
			  //output=data.split(retCodeRE)[0];
			   //process.stdout.write("o:^"+data+"o:$");
			 if (!scriptRuntime.output && data.size) {
			 	scriptRuntime.firstTimeOutput=true;
			 }
		  	 scriptRuntime.output+=data;
		  	 if (scriptRuntime.currentCommand) {
		  	 	scriptRuntime.currentCommand.output+=data;
		  	 }
		  	  
		  	  //console.log("responses="+scriptRuntime.currentCommand.responses);
			  if (scriptRuntime.currentCommand && scriptRuntime.currentCommand.responses) {
			  	_.each(scriptRuntime.currentCommand.responses, function(response, responseKey, list) {
			  		//var re = new RegExp(response,"g");
			  		//console.log("response: "+responseKey+" "+response);
			  		if (data.match(responseKey)) {
			  			//console.log("match response: "+responseKey+" "+response);
			  			term.write(response+"\r");
			  			delete scriptRuntime.currentCommand.responses[responseKey];
			  		}
			  	});
			  	//for (response in scriptRuntime.currentCommand.responses) {
			  	//	var re = new RegExp(response,"g");
			  	//	if (data.match(response)) {
			  	//		//console.log("response: "+response+" "+scriptRuntime.currentCommand.responses[response]);
			  	//		term.write(scriptRuntime.currentCommand.responses[response]+"\r");
			  	//		delete scriptRuntime.currentCommand.responses[response];
			  	//	}
			  	//}
			  }
			  
			  
			  //console.log('detect prompt');
			  //console.log(data.match(promptRE));
			  if (data.match(promptRE)) {
			  	//console.log("completed: "+scriptRuntime.currentCommand.command);
			  	//scriptRuntime.currentCommand.callback();
			  }
			  if (scriptRuntime.currentCommand && scriptRuntime.currentCommand.output.match(retCodeRE)) {
			  	job.progress=scriptRuntime.currentStep*scriptRuntime.progressStepLength;
			  	job.status = 'completed: '+scriptRuntime.currentCommand.command;
			  	eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});
			  	
			  	scriptRuntime.currentCommand.returnCode = scriptRuntime.currentCommand.output.match(retCodeRE)[0].split(":")[1];
			  	scriptRuntime.currentCommand.output=scriptRuntime.currentCommand.output.replace(knowhowShellPrompt,"")
			  		.replace(retCodeRE,"").replace(scriptRuntime.currentCommand.command,"").trim();
			  	console.log('return code: '+scriptRuntime.currentCommand.returnCode);
			  	if (scriptRuntime.currentCommand.returnCode != 0) {
					//term.write(':\r')
			  		eventEmitter.emit('execution-error',scriptRuntime.currentCommand);
			  		scriptRuntime.currentCommand.callback(new Error(scriptRuntime.currentCommand.output));
			  		return;
			  	} else {
			  		eventEmitter.emit('execution-complete', scriptRuntime.currentCommand);
			  		
			  	}
			  	console.log("completed: "+scriptRuntime.currentCommand.command);
			  	scriptRuntime.currentCommand.callback();
			  	
			  }
			  
			}
			if (scriptRuntime.currentCommand && scriptRuntime.currentCommand.errorConditions) {
			  	_.each(scriptRuntime.currentCommand.errorConditions, function(errorCondition, index, list) {
		  		//var re = new RegExp(response,"g");
			  		if (data.match(errorCondition)) {
			  			console.log("ERROR!!!!!!!!!");
			  			term.write(':\r')
			  			eventEmitter.emit('execution-error',scriptRuntime.currentCommand);
			  			scriptRuntime.currentCommand.callback(new Error(scriptRuntime.currentCommand.output));
			  		}
			  	});
			}
		  
		});
		term.on('error', function(err) {
			console.log("pty.js error: "+err.message);
			//clearInterval(progressCheck);
			//clearTimeout(timeout);
			term.end();
			delete scriptRuntime.currentCommand;
			if (callback && !job.complete) {
				callback(err, scriptRuntime);
			}
		});
		
		
		
		
		//console.log(job);
		async.eachSeries(job.script.commands, function(command,callback) {
			//if (!term || term.total <1) {
			//	callback(new Error("unable to access term"));
			//}
			scriptRuntime.currentStep++;
			//console.log(command);
			command.callback = callback;
			command.output = '';
			if (command.waitForPrompt) {
				if (!command.responses) {
					command.responses = {};
				}
				command.responses[command.waitForPrompt] = "#ret-code:0";
			}

			scriptRuntime.currentCommand = command;
			if (command.command) {
				term.write(command.command+'\r');
			}
			//term.write("wait | echo \"D_O_N_E: "+currentCommand.command+'\r');
		    }.bind({scriptRuntime: scriptRuntime}), 
		    function(err) {
		    	
		    	exitCommand= function(ecallback) {
		    		job.complete = true;
		    		if (job.shell && job.shell.onExit) {
						scriptRuntime.currentCommand=job.shell.onExit;
						if (!scriptRuntime.currentCommand.responses) {
							scriptRuntime.currentCommand.responses = {};
						}
						if (!scriptRuntime.currentCommand.responses[promptRE]) {
							scriptRuntime.currentCommand.responses[promptRE] = "#ret-code:0";
						}	
						scriptRuntime.currentCommand.callback = ecallback;
						term.write(scriptRuntime.currentCommand.command);
						ecallback();
					} else {
						ecallback();
					}
				};
		    	if (err) {
					console.log("ERROR!!!!"+err.message);
					job.progress=0;
					//job.status=err.message;
					eventEmitter.emit('job-error',job);
					//clearInterval(progressCheck);
					//clearTimeout(timeout);
					term.removeAllListeners();
					//term.end();
					if (callback) {
						callback(err, scriptRuntime);
					}
					return;
				}
				job.progress=0;
				job.status=job.id+" complete";
				eventEmitter.emit("job-complete", job);
				
				
				
				//clearInterval(progressCheck);
				//clearTimeout(timeout);
		        exitCommand(function() {
					//term.end();
					delete scriptRuntime.currentCommand;
			    	if (callback) {
						callback(undefined, scriptRuntime);
					}
					//term.removeAllListeners();
					console.log("knowhow-shell done");
				});
				
				
			}
		    	
		 );
	});
	 
};

exports.executeJobOnTerm = executeJobOnTerm;