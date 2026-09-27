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
import { interviewBannerPath } from '../../utils/paths.js';
import { logger } from '../../utils/logger.js';
import {
  correctOption,
  interviewRoles,
  isInterviewRoleId,
  optionLetter,
  secondsPerQuestion,
  shufflePickQuestions,
  type InterviewQuestion,
  type InterviewRoleId,
} from './questions.js';
import {
  deleteInterviewSession,
  getInterviewSession,
  setInterviewSession,
  type InterviewSession,
} from './store.js';

export const interviewIds = {
  start: 'interview:start',
  pickPrefix: 'interview:pick:',
  again: 'interview:again',
  answerPrefix: 'interview:ans:',
} as const;

const accentColor = 0x3b9eff;
const bannerName = 'interview.png';
const componentsV2 = MessageFlags.IsComponentsV2;
const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

function bannerFiles(): AttachmentBuilder[] {
  if (!existsSync(interviewBannerPath)) {
    return [];
  }
  return [new AttachmentBuilder(interviewBannerPath, { name: bannerName })];
}

function bannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`).setDescription('Prepare for Interview'),
  );
}

function startContainer(): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (bannerFiles().length) {
    container.addMediaGalleryComponents(bannerGallery());
  }
  return container;
}

function roleButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${interviewIds.pickPrefix}software`)
      .setLabel('Software Developer')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${interviewIds.pickPrefix}frontend`)
      .setLabel('Frontend Engineer')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${interviewIds.pickPrefix}backend`)
      .setLabel('Backend Engineer')
      .setStyle(ButtonStyle.Secondary),
  );
}

function answerButtons(session: InterviewSession, question: InterviewQuestion): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...question.options.map((option) =>
      new ButtonBuilder()
        .setCustomId(`${interviewIds.answerPrefix}${session.id}:${session.index}:${option.value}`)
        .setLabel(optionLetter(option.value))
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

export function buildInterviewStartPanel(): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Prepare for Interview',
          'Pick a role. You get **5 MCQs**, **30 seconds** each, drawn from a **10-question** bank (shuffled every run).',
          '',
          'Use this as many times as you want. The question bank is **updated weekly** so you can keep practicing.',
          '',
          '- **Software Developer** — data structures, Git, debugging, how the web works',
          '- **Frontend Engineer** — HTML/CSS/JS and React',
          '- **Backend Engineer** — APIs, auth, databases, and production basics',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(roleButtons());
}

function formatOptions(question: InterviewQuestion): string {
  return question.options
    .map((option) => `**${optionLetter(option.value)}.** ${option.label}`)
    .join('\n');
}

function questionBody(session: InterviewSession, question: InterviewQuestion): string {
  const role = interviewRoles[session.role].label;
  const lines = [
    '# Prepare for Interview',
    `**${role}** · Question **${session.index + 1}/${session.questions.length}** · **${secondsPerQuestion}s**`,
  ];

  if (session.feedback) {
    lines.push('', session.feedback);
  }

  lines.push('', `**${question.prompt}**`, '', formatOptions(question));
  return lines.join('\n');
}

function resultsBody(session: InterviewSession): string {
  const role = interviewRoles[session.role].label;
  const total = session.questions.length;
  const lines = [
    '# Prepare for Interview',
    `**${role}** · Round complete`,
    '',
    `Score: **${session.score}/${total}**`,
  ];

  if (session.feedback) {
    lines.push('', session.feedback);
  }

  lines.push(
    '',
    'Run this again anytime — a new shuffled set of 5 comes from the 10-question bank.',
    'Questions are **updated weekly**, so come back and keep drilling.',
  );
  return lines.join('\n');
}

function buildQuestionPanel(session: InterviewSession): ContainerBuilder {
  const question = session.questions[session.index];
  if (!question) {
    throw new Error('Missing interview question.');
  }

  return startContainer()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(questionBody(session, question)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(answerButtons(session, question));
}

function buildResultsPanel(session: InterviewSession): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(resultsBody(session)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(interviewIds.again)
          .setLabel('Practice again')
          .setStyle(ButtonStyle.Primary),
      ),
    );
}

function panelPayload(container: ContainerBuilder, ephemeral: boolean): InteractionReplyOptions &
  InteractionEditReplyOptions &
  InteractionUpdateOptions {
  return {
    flags: ephemeral ? ephemeralV2 : componentsV2,
    files: bannerFiles(),
    components: [container],
  };
}

export async function postInterviewPanel(interaction: ChatInputCommandInteraction): Promise<void> {
  deleteInterviewSession(interaction.user.id);
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply(panelPayload(buildInterviewStartPanel(), false));
}

function correctLine(question: InterviewQuestion): string {
  const option = correctOption(question);
  if (!option) {
    return 'Correct answer is unavailable.';
  }
  return `Correct answer: **${optionLetter(option.value)}.** ${option.label}`;
}

