var KnowhowShell = require('../knowhow-shell.js');
var knowhowShell = new KnowhowShell();

knowhowShell.executeSingleCommand("ls -lA", function(err, result) {
	console.log(result);
});

npmInitCommand = {
				command: 'npm init',
				responses: {
					'name:': "konowhowiscool",
					'version:': "0.0.0",
					'description:': "single command example",
					'entry point:': "",
					'test command:': "",
					'git repository:': "",
					'keywords:': "knowhow",
					'author:': "you",
					'license:': "GPL-3.0+",
					'Is this ok\?': "y"
				}
			};
			
knowhowShell.executeSingleCommand(npmInitCommand, function(err, result) {
	console.log(result);
});