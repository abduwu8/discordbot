import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('battle')
    .setDescription('How to start a 1v1 battle.'),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: 'Use the two **Join** buttons in the Competitive section on the BCA panel. First two people to join get matched.',
      ephemeral: true,
    });
  },
};
