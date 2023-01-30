// Created with Squiffy 5.1.3
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
                if ('@last' in squiffy.story.section.passages && squiffy.get('_turncount')>= squiffy.story.section.passageCount) {
                    squiffy.story.passage('@last');
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
		link = String(link);
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
			var incDecRegex = /^([\w]*)\s*([\+\-\*\/])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
				rhs = incDecMatch[3];
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
				rhs = parseFloat(rhs);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
				if (op == '*') {
					value *= rhs;
				}
				if (op == '/') {
					value /= rhs;
				}
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
			else if (startsWith(text,'@') && !startsWith(text,'@replace')) {
				processAttributes(text.substring(1).split(","));
				return "";
			}
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);
			condition = condition.replace("<", "&lt;");
            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

				if(startsWith(rhs,'@')) rhs=squiffy.get(rhs.substring(1));
				
                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = 'precarga';
squiffy.story.id = 'd4f6318614';
squiffy.story.sections = {
	'precarga': {
		'text': "<PRECARGAR ARCHIVOS MULTIMEDIA>",
		'js': function() {
			squiffy.story.go('configuracion')
		},
		'passages': {
		},
	},
	'logo1': {
		'clear': true,
		'text': "<div id=\"incanus\" style=\"position: absolute; top:0;bottom:0;left:0;right:0;margin:auto;height: 5em;width: 3em;\">\n    INCANUS\n</div>",
		'js': function() {
			setTimeout(function(){squiffy.story.go('logo2')}, 3000)
		},
		'passages': {
		},
	},
	'logo2': {
		'clear': true,
		'text': "<div id=\"textagames\" style=\"position: absolute; top:0;bottom:0;left:0;right:0;margin:auto;height: 5em;width: 3em;\">\n    TEXTAGAMES\n</div>",
		'js': function() {
			setTimeout(function(){squiffy.story.go('inicio')}, 3000)
		},
		'passages': {
		},
	},
	'pistas': {
		'clear': true,
		'text': "<h1 id=\"pistas\">Pistas</h1>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Cruzar el lago</a>  </li>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Recorrer las cavernas</a>  </li>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Despertar al Protector</a></li>\n</ul>\n<hr>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">Salir</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_lago': {
		'clear': true,
		'text': "<h2 id=\"cruzar-el-lago\">Cruzar el lago</h2>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago_1\" role=\"link\" tabindex=\"0\">¿Cómo cruzo el lago?</a>   </li>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago_2\" role=\"link\" tabindex=\"0\">¿Cómo me muevo después de cruzar el lago?</a> </li>\n</ul>\n<hr>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas\" role=\"link\" tabindex=\"0\">Volver</a>  </li>\n<li><a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">Salir</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_lago_1': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-cruzar-el-lago-\">¿Cómo cruzar el lago?</h3>\n<p>(1/6) Necesitas algo para protegerte: algo que resista el fuego y la lava. </p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue1\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue1': {
		'text': "<p>(2/6) Busca en las Rocas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue2\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue2': {
		'text': "<p>(3/6) Encontrarás unas conchas resistentes al fuego...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue3\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue3': {
		'text': "<p>(4/6) Debes ponértelas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue4\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue4': {
		'text': "<p>(5/6) Usando unos Juncos Cortos, también resistentes al fuego...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue5\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue5': {
		'text': "<p>(6/6) Que encontrarás en el Cañaveral.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_lago_2': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-me-muevo-despu-s-de-cruzar-el-lago-\">¿Cómo me muevo después de cruzar el Lago?</h3>\n<p>(1/3) Las Conchas sólo sirven para cruzar el Lago...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue6\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue6': {
		'text': "<p>(2/3) Y no permiten caminar en otro sitio...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue7\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue7': {
		'text': "<p>(3/3) Así que sacátelas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_lago\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_cavernas': {
		'clear': true,
		'text': "<h2 id=\"recorrer-las-cavernas\">Recorrer las cavernas</h2>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas_1\" role=\"link\" tabindex=\"0\">¿Cómo me ilumino en la caverna?</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas_2\" role=\"link\" tabindex=\"0\">¿Cómo llevo la flor de fuego?</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas_3\" role=\"link\" tabindex=\"0\">¿Cómo bajo el abismo?</a></li>\n</ul>\n<hr>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas\" role=\"link\" tabindex=\"0\">Volver</a>  </li>\n<li><a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">Salir</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_cavernas_1': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-me-ilumino-en-la-caverna-\">¿Cómo me ilumino en la caverna?</h3>\n<p>(1/8) Necesitas hacerte una Antorcha de pasto...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue8\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue8': {
		'text': "<p>(2/8) Que podrás encender con una Flor de Fuego...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue9\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue9': {
		'text': "<p>(3/8) Que encontrarás en el Campo de Flores de Fuego.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue10\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue10': {
		'text': "<p>(4/8) Para hacer la Antorcha, necesitas pasto grafeck...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue11\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue11': {
		'text': "<p>(5/8) Busca en el pasto en las Llanuras...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue12\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue12': {
		'text': "<p>(6/8) Encontrarás tallos largos y briznas cortas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue13\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue13': {
		'text': "<p>(7/8) Puedes hacer con ellos una antorcha...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue14\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue14': {
		'text': "<p>(8/8) Atando los tallos largos con las briznas cortas.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_cavernas_2': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-llevo-la-flor-de-fuego-\">¿Cómo llevo la flor de fuego?</h3>\n<p>(1/5) Para sacar la Flor de Fuego más allá del Campo de Flores de Fuego...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue15\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue15': {
		'text': "<p>(2/5) Necesitas usar algo que evite que deje caer chispas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue16\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue16': {
		'text': "<p>(3/5) Buscando en la Choza...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue17\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue17': {
		'text': "<p>(4/5) Encontrarás tu Bolsa...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue18\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue18': {
		'text': "<p>(5/5) Mete la Flor de Fuego en la Bolsa y llévala sin peligro.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_cavernas_3': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-bajo-el-abismo-\">¿Cómo bajo el abismo?</h3>\n<p>(1/5) Para bajar el Abismo, necesitas una Soga de Juncos...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue19\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue19': {
		'text': "<p>(2/5) Hecha con Juncos Largos...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue20\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue20': {
		'text': "<p>(3/5) Que encontrarás en el Cañaveral.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue21\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue21': {
		'text': "<p>(4/5) Ata los Juncos Largos entre sí...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue22\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue22': {
		'text': "<p>(5/5) Y ata la Soga resultante al Saliente. Podrás bajar.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_cavernas\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_protector': {
		'clear': true,
		'text': "<h2 id=\"despertar-a-el-protector\">Despertar a El Protector</h2>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector_1\" role=\"link\" tabindex=\"0\">¿Cómo encuentro a El Protector?</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector_2\" role=\"link\" tabindex=\"0\">¿Cómo rescato a El Protector?</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector_3\" role=\"link\" tabindex=\"0\">¿Cómo despierto a El Protector?</a></li>\n</ul>\n<hr>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas\" role=\"link\" tabindex=\"0\">Volver</a>  </li>\n<li><a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">Salir</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_protector_1': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-encuentro-a-el-protector-\">¿Cómo encuentro a El Protector?</h3>\n<p>(1/6) Bajando por el Abismo de las Cavernas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue23\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue23': {
		'text': "<p>(2/6) Llegarás al Templo de El Protector.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue24\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue24': {
		'text': "<p>(3/6) Busca en la Elevación del Templo...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue25\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue25': {
		'text': "<p>(4/6) Y encontrarás las Urnas de descanso de El Protector.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue26\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue26': {
		'text': "<p>(5/6) Buscando en las Urnas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue27\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue27': {
		'text': "<p>(6/6) Encontarás la Urna donde duerme El Protector.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_protector_2': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-rescato-a-el-protector-\">¿Cómo rescato a El Protector?</h3>\n<p>(1/2) Examina con cuidado la la Urna donde duerme El Protector...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue28\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue28': {
		'text': "<p>(2/2) Y luego toca a El Protector.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'pistas_protector_3': {
		'clear': true,
		'text': "<h3 id=\"-c-mo-despierto-a-el-protector-\">¿Cómo despierto a El Protector?</h3>\n<p>(1/11) Debes ir al Norte de la Aldea...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue29\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue29': {
		'text': "<p>(2/11) Entrar en El Crater...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue30\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue30': {
		'text': "<p>(3/11) Y explorar el interior de las Ruinas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue31\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue31': {
		'text': "<p>(4/11) Busca la Caverna Ardiente...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue32\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue32': {
		'text': "<p>(5/11) Y vuelve a hacerla arder.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue33\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue33': {
		'text': "<p>(6/11) Fijate en el Monolito...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue34\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue34': {
		'text': "<p>(7/11) Y observa en detalle la Protuberancia...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue35\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue35': {
		'text': "<p>(8/11) Si buscas en los Tesoros Malditos...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue36\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue36': {
		'text': "<p>(9/11) Encontrarás unas Barras Luminosas...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue37\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue37': {
		'text': "<p>(10/11) Toma una Barra...</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>\n<p><a class=\"squiffy-link link-section\" data-section=\"_continue38\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue38': {
		'text': "<p>(11/11) Y métela en Agujero en la Protuberancia.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"pistas_protector\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
		},
	},
	'inicio': {
		'clear': true,
		'text': "<p><manta abierta>\n{big_space}</p>\n<h1 id=\"-i_mountain-el-protector\">{i_mountain} El Protector</h1>\n<h4 id=\"una-f-bula-ecol-gica-breve\">Una Fábula Ecológica Breve</h4>\n<p>Realizado por: <em>Sebastián Armas (Incanus)</em><br>Versión deluxe: <em>Textagames</em></p>\n<p>(C) Año 2022 {s}\nRelease 1.0.0 {s}\n<strong>NO RECOMENDABLE PARA MENORES DE 14 AÑOS</strong></p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"intro\" role=\"link\" tabindex=\"0\">Introducción</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"aldea\" role=\"link\" tabindex=\"0\">Nueva Partida</a></li>\n</ul>",
		'attributes': ["not abierta","movimientos = 0","ctrlMov = 0"],
		'js': function() {
			//$("body").append('<script src="bg_start.js" id="bg_start"></script>')
		},
		'passages': {
		},
	},
	'intro': {
		'clear': true,
		'text': "<p>{big_space}</p>\n<p>Hace ya muchas estaciones que tu aldea es guardada fielmente...{s}\n...por El Protector.\n<a class=\"squiffy-link link-section\" data-section=\"_continue39\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'js': function() {
			//$("canvas").remove()
			//$("#bg_start").remove()
		},
		'passages': {
		},
	},
	'_continue39': {
		'text': "<p><strong>El Protector ahuyenta a los Cazadores.{s}\nEl Protector siempre está cerca.{s}\nEl Protector vigila de noche.{s}\nEl Protector vigila de día.{s}\nEl Protector los cuida.</strong>\n<a class=\"squiffy-link link-section\" data-section=\"_continue40\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue40': {
		'text': "<p><strong>El Protector es el mejor amigo de la aldea.{s}\nLa vida era difícil antes de El Protector.</strong>\n<a class=\"squiffy-link link-section\" data-section=\"_continue41\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue41': {
		'clear': true,
		'text': "<p>{big_space}</p>\n<p>Antes de la llegada de El Protector, tu gente vivía atemorizada por los implacables Cazadores.\n<a class=\"squiffy-link link-section\" data-section=\"_continue42\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue42': {
		'text': "<p>Los Cazadores siempre acechaban en los Campos de las Flores de Fuego...{s}\ny a veces, cuando hacía frío, había que arriesgar la vida.{s}\nLos Cazadores siempre acechaban cerca del Lago Ardiente...{s}\ny ver su belleza equivalía a morir.{s}\nLos Cazadores siempre acechaban en las Llanuras...{s}\ny era peligroso conseguir alimento.{s}\n<a class=\"squiffy-link link-section\" data-section=\"_continue43\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue43': {
		'text': "<p>Pero llegó El Protector.\n<a class=\"squiffy-link link-section\" data-section=\"_continue44\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue44': {
		'text': "<p>Y El Protector alejó a los Cazadores más allá de los Páramos.\n<a class=\"squiffy-link link-section\" data-section=\"_continue45\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue45': {
		'clear': true,
		'text': "<p>{big_space}</p>\n<p><strong>El Protector nunca exige nada...{s}\npero, a veces, debe descansar.</strong>\n<a class=\"squiffy-link link-section\" data-section=\"_continue46\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue46': {
		'text': "<p><strong>El Protector duerme por poco tiempo...{s}\npero debe ser despertado.</strong>\n<a class=\"squiffy-link link-section\" data-section=\"_continue47\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue47': {
		'text': "<p>Porque, si El Protector durmiera demasiado, los Cazadores podrían volver... y la aldea sería presa fácil para ellos.\n<a class=\"squiffy-link link-section\" data-section=\"_continue48\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue48': {
		'text': "<p>La primera vez que El Protector se echó a dormir nadie lo supo hasta que casi fue demasiado tarde, y apenas quedó alguien en la aldea para buscarlo, encontrarlo y despertarlo.\n<a class=\"squiffy-link link-section\" data-section=\"_continue49\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue49': {
		'text': "<p>La primera vez que El Protector se echó a dormir fue difícil despertarlo... pero la aldea lo logró, y aprendió como debía hacerlo... y cuándo.\n<a class=\"squiffy-link link-section\" data-section=\"_continue50\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue50': {
		'clear': true,
		'text': "<p>{big_space}</p>\n<p>El Protector no ha sido visto{s}\nhace varios días... así que,{s}\nuna vez más, se ha echado a{s}\ndormir.\n<a class=\"squiffy-link link-section\" data-section=\"_continue51\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue51': {
		'text': "<p>La aldea te ha elegido{s}\ny tendrás el gran Honor{s}\nde buscar a El Protector,{s}\ny sacarlo de su sueño.\n<a class=\"squiffy-link link-section\" data-section=\"_continue52\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue52': {
		'text': "<p>Debes hacerlo{s}\ncuanto antes,{s}\npues, pronto,{s}\nllegarán los{s}\nCazadores...\n<a class=\"squiffy-link link-section\" data-section=\"_continue53\" role=\"link\" tabindex=\"0\"> {cont}</a></p>",
		'passages': {
		},
	},
	'_continue53': {
		'text': "<p>Y necesitarán{s}\na El Protector.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"aldea\" role=\"link\" tabindex=\"0\">{cont}</a></p>",
		'passages': {
		},
	},
	'aldea': {
		'clear': true,
		'text': "<p>{barra_estado}</p>\n<h2 id=\"-a-class-squiffy-link-link-passage-data-passage-verb_aldea-role-link-tabindex-0-i_ciudad-la-aldea-a-\"><a class=\"squiffy-link link-passage\" data-passage=\"verb_aldea\" role=\"link\" tabindex=\"0\">{i_ciudad} La Aldea</a></h2>\n<p>{if not Protector: \n    {if not aldea_visitada:\n        La aldea está en medio de la Llanura, \n        que la rodea por completo. Son tan solo \n        unas cuantas chozas, pero para ustedes es \n        el mejor sitio que conocen... y ahora está\n        en peligro, sin El Protector.{s}\n        Tus <a class=\"squiffy-link link-passage\" data-passage=\"amigos\" role=\"link\" tabindex=\"0\">amigos</a> te miran con alegría y te \n        sonríen al pasar, pues ya saben que has de\n        salir pronto en busca de El Protector. \n        Todos te miran expectantes.\n        {@aldea_visitada = true}\n    }\n    {else:\n        Estás en medio de la aldea, rodeado de chozas \n        aquí y allá.{s}\n        Tus <a class=\"squiffy-link link-passage\" data-passage=\"amigos\" role=\"link\" tabindex=\"0\">amigos</a> te miran con curiosidad, pues no \n        entienden por qué motivos no sales aun en busca \n        de El Protector. Sin embargo, sólo esperan a que\n        te decidas a partir de una vez. Todos te miran \n        expectantes.\n    }\n    {s}Hacia el Norte se encuentran la Llanura, y más\n    allá, los Páramos y los Campos de Flores de Fuego. \n    Más lejos, es territorio tabú. En las demás \n    direcciones, sólo se ve la Llanura.\n}\n{else:\n    {if not aldea_general:\n        La aldea está en medio de la Llanura, que la \n        rodea por completo. Són tan solo unas cuantas \n        chozas, pero para ustedes es el mejor sitio que \n        conocen... y a salvo, ahora que traes a El\n        Protector.{s}\n        Tus <a class=\"squiffy-link link-passage\" data-passage=\"amigos\" role=\"link\" tabindex=\"0\">amigos</a> te reciben con alegría y gozo, pues \n        saben, al verte, que traes contigo a El \n        Protector y que la aldea volverá a estar a \n        salvo de los Cazadores. Te animan a seguir\n        adelante, pues debes encontrar un lugar seguro \n        para despertar, por fin, a El Protector. Todos \n        te miran expectantes.\n        {@aldea_general = true}\n    }\n    {else:\n        Estás en medio de la aldea, rodeado de chozas \n        aquí y allá.{s}\n        Tus <a class=\"squiffy-link link-passage\" data-passage=\"amigos\" role=\"link\" tabindex=\"0\">amigos</a> te miran con curiosidad, pues no \n        entienden por qué te demoras en la aldea. El \n        Protector no debe despertar aquí, ya que en su \n        letargo inicial sería presa fácil de los \n        Cazadores. Debes seguir hacia el Norte, hasta tu\n        destino. Todos te miran expectantes.\n    }\n    {s}Hacia el Norte se encuentran la Llanura, y más\n    allá, los Páramos y los Campos de Flores de Fuego. \n    Más lejos, por fin, tu destino. En las demás \n    direcciones, sólo se ve la Llanura.\n}\n{s}<a class=\"squiffy-link link-passage\" data-passage=\"ex_choza\" role=\"link\" tabindex=\"0\">Tu choza</a> se encuentra aquí cerca{if not abierta:, cerrada por una suave <a class=\"squiffy-link link-passage\" data-passage=\"manta\" role=\"link\" tabindex=\"0\">manta</a> de pasto Grafeck}.</p>\n<p>{aldea_ambientador}</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"norte\" role=\"link\" tabindex=\"0\">Ir al norte</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"sur\" role=\"link\" tabindex=\"0\">Ir al sur</a></li>\n</ul>",
		'attributes': ["localizacion = aldea","title = La Aldea","random:aldea_ambientador = Una hermosa mujer pasa caminando frente a tí, ocupada en sus quehaceres diarios. La ves marcharse al interior de una choza.|Llegan algunos recolectores, cargados de fardos de pasto Grafeck. Pronto se dispersan por la aldea.|Contemplas la aldea a tu alrededor. Todo está como siempre.|Unos niños pasan corriendo. Envidias brevemente sus juegos y risas sin afán...|Te llega el suave sonido de un canto de arrullo infantil.|Algunos recolectores abandonan la aldea, en busca de pasto Grafeck."],
		'js': function() {
			$("canvas").remove()
			$("#bg_start").remove()
		},
		'passages': {
			'manta': {
				'text': "<p>Una hermosa y suave manta, cosida a la entrada de tu choza, está tejida a partir de pasto Grafeck. {if abierta:En este momento, la manta esta recogida, permitiendo entrar o salir de la choza}{else:En este momento, la manta esta tendida, franqueando la entrada o salida de la choza}.</p>\n<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"correr_manta\" role=\"link\" tabindex=\"0\">Correr manta</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"coger_manta\" role=\"link\" tabindex=\"0\">Coger manta</a></li>\n</ul>",
			},
			'correr_manta': {
				'text': "",
				'js': function() {
					if(squiffy.get("abierta") == false){
					    squiffy.set("abierta", true)
					} else {
					    squiffy.set("abierta", false)
					}
					setTimeout(function(){window.sq.ui.write("<hr/>");squiffy.story.passage("cr_manta_msg")},400);
					squiffy.story.go('aldea')
				},
			},
			'cr_manta_msg': {
				'text': "<p>{if not abierta:\n    Corres con suavidad la manta de pasto que cierra la entrada, impidiendo entrar o salir.}\n{else:\n    Descorres con suavidad la manta de pasto que cierra la entrada, permitiendo entrar o salir.}</p>",
			},
			'coger_manta': {
				'text': "<p>Está firmemente cosida a la entrada de la choza y no es posible sacarla.</p>",
			},
			'ex_choza': {
				'text': "<p>La choza, como todas las de la aldea, es de base redonda y va perdiendo diámetro según gana altura. Está hecha de tallos de pasto Grafeck, trenzados cuidadosamente. {if abierta:La entrada está abierta, con la manta de pasto Grafeck recogida}{else:La entrada está cerrada por una suave manta de pasto Grafeck}.</p>\n<ul>\n<li>{if abierta:<a class=\"squiffy-link link-section\" data-section=\"choza\" role=\"link\" tabindex=\"0\">Entrar en la choza</a>}{else:<a class=\"squiffy-link link-passage\" data-passage=\"choza_cerrada\" role=\"link\" tabindex=\"0\">Entrar en la choza</a>}</li>\n</ul>",
			},
			'choza_cerrada': {
				'text': "<p>La entrada está cerrada por una suave manta de pasto Grafeck.</p>",
			},
			'verb_aldea': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'Suelo': {
				'text': "<p>El suelo de la aldea está gastado por el constante ir y venir, sobre \ntodo en las chozas. Su color es más bien amarillo, lo que demuestra \ntodo el tiempo que llevan viviendo en el mismo sitio.</p>",
			},
			'Cielo': {
				'text': "<p>El cielo está claro, de un hermoso color violeta, con algunas nubes \nrojas flotando suavemente. Un bello día.</p>",
			},
			'Escuchar': {
				'text': "<p>Oyes el ajetreo diario de tus vecinos. Risas de niños, cantos, pasos...</p>",
			},
			'Oler': {
				'text': "<p>Los aromas de la aldea: sudor, pasto trenzado... paz.</p>",
			},
			'amigos': {
				'text': "<p>Tus vecinos de toda la vida, con quienes has jugado de niño o acompañado a recolectar el vital pasto Grafeck.</p>\n<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"amigos_tocar\" role=\"link\" tabindex=\"0\">Tocarles</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"amigos_hablar\" role=\"link\" tabindex=\"0\">Hablarles</a></li>\n</ul>",
			},
			'amigos_tocar': {
				'text': "<p>Tus amigos devuelven tu caricia con una sonrisa y un \ncariñoso golpe en los pies.</p>",
			},
			'amigos_hablar': {
				'text': "",
			},
		},
	},
	'choza': {
		'clear': true,
		'text': "<p>{barra_estado}</p>\n<h2 id=\"-a-class-squiffy-link-link-passage-data-passage-verb_choza-role-link-tabindex-0-i_choza-la-choza-a-\"><a class=\"squiffy-link link-passage\" data-passage=\"verb_choza\" role=\"link\" tabindex=\"0\">{i_choza} La Choza</a></h2>",
		'passages': {
			'verb_choza': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"techo\" role=\"link\" tabindex=\"0\">Examinar techo</a></li>\n</ul>",
			},
			'techo': {
				'text': "<p>La luz de afuera te llega a través del techo e ilumina toda la choza.</p>",
			},
		},
	},
	'llanura': {
		'text': "",
		'passages': {
			'verb_llanura': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'escuchar': {
				'text': "<p>Oyes el suave sonido del viento meciendo los pastos.<br>Te relaja.</p>",
			},
			'oler': {
				'text': "<p>Todo alrededor, el suave aroma de los <a class=\"squiffy-link link-passage\" data-passage=\"pastos\" role=\"link\" tabindex=\"0\">pastos</a>, un poco agrio y deliciosamente ácido, te rodea, reconfortándote.</p>",
			},
			'suelo': {
				'text': "<p>El suelo es de tierra con muy pocas <a class=\"squiffy-link link-passage\" data-passage=\"dec.piedras\" role=\"link\" tabindex=\"0\">piedras</a>. Su color \nanaranjado te da tranquilidad, pues de trata de un suelo \nfértil para que crezca los pastos.</p>",
			},
			'cielo': {
				'text': "<p>El cielo está claro, de un hermoso color violeta, con \nalgunas <a class=\"squiffy-link link-passage\" data-passage=\"dec.nubes\" role=\"link\" tabindex=\"0\">nubes</a> rojas flotando suavemente. Un bello día. \nIncluso, puedes ver <a class=\"squiffy-link link-passage\" data-passage=\"dec.flotadores\" role=\"link\" tabindex=\"0\">Flotadores</a> vagando por el cielo.</p>",
			},
			'pasto': {
				'text': "<p>El hermoso pasto Grafeck se extiende en todas direcciones \nde la llanura. Sus tallos, flexibles y suaves, se elevan\nhacia el cielo, meciéndose suavemente con el viento. Su\nsuperficie refleja la luz en suaves tonos celestes, azules \ne índigo.</p>",
			},
			'piedras': {
				'text': "<p>A pesar de que el pasto Grafeck lo cubre todo hace ya tiempo, aquí y \nallá pudes    ver algunas piedras sueltas. Son pequeñas, de extraños \ncolores: gris, negro, marrón...</p>",
			},
			'pastos': {
				'text': "<p>El hermoso pasto Grafeck se extiende en todas direcciones\nde la llanura. Sus tallos, flexibles y suaves, se elevan\nhacia el cielo, meciéndose suavemente con el viento. Su \nsuperficie refleja la luz en suaves tonos celestes, \nazules e índigo.</p>",
			},
		},
	},
	'norte': {
		'text': "",
		'passages': {
		},
	},
	'sur': {
		'text': "",
		'passages': {
		},
	},
	'campo_flores': {
		'clear': true,
		'text': "<h2 id=\"-a-class-squiffy-link-link-passage-data-passage-verb_campo_flores-role-link-tabindex-0-el-campo-de-flores-de-fuego-a-\"><a class=\"squiffy-link link-passage\" data-passage=\"verb_campo_flores\" role=\"link\" tabindex=\"0\">El campo de flores de fuego</a></h2>",
		'attributes': ["localizacion = campo_flores","title = El campo de flores de fuego"],
		'passages': {
			'verb_flores': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'suelo': {
				'text': "<p>El suelo es de una especie de arenilla blanca, muy seca y fina.</p>",
			},
			'cielo': {
				'text': "<p>El cielo está claro, de un hermoso color violeta. Curiosamente, no se \nven ninguna nube encima de este campo de flores.</p>",
			},
			'escuchar': {
				'text': "<p>Oyes el suave sonido del viento, pasando por entre las flores... una suave música.</p>",
			},
			'oler': {
				'text': "<p>Las flores despiden un aroma sulfuroso, dulzón, intenso y penetrante.</p>",
			},
		},
	},
	'crater': {
		'clear': true,
		'text': "<h2 id=\"-a-class-squiffy-link-link-passage-data-passage-verb_crater-role-link-tabindex-0-el-cr-ter-a-\"><a class=\"squiffy-link link-passage\" data-passage=\"verb_crater\" role=\"link\" tabindex=\"0\">El Cráter</a></h2>",
		'attributes': ["localizacion = crater","title = Cráter"],
		'passages': {
			'verb_crater': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'suelo': {
				'text': "<p>{if localizacion=&quot;RuinasCielo&quot;:\n    El suelo no sólo está seco y resquebrajado, sino que \n    incluso parece estar pulido; liso como la superficie de\n    un charco, pero duro como la roca: en algunos sitios se\n    ven algunos hoyos esféricos, como burbujas secas.}\n{else:\n    El suelo está muy desgastado, reseco, resquebrajado y \n    sin vida. Es de un color amarillo casi blanco... nada \n    podría crecer aquí.} </p>",
			},
			'cielo': {
				'text': "<p>El cielo está claro, de un color rosa desagradable. No se ve ninguna nube encima de este erial y la luz brilla con especial agudeza, cegándote por un momento.</p>",
			},
			'escuchar': {
				'text': "<p>Oyes una débil brisa, que apenas suena al rozar el polvo del suelo...</p>",
			},
			'oler': {
				'text': "<p>Nada huele a nada... La esterilidad del lugar lo ha dejado sin \nsiquiera olor...</p>",
			},
		},
	},
	'ruinas': {
		'clear': true,
		'text': "<h2 id=\"-a-class-squiffy-link-link-passage-data-passage-verb_ruinas-role-link-tabindex-0-ruinas-a-\"><a class=\"squiffy-link link-passage\" data-passage=\"verb_ruinas\" role=\"link\" tabindex=\"0\">Ruinas</a></h2>",
		'attributes': ["localizacion = ruinas","title = Ruinas"],
		'passages': {
			'verb_ruinas': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'suelo': {
				'text': "<p>{if localizacion=&quot;TunelBlanco1&quot;: {ruinas_suelo_texto}}\n{if localizacion=&quot;TunelBlanco2&quot;: {ruinas_suelo_texto}}\n{if localizacion=&quot;TesorosMalditos&quot;:\n    El suelo es semejante al del pasillo... lo que logra \n    verse, ya que los infames Tesoros lo cubren casi por \n    completo, dificultando el desplazarse en el lugar.}\n{if localizacion=&quot;TumbasHielo&quot;:\n    El suelo es semejante al del pasillo, pero está \n    cubierto por una escarcha finísima.}\n{if localizacion=&quot;CuevasLucesDanzantes&quot;:\n    El suelo es muy diferente al del pasillo... ya que no \n    sabes si realmente está ahí. A pesar de sentir que \n    caminas por una superficie sólida, al mirar hacia \n    abajo te parece como si flotaras en medio de la noche.\n    A veces, tus pasos te mueven encima de alguna de las \n    piscinas de luz que hay en el suelo... pero al pasar \n    encima no sientes nada.}\n{if localizacion=&quot;CuevasLucesDanzantes&quot;:\n    El suelo es de color blanco y está perfectamente liso \n    y pulido; la luz que parece provenir del monolito se \n    refleja en él. Está tibio al tacto.}</p>",
				'attributes': ["ruinas_suelo_texto = El suelo es de color blanco y está perfectamente liso y pulido; la luz que parece provenir del techo se refleja en él. Es frío al tacto."],
			},
			'cielo': {
				'text': "<p>El suelo no sólo está seco y resquebrajado, sino que incluso parece \nestar pulido; liso como la superficie de un charco, pero duro como la \nroca: en algunos sitios se ven algunos hoyos esféricos, como burbujas \nsecas.</p>",
			},
			'escuchar': {
				'text': "<p>El silencio es total. Sólo escuchas tu respiración.</p>",
			},
			'oler': {
				'text': "<p>Nada huele a nada... Tu sentido del olfato se haya extrañamente \nembotado.</p>",
			},
		},
	},
	'ribera': {
		'text': "",
		'passages': {
			'verb_ribera': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"nadar\" role=\"link\" tabindex=\"0\">Nadar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'nadar': {
				'text': "<p>{if localizacion=cienaga:\n    El Cañaveral es muy denso como para poder atravesarlo \n    y llegar al lago.<br>    Por suerte.  }\nSabes que sería suicidio; la superficie del lago arde con \nun calor fortísimo, que se siente apenas acercándose un \npoco...</p>",
			},
			'escuchar': {
				'text': "<p>{if localizacion=cienaga:\n    El suave sonido del oleaje del Lago lamiendo la orilla\n    se mezcla con la canción del viento meciendo los \n    juncos. La sinfonía te deja arrobado unos momentos...}\n{else:\n    Oyes el suave sonido del oleaje del Lago lamiendo la \n    orilla. Una música cambiante, eterna, que te hechiza \n    por un momento.}</p>",
			},
			'oler': {
				'text': "<p>El aroma sulfuroso del Lago te rodea, como una manta \ncálida.</p>",
			},
			'suelo': {
				'text': "<p>{localizacion=playa:\n    El suelo es de arena de un hermoso color verde, muy \n    fina, suave y levemente brillante.}\n{localizacion=roquerios:\n    El suelo es muy rocoso, mezclado con un poco de arena\n    también verde, más gruesa y opaca.}\n{localizacion=cienaga:\n    El suelo está caliente, aunque no quema. Es más \n    compacto que el de la playa y su color es una mezcla \n    difusa del verde de la arena, escasa, con el tono \n    morado de los juncos.}</p>",
			},
			'cielo': {
				'text': "<p>El cielo está claro, de un hermoso color violeta, con algunas <a class=\"squiffy-link link-passage\" data-passage=\"dec.nubes\" role=\"link\" tabindex=\"0\">nubes</a> rojas flotando suavemente. Un bello día.</p>",
			},
		},
	},
	'dec_lago': {
		'text': "",
		'passages': {
			'lago_ex': {
				'text': "<p>Es un verdadero océano de lava ardiente y fluida.<br>Los relatos de los Ancianos de la Aldea cuentan que no \nsiempre existió el Lago, que alguna vez hubo aquí un \nprofundo valle con llanuras como la que rodea tu aldea.<br>Qué ocurrió para que el valle se transformara en este mar\nígneo, los Ancianos no lo saben. Los relatos, sin \nembargo, indican que la lava no es el único peligro en \neste mar de fuego...<br>El lago es muy extenso al Este y Oste, aunque se estrecha\nun poco en esta ribera, por lo que puede ser posible \ncruzarlo... debidamente protegido.</p>",
			},
			'nadar': {
				'text': "<p>Sabes que sería suicidio; la superficie del lago arde con\nun calor fortísimo, que se siente apenas acercándose un \npoco...</p>",
			},
			'lava': {
				'text': "<p>La superficie del lago cambia constantemente, pero el \noleaje es más bien suave; de otra forma sería imposible \navanzar. El color de la lava es amarillo intenso con \nalgunas zonas de color anaranjado o rojo.</p>",
			},
			'escuchar': {
				'text': "<p>Oyes el suave sonido viento, soplando sobre la superficie ardiente del Lago.</p>",
			},
			'oler': {
				'text': "<p>El aroma sulfuroso del Lago te rodea, como una manta cálida.</p>",
			},
		},
	},
	'lago': {
		'text': "",
		'passages': {
			'verb_lago': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"dec_lago.lava\" role=\"link\" tabindex=\"0\">Examinar lava</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"nadar\" role=\"link\" tabindex=\"0\">Nadar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'nadar': {
				'text': "<p>Sabes que sería suicidio; la superficie del lago arde con\nun calor que, afortunadamente, no se siente en las \nconchas que llevas puestas... pero el calor es apenas \nsoportable.</p>",
			},
			'escuchar': {
				'text': "<p>Oyes el suave sonido viento, soplando sobre la superficie ardiente del Lago.</p>",
			},
			'cielo': {
				'text': "<p>El cielo está claro, de un color rosa desagradable. No se\nve ninguna nube encima de este océano ígneo y la luz \nbrilla con especial agudeza, cegándote por un momento.</p>",
			},
		},
	},
	'colina': {
		'text': "",
		'passages': {
			'verb_colina': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"cielo\" role=\"link\" tabindex=\"0\">Examinar cielo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'escuchar': {
				'text': "<p>{if localizacion=piesColina:\n    El suave sonido del oleaje del Lago lamiendo la \n    orilla se mezcla con la canción del viento soplando \n    en el suelo pedregoso.}\n{if localizacion=entradaCaverna:\n    Te parece oir un lejano goteo de líquido... muy \n    tenue...}\n{else:\n    El viento sopla suavemente, susurrando en las piedras\n    del suelo.}</p>",
			},
			'oler': {
				'text': "<p>Solo hueles el aire de la Colina, puro y limpio.</p>",
			},
			'suelo': {
				'text': "<p>{if localizacion=piesColina:\n    El suelo, de un color marrón claro, es pedregoso y \n    carente de toda vegetación. La cercanía con el Lago \n    ha resecado el aire y, a diferencia de la Playa, no \n    ves nada vivo que se aferre al suelo.}\n{if localizacion=laderaColina:\n    El suelo en algunas partes liso y compacto. En otros \n    sitios, hay rocas filosas expuestas, pero en general,\n    es la misma piedra suelta de los Pies de la Colina...\n    un suelo marrón, igualmente desnudo y árido.}\n{if localizacion=entradaCaverna:\n    El suelo es de roca sólida, de color púrpura,            levemente desgastada por el tiempo.}</p>",
			},
			'cielo': {
				'text': "<p>{if localizacion=entradaCaverna:\n    El techo de la Caverna es de roca sólida, de color \n    púrpura, liso, sin relieve.}\n{else:\n    El cielo está claro, de un hermoso color violeta, con\n    algunas nubes rojas flotando suavemente. Un bello \n    día.\n}</p>",
			},
		},
	},
	'caverna': {
		'text': "",
		'passages': {
			'verb_caverna': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"techo\" role=\"link\" tabindex=\"0\">Examinar techo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'escuchar': {
				'text': "<p>Te parece oir un lejano goteo de líquido... muy tenue...</p>",
			},
			'oler': {
				'text': "<p>Solo hueles el aire de la Caverna, un poco húmedo y enrarecido.</p>",
			},
			'suelo': {
				'text': "<p>El suelo es de roca sólida, de color púrpura, levemente desgastada por el tiempo.<br>En algunos sitios es un poco resbaladizo a causa de la humedad.</p>",
			},
			'techo': {
				'text': "<p>El techo de la Caverna es de roca sólida, de color púrpura, liso, sin relieve.</p>",
			},
		},
	},
	'dec_caverna': {
		'text': "",
		'passages': {
			'humedad': {
				'text': "<p>Es un capa fina de líquido, un tanto tibio. Apenas lo tocas se evapora suavemente.</p>",
			},
			'roca': {
				'text': "<p>La roca desnuda es lisa, color púrpura, con algunas irregularidades menores. Está cubierta por una ligera capa de humedad.</p>",
			},
		},
	},
	'templo': {
		'text': "",
		'passages': {
			'verb_templo': {
				'text': "<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"suelo\" role=\"link\" tabindex=\"0\">Examinar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"tocar\" role=\"link\" tabindex=\"0\">Tocar suelo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"techo\" role=\"link\" tabindex=\"0\">Examinar techo</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"escuchar\" role=\"link\" tabindex=\"0\">Escuchar</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"oler\" role=\"link\" tabindex=\"0\">Oler</a></li>\n</ul>",
			},
			'escuchar': {
				'text': "<p>{if protector!=true:\n    Escuchas gotas de líquido aquí y allá... y un ruido \n    extraño y rítmico, proveniente, al parecer, de la \n    elevación.}\n{else:\n    Escuchas un goteo de líquido... muy cercano...}</p>",
			},
			'oler': {
				'text': "<p>Solo hueles el aire de la Caverna, un poco húmedo y enrarecido.</p>",
			},
			'tocar': {
				'text': "<p>&quot;Es extraño... sientes que algunas partes del suelo son sólidas y otras partes cerca, en cambio, muy flexibles.<br>La textura del suelo es más bien lisa... pero hay largas rugosidades extrañas esparcidas por todas partes.<br>Todo está cubierto de una espesa capa de humedad.<br>Todo lo que tocas te produce un sensación familiar, algo que no puedes recordar del todo...</p>",
			},
			'suelo': {
				'text': "<p>El suelo está cubierto por extrañas formas curvas, brillantes a la escasa luz. Todo parece estar cubierto de humedad.</p>",
			},
			'techo': {
				'text': "<p>No logras distinguir el techo de la Caverna en la penumbra sobre tí.</p>",
			},
		},
	},
	'limbo': {
		'text': "<p>Eh. ¿Cómo has llegado aquí?<br>Tío, los Betatesters...</p>",
		'passages': {
		},
	},
	'dec': {
		'text': "<descripciones generales de decorados>\n\n<DECORADO AMPLIADO>",
		'passages': {
			'coger': {
				'text': "<p>No crees que tenga mucho sentido cargar con eso...</p>",
			},
			'empujar': {
				'text': "<p>No parece que se pueda empujar...</p>",
			},
			'oler': {
				'text': "<p>No parece que huela a nada especial.</p>",
			},
			'escuchar': {
				'text': "<p>No produce ningún sonido.</p>",
			},
			'tocar': {
				'text': "<p>Nada ganas con ello.</p>",
			},
			'default': {
				'text': "<p>No ves ninguna razón para hacer éso.</p>",
			},
			'flotadores': {
				'text': "<p>Nadie, ni siquiera los Ancianos, sabe de dónde vienen. Son grandes \ncomo nubes, redondos, translúcidos y etéreos como el aire. Se les \nsuele ver en el cielo, sobre todo en días más despejados, flotando y \nmoviéndose en forma casi imperceptible, a veces atravesando las nubes,\notras veces rodeándolas y consumiéndolas lentamente...<br>Por alguna razón, solo les gusta vagar por encima de las llanuras... y\nsólo de día. Dónde están cuando nadie les ve es un misterio.</p>",
			},
			'piedras': {
				'text': "<p>A pesar de que el pasto Grafeck lo cubre todo hace ya \ntiempo, aquí y allá pudes ver algunas piedras sueltas. \nSon pequeñas, de extraños colores: gris, negro, marrón...</p>",
			},
		},
	},
	'jugador': {
		'clear': true,
		'text': "<p>{barra_estado}</p>\n<p>Eres uno más de La Gente, habitante de las Llanuras y miembro de la \naldea. Tus miembros son delgados y largos. Tu piel es de color \nceleste, casi transparente, semejante al pasto Grafeck tierno. Es un \nbuen día y no hace frío, por lo que no llevas nada puesto.</p>\n<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Tocarte\" role=\"link\" tabindex=\"0\">Tocarte</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Olerte\" role=\"link\" tabindex=\"0\">Olerte</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Cortarte\" role=\"link\" tabindex=\"0\">Cortarte</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Escucharte\" role=\"link\" tabindex=\"0\">Escucharte</a></li>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"Frotarte\" role=\"link\" tabindex=\"0\">Frotarte</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">Volver</a></li>\n</ul>",
		'passages': {
			'Tocarte': {
				'text': "<p>Tu piel es suave y tersa, envidia de los niños, más arrugados y rugosos.</p>",
			},
			'Olerte': {
				'text': "<p>{if not Protector:\n    Hueles a pasto fresco... un olor agrio con un dejo ácido.\n}\n{else:\n    Sientes en tu propia piel el olor característico de El Protector, \n    mezclado con el tuyo: un olor agrio y un tanto ácido.<br>    Te reconforta.\n}</p>",
			},
			'Cortarte': {
				'text': "<p>{if not Protector:\n    No ves necesidad de mutilarte. Tus días de aparearte han quedado \n    atrás.\n}\n{else:\n    No te atreves a hacerlo, llevando a El Protector.\n}</p>",
			},
			'Escucharte': {
				'text': "<p>{if not Protector:\n    Escuchas tus suaves latidos, apenas perceptibles.\n}\n{else:\n    Sientes los suaves latidos de El Protector, cada vez más \n    vigorosos.<br>    Pronto despertará...\n}</p>",
			},
			'Frotarte': {
				'text': "<p>Frotándote con energía, te das un poco de calor.</p>",
			},
		},
	},
	'barra_estado': {
		'text': "<div id=\"barra\" style=\"border: 2px black solid; background: white; padding-left: 0.4em;\">\n    <div style=\"display: inline-block; width: 19%;background: transparent;color: black;\">\n        {i_mov}<strong>Mov: <span id=\"mov\">1</span></strong>\n    </div>\n    <div style=\"text-align: right;display: inline-block; width: 79%;background: transparent;color: black;\">\n        <a class=\"squiffy-link link-section\" data-section=\"jugador\" role=\"link\" tabindex=\"0\">{i_jugador}</a> {i_separador} <a class=\"squiffy-link link-section\" data-section=\"inventario\" role=\"link\" tabindex=\"0\">{i_invent}</a> {i_separador} <a class=\"squiffy-link link-section\" data-section=\"pistas\" role=\"link\" tabindex=\"0\">{i_pistas}</a> {i_separador} <a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">{i_refrescar}</a> {i_separador} <a class=\"squiffy-link link-section\" data-section=\"Reiniciar\" role=\"link\" tabindex=\"0\">{i_reiniciar}</a>\n    </div>\n</div>",
		'passages': {
		},
	},
	'Reiniciar': {
		'clear': true,
		'text': "<p>{barra_estado}</p>\n<p>¿Quieres reiniciar el juego? Todo tu avance se perderá.</p>\n<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"si\" role=\"link\" tabindex=\"0\">Sí</a></li>\n<li><a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">No</a></li>\n</ul>",
		'passages': {
		},
	},
	'si': {
		'text': "<ul>\n<li><a class=\"squiffy-link link-section\" data-section=\"ultima_localizacion\" role=\"link\" tabindex=\"0\">No</a></li>\n</ul>",
		'js': function() {
			$('#squiffy').squiffy('restart')
			//window.squiffy.story.restart()
		},
		'passages': {
		},
	},
	'configuracion': {
		'text': "",
		'js': function() {
			//Utilidades
			set("s","<br/>")
			set("cont","<ul><li><span>Continuar</span></li></ul>")
			set("big_space","<div style='height: 3em;'></div>")
			set("i_norte", '<i class="fa-solid fa-circle-up"></i>&nbsp;&nbsp;')
			set("i_sur", '<i class="fa-solid fa-circle-down"></i>&nbsp;&nbsp;')
			set("i_ciudad", '<i class="fa-solid fa-dungeon"></i>&nbsp;')
			set("i_mountain", '<i class="fa-solid fa-mountain-sun"></i>&nbsp;')
			set("i_jugador", '&nbsp;<i class="fa-solid fa-user-large"></i>&nbsp;')
			set("i_choza", '<i class="fa-solid fa-house-user"></i>&nbsp;')
			set("i_invent", '&nbsp;<i class="fa-solid fa-toolbox"></i>&nbsp;')
			set("i_pistas", '&nbsp;<i class="fa-solid fa-puzzle-piece"></i>&nbsp;')
			set('i_separador', '&nbsp;<i class="fa-solid fa-ellipsis-vertical"></i>&nbsp;')
			set('i_reiniciar', '&nbsp;<i class="fa-solid fa-power-off"></i>&nbsp;')
			set('i_refrescar', '&nbsp;<i class="fa-solid fa-retweet"></i>&nbsp;')
			set('i_mov', '&nbsp;<i class="fa-solid fa-shoe-prints"></i>&nbsp;')
			//Inicia el Juego
			squiffy.story.go('logo1')
		},
		'passages': {
		},
	},
	'ultima_localizacion': {
		'text': "",
		'js': function() {
			squiffy.story.go(squiffy.get("localizacion"))
		},
		'passages': {
		},
	},
	'ambientador': {
		'text': "",
		'attributes': ["random:llanura_ambientador = La brisa mueve suavemente los pastos.|El viento canta una dulce canción en tus oídos.|Contemplas la llanura a tu alrededor. Su paz te invade, refrescando tu ánimo.","random:flores_ambientador = La brisa mueve suavemente las flores, levantando chispas iridiscentes... suspendidas un momento en el aire... y que caen, consumidas, nuevamente sobre las flores.|Una suave oleada de aire tibio sale de las flores y te acaricia, sensualmente.|Contemplas las flores, nimbadas de una suave luz.","random:crater_ambientador = Una ráfaga de aire caliente se levanta del suelo.|El viento levanta polvo, obligándote a cubrir tu rostro. Sesa, y todo queda en calma.|El reflejo del suelo te da en los ojos, cegándote momentáneamente.","random:ruinas_ambientador = El eco de un sonido lejano te sobresalta.|Sientes tu propia respiración como un ruido estruendoso.|Te estremeces, sin motivo aparente.","random:ribera_ambientador = Te llega una suave brisa, entibiada por el Lago cercano.|El viento canta una dulce canción, moviendo suavemente los juncos.|El rumor de las olas del Lago llega a tus oidos.","random:lago_ambientador = Contemplas la superficie del Lago. Su oleaje es hipnótico...|Una sombra oscura, enorme, cruza bajo tus pies. Desaparece.|Una ráfaga de aire caliente se levanta del Lago.","random:colina_ambientador = Unas pequeñas piedritas caen al mover tus pies.|El viento levanta un poco de polvo.|Una sombra oscura se cierne sobre ti. Ruido de alas. Te quedas inmóvil. Se aleja... y respiras aliviado.","random:caverna_ambientador = Escuchas ecos lejanos... como un goteo...|La humedad entrecorta tu respiración.|El calor sofocante te provoca un ligero mareo. Descansas un poco.","random:templo_ambientador = Escuchas ecos lejanos... como un goteo...|La humedad entrecorta tu respiración.|El calor sofocante te provoca un ligero mareo. Descansas un poco."],
		'js': function() {
			//solo usar como repositorio mientras se van creando
			//las secciones
		},
		'passages': {
		},
	},
	'bg_start': {
		'text': "",
		'js': function() {
			$("body").append('<script src="bg_start.js" id="bg_start"></script>')
			
		},
		'passages': {
		},
	},
	'rm_bg_start': {
		'text': "",
		'js': function() {
			$("canvas").remove()
			$("#bg_start").remove()
		},
		'passages': {
		},
	},
	'': {
		'text': "",
		'js': function() {
			//contabilizar movimiento
			window.saveMov = function (){
			    if (squiffy.story.seen("aldea")){
			        let mov = squiffy.get("movimientos");
			        mov++;
			        setTimeout(function(){
			            if (document.getElementById("mov")){
			                document.getElementById("mov").innerText=mov;
			            }}, 200);
			        squiffy.set("movimientos", mov);
			    }
			 };
			 if(squiffy.get("ctrlMov") == 0){
			    window.saveMov();
			    squiffy.set("ctrlMov", 1);
			 } else if ((squiffy.get("ctrlMov") == 1)){
			    squiffy.set("ctrlMov", 0);
			 }
			 
			 //
			window.sq = squiffy;
			window.sec= squiffy.story.sections;
			//imprimir cualquier pasaje
			squiffy.story.passage = function(passageName) {
			    if (passageName.includes(".")){
			        let group = passageName.split(".");
			        let sectionName = group[0];
			        let passageTitle = group[1];
			        let pass = squiffy.story.sections[sectionName].passages[passageTitle];
			        if (!pass) return;
			        //setSeen(passageTitle);
			        var masterSection = squiffy.story.sections[''];
			        if (masterSection) {
			            var masterPassage = masterSection.passages[''];
			            if (masterPassage) {
			                squiffy.story.run(masterPassage);
			                squiffy.ui.write(masterPassage.text);
			            }
			        }
			        var master = window.sq.story.section.passages[''];
			        if (master) {
			            squiffy.story.run(master);
			            squiffy.ui.write(master.text);
			        }
			        if (pass.clear) {
			            squiffy.ui.clearScreen();
			        }
			        if (pass.attributes) {
			            processAttributes(pass.attributes);
			        }
			        if (pass.js) {
			            pass.js();
			        }
			        squiffy.ui.write(pass.text);
			        squiffy.story.save();
			    } else {
			        var passage = squiffy.story.section.passages[passageName];
			        if (!passage) return;
			        //setSeen(passageName);
			        var masterSection = squiffy.story.sections[''];
			        if (masterSection) {
			            var masterPassage = masterSection.passages[''];
			            if (masterPassage) {
			                squiffy.story.run(masterPassage);
			                squiffy.ui.write(masterPassage.text);
			            }
			        }
			        var master = squiffy.story.section.passages[''];
			        if (master) {
			            squiffy.story.run(master);
			            squiffy.ui.write(master.text);
			        }
			        if (passage.clear) {
			            squiffy.ui.clearScreen();
			        }
			        if (passage.attributes) {
			            processAttributes(passage.attributes);
			        }
			        if (passage.js) {
			            passage.js();
			        }
			        squiffy.ui.write(passage.text);
			        squiffy.story.save();
			    }
			};
			
			
			//para establecer atributos
			var setAttribute = function(expr) {
			    var lhs, rhs, op, value;
			    var setRegex = /^([\w]*)\s*=\s*(.*)$/;
			    var setMatch = setRegex.exec(expr);
			    if (setMatch) {
			        lhs = setMatch[1];
			        rhs = setMatch[2];
			        if (isNaN(rhs)) {
						if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
			            squiffy.set(lhs, rhs);
			        }
			        else {
			            squiffy.set(lhs, parseFloat(rhs));
			        }
			    }
			    else {
					var incDecRegex = /^([\w]*)\s*([\+\-\*\/])=\s*(.*)$/;
			        var incDecMatch = incDecRegex.exec(expr);
			        if (incDecMatch) {
			            lhs = incDecMatch[1];
			            op = incDecMatch[2];
						rhs = incDecMatch[3];
						if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
						rhs = parseFloat(rhs);
			            value = squiffy.get(lhs);
			            if (value === null) value = 0;
			            if (op == '+') {
			                value += rhs;
			            }
			            if (op == '-') {
			                value -= rhs;
			            }
						if (op == '*') {
							value *= rhs;
						}
						if (op == '/') {
							value /= rhs;
						}
			            squiffy.set(lhs, value);
			        }
			        else {
			            value = true;
			            if (startsWith(expr, 'not ')) {
			                expr = expr.substring(4);
			                value = false;
			            }
			            squiffy.set(expr, value);
			        }
			    }
			};
			var processAttributes = function(attributes) {
			    attributes.forEach(function (attribute) {
			        if (startsWith(attribute, '@replace ')) {
			            replaceLabel(attribute.substring(9));
			        }
			        else {
			            setAttribute(attribute);
			        }
			    });
			};
			
			//funcion para numero aleatorio
			var generateRandomNumber = (min, max) =>  {
			    return Math.floor(Math.random() * (max - min) + min)
			}
			//genera numero
			var control = generateRandomNumber(1,10)
			
			//para usar en el ambientador aleatorio
			var regex = /^random:\s*(\w+)\s*=\s*(.+)/i
			var matches, attr, options
			if ( control > 4 && squiffy.story.section.attributes) {
			    squiffy.story.section.attributes.forEach (line => {
			        if (matches = regex.exec(line)) {
			            options = matches[2].split("|")
			            squiffy.set(matches[1], "<em>"+options[Math.floor(Math.random() * options.length)]+"</em>")
			        }
			    })
			} else if ( control <= 4 && squiffy.story.section.attributes) {
			    squiffy.story.section.attributes.forEach (line => {
			        if (matches = regex.exec(line)) {
			            squiffy.set(matches[1], "")
			        }
			    })
			}
			
			//Eliminar lista de acciones
			$("ul").remove()
			setTimeout(
			    function(){
			        $('ul+p').remove()
			        $('p a.squiffy-link').filter(function() {
			            var text = $(this).text().replace(/\s*/g, '')
			            return !text;
			            }).hide()
			        },50)
		},
		'passages': {
			'': {
				'text': "",
				'js': function() {
					window.saveMov();
				},
			},
		},
	},
}
})();