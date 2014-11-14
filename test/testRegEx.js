var retCodeRE = /ret code:\d+/;
var testCode = "ret code:1232323";

console.log(testCode.match(retCodeRE)[0].split(':')[1]);
