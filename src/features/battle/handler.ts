import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type Client,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type StringSelectMenuInteraction,
  type TextChannel,
  type ThreadChannel,
  type User,
} from 'discord.js';
import {
  battleAccentColor,
  battleAnswerPrefix,
  battleChannelId,
  battleImageName,
  readyEmoji,
} from './constants.js';
import { battleQuestions } from './questions.js';
import {
  createBattle,
  deleteBattle,
  getBattleById,
  getBattleByReadyMessageId,
  setReadyMessageId,
  type Battle,
  type LobbyPlayer,
} from './store.js';
import { logger } from '../../utils/logger.js';
import { battleImagePath } from '../../utils/paths.js';

function mention(userId: string): string {
  return `<@${userId}>`;
}

function isPlayer(battle: Battle, userId: string): boolean {
  return battle.playerA === userId || battle.playerB === userId;
}

function opponentId(battle: Battle, userId: string): string {
  return battle.playerA === userId ? battle.playerB : battle.playerA;
}

function scoreLine(battle: Battle): string {
  return `**${battle.playerAName}** ${battle.scores.get(battle.playerA) ?? 0} — **${battle.playerBName}** ${battle.scores.get(battle.playerB) ?? 0}`;
}

function battleImageFile(): AttachmentBuilder {
  return new AttachmentBuilder(battleImagePath, { name: battleImageName });
}

function readyEmbed(battle: Battle): EmbedBuilder {
  const aReady = battle.ready.has(battle.playerA);
  const bReady = battle.ready.has(battle.playerB);
  const bothReady = battle.started || (aReady && bReady);

  const embed = new EmbedBuilder().setColor(battleAccentColor).setImage(`attachment://${battleImageName}`);

  if (bothReady) {
    return embed
      .setTitle('Battle Start')
      .setDescription(
        [
          `**${battle.playerAName}** vs **${battle.playerBName}**`,
          '',
          'Both fighters are ready. First correct dropdown pick wins each question.',
        ].join('\n'),
      )
      .addFields(
        { name: battle.playerAName, value: `${readyEmoji} Ready`, inline: true },
        { name: 'VS', value: '⚔️', inline: true },
        { name: battle.playerBName, value: `${readyEmoji} Ready`, inline: true },
      );
  }

  return embed
    .setTitle('1v1 Battle')
    .setDescription(
      [
        `${mention(battle.playerA)} vs ${mention(battle.playerB)}`,
        '',
        `React with ${readyEmoji} to ready up. The battle starts when **both** of you tick.`,
      ].join('\n'),
    )
    .addFields(
      { name: battle.playerAName, value: aReady ? `${readyEmoji} Ready` : '⏳ Waiting', inline: true },
      { name: 'VS', value: '⚔️', inline: true },
      { name: battle.playerBName, value: bReady ? `${readyEmoji} Ready` : '⏳ Waiting', inline: true },
    );
}

