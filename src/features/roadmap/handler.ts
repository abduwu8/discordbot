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
  TextDisplayBuilder,
  type ButtonInteraction,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
} from 'discord.js';
import { roadmapBannerPath } from '../../utils/paths.js';
import { generateRoadmap, type RoadmapPlan } from './groq.js';
import {
  findGoal,
  findLevel,
  findTime,
  goals,
  levels,
  studyTimes,
  type GoalId,
  type LevelId,
  type TimeId,
} from './options.js';
import { clearDraft, cooldownLeftMs, formatCooldown, getRoadmapLock, patchDraft, resetDraft, saveRoadmapLock } from './store.js';
import { buildRoadmapPdf } from './pdf.js';

const accentColor = 0x57f287;
const bannerName = 'Roadmap.png';
const componentsV2 = MessageFlags.IsComponentsV2;
const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

export const customRoadmapIds = {
  start: 'test:crm',
  back: 'crm:back',
  again: 'crm:again',
  pdf: 'crm:pdf',
  goal: (id: GoalId) => `crm:g:${id}`,
  time: (id: TimeId) => `crm:t:${id}`,
  level: (id: LevelId) => `crm:l:${id}`,
} as const;

const goalPattern = /^crm:g:(aiml|be|fs|ds|ops)$/;
const timePattern = /^crm:t:(5|10|15)$/;
const levelPattern = /^crm:l:(beg|some|int)$/;

function optionRows<T extends string>(
  items: ReadonlyArray<{ id: T; label: string }>,
  customId: (id: T) => string,
  perRow = 5,
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let index = 0; index < items.length; index += perRow) {
    const slice = items.slice(index, index + perRow);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...slice.map((item) =>
          new ButtonBuilder()
            .setCustomId(customId(item.id))
            .setLabel(item.label)
            .setStyle(ButtonStyle.Secondary),
        ),
      ),
    );
  }
  return rows;
}

function backRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(customRoadmapIds.back)
      .setLabel('Back')
      .setStyle(ButtonStyle.Primary),
  );
}

function hasBanner(): boolean {
  return existsSync(roadmapBannerPath);
}

function bannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`).setDescription('Roadmap'),
  );
}

function bannerFiles(): AttachmentBuilder[] {
  return hasBanner() ? [new AttachmentBuilder(roadmapBannerPath, { name: bannerName })] : [];
}

function startContainer(): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (hasBanner()) {
    container.addMediaGalleryComponents(bannerGallery());
  }
  return container;
}

function stepContainer(
  title: string,
  prompt: string,
  rows: ActionRowBuilder<ButtonBuilder>[],
): ContainerBuilder {
  const container = startContainer().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n${prompt}`),
  );

  for (const row of rows) {
    container.addActionRowComponents(row);
  }

  return container;
}

function goalView(): ContainerBuilder {
  return stepContainer('Custom Roadmap Maker', '🎯 What do you want to become?', optionRows(goals, customRoadmapIds.goal, 3));
}

function timeView(): ContainerBuilder {
  return stepContainer('Custom Roadmap Maker', '⏱️ How much time can you study?', [
    ...optionRows(studyTimes, customRoadmapIds.time),
    backRow(),
  ]);
}

function levelView(): ContainerBuilder {
  return stepContainer("Custom Roadmap Maker", "📊 What's your current level?", [
    ...optionRows(levels, customRoadmapIds.level),
    backRow(),
  ]);
}

function chunkText(text: string, size = 3600): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let current = '';
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > size && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function resultButtons(canRetry: boolean): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(customRoadmapIds.pdf)
      .setLabel('Download PDF')
      .setEmoji('📄')
      .setStyle(ButtonStyle.Success),
  );

  if (canRetry) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(customRoadmapIds.again)
        .setLabel('Try again')
        .setStyle(ButtonStyle.Primary),
    );
  }

  return row;
}

function generatingContainer(): ContainerBuilder {
  return startContainer().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '## Building your roadmap\nSearching current resources and writing a week-by-week plan. This can take a few seconds.',
    ),
  );
}

function resultContainer(
  goalLabel: string,
  timeLabel: string,
  levelLabel: string,
  plan: RoadmapPlan,
): ContainerBuilder {
  const container = startContainer();

  const header = `## ${goalLabel} roadmap\n⏱️ ${timeLabel} · 📊 ${levelLabel}`;
  for (const chunk of chunkText(`${header}\n\n${plan.text}`)) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('_You can make another custom roadmap in 24 hours._'),
  );

  return container.addActionRowComponents(resultButtons(false));
}

function errorContainer(): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '## Could not build that roadmap\nThe AI request failed. Hit **Try again** — this does not start your 24-hour cooldown.',
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(customRoadmapIds.again)
          .setLabel('Try again')
          .setStyle(ButtonStyle.Primary),
      ),
    );
}

function cooldownContainer(leftMs: number, canPdf: boolean): ContainerBuilder {
  const container = startContainer().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        '## Custom roadmap cooldown',
        `You already generated a roadmap. Next one in **${formatCooldown(leftMs)}**.`,
        canPdf ? 'You can still download the last one as a PDF.' : '',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  );

  if (canPdf) {
    container.addActionRowComponents(resultButtons(false));
  }

  return container;
}

