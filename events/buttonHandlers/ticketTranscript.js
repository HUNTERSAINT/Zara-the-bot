const { PermissionFlagsBits, MessageFlags, AttachmentBuilder } = require('discord.js');
const { getTicket } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

/**
 * Handle "Transcript" button — exports the last 100 messages as a .txt file
 */
module.exports = async function ticketTranscript(interaction, client) {
  const ticket = getTicket(interaction.channel.id);
  if (!ticket) return interaction.reply({ embeds: [embeds.error('Not a Ticket', 'This channel is not a ticket.', interaction.guild)], flags: MessageFlags.Ephemeral });

  const hasPerms = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || interaction.user.id === config.ownerId;
  if (!hasPerms) {
    return interaction.reply({ embeds: [embeds.error('No Permission', 'Only staff can generate transcripts.', interaction.guild)], flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const lines = sorted.map(m =>
      `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '[attachment/embed]'}`
    );
    const content = [
      `=== Ticket Transcript ===`,
      `Channel: ${interaction.channel.name}`,
      `Guild: ${interaction.guild.name}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      ...lines,
    ].join('\n');

    const buffer = Buffer.from(content, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

    await interaction.editReply({ files: [attachment], embeds: [embeds.success('Transcript Ready', 'Transcript generated successfully.', interaction.guild)] });
  } catch (err) {
    await interaction.editReply({ embeds: [embeds.error('Transcript Failed', 'Could not generate transcript.', interaction.guild)] });
  }
};
