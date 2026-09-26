import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/command.js';
import { resourcesPanelReplyOptions } from '../../ui/resourcesPanel.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('resources')
    .setDescription('Show Semicolony study resources.')
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    await interaction.editReply(resourcesPanelReplyOptions());
  },
};