function wizardPayload(container: ContainerBuilder): InteractionReplyOptions & InteractionEditReplyOptions {
  return {
    flags: ephemeralV2,
    files: bannerFiles(),
    components: [container],
  };
}

async function sendGoal(interaction: ButtonInteraction, isUpdate: boolean): Promise<void> {
  const left = cooldownLeftMs(interaction.user.id);
  const payload = wizardPayload(
    left > 0 ? cooldownContainer(left, Boolean(getRoadmapLock(interaction.user.id))) : goalView(),
  );
  if (isUpdate) {
    await interaction.update(payload);
    return;
  }

  await interaction.reply(payload);
}

async function sendPdf(interaction: ButtonInteraction): Promise<void> {
  const lock = getRoadmapLock(interaction.user.id);
  if (!lock) {
    await interaction.reply({
      content: 'No saved roadmap to download. Generate one first.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const pdf = await buildRoadmapPdf(lock.title, lock.meta, lock.text);
  await interaction.editReply({
    content: 'Your roadmap PDF is ready.',
    files: [new AttachmentBuilder(pdf, { name: 'roadmap.pdf' })],
  });
}

async function showResult(interaction: ButtonInteraction): Promise<void> {
  const left = cooldownLeftMs(interaction.user.id);
  if (left > 0) {
    await interaction.update(wizardPayload(cooldownContainer(left, Boolean(getRoadmapLock(interaction.user.id)))));
    return;
  }

  const draft = patchDraft(interaction.user.id, {});
  const goal = draft.goal ? findGoal(draft.goal) : undefined;
  const time = draft.time ? findTime(draft.time) : undefined;
  const level = draft.level ? findLevel(draft.level) : undefined;

  if (!goal || !time || !level) {
    resetDraft(interaction.user.id);
    await sendGoal(interaction, true);
    return;
  }

  await interaction.deferUpdate();
  await interaction.editReply({
    flags: componentsV2,
    files: bannerFiles(),
    components: [generatingContainer()],
  });

  const plan = await generateRoadmap(goal.id, time.id, level.id);
  clearDraft(interaction.user.id);

  if (plan) {
    const meta = `${time.label} · ${level.label}`;
    saveRoadmapLock(interaction.user.id, {
      title: `${goal.label} roadmap`,
      meta,
      text: plan.text,
    });
  }

  await interaction.editReply({
    flags: componentsV2,
    files: bannerFiles(),
    components: [plan ? resultContainer(goal.label, time.label, level.label, plan) : errorContainer()],
  });
}

export function isCustomRoadmapId(customId: string): boolean {
  return (
    customId === customRoadmapIds.start ||
    customId === customRoadmapIds.back ||
    customId === customRoadmapIds.again ||
    customId === customRoadmapIds.pdf ||
    customId.startsWith('crm:')
  );
}

export async function handleCustomRoadmap(interaction: ButtonInteraction): Promise<boolean> {
  if (!isCustomRoadmapId(interaction.customId)) {
    return false;
  }

  if (interaction.customId === customRoadmapIds.start) {
    resetDraft(interaction.user.id);
    await sendGoal(interaction, false);
    return true;
  }

  if (interaction.customId === customRoadmapIds.again) {
    resetDraft(interaction.user.id);
    await sendGoal(interaction, true);
    return true;
  }

  if (interaction.customId === customRoadmapIds.pdf) {
    await sendPdf(interaction);
    return true;
  }

  const left = cooldownLeftMs(interaction.user.id);
  if (left > 0) {
    await interaction.update(
      wizardPayload(cooldownContainer(left, Boolean(getRoadmapLock(interaction.user.id)))),
    );
    return true;
  }

  if (interaction.customId === customRoadmapIds.back) {
    const draft = patchDraft(interaction.user.id, {});
    if (draft.time && !draft.level) {
      patchDraft(interaction.user.id, { time: undefined });
      await interaction.update(wizardPayload(timeView()));
      return true;
    }

    resetDraft(interaction.user.id);
    await interaction.update(wizardPayload(goalView()));
    return true;
  }

  const goalMatch = goalPattern.exec(interaction.customId);
  if (goalMatch?.[1]) {
    patchDraft(interaction.user.id, { goal: goalMatch[1] as GoalId, time: undefined, level: undefined });
    await interaction.update(wizardPayload(timeView()));
    return true;
  }

  const timeMatch = timePattern.exec(interaction.customId);
  if (timeMatch?.[1]) {
    const draft = patchDraft(interaction.user.id, { time: timeMatch[1] as TimeId, level: undefined });
    if (!draft.goal) {
      await interaction.update(wizardPayload(goalView()));
      return true;
    }
    await interaction.update(wizardPayload(levelView()));
    return true;
  }

  const levelMatch = levelPattern.exec(interaction.customId);
  if (levelMatch?.[1]) {
    patchDraft(interaction.user.id, { level: levelMatch[1] as LevelId });
    await showResult(interaction);
    return true;
  }

  return true;
}
