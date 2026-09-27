import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { postDebugPanel } from '../../features/debug/handler.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  public: true,
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Practice production debugging with incident scenarios.')
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await postDebugPanel(interaction);
  },
};
