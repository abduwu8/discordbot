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
  pickPrefix: 'debug:pick:',
  again: 'debug:again',
  answerPrefix: 'debug:ans:',
} as const;

const accentColor = 0x3ba55d;
const bannerName = 'debug.png';
const componentsV2 = MessageFlags.IsComponentsV2;
const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
const buttonLabelLimit = 80;

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

function clipLabel(label: string): string {
  if (label.length <= buttonLabelLimit) {
    return label;
  }
  return `${label.slice(0, buttonLabelLimit - 1)}…`;
}

function difficultyButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${debugIds.pickPrefix}easy`)
      .setLabel('Easy')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${debugIds.pickPrefix}medium`)
      .setLabel('Medium')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${debugIds.pickPrefix}hard`)
      .setLabel('Hard')
      .setStyle(ButtonStyle.Danger),
  );
}

function answerButtons(session: DebugSession, question: DebugQuestion): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...question.options.map((option) =>
      new ButtonBuilder()
        .setCustomId(`${debugIds.answerPrefix}${session.id}:${session.index}:${option.value}`)
        .setLabel(clipLabel(option.label))
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

export function buildDebugStartPanel(): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Debug Simulator',
          'A production-debugging drill — not a trivia quiz. You get a realistic incident and choose what to check **first**.',
          '',
          'Each round is **5 incidents** from a **10-scenario** bank. The lineup is **shuffled every week**.',
          '',
          'Pick a difficulty:',
          '- **Easy** — first-response instincts (logs, scope, config)',
          '- **Medium** — latency, pools, replicas, webhooks',
          '- **Hard** — split-brain, stampede, TLS, isolation, retry storms',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(difficultyButtons());
}

function formatOptions(question: DebugQuestion): string {
  return question.options.map((option) => `- ${option.label}`).join('\n');
}

function feedbackBlock(session: DebugSession): string | undefined {
  return session.feedback;
}

function questionBody(session: DebugSession, question: DebugQuestion): string {
  const difficulty = debugDifficulties[session.difficulty].label;
  const lines = [
    '# Debug Simulator',
    `**${difficulty}** · Incident **${session.index + 1}/${session.questions.length}**`,
  ];

  const feedback = feedbackBlock(session);
  if (feedback) {
    lines.push('', feedback);
  }

  lines.push('', question.incident, '', `**${question.prompt}**`, '', formatOptions(question));
  return lines.join('\n');
}

function resultsBody(session: DebugSession): string {
  const difficulty = debugDifficulties[session.difficulty].label;
  const total = session.questions.length;
  const lines = [
    '# Debug Simulator',
    `**${difficulty}** · Drill complete`,
    '',
    `Score: **${session.score}/${total}**`,
  ];

  const feedback = feedbackBlock(session);
  if (feedback) {
    lines.push('', feedback);
  }

  lines.push(
    '',
    'Run this again anytime. The incident lineup is **shuffled every week**, so the first checks stay fresh.',
  );
  return lines.join('\n');
}

function buildQuestionPanel(session: DebugSession): ContainerBuilder {
  const question = session.questions[session.index];
  if (!question) {
    throw new Error('Missing debug incident.');
  }

  return startContainer()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(questionBody(session, question)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(answerButtons(session, question));
}

function buildResultsPanel(session: DebugSession): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(resultsBody(session)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(debugIds.again).setLabel('Run again').setStyle(ButtonStyle.Primary),
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
  deleteDebugSession(interaction.user.id);
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply(panelPayload(buildDebugStartPanel(), false));
}

function correctLine(question: DebugQuestion): string {
  const option = correctOption(question);
  return option?.label ?? 'the better first check';
}

function goodFeedback(question: DebugQuestion): string {
  return ['**Good first step**', '', question.good, '', `**Why first?**`, question.why].join('\n');
}

function missFeedback(question: DebugQuestion): string {
  return [
    '**Not the first place to look**',
    '',
    question.miss,
    '',
    `Better first step: **${correctLine(question)}**`,
    question.why,
  ].join('\n');
}

function startRound(interaction: ButtonInteraction, difficulty: DebugDifficultyId): DebugSession {
  const session: DebugSession = {
    id: randomUUID(),
    userId: interaction.user.id,
    difficulty,
    questions: shufflePickIncidents(difficulty),
    index: 0,
    score: 0,
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

export async function handleDebugButton(interaction: ButtonInteraction): Promise<boolean> {
  if (interaction.customId === debugIds.again) {
    deleteDebugSession(interaction.user.id);
    await interaction.update(panelPayload(buildDebugStartPanel(), false));
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

  if (!interaction.customId.startsWith(debugIds.answerPrefix)) {
    return false;
  }

  const payload = interaction.customId.slice(debugIds.answerPrefix.length);
  const parts = payload.split(':');
  const sessionId = parts[0];
  const questionIndex = Number(parts[1]);
  const selected = parts[2];
  const session = getDebugSession(interaction.user.id);

  if (!sessionId || selected === undefined || Number.isNaN(questionIndex)) {
    await interaction.reply({ content: 'That answer is invalid.', ephemeral: true });
    return true;
  }

  if (!session || session.id !== sessionId) {
    await interaction.reply({
      content: 'This debug round is no longer active. Start a new one from **Run again** or `/debug`.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({ content: 'This debug round belongs to someone else.', ephemeral: true });
    return true;
  }

  if (questionIndex !== session.index) {
    await interaction.reply({ content: 'That incident is already over.', ephemeral: true });
    return true;
  }

  const question = session.questions[session.index];
  if (!question) {
    await interaction.reply({ content: 'That incident is missing.', ephemeral: true });
    return true;
  }

  const correct = selected === question.correctValue;
  if (correct) {
    session.score += 1;
    session.feedback = goodFeedback(question);
  } else {
    session.feedback = missFeedback(question);
  }

  session.index += 1;
  session.message = interaction.message;

  if (session.index >= session.questions.length) {
    deleteDebugSession(session.userId);
    await interaction.update(panelPayload(buildResultsPanel(session), false));
    return true;
  }

  await interaction.update(panelPayload(buildQuestionPanel(session), false));
  return true;
}
