const { ApplicationCommandOptionType } = require('discord.js');
const getLocalCommands = require('../../utils/getLocalCommands');

const PREFIX = 'w';

const parseIdList = (value) =>
  value
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean) || [];

const getTestGuildIds = () => {
  const guildIds = parseIdList(process.env.GUILD_IDS);
  if (guildIds.length) return guildIds;
  return parseIdList(process.env.GUILD_ID);
};

function tokenize(input) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|`([^`]*)`|(\S+)/g;
  let match;

  while ((match = pattern.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
  }

  return tokens;
}

function parseUserId(value) {
  if (!value) return null;
  const match = String(value).match(/^<@!?(\d+)>$/) || String(value).match(/^(\d{15,25})$/);
  return match?.[1] || null;
}

function parseChannelId(value) {
  if (!value) return null;
  const match = String(value).match(/^<#(\d+)>$/) || String(value).match(/^(\d{15,25})$/);
  return match?.[1] || null;
}

async function resolveOptionValue(message, option, rawValue) {
  if (rawValue == null) return null;

  if (
    option.type === ApplicationCommandOptionType.User
    || option.type === ApplicationCommandOptionType.Mentionable
  ) {
    const userId = parseUserId(rawValue);
    if (!userId) return null;

    const member = await message.guild.members.fetch(userId).catch(() => null);
    return option.type === ApplicationCommandOptionType.Mentionable
      ? member || userId
      : member?.user || await message.client.users.fetch(userId).catch(() => null);
  }

  if (option.type === ApplicationCommandOptionType.Channel) {
    const channelId = parseChannelId(rawValue);
    if (!channelId) return null;
    return message.guild.channels.cache.get(channelId)
      || await message.guild.channels.fetch(channelId).catch(() => null);
  }

  if (option.type === ApplicationCommandOptionType.Integer) {
    const value = Number.parseInt(rawValue, 10);
    return Number.isNaN(value) ? null : value;
  }

  if (option.type === ApplicationCommandOptionType.Number) {
    const value = Number(rawValue);
    return Number.isNaN(value) ? null : value;
  }

  if (option.type === ApplicationCommandOptionType.Boolean) {
    const normalized = String(rawValue).toLowerCase();
    return ['true', '1', 'yes', 'y', 'bat', 'on'].includes(normalized);
  }

  if (option.type === ApplicationCommandOptionType.Attachment) {
    return message.attachments.first() || null;
  }

  return String(rawValue);
}

async function buildOptions(message, command, args) {
  const values = new Map();
  const options = command.options || [];
  let argIndex = 0;

  for (const [optionIndex, option] of options.entries()) {
    const isLastStringOption =
      option.type === ApplicationCommandOptionType.String
      && optionIndex === options.length - 1
      && args.length > argIndex;
    const rawValue = option.type === ApplicationCommandOptionType.Attachment
      ? null
      : isLastStringOption
        ? args.slice(argIndex).join(' ')
        : args[argIndex];

    if (rawValue == null && option.required) {
      throw new Error(`Thieu tham so: ${option.name}`);
    }

    const value = option.type === ApplicationCommandOptionType.Attachment
      ? message.attachments.first() || null
      : await resolveOptionValue(message, option, rawValue);

    if (value == null && option.required) {
      throw new Error(`Tham so khong hop le: ${option.name}`);
    }

    if (value != null) {
      values.set(option.name, {
        name: option.name,
        type: option.type,
        value: option.type === ApplicationCommandOptionType.User
          ? value.id
          : option.type === ApplicationCommandOptionType.Channel
            ? value.id
            : option.type === ApplicationCommandOptionType.Mentionable && typeof value !== 'string'
              ? value.id
              : value,
        user: option.type === ApplicationCommandOptionType.User ? value : null,
        member: option.type === ApplicationCommandOptionType.Mentionable && typeof value !== 'string' ? value : null,
        channel: option.type === ApplicationCommandOptionType.Channel ? value : null,
        attachment: option.type === ApplicationCommandOptionType.Attachment ? value : null,
      });
    }

    if (rawValue != null) argIndex = isLastStringOption ? args.length : argIndex + 1;
  }

  return {
    get: (name) => values.get(name) || null,
    getUser: (name) => values.get(name)?.user || null,
    getInteger: (name) => values.get(name)?.value ?? null,
    getNumber: (name) => values.get(name)?.value ?? null,
    getString: (name) => values.get(name)?.value ?? null,
    getBoolean: (name) => values.get(name)?.value ?? null,
    getChannel: (name) => values.get(name)?.channel || null,
    getAttachment: (name) => values.get(name)?.attachment || null,
  };
}

function normalizePayload(payload) {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return payload;

  const { ephemeral, flags, fetchReply, ...rest } = payload;
  return rest;
}

async function buildPrefixInteraction(message, command, args) {
  let replyMessage = null;

  const sendOrEdit = async (payload) => {
    const cleanPayload = normalizePayload(payload);
    if (replyMessage) {
      replyMessage = await replyMessage.edit(cleanPayload);
      return replyMessage;
    }

    replyMessage = await message.reply(cleanPayload);
    return replyMessage;
  };

  return {
    commandName: command.name,
    user: message.author,
    member: message.member,
    guild: message.guild,
    channel: message.channel,
    client: message.client,
    createdTimestamp: message.createdTimestamp,
    options: await buildOptions(message, command, args),
    inGuild: () => message.inGuild(),
    deferReply: async () => null,
    reply: sendOrEdit,
    editReply: sendOrEdit,
    followUp: async (payload) => message.reply(normalizePayload(payload)),
  };
}

function parsePrefixCommand(content) {
  const trimmed = content.trim();
  if (!trimmed || trimmed[0]?.toLowerCase() !== PREFIX) return null;

  const afterPrefix = trimmed.slice(1).trimStart();
  if (!afterPrefix) return null;

  const tokens = tokenize(afterPrefix);
  if (!tokens.length) return null;

  return {
    name: tokens[0].toLowerCase(),
    args: tokens.slice(1),
  };
}

async function canRunCommand(command, message) {
  if (command.devOnly) {
    const devIds = parseIdList(process.env.DEVS);
    if (!devIds.includes(message.author.id)) {
      await message.reply('Only developers are allowed to run this command.');
      return false;
    }
  }

  if (command.testOnly) {
    const testGuildIds = getTestGuildIds();
    if (!testGuildIds.includes(message.guild.id)) {
      await message.reply('This command cannot be ran here.');
      return false;
    }
  }

  if (command.permissionsRequired?.length) {
    for (const permission of command.permissionsRequired) {
      if (!message.member.permissions.has(permission)) {
        await message.reply('Not enough permissions.');
        return false;
      }
    }
  }

  if (command.botPermissions?.length) {
    for (const permission of command.botPermissions) {
      if (!message.guild.members.me.permissions.has(permission)) {
        await message.reply("I don't have enough permissions.");
        return false;
      }
    }
  }

  return true;
}

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) return;

  const parsed = parsePrefixCommand(message.content);
  if (!parsed) return;

  const command = getLocalCommands().find((cmd) => cmd.name.toLowerCase() === parsed.name);
  if (!command || command.deleted || typeof command.callback !== 'function') return;

  try {
    if (!(await canRunCommand(command, message))) return;

    const interaction = await buildPrefixInteraction(message, command, parsed.args);
    await command.callback(client, interaction);
  } catch (error) {
    const messageText = error?.message?.startsWith('Thieu tham so') || error?.message?.startsWith('Tham so khong hop le')
      ? `${error.message}. Vi du: w ${command.name}`
      : 'Co loi xay ra khi chay lenh prefix.';

    await message.reply(messageText).catch(() => null);
    if (messageText === 'Co loi xay ra khi chay lenh prefix.') {
      console.log('[prefixCommands]', error);
    }
  }
};
