var lodash = require('lodash');

var Discord = require("discord.js");
var Snoocore = require('snoocore');
var reddit = new Snoocore({
  userAgent: 'test@documentation',
  oauth: {
    type: 'explicit',
    secret: 'M9to4if1L1aquI76EuUXUxhkGcE',
    key: 'HlimaJP10Isd_Q',
    redirectUri: 'http://localhost:8000',
    scope: [ 'read' ],
    deviceId: 'DO_NOT_TRACK_THIS_DEVICE' // see below
  }
});
// var Reddit = require("snoowrap");
var express = require('express');
var app = express();

var bot = new Discord.Client();

var statsPrintFunctions = {
	printOperator : function(operator) {
		var keys = Object.keys(operator.stats.specials);
		
		return "```Markdown\n" +
				"#Stats for [" + operator.operator.name + "]\n"
				+ "* Wins: " + operator.stats.wins + " | Losses: " + operator.stats.losses 
				+ " | W/L: " + (operator.stats.wins / operator.stats.losses).toFixed(2) + "\n"
				+ "* Kills: " + operator.stats.kills + " | Deaths: " + operator.stats.deaths 
				+ " | K/D: " + (operator.stats.kills / operator.stats.deaths).toFixed(2) + "\n"
				+ "* Playing Time: " + (operator.stats.playtime / 3600).toFixed(2) + " Hrs\n"
				+ "* Special: [ " + keys[0].split("_").slice(2).join("-") + " = " + operator.stats.specials[keys[0]] + " ]"
				+ "```";
	}
}

bot.on('ready', () => {
  console.log('I am ready!');
});

var statsFunctions = {
	"user" : function(bot,msg,suffix, args) {
		require("request")("https://api.r6stats.com/api/v1/players/"+suffix+"?platform=uplay", function(err,res,body) {
			if (err) {
				return;
			}

			var response;

			try {
				response = JSON.parse(body);
			} catch (e) {
				msg.reply("Sorry, problems with Statistics Server");

			    return;
			}
			var player = response.player;
			
			if(player) {
				msg.reply(
					"```Markdown\n" +
				"#Stats for [" + suffix + "]\n"
				+ "* Ranked\n"
				+ "- K/D: " + player.stats.ranked.kd + "\n"
				+ "- W/L: " + player.stats.ranked.wlr + "\n"
				+ "* Casual\n"
				+ "- K/D: " + player.stats.casual.kd + "\n"
				+ "- W/L: " + player.stats.casual.wlr + "\n"
				+ "* Overall\n"
				+ "- Wins: " + (player.stats.ranked.wins + player.stats.casual.wins) + "\n"
				+ "- Losses: " + (player.stats.ranked.losses + player.stats.casual.losses) + "\n"
				+ "- Playing Time: " + ((player.stats.ranked.playtime + player.stats.casual.playtime) / 3600).toFixed(2) + " Hrs"
				+ "```")
			} else {
				msg.reply("Can't find [" + suffix +"]")

				return
			}
		});

		require("request")("https://api.r6stats.com/api/v1/players/"+suffix+"/seasons?platform=uplay", function(err,res,body) {
			if (err) {
				console.log(err);
				return;
			}

			var response;

			try {
				response = JSON.parse(body);
			} catch (e) {
			    return;
			}

			var seasonKeys = Object.keys(response.seasons);
			var player = response.seasons[seasonKeys[seasonKeys.length - 1]].emea;
			
			if(player) {
				var ranks = ["Copper 1", "Copper 2", "Copper 3", "Copper 4",
							 "Bronze 1", "Bronze 2", "Bronze 3", "Bronze 4",
							 "Silver 1", "Silver 2", "Silver 3", "Silver 4", 
							 "Gold 1", "Gold 2", "Gold 3", "Gold 4", 
							 "Platinum 1", "Platinum 2", "Platinum 3",
							 "Diamond"];
				var toNextRank = "Хоп, задрот!";
				if (player.ranking.rank != 20) {
					toNextRank = (player.ranking.next_rating - player.ranking.rating).toFixed(0);
				} 

				var returnMessage = "```Markdown\n"
				+ "#Current season " + seasonKeys[0] + " info\n"
				+ "* Wins: " + player.wins + "\n"
				+ "* Losses: " + player.losses + "\n"
				+ "* Rank: " + ranks[player.ranking.rank - 1] + "\n"
				+ "* To next Rank: " + toNextRank
				+ "```";
				msg.reply(returnMessage)
				console.log(player);
			} else {
				msg.reply("Can't find seasonal info for [" + suffix +"]")
			}
		});
	},
	"operator" : function(bot,msg,suffix, args) {

		var sortOptions = {"kd" : "Kills/Deaths", "wl" : "Wins/Losses", "playtime" : "Playing Time"};
		
		if (args[0] == "operator_rating") {

			if (args.length < 2) {
				msg.reply("Missed required sorting. You can use kd / wl / playtime.");

				return;
			}

			if (!sortOptions[args[1]]) {
				msg.reply("Incorrect sorting option. You can use kd / wl / playtime.");

				return;
			}
		} else if (args[0] == "operator") {
			if (args.length < 2) {
				msg.reply("Missed operator. Please, write operator's name.");

				return;
			}

		}

		require("request")("https://api.r6stats.com/api/v1/players/"+suffix+"/operators?platform=uplay", function(err,res,body) {
			if (err) {
				return;
			}

			var response;

			try {
				response = JSON.parse(body);
			} catch (e) {
				msg.reply("Sorry, problems with Statistic Server");

			    return;
			}

			var operators = response.operator_records;

			if (args[0] == "operator") {
				var operator_name = args[1].toLowerCase();
				if (operator_name == "jager") {
					operator_name = "jÄger";
				}

				var operator = lodash.find(operators, function(item) {
					return item.operator.name.toLowerCase() === operator_name;
				});

				if (!operator) {
					msg.reply("No such operator");

					return;
				}

				msg.reply(statsPrintFunctions.printOperator(operator));

				return;
			}

			if (args[0] == "operator_rating") {
				lodash.forEach(operators, function(item) {
					item.stats.wl = item.stats.wins / item.stats.losses;
					item.stats.kd = item.stats.kills / item.stats.deaths;
				});

				var sortedOperators = lodash.orderBy(operators, "stats." + args[1], 'desc');
				var topOperators = sortedOperators.slice(0, 3);
				var worstOperators = sortedOperators.slice(-3);
				
				msg.reply("```Markdown\n#Top operators by " + sortOptions[args[1]] + "```");

				var topOperatorsMessage = "";

				lodash.forEach(topOperators, function(item) {
					topOperatorsMessage = topOperatorsMessage + statsPrintFunctions.printOperator(item);
				});
				msg.channel.sendMessage(topOperatorsMessage);

				msg.reply("\n```Markdown\n#Worst operators by " + sortOptions[args[1]] + "```");

				var worstOperatorsMessage = "";
				lodash.forEach(worstOperators, function(item) {
					worstOperatorsMessage = worstOperatorsMessage + statsPrintFunctions.printOperator(item);
				});
				msg.channel.sendMessage(worstOperatorsMessage);

				return;

			}
		});
	}
}



