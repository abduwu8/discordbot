import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/command.js';
import { testPanelReplyOptions } from '../../ui/testPanel.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Show a preview of the BCA panel.'),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    await interaction.editReply(testPanelReplyOptions());
  },
};
