# DaZeus Topic History
Provides a command for displaying the topic history.

## Available commands

    }topic

If not in a query, this displays the previous topic, by who and at what time it was set, if it is known.

    }topic [n]

If not in a query, displays the n-th previous topic, if it is known. If `n` is `current` or less than 1, it will
show information about the current topic.

    }topic [channel]

Displays the previous topic in a channel, if it is known.

    }topic [channel] [n]

Displays the n-th previous topic in a channel, if it is known, `n` may also be `current` or less than 1 to get info
about the current topic.

    }topic help

Displays help on the command

## Installing it

    npm install dazeus-plugin-topic

## Running it
To let this command run, simple execute this command in the root folder of the plugin

    node index

Several options are available, see the command line documentation for that:

    node index --help
