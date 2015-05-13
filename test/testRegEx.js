var retCodeRE = /ret code:\d+/;
var testCode = "ret code:1232323";

console.log(testCode.match(retCodeRE)[0].split(':')[1]);

var numericRepeatRE = /\[\d+\-\d+\]/;
var firstNum = /\[\d+/;
var lastNum = /\d+\]/;
var numericTest = "test[101-209]";
console.log(numericTest.match(numericRepeatRE)[0]);
console.log("first="+numericTest.match(numericRepeatRE)[0].match(firstNum)[0].replace("[",""));
console.log("last="+numericTest.match(numericRepeatRE)[0].match(lastNum)[0].replace("]",""));
