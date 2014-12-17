/*
 * grunt-po-json
 * 
 *
 * Copyright (c) 2014 Nicky Out
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    // Configuration of postStrToObject
    var idReturn = '',
        strReturn = '',
        findID = /msgid\s+"(.*?)"$/,
        findStr = /msgstr\s+"(.*?)"$/,
        find = /"(.*?)"/,
        h = 'yellow',
        pn = 'white',
        tn = 'grey';

    grunt.registerMultiTask('po_json', 'Converts one or more po files to a single json or amd module.', function()
    {
        var options = this.options(),
            files = this.data.files;

        if (this.files.length == 0)
        {
            grunt.log.warn('Task "' + this.target +'" contains no files to convert. Omitting...');
            return;
        }

        for (var name in files)
        {
            if (!files.hasOwnProperty(name))
                continue;
            convertTask(files[name], name, options);
        }
    });

    /**
     * The actual convert task. Reads the file(s) in src and writes to dest.
     *
     * @param {String|Object} src accepts a path or a {[ns]: [path]} formatted object.
     * @param {String} destPath the destination path for the file.
     * @param {Object} options pass this.options() here.
     */
    var convertTask = function(src, destPath, options)
    {
        var poStr,
            returnObj = {},
            returnStr,
            amd = options.amd || false;

        switch (grunt.util.kindOf(src))
        {
            case "string":
                (poStr = safeReadFile(src)) && (poStrToObject(poStr, returnObj, src));
                break;

            case "object":
                // assume multiple, nested, src
                for (var namespace in src)
                {
                    if (!src.hasOwnProperty(namespace))
                        continue;

                    (poStr = safeReadFile(src[namespace])) && (returnObj[namespace] = {}) && (poStrToObject(poStr, returnObj[namespace], src[namespace]));
                }
                break;
        }

        // Seems to still process the gigantic string...
        returnStr = JSON.stringify(returnObj);
        if (amd)
            returnStr = 'define(' + returnStr + ');';
        grunt.file.write(destPath, returnStr);
        grunt.log.writeln('File "' + destPath + '" created.');
    };

    /**
     * Generic read file and return content if exists.
     * @param path
     * @returns {*}
     */
    var safeReadFile = function(path)
    {
        if (!grunt.file.exists(path)) {
            grunt.log.warn('Source file "' + path + '" not found.');
            return null;
        } else {
            return grunt.file.read(path);
        }

    };

	
	
	
	
	
    /**
     * Accepts the contents of a po file, and puts all translations in the target Object.
	 * NB: this function was rewritten for this fork 
     *
     * @param {String} poStr the contents of a po file.
     * @returns {Object} The translations in name-value pairs.
     */
    var poStrToObject = function(poStr)
    {
		// Prepare output
        var output = {"toto":"tata"};
		
		// Split input in lines
		var lines = poStr.split(/[\r\n]+/g);

        for (var i = 0; i < lines.length; i++){
		
		
            
        }
		
        return output;
    };

	
	
	
	
	
	
    // Debug tool: view object properties
    function viewObj(text, target)
    {
        var h = 'yellow',
            type,
            content;
        if (text)
            grunt.log.writeln(text[h]);
        for (var name in target)
        {
            type = grunt.util.kindOf(target[name]);
            content = (target[name] + '').match(/^.*?$/m);
            grunt.log.writeln((' - {' + type + '} ')[h] + name + ': ' + content[0].grey);
        }
    }
};
