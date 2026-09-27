import { randomUUID } from 'node:crypto';
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
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  type InteractionUpdateOptions,
} from 'discord.js';
import { debugBannerPath } from '../../utils/paths.js';
import {
  correctOption,
  debugDifficulties,
  isDebugDifficultyId,
  optionLetter,
  shufflePickIncidents,
  type DebugDifficultyId,
  type DebugQuestion,
} from './questions.js';
import {
  deleteDebugSession,
  getDebugSession,
  setDebugSession,
  type DebugSession,
} from './store.js';

export const debugIds = {
  start: 'debug:start',
  pickPrefix: 'debug:pick:',
  again: 'debug:again',
  nextPrefix: 'debug:next:',
  answerPrefix: 'debug:ans:',
} as const;

const accentColor = 0x3ba55d;
const bannerName = 'debug.png';
const componentsV2 = MessageFlags.IsComponentsV2;
const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
export const reviewChannelMention = '<#1553823058882601111>';
const reviewHint = `Please drop a review in ${reviewChannelMention}. It helps us improve the bot.`;

function bannerFiles(): AttachmentBuilder[] {
  if (!existsSync(debugBannerPath)) {
    return [];
  }
  return [new AttachmentBuilder(debugBannerPath, { name: bannerName })];
}

function bannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`).setDescription('Debug Simulator'),
  );
}

function startContainer(): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (bannerFiles().length) {
    container.addMediaGalleryComponents(bannerGallery());
  }
  return container;
}

function thinDivider(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

function difficultyButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${debugIds.pickPrefix}easy`)
      .setLabel('Easy')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${debugIds.pickPrefix}medium`)
      .setLabel('Medium')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${debugIds.pickPrefix}hard`)
      .setLabel('Hard')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger),
  );
}

function progressDots(current: number, total: number): string {
  return Array.from({ length: total }, (_, index) => (index < current ? '●' : '○')).join(' ');
}

function formatOptions(question: DebugQuestion): string {
  return question.options
    .map((option) => `**${optionLetter(option.value)}.** ${option.label}`)
    .join('\n');
}

function answerButtons(session: DebugSession, question: DebugQuestion): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...question.options.map((option) => {
      let style = ButtonStyle.Secondary;
      if (session.revealed) {
        if (option.value === question.correctValue) {
          style = ButtonStyle.Success;
        } else if (option.value === session.selected) {
          style = ButtonStyle.Danger;
        }
      }

      return new ButtonBuilder()
        .setCustomId(`${debugIds.answerPrefix}${session.id}:${session.index}:${option.value}`)
        .setLabel(optionLetter(option.value))
        .setStyle(style)
        .setDisabled(session.revealed);
    }),
  );
}

function continueRow(session: DebugSession): ActionRowBuilder<ButtonBuilder> {
  const last = session.index >= session.questions.length - 1;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${debugIds.nextPrefix}${session.id}:${session.index}`)
      .setLabel(last ? 'See score' : 'Next question')
      .setEmoji(last ? '🏁' : '➡️')
      .setStyle(ButtonStyle.Primary),
  );
}

export function buildDebugStartPanel(): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Debug Simulator',
          'Something broke. **What do you check first?**',
          '',
          'Tap through short beginner incidents, pick a first step, and learn why that step helps.',
          'Questions are **reshuffled every week**.',
          '',
          'This board stays public. Hit **Start** to open a **private** drill only you can see.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(thinDivider())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(reviewHint))
    .addSeparatorComponents(thinDivider())
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(debugIds.start)
          .setLabel('Start')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Success),
      ),
    );
}

function buildPrivateLobbyPanel(): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Your private drill',
          'Nobody else can see your answers here.',
          '',
          'Pick a level. Even **Hard** stays beginner-friendly.',
          '',
          '- **Easy:** everyday first checks (console, save, URL, server running)',
          '- **Medium:** APIs, `.env`, deploys, and “it works on my machine”',
          '- **Hard:** a bit trickier, still simple (502s, duplicates, slow pages)',
          '',
          'Questions are **reshuffled every week**.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(thinDivider())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(reviewHint))
    .addSeparatorComponents(thinDivider())
    .addActionRowComponents(difficultyButtons());
}

function questionHeader(session: DebugSession): string {
  const difficulty = debugDifficulties[session.difficulty].label;
  const current = session.index + 1;
  const total = session.questions.length;
  return [
    '# Debug Simulator',
    `**${difficulty}**  ·  ${progressDots(current, total)}  ·  **${current} / ${total}**`,
  ].join('\n');
}

function questionCard(question: DebugQuestion): string {
  return [
    '## Question',
    `> **${question.incident}**`,
    '',
    `### ${question.prompt}`,
  ].join('\n');
}

