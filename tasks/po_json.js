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
				(poStr = safeReadFile(src)) && (returnObj = poStrToObject(poStr, returnObj, src));
				break;

			case "object":
				// assume multiple, nested, src
				for (var namespace in src)
				{
					if (!src.hasOwnProperty(namespace))
						continue;

					(poStr = safeReadFile(src[namespace])) && (returnObj[namespace] = {}) && (returnObj = poStrToObject(poStr, returnObj[namespace], src[namespace]));
				}
				break;
		}

		// Seems to still process the gigantic string...
		returnStr = '{\n  getPlural: function(n) { ' + returnObj.options.plural + ' return plural; },';
		returnStr += '\n  entries: ' + JSON.stringify(returnObj.entries).replace(/\\\\/g,"") + '\n}';

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
	var poStrToObject = function(poStr, target)
	{

		// Prepare output
		var target = target || {};
		var options = {};
		var entries = {};

		// Split input in lines
		var lines = poStr.split(/[\r\n]+/g);

		// Next information to read:
		// 0: msgid
		// 1: comment msgstr
		// 2: regular msgstr or msgid_plural
		// 3: msgstr[0]
		// 4: msgstr[1]
		// 5: msgstr[2]
		var next = 0;

		var pluralCount = 0;
		var regex = '';
		var j = 0;

		var id = "", id_plural = "", msg = "", msg_plural = "", msg_options = "";

		// Loop on lines
		for (var i = 0; i < lines.length; i++) {

			// Ignore empty lines
			if (/^ *$/.test(lines[i])) {
				continue;
			}

			// Ignore comments ("# ...")
			if (/^ *#.*$/.test(lines[i])) {
				continue;
			}

			// Ignore contexts ("msgctxt ...")
			if (/^ *msgctxt.*$/.test(lines[i])) {
				continue;
			}

			if (msg_options == "" && /msgid ""/.test(lines[i])) {
				j = i + 1;
				while (/^".*"$/.test(lines[j+1])) {
					msg_options += /^"(.*)"$/.exec(lines[j+1])[1];
					j++;
				}
				var options_tmp = msg_options.split("\\n");
				for (var k = 0, n = options_tmp.length; k < n; k++) {
					if (options_tmp[k] != "") {
						var option = options_tmp[k];
						var l = option.indexOf(': ');
						if (option.slice(0,l) == "Plural-Forms") {
							options['plural'] = option.slice(l+2);
						}
					}
				}
			}

			// Switch on the next thing to read
			switch(next) {

				// msgid
				case 0:
					id = "";
					next = 0;
					if (/msgid /.test(lines[i])) {
						// Empty msgid
						if (lines[i] == 'msgid ""') {
							// Case 1: next line is a "msgstr" (comment)
							if(/^ *msgstr/.test(lines[i+1])) {
								next = 1;
							}
							// Case 2: the next line(s) contain a multiline msgid
							// => read id on multiple lines
							else {
								while(/^ *".*"$/.test(lines[i+1])) {
									id += /^ *"(.*)"$/.exec(lines[i+1])[1];
									i++;
								}
								next = 2;
							}
						}
						// Not empty msgid
						// => Save it in id
						else {
							id = /msgid "(.*)"/.exec(lines[i])[1];
							next = 2;
						}
					}
					break;

				// msgstr comment
				case 1:
					while(/^".*"$/.test(lines[i+1])) {
						i++;
					}
					next = 0;
					break;

				// msgstr or msgid_plural
				case 2:
					// msgstr
					if(/^ *msgstr/.test(lines[i])) {
						msg = "";
						// Multiline (if first line is empty)
						if(lines[i] == 'msgstr ""') {
							while(/^ *".*"$/.test(lines[i+1])) {
								msg += /^ *"(.*)"$/.exec(lines[i+1])[1];
								i++;
							}
						}
						// Single line
						else {
							msg = /msgstr "(.*)"/.exec(lines[i])[1];
						}
						next = 0;
						entries[id] = msg;
					}
					// msgid_plural
					else if(/^ *msgid_plural/.test(lines[i])) {
						id_plural = "";
						// Multiline (if first line is empty)
						if(lines[i] == 'msgid_plural ""') {
							while(/^ *".*"$/.test(lines[i+1])){
								id_plural += /^ *"(.*)"$/.exec(lines[i+1])[1];
								i++;
							}
						}
						// Single line
						else {
							id_plural = /msgid_plural "(.*)"/.exec(lines[i])[1];
						}
						next = 3;
					}

					break;

				// msgstr[0]
				case 3:
					msg = "";
					// Multiline (if first line is empty)
					if (lines[i] == 'msgstr[0] ""') {
						while(/^ *".*"$/.test(lines[i+1])){
							msg += /^ *"(.*)"$/.exec(lines[i+1])[1];
							i++;
						}
					}
					// Single line
					else {
						msg = /msgstr\[0\] "(.*)"/.exec(lines[i])[1];
					}
					if (/msgstr\[1\]/.test(lines[i+1])) {
						pluralCount = 0;
						entries[id_plural] = new Array();
						next = 4;
					} else {
						next = 0;
					}
					entries[id_plural][0] = msg;

					break;
			}

			// Multi plural
			if (next > 3) {
				regex = new RegExp('msgstr\\[' + pluralCount + '\\]');
				if (regex.test(lines[i])) {
					msg_plural = "";
					// Multiline (if first line is empty)
					if (lines[i] == 'msgstr[' + pluralCount + '] ""') {
						while(/^ *".*"$/.test(lines[i+1])){
							msg_plural += /^ *"(.*)"$/.exec(lines[i+1])[1];
							i++;
						}
					}
					// Single line
					else {
						regex = new RegExp('msgstr\\[' + pluralCount + '\\] "(.*)"', "g");
						msg_plural = regex.exec(lines[i])[1];
					}
					entries[id_plural][pluralCount] = msg_plural;
				}

				if (/msgstr\[/.test(lines[i+1])) {
					next++;
					pluralCount++;
				} else {
					next = 0;
				}
			}
		}

		target = {
			options: options,
			entries: entries
		};

		return target;
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
