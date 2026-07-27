const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const { parseDuration } = require('../../utils/helpers');
const { collectReactionUsers, pickRandom, findChannel } = require('../../utils/helpers');
const { createGiveaway, getGiveaway, endGiveaway, getActiveGiveaways } = require('../../database/database');
const embeds = require('../../utils/embeds');
const { rollGiveaway } = require('../../events/ready');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management')
    .addSubcommand(sub => sub.setName('start')
      .setDescription('Start a giveaway')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 2h, 7d').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to host giveaway')))
    .addSubcommand(sub => sub.setName('end')
      .setDescription('End a giveaway immediately')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)))
    .addSubcommand(sub => sub.setName('reroll')
      .setDescription('Reroll giveaway winners')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID of the ended giveaway').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of new winners').setMinValue(1).setMaxValue(20)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ManageEvents, 'Manage Events'))) return;

    const sub = interaction.options.getSubcommand();
    const { guild } = interaction;

    // ── /giveaway start ───────────────────────────────────────────────────────
    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winners = interaction.options.getInteger('winners') ?? 1;
      const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;

      const ms = parseDuration(durationStr);
      if (!ms) return interaction.reply({ embeds: [embeds.error('Invalid Duration', 'Use format: 10m, 2h, 7d', guild)], flags: MessageFlags.Ephemeral });

      const endTime = Math.floor((Date.now() + ms) / 1000);
      const gwEmbed = embeds.giveaway({ prize, winners, endTime, host: interaction.user, guild });

      const msg = await targetChannel.send({ embeds: [gwEmbed] });
      await msg.react('🎉');

      createGiveaway(guild.id, targetChannel.id, msg.id, interaction.user.id, prize, winners, endTime);

      // Schedule the end
      setTimeout(() => rollGiveaway(interaction.client, { guild_id: guild.id, channel_id: targetChannel.id, message_id: msg.id, prize, winners, end_time: endTime }), ms);

      await interaction.reply({ embeds: [embeds.success('Giveaway Started', `Giveaway for **${prize}** started in ${targetChannel}!`, guild)], flags: MessageFlags.Ephemeral });
    }

    // ── /giveaway end ─────────────────────────────────────────────────────────
    if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      const gw = getGiveaway(messageId);

      if (!gw || gw.guild_id !== guild.id) {
        return interaction.reply({ embeds: [embeds.error('Not Found', 'Giveaway not found.', guild)], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await rollGiveaway(interaction.client, gw);
      await interaction.editReply({ embeds: [embeds.success('Giveaway Ended', 'Giveaway ended and winners selected.', guild)] });
    }

    // ── /giveaway reroll ──────────────────────────────────────────────────────
    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      const winnerCount = interaction.options.getInteger('winners') ?? 1;
      const gw = getGiveaway(messageId);

      if (!gw || gw.guild_id !== guild.id) {
        return interaction.reply({ embeds: [embeds.error('Not Found', 'Giveaway not found.', guild)], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const channel = guild.channels.cache.get(gw.channel_id);
        const message = await channel?.messages.fetch(messageId).catch(() => null);

        if (!message) return interaction.editReply({ embeds: [embeds.error('Message Not Found', 'Could not find the giveaway message.', guild)] });

        const entrants = await collectReactionUsers(message, '🎉');
        const newWinners = pickRandom(entrants, winnerCount);

        if (!newWinners.length) {
          return interaction.editReply({ embeds: [embeds.warning('No Entries', 'No valid entries found to reroll.', guild)] });
        }

        const mentions = newWinners.map(u => `<@${u.id}>`).join(', ');
        await channel.send({
          content: mentions,
          embeds: [embeds.base(guild).setColor('#FF73FA').setTitle('🎉  Reroll Winners!').setDescription(`New winner(s) for **${gw.prize}**: ${mentions}`)],
        });

        await interaction.editReply({ embeds: [embeds.success('Rerolled', `New winner(s): ${mentions}`, guild)] });
      } catch (err) {
        await interaction.editReply({ embeds: [embeds.error('Reroll Failed', err.message, guild)] });
      }
    }
  },
};