var commands = {	
	"stats": {
		usage: ["**nickname** __operator__ **operator_name**",
			    "**nickname** __operator_rating__ **[kd, wl, playtime]**"],
		description: ["Returns stats for chosen operator.\n",
					  "Show 3 top and 3 worst operators by given sort type (kd, wl, playtime)"],
		process: function(bot,msg,suffix, args) {
			if (!args || args.length == 0) {
				statsFunctions["user"](bot, msg,suffix,args);

				return;
			} else {
				statsFunctions["operator"](bot, msg,suffix,args);

				return;

			}


			
		}
	}, 	
	"reddit": {
		usage: ["__news__ *number_of_news*", "__pic__ *number_of_pics*"],
		description: ["Returns given number of latest news of R6 Reddit",
					  "Returns random pic of given number of them from the R6 Reddit"],
		process: function(bot,msg,suffix, args) {
			var flair = 'news';
			var limit = 3;

			if (suffix == "pic") {
				flair = "fluff";
				limit = 10;
			}

			if (args.length) {
				limit = args[0];
			}

			console.log(flair);

			reddit('/r/Rainbow6/search').listing({
				sort: "new", 
				restrict_sr: true,
				q: "flair:'" + flair + "'" ,
				limit: limit}).then(function(result) {
					if (result.children.length <= 0) {
						return;
					}

					if (flair == "news") {
						if (result.stickied.length) {
							msg.channel.sendMessage("**#STICKED:**\n" + result.stickied[0].data.title 
								+ "\n" + result.stickied[0].data.url);
						}

						if (limit > 5) {
							limit = 5;
						}

						for (var i =0; i < limit; i++) {
							if (result.children.length <= i) {
								break;
							}
							msg.channel.sendMessage("-----------\n");
							msg.channel.sendMessage(result.children[i].data.title + "\n" + result.children[i].data.url);

						}

						return;
					}
					
					var i = Math.floor(Math.random() * result.children.length);
					console.log(i + " - " + result.children.length);
					msg.reply(result.children[i].data.title + "\n" + result.children[i].data.url);
			});
		}
	}
};

bot.on('message', message => {
	let prefix = "!";

	if (!message.content.startsWith(prefix)) {
		return;
	}
	var user_command = message.content.replace(/\s\s+/g, ' ');
	let args = user_command.split(" ");
	var command_name = args[0].slice(1);
  console.log(command_name);
  console.log(args);
	
	if (command_name == "help") {
		Object.keys(commands).forEach(function(key) {
			for (var i = 0; i < commands[key].usage.length; i++) {
				message.channel.sendMessage("__**!" + key + "**__ " + commands[key].usage[i] + "\n");
				message.channel.sendMessage("```" + commands[key].description[i] + "```\n");
			}

		});

  		return;
 	}

	if (commands[command_name]) {
		commands[command_name].process(bot, message, args[1], args.slice(2));
	}
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

bot.login("MjY4NjE5MDE1NTYyMTk5MDQw.C1dafA.UUx1lladCud7FNQsrbgztCE4VFk");