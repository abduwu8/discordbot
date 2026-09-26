import { existsSync } from 'node:fs';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
  type InteractionUpdateOptions,
  type MessageCreateOptions,
  type MessageEditOptions,
  type ModalSubmitInteraction,
  type TextBasedChannel,
} from 'discord.js';
import { introductionBannerPath } from '../../utils/paths.js';
import {
  deleteIntroduction,
  getBoard,
  getIntroduction,
  listIntroductions,
  saveBoard,
  upsertIntroduction,
  type IntroductionEntry,
} from './store.js';

export const introductionModalId = 'intro:modal';
export const introductionIds = {
  add: 'intro:add',
  edit: 'intro:edit',
  delete: 'intro:delete',
} as const;

const accentColor = 0x4aa3d9;
const bannerName = 'introduction.png';
const textChunkSize = 3600;

type BoardInteraction = ButtonInteraction | ModalSubmitInteraction | ChatInputCommandInteraction;

function bannerFiles(): AttachmentBuilder[] {
  if (!existsSync(introductionBannerPath)) {
    return [];
  }
  return [new AttachmentBuilder(introductionBannerPath, { name: bannerName })];
}

function sanitize(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function fieldInput(
  customId: string,
  label: string,
  style: TextInputStyle,
  maxLength: number,
  value?: string,
  placeholder?: string,
): ActionRowBuilder<TextInputBuilder> {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(true)
    .setMaxLength(maxLength);

  if (placeholder) {
    input.setPlaceholder(placeholder);
  }
  if (value) {
    input.setValue(value.slice(0, maxLength));
  }

  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

async function showIntroductionModal(interaction: ButtonInteraction): Promise<void> {
  const existing = interaction.guildId
    ? getIntroduction(interaction.guildId, interaction.user.id)
    : undefined;

  const modal = new ModalBuilder()
    .setCustomId(introductionModalId)
    .setTitle(existing ? 'Edit your introduction' : 'Introduce yourself')
    .addComponents(
      fieldInput('name', 'Name', TextInputStyle.Short, 80, existing?.name, 'Your name'),
      fieldInput(
        'university',
        'University',
        TextInputStyle.Short,
        100,
        existing?.university,
        'Your college or university',
      ),
      fieldInput('course', 'Course', TextInputStyle.Short, 80, existing?.course, 'BCA, MCA, …'),
      fieldInput('hobbies', 'Hobbies', TextInputStyle.Paragraph, 200, existing?.hobbies, 'A few things you enjoy'),
    );

  await interaction.showModal(modal);
}

function formatEntry(userId: string, entry: IntroductionEntry): string {
  return [
    `<@${userId}>`,
    `**Name:** ${entry.name}`,
    `**University:** ${entry.university}`,
    `**Course:** ${entry.course}`,
    `**Hobbies:** ${entry.hobbies}`,
  ].join('\n');
}

function chunkText(text: string, size = textChunkSize): string[] {
  const chunks: string[] = [];
  const parts = text.split('\n\n');
  let current = '';

  for (const part of parts) {
    const next = current ? `${current}\n\n${part}` : part;
    if (next.length > size && current) {
      chunks.push(current);
      current = part;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function actionRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(introductionIds.add)
      .setLabel('Introduce yourself')
      .setEmoji('👋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(introductionIds.edit)
      .setLabel('Edit')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(introductionIds.delete)
      .setLabel('Delete')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
  );
}

export function buildIntroductionPanel(guildId: string): ContainerBuilder {
  const files = bannerFiles();
  const people = listIntroductions(guildId);
  const container = new ContainerBuilder().setAccentColor(accentColor);

  if (files.length) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`).setDescription('Introduction'),
      ),
    );
  }

  container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Introductions',
          people.length
            ? `${people.length} member${people.length === 1 ? '' : 's'} on the list. Use the buttons to add, edit, or delete **yours**.`
            : 'No introductions yet. Click **Introduce yourself** to add yours — you can edit or delete it later.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  if (people.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Waiting for the first introduction.*'),
    );
  } else {
    const body = people.map(({ userId, entry }) => formatEntry(userId, entry)).join('\n\n');
    for (const chunk of chunkText(body)) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
    }
  }

  return container.addActionRowComponents(actionRow());
}

function introductionPanelPayload(guildId: string): MessageCreateOptions & MessageEditOptions & InteractionUpdateOptions & InteractionEditReplyOptions {
  return {
    flags: MessageFlags.IsComponentsV2,
    files: bannerFiles(),
    components: [buildIntroductionPanel(guildId)],
    allowedMentions: { parse: [] },
  };
}

async function channelFromId(interaction: BoardInteraction, channelId: string): Promise<TextBasedChannel | null> {
  const cached = interaction.client.channels.cache.get(channelId);
  if (cached?.isTextBased()) {
    return cached;
  }
  const fetched = await interaction.client.channels.fetch(channelId).catch(() => null);
  return fetched?.isTextBased() ? fetched : null;
}

async function refreshBoard(interaction: BoardInteraction, guildId: string, preferUpdate = false): Promise<void> {
  const payload = introductionPanelPayload(guildId);

  if (preferUpdate && interaction.isButton() && !interaction.replied && !interaction.deferred) {
    await interaction.update(payload);
    return;
  }

  const existing = getBoard(guildId);
  if (existing) {
    const channel = await channelFromId(interaction, existing.channelId);
    const message = await channel?.messages.fetch(existing.messageId).catch(() => null);
    if (message) {
      await message.edit(payload);
      return;
    }
  }

  const channel = interaction.channel;
  if (!channel || !channel.isSendable()) {
    return;
  }

  const posted = await channel.send(payload);
  saveBoard(guildId, { channelId: posted.channelId, messageId: posted.id });
}

export async function postIntroductionPanel(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: 'Use this command in a server so introductions can go on the shared list.',
      ephemeral: true,
    });
    return;
  }

  const previous = getBoard(interaction.guildId);
  if (previous) {
    const channel = await channelFromId(interaction, previous.channelId);
    const message = await channel?.messages.fetch(previous.messageId).catch(() => null);
    await message?.delete().catch(() => undefined);
  }

  await interaction.deferReply();
  await interaction.editReply(introductionPanelPayload(interaction.guildId));
  const posted = await interaction.fetchReply();
  saveBoard(interaction.guildId, { channelId: posted.channelId, messageId: posted.id });
}

export async function handleIntroductionButton(interaction: ButtonInteraction): Promise<boolean> {
  if (
    interaction.customId !== introductionIds.add &&
    interaction.customId !== introductionIds.edit &&
    interaction.customId !== introductionIds.delete
  ) {
    return false;
  }

  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: 'Use these buttons in a server.',
      ephemeral: true,
    });
    return true;
  }

  const existing = getIntroduction(interaction.guildId, interaction.user.id);

  if (interaction.customId === introductionIds.add) {
    if (existing) {
      await interaction.reply({
        content: 'You already have an introduction. Use **Edit** to change it or **Delete** to remove it.',
        ephemeral: true,
      });
      return true;
    }
    await showIntroductionModal(interaction);
    return true;
  }

  if (interaction.customId === introductionIds.edit) {
    if (!existing) {
      await interaction.reply({
        content: 'You do not have an introduction yet. Click **Introduce yourself** first.',
        ephemeral: true,
      });
      return true;
    }
    await showIntroductionModal(interaction);
    return true;
  }

  if (!existing) {
    await interaction.reply({
      content: 'You do not have an introduction to delete.',
      ephemeral: true,
    });
    return true;
  }

  deleteIntroduction(interaction.guildId, interaction.user.id);
  await refreshBoard(interaction, interaction.guildId, true);
  await interaction.followUp({
    content: 'Your introduction was removed from the list.',
    ephemeral: true,
  });
  return true;
}

export async function handleIntroductionModal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== introductionModalId) {
    return false;
  }

  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: 'Use this in a server so your introduction can go on the shared list.',
      ephemeral: true,
    });
    return true;
  }

  const name = sanitize(interaction.fields.getTextInputValue('name'), 80);
  const university = sanitize(interaction.fields.getTextInputValue('university'), 100);
  const course = sanitize(interaction.fields.getTextInputValue('course'), 80);
  const hobbies = sanitize(interaction.fields.getTextInputValue('hobbies'), 200);

  if (!name || !university || !course || !hobbies) {
    await interaction.reply({
      content: 'Every field needs a value. Open the form again from the panel.',
      ephemeral: true,
    });
    return true;
  }

  const { created } = upsertIntroduction(interaction.guildId, interaction.user.id, {
    name,
    university,
    course,
    hobbies,
  });

  let boardError = false;
  try {
    await refreshBoard(interaction, interaction.guildId);
  } catch {
    boardError = true;
  }

  const saved = created ? 'Your introduction is on the list.' : 'Your introduction was updated.';
  const boardNote = boardError
    ? ' I could not refresh the public panel — check that Bella can send messages here.'
    : '';

  await interaction.reply({
    content: `${saved}${boardNote}`,
    ephemeral: true,
  });

  return true;
}
