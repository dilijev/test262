// Copyright 2009 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/**
 * The Date.prototype property "toTimeString" has { DontEnum } attributes
 *
 * @section: 15.9.5.4;
 * @path: 15_Native/15.9_Date_Objects/15.9.5_Properties_of_the_Date_Prototype_Object/15.9.5.4_Date.prototype.toTimeString/S15.9.5.4_A1_T1.js;
 * @description: Checking absence of ReadOnly attribute;
 */

x = Date.prototype.toTimeString;
if(x === 1)
  Date.prototype.toTimeString = 2;
else
  Date.prototype.toTimeString = 1;
if (Date.prototype.toTimeString === x) {
  $ERROR('#1: The Date.prototype.toTimeString has not the attribute ReadOnly');
}

