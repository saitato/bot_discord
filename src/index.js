require('dotenv').config();
const { Client, IntentsBitField,Collection } = require('discord.js');
const mongoose = require('mongoose');
const eventHandler = require('./handlers/eventHandler');


const {REST} = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Player } = require("discord-player")
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildPresences,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.AutoModerationConfiguration,
    IntentsBitField.Flags.AutoModerationExecution,
    IntentsBitField.Flags.GuildVoiceStates
  ],
});



(async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB.');

    eventHandler(client);
    
    client.login(process.env.TOKEN);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();
