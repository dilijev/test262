// Copyright 2011 by Google, Inc.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.


/**
 * Each implementation of *Platform.js abstracts the underlying OS and JS
 * engine peculiarities.
 *
 * <p>The implementation here is specific to the v8 shell running on a
 * Posix platform.
 */
(function (global) {
   "use strict";

   /////////////////// Development Switches /////////////////

   var VERBOSE = true;

   // Affects side effecting os operations,
   // currently only platform.writeSpawn and platform.mkdir.
   var DRY_RUN = false;

   // When converting paths to path strings, should the pathstring be
   // relative to the TEST262_ROOT, or should it be relative to the
   // current working directory?
   var ABSOLUTE_PATHSTR = false;

   ////////////////////////////////////////////////////////

   global.t262 = global.t262 || {};

   var platform = global.t262.platform = {};

   /**
    * Appends a bunch of RegExps together into a single RegExp,
    * solving both the RegExp-one-liner problem and the doubled
    * backslash problem when composing literal strings.
    *
    * <p>The arguments can be any mixture of RegExps and strings. By
    * expressing the portions that should be well formed regexps as
    * regexps, we catch well-formedness errors within such a portion
    * separately. The strings are added as is without escaping --
    * BEWARE. By not escaping the strings, we can use them to
    * represent the individually unbalanced fragments, like capturing
    * parens, around other regexps. If arguments[0] is a RegExp, we
    * use its flags on the resuting RegExp.
    *
    * <p>Not platform dependent, so does not really belong in this
    * file.
    */
   function regExp(var_args) {
     var args = [].slice.call(arguments, 0);
     var reSrc = args.map(function(arg) {
       return (typeof arg === 'string') ? arg : arg.source;
     }).join('');
     var flags = '';
     if (typeof args[0] === 'object') {
       var parts = (''+args[0]).split('/');
       flags = parts[parts.length -1];
     }
     return new RegExp(reSrc, flags);
   }
   platform.regExp = regExp;

   ////////////////// Needed for building and running //////////////

   try {
     read('tools/converter/v8PosixPlatform.js');
   } catch (err) {
     throw new Error('Must run in a test262 source root');
   }

   var ABS_ROOT = os.system('pwd', ['-P']).trim().split('/');

   var TEST262_ROOT = ABSOLUTE_PATHSTR ? ABS_ROOT : [];

   var TEST262_ROOT_STR = TEST262_ROOT.join('/');

   var CONVERTER_PATH = ['tools', 'converter'];
   platform.CONVERTER_PATH = CONVERTER_PATH;

   var ME_PATH = CONVERTER_PATH.concat('v8PosixPlatform.js');

   /**
    *
    */
   function validatePath(path) {
     var pathStr = path.join('/');
     path.forEach(function(segment) {
       if (segment === '') {
         throw new Error('A path cannot have empty segment: ' + pathStr);
       }
       if (segment === '/') {
         throw new Error('Path insufficiently parsed: ' + pathStr);
       }
       if (segment === '..') {
         throw new Error('Cannot use "..": ' + pathStr);
       }
     });
     return path;
   }

   /**
    * Converts a relPath to a relPathStr.
    *
    * A relPath is an array of filenames relative to some base onto
    * which it will be concatenated before use.
    */
   function toRelPathStr(relPath) {
     validatePath(relPath);
     return relPath.join('/');
   }
   platform.toRelPathStr = toRelPathStr;

   /**
    * Converts a path to a pathStr.
    *
    * A path is an array of filenames relative to TEST262_ROOT. A
    * pathStr is a (possibly fully qualified string) for referring to
    * that file on the current platform, according to the operations
    * in this *Platform.js file.
    */
   function toPathStr(path) {
     validatePath(path);
     return TEST262_ROOT.concat(path).join('/');
   }
   platform.toPathStr = toPathStr;

   /**
    * Returns the text found at path, with newlines normalized and
    * any initial BOM (Unicode Byte Order Mark) removed.
    *
    * Note: Don't simply revise this (without renamings) to follow the
    * general pattern of also defining a local 'read' function, as it
    * will mask the v8 shell's read function, which we use.
    */
   platform.read = function(path) {
     var text = read(toPathStr(path)).
       replace(/\r\n/g, '\n').
       replace(/\r/g, '\n');
     if (text.charCodeAt(0) === 0xfeff) { return text.substring(1); }
     return text;
   };

   /**
    * How one JavaScript script possibly spawns another and possibly
    * redirects its printed form to a chosen file (or resource).
    *
    * <p>For example, if !DRY_RUN, then<pre>
    *   writeSpawn([], '+arguments[0] + +arguments[1]', ['3', '5'])
    * </pre>
    * should return the string "8", whether or not writeSpawn decides
    * to spawn.
    *
    * @param scriptPaths An array of path arrays of JavaScript source
    * files to be loaded into the spawned JS engine (in addition to
    * the spawning platform file) if we are indeed spawning.
    * @param opt_exprSrc An expression to be evaluated in an
    * environment in which "arguments" is bound to the list of strings
    * provided by opt_args. The result is the value of the expression
    * coerced to a string, unfortunately, as prepended by whatever
    * these scripts (if spawned) have already written to their
    * stdout. On platforms (like SES) where this can be a safely
    * confining evaluation, it should be. The implementation here is
    * not safe.
    * @param opt_args A list of strings to be bound to 'arguments'
    * both in opt_expr and in the possibly spawed scripts.
    * @param opt_targetPath A path array naming a file where the
    * result of opt_exprSrc should be written. On v8 currently, if
    * this is provided, then writeSpawn will spawn, since we have no
    * other way to implement this functionality. In the browser
    * context, the result is PUT (using XHR) to the target resource.
    * @param opt_spawn_required If truthy, forces spawning.
    * @returns If there is a target, then the null string. Otherwise,
    * the string result of evaluating opt_exprSrc.
    */
   function writeSpawn(scriptPaths,
                       opt_exprSrc,
                       opt_args,
                       opt_targetPath,
                       opt_spawn_required,
                       opt_forceNonStrict) {
     if (opt_exprSrc && !opt_targetPath && !opt_spawn_required) {
       var str = '(function(/*var_args*/) {';
       if (opt_forceNonStrict !== 'forceNonStrict') {
         str += '"use strict";';
       }
       str += ' return (' + opt_exprSrc + '); })';
       return ''+(1,eval)(str).apply(void 0, opt_args || []);
     }

     var cmd = 'v8 ' + toPathStr(ME_PATH) + ' ';
     cmd += scriptPaths.map(toPathStr).join(' ');

     if (opt_exprSrc) {
       cmd += ' -e ' + JSON.stringify('print(' + opt_exprSrc + ')');
     }
     if (opt_args) {
       cmd += ' -- ' + opt_args.map(JSON.stringify).join(' ');
     }
     if (opt_targetPath) {
       cmd += ' > ' + toPathStr(opt_targetPath);
     }
     if (VERBOSE || DRY_RUN) { print(cmd); }
     if (DRY_RUN) { return ''; }
     try {
       return os.system('bash', ['-c', cmd]);
     } catch (err) {
       if (opt_targetPath) {
         // The error we catch is almost certainly less interesting
         // than the one unfortunately written to the target file.
         var message = 'failed: ' + cmd + '\n' +
           platform.read(opt_targetPath);
         os.system('rm', [toPathStr(opt_targetPath)]);
         throw new Error(message);
       }
       throw err;
     }
   }
   platform.writeSpawn = writeSpawn;

   ////////////////// Only needed for building /////////////////////

   /**
    * Calls a non-strict indirect eval function on exprSrc.
    *
    * On platforms (like SES) where this can be a safely confining
    * evaluation, it should be. The implementation here is not safe.
    */
   function evalExprIn(exprSrc, env, opt_forceNonStrict) {
     var varNames = Object.getOwnPropertyNames(env);
     var str = '(function(' + varNames.join(',') + ') {';
     if (opt_forceNonStrict !== 'forceNonStrict') {
       str += '"use strict";';
     }
     str += ' return (' + exprSrc + '); })';
     return (1,eval)(str).apply(void 0, varNames.map(function(varName) {
       return env[varName];
     }));
   }
   platform.evalExprIn = evalExprIn;

   /**
    * Converts a relPathStr to a relPath.
    *
    * <p>See toRelPathStr.
    */
   function toRelPath(relPathStr) {
     return validatePath(relPathStr.split('/'));
   }
   platform.toRelPath = toRelPath;

   /**
    * Converts a pathStr to a path.
    *
    * <p>See toPathStr.
    */
   function toPath(pathStr) {
     if (pathStr[0] === '/') {
       if (pathStr.indexOf(TEST262_ROOT_STR + '/') !== 0) {
         throw new Error('"' + pathStr + '" must start with "' +
                         TEST262_ROOT_STR + '/"');
       }
       pathStr = pathStr.substring(TEST262_ROOT_STR.length + 1);
     }
     return validatePath(pathStr.split('/'));
   }
   platform.toPath = toPath;

   /**
    * Does path name a directory?
    */
   function isDirectory(path) {
//     var fileOut = os.system('file', [toPathStr(path)]);
//     var fileMatch = fileOut.match(/:\s*([^:]*)\s*$/);
//     if (!fileMatch) { return null; }
//     var fileType = fileMatch[1].trim();
//     return fileType === 'directory';
     try {
       os.system('test', ['-d', toPathStr(path)]);
       return true;
     } catch (x) {
       return false;
     }
   }
   platform.isDirectory = isDirectory;

   /**
    * A list of the filenames found in path, which must name a
    * directory.
    */
   function ls(path) {
     var pathStr = toPathStr(path);
     if (!isDirectory(path)) { return []; }
     var lines;
     try {
       lines = os.system('ls', [pathStr]).trim();
     } catch (err) {
       throw err;
     }
     if (lines === '') { return []; }
     return lines.split('\n');
   }
   platform.ls = ls;

   /**
    * Emits the jsonRecord serialized as JSON, either compactly or
    * readably according to VERBOSE.
    */
   function asJSONTxt(jsonRecord) {
     if (VERBOSE) {
       return JSON.stringify(jsonRecord, void 0, ' ');
     } else {
       return JSON.stringify(jsonRecord);
     }
   }
   global.t262.asJSONTxt = platform.asJSONTxt = asJSONTxt;

   function mkdir(path) {
     var pathStr = toPathStr(path);
     if (DRY_RUN) {
       print('mkdir ' + pathStr);
       return;
     }
     try {
       os.mkdirp(pathStr);
     } catch (err) {
       print('***could not mkdir: ' + pathStr);
       throw err;
     }
   }
   platform.mkdir = mkdir;

   ////////////////// Only needed for running //////////////////////


 })(this);