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
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
} from 'discord.js';
import { bannerPath, roadmapBannerPath } from '../utils/paths.js';
import { battleJoinSlot1, battleJoinSlot2 } from '../features/battle/constants.js';
import { startMatchedBattle } from '../features/battle/handler.js';
import { claimLobbySlot } from '../features/battle/store.js';
import { customRoadmapIds, handleCustomRoadmap } from '../features/roadmap/handler.js';
import { buildRoadmapPdf } from '../features/roadmap/pdf.js';
import { getYearRoadmap } from '../features/roadmap/yearPlans.js';

const years = [
  { id: '1', label: 'First Year' },
  { id: '2', label: 'Second Year' },
  { id: '3', label: 'Third Year' },
] as const;

const accentColor = 0xeb459e;
const bannerAttachmentName = 'banner.png';
const roadmapBannerName = 'Roadmap.png';

export const testCustomIds = {
  resources: 'test:resources',
  roadmap: 'test:roadmap',
  customRoadmap: customRoadmapIds.start,
  battleJoin1: battleJoinSlot1,
  battleJoin2: battleJoinSlot2,
  roadmapYear: (year: string) => `test:roadmap:year:${year}`,
  roadmapPdf: (year: string) => `test:roadmap:pdf:${year}`,
  roadmapBack: 'test:roadmap:back',
} as const;

const roadmapYearPattern = /^test:roadmap:year:([123])$/;
const roadmapPdfPattern = /^test:roadmap:pdf:([123])$/;

const componentsV2 = MessageFlags.IsComponentsV2;
const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

function yearButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...years.map((year) =>
      new ButtonBuilder()
        .setCustomId(testCustomIds.roadmapYear(year.id))
        .setLabel(year.label)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

function bannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder()
      .setURL(`attachment://${bannerAttachmentName}`)
      .setDescription('BCA Hub'),
  );
}

function roadmapBannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${roadmapBannerName}`).setDescription('Roadmap'),
  );
}

function roadmapBannerFiles(): AttachmentBuilder[] {
  if (!existsSync(roadmapBannerPath)) {
    return [];
  }

  return [new AttachmentBuilder(roadmapBannerPath, { name: roadmapBannerName })];
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

export function buildTestPanel(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(accentColor)
    .addMediaGalleryComponents(bannerGallery())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## What is a BCA degree?',
          'Bachelor of Computer Applications (BCA) is a **3-year undergraduate** program focused on software, programming, and computer science fundamentals.',
          '',
          'You typically study programming, databases, web development, operating systems, and networking — then use that base for internships, jobs, or further study like MCA.',
          '',
          '## What is an MCA degree?',
          'Master of Computer Applications (MCA) is a **2-year postgraduate** program that builds on BCA (or a similar CS background).',
          '',
          'It goes deeper into software engineering, advanced programming, data, systems, and project work — often used as a path toward software roles, specialization, or research-oriented study.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Before You Start',
          '- BCA/MCA requires self learning — we can only assist you with it.',
          '- Have **commitment** and **passion**.',
          '- Please provide all required information and wait patiently instead of repeatedly pinging staff.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**What this bot offers to you:**'),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(testCustomIds.resources)
          .setLabel('Resources')
          .setEmoji('📚')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(testCustomIds.roadmap)
          .setLabel('Roadmap')
          .setEmoji('🗺️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(testCustomIds.customRoadmap)
          .setLabel('Personalized Roadmap')
          .setEmoji('🛣️')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
}

function buildRoadmapYearPicker(): ContainerBuilder {
  const files = roadmapBannerFiles();
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (files.length) {
    container.addMediaGalleryComponents(roadmapBannerGallery());
  }

  return container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        ['## Roadmap', 'Pick your year for a full BCA plan — subjects, skills, habits, and links.'].join('\n'),
      ),
    )
    .addActionRowComponents(yearButtons());
}

function buildYearRoadmap(yearId: string, yearLabel: string): ContainerBuilder {
  const files = roadmapBannerFiles();
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (files.length) {
    container.addMediaGalleryComponents(roadmapBannerGallery());
  }

  const body = getYearRoadmap(yearId) ?? `## ${yearLabel} Roadmap\nContent is not available yet.`;
  for (const chunk of chunkText(body)) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
  }

  return container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(testCustomIds.roadmapPdf(yearId))
        .setLabel('Download PDF')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(testCustomIds.roadmapBack)
        .setLabel('Back')
        .setStyle(ButtonStyle.Primary),
    ),
  );
}