function optionsCard(question: DebugQuestion): string {
  return ['## Choices', formatOptions(question), '', '*Tap A, B, C, or D below.*'].join('\n');
}

function correctLine(question: DebugQuestion): string {
  const option = correctOption(question);
  if (!option) {
    return 'the better first check';
  }
  return `**${optionLetter(option.value)}.** ${option.label}`;
}

function goodFeedback(question: DebugQuestion): string {
  return [
    '## Nice. That is a solid first step.',
    question.good,
    '',
    `**Why first?** ${question.why}`,
  ].join('\n');
}

function missFeedback(question: DebugQuestion): string {
  return [
    '## Not quite. Here is the better first check.',
    `**Answer:** ${correctLine(question)}`,
    '',
    question.miss,
    '',
    `**Why that one?** ${question.why}`,
  ].join('\n');
}

function resultsHeadline(score: number, total: number): string {
  const ratio = score / total;
  if (ratio === 1) {
    return 'Perfect run. Your first-check instincts are sharp.';
  }
  if (ratio >= 0.6) {
    return 'Solid. You are thinking like someone who debugs for real.';
  }
  return 'Good practice. Come back after the weekly reshuffle and try again.';
}

function buildQuestionPanel(session: DebugSession): ContainerBuilder {
  const question = session.questions[session.index];
  if (!question) {
    throw new Error('Missing debug incident.');
  }

  const container = startContainer()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(questionHeader(session)))
    .addSeparatorComponents(thinDivider())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(questionCard(question)))
    .addSeparatorComponents(thinDivider())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(optionsCard(question)));

  if (session.feedback) {
    container
      .addSeparatorComponents(thinDivider())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(session.feedback));
  }

  container.addSeparatorComponents(thinDivider()).addActionRowComponents(answerButtons(session, question));

  if (session.revealed) {
    container.addActionRowComponents(continueRow(session));
  }

  return container;
}

function buildResultsPanel(session: DebugSession): ContainerBuilder {
  const difficulty = debugDifficulties[session.difficulty].label;
  const total = session.questions.length;
  const body = [
    '# Debug Simulator',
    `**${difficulty}**  ·  Drill complete`,
    '',
    `## Score  **${session.score} / ${total}**`,
    resultsHeadline(session.score, total),
    '',
    'Run this again anytime. Questions are **reshuffled every week**.',
    '',
    reviewHint,
  ].join('\n');

  return startContainer()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
    .addSeparatorComponents(thinDivider())
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(debugIds.again)
          .setLabel('Run again')
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Primary),
      ),
    );
}

function panelPayload(
  container: ContainerBuilder,
  ephemeral: boolean,
): InteractionReplyOptions & InteractionEditReplyOptions & InteractionUpdateOptions {
  return {
    flags: ephemeral ? ephemeralV2 : componentsV2,
    files: bannerFiles(),
    components: [container],
  };
}

export async function postDebugPanel(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply(panelPayload(buildDebugStartPanel(), false));
}

function startRound(interaction: ButtonInteraction, difficulty: DebugDifficultyId): DebugSession {
  const session: DebugSession = {
    id: randomUUID(),
    userId: interaction.user.id,
    difficulty,
    questions: shufflePickIncidents(difficulty),
    index: 0,
    score: 0,
    selected: undefined,
    revealed: false,
    feedback: undefined,
    message: interaction.message,
  };
  setDebugSession(session);
  return session;
}

function messageIsEphemeral(interaction: ButtonInteraction): boolean {
  return interaction.message.flags.has(MessageFlags.Ephemeral);
}

async function startDifficulty(interaction: ButtonInteraction, difficulty: DebugDifficultyId): Promise<void> {
  const session = startRound(interaction, difficulty);
  const questionPanel = buildQuestionPanel(session);

  if (messageIsEphemeral(interaction)) {
    await interaction.update(panelPayload(questionPanel, false));
    session.message = interaction.message;
    return;
  }

  await interaction.reply(panelPayload(questionPanel, true));
  session.message = await interaction.fetchReply();
}

