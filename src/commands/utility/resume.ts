import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { postResumePanel } from '../../features/resume/handler.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Post the public resume optimizer panel.')
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await postResumePanel(interaction);
  },
};