function roadmapReplyOptions(container: ContainerBuilder): InteractionReplyOptions & InteractionEditReplyOptions {
  return {
    flags: ephemeralV2,
    files: roadmapBannerFiles(),
    components: [container],
  };
}

export function testPanelReplyOptions(): InteractionEditReplyOptions {
  return {
    flags: componentsV2,
    files: [new AttachmentBuilder(bannerPath, { name: bannerAttachmentName })],
    components: [buildTestPanel()],
  };
}

async function handleLobbyJoin(interaction: ButtonInteraction, slot: 1 | 2): Promise<void> {
  const member = interaction.member;
  const name =
    member && 'displayName' in member && typeof member.displayName === 'string'
      ? member.displayName
      : interaction.user.displayName;

  const result = claimLobbySlot(slot, { id: interaction.user.id, name });
  if (!result.ok) {
    const reasons = {
      taken: 'That slot is already taken. Use the other Join button.',
      already: 'You already joined this queue.',
      in_battle: 'You are already in an active battle.',
    } as const;

    await interaction.reply({
      content: reasons[result.reason],
      ephemeral: true,
    });
    return;
  }

  await interaction.update({
    flags: componentsV2,
    components: [buildTestPanel()],
  });

  if (!result.matched) {
    return;
  }

  const threadUrl = await startMatchedBattle(interaction.client, result.playerA, result.playerB);
  await interaction.followUp({
    content: threadUrl
      ? `Matched **${result.playerA.name}** vs **${result.playerB.name}**. Head to the thread: ${threadUrl}`
      : 'Both players joined, but the battle thread could not be created. Check bot permissions.',
    ephemeral: true,
  });
}

export async function handleTestComponent(interaction: ButtonInteraction): Promise<void> {
  if (await handleCustomRoadmap(interaction)) {
    return;
  }

  if (interaction.customId === testCustomIds.resources) {
    await interaction.reply({
      content: 'Resources will be uploaded soon.',
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === testCustomIds.battleJoin1) {
    await handleLobbyJoin(interaction, 1);
    return;
  }

  if (interaction.customId === testCustomIds.battleJoin2) {
    await handleLobbyJoin(interaction, 2);
    return;
  }

  if (interaction.customId === testCustomIds.roadmap) {
    await interaction.reply(roadmapReplyOptions(buildRoadmapYearPicker()));
    return;
  }

  if (interaction.customId === testCustomIds.roadmapBack) {
    await interaction.update(roadmapReplyOptions(buildRoadmapYearPicker()));
    return;
  }

  const roadmapPdfMatch = roadmapPdfPattern.exec(interaction.customId);
  if (roadmapPdfMatch) {
    const year = years.find((item) => item.id === roadmapPdfMatch[1]);
    const body = year ? getYearRoadmap(year.id) : undefined;
    if (!year || !body) {
      await interaction.reply({
        content: 'That year roadmap is not available yet.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const pdf = await buildRoadmapPdf(`${year.label} Roadmap`, 'BCA Hub · year plan', body);
    await interaction.editReply({
      content: `Your **${year.label}** roadmap PDF is ready.`,
      files: [
        new AttachmentBuilder(pdf, {
          name: `${year.label.toLowerCase().replace(/\s+/g, '-')}-roadmap.pdf`,
        }),
      ],
    });
    return;
  }

  const roadmapYearMatch = roadmapYearPattern.exec(interaction.customId);
  if (!roadmapYearMatch) {
    return;
  }

  const year = years.find((item) => item.id === roadmapYearMatch[1]);
  if (!year) {
    return;
  }

  await interaction.update(roadmapReplyOptions(buildYearRoadmap(year.id, year.label)));
}