function parseSessionPayload(
  payload: string,
): { sessionId: string; questionIndex: number; selected?: string } | undefined {
  const parts = payload.split(':');
  const sessionId = parts[0];
  const questionIndex = Number(parts[1]);
  const selected = parts[2];
  if (!sessionId || Number.isNaN(questionIndex)) {
    return undefined;
  }
  if (selected === undefined) {
    return { sessionId, questionIndex };
  }
  return { sessionId, questionIndex, selected };
}

function sessionError(session: DebugSession | undefined, sessionId: string, userId: string): string | undefined {
  if (!session || session.id !== sessionId) {
    return 'This debug round is no longer active. Start a new one from **Start** or `/debug`.';
  }
  if (userId !== session.userId) {
    return 'This debug round belongs to someone else.';
  }
  return undefined;
}

export async function handleDebugButton(interaction: ButtonInteraction): Promise<boolean> {
  if (interaction.customId === debugIds.start) {
    deleteDebugSession(interaction.user.id);
    await interaction.reply(panelPayload(buildPrivateLobbyPanel(), true));
    return true;
  }

  if (interaction.customId === debugIds.again) {
    deleteDebugSession(interaction.user.id);
    await interaction.update(panelPayload(buildPrivateLobbyPanel(), false));
    return true;
  }

  if (interaction.customId.startsWith(debugIds.pickPrefix)) {
    const difficulty = interaction.customId.slice(debugIds.pickPrefix.length);
    if (!isDebugDifficultyId(difficulty)) {
      await interaction.reply({ content: 'That difficulty is not available.', ephemeral: true });
      return true;
    }
    await startDifficulty(interaction, difficulty);
    return true;
  }

  if (interaction.customId.startsWith(debugIds.nextPrefix)) {
    const parsed = parseSessionPayload(interaction.customId.slice(debugIds.nextPrefix.length));
    if (!parsed) {
      await interaction.reply({ content: 'That button is invalid.', ephemeral: true });
      return true;
    }

    const session = getDebugSession(interaction.user.id);
    const error = sessionError(session, parsed.sessionId, interaction.user.id);
    if (error || !session) {
      await interaction.reply({ content: error ?? 'This debug round is no longer active.', ephemeral: true });
      return true;
    }

    if (!session.revealed || parsed.questionIndex !== session.index) {
      await interaction.reply({ content: 'Answer this question first.', ephemeral: true });
      return true;
    }

    session.index += 1;
    session.selected = undefined;
    session.revealed = false;
    session.feedback = undefined;
    session.message = interaction.message;

    if (session.index >= session.questions.length) {
      deleteDebugSession(session.userId);
      await interaction.update(panelPayload(buildResultsPanel(session), false));
      return true;
    }

    await interaction.update(panelPayload(buildQuestionPanel(session), false));
    return true;
  }

  if (!interaction.customId.startsWith(debugIds.answerPrefix)) {
    return false;
  }

  const parsed = parseSessionPayload(interaction.customId.slice(debugIds.answerPrefix.length));
  if (!parsed || parsed.selected === undefined) {
    await interaction.reply({ content: 'That answer is invalid.', ephemeral: true });
    return true;
  }

  const session = getDebugSession(interaction.user.id);
  const error = sessionError(session, parsed.sessionId, interaction.user.id);
  if (error || !session) {
    await interaction.reply({ content: error ?? 'This debug round is no longer active.', ephemeral: true });
    return true;
  }

  if (parsed.questionIndex !== session.index) {
    await interaction.reply({ content: 'That question is already over.', ephemeral: true });
    return true;
  }

  if (session.revealed) {
    await interaction.reply({ content: 'You already answered this one. Hit **Next question**.', ephemeral: true });
    return true;
  }

  const question = session.questions[session.index];
  if (!question) {
    await interaction.reply({ content: 'That question is missing.', ephemeral: true });
    return true;
  }

  const correct = parsed.selected === question.correctValue;
  session.selected = parsed.selected;
  session.revealed = true;
  session.message = interaction.message;
  if (correct) {
    session.score += 1;
    session.feedback = goodFeedback(question);
  } else {
    session.feedback = missFeedback(question);
  }

  await interaction.update(panelPayload(buildQuestionPanel(session), false));
  return true;
}
