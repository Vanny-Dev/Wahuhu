const { Client, GatewayIntentBits, IntentsBitField, Partials } = require('discord.js');
require('dotenv').config();
require("./keep_alive.js");
require("./features/birthday.js")
require("./features/vcnotif.js")

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
		GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Message, 
        Partials.Channel, 
        Partials.Reaction
    ],
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.TOKEN);