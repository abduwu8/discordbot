import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { postAnnouncement } from '../../features/announcement/handler.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Post a public announcement as the bot.')
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Body text. Use **bold** and *italic*.')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(4000),
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('Optional heading at the top of the panel')
        .setRequired(false)
        .setMaxLength(200),
    )
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setDescription('Optional image shown on top, like other panels')
        .setRequired(false),
    ),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await postAnnouncement(interaction);
  },
};
