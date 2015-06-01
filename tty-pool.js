var pty = require('pty.js');
var poolModule = require('generic-pool');

/**
 * creates a resource pool of term objects
 */
function createPool(minSize, maxSize) {
	var pool = poolModule.Pool({
	    name     : 'term-pool',
	    create   : function(callback) {
	    	var shell="bash";
			var args = [];
			try {
		    	var term = pty.spawn(shell, args, {
				  name: 'xterm-color',
				  cols: 80,
				  rows: 30
				});
				callback(undefined,term);
			} catch (err) {
				console.error(err.stack);
				callback(err);
			}
	
	    },
	    destroy  : function(term) {
	    	term.end();
			term.destroy();
	    },
	    validate: function(term) {
	    	return (term);
	    },
	    max      : maxSize,
	    // optional. if you set this, make sure to drain() (see step 3) 
	    min      : minSize, 
	    // specifies how long a resource can stay idle in pool before being removed 
	    idleTimeoutMillis : 600000,
	     // if true, logs via console.log - can also be a function 
	    log : false 
	});
	return pool;
}

var execu

/**
 * Constuctor that takes a khClinet as an agurment to create an agent pool
 * @param khClinet
 */
function TTYPool(minSize, maxSize) {
	self = this;
	self.pool = createPool(minSize, maxSize);
	self.drain = self.pool.drain;
	self.destroyAllNow = self.pool.destroyAllNow;
	self.acquire = self.pool.acquire;
	self.release = self.pool.release;
	
	return self;
}

module.exports = TTYPool;