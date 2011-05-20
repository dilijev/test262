// Copyright 2009 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/**
* @name: S15.10.6.2_A1_T21;
* @section: 15.10.6.2;
* @assertion: RegExp.prototype.exec(string) Performs a regular expression match of ToString(string) against the regular expression and 
* returns an Array object containing the results of the match, or null if the string did not match;
* @description: String is function(){}() and RegExp is /[a-z]n/;
*/


// Converted for Test262 from original Sputnik source

ES5Harness.registerTest( {
id: "S15.10.6.2_A1_T21",

path: "15_Native\15.10_RegExp_Objects\15.10.6_Properties_of_the_RegExp_Prototype_Object\15.10.6.2_RegExp.prototype.exec\S15.10.6.2_A1_T21.js",

assertion: "RegExp.prototype.exec(string) Performs a regular expression match of ToString(string) against the regular expression and",

description: "String is function(){}() and RegExp is /[a-z]n/",

test: function testcase() {
   __executed = /[a-z]n/.exec(function(){}());

__expected = ["un"];
__expected.index=0;
__expected.input="undefined";

//CHECK#0
if ((__executed instanceof Array) !== true) {
	$ERROR('#0: __executed = /[a-z]n/.exec(function(){}()); (__executed instanceof Array) === true');
}

//CHECK#1
if (__executed.length !== __expected.length) {
  $ERROR('#1: __executed = /[a-z]n/.exec(function(){}()); __executed.length === ' + __expected.length + '. Actual: ' + __executed.length);
}

//CHECK#2
if (__executed.index !== __expected.index) {
  $ERROR('#2: __executed = /[a-z]n/.exec(function(){}()); __executed.index === ' + __expected.index + '. Actual: ' + __executed.index);
}

//CHECK#3
if (__executed.input !== __expected.input) {
  $ERROR('#3: __executed = /[a-z]n/.exec(function(){}()); __executed.input === ' + __expected.input + '. Actual: ' + __executed.input);
}

//CHECK#4
for(var index=0; index<__expected.length; index++) {
  if (__executed[index] !== __expected[index]) {
    $ERROR('#4: __executed = /[a-z]n/.exec(function(){}()); __executed[' + index + '] === ' + __expected[index] + '. Actual: ' + __executed[index]);
  }
}


 }
});
