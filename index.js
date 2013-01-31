require('js-methods');
var dazeus = require('dazeus');
var strftime = require('prettydate').strftime;
var datetime = require('datetime');
var util = require('util');

// constants, names and text
var CURRENT_TOPIC_PROPERTY = 'dazeus.plugin.topic.current';
var PREVIOUS_TOPIC_PROPERTY = 'dazeus.plugin.topic.previous';
var TOPIC_CMD = 'topic';
var HELP_CMD = 'help';
var CURRENT_CMD = 'current';
var MAX_PREVIOUS = 10;

var TOO_FAR = 'too_far';
var CURRENT = 'current';
var PREVIOUS = 'previous';
var NO_CHANGES = 'no_changes';

var TXT_HELP = "Use }topic [channel] [{n,current}] where channel is some channel," +
    " n is some number, [] means 'this is optional' and {} means 'pick one'" +
    " (i.e., just try it).";
var TXT_NO_CHANGES = "I haven't seen any topic changes for this channel";
var TXT_TOO_FAR = "I haven't seen any topics that far back";
var TXT_CURRENT = "The current topic was set by %s at %s (%s)";
var TXT_PREVIOUS = "The%s previous topic for this channel was set by %s at %s (%s), it was:";
var TXT_DUNNO = "Dunno what ya talkin' 'bout";

var CHANNEL_REGEX = /^([#&][^\x07\x2C\s]{0,200})$/;

// lets parse command line args
var argv = dazeus.optimist().argv;
dazeus.help(argv);
var options = dazeus.optionsFromArgv(argv);

// create the client
var client = dazeus.connect(options, function () {
    client.on('TOPIC', function (network, user, channel, topic) {
        var toStore = {topic: topic, user: user, time: (new Date()).getTime()};
        getCurrentTopic(network, channel, client, function (current) {
            addPreviousTopic(network, channel, current, client);
            client.setProperty(
                CURRENT_TOPIC_PROPERTY,
                JSON.stringify(toStore),
                [network, channel]
            );
        });
    });

    client.onCommand(TOPIC_CMD, function (network, user, channel, command, args) {
        if (args === HELP_CMD) {
            client.reply(network, channel, user, TXT_HELP);
        } else {
            var which = parseInt(args, 10);
            var forChannel = channel;
            if (isNaN(which)) {
                which = 1;
                var argsplit = dazeus.firstArgument(args);
                if (CHANNEL_REGEX.test(argsplit[0].trim())) {
                    forChannel = argsplit[0].trim();
                    if (typeof argsplit[1] !== 'undefined') {
                        which = parseInt(argsplit[1], 10);
                        if (isNaN(which)) {
                            if (argsplit[1] === CURRENT_CMD) {
                                which = 0;
                            } else {
                                which = 1;
                            }
                        }
                    }
                } else if (argsplit[0] === CURRENT_CMD) {
                    which = 0;
                }
            }

            if (which < 0) {
                which *= -1;
            }

            if (!CHANNEL_REGEX.test(forChannel)) {
                client.reply(network, channel, user, TXT_DUNNO);
            } else {
                getPreviousTopic(network, forChannel, client, which, function (topic, user, time, reason) {
                    if (reason === NO_CHANGES) {
                        client.reply(network, channel, user, TXT_NO_CHANGES, false);
                    } else if (reason === TOO_FAR) {
                        client.reply(network, channel, user, TXT_TOO_FAR, false);
                    } else if (reason === CURRENT) {
                        client.reply(network, channel, user, util.format(TXT_CURRENT,
                            user, displayTime(time), datetime.formatAgo(time)), false);
                    } else {
                        var changed = "";
                        if (which > 1) {
                            changed = " " + ordinal(which);
                        }

                        var notify = util.format(TXT_PREVIOUS,
                            changed, user, displayTime(time), datetime.formatAgo(time));
                        client.reply(network, channel, user, notify, false);
                        client.reply(network, channel, user, topic, false);
                    }
                });
            }
        }
    });
});

var addPreviousTopic = function (network, channel, topic, client) {
    getPreviousTopics(network, channel, client, function (topics) {
        topics.unshift(topic);
        if (topics.length > MAX_PREVIOUS) {
            topics = topics.slice(0, MAX_PREVIOUS - 1);
        }

        client.setProperty(
            PREVIOUS_TOPIC_PROPERTY,
            JSON.stringify(topics),
            [network, channel]
        );
    });
};

var getPreviousTopic = function (network, channel, client, n, callback) {
    if (typeof n === 'function') {
        callback = n;
        n = 1;
    }

    if (n < 1) {
        getCurrentTopic(network, channel, client, function (topic) {
            if (topic === null) {
                callback(null, null, null, NO_CHANGES);
            } else {
                callback(topic.topic, topic.user, new Date(topic.time), CURRENT);
            }
        });
    } else {
        getPreviousTopics(network, channel, client, function (topics) {
            if (typeof topics[n - 1] === 'object' && topics[n - 1] !== null) {
                var topic = topics[n - 1];
                callback(topic.topic, topic.user, new Date(topic.time), PREVIOUS);
            } else {
                callback(null, null, null, TOO_FAR);
            }
        });
    }
};

var getCurrentTopic = function (network, channel, client, callback) {
    client.getProperty(CURRENT_TOPIC_PROPERTY, [network, channel], function (data) {
        var value = null;
        if (data.value) {
            try {
                value = JSON.parse(data.value);
            } catch (e) {}
        }
        callback(value);
    });
};

var getPreviousTopics = function (network, channel, client, callback) {
    client.getProperty(PREVIOUS_TOPIC_PROPERTY, [network, channel], function (data) {
        var value = [];
        if (data.value) {
            try {
                value = JSON.parse(data.value);
            } catch (e) {}
        }
        callback(value);
    });
};

var ordinal = function (n) {
    if (n < 0) {
        return n;
    }

    var post = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (post[(v - 20) % 10] || post[v] || post[0]);
};

var displayTime = function (time) {
    return strftime(time, "%F %H:%M:%S");
};

