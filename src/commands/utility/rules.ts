import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/command.js';
import { rulesPanelReplyOptions } from '../../ui/rulesPanel.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Show the general rules for this server.'),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    await interaction.editReply(rulesPanelReplyOptions());
  },
};
