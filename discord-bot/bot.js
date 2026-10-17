require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { DISCORD_BOT_TOKEN: TOKEN, DISCORD_APP_ID: APP_ID, NVEX_URL, NVEX_BOT_KEY: KEY, GUILD_ID, ADMIN_IDS = '' } = process.env;
const admins = ADMIN_IDS.split(',').map(s => s.trim()).filter(Boolean);
const api = async (path, body) => (await fetch(`${NVEX_URL}/api/bot/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botkey: KEY, ...body }) })).json();

const to = c => c.addUserOption(o => o.setName('send_to').setDescription('Send the result by DM to this member'));
const cmds = [
  to(new SlashCommandBuilder().setName('genkey').setDescription('Generate license key(s)')
    .addIntegerOption(o => o.setName('days').setDescription('Duration in days').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('How many (default 1)'))),
  to(new SlashCommandBuilder().setName('createuser').setDescription('Create a user')
    .addStringOption(o => o.setName('username').setDescription('Username').setRequired(true))
    .addStringOption(o => o.setName('password').setDescription('Password (random if empty)'))
    .addIntegerOption(o => o.setName('days').setDescription('Duration in days (default 30)'))),
  new SlashCommandBuilder().setName('addtime').setDescription('Add days to a key or user')
    .addStringOption(o => o.setName('target').setDescription('key or user').setRequired(true).addChoices({ name: 'key', value: 'key' }, { name: 'user', value: 'user' }))
    .addStringOption(o => o.setName('value').setDescription('The key or the username').setRequired(true))
    .addIntegerOption(o => o.setName('days').setDescription('Days to add').setRequired(true)),
].map(c => c.setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(GUILD_ID ? Routes.applicationGuildCommands(APP_ID, GUILD_ID) : Routes.applicationCommands(APP_ID), { body: cmds });
  console.log(`Bot online as ${client.user.tag}`);
});
client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand()) return;
  if (admins.length && !admins.includes(i.user.id)) return i.reply({ content: 'Not allowed.', flags: 64 });
  await i.deferReply({ flags: 64 });
  const g = n => i.options.get(n)?.value;
  let r, msg;
  try {
    if (i.commandName === 'genkey') { r = await api('keys', { days: g('days'), amount: g('amount') || 1 }); msg = r.success ? 'Key(s):\n' + r.keys.map(k => '`' + k + '`').join('\n') : r.message; }
    if (i.commandName === 'createuser') { r = await api('users', { username: g('username'), password: g('password'), days: g('days') || 30 }); msg = r.success ? `User: \`${r.username}\`\nPassword: \`${r.password}\`` : r.message; }
    if (i.commandName === 'addtime') { r = await api('addtime', { target: g('target'), value: g('value'), days: g('days') }); msg = r.success ? 'Time added.' : r.message; }
  } catch { return i.editReply('Could not reach the Nvex Auth server.'); }
  const u = i.options.getUser('send_to');
  if (u && r.success) { try { await u.send('Your Nvex Auth access:\n' + msg); msg += `\nSent to ${u.tag} by DM.`; } catch { msg += '\nCould not DM that member (DMs closed).'; } }
  i.editReply(msg);
});
client.login(TOKEN);
