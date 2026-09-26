import { DiscordAPIError, Events } from 'discord.js';
import { isBotOwner } from '../config/owner.js';
import { handleBattleAnswer } from '../features/battle/handler.js';
import { handleIntroductionButton, handleIntroductionModal } from '../features/introduction/handler.js';
import { handleResumeButton, handleResumeModal } from '../features/resume/handler.js';
import { BellaClient } from '../types/client.js';
import type { Event } from '../types/event.js';
import { handleTestComponent } from '../ui/testPanel.js';
import { logger } from '../utils/logger.js';

export const event: Event<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isModalSubmit()) {
      try {
        if (await handleIntroductionModal(interaction)) {
          return;
        }
        await handleResumeModal(interaction);
      } catch (error: unknown) {
        logger.error('Failed to handle modal interaction:', error);
      }
      return;
    }

    if (interaction.isButton()) {
      try {
        if (await handleIntroductionButton(interaction)) {
          return;
        }
        if (await handleResumeButton(interaction)) {
          return;
        }
        await handleTestComponent(interaction);
      } catch (error: unknown) {
        logger.error('Failed to handle component interaction:', error);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      try {
        await handleBattleAnswer(interaction);
      } catch (error: unknown) {
        logger.error('Failed to handle battle answer:', error);
      }
      return;
    }

    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
      return;
    }

    const client = interaction.client;
    if (!(client instanceof BellaClient)) {
      logger.error('Interaction received on an unexpected client instance.');
      return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`No command registered for /${interaction.commandName}`);
      return;
    }

    if (!command.public && !isBotOwner(interaction.user.id)) {
      if (interaction.isAutocomplete()) {
        await interaction.respond([]);
        return;
      }

      await interaction.reply({
        content: 'Only the bot owner can run slash commands. Use the buttons on the panels instead.',
        ephemeral: true,
      });
      return;
    }

    try {
      if (interaction.isAutocomplete()) {
        await command.autocomplete?.(interaction, client);
        return;
      }

      await command.execute(interaction, client);
    } catch (error: unknown) {
      logger.error(`Failed to run /${interaction.commandName}:`, error);

      if (interaction.isAutocomplete()) {
        return;
      }

      if (error instanceof DiscordAPIError && error.code === 10062) {
        return;
      }

      const payload = {
        content: 'Something went wrong while running that command.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
        return;
      }

      await interaction.reply(payload);
    }
  },
};