function questionRow(battle: Battle): ActionRowBuilder<StringSelectMenuBuilder> {
  const question = battleQuestions[battle.questionIndex];
  if (!question) {
    throw new Error(`Missing battle question at index ${battle.questionIndex}`);
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${battleAnswerPrefix}${battle.id}:${battle.questionIndex}`)
      .setPlaceholder('Pick your answer — first correct click wins this question')
      .addOptions(
        question.options.map((option) =>
          new StringSelectMenuOptionBuilder().setLabel(option.label).setValue(option.value),
        ),
      ),
  );
}

function questionContent(battle: Battle): string {
  const question = battleQuestions[battle.questionIndex];
  if (!question) {
    throw new Error(`Missing battle question at index ${battle.questionIndex}`);
  }

  return [
    `**Question ${battle.questionIndex + 1}/${battleQuestions.length}**`,
    question.prompt,
    '',
    'Choose from the dropdown. The **first correct answer** wins the point.',
    scoreLine(battle),
  ].join('\n');
}

async function postQuestion(thread: ThreadChannel, battle: Battle): Promise<void> {
  battle.answeredThisQuestion = new Set();
  battle.questionResolved = false;

  await thread.send({
    content: questionContent(battle),
    components: [questionRow(battle)],
  });
}

function scheduleThreadDelete(thread: ThreadChannel): void {
  setTimeout(() => {
    void thread.delete('1v1 battle finished').catch((error: unknown) => {
      logger.error('Failed to delete battle thread:', error);
    });
  }, 5000);
}

async function finishBattle(thread: ThreadChannel, battle: Battle): Promise<void> {
  battle.finished = true;

  const scoreA = battle.scores.get(battle.playerA) ?? 0;
  const scoreB = battle.scores.get(battle.playerB) ?? 0;

  let result: string;
  if (scoreA === scoreB) {
    result = `It's a **draw** ${scoreA}–${scoreB}.`;
  } else {
    const winnerName = scoreA > scoreB ? battle.playerAName : battle.playerBName;
    result = `🏆 **${winnerName}** wins **${Math.max(scoreA, scoreB)}–${Math.min(scoreA, scoreB)}**!`;
  }

  await thread.send({
    content: ['**Battle over**', scoreLine(battle), result, 'This thread will be deleted in 5 seconds.'].join('\n'),
  });

  deleteBattle(battle);
  scheduleThreadDelete(thread);
}

async function startQuestions(thread: ThreadChannel, battle: Battle): Promise<void> {
  await postQuestion(thread, battle);
}

export async function startMatchedBattle(
  client: Client,
  playerA: LobbyPlayer,
  playerB: LobbyPlayer,
): Promise<string | null> {
  const channel = await client.channels.fetch(battleChannelId);
  if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
    return null;
  }

  const parent = channel as TextChannel;
  const threadName = `1v1 ${playerA.name} vs ${playerB.name}`.slice(0, 100);

  let thread: ThreadChannel;
  try {
    thread = await parent.threads.create({
      name: threadName,
      autoArchiveDuration: 60,
      reason: `1v1 battle: ${playerA.name} vs ${playerB.name}`,
    });
  } catch (error: unknown) {
    logger.error('Failed to create battle thread:', error);
    return null;
  }

  const battleId = randomUUID();
  const battle = createBattle({
    id: battleId,
    threadId: thread.id,
    readyMessageId: `pending:${battleId}`,
    playerA: playerA.id,
    playerB: playerB.id,
    playerAName: playerA.name,
    playerBName: playerB.name,
  });

  const readyMessage = await thread.send({
    content: `${mention(playerA.id)} vs ${mention(playerB.id)}`,
    embeds: [readyEmbed(battle)],
    files: [battleImageFile()],
  });

  setReadyMessageId(battle, readyMessage.id);

  try {
    await readyMessage.react(readyEmoji);
  } catch (error: unknown) {
    logger.error('Failed to add ready reaction:', error);
  }

  return thread.url;
}

export async function handleBattleReadyReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  added: boolean,
): Promise<void> {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  if (user.partial) {
    try {
      user = await user.fetch();
    } catch {
      return;
    }
  }

  if (user.bot) {
    return;
  }

  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch {
      return;
    }
  }

  if (reaction.emoji.name !== readyEmoji) {
    return;
  }

  const battle = getBattleByReadyMessageId(reaction.message.id);
  if (!battle || battle.started || battle.finished) {
    return;
  }

  if (!isPlayer(battle, user.id)) {
    try {
      await reaction.users.remove(user.id);
    } catch {
      // Ignore permission failures; extra reactions just do nothing.
    }
    return;
  }

  if (added) {
    battle.ready.add(user.id);
  } else {
    battle.ready.delete(user.id);
  }

  const bothReady = added && battle.ready.size >= 2 && !battle.started;
  if (bothReady) {
    battle.started = true;
  }

  try {
    await reaction.message.edit({ embeds: [readyEmbed(battle)] });
  } catch (error: unknown) {
    logger.error('Failed to update battle ready message:', error);
  }

  if (!bothReady) {
    return;
  }

  const channel = reaction.message.channel;
  if (!channel.isThread()) {
    return;
  }

  await startQuestions(channel, battle);
}

