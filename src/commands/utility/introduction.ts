import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { postIntroductionPanel } from '../../features/introduction/handler.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('introduction')
    .setDescription('Post the introductions panel.')
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await postIntroductionPanel(interaction);
  },
};
