const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Bot configuration
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildForumChannels
  ]
});

// Configuration - Replace with your actual values
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/u/1/s/AKfycbyHaLUqSQQhxEjlZd8nofSHNJJ2DF9xv8KfPjEqdpsQd1EmaImLUQJ7PDDkbqI_tU12/exec";
const BOT_TOKEN = "NzU0NjgzMjQ2MjUxNDc1MDA0.GluN4-.LballFa6A8tpwCKHMaUjzu0ZW4xzHaCertPH70";

// Store active threads to prevent duplicate processing
const processedThreads = new Set();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process forum threads
  if (!message.channel.isThread()) return;
  
  const parentChannel = message.channel.parent;
  if (!parentChannel || parentChannel.type !== 15) return; // Forum channel type

  // Check if we've already processed this thread
  if (processedThreads.has(message.channelId)) return;
  processedThreads.add(message.channelId);

  // Process figures in the message
  const figureRegex = /(\d+(?:\.\d+)?)/g;
  const figures = message.content.match(figureRegex);
  
  if (!figures || figures.length === 0) return;

  try {
    // Send data to Google Sheets via Web App
    await updateSpreadsheet(message, figures);
    
    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setTitle('Figures Updated')
      .setDescription(`Found ${figures.length} figure(s) in thread: ${message.channel.name}`)
      .addFields(
        { name: 'Figures', value: figures.join(', ') },
        { name: 'Author', value: message.author.tag, inline: true },
        { name: 'Channel', value: parentChannel.name, inline: true }
      )
      .setColor('#00ff00')
      .setTimestamp();

    // Send confirmation to the forum thread
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error processing message:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('Error Processing Message')
      .setDescription(`Failed to update spreadsheet for figures in ${message.channel.name}`)
      .setColor('#ff0000')
      .setTimestamp();
      
    await message.channel.send({ embeds: [errorEmbed] });
  }
});

async function updateSpreadsheet(message, figures) {
  // This is a simplified version - adjust according to your Google Apps Script logic
  try {
    // Example: Send data to your Web App
    await axios.post(GOOGLE_SCRIPT_URL, null, {
      params: {
        updateBalance: 2,
        amount: figures.reduce((sum, num) => sum + parseFloat(num), 0)
      }
    });
  } catch (error) {
    console.error('Failed to update spreadsheet:', error);
    throw error;
  }
}

// Handle thread creation for new forum posts
client.on('threadCreate', async (thread) => {
  if (thread.parent.type !== 15) return; // Forum channel
  
  // Add a welcome message with instructions
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('Forum Thread Created')
    .setDescription(`This thread will automatically track numerical figures. Please post your data here for tracking.`)
    .setColor('#00aaff');
    
  await thread.send({ embeds: [welcomeEmbed] });
});

// Handle errors
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Login with token from environment variable
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required!');
  process.exit(1);
}

if (!GOOGLE_SCRIPT_URL) {
  console.error('GOOGLE_SCRIPT_URL is required!');
  process.exit(1);
}

client.login(BOT_TOKEN);