async function renderSession(session: InterviewSession): Promise<void> {
  const message = session.message;
  if (!message) {
    return;
  }

  const finished = session.index >= session.questions.length;
  const container = finished ? buildResultsPanel(session) : buildQuestionPanel(session);

  try {
    await message.edit({
      flags: componentsV2,
      files: bannerFiles(),
      components: [container],
    });
  } catch (error: unknown) {
    logger.error('Failed to update interview panel:', error);
  }
}

function armTimer(session: InterviewSession): void {
  if (session.timer) {
    clearTimeout(session.timer);
  }

  const round = session.round;
  session.timer = setTimeout(() => {
    void handleTimeout(session, round);
  }, secondsPerQuestion * 1000);
}

async function handleTimeout(session: InterviewSession, round: number): Promise<void> {
  const current = getInterviewSession(session.userId);
  if (!current || current.id !== session.id || current.round !== round) {
    return;
  }

  const question = current.questions[current.index];
  if (!question) {
    return;
  }

  current.feedback = `Time's up (${secondsPerQuestion}s). ${correctLine(question)}`;
  current.index += 1;
  current.round += 1;
  current.timer = undefined;

  if (current.index >= current.questions.length) {
    deleteInterviewSession(current.userId);
    await renderSession(current);
    return;
  }

  await renderSession(current);
  armTimer(current);
}

function startRound(interaction: ButtonInteraction, role: InterviewRoleId): InterviewSession {
  const session: InterviewSession = {
    id: randomUUID(),
    userId: interaction.user.id,
    role,
    questions: shufflePickQuestions(role),
    index: 0,
    score: 0,
    round: 1,
    feedback: undefined,
    timer: undefined,
    message: interaction.message,
  };
  setInterviewSession(session);
  return session;
}

function messageIsEphemeral(interaction: ButtonInteraction): boolean {
  return interaction.message.flags.has(MessageFlags.Ephemeral);
}

async function startRole(interaction: ButtonInteraction, role: InterviewRoleId): Promise<void> {
  const session = startRound(interaction, role);
  const questionPanel = buildQuestionPanel(session);

  if (messageIsEphemeral(interaction)) {
    await interaction.update(panelPayload(questionPanel, false));
    session.message = interaction.message;
  } else {
    await interaction.reply(panelPayload(questionPanel, true));
    session.message = await interaction.fetchReply();
  }

  armTimer(session);
}

export async function handleInterviewButton(interaction: ButtonInteraction): Promise<boolean> {
  if (interaction.customId === interviewIds.start) {
    deleteInterviewSession(interaction.user.id);
    await interaction.reply(panelPayload(buildInterviewStartPanel(), true));
    return true;
  }

  if (interaction.customId === interviewIds.again) {
    deleteInterviewSession(interaction.user.id);
    await interaction.update(panelPayload(buildInterviewStartPanel(), false));
    return true;
  }

  if (interaction.customId.startsWith(interviewIds.pickPrefix)) {
    const role = interaction.customId.slice(interviewIds.pickPrefix.length);
    if (!isInterviewRoleId(role)) {
      await interaction.reply({ content: 'That role is not available.', ephemeral: true });
      return true;
    }
    await startRole(interaction, role);
    return true;
  }

  if (!interaction.customId.startsWith(interviewIds.answerPrefix)) {
    return false;
  }

  const payload = interaction.customId.slice(interviewIds.answerPrefix.length);
  const parts = payload.split(':');
  const sessionId = parts[0];
  const questionIndex = Number(parts[1]);
  const selected = parts[2];
  const session = getInterviewSession(interaction.user.id);

  if (!sessionId || selected === undefined || Number.isNaN(questionIndex)) {
    await interaction.reply({ content: 'That answer is invalid.', ephemeral: true });
    return true;
  }

  if (!session || session.id !== sessionId) {
    await interaction.reply({
      content: 'This practice round is no longer active. Start a new one from **Practice again** or `/interview`.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({ content: 'This interview round belongs to someone else.', ephemeral: true });
    return true;
  }

  if (questionIndex !== session.index) {
    await interaction.reply({ content: 'That question is already over.', ephemeral: true });
    return true;
  }

  const question = session.questions[session.index];
  if (!question) {
    await interaction.reply({ content: 'That question is missing.', ephemeral: true });
    return true;
  }

  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = undefined;
  }

  const correct = selected === question.correctValue;
  if (correct) {
    session.score += 1;
    session.feedback = '**Correct.**';
  } else {
    session.feedback = `**Wrong.** ${correctLine(question)}`;
  }

  session.index += 1;
  session.round += 1;
  session.message = interaction.message;

  if (session.index >= session.questions.length) {
    deleteInterviewSession(session.userId);
    await interaction.update(panelPayload(buildResultsPanel(session), false));
    return true;
  }

  await interaction.update(panelPayload(buildQuestionPanel(session), false));
  armTimer(session);
  return true;
}
