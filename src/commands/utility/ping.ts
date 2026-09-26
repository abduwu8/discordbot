import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription("Check Bella's latency."),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({
      content: 'Pinging…',
      fetchReply: true,
    });

    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const websocket = interaction.client.ws.ping;

    await interaction.editReply(
      `Pong! Round-trip: **${roundTrip}ms** · WebSocket: **${websocket}ms**`,
    );
  },
};
