import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { postInterviewPanel } from '../../features/interview/handler.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  public: true,
  data: new SlashCommandBuilder()
    .setName('interview')
    .setDescription('Prepare for an interview with timed MCQs.')
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await postInterviewPanel(interaction);
  },
};
