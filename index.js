const { Client, Collection, GatewayIntentBits, IntentsBitField, ActionRowBuilder, StringSelectMenuBuilder, Partials } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
		    GatewayIntentBits.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
		    GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
   
    if (newState.channel && !oldState.channel) {
        
        try {
            const channel = newState.channel;
            await channel.send(`<@${newState.member.id}> joined the vc.`);
        } catch (err) {
            console.error('Error sending message when joining VC:', err);
        }
    }

    
    if (!newState.channel && oldState.channel) {
      
        try {
            const channel = oldState.channel;
            await channel.send(`<@${oldState.member.id}> left the vc.`);
        } catch (err) {
            console.error('Error sending message when leaving VC:', err);
        }
    }

    
    if (newState.channel && oldState.channel && newState.channel.id !== oldState.channel.id) {
        try {
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;
            
            await oldChannel.send(`<@${newState.member.id}> switched to another vc.`);
            await newChannel.send(`<@${newState.member.id}> joined the vc.`);
        } catch (err) {
            console.error('Error sending message when switching VC:', err);
        }
    }
});

client.login(process.env.TOKEN);