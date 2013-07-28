
var measurements = require("./measurements.js");
var dates = require("./dates.js");
var counterByKey = {};
var crayonId = "";

module.exports.setCrayonId = function(c) { 
	crayonId = c; 
}

module.exports.getCrayonId = function(c) { 
	return crayonId; 
}


module.exports.stopAll = function() {
	for (counter in counterByKey) {
		counterByKey[counter].stop();
	}
}

module.exports.flushAll = function() {
	for (counter in counterByKey) {
		counterByKey[counter].flushCounter();
	}
}

module.exports.getOrCreateCounter = function(secondsInterval, name, component, server) {
	var key = name + "_" + component + "_" + server;
	var counter = counterByKey[key];
	if (counter) return counter;

	counter = new Counter(secondsInterval, name, component, server);
	return counterByKey[key];
};

function Counter(secondsInterval, name, component, server) {
	var me=this;
	me.key = name + "_" + component + "_" + server;
	counterByKey[me.key] = me;
	me.args = {};
	if (server != null) me.args.s = server;
	if (component != null) me.args.c = component + crayonId;
	me.args.n = name;
	me.resetCounter();
	//logger.info("New Counter Created: " + JSON.stringify(me.args));
	me.timer = setInterval(function() { me.flushCounter() }, secondsInterval*1000);
}

Counter.prototype.resetCounter = function() {
	var me=this;
	me.args.m = 0;
	me.args.M = 0;
	me.args.N = 0;
	me.args.A = 0;
	me.args.V = 0;
	me.incrementLastValue = 0;
}

Counter.prototype.flushCounter = function() {
	var me=this;
	if (me.args.N > 0) {
		me.args.t = new Date();
		measurements.addBulkTimeslotsByDate([me.args],"counter");
	}
	me.resetCounter();
}

Counter.prototype.stop = function() {
	var me=this;
	try {
		if (me.timer) clearInterval(me.timer);
	} catch (ex) {}
}

Counter.prototype.addSample = function(newValue) {
	var me=this;

	var oldAverage = me.args.A;
	me.args.m = (me.args.m < newValue ? me.args.m : newValue);
	me.args.M = (me.args.M > newValue ? me.args.M : newValue);
	me.args.A = ((me.args.N * me.args.A) + (newValue)) / (me.args.N + 1);
	me.args.N += 1;
	me.args.V += (newValue - oldAverage) * (newValue - me.args.A);
	// STDev S(1) = 0, S(k) = S(k-1) + (x(k) - M(k-1)) * (x(k) - M(k))
}

// Sometimes it's easier to just call increment
// Although we could have used the N field of different counter, it's simpler to understand that way
// TODO: Should consider changing this
Counter.prototype.increment = function(count) {
	var me=this;
	if (count == null) count = 1;
	me.incrementLastValue += count;
	me.args.m = me.incrementLastValue;
	me.args.M = me.incrementLastValue;
	me.args.A = me.incrementLastValue;
	me.args.N += 1;
	me.args.V = 0;
}

module.exports.Counter = Counter;