export async function handleBattleAnswer(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.customId.startsWith(battleAnswerPrefix)) {
    return;
  }

  const payload = interaction.customId.slice(battleAnswerPrefix.length);
  const separator = payload.lastIndexOf(':');
  if (separator === -1) {
    return;
  }

  const battleId = payload.slice(0, separator);
  const questionIndex = Number(payload.slice(separator + 1));
  const battle = getBattleById(battleId);

  if (!battle || !battle.started || battle.finished) {
    await interaction.reply({
      content: 'This battle is no longer active.',
      ephemeral: true,
    });
    return;
  }

  if (!isPlayer(battle, interaction.user.id)) {
    await interaction.reply({
      content: 'You are not in this battle.',
      ephemeral: true,
    });
    return;
  }

  if (questionIndex !== battle.questionIndex || battle.questionResolved) {
    await interaction.reply({
      content: 'This question is already over.',
      ephemeral: true,
    });
    return;
  }

  if (battle.answeredThisQuestion.has(interaction.user.id)) {
    await interaction.reply({
      content: 'You already locked in an answer for this question.',
      ephemeral: true,
    });
    return;
  }

  const question = battleQuestions[battle.questionIndex];
  if (!question) {
    return;
  }

  const selected = interaction.values[0];
  if (!selected) {
    await interaction.reply({
      content: 'No answer was selected.',
      ephemeral: true,
    });
    return;
  }

  const thread = interaction.channel;
  if (!thread?.isThread()) {
    await interaction.reply({
      content: 'This battle can only run inside its thread.',
      ephemeral: true,
    });
    return;
  }

  battle.answeredThisQuestion.add(interaction.user.id);

  if (selected === question.correctValue) {
    battle.questionResolved = true;
    battle.scores.set(interaction.user.id, (battle.scores.get(interaction.user.id) ?? 0) + 1);

    const correctLabel =
      question.options.find((option) => option.value === question.correctValue)?.label ??
      question.correctValue;
    const winnerName =
      interaction.user.id === battle.playerA ? battle.playerAName : battle.playerBName;

    await interaction.update({
      content: [
        `**Question ${battle.questionIndex + 1}/${battleQuestions.length}**`,
        question.prompt,
        '',
        `**${winnerName}** answered first with **${correctLabel}** and scored the point.`,
        scoreLine(battle),
      ].join('\n'),
      components: [],
    });

    battle.questionIndex += 1;
    if (battle.questionIndex >= battleQuestions.length) {
      await finishBattle(thread, battle);
      return;
    }

    await postQuestion(thread, battle);
    return;
  }

  const bothWrong =
    battle.answeredThisQuestion.has(battle.playerA) &&
    battle.answeredThisQuestion.has(battle.playerB);

  if (!bothWrong) {
    const waitingName =
      opponentId(battle, interaction.user.id) === battle.playerA ? battle.playerAName : battle.playerBName;

    await interaction.reply({
      content: `Wrong answer. **${waitingName}** can still take the point.`,
      ephemeral: true,
    });
    return;
  }

  battle.questionResolved = true;
  const correctLabel =
    question.options.find((option) => option.value === question.correctValue)?.label ??
    question.correctValue;

  await interaction.update({
    content: [
      `**Question ${battle.questionIndex + 1}/${battleQuestions.length}**`,
      question.prompt,
      '',
      `Both of you missed it. Correct answer: **${correctLabel}**.`,
      scoreLine(battle),
    ].join('\n'),
    components: [],
  });

  battle.questionIndex += 1;
  if (battle.questionIndex >= battleQuestions.length) {
    await finishBattle(thread, battle);
    return;
  }

  await postQuestion(thread, battle);
}
